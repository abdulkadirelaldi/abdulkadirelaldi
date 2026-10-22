'use client';

import { RefreshCw } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect } from 'react';

import { gradyanSiniflari, hapSiniflari } from '@/components/public/tasarim/gradyan-baglanti';
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
    <section className="relative isolate flex min-h-[80dvh] items-center overflow-hidden pt-28 pb-20">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 md:px-8">
        <p
          aria-hidden="true"
          className="dev-baslik metin-kontur text-[clamp(5rem,20vw,16rem)] leading-[0.8]"
        >
          {h.sus}
        </p>

        <h1 className="dev-baslik text-primary text-[clamp(2rem,6vw,4.5rem)]">{h.baslik}</h1>

        {/* Yığın izi gibi görünen satır SÜS + tek bilgi: opak `digest`. Hata
            METNİ yazılmıyor (yukarıdaki §8 notu). */}
        <pre className="tabular bg-surface border-line text-muted w-fit max-w-full overflow-x-auto rounded-[1rem] border px-5 py-4 text-xs leading-relaxed">
          <code>
            <span className="text-danger">Error</span>: {h.yigin}
            {'\n'}
            {'    '}at {h.konum} (abdulkadir@site){'\n'}
            {error.digest ? (
              <>
                {'    '}
                {h.kod}: <span className="text-primary">{error.digest}</span>
              </>
            ) : (
              <>
                {'    '}
                {h.kod}: —
              </>
            )}
          </code>
        </pre>

        <p className="text-body max-w-xl">{h.aciklama}</p>

        <div className="flex flex-wrap gap-3">
          <button type="button" onClick={reset} className={gradyanSiniflari('md')}>
            <RefreshCw className="size-4" aria-hidden="true" />
            {h.tekrar}
          </button>
          <Link href={yol(dil, 'iletisim')} className={hapSiniflari('h-11 px-5')}>
            {h.banaYaz}
          </Link>
        </div>
      </div>
    </section>
  );
}
