'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import type * as z from 'zod';

import {
  ANI_ISOYA,
  Alan,
  BOS_ISE_YOK,
  bosaltilanlariNullYap,
  isodanYerelAna,
} from '@/components/panel/alan';
import { CEVIRI_ANAHTARI_YARDIM, DilRozeti } from '@/components/panel/dil-sekmeleri';
import { DURUM_ETIKET, icerikYolu, panelDili } from '@/components/panel/icerik-gorunumleri';
import { MdxEditor } from '@/components/panel/mdx-editor';
import { KapakSecici } from '@/components/panel/kapak-secici';
import { FormKabugu, usePanelForm } from '@/components/panel/panel-form';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardTitle } from '@/components/ui/card';
import { Input, Textarea } from '@/components/ui/input';
import { VARSAYILAN_DIL, type Dil } from '@/i18n/diller';
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
 * KAPAK `KapakSecici` ile (T-037f, ADR-044). `coverAttachmentId` gizli alanda
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

function baslangicDegerleri(
  yazi: PostPanelDto | undefined,
  dil: Dil = VARSAYILAN_DIL,
): YaziFormGirdi {
  /* Yeni kayıt listenin SEÇİLİ dilinde açılır (`?dil=`, ADR-046); düzenlemede kaydın kendi dili. */
  if (!yazi) return { ...BOS_FORM, locale: dil };

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
    translationKey: yazi.translationKey ?? undefined,
  };
}

export function YaziFormu({
  yazi,
  dil = VARSAYILAN_DIL,
}: {
  yazi?: PostPanelDto;
  /** Yeni kayıtta dil — sayfa `?dil=`den okuyor. Düzenlemede yok sayılır. */
  dil?: Dil;
}) {
  const router = useRouter();
  const duzenleme = yazi !== undefined;
  /* Liste aynı dilde açılsın — İngilizce kaydı kaydedip Türkçe listeye düşmek kaybolmuş hissi verir. */
  const listeYolu = icerikYolu('/panel/icerik/blog', { dil: yazi ? panelDili(yazi.locale) : dil });

  const [etiketMetni, setEtiketMetni] = useState(yazi?.tags.join(', ') ?? '');

  const kaydet = async (degerler: CreatePostInput) => {
    const govde = { ...degerler, tags: listeyeCevir(etiketMetni) };

    const sonuc = yazi
      ? await updatePostAction({
          /* Boşaltılan çeviri anahtarı `null` — `undefined` "dokunma" demek (T-031). */
          ...bosaltilanlariNullYap(govde, yazi, ['translationKey']),
          id: yazi.id,
        })
      : await createPostAction(govde);

    if (sonuc.ok) {
      router.refresh();
      if (!yazi) router.push(listeYolu);
    }

    return sonuc;
  };

  const { form, durum, formHatasi, gonder } = usePanelForm<YaziFormGirdi, CreatePostInput>({
    sema: createPostSchema,
    varsayilanDegerler: baslangicDegerleri(yazi, dil),
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
          <div className="flex flex-wrap items-center gap-2">
            <CardTitle seviye="h2">{duzenleme ? 'Yazıyı düzenle' : 'Yeni yazı'}</CardTitle>
            {/* Dil SALT OKUNUR: var olan satırın dilini değiştirmek desteklenen bir işlem değil. */}
            <DilRozeti dil={yazi?.locale ?? dil} />
          </div>

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

          {/*
            ÇEVİRİ ANAHTARI (ADR-046) — aynı içeriğin üç dildeki satırlarını bağlayan
            TEK şey. Slug dile göre değişebiliyor ("hakkinda" / "about"), bu yüzden
            bağ slug'dan kurulamıyor. Boşaltmak bağı KOPARIR (`bosaltilanlariNullYap`).
          */}
          <Alan
            id="translationKey"
            etiket="Çeviri anahtarı"
            hata={errors.translationKey?.message}
            yardim={CEVIRI_ANAHTARI_YARDIM}
          >
            {(b) => (
              <Input
                id="translationKey"
                className="tabular"
                {...b}
                {...register('translationKey', BOS_ISE_YOK)}
              />
            )}
          </Alan>

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

          <KapakSecici
            entity="POST"
            entityId={yazi?.id}
            mevcut={yazi?.cover ?? null}
            baslik={yazi?.title ?? 'Yeni kayıt'}
            onSec={(dosya) => form.setValue('coverAttachmentId', dosya.id, { shouldDirty: true })}
          />
        </FormKabugu>

        <Button
          variant="ghost"
          size="sm"
          className="self-start"
          onClick={() => router.push(listeYolu)}
        >
          Listeye dön
        </Button>
      </CardContent>
    </Card>
  );
}
