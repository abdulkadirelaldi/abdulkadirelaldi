'use client';

import { RefreshCw } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect } from 'react';

import { birincilSiniflari, ikincilSiniflari } from '@/components/public/tasarim/dugmeler';
import { dilMi, VARSAYILAN_DIL } from '@/i18n/diller';
import { HATA_METNI } from '@/i18n/hata-metni';
import { yol } from '@/i18n/rotalar';

/**
 * Public bölümün hata sınırı.
 *
 * NEDEN VAR: `getProfile` profil kaydı yoksa BİLEREK fırlatır (ADR-017 —
 * tekil kayıt, yokluğu boş durum değil kurulum hatası). Sınır olmasaydı
 * ziyaretçi Next'in çıplak hata ekranını görürdü.
 *
 * HATA METNİ EKRANA YAZILMAZ (§8): mesaj veritabanı/dosya yolu sızdırabilir.
 * `digest` sunucu günlüğündeki kayda karşılık gelen opak kimliktir; ziyaretçi
 * onu bize iletince günlükte tam kaydı buluruz. Ayrıntı konsola düşer, sayfaya
 * değil.
 */
export default function PublicHata({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  // İstemci bileşeni sunucu başlığını göremez; dil adresin ilk parçasından.
  const ilk = usePathname().split('/')[1];
  const dil = dilMi(ilk) ? ilk : VARSAYILAN_DIL;
  const h = HATA_METNI[dil];

  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <section className="flex min-h-[70dvh] items-center pt-28 pb-20">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 md:px-8">
        <p
          aria-hidden="true"
          className="text-accent text-7xl font-semibold tracking-tight md:text-8xl"
        >
          {h.sus}
        </p>

        <h1 className="dev-baslik text-primary text-3xl md:text-4xl">{h.baslik}</h1>

        {/* Hata METNİ yazılmıyor (yukarıdaki §8 notu); yalnızca opak `digest`. */}
        {error.digest && (
          <p className="text-muted text-sm">
            {h.kod}: <span className="text-primary font-mono">{error.digest}</span>
          </p>
        )}

        <p className="text-body max-w-xl">{h.aciklama}</p>

        <div className="flex flex-wrap gap-3">
          <button type="button" onClick={reset} className={birincilSiniflari('md')}>
            <RefreshCw className="size-4" aria-hidden="true" />
            {h.tekrar}
          </button>
          <Link href={yol(dil, 'iletisim')} className={ikincilSiniflari('md')}>
            {h.banaYaz}
          </Link>
        </div>
      </div>
    </section>
  );
}
