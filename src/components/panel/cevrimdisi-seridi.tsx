'use client';

import { CloudOff, RefreshCw } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';

import {
  KUYRUK_OLAYI,
  kuyruguIsle,
  kuyruguOku,
  kuyruguYaz,
  type GonderimSonucu,
  type KuyrukKaydi,
} from '@/components/panel/hizli-kuyruk';
import { hizliHarcamaAction, hizliKiloAction, hizliSuAction } from '@/server/actions/hizli-ekle';

async function gonder(k: KuyrukKaydi): Promise<GonderimSonucu> {
  const sonuc =
    k.tur === 'harcama'
      ? await hizliHarcamaAction(k.girdi)
      : k.tur === 'kilo'
        ? await hizliKiloAction(k.girdi)
        : await hizliSuAction(k.girdi);
  if (sonuc.ok) return 'tamam';
  // Oturum düşmüş / geçici sunucu hatası: kayıt silinmez, sonra yeniden denenir.
  return sonuc.error.code === 'VALIDATION_ERROR' ? 'red' : 'bekle';
}

/**
 * ÇEVRİMDIŞI ŞERİDİ (2026-10-31): service worker'ı kurar, bağlantı durumunu ve
 * bekleyen kayıtları gösterir, bağlantı gelince kuyruğu gönderir. Geliştirmede
 * service worker kurulmaz (HMR ile çakışır).
 */
export function CevrimdisiSeridi() {
  const router = useRouter();
  const [cevrimdisi, setCevrimdisi] = useState(false);
  const [bekleyen, setBekleyen] = useState(0);
  const [reddedilen, setReddedilen] = useState(0);
  const isleniyor = useRef(false);

  const isle = useCallback(async () => {
    const kayitlar = kuyruguOku();
    if (isleniyor.current || !navigator.onLine || kayitlar.length === 0) return;
    isleniyor.current = true;
    const { kalan, gonderilen, reddedilen: red } = await kuyruguIsle(kayitlar, gonder);
    // Gönderim sürerken eklenen kayıtlar üzerine yazılmasın.
    const islenen = new Set(kayitlar.map((k) => k.id));
    kuyruguYaz([...kalan, ...kuyruguOku().filter((k) => !islenen.has(k.id))]);
    isleniyor.current = false;
    if (red > 0) setReddedilen((r) => r + red);
    if (gonderilen > 0) router.refresh();
  }, [router]);

  useEffect(() => {
    if (process.env.NODE_ENV === 'production' && 'serviceWorker' in navigator) {
      void navigator.serviceWorker.register('/ae-sw.js', { scope: '/' }).catch(() => undefined);
    }
    const guncelle = () => {
      setCevrimdisi(!navigator.onLine);
      setBekleyen(kuyruguOku().length);
    };
    const baglandi = () => {
      guncelle();
      void isle();
    };
    const gorunur = () => {
      if (document.visibilityState === 'visible') void isle();
    };
    guncelle();
    void isle();
    window.addEventListener('online', baglandi);
    window.addEventListener('offline', guncelle);
    window.addEventListener(KUYRUK_OLAYI, guncelle);
    document.addEventListener('visibilitychange', gorunur);
    return () => {
      window.removeEventListener('online', baglandi);
      window.removeEventListener('offline', guncelle);
      window.removeEventListener(KUYRUK_OLAYI, guncelle);
      document.removeEventListener('visibilitychange', gorunur);
    };
  }, [isle]);

  if (!cevrimdisi && bekleyen === 0 && reddedilen === 0) return null;

  return (
    <p
      role="status"
      data-yazdirmada-gizle
      className="bg-primary text-canvas fixed top-[calc(env(safe-area-inset-top)+4.5rem)] left-1/2 z-40 flex max-w-[90vw] -translate-x-1/2 items-center gap-2 rounded-full px-4 py-2 text-xs font-medium whitespace-nowrap shadow-lg"
    >
      {cevrimdisi ? (
        <CloudOff className="size-4 shrink-0" aria-hidden="true" />
      ) : (
        <RefreshCw className="size-4 shrink-0" aria-hidden="true" />
      )}
      {reddedilen > 0 && bekleyen === 0 && !cevrimdisi
        ? `${reddedilen} kayıt geçersiz olduğu için eklenemedi`
        : [cevrimdisi ? 'Bağlantı yok' : null, bekleyen > 0 ? `${bekleyen} kayıt bekliyor` : null]
            .filter(Boolean)
            .join(' · ')}
    </p>
  );
}
