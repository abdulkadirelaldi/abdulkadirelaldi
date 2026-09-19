import process from 'node:process';

/**
 * E2E küresel temizliği — TEST İZOLASYONU (T-018b / ENGEL-2).
 *
 * NEDEN OTOMATİK OLMAK ZORUNDA: 2FA'yı açık bırakan bir koşum, secret'ı
 * yalnızca testlerde bulunan bir hesap yaratır. Site sahibi kendi şifresiyle
 * giriş yapar, sistem doğrulama kodu ister ve o kodu üretebilecek bir cihaz
 * YOKTUR — yani kullanıcı kendi panelinden kilitlenir. Frontend bunu T-018b'de
 * elle temizlemek zorunda kaldı; bir kez unutulması yeterdi.
 *
 * Temizlik testler BAŞARISIZ OLSA DA koşar: `globalTeardown` Playwright
 * tarafından her koşum sonunda çağrılır. Kırmızı bir paket, bozuk bir
 * veritabanı bırakmamalı.
 */
export default async function globalTeardown(): Promise<void> {
  if (!process.env.E2E_DB_READY) {
    return;
  }

  // Veritabanı bağlantısı `db-task.ts` alt sürecine ait ve her çağrıda
  // kendisi kapatıyor — burada kapatılacak bir bağlantı yok.
  const { resetAuthState, projeleriTemizle, iletisimMesajlariniTemizle, E2E_ICERIK_ONEKI } =
    await import('./db');

  try {
    const startedAt = process.env.E2E_STARTED_AT;
    await resetAuthState(startedAt ? new Date(startedAt) : undefined);

    /*
     * İÇERİK İZLERİ (T-039) — §9/2 ve §9/6 gerçek kayıt yazıyor.
     *
     * Testler kendi izlerini `afterAll` içinde zaten siliyor; buradaki süpürme
     * o temizliğin KAÇIRDIĞI durumlar için: test ortada çöktüğünde, koşum
     * iptal edildiğinde ya da yeni bir senaryo temizliği yazmayı unuttuğunda.
     * Aksi hâlde `/projeler` sayfası koşum başına bir çöp kayıt biriktirir ve
     * bir gün Lighthouse ölçümünün girdisi olur (ADR-030: seed ölçüm
     * sözleşmesidir — test verisi o sözleşmeye sızmamalı).
     */
    const proje = await projeleriTemizle(E2E_ICERIK_ONEKI);
    const mesaj = await iletisimMesajlariniTemizle(E2E_ICERIK_ONEKI);

    // `console.info` değil — gerekçe `global-setup.ts` içinde.
    process.stdout.write(
      `[e2e] veritabanı seed durumuna döndürüldü (artık proje: ${proje}, mesaj: ${mesaj}).\n`,
    );
  } catch (error) {
    // Sessizce geçilmez: bozuk kalan durum bir sonraki koşumu yanıltır ve
    // en kötü hâlde site sahibini kendi panelinden kilitler.
    console.error(
      '[e2e] TEMİZLİK BAŞARISIZ — 2FA açık kalmış olabilir:',
      error instanceof Error ? error.message : error,
    );
    throw error;
  }
}
