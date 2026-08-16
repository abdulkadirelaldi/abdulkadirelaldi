'use client';

/*
 * İSTEMCİ BİLEŞENİ OLARAK KALDI — T-023'te sunucuya alındı, ÖLÇÜLDÜ, geri alındı.
 *
 * Beklenti: `'use client'` kalkarsa bölümün işaretlemesi istemci paketinden
 * çıkar. Derleme çıktısı bunu doğruladı bile: ana sayfa parçası 11.5 kB →
 * 3.39 kB, ilk yük 127 kB → 118 kB.
 *
 * GERÇEK ÖLÇÜM TERSİNİ SÖYLEDİ (Lighthouse mobil, her kol için 3 koşu, medyan;
 * her koşudan önce `.next` silinip sunucu yeniden ayağa kaldırıldı):
 *
 *   | Bölümler | belge | FCP    | LCP     | performans |
 *   | -------- | ----- | ------ | ------- | ---------- |
 *   | istemci  | 11 kB | 758 ms | 3312 ms | 92/91/92   |
 *   | sunucu   | 19 kB | 909 ms | 3556 ms | 91/91/89   |
 *
 * SEBEP: bölüm sunucuda render edilince RSC yükü BELGEYE SATIR İÇİ giriyor —
 * aynı içerik hem HTML hem flight verisi olarak iki kez. Belge 8 kB büyüyor ve
 * Slow 4G'de bu, ilk boyamayı doğrudan geciktiriyor. "First Load JS" sayısı
 * düşerken kullanıcının gördüğü an gecikiyor; derleme çıktısındaki sayı burada
 * yanıltıcı bir vekil.
 *
 * §7'nin "varsayılan Sunucu Bileşeni" kuralı hâlâ doğru; bu altı bölüm, uçtan
 * uca istemci bileşenlerinden (React Bits sarmalayıcıları, `BolumGiris`) oluşan
 * bir ağacın kökü oldukları için ölçüme dayalı istisna. Yeniden denenecekse
 * yukarıdaki tablo yeniden üretilmeli — sayısız değil, sayıyla tartışılsın.
 */

import Link from 'next/link';

import { BolumGiris } from '@/components/public/bolum-giris';
import { CountUp } from '@/components/reactbits/lazy';
import { cn } from '@/lib/utils/cn';
import type { ProfileDto } from '@/server/services/content-dto';
/**
 * `SiteStatsDto` `content-dto.ts`'te DEĞİL, `_shared/stats.ts`'te tanımlı.
 * `import type` derlemede tamamen silindiği için sunucu modülü istemci paketine
 * SIZMAZ (doğrulandı: `pnpm build` sonrası istemci parçalarında `_shared` yok).
 * Yine de tek kapı `content-dto` olmalı — raporun "Talepler" başlığında.
 */
import type { SiteStatsDto } from '@/server/services/_shared/stats';

type Kart = {
  /** Sayılacak hedef. */
  deger: number;
  /** Sayının hemen ardına eklenen ek ("+", "%"). */
  sonek?: string;
  etiket: string;
};

export type HakkimdaProps = {
  /** ADR-026 sözleşmesi. `bio` boş satırla ayrılmış paragraflara bölünür. */
  profil: ProfileDto;
  /** ADR-027 — TÜRETİLMİŞ istatistikler (`getSiteStats`). Elle sayı girilmez. */
  istatistikler: SiteStatsDto;
};

/**
 * DTO'daki alanları karta çevirir — ADR-027.
 *
 * İKİ KURAL, İKİSİ DE "UYDURMA SAYIDANSA EKSİK KART":
 *
 * 1. ALAN YOKSA KART YOK. `clients` bugün `SiteStatsDto`'da BULUNMUYOR ve
 *    bilerek bulunmuyor: müşteri sayısı hiçbir tablodan türetilemiyor, F4'e
 *    kadar da türetilemeyecek. Alan geldiğinde (opsiyonel `clients?: number`)
 *    buraya tek satır eklenir; o güne dek üçüncü kart RENDER EDİLMEZ. Eski
 *    "12 mutlu müşteri" kartı tam olarak bu yüzden kaldırıldı.
 *
 * 2. SIFIR DA KART ÜRETMEZ. `experienceYears: 0` boş veritabanında ve sitenin
 *    ilk yılında doğru bir sayıdır ama "0 yıl deneyim" yazan bir kart hem
 *    bilgi vermez hem de kendini kötüler. Yokluk, sıfırı ilan etmekten iyi.
 *    (Bu bir "veri yok" gizlemesi değil: ilgili bölüm zaten kendi `EmptyState`
 *    ile durumu söylüyor.)
 */
function kartlar(istatistikler: SiteStatsDto): Kart[] {
  const { experienceYears, publishedProjects } = istatistikler;

  return [
    experienceYears > 0 && { deger: experienceYears, sonek: '+', etiket: 'yıl deneyim' },
    publishedProjects > 0 && { deger: publishedProjects, etiket: 'yayınlanan proje' },
  ].filter((kart): kart is Kart => Boolean(kart));
}

/**
 * "Hakkımda" bölümü — §4.1.
 *
 * İstatistikler `CountUp` ile gelir ve §5.1 gereği GÖRÜNÜR OLUNCA tetiklenir
 * (bileşenin kendi `useInView`'ı hallediyor). Sayılar §3.2 gereği `tabular`
 * ile hizalı; yan yana dururken rakam genişliği oynamaz.
 */
export function Hakkimda({ profil, istatistikler }: HakkimdaProps) {
  const paragraflar = profil.bio
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);

  const istatistikKartlari = kartlar(istatistikler);

  return (
    <section id="hakkimda" aria-labelledby="hakkimda-baslik" className="scroll-mt-20">
      <div className="mx-auto max-w-6xl px-4 py-16 md:py-24">
        <BolumGiris className="flex flex-col gap-3">
          <p className="tabular text-accent-soft text-xs tracking-wider uppercase">02 — Hakkımda</p>
          <h2 id="hakkimda-baslik" className="text-3xl md:text-4xl">
            Kısaca ben
          </h2>
        </BolumGiris>

        <div className="mt-8 grid gap-10 md:grid-cols-[1.2fr_1fr]">
          <BolumGiris gecikme={0.08} className="flex flex-col gap-4">
            {paragraflar.map((paragraf) => (
              <p key={paragraf.slice(0, 32)} className="text-body max-w-2xl">
                {paragraf}
              </p>
            ))}

            <Link
              href="/hakkimda"
              prefetch={false}
              className="focus-ring text-accent-soft rounded-btn self-start text-sm font-medium"
            >
              Daha fazlası →
            </Link>
          </BolumGiris>

          {istatistikKartlari.length > 0 && (
            <BolumGiris gecikme={0.16}>
              {/*
                Sütun sayısı KART SAYISINDAN geliyor: sabit `grid-cols-2` tek
                kart kaldığında dar sütunda yarım genişlikte bir kutu bırakır.
                Masaüstünde her hâlde alt alta (yan sütun zaten dar).
              */}
              <dl
                className={cn(
                  'grid gap-4 md:grid-cols-1 md:gap-6',
                  istatistikKartlari.length > 1 ? 'grid-cols-2' : 'grid-cols-1',
                )}
              >
                {istatistikKartlari.map((istatistik) => (
                  <div
                    key={istatistik.etiket}
                    className="border-line bg-surface/60 rounded-card flex flex-col gap-1 border p-4"
                  >
                    <dt className="text-muted order-2 text-sm">{istatistik.etiket}</dt>
                    <dd className="tabular text-primary order-1 text-3xl font-medium">
                      <CountUp to={istatistik.deger} duration={1.4} />
                      {istatistik.sonek}
                    </dd>
                  </div>
                ))}
              </dl>
            </BolumGiris>
          )}
        </div>
      </div>
    </section>
  );
}
