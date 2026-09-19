'use client';

import { ImageOff } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import type * as z from 'zod';

import {
  ANI_ISOYA,
  Alan,
  BOS_ISE_YOK,
  SAYI_YA_DA_YOK,
  isodanYerelAna,
} from '@/components/panel/alan';
import { DURUM_ETIKET } from '@/components/panel/icerik-gorunumleri';
import { FormKabugu, usePanelForm } from '@/components/panel/panel-form';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardTitle } from '@/components/ui/card';
import { Input, Textarea } from '@/components/ui/input';
import { createProjectSchema, type CreateProjectInput } from '@/lib/schemas/project';
import { createProjectAction, updateProjectAction } from '@/server/actions/project';
import type { ProjectPanelDto } from '@/server/services/content-dto';
import { ContentStatus } from '@/types';

/**
 * PROJE FORMU — yeni kayıt ve düzenleme, TEK bileşen.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * SABİT `status` KALKTI — T-034/ENGEL-1'İN ASIL TEHLİKESİ BURADAYDI
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * T-034'te düzenleme formu `status: ContentStatus.PUBLISHED` SABİT yazıyordu.
 * O gün doğruydu: liste yalnızca yayındaki projeleri gösterdiği için düzenlenen
 * her kayıt zaten `PUBLISHED`ti ve liste DTO'su `status` taşımıyordu.
 *
 * O satırın tehlikesi, listenin tüm durumları göstermeye başladığı AN ortaya
 * çıkardı: bir taslağı açıp kaydetmek onu SESSİZCE YAYINA ALIRDI. Hiçbir test
 * kırmızıya dönmezdi — sayfa çalışır, form kaydeder, kayıt yayınlanır.
 *
 * Bu yüzden okuma yolunu bağlamakla bu satırı kaldırmak AYNI TURDA yapıldı.
 * Artık `status` KULLANICININ SEÇTİĞİ değer: `fetchProjectForPanel` kaydın
 * gerçek durumunu getiriyor, form onu gösteriyor, kullanıcı değiştirmedikçe
 * aynı değer geri yazılıyor.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * FORM TEK KAYIT OKUMASINDAN BESLENİYOR (T-034/ENGEL-2 kapandı)
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * `ProjectPanelDto` MDX'i (`content`) taşıyor, bu yüzden düzenlemede içerik
 * alanı DOLU başlıyor. T-034'te liste DTO'su MDX taşımadığı için boş başlıyor
 * ve kullanıcıya "içeriği yeniden yazman gerekiyor" deniyordu; o uyarı kalktı.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * KAPAK — YER TUTUCU, ÖLÜ DÜĞME YOK
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Yükleme T-037'de gelecek (R2 anahtarları yok). `coverAttachmentId` GİZLİ ALAN
 * olarak taşınıyor: mevcut kapağı olan bir kaydı düzenleyip kaydetmek kapağı
 * DÜŞÜRMESİN diye. Alanı hiç göndermemek `undefined` demek olurdu ve kısmi
 * güncellemede dokunulmazdı — ama form `createProjectSchema` ile tam gövde
 * gönderiyor, yani taşımak zorunda.
 */

type ProjeFormGirdi = z.input<typeof createProjectSchema>;

const BOS_FORM: ProjeFormGirdi = {
  locale: 'tr',
  slug: '',
  title: '',
  summary: '',
  content: '',
  tags: [],
  stack: [],
  featured: false,
  order: 0,
  status: ContentStatus.DRAFT,
};

/** Virgüllü metin ↔ dizi. Etiket alanları kullanıcıya tek satır olarak görünüyor. */
const listeyeCevir = (metin: string): string[] =>
  metin
    .split(',')
    .map((p) => p.trim())
    .filter(Boolean);

function baslangicDegerleri(proje: ProjectPanelDto | undefined): ProjeFormGirdi {
  if (!proje) return BOS_FORM;

  return {
    locale: proje.locale,
    slug: proje.slug,
    title: proje.title,
    summary: proje.summary,
    content: proje.content,
    tags: proje.tags,
    stack: proje.stack,
    featured: proje.featured,
    order: proje.order,
    /* KAYDIN GERÇEK DURUMU — sabit değer değil (yukarıdaki nota bakınız). */
    status: proje.status,
    publishedAt: isodanYerelAna(proje.publishedAt),
    liveUrl: proje.liveUrl ?? undefined,
    repoUrl: proje.repoUrl ?? undefined,
    clientName: proje.clientName ?? undefined,
    coverAttachmentId: proje.coverAttachmentId ?? undefined,
  };
}

export function ProjeFormu({ proje }: { proje?: ProjectPanelDto }) {
  const router = useRouter();
  const duzenleme = proje !== undefined;

  const [etiketMetni, setEtiketMetni] = useState(proje?.tags.join(', ') ?? '');
  const [stackMetni, setStackMetni] = useState(proje?.stack.join(', ') ?? '');

  const kaydet = async (degerler: CreateProjectInput) => {
    const govde = {
      ...degerler,
      tags: listeyeCevir(etiketMetni),
      stack: listeyeCevir(stackMetni),
    };

    const sonuc = proje
      ? await updateProjectAction({ ...govde, id: proje.id })
      : await createProjectAction(govde);

    if (sonuc.ok) {
      /* Sunucu bileşenini yeniden çalıştır — kaydedilen durum formda görünsün. */
      router.refresh();
      if (!proje) router.push('/panel/icerik/projeler');
    }

    return sonuc;
  };

  const { form, durum, formHatasi, gonder } = usePanelForm<ProjeFormGirdi, CreateProjectInput>({
    sema: createProjectSchema,
    varsayilanDegerler: baslangicDegerleri(proje),
    kaydet,
    /* Düzenlemede form boşaltılmaz; yeni kayıtta zaten listeye dönülüyor. */
    temizle: false,
    /* Gizli inputlar — bunlara düşen sunucu mesajı form düzeyine yükseltilir. */
    gorunmezAlanlar: ['locale', 'coverAttachmentId'],
  });

  const {
    register,
    formState: { errors },
  } = form;

  return (
    <Card>
      <CardContent className="flex flex-col gap-4">
        <CardTitle seviye="h2">{duzenleme ? 'Projeyi düzenle' : 'Yeni proje'}</CardTitle>

        <FormKabugu
          gonder={gonder}
          durum={durum}
          formHatasi={formHatasi}
          basariMetni={
            duzenleme
              ? 'Kaydedildi. Durum, aşağıdaki seçtiğin değerle güncellendi.'
              : 'Proje eklendi.'
          }
          gonderEtiketi={duzenleme ? 'Kaydet' : 'Ekle'}
        >
          <input type="hidden" {...register('locale')} />
          {/*
            `BOS_ISE_YOK` ŞART: kapağı olmayan kayıtta bu gizli input boş dize
            gönderiyor, `cuidSchema` onu reddediyor ve hata GÖRÜNMEZ bir alana
            düşüyordu — form sessizce hiç gönderilmiyordu. T-043f'te ölçüldü.
          */}
          <input type="hidden" {...register('coverAttachmentId', BOS_ISE_YOK)} />

          <div className="grid gap-4 sm:grid-cols-2">
            <Alan id="title" etiket="Başlık" hata={errors.title?.message}>
              {(b) => <Input id="title" {...b} {...register('title')} />}
            </Alan>

            <Alan
              id="slug"
              etiket="Slug"
              hata={errors.slug?.message}
              yardim="Adreste görünür: /projeler/<slug>. Aynı slug ikinci kez kullanılamaz."
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
                  : 'Taslak olarak kaydedersen public listede görünmez.'
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

            <Alan id="order" etiket="Sıra" hata={errors.order?.message}>
              {(b) => (
                <Input
                  id="order"
                  type="number"
                  inputMode="numeric"
                  className="tabular"
                  {...b}
                  {...register('order', SAYI_YA_DA_YOK)}
                />
              )}
            </Alan>

            <Alan id="clientName" etiket="Müşteri" hata={errors.clientName?.message}>
              {(b) => <Input id="clientName" {...b} {...register('clientName', BOS_ISE_YOK)} />}
            </Alan>

            <Alan id="liveUrl" etiket="Canlı adres" hata={errors.liveUrl?.message}>
              {(b) => (
                <Input id="liveUrl" type="url" {...b} {...register('liveUrl', BOS_ISE_YOK)} />
              )}
            </Alan>

            <Alan id="repoUrl" etiket="Kaynak kod" hata={errors.repoUrl?.message}>
              {(b) => (
                <Input id="repoUrl" type="url" {...b} {...register('repoUrl', BOS_ISE_YOK)} />
              )}
            </Alan>
          </div>

          <Alan id="summary" etiket="Özet" hata={errors.summary?.message}>
            {(b) => <Textarea id="summary" rows={2} {...b} {...register('summary')} />}
          </Alan>

          {/*
            İÇERİK — SADE TEXTAREA, BİLEREK (T-035'in kapsamı).
            Önizleme, araç çubuğu, sözdizimi vurgusu YOK. Yarım bir editör
            koymak, olmayan bir yeteneği varmış gibi göstermek olurdu.
          */}
          <Alan
            id="content"
            etiket="İçerik (MDX)"
            hata={errors.content?.message}
            yardim="Markdown/MDX. Render sırasında rehype-sanitize’dan geçer. Zengin editör T-035’te gelecek."
          >
            {(b) => (
              <Textarea
                id="content"
                rows={14}
                className="tabular"
                {...b}
                {...register('content')}
              />
            )}
          </Alan>

          <div className="grid gap-4 sm:grid-cols-2">
            {/*
              ETİKET VE TEKNOLOJİ: form durumu DIŞINDA (virgüllü metin ↔ dizi).
              Şema dizi bekliyor, kullanıcı tek satır yazıyor; dönüşüm `kaydet`
              içinde — şemaya dokunmadan.
            */}
            <Alan id="tags" etiket="Etiketler" yardim="Virgülle ayır: kurumsal, cms">
              {(b) => (
                <Input
                  id="tags"
                  value={etiketMetni}
                  onChange={(olay) => setEtiketMetni(olay.target.value)}
                  {...b}
                />
              )}
            </Alan>

            <Alan id="stack" etiket="Teknolojiler" yardim="Virgülle ayır: Next.js, Prisma">
              {(b) => (
                <Input
                  id="stack"
                  value={stackMetni}
                  onChange={(olay) => setStackMetni(olay.target.value)}
                  {...b}
                />
              )}
            </Alan>
          </div>

          <label className="flex w-fit items-center gap-2 text-sm">
            <input
              type="checkbox"
              className="focus-ring accent-accent size-4"
              {...register('featured')}
            />
            Ana sayfada öne çıkar
          </label>

          {/* KAPAK — yer tutucu, ölü düğme yok. */}
          <div className="border-line bg-elevated/40 rounded-card flex items-start gap-3 border border-dashed p-4">
            <ImageOff className="text-muted mt-0.5 size-5 shrink-0" aria-hidden="true" />
            <div className="flex flex-col gap-1">
              <p className="text-primary text-sm font-medium">Kapak görseli</p>
              <p className="text-muted text-sm">
                {proje?.cover
                  ? `Mevcut kapak korunuyor (${proje.cover.mime}). Kaydetmek onu düşürmez — kimlik gizli alanda taşınıyor. Değiştirme T-037’de açılacak.`
                  : 'Görsel yükleme henüz açık değil (T-037). Kapak bağlanana kadar public tarafta token’lı yer tutucu çiziliyor; düzen değişmeyecek.'}
              </p>
            </div>
          </div>
        </FormKabugu>

        <Button
          variant="ghost"
          size="sm"
          className="self-start"
          onClick={() => router.push('/panel/icerik/projeler')}
        >
          Listeye dön
        </Button>
      </CardContent>
    </Card>
  );
}
