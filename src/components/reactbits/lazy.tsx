'use client';

import dynamic from 'next/dynamic';
import { useEffect, useState, type ComponentProps } from 'react';

import { useAzHareket } from '@/components/az-hareket';
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

/**
 * İstemci tarafı bağlandı mı.
 *
 * METİN BİLEŞENLERİNDE İSKELET KULLANILMIYOR — bunun yerine METNİN KENDİSİ
 * sunucuda render ediliyor ve bağlanma sonrası efektli sürümle değiştiriliyor.
 *
 * NEDEN (T-021 ölçümü): `ssr:false` bir bileşen HTML'de hiç yok demektir; hero
 * ismi sayfanın LCP öğesi olduğu için mobilde LCP 3.8sn'ye çıkıyor ve
 * Performance 88'e düşüyordu. Gri bir kutu göstermek hem LCP'yi kurtarmıyor
 * hem de kullanıcıya hiçbir şey söylemiyor. Metin doğrudan basılınca ilk
 * boyamada içerik var, efekt sonra biniyor — ölçüm: LCP 3.8s → 1.4s.
 *
 * §5.2.3 korunuyor: efekt bileşeninin KENDİSİ hâlâ `dynamic` + `ssr:false`.
 * Değişen, yüklenene kadar ne gösterildiği.
 */
function useBaglandi(): boolean {
  const [baglandi, setBaglandi] = useState(false);
  useEffect(() => setBaglandi(true), []);
  return baglandi;
}

/** İskelet fallback üreticisi — ölçü her zaman açıkça verilir (CLS = 0). */
function iskelet(className: string) {
  const Fallback = () => <Skeleton className={className} />;
  Fallback.displayName = 'ReactBitsIskelet';
  return Fallback;
}

/* =========================================================================
 * DİNAMİK YÜKLEMELER
 * ====================================================================== */

const ShinyTextDinamik = dynamic(() => import('./shiny-text'), { ssr: false });
const BlurTextDinamik = dynamic(() => import('./blur-text'), { ssr: false });
const RotatingTextDinamik = dynamic(() => import('./rotating-text'), { ssr: false });
const CountUpDinamik = dynamic(() => import('./count-up'), { ssr: false });
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
 * HAREKET EFEKTİ yüklensin mi — beş framer-motion tabanlı bileşenin ortak kapısı.
 * (ShinyText, BlurText, RotatingText, CountUp, TiltedCard)
 *
 * ÜÇ ŞART:
 *   `baglandi`   — hidrasyondan önce metnin KENDİSİ basılıyor (T-021 LCP notu)
 *   `!azHareket` — §5.2.4
 *   `masaustu`   — §5.2.5'in genişletilmesi; aşağıdaki ölçümle karara bağlandı
 *
 * MOBİL KAPISI NEDEN VAR (T-023, ölçüm):
 * Lighthouse'un mobil LCP tahmini, GÖZLENEN LCP anına (~100–150 ms) kadar biten
 * her ağ ve CPU düğümünü simüle etmekten çıkıyor (kaynak: Lantern
 * `FirstContentfulPaint.getFirstPaintBasedGraph`, `endTime <= cutoffTimestamp`).
 * Bu bileşenlerin parçaları hidrasyondan hemen sonra, yani ~130 ms'te iniyor —
 * yani sınırın TAM ÜSTÜNDE. Sonuç, koşudan koşuya değişen bir LCP:
 *
 *   kapı kapalı: kritik JS 135–189 kB → LCP 3315 / 3549 / 3696 ms, perf 92/91/90
 *   kapı açık:   kritik JS 135 kB     → LCP 3311 / 3312 / 3308 ms, perf 91/92/92
 *
 * Yani kapı LCP'nin ORTALAMASINI değil, KÖTÜ KOŞUSUNU düzeltiyor; 90 sınırına
 * değen koşu ortadan kalkıyor. Ayrıca gerçek bir telefonda 32 kB'lık
 * `framer-motion` parçası hiç inmiyor.
 *
 * TASARIM BEDELİ (rapora yazıldı): mobilde rozet parlamıyor, isim bulanıklaşarak
 * gelmiyor, sayı artmıyor ve ÜNVAN DÖNMÜYOR — listenin ilki sabit duruyor.
 * İçerik eksilmiyor, hareket eksiliyor. Kart eğimi zaten imleç istiyordu.
 */
function useEfektYuklensin(): boolean {
  const azHareket = useAzHareket();
  const masaustu = useMasaustu();
  const baglandi = useBaglandi();
  return baglandi && masaustu && !azHareket;
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
  const azHareket = useAzHareket();
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
  if (!useEfektYuklensin()) {
    return (
      <span className={`text-primary inline-block ${props.className ?? ''}`}>{props.text}</span>
    );
  }
  return <ShinyTextDinamik {...props} />;
}

/** Hero ismi — §5.1. Statik hâli: metnin son (net) hâli. */
export function BlurText(props: ComponentProps<typeof BlurTextDinamik>) {
  if (!useEfektYuklensin()) {
    return <p className={props.className}>{props.text}</p>;
  }
  return <BlurTextDinamik {...props} />;
}

/** Hero ünvanı. Statik hâli: listenin İLK ifadesi — dönmez. */
export function RotatingText(props: ComponentProps<typeof RotatingTextDinamik>) {
  if (!useEfektYuklensin()) {
    return <span className={props.mainClassName}>{props.texts[0] ?? ''}</span>;
  }
  return <RotatingTextDinamik {...props} />;
}

/** İstatistik sayacı. Statik hâli: doğrudan HEDEF sayı — sayma animasyonu yok. */
export function CountUp(props: ComponentProps<typeof CountUpDinamik>) {
  const baglandi = useBaglandi();
  const efekt = useEfektYuklensin();

  // Bağlanmadan önce 0 gösterilir: sayaç görünür olunca 0'dan sayacak,
  // hedef sayıyı önce gösterip sonra sıfırlamak yanlış olurdu.
  if (!baglandi) {
    return <span className={props.className}>0</span>;
  }
  if (!efekt) {
    const { to, separator } = props;
    const metin = separator ? to.toLocaleString('tr-TR').replace(/\./g, separator) : String(to);
    return <span className={props.className}>{metin}</span>;
  }
  return <CountUpDinamik {...props} />;
}

/** Proje kartı — 3B eğim. Statik hâli: eğimsiz görsel. */
export function TiltedCard(props: ComponentProps<typeof TiltedCardDinamik>) {
  if (!useEfektYuklensin()) {
    return (
      <figure
        className="rounded-card border-line bg-surface relative overflow-hidden border"
        style={{ height: props.containerHeight, width: props.containerWidth }}
      >
        {/*
          `gorsel` VARSA O KULLANILIR. Eskiden bu dal doğrudan <img> basıyordu ve
          çağıran taraf `gorsel` verdiğinde (Projeler: `KapakGorsel`) `src=""`
          olan boş bir görsel çiziliyordu — hareketi kapatan kullanıcı kapak
          yerine kırık kutu görüyordu. Mobil de bu dala düştüğü için hata artık
          görünür olurdu; kaynağında kapatıldı.
        */}
        {props.gorsel ?? (
          /* eslint-disable-next-line @next/next/no-img-element -- statik fallback; kaynak
             bileşenle aynı <img> sözleşmesini kullanır, next/image uzak alan adı
             yapılandırması ister (bkz. logo-loop.tsx notu). */
          <img
            src={typeof props.imageSrc === 'string' ? props.imageSrc : ''}
            alt={props.altText ?? ''}
            className="h-full w-full object-cover"
            style={{ height: props.imageHeight, width: props.imageWidth }}
          />
        )}
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

/**
 * Kıyı Medya müşteri logoları — §5.1 bunu hizmetler sayfasına koyuyor.
 *
 * ⚠️ BUGÜN ÇAĞIRAN YOK — T-026 kararı, gerekçesiyle:
 *
 * Gösterilecek logo VERİSİ yok. `Client` tablosu var ama public bir servisi
 * yok ve logolar `Attachment` olarak saklanacak; `AttachmentRefDto` da henüz
 * URL taşımıyor (ADR-018, T-037 bekliyor). Yani şerit ya boş kutularla ya da
 * uydurma logolarla çizilirdi.
 *
 * İkisi de kabul edilmedi: "müşteri logoları" başlıklı bir şerit, içindekiler
 * yer tutucu olsa bile "bunlar benim müşterilerim" iddiası taşır — ADR-027'nin
 * yasakladığı uydurma istatistikle aynı şey, üstelik görselle. Eksik bölüm,
 * yanlış iddiadan iyidir.
 *
 * BÖLÜMÜN AÇILMA KOŞULU (ikisi birden): (1) müşteri logolarını veren bir public
 * servis, (2) T-037'nin imzalı URL'leri. İkisi olduğunda `/hizmetler` sayfasına
 * bir bölüm eklenir ve bu bileşen oradan çağrılır — bileşenin kendisi T-020'de
 * uyarlandı, hazır duruyor.
 */
export const LogoLoop = dynamic(() => import('./logo-loop'), {
  ssr: false,
  loading: iskelet('h-16 w-full'),
});
