import { statfs } from 'node:fs/promises';
import process from 'node:process';

import { expect, test } from '@playwright/test';

/**
 * API uçlarının SÖZLEŞME testleri — T-016b'nin kapattığı kapsam boşluğu.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * NEDEN BU DOSYA VAR
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * T-016b rota envanterini kapı kapsamıyla karşılaştırdı. İki uç, gerçek bir
 * sunucuya karşı HİÇ ÇAĞRILMIYORDU:
 *
 * 1. `/api/v1/health` — `security-headers.spec.ts` bu uca istek atıyor ama
 *    YALNIZCA BAŞLIKLARA bakıyor; durum kodu ve gövde bilerek denetim dışı
 *    bırakılmış:
 *      "Durum kodu bilinçli olarak doğrulanmıyor: DB kapalıyken 503 döner ve
 *       bu DOĞRU davranıştır (T-003b)."
 *    O gerekçe YAZILDIĞI GÜN doğruydu — CI'da veritabanı yoktu. T-005b
 *    Postgres'i kapıya soktuğundan beri öncül bayat: CI'da DB ayakta, migrate
 *    ve seed koşuyor, yani sağlıklı yanıt ARTIK BEKLENEBİLİR bir şey.
 *    §13.7'de izleme (Uptime Kuma) bu ucun gövdesine bakacak; gövdeyi hiçbir
 *    kapı doğrulamıyorsa "servis ayakta" sinyali doğrulanmamış demektir.
 *
 * 2. `/api/v1/iletisim` — kapsamlı BİRİM testi var (`tests/unit/api/`), ama
 *    birim testi rota işleyicisini DOĞRUDAN çağırır: dosyanın Next tarafından
 *    gerçekten bir uç olarak sunulduğunu göstermez. Yanlış dışa aktarım adı,
 *    yanlış `runtime`, yanlış dizin — üçü de birim testlerini yeşil bırakır.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * NE ÖLÇÜLMÜYOR — BİLEREK
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * `/api/v1/iletisim` için BAŞARILI gönderim burada denenmiyor: gerçek bir
 * kayıt yazar ve bildirim yolunu tetikler. Yazma yolunun kuralları (kısıtlama,
 * honeypot, zaman tuzağı, alan doğrulama) birim testlerinde ölçülüyor ve orası
 * doğru yer. Buradaki soru daha dar ve birim testinin CEVAPLAYAMADIĞI soru:
 * "uç gerçekten sunuluyor ve geçersiz girdiyi §7.2 zarfıyla reddediyor mu?"
 */

/**
 * Ucun sözleşmesi ORTAMA BAĞLI: disk %5'in altına inerse 503 döner ve bu
 * DOĞRU davranıştır (`route.ts` → `DISK_CRITICAL_FREE_RATIO`). Bu yüzden
 * beklenti sabit yazılmıyor, ÖNCE ölçülüyor — T-029e'de WebGL kontrolünün
 * koşucunun çizim gücüne göre iddia seçmesiyle aynı disiplin. Sabit 200
 * yazsaydık, diski dolu bir makinede kapı KODDA HİÇBİR ŞEY BOZULMADAN
 * kırmızıya döner ve "haksız düşen kapı" güvenilirliği aşındırırdı.
 *
 * Ölçüm testin kendi süreçinden yapılabiliyor çünkü ölçüm sunucusu AYNI
 * makinede koşuyor (`playwright.config.ts` → `webServer`). Sunucu bir gün
 * uzak bir makineye taşınırsa bu varsayım bozulur ve bu blok gözden
 * geçirilmelidir.
 */
const DISK_KRITIK_ORAN = 0.05;

async function bostaDiskOrani(): Promise<number | null> {
  try {
    const s = await statfs(process.cwd());
    const toplam = Number(s.blocks) * Number(s.bsize);
    const bos = Number(s.bavail) * Number(s.bsize);

    return Number.isFinite(toplam) && toplam > 0 ? bos / toplam : null;
  } catch {
    return null;
  }
}

test.describe('§13.6 · /api/v1/health — izlemenin baktığı sözleşme', () => {
  /**
   * CI'da beklenen dal SAĞLIKLI daldır: `ci.yml` Postgres servis container'ını,
   * `prisma migrate deploy`i ve seed'i koşturuyor, koşucu diski de boş. DB
   * düşerse test kırmızı olur ve bu DOĞRU sonuçtur — ucun tek işi bunu
   * bildirmek.
   */
  test('§7.2 zarfı: sağlıklıyken 200/db:up, diski kritikken 503', async ({ request }) => {
    const oran = await bostaDiskOrani();
    const diskKritik = oran !== null && oran < DISK_KRITIK_ORAN;

    const yanit = await request.get('/api/v1/health');
    const govde = await yanit.json();

    if (diskKritik) {
      /*
       * ARIZA DALI — bu dalın da bir sözleşmesi var ve bugüne kadar hiçbir
       * kapı onu ölçmemişti: izleme 503 gördüğünde gövdenin §7.2 hata zarfı
       * olmasına ve ayrıntı sızdırmamasına güveniyor.
       */
      // Ölçülen dal koşum çıktısına yazılır: "yeşil" gördüğünde hangi dalın
      // sınandığını bilmeyen okuyucu, sağlıklı dalın ölçüldüğünü sanır.
      console.warn(
        `disk boş oranı %${(oran * 100).toFixed(1)} < %${DISK_KRITIK_ORAN * 100} — ` +
          'ARIZA dalı ölçülüyor, sağlıklı dal bu koşumda ÖLÇÜLMEDİ.',
      );

      expect(yanit.status()).toBe(503);
      expect(govde.ok).toBe(false);
      expect(govde.error?.code).toBe('INTERNAL_ERROR');
      expect(govde.data).toBeUndefined();

      return;
    }

    expect(yanit.status(), 'disk yeterli ve DB ayaktayken sağlık ucu 200 dönmeli').toBe(200);

    expect(govde.ok).toBe(true);
    expect(govde.data).toBeDefined();
    expect(govde.error).toBeUndefined();

    // §13.6'nın bildirdiği dört alan. İzleme bunlara bakacak; biri sessizce
    // kaybolursa uyarı kuralları da sessizce anlamsızlaşır.
    expect(govde.data.db).toBe('up');
    expect(typeof govde.data.uptime).toBe('number');
    expect(govde.data.uptime).toBeGreaterThanOrEqual(0);
    expect(['ok', 'low', 'unknown']).toContain(govde.data.disk);
    expect(Number.isNaN(Date.parse(govde.data.timestamp)), 'timestamp ISO 8601 değil').toBe(false);
  });

  /**
   * §8.20 — sağlık ucu bir arıza anında ALTYAPI AYRINTISI sızdırmamalı.
   *
   * Bu kontrol sağlıklı yanıtta da anlamlı: gövdeye bir gün "debug" alanı
   * eklenirse (bağlantı dizesi, host adı, sürüm) burada yakalanır. Uç zaten
   * kimliksiz ve herkese açık — §13.7 gereği öyle olmak zorunda.
   */
  test('gövde altyapı ayrıntısı taşımıyor (§8.20)', async ({ request }) => {
    const metin = await (await request.get('/api/v1/health')).text();

    const sizinti: Array<{ etiket: string; desen: RegExp }> = [
      { etiket: 'bağlantı dizesi', desen: /postgres(ql)?:\/\//i },
      { etiket: 'yığın izi', desen: /\bat\s+\w+\s+\(/ },
      { etiket: 'dosya yolu', desen: /\/(?:home|Users|var|app)\/[\w./-]+/ },
      { etiket: 'ortam değişkeni adı', desen: /DATABASE_URL|AUTH_SECRET|TOTP_ENCRYPTION_KEY/ },
    ];

    const bulunan = sizinti.filter((s) => s.desen.test(metin)).map((s) => s.etiket);

    expect(bulunan, `sağlık gövdesinde: ${bulunan.join(', ')}`).toEqual([]);
  });
});

test.describe('§7.2 · /api/v1/iletisim — uç gerçekten sunuluyor mu', () => {
  /**
   * BAŞARILI GÖNDERİM DEĞİL, REDDEDİLEN GÖNDERİM.
   *
   * Bozuk JSON, doğrulamadan önceki en dış katmanda reddediliyor: ne kayıt
   * yazılıyor ne bildirim gönderiliyor. Yani bu istek kapıyı ölçerken ölçtüğü
   * sistemi DEĞİŞTİRMİYOR — E2E'nin veri bırakmaması, testlerin birbirinden
   * bağımsız kalmasının şartı.
   */
  /**
   * GET, formun jeton kaynağı (§8.15 zaman tuzağı). Uç 500 dönerse — örneğin
   * `AUTH_SECRET` ortamda yoksa — iletişim formu jetonsuz kalır ve zaman
   * tuzağı FARK EDİLMEDEN kapanır. Birim testi bunu ölçemez: orada sır her
   * zaman kurulu.
   */
  test('GET jeton veriyor — zaman tuzağı sessizce kapanmamış (§8.15)', async ({ request }) => {
    const yanit = await request.get('/api/v1/iletisim');

    expect(yanit.status(), 'AUTH_SECRET yoksa uç 500 döner ve tuzak kapanır').toBe(200);

    const govde = await yanit.json();

    expect(govde.ok).toBe(true);
    expect(typeof govde.data?.formToken).toBe('string');
    expect(govde.data.formToken.length).toBeGreaterThan(0);
    expect(typeof govde.data?.minFillSeconds).toBe('number');
  });

  test('bozuk gövde → 400 ve §7.2 hata zarfı (500 DEĞİL)', async ({ request }) => {
    const yanit = await request.post('/api/v1/iletisim', {
      headers: { 'Content-Type': 'application/json' },
      data: 'bu gecerli bir JSON degil',
    });

    // 404 çıkarsa uç HİÇ SUNULMUYOR demektir — bu testin asıl yakaladığı şey o.
    expect(yanit.status(), 'uç sunulmuyor ya da beklenmedik durum kodu').toBe(400);

    const govde = await yanit.json();

    expect(govde.ok).toBe(false);
    expect(govde.error?.code).toBe('VALIDATION_ERROR');
    expect(typeof govde.error?.message).toBe('string');
    expect(govde.data).toBeUndefined();
  });

  /**
   * Zarf içeriği kadar önemli olan: hata mesajının GİRDİYİ geri yansıtmaması.
   * Yansıtsaydı, kimliksiz bir uç üzerinden yansıtılmış içerik (reflected
   * content) üretilebilirdi.
   */
  test('hata gövdesi gönderilen içeriği geri yansıtmıyor', async ({ request }) => {
    const isaret = 'ELALDI-YANSIMA-SONDASI-4271';

    const yanit = await request.post('/api/v1/iletisim', {
      headers: { 'Content-Type': 'application/json' },
      data: `{"bozuk": "${isaret}"`,
    });

    expect(yanit.status()).toBe(400);
    expect(await yanit.text()).not.toContain(isaret);
  });
});
