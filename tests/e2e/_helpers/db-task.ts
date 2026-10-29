import process from 'node:process';

import { hashBackupCodes } from '@/server/auth/backup-codes';
import { hashEmail } from '@/server/auth/login-attempt';
import { encryptSecret } from '@/server/auth/totp';
import { db } from '@/server/db';
import type { Prisma } from '@/server/generated/prisma/client';

/**
 * E2E veritabanı görevleri — AYRI BİR NODE SÜRECİNDE koşar.
 *
 * Çağrılma biçimi (bkz. `db.ts`):
 *   node --import ./tests/e2e/_helpers/db-register.mjs \
 *        tests/e2e/_helpers/db-task.ts <komut> [json-argüman]
 *
 * Sonuç stdout'a TEK SATIR JSON olarak yazılır. Neden ayrı süreç: gerekçe
 * `db-resolver.mjs` başında.
 *
 * §8.20: Bu betik şifre, TOTP secret'ı veya kurtarma kodunu ASLA yazdırmaz —
 * yalnızca sayılar ve boolean'lar döner. Sabit test secret'ı çağıran tarafta
 * zaten bilinir; buradan geri gönderilmesine gerek yok.
 */

/** Sabit test secret'ı — RFC 6238 tohumunun Base32 hâli. */
export const TEST_TOTP_SECRET = 'GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ';

/** Sabit kurtarma kodları — biçim `XXXXX-XXXXX` (ADR-013). */
export const TEST_BACKUP_CODES = ['AAAAA-BBBBB', 'CCCCC-DDDDD', 'EEEEE-FFFFF'] as const;

function adminEmail(): string {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  if (!email) {
    throw new Error('ADMIN_EMAIL tanımlı değil (§12). .env dosyasını kontrol edin.');
  }
  return email;
}

async function requireAdmin() {
  const email = adminEmail();
  const user = await db.user.findUnique({ where: { email } });

  if (!user) {
    throw new Error(`Yönetici hesabı bulunamadı (${email}). Önce "pnpm db:seed" çalıştırın.`);
  }

  return user;
}

/**
 * TÜM giriş denemelerini siler — e-posta özetine göre DEĞİL.
 *
 * §8.4 sayımı **IP başınadır** (`countRecentFailures({ ip }, …)`). Bir zamanlar
 * burası `emailHash`'e göre siliyordu ve şu sessiz hataya yol açtı: var olmayan
 * bir e-postayla yapılan deneme FARKLI bir özet üretiyor, silinmiyor, ama AYNI
 * IP'den geldiği için sayaçta kalmaya devam ediyordu. Sonuç: dört yanlış şifre
 * girip beklediğinden bir erken kilitlenen, sıraya bağlı ve açıklaması zor bir
 * kırılma. "Dört deneme kilitlemez" sınır testi bunu yakaladı.
 *
 * Seed durumunda hiç deneme kaydı yok; tabloyu boşaltmak seed durumuna dönmenin
 * ta kendisidir.
 */
async function clearAllLoginAttempts(): Promise<number> {
  const { count } = await db.loginAttempt.deleteMany({});
  return count;
}

/** Kullanıcıyı seed durumuna döndürür ve testin bıraktığı izleri siler. */
async function resetAuthState(since?: string): Promise<void> {
  const user = await requireAdmin();

  await db.user.update({
    where: { id: user.id },
    data: {
      // `prisma/seed.ts` bu üçünü boş bırakıyor — 2FA kapalı.
      totpSecret: null,
      totpConfirmedAt: null,
      totpBackupCodes: [],
      lockedUntil: null,
    },
  });

  await clearAllLoginAttempts();

  await db.auditLog.deleteMany({
    where: {
      entity: 'User',
      actorEmailHash: hashEmail(user.email),
      ...(since ? { createdAt: { gte: new Date(since) } } : {}),
    },
  });
}

const komutlar: Record<string, (arg?: string) => Promise<unknown>> = {
  /** Yönetici kaydının test için gereken alanları. */
  async admin() {
    const user = await requireAdmin();
    return {
      id: user.id,
      email: user.email,
      twoFactorEnabled: user.totpConfirmedAt != null,
      remainingBackupCodes: user.totpBackupCodes.length,
      lockedUntil: user.lockedUntil?.toISOString() ?? null,
    };
  },

  /** 2FA'yı açar — seed kapalı bıraktığı için §9/3'ün ikinci yarısı buna bağlı. */
  async enableTwoFactor() {
    const user = await requireAdmin();

    await db.user.update({
      where: { id: user.id },
      data: {
        totpSecret: encryptSecret(TEST_TOTP_SECRET),
        totpConfirmedAt: new Date(),
        totpBackupCodes: await hashBackupCodes([...TEST_BACKUP_CODES]),
      },
    });

    return { secret: TEST_TOTP_SECRET, backupCodes: TEST_BACKUP_CODES };
  },

  async resetAuthState(since) {
    await resetAuthState(since);
    return { ok: true };
  },

  /** §8.4 sayacını sıfırlar — testler arası sızmayı önler. */
  async clearLoginAttempts() {
    return { deleted: await clearAllLoginAttempts() };
  },

  async clearLock() {
    const user = await requireAdmin();
    await db.user.update({ where: { id: user.id }, data: { lockedUntil: null } });
    return { ok: true };
  },

  /* =========================================================================
   * §9/6 ve §9/2 — İÇERİK İZLERİ (T-039)
   *
   * Bu iki senaryo, auth testlerinden farklı olarak GERÇEK İÇERİK YAZIYOR:
   * panelden bir proje ekleniyor, ziyaretçi bir iletişim mesajı gönderiyor.
   * `resetAuthState` bunları temizlemez (adı gereği auth durumuyla ilgili), bu
   * yüzden her senaryo kendi izini kendisi siliyor ve `globalTeardown` son bir
   * süpürme yapıyor. Aksi hâlde depo, koşum başına bir çöp proje biriktirirdi
   * ve `/projeler` sayfası zamanla test verisiyle dolardı.
   * ====================================================================== */

  /** Slug'ı verilen projenin yayın durumu — action'ın DB'ye ne yazdığını doğrular. */
  async projeDurumu(arg) {
    const { slug } = JSON.parse(arg ?? '{}') as { slug: string };
    const proje = await db.project.findFirst({
      where: { slug },
      select: { id: true, status: true, publishedAt: true, locale: true },
    });

    return proje
      ? {
          bulundu: true,
          status: proje.status,
          locale: proje.locale,
          publishedAt: proje.publishedAt?.toISOString() ?? null,
        }
      : { bulundu: false };
  },

  /** Test projelerini siler. Önek zorunlu — geniş bir silme kazası olmasın. */
  async projeleriTemizle(arg) {
    const { slugOneki } = JSON.parse(arg ?? '{}') as { slugOneki: string };
    if (!slugOneki || slugOneki.length < 4) {
      throw new Error('projeleriTemizle: en az 4 karakterlik bir slug öneki zorunlu.');
    }

    const { count } = await db.project.deleteMany({ where: { slug: { startsWith: slugOneki } } });
    return { silinen: count };
  },

  /**
   * İletişim mesajının ÖZETİ — §8.20 gereği içerik geri gönderilmez.
   *
   * Beklenen değerler ÇAĞIRAN TARAFTAN geliyor ve burada karşılaştırılıyor;
   * dönen şey yalnızca boolean'lar ve sınıflandırma alanları. Böylece mesaj
   * gövdesi, e-posta adresi ve IP test çıktısına HİÇ düşmez — bir CI logu
   * ziyaretçi verisi taşımaz.
   */
  async iletisimMesajiOzeti(arg) {
    const beklenen = JSON.parse(arg ?? '{}') as {
      subject: string;
      name?: string;
      email?: string;
      message?: string;
    };

    const mesaj = await db.contactMessage.findFirst({
      where: { subject: beklenen.subject },
      orderBy: { createdAt: 'desc' },
    });

    if (!mesaj) return { bulundu: false };

    return {
      bulundu: true,
      /*
       * KİMLİK DÖNÜYOR — §8.20 ile çelişmiyor. `id` bir cuid: içerik taşımayan,
       * opak bir tanımlayıcı. §9/2'nin dördüncü halkası panelde SATIRI bulmak
       * için ona ihtiyaç duyuyor (`[data-mesaj-id]`), ve satırı konu metnine
       * göre aramak ziyaretçi metnini test çıktısına taşırdı — yani kimliği
       * döndürmek §8.20 açısından daha TEMİZ olan seçenek.
       */
      id: mesaj.id,
      // `ContactMessage`te tek bir `status` sütunu YOK: durum üç boolean/damga
      // alanından okunuyor (`isRead`, `isSpam`, `archivedAt`). Testin
      // beklentisi de bu alanlar üzerinden yazılmalı — uydurma bir "status"
      // alanı, ekran yazıldığında panelin gerçekten gösterdiğinden farklı bir
      // şeyi doğrulardı.
      isRead: mesaj.isRead,
      arsivlendi: mesaj.archivedAt !== null,
      honeypotHit: mesaj.honeypotHit,
      isSpam: mesaj.isSpam,
      spamScore: mesaj.spamScore,
      adEsit: beklenen.name === undefined ? null : mesaj.name === beklenen.name,
      epostaEsit: beklenen.email === undefined ? null : mesaj.email === beklenen.email,
      mesajEsit: beklenen.message === undefined ? null : mesaj.message === beklenen.message,
      // §8.15/ADR-020: kaydın hangi bağlamda geldiği. Değerin KENDİSİ değil,
      // yazılıp yazılmadığı bildiriliyor.
      ipYazildi: mesaj.ip !== null,
      userAgentYazildi: mesaj.userAgent !== null,
    };
  },

  /**
   * Panelin OKUMA YOLU bu mesajı görüyor mu? (T-038'in `fetchContactMessages`i)
   *
   * §9/2'nin "panele düşer" yarısı ekran gelene kadar bekliyor; ölçülebilen
   * son halka bu. Ekran yazıldığında buradaki iddia oraya taşınır.
   */
  async mesajKutusuIceriyorMu(arg) {
    const { subject } = JSON.parse(arg ?? '{}') as { subject: string };
    const { fetchContactMessages } = await import('@/server/services/contact-message');
    const { contactMessageFilterSchema } = await import('@/lib/schemas/contact-message');

    /*
     * Filtre ŞEMADAN geçiriliyor, elle `{ page: 1, perPage: 20 }` yazılmıyor:
     * panelin ekranı da aynı şemayı kullanacak, yani burada ölçülen varsayılan
     * filtre panelin göreceği filtredir. Elle yazsaydık, varsayılanlar
     * değiştiğinde test panelden farklı bir şeyi ölçmeye devam ederdi.
     */
    const filtre = contactMessageFilterSchema.parse({});
    const sayfa = await fetchContactMessages(filtre);
    const satir = sayfa.items.find((m) => m.subject === subject);

    return {
      toplam: sayfa.total,
      okunmamis: sayfa.unreadCount,
      iceriyor: satir !== undefined,
      isRead: satir?.isRead ?? null,
      isSpam: satir?.isSpam ?? null,
      // Önizleme, ekranın listede göstereceği metin (`toPreview`). Tam gövde
      // DEĞİL: §8.20 gereği ziyaretçi metni test çıktısına düşmesin diye
      // yalnızca UZUNLUĞU bildiriliyor.
      onizlemeUzunlugu: satir?.preview.length ?? null,
    };
  },

  async iletisimMesajlariniTemizle(arg) {
    const { konuOneki } = JSON.parse(arg ?? '{}') as { konuOneki: string };
    if (!konuOneki || konuOneki.length < 4) {
      throw new Error('iletisimMesajlariniTemizle: en az 4 karakterlik bir konu öneki zorunlu.');
    }

    const { count } = await db.contactMessage.deleteMany({
      where: { subject: { startsWith: konuOneki } },
    });
    return { silinen: count };
  },

  /**
   * ⚠️ TEST KALINTISI — SİLİNEN DEĞİL, KALAN (T-107b).
   *
   * `global-teardown.ts` koşum sonunda şunu basıyordu:
   *
   *     [e2e] ... (artık proje: 0, mesaj: 1)
   *
   * Sayılar `projeleriTemizle`/`iletisimMesajlariniTemizle`'den geliyordu, yani
   * **SİLİNEN** satır sayısı — ama etiket "artık" (KALAN) diyordu. "mesaj: 1"
   * aslında "süpürme 1 mesaj sildi" demekti ve tablo gerçekten boştu.
   *
   * Kusur etiketten daha derin, ve tehlikeli yönü şu: silinen sayısı **hem her
   * şey temizken hem de SÜPÜRME YANLIŞ ÖNEKİ ARARKEN 0 çıkar.** Yani gerçek
   * bir kalıntı "0" olarak raporlanır — T-016'da kurulan izolasyon güvencesi
   * tam o sayıya dayanıyordu. Ölçülmesi gereken EYLEM ("sildim") değil, İDDİA
   * ("kalıntı yok").
   *
   * ⚠️ ÖNEK `e2e-t039` DEĞİL: süpürme tek bir göreve ait öneki arıyor, oysa
   * paketler başka işaretler de yazıyor (ör. T-054g denetim sondası
   * `E2EDenetimSondasi`). Kalıntı sayımı `e2e`/`E2E` ile başlayan HER izi
   * sayıyor — böylece kendi `afterAll`'u çöken bir paketin bıraktığı satır da
   * görünür.
   *
   * SINIR, dürüstçe: `e2e` ile başlamayan bir işaret bu sayıma da görünmez.
   * Mitigasyon bir SÖZLEŞME (test verisi `e2e`/`E2E` ile başlar), kanıt değil.
   */
  async e2eKalintisi() {
    const [proje, mesaj, denetim] = await Promise.all([
      db.project.count({ where: { slug: { startsWith: 'e2e', mode: 'insensitive' } } }),
      db.contactMessage.count({ where: { subject: { startsWith: 'e2e', mode: 'insensitive' } } }),
      db.auditLog.count({ where: { entity: { startsWith: 'e2e', mode: 'insensitive' } } }),
    ]);

    /*
     * ⚠️ F5 İZLERİ T-116'DA EKLENDİ — aynı kural: sayıma girmeyen bir iz,
     * çöken bir `afterAll`dan sonra "kalıntı yok" diye raporlanırdı.
     * Egzersiz ve alışkanlık arayüzden SİLİNEMİYOR (yalnızca arşiv), yani
     * test izi ancak `kisiselSondaSil` ile gider.
     */
    const [egzersiz, aliskanlik] = await Promise.all([
      db.exercise.count({ where: { name: { startsWith: 'e2e', mode: 'insensitive' } } }),
      db.habit.count({ where: { name: { startsWith: 'e2e', mode: 'insensitive' } } }),
    ]);
    const kisisel = egzersiz + aliskanlik;

    return {
      proje,
      mesaj,
      denetim,
      kisisel,
      toplam: proje + mesaj + denetim + kisisel,
    };
  },

  /**
   * F5 kişisel modül izlerini siler (T-116).
   *
   * Arayüzde SİLME YOLU YOK ve bilinçli: egzersiz `Restrict` FK'lı referans
   * veri, alışkanlık silinince `HabitLog` CASCADE geçmişi götürür. Test ise
   * kendi izini bırakmamak ZORUNDA (ADR-030). Sıra FK'lara göre: setler ve
   * rekorlar önce, egzersiz sonra. Sabit test gününün (`gun`) sağlık kaydı ve
   * antrenmanları da gider — gün 2001'de, gerçek veriyle çakışmaz.
   */
  async kisiselSondaSil(arg) {
    const { onek, gun } = JSON.parse(arg ?? '{}') as { onek: string; gun: string };
    if (!onek || onek.length < 4 || !/^\d{4}-\d{2}-\d{2}$/.test(gun ?? '')) {
      throw new Error('kisiselSondaSil: en az 4 karakterlik önek ve YYYY-AA-GG gün zorunlu.');
    }
    const tarih = new Date(`${gun}T00:00:00.000Z`);

    const egzersizler = await db.exercise.findMany({
      where: { name: { startsWith: onek } },
      select: { id: true },
    });
    const ids = egzersizler.map((e) => e.id);

    const antrenman = await db.workout.deleteMany({ where: { date: tarih } });
    const set = await db.workoutSet.deleteMany({ where: { exerciseId: { in: ids } } });
    const rekor = await db.personalRecord.deleteMany({ where: { exerciseId: { in: ids } } });
    const egzersiz = await db.exercise.deleteMany({ where: { id: { in: ids } } });
    const aliskanlik = await db.habit.deleteMany({ where: { name: { startsWith: onek } } });
    const saglik = await db.healthLog.deleteMany({ where: { date: tarih } });

    return {
      silinen:
        antrenman.count +
        set.count +
        rekor.count +
        egzersiz.count +
        aliskanlik.count +
        saglik.count,
    };
  },

  /**
   * §9/5 senaryosunun yazdığı işlemleri siler — AÇIKLAMA ÖNEKİNE göre.  /**
   * Denetim ekranına BİLİNEN bir `diff` yazar — T-054g sızıntı ölçümü için.  /**
   * Denetim ekranına BİLİNEN bir `diff` yazar — T-054g sızıntı ölçümü için.
   *
   * ⚠️ `writeAuditLog` KULLANILMIYOR, SATIR DOĞRUDAN YAZILIYOR. Sebep: amaç
   * redaksiyonu ölçmek DEĞİL (onu `tests/unit/services/denetim-kaydi.test.ts`
   * gerçek `redactAuditDiff` ile ölçüyor), OKUMA YOLUNU ölçmek. ADR-034
   * redaksiyonun bilmediği adı koruyamadığını kanıtladı; yani üretimde `diff`
   * sütununda SIZMIŞ bir değer BULUNABİLİR. Bu sonda tam o satırı taklit ediyor:
   * redaksiyondan geçirsem `yeniSifre` yine geçerdi ama `password` maskelenir ve
   * ölçtüğüm şey bulanıklaşırdı.
   *
   * İşaretler çağıran tarafta üretiliyor ve geri DÖNDÜRÜLMÜYOR (§8.20 alışkanlığı):
   * buradan yalnızca satır kimliği çıkıyor.
   */
  async denetimSondasiYaz(arg) {
    const { entity, entityId, diff } = JSON.parse(arg ?? '{}') as {
      entity: string;
      entityId: string;
      /* `Json` sütununun girdi tipi: `Record<string, unknown>` kabul edilmiyor
         çünkü `unknown` serileşemeyen bir değer de olabilir. Argüman zaten
         `JSON.parse`tan geldiği için serileşebilir olduğu kanıtlı. */
      diff: Prisma.InputJsonObject;
    };
    if (!entity || !entityId) {
      throw new Error('denetimSondasiYaz: `entity` ve `entityId` zorunlu.');
    }

    const user = await requireAdmin();
    const satir = await db.auditLog.create({
      data: {
        actorId: user.id,
        actorEmailHash: hashEmail(user.email),
        action: 'UPDATE',
        entity,
        entityId,
        diff,
        ip: '203.0.113.77',
      },
      select: { id: true },
    });

    return { id: satir.id };
  },

  /** Sondayı siler — KİMLİĞE göre, çünkü iki Playwright projesi aynı anda koşuyor. */
  async denetimSondasiSil(arg) {
    const { id } = JSON.parse(arg ?? '{}') as { id: string };
    if (!id) throw new Error('denetimSondasiSil: `id` zorunlu.');

    const { count } = await db.auditLog.deleteMany({ where: { id } });
    return { silinen: count };
  },

  /** Kilit denetim kaydı sayısı — ADR-022'nin uçtan uca doğrulanması için. */
  async lockAuditCount() {
    const user = await requireAdmin();
    const count = await db.auditLog.count({
      where: { entity: 'User', actorEmailHash: hashEmail(user.email), action: 'UPDATE' },
    });
    return { count };
  },
};

async function main(): Promise<void> {
  const [, , komut, arg] = process.argv;
  const calistir = komut ? komutlar[komut] : undefined;

  if (!calistir) {
    throw new Error(`Bilinmeyen komut: ${komut ?? '(yok)'}`);
  }

  const sonuc = await calistir(arg);

  // Çıktı YAZILDIKTAN SONRA süreç zorla sonlandırılır — gerekçe aşağıda.
  await new Promise<void>((resolve) => {
    process.stdout.write(JSON.stringify(sonuc ?? null), () => resolve());
  });
}

/**
 * Süreç `process.exit()` ile KAPATILIR — `$disconnect()` yetmiyor.
 *
 * ÖLÇÜLDÜ: `db.$disconnect()` çağrıldıktan sonra bile süreç tam 30 saniye
 * daha yaşıyor. Sebep, Prisma 7'nin sürücü adaptörü (ADR-005): altta yatan
 * `pg` havuzunu `src/server/db.ts` oluşturuyor ve `$disconnect()` onu
 * KAPATMIYOR; havuz `idleTimeoutMillis: 30_000` boyunca olay döngüsünü ayakta
 * tutuyor. Sonuç birebir 30 sn — tesadüf değil.
 *
 * Bu, kısa ömürlü her betiği etkiliyor (bkz. rapor / BULGU-007). Testler için
 * doğru çözüm burada beklemek değil, işi bitince çıkmak: çıktı zaten
 * yazıldı, veritabanı işlemi zaten tamamlandı.
 */
main()
  .then(() => {
    process.exit(0);
  })
  .catch((error: unknown) => {
    process.stderr.write(error instanceof Error ? error.message : String(error));
    process.exit(1);
  });
