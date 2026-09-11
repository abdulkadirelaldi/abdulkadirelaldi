'use client';

import { GraduationCap, Loader2, Pencil, Plus, Trash2, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

import { Alan, BOS_ISE_YOK, SAYI_YA_DA_YOK } from '@/components/panel/alan';
import { FormKabugu, usePanelForm } from '@/components/panel/panel-form';
import { VeriTablosu, type Sutun } from '@/components/panel/veri-tablosu';
import { Badge } from '@/components/ui/badge';
import { Button, buttonClasses } from '@/components/ui/button';
import { Card, CardContent, CardTitle } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { FormAlert } from '@/components/ui/form-error';
import { Input, Textarea } from '@/components/ui/input';
import { aralik } from '@/components/public/gun-bicim';
import type * as z from 'zod';

import { createExperienceSchema, type CreateExperienceInput } from '@/lib/schemas/experience';
import {
  createExperienceAction,
  deleteExperienceAction,
  updateExperienceAction,
} from '@/server/actions/experience';
import type { ExperienceDto } from '@/server/services/content-dto';
import { ExperienceType } from '@/types';

/**
 * DENEYİM YÖNETİMİ — §4.2 `/panel/icerik/deneyim`.
 *
 * T-032'nin desenlerini GERÇEK veriyle ilk kez çoğaltan iki ekrandan biri.
 * Liste `VeriTablosu`, form `usePanelForm` + `FormKabugu`; ikisi de yeniden
 * yazılmadı, prop verilerek kullanıldı.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * SİLME — ARŞİVLEME DEĞİL (ADR-017 ayrımı)
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * `Experience` GERÇEKTEN siliniyor: hiçbir yabancı anahtar buna bağlı değil ve
 * silinen satırın anlık görüntüsü `AuditLog`a yazılıyor. Yani kayıt kaybolmuyor,
 * YERİ değişiyor. `Project`/`Post` ise arşivleniyor (slug korunur, adres
 * "kaldırıldı" sayfasına düşer).
 *
 * Bu ayrım kullanıcıya da AYNI DİLLE anlatılıyor: buradaki onay "kalıcı olarak
 * silinir, denetim kaydında görünmeye devam eder" diyor; projelerdeki onay
 * "listelerden çıkar ama silinmez, geri alınabilir" diyor. İki farklı işlem
 * için tek bir "Sil" kelimesi kullanmak, birinde geri dönüş olduğunu, diğerinde
 * olmadığını gizlerdi.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * FORM AYNI SAYFADA
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Ayrı `/yeni` ve `/[id]/duzenle` rotaları yerine liste sayfasında açılan bir
 * kart: kayıtlar kısa (kurum, ünvan, iki tarih) ve kullanıcı sıralamayı
 * listeye bakarak veriyor. Rota başına gidip gelmek bağlamı kaybettirirdi.
 * Uzun içerikli varlıklarda (proje MDX'i, blog yazısı) tercih farklı olabilir.
 */

const TUR_ETIKET: Record<ExperienceType, string> = {
  [ExperienceType.WORK]: 'İş',
  [ExperienceType.EDUCATION]: 'Eğitim',
};

/**
 * Form GİRDİSİ — şemanın ÇIKTISI değil.
 *
 * `z.input` ile ŞEMADAN TÜRETİLİYOR, elle yazılmıyor: `locale`, `current` ve
 * `order` şemada `.default()` taşıyor, yani girdide opsiyoneller. Elle yazılmış
 * bir tip bunu bir gün kaçırır ve form ile şema sessizce ayrışırdı — T-025'te
 * başlık slug'ında, T-032'de kırıntı etiketlerinde aynı ders.
 */
type DeneyimFormGirdi = z.input<typeof createExperienceSchema>;

const BOS_FORM: DeneyimFormGirdi = {
  locale: 'tr',
  organization: '',
  role: '',
  type: ExperienceType.WORK,
  startDate: '',
  endDate: '',
  current: false,
  description: '',
  order: 0,
};

export function DeneyimEkrani({ kayitlar }: { kayitlar: ExperienceDto[] }) {
  const router = useRouter();
  const [formAcik, setFormAcik] = useState(false);
  const [duzenlenen, setDuzenlenen] = useState<ExperienceDto | null>(null);
  const [silinen, setSilinen] = useState<string | null>(null);
  const [silmeHatasi, setSilmeHatasi] = useState<string | null>(null);
  const [bildirim, setBildirim] = useState<string | null>(null);
  const formBasligi = useRef<HTMLDivElement>(null);

  const kaydet = async (degerler: CreateExperienceInput) => {
    /*
     * BOŞ DİZE DÖNÜŞÜMÜ BURADA DEĞİL, `register(..., BOS_ISE_YOK)` İÇİNDE.
     *
     * Önce burada yapılmıştı ve ÇALIŞMIYORDU: `zodResolver` doğrulamayı
     * `kaydet` çağrılmadan ÖNCE yapıyor, yani `''` şemaya bu satırlara hiç
     * gelmeden takılıyordu — gönderim sunucuya ulaşmıyor, kullanıcı
     * doldurmadığı bir alan için "geçersiz tarih" görüyordu. T-034'te ölçüldü.
     */
    const govde = degerler;

    const sonuc = duzenlenen
      ? await updateExperienceAction({ ...govde, id: duzenlenen.id })
      : await createExperienceAction(govde);

    if (sonuc.ok) {
      setBildirim(duzenlenen ? 'Kayıt güncellendi.' : 'Kayıt eklendi.');
      /*
       * LİSTE TAZELEME: `router.refresh()` sunucu bileşenini yeniden çalıştırır.
       * Server Action `revalidateTag` ile önbelleği zaten düşürüyor; panel
       * dinamik render edildiği için tek eksik, AÇIK OLAN sayfanın yeniden
       * çizilmesi. Ölçüldü: bu çağrı olmadan yeni kayıt listede görünmüyordu.
       */
      router.refresh();
      if (!duzenlenen) {
        /* Yeni kayıt: form açık kalır, art arda giriş kolaylaşsın. */
      } else {
        setFormAcik(false);
        setDuzenlenen(null);
      }
    }
    return sonuc;
  };

  const { form, durum, formHatasi, gonder, durumuSifirla } = usePanelForm<
    DeneyimFormGirdi,
    CreateExperienceInput
  >({
    sema: createExperienceSchema,
    varsayilanDegerler: BOS_FORM,
    kaydet,
    temizle: true,
  });

  const {
    register,
    reset,
    watch,
    formState: { errors },
  } = form;

  /* Çapraz kural (T-011): devam eden kayda bitiş tarihi girilemez. */
  const devamEdiyor = watch('current');

  const formuAc = (kayit: ExperienceDto | null) => {
    setDuzenlenen(kayit);
    setFormAcik(true);
    setBildirim(null);
    durumuSifirla();
    reset(
      kayit
        ? {
            locale: kayit.locale,
            organization: kayit.organization,
            role: kayit.role,
            type: kayit.type,
            startDate: kayit.startDate,
            endDate: kayit.endDate ?? '',
            current: kayit.current,
            description: kayit.description ?? '',
            order: kayit.order,
          }
        : BOS_FORM,
    );
  };

  /* Form açılınca odak forma — klavye kullanıcısı listeyi baştan geçmesin. */
  useEffect(() => {
    if (formAcik) formBasligi.current?.focus();
  }, [formAcik, duzenlenen]);

  const sil = async (kayit: ExperienceDto) => {
    setSilinen(kayit.id);
    setSilmeHatasi(null);
    try {
      const sonuc = await deleteExperienceAction({ id: kayit.id });
      if (sonuc.ok) {
        setBildirim(`"${kayit.role}" kaydı silindi. Denetim kaydında görünmeye devam ediyor.`);
        router.refresh();
        if (duzenlenen?.id === kayit.id) {
          setFormAcik(false);
          setDuzenlenen(null);
        }
      } else {
        setSilmeHatasi(sonuc.error.message);
      }
    } catch {
      setSilmeHatasi('Silinemedi — bağlantı kurulamadı. Kayıt olduğu gibi duruyor.');
    } finally {
      setSilinen(null);
    }
  };

  const sutunlar: ReadonlyArray<Sutun<ExperienceDto>> = [
    {
      anahtar: 'role',
      baslik: 'Ünvan',
      deger: (k) => (
        <div className="flex flex-col">
          <span className="text-primary font-medium">{k.role}</span>
          <span className="text-muted text-xs">{k.organization}</span>
        </div>
      ),
      siralamaDegeri: (k) => k.role,
    },
    {
      anahtar: 'type',
      baslik: 'Tür',
      ikincil: true,
      deger: (k) => (
        <Badge variant={k.type === ExperienceType.WORK ? 'accent' : 'neutral'}>
          {TUR_ETIKET[k.type]}
        </Badge>
      ),
      siralamaDegeri: (k) => TUR_ETIKET[k.type],
    },
    {
      anahtar: 'tarih',
      baslik: 'Tarih',
      sayisal: true,
      deger: (k) => aralik(k.startDate, k.endDate, k.current),
      siralamaDegeri: (k) => k.startDate,
    },
    {
      anahtar: 'order',
      baslik: 'Sıra',
      sayisal: true,
      ikincil: true,
      deger: (k) => k.order,
      siralamaDegeri: (k) => k.order,
    },
    {
      anahtar: 'eylem',
      baslik: 'İşlem',
      deger: (k) => (
        <div className="flex justify-end gap-1">
          <Button type="button" variant="ghost" size="sm" onClick={() => formuAc(k)}>
            <Pencil className="size-3.5" aria-hidden="true" />
            <span className="sr-only sm:not-sr-only">Düzenle</span>
          </Button>

          <SilDugmesi kayit={k} calisiyor={silinen === k.id} sil={() => sil(k)} />
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

      {silmeHatasi && <FormAlert>{silmeHatasi}</FormAlert>}

      {formAcik && (
        <Card>
          <CardContent className="flex flex-col gap-4">
            <div className="flex items-start justify-between gap-3">
              <div ref={formBasligi} tabIndex={-1} className="focus-ring rounded-btn outline-none">
                <CardTitle seviye="h2">
                  {duzenlenen ? 'Kaydı düzenle' : 'Yeni deneyim kaydı'}
                </CardTitle>
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
              basariMetni={duzenlenen ? 'Kayıt güncellendi.' : 'Kayıt eklendi.'}
              gonderEtiketi={duzenlenen ? 'Güncelle' : 'Ekle'}
            >
              <input type="hidden" {...register('locale')} />

              <div className="grid gap-4 sm:grid-cols-2">
                <Alan id="organization" etiket="Kurum" hata={errors.organization?.message}>
                  {(b) => <Input id="organization" {...b} {...register('organization')} />}
                </Alan>

                <Alan id="role" etiket="Ünvan" hata={errors.role?.message}>
                  {(b) => <Input id="role" {...b} {...register('role')} />}
                </Alan>

                <Alan id="type" etiket="Tür" hata={errors.type?.message}>
                  {(b) => (
                    <select
                      id="type"
                      className="focus-ring rounded-input border-line-strong bg-elevated text-primary h-11 w-full border px-3 text-sm"
                      {...b}
                      {...register('type')}
                    >
                      <option value={ExperienceType.WORK}>{TUR_ETIKET[ExperienceType.WORK]}</option>
                      <option value={ExperienceType.EDUCATION}>
                        {TUR_ETIKET[ExperienceType.EDUCATION]}
                      </option>
                    </select>
                  )}
                </Alan>

                <Alan id="order" etiket="Sıra" hata={errors.order?.message}>
                  {/* §3.2 — sayısal alan sekmeli rakamla yazılır. */}
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

                <Alan id="startDate" etiket="Başlangıç" hata={errors.startDate?.message}>
                  {(b) => (
                    <Input
                      id="startDate"
                      type="date"
                      className="tabular"
                      {...b}
                      {...register('startDate')}
                    />
                  )}
                </Alan>

                <Alan
                  id="endDate"
                  etiket="Bitiş"
                  hata={errors.endDate?.message}
                  yardim={devamEdiyor ? 'Devam eden kayıtta bitiş tarihi girilemez.' : undefined}
                >
                  {/*
                    ÇAPRAZ KURAL GÖRÜNÜR HÂLE GETİRİLDİ (T-011): `current` işaretliyse
                    alan devre dışı. Kural yine ŞEMADA — burada yalnızca kullanıcının
                    imkânsız bir kombinasyonu yazmasını önlüyoruz. Devre dışı alan
                    boşaltılmıyor: kullanıcı işareti geri alırsa yazdığı tarih duruyor.
                  */}
                  {(b) => (
                    <Input
                      id="endDate"
                      type="date"
                      className="tabular"
                      disabled={devamEdiyor}
                      {...b}
                      {...register('endDate', BOS_ISE_YOK)}
                    />
                  )}
                </Alan>
              </div>

              <label className="flex w-fit items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  className="focus-ring accent-accent size-4"
                  {...register('current')}
                />
                Hâlâ devam ediyor
              </label>

              <Alan id="description" etiket="Açıklama" hata={errors.description?.message}>
                {(b) => (
                  <Textarea
                    id="description"
                    rows={3}
                    {...b}
                    {...register('description', BOS_ISE_YOK)}
                  />
                )}
              </Alan>
            </FormKabugu>
          </CardContent>
        </Card>
      )}

      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-muted text-sm">
            <span className="tabular">{kayitlar.length}</span> kayıt
          </p>

          {!formAcik && (
            <Button type="button" size="sm" onClick={() => formuAc(null)}>
              <Plus className="size-4" aria-hidden="true" />
              Yeni kayıt
            </Button>
          )}
        </div>

        <VeriTablosu
          baslik="Deneyim ve eğitim kayıtları"
          satirlar={kayitlar}
          sutunlar={sutunlar}
          satirAnahtari={(k) => k.id}
          bosDurum={
            <EmptyState
              icon={GraduationCap}
              title="Henüz kayıt yok"
              description="Deneyim ve eğitim geçmişin /hakkimda sayfasındaki zaman çizelgesini besliyor."
              action={
                <Button type="button" size="sm" onClick={() => formuAc(null)}>
                  <Plus className="size-4" aria-hidden="true" />
                  İlk kaydı ekle
                </Button>
              }
            />
          }
        />
      </div>
    </div>
  );
}

/** Silme onayı — arşivlemeden AYRI dil (yukarıdaki nota bakınız). */
function SilDugmesi({
  kayit,
  calisiyor,
  sil,
}: {
  kayit: ExperienceDto;
  calisiyor: boolean;
  sil: () => void;
}) {
  const [onayda, setOnayda] = useState(false);
  const onayRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (onayda) onayRef.current?.focus();
  }, [onayda]);

  useEffect(() => {
    if (!onayda) return;
    const tusla = (o: KeyboardEvent) => o.key === 'Escape' && setOnayda(false);
    document.addEventListener('keydown', tusla);
    return () => document.removeEventListener('keydown', tusla);
  }, [onayda]);

  if (!onayda) {
    return (
      <Button type="button" variant="ghost" size="sm" onClick={() => setOnayda(true)}>
        <Trash2 className="size-3.5" aria-hidden="true" />
        <span className="sr-only">{kayit.role} kaydını sil</span>
      </Button>
    );
  }

  return (
    <div
      role="group"
      aria-label={`${kayit.role} kaydını silme onayı`}
      className="border-line bg-elevated rounded-card flex flex-col gap-2 border p-2 text-left"
    >
      <p className="text-body text-xs">
        <span className="text-primary font-medium">{kayit.role}</span> kaydı{' '}
        <span className="text-primary font-medium">kalıcı olarak silinir</span>. Denetim kaydında
        görünmeye devam eder.
      </p>
      <div className="flex gap-1.5">
        <button
          ref={onayRef}
          type="button"
          disabled={calisiyor}
          onClick={sil}
          className={buttonClasses({ variant: 'danger', size: 'sm' })}
        >
          {calisiyor ? (
            <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
          ) : (
            <Trash2 className="size-3.5" aria-hidden="true" />
          )}
          {calisiyor ? 'Siliniyor…' : 'Evet, sil'}
        </button>
        <Button type="button" variant="ghost" size="sm" onClick={() => setOnayda(false)}>
          Vazgeç
        </Button>
      </div>
    </div>
  );
}
