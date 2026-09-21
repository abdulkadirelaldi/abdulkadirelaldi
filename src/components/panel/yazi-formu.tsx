'use client';

import { ImageOff } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import type * as z from 'zod';

import { ANI_ISOYA, Alan, BOS_ISE_YOK, isodanYerelAna } from '@/components/panel/alan';
import { DURUM_ETIKET } from '@/components/panel/icerik-gorunumleri';
import { MdxEditor } from '@/components/panel/mdx-editor';
import { FormKabugu, usePanelForm } from '@/components/panel/panel-form';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardTitle } from '@/components/ui/card';
import { Input, Textarea } from '@/components/ui/input';
import { createPostSchema, type CreatePostInput } from '@/lib/schemas/post';
import { createPostAction, updatePostAction } from '@/server/actions/post';
import type { PostPanelDto } from '@/server/services/content-dto';
import { ContentStatus } from '@/types';

/**
 * YAZI FORMU — yeni kayıt ve düzenleme, TEK bileşen.
 *
 * T-043f'in `proje-formu.tsx` kalıbının DÖRDÜNCÜ kopyası. Farklar yalnızca
 * alan kümesinde:
 *   - `excerpt` (projede `summary`), `stack`/`featured`/`order`/`liveUrl`/
 *     `repoUrl`/`clientName` YOK,
 *   - `readingMinutes` SALT OKUNUR — sunucuda içerikten türetiliyor (T-031),
 *     istemciden alınmıyor; formda alan olarak bile yok.
 *
 * `status` SABİT DEĞİL: kaydın gerçek durumu `fetchPostForPanel`den geliyor ve
 * kullanıcı değiştirmedikçe aynı değer geri yazılıyor. T-043f'te projelerde
 * kapatılan sessiz yayına alma kusurunun burada hiç doğmaması için.
 *
 * KAPAK yer tutucu, ölü düğme yok (T-037). `coverAttachmentId` gizli alanda
 * taşınıyor ki kapağı olan bir kaydı kaydetmek kapağı düşürmesin — ve
 * `BOS_ISE_YOK` ile: boş dize `cuidSchema`ya takılıp gönderimi SESSİZCE
 * engelliyordu (T-043f'te ölçülen kusur, aynısı burada tekrarlanmasın).
 */

type YaziFormGirdi = z.input<typeof createPostSchema>;

const BOS_FORM: YaziFormGirdi = {
  locale: 'tr',
  slug: '',
  title: '',
  excerpt: '',
  content: '',
  tags: [],
  status: ContentStatus.DRAFT,
};

const listeyeCevir = (metin: string): string[] =>
  metin
    .split(',')
    .map((p) => p.trim())
    .filter(Boolean);

function baslangicDegerleri(yazi: PostPanelDto | undefined): YaziFormGirdi {
  if (!yazi) return BOS_FORM;

  return {
    locale: yazi.locale,
    slug: yazi.slug,
    title: yazi.title,
    excerpt: yazi.excerpt,
    content: yazi.content,
    tags: yazi.tags,
    status: yazi.status,
    publishedAt: isodanYerelAna(yazi.publishedAt),
    coverAttachmentId: yazi.coverAttachmentId ?? undefined,
  };
}

export function YaziFormu({ yazi }: { yazi?: PostPanelDto }) {
  const router = useRouter();
  const duzenleme = yazi !== undefined;

  const [etiketMetni, setEtiketMetni] = useState(yazi?.tags.join(', ') ?? '');

  const kaydet = async (degerler: CreatePostInput) => {
    const govde = { ...degerler, tags: listeyeCevir(etiketMetni) };

    const sonuc = yazi
      ? await updatePostAction({ ...govde, id: yazi.id })
      : await createPostAction(govde);

    if (sonuc.ok) {
      router.refresh();
      if (!yazi) router.push('/panel/icerik/blog');
    }

    return sonuc;
  };

  const { form, durum, formHatasi, gonder } = usePanelForm<YaziFormGirdi, CreatePostInput>({
    sema: createPostSchema,
    varsayilanDegerler: baslangicDegerleri(yazi),
    kaydet,
    temizle: false,
    /* Gizli inputlar — mesajları form düzeyine yükseltilsin (T-041f/T-043f). */
    gorunmezAlanlar: ['locale', 'coverAttachmentId'],
  });

  const {
    register,
    watch,
    formState: { errors },
  } = form;

  /* Önizlemenin okuduğu tampon. Editör değeri TUTMUYOR, yalnızca okuyor. */
  const icerik = watch('content') ?? '';

  return (
    <Card>
      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <CardTitle seviye="h2">{duzenleme ? 'Yazıyı düzenle' : 'Yeni yazı'}</CardTitle>

          {duzenleme && (
            /*
              OKUMA SÜRESİ SALT OKUNUR ve KAYDEDİLDİĞİ HÂLİYLE gösteriliyor:
              sunucu onu içerikten türetiyor, form göndermiyor. Burada canlı
              bir tahmin göstermek, kaydedilecek değerden farklı bir sayı
              vaat etmek olurdu.
            */
            <p className="text-muted text-sm">
              Okuma süresi: <span className="tabular text-body">{yazi.readingMinutes}</span> dk
              <span className="text-muted"> · kaydedilince içerikten yeniden hesaplanır</span>
            </p>
          )}
        </div>

        <FormKabugu
          gonder={gonder}
          durum={durum}
          formHatasi={formHatasi}
          basariMetni={
            duzenleme ? 'Kaydedildi. Durum, seçtiğin değerle güncellendi.' : 'Yazı eklendi.'
          }
          gonderEtiketi={duzenleme ? 'Kaydet' : 'Ekle'}
        >
          <input type="hidden" {...register('locale')} />
          <input type="hidden" {...register('coverAttachmentId', BOS_ISE_YOK)} />

          <div className="grid gap-4 sm:grid-cols-2">
            <Alan id="title" etiket="Başlık" hata={errors.title?.message}>
              {(b) => <Input id="title" {...b} {...register('title')} />}
            </Alan>

            <Alan
              id="slug"
              etiket="Slug"
              hata={errors.slug?.message}
              yardim="Adreste görünür: /blog/<slug>. Aynı slug ikinci kez kullanılamaz."
            >
              {(b) => <Input id="slug" className="tabular" {...b} {...register('slug')} />}
            </Alan>

            <Alan
              id="status"
              etiket="Durum"
              hata={errors.status?.message}
              yardim={
                duzenleme
                  ? 'Kaydın şu anki durumu seçili. Değiştirmezsen kaydetmek durumu değiştirmez.'
                  : 'Taslak olarak kaydedersen /blog listesinde görünmez.'
              }
            >
              {(b) => (
                <select
                  id="status"
                  className="focus-ring rounded-input border-line-strong bg-elevated text-primary h-11 w-full border px-3 text-sm"
                  {...b}
                  {...register('status')}
                >
                  {Object.values(ContentStatus).map((deger) => (
                    <option key={deger} value={deger}>
                      {DURUM_ETIKET[deger]}
                    </option>
                  ))}
                </select>
              )}
            </Alan>

            <Alan
              id="publishedAt"
              etiket="Yayın tarihi"
              hata={errors.publishedAt?.message}
              yardim="Zamanlanmış durumda zorunlu."
            >
              {(b) => (
                <Input
                  id="publishedAt"
                  type="datetime-local"
                  className="tabular"
                  {...b}
                  {...register('publishedAt', ANI_ISOYA)}
                />
              )}
            </Alan>
          </div>

          <Alan id="excerpt" etiket="Özet" hata={errors.excerpt?.message}>
            {(b) => <Textarea id="excerpt" rows={2} {...b} {...register('excerpt')} />}
          </Alan>

          <MdxEditor
            hata={errors.content?.message}
            yardim="Markdown/MDX. Render sırasında rehype-sanitize’dan geçer."
            deger={icerik}
            alanProps={register('content')}
          />

          <Alan id="tags" etiket="Etiketler" yardim="Virgülle ayır: next.js, performans">
            {(b) => (
              <Input
                id="tags"
                value={etiketMetni}
                onChange={(olay) => setEtiketMetni(olay.target.value)}
                {...b}
              />
            )}
          </Alan>

          {/* KAPAK — yer tutucu, ölü düğme yok. */}
          <div className="border-line bg-elevated/40 rounded-card flex items-start gap-3 border border-dashed p-4">
            <ImageOff className="text-muted mt-0.5 size-5 shrink-0" aria-hidden="true" />
            <div className="flex flex-col gap-1">
              <p className="text-primary text-sm font-medium">Kapak görseli</p>
              <p className="text-muted text-sm">
                {yazi?.cover
                  ? `Mevcut kapak korunuyor (${yazi.cover.mime}). Kaydetmek onu düşürmez — kimlik gizli alanda taşınıyor. Değiştirme T-037’de açılacak.`
                  : 'Görsel yükleme henüz açık değil (T-037). Kapak bağlanana kadar public tarafta token’lı yer tutucu çiziliyor; düzen değişmeyecek.'}
              </p>
            </div>
          </div>
        </FormKabugu>

        <Button
          variant="ghost"
          size="sm"
          className="self-start"
          onClick={() => router.push('/panel/icerik/blog')}
        >
          Listeye dön
        </Button>
      </CardContent>
    </Card>
  );
}
