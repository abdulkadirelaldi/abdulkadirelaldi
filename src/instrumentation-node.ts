import { guvenliHata } from './lib/security/guvenli-log';
import { bildirimTuru } from './server/services/bildirim';
import { netVarlikKaydet } from './server/services/cuzdan-rapor';

/**
 * Zamanlayıcılar (bildirim, net varlık) — YALNIZCA Node çalışma zamanı (`instrumentation.ts`
 * bu dosyayı `NEXT_RUNTIME === 'nodejs'` dalında içe aktarır; Edge paketine
 * `web-push` ve Node modülleri girmez). Testte ve geliştirmede kurulmaz.
 */
if (process.env.NODE_ENV === 'production') {
  const hataYaz = (ad: string) => (error: unknown) =>
    guvenliHata(`[${ad}] tur başarısız:`, error instanceof Error ? error.message : error);

  // Bildirim: anahtar yoksa kurulmaz.
  if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
    const tur = () => bildirimTuru().catch(hataYaz('bildirim'));
    setInterval(tur, 5 * 60_000).unref();
    setTimeout(tur, 30_000).unref();
  }

  // Net varlık: saatte bir bugünün satırını günceller; gün sonu değeri kalır.
  const netTur = () => netVarlikKaydet().catch(hataYaz('net-varlik'));
  setInterval(netTur, 60 * 60_000).unref();
  setTimeout(netTur, 60_000).unref();
}
