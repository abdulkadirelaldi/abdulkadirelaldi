import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

import { PrismaClient } from '@/server/generated/prisma/client';

/**
 * Tekil (singleton) Prisma istemcisi — PROGRAM.md §7.4.
 *
 * DB erişimi YALNIZCA `src/server/services/` içinden bu istemci üzerinden yapılır.
 * Route handler ve Server Action doğrudan `db` kullanmaz, servisi çağırır.
 *
 * Prisma 7 (ADR-005): `new PrismaClient()` argümansız derlenmez; PostgreSQL'e
 * bağlanmak için `@prisma/adapter-pg` sürücü adaptörü zorunludur.
 */

/**
 * `pg` havuz ayarları — ADR-005 gereği açıkça verilir, varsayılana bırakılmaz.
 *
 * Bu uygulama tek kullanıcılı bir panel (§1.B) + çoğunlukla statik/ISR bir public
 * site (§1.A). Eşzamanlılık düşük; asıl risk çok bağlantı değil, bağlantıların
 * sessizce birikmesi ve sağlık kontrolünün asılı kalması.
 */
const POOL_CONFIG = {
  /**
   * Süreç başına en fazla 10 bağlantı.
   * Postgres varsayılan `max_connections` = 100. Tek uygulama container'ı çalışıyor;
   * geriye migration, `psql` ve gece `pg_dump` yedeği (§8.21) için bol pay kalıyor.
   * Tek kullanıcılı panel için 10 zaten fazlasıyla yeterli — public tarafın SSR
   * ani yüklenmelerini de karşılar.
   */
  max: 10,

  /**
   * Boşta 30 sn duran bağlantı kapatılır.
   * Panel gün içinde seyrek kullanılır; bağlantıları açık tutmanın faydası yok.
   * Ayrıca DB yeniden başlatıldığında (Coolify dağıtımı, yedek penceresi) ölü
   * bağlantıların havuzda takılı kalma süresini sınırlar.
   */
  idleTimeoutMillis: 30_000,

  /**
   * Havuzdan bağlantı alma denemesi 5 sn'de vazgeçer.
   * `pg` varsayılanı 0'dır — yani SONSUZA KADAR bekler. Bu, DB kapalıyken
   * `/api/v1/health` ucunun 503 dönmek yerine asılı kalmasına ve izlemenin
   * (§13.7 Uptime Kuma) zaman aşımına düşmesine yol açardı. Hızlı başarısızlık
   * doğru davranıştır.
   */
  connectionTimeoutMillis: 5_000,
} as const;

function createPool(): Pool {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    // §8.20: mesajda değerin kendisi yok, yalnızca hangi anahtarın eksik olduğu.
    throw new Error('DATABASE_URL tanımlı değil. .env dosyasını kontrol edin (bkz. .env.example).');
  }

  return new Pool({ connectionString, ...POOL_CONFIG });
}

function createPrismaClient(pool: Pool): PrismaClient {
  const adapter = new PrismaPg(
    pool,
    {
      /**
       * Boştaki bir bağlantı hata alırsa `pg` havuzu 'error' olayı yayar.
       * Dinlenmezse Node süreci yakalanmamış istisnayla ÇÖKER. Yalnızca logla —
       * havuz kendi kendini toparlar.
       */
      onPoolError: (error) => {
        console.error('[db] pg havuz hatası:', error.message);
      },
      onConnectionError: (error) => {
        console.error('[db] pg bağlantı hatası:', error.message);
      },
    },
  );

  return new PrismaClient({
    adapter,
    // Üretimde gürültü yapmasın; geliştirmede yavaş sorguyu görebilelim.
    log:
      process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  });
}

/**
 * Geliştirmede Next.js hot reload her derlemede modülü yeniden değerlendirir.
 * İstemci ve havuz `globalThis`'te tutulmazsa her kayıtta yeni bir havuz açılır
 * ve Postgres bağlantı limiti kısa sürede tükenir. Üretimde modül bir kez
 * yüklendiği için global'e yazmaya gerek yok.
 */
const globalForDb = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  pgPool: Pool | undefined;
};

/**
 * TEMBEL (lazy) KURULUM — BULGU-002 / T-003c.
 *
 * Havuz ve istemci, modül yüklenirken DEĞİL, ilk gerçek DB erişiminde kurulur.
 *
 * Neden: `next build` sırasındaki "Collecting page data" adımı her route
 * modülünü import eder. Kurulum modül gövdesinde olursa, `DATABASE_URL`
 * bulunmayan her ortamda import anında `throw` edilir ve DERLEME DÜŞER.
 * CI ve Docker build katmanında `.env` yoktur (§8.17 zaten repoya girmesini
 * yasaklıyor), dolayısıyla T-005 ve T-070 bu hâliyle kurulamazdı.
 *
 * Eksik yapılandırma SESSİZCE YUTULMAZ: hata aynen fırlatılır, yalnızca daha
 * geç — ilk sorguda veya ilk `pingDatabase()` çağrısında. Derleme zamanı
 * bağlantı gerektirmez; çalışma zamanı gerektirir.
 */
function getPool(): Pool {
  const existing = globalForDb.pgPool;
  if (existing) return existing;

  const created = createPool();
  if (process.env.NODE_ENV !== 'production') globalForDb.pgPool = created;
  return created;
}

function getClient(): PrismaClient {
  const existing = globalForDb.prisma;
  if (existing) return existing;

  const created = createPrismaClient(getPool());
  if (process.env.NODE_ENV !== 'production') globalForDb.prisma = created;
  return created;
}

/**
 * Tekil Prisma istemcisi — T-003b sözleşmesi korunur: `db` yine `PrismaClient`
 * tipinde bir değerdir ve `db.user.findMany()` gibi kullanılır. Değişen tek şey,
 * gerçek istemcinin ilk erişimde kuruluyor olması; çağıran taraf farkı görmez.
 *
 * Üretimde modül bir kez yüklendiği ve `globalForDb` yazılmadığı için istemci
 * modül kapsamındaki `productionClient` içinde tutulur — her erişimde yeniden
 * kurulmaz.
 */
let productionClient: PrismaClient | undefined;

function resolveClient(): PrismaClient {
  if (process.env.NODE_ENV === 'production') {
    productionClient ??= createPrismaClient(getPool());
    return productionClient;
  }
  return getClient();
}

export const db: PrismaClient = new Proxy({} as PrismaClient, {
  get(_target, property, receiver) {
    const client = resolveClient();
    const value = Reflect.get(client, property, receiver);
    // Model delegate'leri ve `$transaction` gibi metotlar `this` bağlamına
    // ihtiyaç duyar; proxy üzerinden çağrılınca bağlam kaybolmasın.
    return typeof value === 'function' ? value.bind(client) : value;
  },
  has(_target, property) {
    return Reflect.has(resolveClient(), property);
  },
  getPrototypeOf() {
    return Reflect.getPrototypeOf(resolveClient());
  },
});

/**
 * Veritabanı canlılık yoklaması — §13.6 sağlık kontrolü için.
 *
 * Havuzdan gerçek bir bağlantı alır ve hemen bırakır. Bu, TCP + Postgres kimlik
 * doğrulama el sıkışmasının tamamını yürütür; yani sunucu gerçekten ayakta ve
 * kimlik bilgileri geçerli olmadan başarılı olamaz.
 *
 * Neden `db.$connect()` değil: Prisma istemcisi bir kez "bağlandım" saydıktan
 * sonra `$connect()` bir daha ağa çıkmaz — veritabanı çökse bile anında başarılı
 * döner. Ölçüldü: DB durdurulmuşken 28ms'de başarı verdi. Sağlık ucunu yanlış
 * yeşil gösteren bu davranış, ucun var olma amacını ortadan kaldırırdı.
 *
 * Neden `$queryRaw\`SELECT 1\`` değil: §8.10 ham SQL'i güvenlik ajanı onayına
 * bağlıyor. `pool.connect()` aynı kanıtı sorgu çalıştırmadan verir — onay
 * gerektirmez ve enjeksiyon yüzeyi hiç oluşmaz.
 */
export async function pingDatabase(): Promise<void> {
  // Havuz burada da tembel çözülür; `DATABASE_URL` eksikse hata BU noktada çıkar
  // ve sağlık ucu §7.2 zarfıyla 503 döner (yutulmaz).
  const client = await getPool().connect();
  client.release();
}
