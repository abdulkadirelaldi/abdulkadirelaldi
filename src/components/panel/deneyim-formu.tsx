'use client';

import { useRouter } from 'next/navigation';
import type * as z from 'zod';

import { Alan, BOS_ISE_YOK, SAYI_YA_DA_YOK } from '@/components/panel/alan';
import { DilRozeti } from '@/components/panel/dil-sekmeleri';
import { icerikYolu, panelDili } from '@/components/panel/icerik-gorunumleri';
import { FormKabugu, usePanelForm } from '@/components/panel/panel-form';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardTitle } from '@/components/ui/card';
import { Input, Textarea } from '@/components/ui/input';
import { VARSAYILAN_DIL, type Dil } from '@/i18n/diller';
import { createExperienceSchema, type CreateExperienceInput } from '@/lib/schemas/experience';
import { createExperienceAction, updateExperienceAction } from '@/server/actions/experience';
import type { ExperienceDto } from '@/server/services/content-dto';
import { ExperienceType } from '@/types';

/**
 * DENEYİM FORMU — yeni kayıt ve düzenleme, TEK bileşen.
 *
 * ⚠️ `Experience`'TA DURUM YOK ve bu bilinçli: modelde `status` kolonu yok,
 * `fetchExperience` zaten `publishedWhere` uygulamıyordu. ENGEL-1'in durum
 * kısmı burada HİÇ yoktu — simetri uğruna bir durum süzgeci eklemek, olmayan
 * bir kavramı arayüze icat etmek olurdu.
 *
 * Düzenleme `fetchExperienceForPanelById`den besleniyor. `ExperienceDto` zaten
 * tüm alanları taşıyor (projelerdeki MDX sorunu burada yok), ama okumanın TEK
 * KAYIT olması yine de doğru: liste sayfalandı, düzenlenecek kayıt o sayfada
 * olmayabilir.
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

const TUR_ETIKET: Record<ExperienceType, string> = {
  [ExperienceType.WORK]: 'İş',
  [ExperienceType.EDUCATION]: 'Eğitim',
  // Ödülde alanlar: ünvan = derece, kurum = yarışma ve kategori (schema.prisma notu).
  [ExperienceType.AWARD]: 'Ödül',
};

function baslangicDegerleri(
  kayit: ExperienceDto | undefined,
  dil: Dil = VARSAYILAN_DIL,
): DeneyimFormGirdi {
  /* Yeni kayıt listenin SEÇİLİ dilinde açılır (`?dil=`, ADR-046); düzenlemede kaydın kendi dili. */
  if (!kayit) return { ...BOS_FORM, locale: dil };

  return {
    locale: kayit.locale,
    organization: kayit.organization,
    role: kayit.role,
    type: kayit.type,
    startDate: kayit.startDate,
    endDate: kayit.endDate ?? '',
    current: kayit.current,
    description: kayit.description ?? '',
    order: kayit.order,
  };
}

export function DeneyimFormu({
  kayit,
  dil = VARSAYILAN_DIL,
}: {
  kayit?: ExperienceDto;
  /** Yeni kayıtta dil — sayfa `?dil=`den okuyor. Düzenlemede yok sayılır. */
  dil?: Dil;
}) {
  const router = useRouter();
  const duzenleme = kayit !== undefined;
  /* Liste aynı dilde açılsın — İngilizce kaydı kaydedip Türkçe listeye düşmek kaybolmuş hissi verir. */
  const listeYolu = icerikYolu('/panel/icerik/deneyim', {
    dil: kayit ? panelDili(kayit.locale) : dil,
  });

  const kaydet = async (degerler: CreateExperienceInput) => {
    const sonuc = kayit
      ? await updateExperienceAction({ ...degerler, id: kayit.id })
      : await createExperienceAction(degerler);

    if (sonuc.ok) {
      router.refresh();
      if (!kayit) router.push(listeYolu);
    }

    return sonuc;
  };

  const { form, durum, formHatasi, gonder } = usePanelForm<DeneyimFormGirdi, CreateExperienceInput>(
    {
      sema: createExperienceSchema,
      varsayilanDegerler: baslangicDegerleri(kayit, dil),
      kaydet,
      temizle: false,
      /* Gizli input — mesajı yutmasın diye bildiriliyor (T-041f/T-043f dersi). */
      gorunmezAlanlar: ['locale'],
    },
  );

  const {
    register,
    watch,
    formState: { errors },
  } = form;

  /* Çapraz kural (T-011): devam eden kayda bitiş tarihi girilemez. */
  const devamEdiyor = watch('current');

  return (
    <Card>
      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <CardTitle seviye="h2">{duzenleme ? 'Kaydı düzenle' : 'Yeni deneyim kaydı'}</CardTitle>
          {/* Dil SALT OKUNUR: var olan satırın dilini değiştirmek desteklenen bir işlem değil. */}
          <DilRozeti dil={kayit?.locale ?? dil} />
        </div>

        <FormKabugu
          gonder={gonder}
          durum={durum}
          formHatasi={formHatasi}
          basariMetni={duzenleme ? 'Kayıt güncellendi.' : 'Kayıt eklendi.'}
          gonderEtiketi={duzenleme ? 'Kaydet' : 'Ekle'}
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
                  <option value={ExperienceType.AWARD}>{TUR_ETIKET[ExperienceType.AWARD]}</option>
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
