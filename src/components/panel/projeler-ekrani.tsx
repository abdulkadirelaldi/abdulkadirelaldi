'use client';

import { FolderOpen, ImageOff, Pencil, Plus, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import type * as z from 'zod';

import {
  ANI_ISOYA,
  Alan,
  BOS_ISE_YOK,
  SAYI_YA_DA_YOK,
  isodanYerelAna,
} from '@/components/panel/alan';
import { ArsivleDugmesi } from '@/components/panel/arsivle-dugmesi';
import { FormKabugu, usePanelForm } from '@/components/panel/panel-form';
import { VeriTablosu, type Sutun } from '@/components/panel/veri-tablosu';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardTitle } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { FormAlert } from '@/components/ui/form-error';
import { Input, Textarea } from '@/components/ui/input';
import { createProjectSchema, type CreateProjectInput } from '@/lib/schemas/project';
import {
  archiveProjectAction,
  createProjectAction,
  updateProjectAction,
} from '@/server/actions/project';
import type { ProjectListItemDto } from '@/server/services/content-dto';
import { ContentStatus } from '@/types';

/**
 * PROJE YÖNETİMİ — §4.2 `/panel/icerik/projeler`.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ARŞİVLEME — SİLME DEĞİL (ADR-017 / ADR-019)
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * `Project` silinmiyor, ARŞİVLENİYOR: slug korunuyor ve public taraf "kaldırıldı"
 * sayfasına düşüyor. Deneyim ekranındaki "Sil" ile aynı şey DEĞİL ve kullanıcıya da
 * aynı dille anlatılmıyor — oradaki onay "kalıcı olarak silinir", buradaki
 * "listelerden çıkar ama silinmez, geri alınabilir" diyor.
 *
 * BİLDİRİMDE "410" YAZMIYOR ve bu bilerek: T-024'te ölçülen Next 15.5 sınırı
 * yüzünden arşiv adresi HTTP 410 değil 200 + `noindex` dönüyor. Panelde 410
 * yazmak, kullanıcıya doğrulanamayan bir söz vermek olurdu (T-018'in dersi).
 * Engel kalkınca bu cümle de güncellenecek.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * KAPAK — YER TUTUCU, ÖLÜ DÜĞME YOK
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Görsel yükleme T-037'de gelecek (R2 anahtarları henüz yok). "Yükle" düğmesi
 * koyup tıklayınca hiçbir şey olmamasındansa alan, ne zaman açılacağını
 * söyleyen bir durum bildirimi olarak duruyor — T-018'in dersi.
 */

type ProjeFormGirdi = z.input<typeof createProjectSchema>;

const DURUM_ETIKET: Record<ContentStatus, string> = {
  [ContentStatus.DRAFT]: 'Taslak',
  [ContentStatus.PUBLISHED]: 'Yayında',
  [ContentStatus.SCHEDULED]: 'Zamanlanmış',
  [ContentStatus.ARCHIVED]: 'Arşiv',
};

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

export function ProjelerEkrani({ projeler }: { projeler: ProjectListItemDto[] }) {
  const router = useRouter();
  const [formAcik, setFormAcik] = useState(false);
  const [duzenlenen, setDuzenlenen] = useState<ProjectListItemDto | null>(null);
  const [bildirim, setBildirim] = useState<string | null>(null);
  const [arsivHatasi, setArsivHatasi] = useState<string | null>(null);
  const [etiketMetni, setEtiketMetni] = useState('');
  const [stackMetni, setStackMetni] = useState('');
  const formBasligi = useRef<HTMLDivElement>(null);

  const kaydet = async (degerler: CreateProjectInput) => {
    /*
     * BOŞ DİZE VE TARİH DÖNÜŞÜMÜ BURADA DEĞİL, `register` seçeneklerinde
     * (`BOS_ISE_YOK`, `ANI_ISOYA`). Sebep: `zodResolver` doğrulamayı `kaydet`
     * çağrılmadan ÖNCE yapıyor — burada çevirmek geç kalıyordu. T-034'te
     * ölçüldü: `publishedAt` boşken de doluyken de gönderim sunucuya hiç
     * ulaşmıyordu.
     */
    const govde = {
      ...degerler,
      tags: listeyeCevir(etiketMetni),
      stack: listeyeCevir(stackMetni),
    };

    const sonuc = duzenlenen
      ? await updateProjectAction({ ...govde, id: duzenlenen.id })
      : await createProjectAction(govde);

    if (sonuc.ok) {
      setBildirim(
        duzenlenen
          ? 'Proje güncellendi.'
          : 'Proje eklendi. Taslak olarak kaydedildiyse public listede görünmez.',
      );
      /* Açık sayfayı yeniden çiz — etiket geçersizleştirmesi sunucuda zaten yapıldı. */
      router.refresh();
      if (duzenlenen) {
        setFormAcik(false);
        setDuzenlenen(null);
      }
    }
    return sonuc;
  };

  const { form, durum, formHatasi, gonder, durumuSifirla } = usePanelForm<
    ProjeFormGirdi,
    CreateProjectInput
  >({
    sema: createProjectSchema,
    varsayilanDegerler: BOS_FORM,
    kaydet,
    temizle: true,
  });

  const {
    register,
    reset,
    formState: { errors },
  } = form;

  const formuAc = (proje: ProjectListItemDto | null) => {
    setDuzenlenen(proje);
    setFormAcik(true);
    setBildirim(null);
    setArsivHatasi(null);
    durumuSifirla();
    setEtiketMetni(proje?.tags.join(', ') ?? '');
    setStackMetni(proje?.stack.join(', ') ?? '');
    reset(
      proje
        ? {
            locale: proje.locale,
            slug: proje.slug,
            title: proje.title,
            summary: proje.summary,
            /*
             * İÇERİK LİSTE DTO'SUNDA YOK (T-030/K3: liste MDX taşımıyor).
             * Bu yüzden düzenlemede içerik alanı BOŞ başlıyor ve bu davranış
             * kullanıcıya alanın altında yazıyor — sessizce boş bir MDX
             * kaydetmek, yazılmış içeriği silmek olurdu.
             */
            content: '',
            tags: proje.tags,
            stack: proje.stack,
            featured: proje.featured,
            order: proje.order,
            /*
             * ENGEL-1'İN DOĞRUDAN SONUCU: liste DTO'su `status` taşımıyor
             * (okuma DTO'ları hiç taşımıyor) ve okuma servisi yalnızca
             * YAYINDAKİ projeleri döndürüyor. Yani buradaki her satır zaten
             * `PUBLISHED`; başka bir değer varsayamayız.
             *
             * Servis tüm durumları döndürmeye başladığında bu satır KIRILIR:
             * bir taslağı düzenleyip kaydetmek onu sessizce yayına alır.
             * Bu yüzden engel raporda "sonra bakarız" değil, ENGEL olarak yazılı.
             */
            status: ContentStatus.PUBLISHED,
            publishedAt: isodanYerelAna(proje.publishedAt),
          }
        : BOS_FORM,
    );
  };

  useEffect(() => {
    if (formAcik) formBasligi.current?.focus();
  }, [formAcik, duzenlenen]);

  const sutunlar: ReadonlyArray<Sutun<ProjectListItemDto>> = [
    {
      anahtar: 'title',
      baslik: 'Proje',
      deger: (p) => (
        <div className="flex flex-col">
          <span className="text-primary font-medium">{p.title}</span>
          <span className="tabular text-muted text-xs">/{p.slug}</span>
        </div>
      ),
      siralamaDegeri: (p) => p.title,
    },
    {
      anahtar: 'featured',
      baslik: 'Öne çıkan',
      ikincil: true,
      deger: (p) => (p.featured ? <Badge variant="accent">Öne çıkan</Badge> : null),
      siralamaDegeri: (p) => (p.featured ? 1 : 0),
    },
    {
      anahtar: 'publishedAt',
      baslik: 'Yayın',
      sayisal: true,
      ikincil: true,
      deger: (p) => p.publishedAt?.slice(0, 10) ?? '—',
      siralamaDegeri: (p) => p.publishedAt ?? '',
    },
    {
      anahtar: 'order',
      baslik: 'Sıra',
      sayisal: true,
      deger: (p) => p.order,
      siralamaDegeri: (p) => p.order,
    },
    {
      anahtar: 'eylem',
      baslik: 'İşlem',
      deger: (p) => (
        <div className="flex flex-wrap items-start justify-end gap-1">
          <Button type="button" variant="ghost" size="sm" onClick={() => formuAc(p)}>
            <Pencil className="size-3.5" aria-hidden="true" />
            <span className="sr-only sm:not-sr-only">Düzenle</span>
          </Button>

          <ArsivleDugmesi
            kayitAdi={p.title}
            arsivle={async () => {
              const sonuc = await archiveProjectAction({ id: p.id });
              if (sonuc.ok) {
                setBildirim(
                  `"${p.title}" arşivlendi. Listelerden çıktı; adres açıldığında "kaldırıldı" sayfası ve noindex geliyor. Geri almak için durumunu Yayında yapman yeterli.`,
                );
                router.refresh();
              } else {
                setArsivHatasi(sonuc.error.message);
              }
              return sonuc;
            }}
          />
        </div>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      {bildirim && (
        <p
          role="status"
          className="rounded-input border-success/40 bg-success/8 text-success border px-3 py-2.5 text-sm"
        >
          {bildirim}
        </p>
      )}

      {arsivHatasi && <FormAlert>{arsivHatasi}</FormAlert>}

      {formAcik && (
        <Card>
          <CardContent className="flex flex-col gap-4">
            <div className="flex items-start justify-between gap-3">
              <div ref={formBasligi} tabIndex={-1} className="focus-ring rounded-btn outline-none">
                <CardTitle seviye="h2">{duzenlenen ? 'Projeyi düzenle' : 'Yeni proje'}</CardTitle>
              </div>

              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  setFormAcik(false);
                  setDuzenlenen(null);
                }}
              >
                <X className="size-4" aria-hidden="true" />
                Kapat
              </Button>
            </div>

            <FormKabugu
              gonder={gonder}
              durum={durum}
              formHatasi={formHatasi}
              basariMetni={duzenlenen ? 'Proje güncellendi.' : 'Proje eklendi.'}
              gonderEtiketi={duzenlenen ? 'Güncelle' : 'Ekle'}
            >
              <input type="hidden" {...register('locale')} />

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

                <Alan id="status" etiket="Durum" hata={errors.status?.message}>
                  {(b) => (
                    <select
                      id="status"
                      className="focus-ring rounded-input border-line-strong bg-elevated text-primary h-11 w-full border px-3 text-sm"
                      {...b}
                      {...register('status')}
                    >
                      {Object.values(ContentStatus).map((durum) => (
                        <option key={durum} value={durum}>
                          {DURUM_ETIKET[durum]}
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

              <Alan
                id="content"
                etiket="İçerik (MDX)"
                hata={errors.content?.message}
                yardim={
                  duzenlenen
                    ? 'Düzenlemede bu alan boş başlar: liste verisi MDX taşımıyor. Kaydetmeden önce içeriği yeniden yazman gerekiyor — MDX editörü T-035’te gelecek.'
                    : 'Markdown/MDX. Render sırasında rehype-sanitize’dan geçer.'
                }
              >
                {(b) => (
                  <Textarea
                    id="content"
                    rows={8}
                    className="tabular"
                    {...b}
                    {...register('content')}
                  />
                )}
              </Alan>

              <div className="grid gap-4 sm:grid-cols-2">
                {/*
                  ETİKET VE TEKNOLOJİ: form durumu DIŞINDA tutuluyor (virgüllü
                  metin ↔ dizi). Şema dizi bekliyor, kullanıcı tek satır yazıyor;
                  dönüşüm `kaydet` içinde yapılıyor ki şemaya dokunmayalım.
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

              {/* KAPAK — yer tutucu, ölü düğme yok (yukarıdaki nota bakınız). */}
              <div className="border-line bg-elevated/40 rounded-card flex items-start gap-3 border border-dashed p-4">
                <ImageOff className="text-muted mt-0.5 size-5 shrink-0" aria-hidden="true" />
                <div className="flex flex-col gap-1">
                  <p className="text-primary text-sm font-medium">Kapak görseli</p>
                  <p className="text-muted text-sm">
                    Görsel yükleme henüz açık değil (T-037). Kapak bağlanana kadar public tarafta
                    token’lı yer tutucu çiziliyor; düzen değişmeyecek.
                  </p>
                </div>
              </div>
            </FormKabugu>
          </CardContent>
        </Card>
      )}

      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-muted text-sm">
            <span className="tabular">{projeler.length}</span> yayındaki proje
          </p>

          {!formAcik && (
            <Button type="button" size="sm" onClick={() => formuAc(null)}>
              <Plus className="size-4" aria-hidden="true" />
              Yeni proje
            </Button>
          )}
        </div>

        <VeriTablosu
          baslik="Projeler"
          satirlar={projeler}
          sutunlar={sutunlar}
          satirAnahtari={(p) => p.id}
          bosDurum={
            <EmptyState
              icon={FolderOpen}
              title="Yayında proje yok"
              description="İlk projeyi ekleyip durumunu Yayında yaptığında hem burada hem /projeler sayfasında görünür."
              action={
                <Button type="button" size="sm" onClick={() => formuAc(null)}>
                  <Plus className="size-4" aria-hidden="true" />
                  İlk projeyi ekle
                </Button>
              }
            />
          }
        />
      </div>
    </div>
  );
}
