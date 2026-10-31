'use client';

import { Bell, BellOff, Droplet, Loader2, Sparkles, Trophy, Wallet } from 'lucide-react';
import { useEffect, useState, type ReactNode } from 'react';

import { cn } from '@/lib/utils/cn';
import {
  bildirimAboneOlAction,
  bildirimAyrilAction,
  bildirimTercihAction,
  testBildirimiAction,
} from '@/server/actions/bildirim';

type Tercih = { borc: boolean; aliskanlik: boolean; su: boolean; rekor: boolean };
type Destek = 'kontrol' | 'yok' | 'anaEkran' | 'var';

/** VAPID genel anahtarı (base64url) → `applicationServerKey`. */
function anahtar(base64url: string): Uint8Array<ArrayBuffer> {
  const b64 = (base64url + '='.repeat((4 - (base64url.length % 4)) % 4))
    .replace(/-/g, '+')
    .replace(/_/g, '/');
  const ham = atob(b64);
  const dizi = new Uint8Array(new ArrayBuffer(ham.length));
  for (let i = 0; i < ham.length; i++) dizi[i] = ham.charCodeAt(i);
  return dizi;
}

function cihazAdi(): string {
  const ua = navigator.userAgent;
  if (/iPhone/.test(ua)) return 'iPhone';
  if (/iPad/.test(ua)) return 'iPad';
  if (/Android/.test(ua)) return 'Android';
  if (/Mac/.test(ua)) return 'Mac';
  return 'Tarayıcı';
}

/**
 * BİLDİRİM AYARLARI (2026-10-30). iPhone'da push YALNIZCA ana ekrana eklenmiş
 * uygulamada (iOS 16.4+) çalışır; Safari sekmesinde açıldıysa ekran bunu
 * söyler. İzin isteği bir dokunuşla başlar — iOS kendiliğinden sormaya izin
 * vermez.
 */
export function BildirimAyarlari({
  vapidAnahtari,
  tercih: ilkTercih,
}: {
  vapidAnahtari: string | null;
  tercih: Tercih;
}) {
  const [destek, setDestek] = useState<Destek>('kontrol');
  const [abone, setAbone] = useState(false);
  const [bekliyor, setBekliyor] = useState(false);
  const [tercih, setTercih] = useState(ilkTercih);
  const [mesaj, setMesaj] = useState<{ ton: 'ok' | 'hata'; metin: string } | null>(null);

  useEffect(() => {
    const iOS = /iPhone|iPad/.test(navigator.userAgent);
    const anaEkranda =
      window.matchMedia('(display-mode: standalone)').matches ||
      (navigator as Navigator & { standalone?: boolean }).standalone === true;
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      setDestek(iOS && !anaEkranda ? 'anaEkran' : 'yok');
      return;
    }
    setDestek('var');
    void navigator.serviceWorker
      .getRegistration('/')
      .then((k) => k?.pushManager.getSubscription())
      .then((s) => setAbone(!!s));
  }, []);

  const ac = async () => {
    if (!vapidAnahtari) return;
    setBekliyor(true);
    setMesaj(null);
    try {
      const izin = await Notification.requestPermission();
      if (izin !== 'granted') {
        setMesaj({
          ton: 'hata',
          metin: 'İzin verilmedi. Ayarlar → Bildirimler → AE Panel’den açabilirsin.',
        });
        return;
      }
      const kayit = await navigator.serviceWorker.register('/ae-sw.js', { scope: '/' });
      await navigator.serviceWorker.ready;
      const abonelik =
        (await kayit.pushManager.getSubscription()) ??
        (await kayit.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: anahtar(vapidAnahtari),
        }));
      const json = abonelik.toJSON();
      const sonuc = await bildirimAboneOlAction({
        endpoint: json.endpoint,
        keys: json.keys,
        cihaz: cihazAdi(),
      });
      if (sonuc.ok) {
        setAbone(true);
        setMesaj({ ton: 'ok', metin: 'Bildirimler açıldı.' });
      } else setMesaj({ ton: 'hata', metin: sonuc.error.message });
    } catch {
      setMesaj({ ton: 'hata', metin: 'Bildirimler açılamadı. Yeniden dene.' });
    } finally {
      setBekliyor(false);
    }
  };

  const kapat = async () => {
    setBekliyor(true);
    setMesaj(null);
    try {
      const kayit = await navigator.serviceWorker.getRegistration('/');
      const abonelik = await kayit?.pushManager.getSubscription();
      if (abonelik) {
        await bildirimAyrilAction({ endpoint: abonelik.endpoint });
        await abonelik.unsubscribe();
      }
      setAbone(false);
      setMesaj({ ton: 'ok', metin: 'Bu cihazda bildirimler kapandı.' });
    } finally {
      setBekliyor(false);
    }
  };

  const degistir = async (alan: keyof Tercih) => {
    const yeni = { ...tercih, [alan]: !tercih[alan] };
    setTercih(yeni);
    const sonuc = await bildirimTercihAction(yeni);
    if (!sonuc.ok) {
      setTercih(tercih);
      setMesaj({ ton: 'hata', metin: sonuc.error.message });
    }
  };

  const test = async () => {
    setMesaj(null);
    const sonuc = await testBildirimiAction();
    setMesaj(
      sonuc.ok
        ? { ton: 'ok', metin: 'Test bildirimi gönderildi — birkaç saniye içinde gelir.' }
        : { ton: 'hata', metin: sonuc.error.message },
    );
  };

  return (
    <div className="flex flex-col gap-4">
      <section className="rounded-card border-line bg-surface flex flex-col gap-4 border p-5">
        <div className="flex items-start gap-3">
          <span className="bg-accent/12 text-accent flex size-10 shrink-0 items-center justify-center rounded-xl">
            {abone ? (
              <Bell className="size-5" aria-hidden="true" />
            ) : (
              <BellOff className="size-5" aria-hidden="true" />
            )}
          </span>
          <div className="flex flex-col gap-1">
            <h2 className="text-primary text-base">
              {abone ? 'Bu cihazda açık' : 'Bildirimler kapalı'}
            </h2>
            <p className="text-muted text-sm">
              Ödeme günleri, kalan alışkanlıklar ve su hatırlatmaları telefonuna gelir.
            </p>
          </div>
        </div>

        {!vapidAnahtari ? (
          <p className="text-warning text-sm">Bildirim anahtarları sunucuda henüz tanımlı değil.</p>
        ) : destek === 'anaEkran' ? (
          <p className="rounded-input bg-elevated text-body p-3 text-sm">
            iPhone’da bildirim için paneli <strong>ana ekrana ekle</strong> ve oradan aç: Safari’de
            Paylaş → “Ana Ekrana Ekle”.
          </p>
        ) : destek === 'yok' ? (
          <p className="text-muted text-sm">Bu tarayıcı bildirimleri desteklemiyor.</p>
        ) : destek === 'var' ? (
          <div className="flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              disabled={bekliyor}
              onClick={() => void (abone ? kapat() : ac())}
              className={cn(
                'focus-ring rounded-btn flex min-h-12 flex-1 items-center justify-center gap-2 px-4 font-medium disabled:opacity-60',
                abone ? 'bg-elevated text-primary' : 'bg-gradient-accent text-white',
              )}
            >
              {bekliyor && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
              {abone ? 'Bu cihazda kapat' : 'Bildirimleri aç'}
            </button>
            {abone && (
              <button
                type="button"
                onClick={() => void test()}
                className="focus-ring rounded-btn border-line text-primary min-h-12 flex-1 border px-4 font-medium"
              >
                Test bildirimi gönder
              </button>
            )}
          </div>
        ) : null}

        <p role="status" className="text-sm">
          {mesaj && (
            <span className={mesaj.ton === 'ok' ? 'text-success' : 'text-danger'}>
              {mesaj.metin}
            </span>
          )}
        </p>
      </section>

      <section aria-label="Bildirim türleri" className="rounded-card border-line bg-surface border">
        <Anahtar
          ikon={<Wallet className="size-4" aria-hidden="true" />}
          renk="from-emerald-500 to-teal-500"
          baslik="Ödeme günleri"
          aciklama="2 gün önce ve ödeme günü, 09:00"
          acik={tercih.borc}
          onClick={() => void degistir('borc')}
        />
        <Anahtar
          ikon={<Sparkles className="size-4" aria-hidden="true" />}
          renk="from-violet-500 to-purple-500"
          baslik="Kalan alışkanlıklar"
          aciklama="Akşam 21:00, işaretlenmemiş varsa"
          acik={tercih.aliskanlik}
          onClick={() => void degistir('aliskanlik')}
        />
        <Anahtar
          ikon={<Droplet className="size-4" aria-hidden="true" />}
          renk="from-sky-500 to-blue-600"
          baslik="Su hatırlatması"
          aciklama="11:00, 15:00, 18:00 — 3,5 L'ye ulaşmadıysan"
          acik={tercih.su}
          onClick={() => void degistir('su')}
        />
        <Anahtar
          ikon={<Trophy className="size-4" aria-hidden="true" />}
          renk="from-amber-500 to-orange-500"
          baslik="Yeni rekor"
          aciklama="Bir harekette rekorunu geçtiğinde"
          acik={tercih.rekor}
          onClick={() => void degistir('rekor')}
        />
      </section>
    </div>
  );
}

function Anahtar({
  ikon,
  renk,
  baslik,
  aciklama,
  acik,
  onClick,
}: {
  ikon: ReactNode;
  renk: string;
  baslik: string;
  aciklama: string;
  acik: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={acik}
      onClick={onClick}
      className="focus-ring border-line flex w-full items-center gap-3 border-b p-4 text-left last:border-b-0"
    >
      <span
        className={cn(
          'flex size-8 shrink-0 items-center justify-center rounded-[0.6rem] bg-linear-to-br text-white',
          renk,
        )}
      >
        {ikon}
      </span>
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="text-primary text-sm font-medium">{baslik}</span>
        <span className="text-muted text-xs">{aciklama}</span>
      </span>
      <span
        aria-hidden="true"
        className={cn(
          'relative h-7 w-12 shrink-0 rounded-full transition-colors',
          acik ? 'bg-success' : 'bg-line-hover',
        )}
      >
        <span
          className={cn(
            'absolute top-0.5 size-6 rounded-full bg-white shadow transition-transform',
            acik ? 'translate-x-5.5' : 'translate-x-0.5',
          )}
        />
      </span>
    </button>
  );
}
