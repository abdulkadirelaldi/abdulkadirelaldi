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
  const {
    resetAuthState,
    projeleriTemizle,
    iletisimMesajlariniTemizle,
    e2eKalintisi,
    E2E_ICERIK_ONEKI,
  } = await import('./db');

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
    const silinenProje = await projeleriTemizle(E2E_ICERIK_ONEKI);
    const silinenMesaj = await iletisimMesajlariniTemizle(E2E_ICERIK_ONEKI);

    /*
     * ⚠️ İKİ AYRI SAYI — T-107b'de ayrıldılar ve sebebi ölçülmüş bir kusur.
     *
     * Eskiden tek satır basılıyordu: "artık proje: 0, mesaj: 1". Sayılar
     * SİLİNEN satırlardı, etiket ise KALAN diyordu. Yanlış etiket tek başına
     * kozmetik olurdu; tehlikeli olan şu: silinen sayısı hem her şey temizken
     * HEM DE süpürme yanlış öneki ararken 0 çıkar. Yani gerçek bir kalıntı
     * "0" olarak raporlanır ve T-016'nın izolasyon güvencesi tam o sayıya
     * dayanıyordu.
     *
     * Artık süpürmenin EYLEMİ ile ortamın DURUMU ayrı ölçülüyor ve asıl
     * iddia ("kalıntı yok") ayrı bir sorgudan geliyor.
     */
    const kalinti = await e2eKalintisi();

    process.stdout.write(
      `[e2e] temizlik: ${silinenProje} proje + ${silinenMesaj} mesaj SİLİNDİ · ` +
        `KALAN test izi: ${kalinti.toplam} ` +
        `(proje ${kalinti.proje}, mesaj ${kalinti.mesaj}, denetim ${kalinti.denetim}).\n`,
    );

    /*
     * Kalıntı varsa SESSİZ GEÇİLMEZ. Bir sonraki koşum onu seed verisi sanır
     * (ADR-030: seed bir ölçüm sözleşmesidir) ve Lighthouse ya da liste
     * sayıları sessizce kayar. Fırlatmak koşumu kırmızıya çevirir — doğru
     * davranış: temizliği kaçıran paket bulunup düzeltilsin.
     */
    if (kalinti.toplam > 0) {
      throw new Error(
        `E2E test izi KALDI (${kalinti.toplam} satır). Süpürme yalnızca ` +
          `"${E2E_ICERIK_ONEKI}" önekini arıyor; başka işaret kullanan bir paket ` +
          'kendi `afterAll` temizliğini kaçırmış olabilir.',
      );
    }
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
