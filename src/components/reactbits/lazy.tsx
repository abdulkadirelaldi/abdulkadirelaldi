'use client';

import { useReducedMotion } from 'framer-motion';
import dynamic from 'next/dynamic';
import { useEffect, useState, type ComponentProps } from 'react';

import { useTheme } from '@/components/theme-provider';
import { Skeleton } from '@/components/ui/skeleton';

/**
 * React Bits bileşenlerinin TEK GİRİŞ NOKTASI — §5.2.3 ve §5.2.4.
 *
 * KURAL: sayfalar `@/components/reactbits/<dosya>` yolundan DOĞRUDAN import
 * ETMEZ, buradan alır. Sebep: §5.2'nin üç şartını tek yerde garanti altına almak.
 *
 *   1. `next/dynamic` + `ssr: false` — efekt sunucuda render edilmez.
 *      (`ssr: false` yalnızca istemci modülünden çağrılabilir; bu dosya
 *      `'use client'` olduğu için sunucu sayfaları da bunları render edebilir.)
 *   2. İSKELET fallback — yüklenene kadar AYNI ÖLÇÜDE yer tutucu durur, CLS = 0.
 *   3. `prefers-reduced-motion` → animasyon YERİNE statik içerik.
 *
 * 3. MADDE NEDEN BURADA: globals.css'teki global kural yalnızca CSS
 * animasyonlarını durduruyor. ShinyText, BlurText, RotatingText, CountUp ve
 * TiltedCard hareketi JavaScript'le (rAF / spring) üretiyor — CSS kuralı onlara
 * DEĞMEZ. Burada karar sarmalayıcıda verilince iki kazanç birden oluyor:
 * kullanıcı statik içeriği görür VE animasyonlu parça hiç indirilmez.
 *
 * Hover ile tetiklenen bileşenler (SpotlightCard, GlassIcons) kendiliğinden
 * hareket etmiyor; CSS tabanlı olanlar (StarBorder, GooeyNav, LogoLoop) global
 * kurala zaten yakalanıyor. Bu yüzden onlarda ayrı statik dal yok.
 */

/** İskelet fallback üreticisi — ölçü her zaman açıkça verilir (CLS = 0). */
function iskelet(className: string) {
  const Fallback = () => <Skeleton className={className} />;
  Fallback.displayName = 'ReactBitsIskelet';
  return Fallback;
}

/* =========================================================================
 * DİNAMİK YÜKLEMELER
 * ====================================================================== */

const ShinyTextDinamik = dynamic(() => import('./shiny-text'), {
  ssr: false,
  loading: iskelet('h-6 w-40'),
});
const BlurTextDinamik = dynamic(() => import('./blur-text'), {
  ssr: false,
  loading: iskelet('h-12 w-72'),
});
const RotatingTextDinamik = dynamic(() => import('./rotating-text'), {
  ssr: false,
  loading: iskelet('h-8 w-56'),
});
const CountUpDinamik = dynamic(() => import('./count-up'), {
  ssr: false,
  loading: iskelet('h-9 w-16'),
});
const TiltedCardDinamik = dynamic(() => import('./tilted-card'), {
  ssr: false,
  loading: iskelet('aspect-[16/10] w-full rounded-card'),
});

/**
 * WebGL — §5.2.2 gereği SAYFA BAŞINA TEK. Ana sayfada bu hak hero arka planınındır.
 * İskelet YOK: arka plan katmanı, yüklenene kadar statik gradient duruyor zaten.
 */
const AuroraDinamik = dynamic(() => import('./aurora'), { ssr: false });

/* =========================================================================
 * WEBGL — §5.2.2 (sayfa başına tek) ve §5.2.5 (mobilde hiç yüklenmez)
 * ====================================================================== */

/**
 * Masaüstü mü? `matchMedia` İLK RENDER'DA `false` döner ve ancak `useEffect`
 * sonrası gerçek değere geçer.
 *
 * BU GECİKME KASITLI: `false` iken `AuroraDinamik` JSX'e HİÇ girmez, dolayısıyla
 * `import('./aurora')` çağrılmaz ve `ogl` parçası AĞDAN İSTENMEZ. Mobil
 * kullanıcı bileşeni "gizlenmiş" hâlde indirmez — hiç indirmez (§5.2.5).
 */
function useMasaustu(): boolean {
  const [masaustu, setMasaustu] = useState(false);

  useEffect(() => {
    const sorgu = window.matchMedia('(min-width: 768px)');
    const esitle = () => setMasaustu(sorgu.matches);
    esitle();
    sorgu.addEventListener('change', esitle);
    return () => sorgu.removeEventListener('change', esitle);
  }, []);

  return masaustu;
}

/**
 * Hero arka planı — tek WebGL bileşeni (§5.1, §5.2.2).
 *
 * DÖRT DURUMDA HİÇ YÜKLENMEZ:
 *   - `<768px`                  → §5.2.5, mobilde WebGL yok
 *   - `prefers-reduced-motion`  → §5.2.4
 *   - AYDINLIK TEMA             → §5.2.7, aşağıdaki ölçüm
 *   - JS kapalı / hidrasyon öncesi → `ssr: false`
 * Dördünde de yerini `aurora-statik` CSS gradient'i alır; ölçü aynı kaldığı için
 * CLS oluşmaz.
 *
 * AYDINLIK TEMA NEDEN DIŞARIDA (T-020b ölçümü): Aurora'nın shader'ı rengi
 * yoğunlukla çarpıyor ve koyu-doygun pikseller üretiyor. Koyu zeminde bunlar
 * zeminden AÇIK kalıyor, sorun yok. Aydınlık zeminde (#F8F8FC) ise ORTA TONA
 * düşüyor ve ne açık ne koyu metin token'ı temizleyebiliyor:
 *
 *   opacity 0.45 → rozet 2.13:1 · özet 3.11:1   (AA = 4.5)
 *   opacity 0.10'a inmek gerekiyordu — bu efekti kısmak değil, yok etmek.
 *   Metin arkasına 0.70 perde bile rozeti ancak 4.28'e taşıyor.
 *
 * §5.2.7 açık: "efekt hiçbir zaman okunabilirliğin önüne geçmez". Aydınlık tema
 * zaten §3'ün tarif ettiği "koyu, derin mor-lacivert zemin" yönünün dışında;
 * orada statik gradient hem okunur hem tutarlı.
 *
 * `opacity` §5.1 gereği 0.5'i AŞAMAZ — prop olarak verilse bile kırpılır.
 */
export function Aurora({
  opacity = 0.45,
  className,
  ...props
}: ComponentProps<typeof AuroraDinamik> & { opacity?: number; className?: string }) {
  const azHareket = useReducedMotion();
  const masaustu = useMasaustu();
  const { resolvedTheme } = useTheme();
  const webglYuklensin = masaustu && !azHareket && resolvedTheme === 'dark';

  return (
    <div className={`aurora-katman ${className ?? ''}`} aria-hidden="true">
      {webglYuklensin ? (
        <div style={{ opacity: Math.min(opacity, 0.5) }} className="h-full w-full">
          <AuroraDinamik {...props} />
        </div>
      ) : (
        <div className="aurora-statik h-full w-full" />
      )}
    </div>
  );
}

/* =========================================================================
 * METİN EFEKTLERİ — hareket kapalıyken statik karşılıkları
 * ====================================================================== */

/** Rozet metni ("Full Stack Developer") — §5.1. Statik hâli: düz metin. */
export function ShinyText(props: ComponentProps<typeof ShinyTextDinamik>) {
  const azHareket = useReducedMotion();
  if (azHareket) {
    return (
      <span className={`text-primary inline-block ${props.className ?? ''}`}>{props.text}</span>
    );
  }
  return <ShinyTextDinamik {...props} />;
}

/** Hero ismi — §5.1. Statik hâli: metnin son (net) hâli. */
export function BlurText(props: ComponentProps<typeof BlurTextDinamik>) {
  const azHareket = useReducedMotion();
  if (azHareket) {
    return <p className={props.className}>{props.text}</p>;
  }
  return <BlurTextDinamik {...props} />;
}

/** Hero ünvanı. Statik hâli: listenin İLK ifadesi — dönmez. */
export function RotatingText(props: ComponentProps<typeof RotatingTextDinamik>) {
  const azHareket = useReducedMotion();
  if (azHareket) {
    return <span className={props.mainClassName}>{props.texts[0] ?? ''}</span>;
  }
  return <RotatingTextDinamik {...props} />;
}

/** İstatistik sayacı. Statik hâli: doğrudan HEDEF sayı — sayma animasyonu yok. */
export function CountUp(props: ComponentProps<typeof CountUpDinamik>) {
  const azHareket = useReducedMotion();
  if (azHareket) {
    const { to, separator } = props;
    const metin = separator ? to.toLocaleString('tr-TR').replace(/\./g, separator) : String(to);
    return <span className={props.className}>{metin}</span>;
  }
  return <CountUpDinamik {...props} />;
}

/** Proje kartı — 3B eğim. Statik hâli: eğimsiz görsel. */
export function TiltedCard(props: ComponentProps<typeof TiltedCardDinamik>) {
  const azHareket = useReducedMotion();
  if (azHareket) {
    return (
      <figure
        className="rounded-card border-line bg-surface relative overflow-hidden border"
        style={{ height: props.containerHeight, width: props.containerWidth }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- statik fallback; kaynak
            bileşenle aynı <img> sözleşmesini kullanır, next/image uzak alan adı
            yapılandırması ister (bkz. logo-loop.tsx notu). */}
        <img
          src={typeof props.imageSrc === 'string' ? props.imageSrc : ''}
          alt={props.altText ?? ''}
          className="h-full w-full object-cover"
          style={{ height: props.imageHeight, width: props.imageWidth }}
        />
      </figure>
    );
  }
  return <TiltedCardDinamik {...props} />;
}

/* =========================================================================
 * CSS TABANLI / HOVER TETİKLİ — global reduced-motion kuralı yeterli
 * ====================================================================== */

/** Birincil buton kenarı — gradient kenar. */
export const StarBorder = dynamic(() => import('./star-border'), {
  ssr: false,
  loading: iskelet('h-12 w-44 rounded-btn'),
});

/** Yetenek ve hizmet kartları — hover'da mor spotlight. */
export const SpotlightCard = dynamic(() => import('./spotlight-card'), {
  ssr: false,
  loading: iskelet('min-h-44 rounded-card'),
});

/** Sosyal ikonlar. */
export const GlassIcons = dynamic(() => import('./glass-icons'), {
  ssr: false,
  loading: iskelet('h-14 w-56'),
});

/**
 * Aktif bölüm göstergesi — YALNIZCA masaüstü (çağıran taraf `md:` ile sarar).
 * Altındaki gerçek `<a>` listesi korunur: JS yüklenmeden de gezinilebilmeli.
 */
export const GooeyNav = dynamic(() => import('./gooey-nav'), {
  ssr: false,
  loading: iskelet('h-10 w-96'),
});

/** Kıyı Medya müşteri logoları — hizmetler sayfası (§5.1). */
export const LogoLoop = dynamic(() => import('./logo-loop'), {
  ssr: false,
  loading: iskelet('h-16 w-full'),
});
