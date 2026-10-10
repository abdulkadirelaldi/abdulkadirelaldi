'use client';

import { Eye, PenLine } from 'lucide-react';
import dynamic from 'next/dynamic';
import { useState, type ComponentProps } from 'react';

import { Alan } from '@/components/panel/alan';
import { OnizlemeSinir } from '@/components/panel/onizleme-sinir';
import { Textarea } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils/cn';

/**
 * MDX EDİTÖRÜ — §4.2, T-035.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ÖNİZLEME TEMBEL YÜKLENİYOR — §5.2, ÖLÇÜLMÜŞ SAYIYLA
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * `Mdx` istemci tarafında çalışıyor (ölçüldü, bkz. `mdx-onizleme.tsx`) ama MDX
 * derleyicisini istemci paketine sokuyor. Deneme sayfasında ölçülen:
 *
 *   | Sayfa                      | Sayfa yükü | İlk yüklenen JS |
 *   | -------------------------- | ---------- | --------------- |
 *   | /panel/icerik/projeler     |    2.68 kB |          126 kB |
 *   | deneme (Mdx doğrudan içeri)|     183 kB |          295 kB |
 *
 *   MDX yığınının kendisi: 357 kB ham / **109.4 kB gzip**.
 *
 * §5.2'nin 40 kB (gzip) eşiğinin iki buçuk katı. Bu yüzden `next/dynamic` +
 * `ssr: false`: yığın YALNIZCA kullanıcı "Önizle"ye bastığında iniyor. Yazma
 * ekranı açılırken inmiyor — yazarın ilk yaptığı şey yazmak, önizlemek değil.
 *
 * `ssr: false` ayrıca doğru olan: önizleme tamamen istemci durumundaki
 * tamponu gösteriyor, sunucunun bildiği bir şeyi değil.
 *
 * İSKELET, YERİNE GEÇTİĞİ ŞEYLE AYNI YÜKSEKLİKTE (`min-h-*` her iki dalda da
 * aynı): yığın inerken kutu büyüyüp altındaki her şeyi kaydırmasın. T-032'de
 * veri tablosu iskeleti için ölçülen CLS dersinin aynısı.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * FORM SÖZLEŞMESİ DEĞİŞMEDİ (T-043f devir notu)
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Editör `register('content')`i OLDUĞU GİBİ alıyor ve `<textarea>`ya geçiriyor;
 * `Controller`a geçmek gerekmedi çünkü bileşen kontrollü değil — önizleme
 * `watch('content')` ile OKUYOR, değeri kendisi tutmuyor. Yani `usePanelForm`
 * tarafında hiçbir şey değişmiyor ve alan hatası yine `errors.content`.
 */

/*
  `ssr: false` + iskelet: §5.2.3. Modülün KENDİSİ dinamik — `Mdx`i buradan
  statik olarak içeri almak, tembelliği hükümsüz kılardı.
*/
const MdxOnizlemeDinamik = dynamic(() => import('./mdx-onizleme'), {
  ssr: false,
  loading: () => (
    <div className="flex flex-col gap-3 py-2">
      <Skeleton className="h-7 w-2/5" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-11/12" />
      <Skeleton className="h-4 w-4/5" />
    </div>
  ),
});

type Sekme = 'yaz' | 'onizle';

export function MdxEditor({
  id = 'content',
  etiket = 'İçerik (MDX)',
  hata,
  yardim,
  deger,
  alanProps,
}: {
  id?: string;
  etiket?: string;
  hata?: string;
  yardim?: string;
  /** `watch('content')` — önizleme bunu okur. */
  deger: string;
  /** `register('content')` çıktısı, olduğu gibi. */
  alanProps: ComponentProps<'textarea'>;
}) {
  const [sekme, setSekme] = useState<Sekme>('yaz');

  return (
    <Alan id={id} etiket={etiket} hata={hata} yardim={yardim}>
      {(baglantilar) => (
        <div className="flex flex-col gap-2">
          {/*
            SEKMELER GERÇEKTEN SEKME: aynı sayfada aynı içeriğin iki görünümü
            arasında geçiş yapılıyor, bir yere GİDİLMİYOR. T-041f'teki mesaj
            görünümlerinde `nav`+`Link` kullanmıştım çünkü oradaki her sekme
            ayrı bir adresti; burada öyle değil, o yüzden `role="tablist"`.
          */}
          <div role="tablist" aria-label="İçerik görünümü" className="flex gap-1.5">
            {(
              [
                ['yaz', 'Yaz', PenLine],
                ['onizle', 'Önizle', Eye],
              ] as const
            ).map(([anahtar, etiketMetni, Ikon]) => {
              const secili = sekme === anahtar;
              return (
                <button
                  key={anahtar}
                  type="button"
                  role="tab"
                  id={`${id}-sekme-${anahtar}`}
                  aria-selected={secili}
                  aria-controls={`${id}-panel-${anahtar}`}
                  onClick={() => setSekme(anahtar)}
                  className={cn(
                    'focus-ring ease-brand duration-micro rounded-btn inline-flex items-center gap-1.5 border px-3 py-1.5 text-sm transition-colors',
                    secili
                      ? 'border-accent/40 bg-accent/12 text-accent-soft'
                      : 'border-line bg-surface text-body hover:border-line-hover hover:text-primary',
                  )}
                >
                  <Ikon className="size-3.5" aria-hidden="true" />
                  {etiketMetni}
                </button>
              );
            })}
          </div>

          {/*
            YAZMA PANELİ GİZLENİYOR, SÖKÜLMÜYOR (`hidden`, koşullu render değil).
            Sökülseydi `register`ın bağlı olduğu `<textarea>` DOM'dan çıkardı ve
            react-hook-form alanı kayıtsız sayıp değeri düşürebilirdi — önizlemeye
            geçip geri dönen kullanıcı yazdığını kaybederdi. Ayrıca imleç konumu
            ve geri alma geçmişi de korunuyor.
          */}
          <div
            role="tabpanel"
            id={`${id}-panel-yaz`}
            aria-labelledby={`${id}-sekme-yaz`}
            hidden={sekme !== 'yaz'}
          >
            <Textarea
              id={id}
              rows={18}
              spellCheck={false}
              className="tabular min-h-[26rem] resize-y"
              {...baglantilar}
              {...alanProps}
            />
          </div>

          <div
            role="tabpanel"
            id={`${id}-panel-onizle`}
            aria-labelledby={`${id}-sekme-onizle`}
            hidden={sekme !== 'onizle'}
            className="border-line rounded-card bg-elevated/30 min-h-[26rem] border px-4 py-3"
          >
            {/*
              YALNIZCA SEKME AÇIKKEN RENDER: `hidden` ile gizlemek yeterli
              olmazdı — bileşen yine de monte olur ve yığın inerdi. Tembelliğin
              anlamı, kullanıcı istemedikçe hiç inmemesi.
            */}
            {/*
              HATA SINIRI ŞART — ölçüldü: geçersiz MDX (kapatılmamış etiket)
              derleme hatası fırlatıyor ve sınır olmadan `(panel)/error.tsx`
              devreye girip SAYFAYI yazılanlarla birlikte düşürüyordu.
              Yazarken geçersiz ara durum normaldir; sınır olmazsa editör
              kullanılamaz.
            */}
            {sekme === 'onizle' && (
              <OnizlemeSinir anahtar={deger}>
                <MdxOnizlemeDinamik kaynak={deger} />
              </OnizlemeSinir>
            )}
          </div>

          <p className="text-muted text-xs">
            Önizleme, sitede görünecek hâlin <span className="text-body">aynı bileşeniyle</span>{' '}
            çiziliyor — sanitize ve tipografi dahil. Kaydedilmemiş metni gösterir.
          </p>
        </div>
      )}
    </Alan>
  );
}
