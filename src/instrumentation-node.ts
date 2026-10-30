import { guvenliHata } from './lib/security/guvenli-log';
import { bildirimTuru } from './server/services/bildirim';

/**
 * Bildirim zamanlayıcısı — YALNIZCA Node çalışma zamanı (`instrumentation.ts`
 * bu dosyayı `NEXT_RUNTIME === 'nodejs'` dalında içe aktarır; Edge paketine
 * `web-push` ve Node modülleri girmez). 5 dakikada bir tur; ilk tur 30 sn
 * sonra. VAPID anahtarı yoksa kurulmaz.
 */
if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  const tur = () =>
    bildirimTuru().catch((error: unknown) =>
      guvenliHata('[bildirim] tur başarısız:', error instanceof Error ? error.message : error),
    );
  setInterval(tur, 5 * 60_000).unref();
  setTimeout(tur, 30_000).unref();
}
