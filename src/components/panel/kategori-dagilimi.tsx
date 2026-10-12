'use client';

import { AlertTriangle } from 'lucide-react';

import { ISLEM_TURU_ETIKET } from '@/components/panel/muhasebe-gorunumleri';
import type { KategoriCubugu } from '@/components/panel/rapor-veri';
import { Badge } from '@/components/ui/badge';
import { TransactionType } from '@/types';

/**
 * KATEGORİ DAĞILIMI — yatay çubuk listesi. PASTA DEĞİL, ve Recharts'sız.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * NEDEN PASTA DEĞİL
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Dağılımın sorusu "en çok nerede" — yani BÜYÜKLÜK SIRASI. Pasta yakın
 * değerleri karşılaştırmayı imkânsız kılıyor ve altı dilimden sonra okunmuyor;
 * kategori sayısı burada baştan belirsiz. Sıralı yatay çubuk hem sırayı hem
 * oranı aynı anda veriyor.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * NEDEN RECHARTS DEĞİL — ÖLÇÜLEBİLİR GEREKÇE
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Bu grafik eksen, ızgara, tooltip ya da ölçek istemiyor: her satır bir ad,
 * bir oran çubuğu ve bir tutar. İhtiyaç duyulan tek geometri "yüzde genişlik"
 * ve onu CSS veriyor. Recharts'ı buraya sokmak, 40 kB eşiğinin üstünde bir
 * yığını ikinci bir yerde daha zorunlu kılardı — oysa yıllık grafik onu
 * TEMBEL yüklüyor ve bu liste sayfa açılır açılmaz görünmeli.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ RENK: ÇUBUKLARDA TEK HUE — KATEGORİ BAŞINA RENK YOK
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Çubuklar işlem türüne göre TEK renk (gelir/gider); kategori başına farklı
 * renk VERİLMİYOR ve verilemez:
 *
 *   1. Nominal kategorilere büyüklük rampası vurmak çubuk uzunluğunu İKİ KEZ
 *      kodlamak olurdu — uzunluk zaten orada ve tek serbest kanalı yakardı.
 *   2. Kategorinin kendi rengi (`TransactionCategory.color`) kullanıcı verisi;
 *      keyfî sayıda keyfî hex'i kodlama kanalı yapmak renk körlüğü ayrımını
 *      DOĞRULANAMAZ hâle getirir — hiçbir doğrulayıcı koşturulamaz.
 *
 * Kimliği KONUM, AD ve TÜR ROZETİ taşıyor; renk hiç taşımıyor.
 *
 * ⚠️ KATEGORİ RENGİNİ PUL OLARAK DA GÖSTERMİYORUM: `CategoryBreakdownRowDto`
 * o alanı TAŞIMIYOR (`categoryId`, `categoryName`, `type`, `categoryType`,
 * `typeMismatch`, tutarlar, sayı). Süs bir pul için ikinci bir kategori
 * sorgusu açmak, DTO'nun bilerek dar tuttuğu yükü arayüz tarafından
 * genişletmek olurdu. Gerekirse Backend alanı ekler; uydurmadım.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ ADR-039 — UYUŞMAZLIK GÖRÜNÜR, SAKLANMIYOR
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Bir gider kategorisinde gelir hareketi olabilir ve bu MEŞRU: kategori türü
 * sonradan değişebiliyor, işlemler kendi türünü koruyor. Defterin gerçeği
 * işlemin türü; kategori bir etiket.
 *
 * Satır anahtarı (kategori, İŞLEM TÜRÜ) ÇİFTİ olduğu için aynı kategori İKİ
 * satır üretebilir. Uyuşmazlık rozetle işaretleniyor ve ne demek olduğu
 * yazılıyor — kullanıcı "neden gider kategorisinde gelir var" diye
 * sorabilmeli, ve cevabı ekranda bulmalı.
 */
export function KategoriDagilimi({ cubuklar }: { cubuklar: KategoriCubugu[] }) {
  if (cubuklar.length === 0) {
    return (
      <p className="text-muted py-8 text-center text-sm">
        Bu aralıkta işlem yok — dağılım hesaplanacak bir şey bulunmuyor.
      </p>
    );
  }

  /*
    ORAN için en büyük çubuk referans alınıyor (toplam DEĞİL): liste hem gelir
    hem gider satırı taşıyor ve ikisini tek bir "toplam"a bölmek, birbirine
    eklenmeyen iki kümeyi tek pasta gibi göstermek olurdu.

    `Number()` burada DEĞİL: `tutar.deger` zaten `rapor-veri.ts`te üretildi ve
    dönüşümün tek yeri orası.
  */
  const enBuyuk = Math.max(...cubuklar.map((c) => c.tutar.deger), 0);
  const uyusmazlikVar = cubuklar.some((c) => c.uyusmazlik);

  return (
    <div className="flex flex-col gap-4">
      <ul className="flex flex-col gap-3">
        {cubuklar.map((c) => {
          const oran = enBuyuk > 0 ? (c.tutar.deger / enBuyuk) * 100 : 0;
          const gelir = c.tur === TransactionType.INCOME;

          return (
            <li key={c.anahtar} className="flex flex-col gap-1.5">
              <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                <span className="flex items-center gap-2">
                  <span className="text-primary text-sm font-medium">{c.ad}</span>
                  <Badge variant={gelir ? 'success' : 'danger'}>{ISLEM_TURU_ETIKET[c.tur]}</Badge>
                  {c.uyusmazlik && (
                    <Badge variant="warning">
                      <AlertTriangle className="size-3" aria-hidden="true" />
                      Kategori türü: {ISLEM_TURU_ETIKET[c.kategoriTuru]}
                    </Badge>
                  )}
                </span>

                {/* TUTAR DİZEDEN — `tutar.deger` ekranda hiç yazılmıyor. */}
                <span className="tabular text-body text-sm">{c.tutar.etiket}</span>
              </div>

              {/*
                ÇUBUK — `role="img"` + `aria-label`: ekran okuyucu oranı
                görmüyor, ama tutar yukarıda METİN olarak zaten var. Çubuğa
                ayrıca sayı duyurmak aynı bilgiyi iki kez okutmak olurdu;
                etiket yalnızca "bu bir oran çubuğu" diyor.
              */}
              <div
                role="img"
                aria-label={`${c.ad}: en büyük kalemin %${Math.round(oran)} kadarı`}
                className="bg-elevated h-2 w-full overflow-hidden rounded-full"
              >
                <div
                  className={
                    gelir ? 'bg-success h-full rounded-full' : 'bg-danger h-full rounded-full'
                  }
                  style={{ width: `${oran}%` }}
                />
              </div>

              <p className="text-muted text-xs">
                <span className="tabular">{c.islemSayisi}</span> işlem
              </p>
            </li>
          );
        })}
      </ul>

      {uyusmazlikVar && (
        <p className="border-warning/40 bg-warning/8 text-warning rounded-card border px-3 py-2.5 text-xs">
          Bazı satırlarda işlemin türü kategorinin türünden farklı. Bu bir hata değil: kategori türü
          sonradan değiştirilebiliyor ve işlemler kendi türünü koruyor (ADR-039). Defterin gerçeği
          işlemin türü — kategori bir etiket, ve bir gelir hareketi etiketi değiştiği için gider
          olmaz.
        </p>
      )}
    </div>
  );
}
