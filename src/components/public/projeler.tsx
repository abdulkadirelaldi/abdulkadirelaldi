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

import { FolderOpen } from 'lucide-react';
import Link from 'next/link';

import { BolumGiris } from '@/components/public/bolum-giris';
import { KapakGorsel } from '@/components/public/kapak-gorsel';
import { TiltedCard } from '@/components/reactbits/lazy';
import { Badge } from '@/components/ui/badge';
import { buttonClasses } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import type { ProjectListItemDto } from '@/server/services/content-dto';

export type ProjelerProps = {
  /** ADR-026 sözleşmesi. Sıralama çağıran tarafın işi; burada `order` uygulanır. */
  projeler: ProjectListItemDto[];
};

/** Kartın 3B eğim yüksekliği — iskelet ve gerçek kart aynı ölçüde (CLS 0). */
const KART_YUKSEKLIGI = '260px';

/**
 * "Öne çıkan projeler" bölümü — §4.1.
 *
 * §5.1: ızgara `TiltedCard`. ChromaGrid ile BİRLİKTE KULLANILMAZ; ADR-025
 * gsap'i reddettiği için TiltedCard seçildi.
 *
 * Kapaklar `KapakGorsel` ile çizilir: `AttachmentRefDto` URL taşımadığı için
 * (ADR-018) bugün hepsi yer tutucu. Yer ayırma en-boy oranıyla yapıldığından
 * T-037 imzalı URL'leri getirdiğinde düzen değişmez.
 */
export function Projeler({ projeler }: ProjelerProps) {
  const sirali = [...projeler].sort((a, b) => a.order - b.order);

  return (
    <section id="projeler" aria-labelledby="projeler-baslik" className="scroll-mt-20">
      <div className="mx-auto max-w-6xl px-4 py-16 md:py-24">
        <BolumGiris className="flex flex-wrap items-end justify-between gap-4">
          <div className="flex flex-col gap-3">
            <p className="tabular text-accent-soft text-xs tracking-wider uppercase">
              04 — Projeler
            </p>
            <h2 id="projeler-baslik" className="text-3xl md:text-4xl">
              Öne çıkan işler
            </h2>
          </div>

          {sirali.length > 0 && (
            <Link
              href="/projeler"

              className="focus-ring text-accent-soft rounded-btn text-sm font-medium"
            >
              Tümünü gör →
            </Link>
          )}
        </BolumGiris>

        {sirali.length === 0 ? (
          <EmptyState
            className="mt-8"
            icon={FolderOpen}
            title="Vitrin hazırlanıyor"
            description="İlk projeler çok yakında burada olacak. Bu arada nasıl çalıştığımı konuşalım."
            action={
              <Link href="/iletisim" className={buttonClasses({ size: 'sm' })}>
                Bana yaz
              </Link>
            }
          />
        ) : (
          <ul className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {sirali.map((proje, sira) => (
              <li key={proje.id}>
                <BolumGiris gecikme={sira * 0.06}>
                  <article className="flex h-full flex-col gap-4">
                    {/*
                      Tembel yuvaya AÇIK yer ayrılıyor (T-021/K3 kalıbı):
                      `lazy.tsx`'in TiltedCard iskeleti 16/10 oranlı, gerçek kart
                      ise sabit 260px. Ölçümde kayma çıkmadı ama yükleme sırası
                      değişirse çıkabilirdi — kutu burada sabitleniyor.
                    */}
                    <div style={{ minHeight: KART_YUKSEKLIGI }}>
                      <TiltedCard
                        containerHeight={KART_YUKSEKLIGI}
                        imageHeight={KART_YUKSEKLIGI}
                        imageWidth="100%"
                        showMobileWarning={false}
                        showTooltip={false}
                        scaleOnHover={1.04}
                        rotateAmplitude={8}
                        gorsel={
                          <KapakGorsel
                            kapak={proje.cover}
                            baslik={proje.title}
                            className="!aspect-auto h-full"
                          />
                        }
                      />
                    </div>

                    <div className="flex flex-1 flex-col gap-2">
                      <h3 className="text-lg">
                        {/*
                          Bağlantı BAŞLIĞIN üstünde: kartın tamamını tıklanabilir
                          bir div yapmak klavye ve ekran okuyucu için bozuk olurdu.
                          Detay sayfası T-024'te yazılacak, adres şimdiden doğru.
                        */}
                        <Link
                          href={`/projeler/${proje.slug}`}

                          className="focus-ring hover:text-accent-soft ease-brand duration-micro rounded-btn transition-colors"
                        >
                          {proje.title}
                        </Link>
                      </h3>

                      <p className="text-muted text-sm">{proje.summary}</p>

                      {proje.stack.length > 0 && (
                        <ul className="mt-auto flex flex-wrap gap-1.5 pt-2">
                          {proje.stack.slice(0, 4).map((teknoloji) => (
                            <li key={teknoloji}>
                              <Badge variant="outline">{teknoloji}</Badge>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </article>
                </BolumGiris>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
