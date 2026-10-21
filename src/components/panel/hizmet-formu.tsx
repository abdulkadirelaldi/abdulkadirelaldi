'use client';

import { useRouter } from 'next/navigation';
import type * as z from 'zod';

import { Alan, BOS_ISE_YOK, SAYI_YA_DA_YOK, bosaltilanlariNullYap } from '@/components/panel/alan';
import { DilRozeti } from '@/components/panel/dil-sekmeleri';
import { icerikYolu, panelDili } from '@/components/panel/icerik-gorunumleri';
import { FormKabugu, usePanelForm } from '@/components/panel/panel-form';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardTitle } from '@/components/ui/card';
import { Input, Textarea } from '@/components/ui/input';
import { VARSAYILAN_DIL, type Dil } from '@/i18n/diller';
import { createServiceSchema, type CreateServiceInput } from '@/lib/schemas/service';
import { createServiceAction, updateServiceAction } from '@/server/actions/service';
import type { ServiceDto } from '@/server/services/content-dto';

/**
 * HİZMET FORMU — yeni kayıt ve düzenleme, TEK bileşen (`DeneyimFormu` kalıbı).
 *
 * `ctaUrl` BOŞ BIRAKILABİLİR ve bu bir eksik değil, varsayılan: public satır
 * boş bağlantıda Kıyı Medya'ya gidiyor (K4, `HizmetListesi`). Dolu bir
 * bağlantıyı boşaltmak onu SİLER (`bosaltilanlariNullYap`) — böylece hizmet
 * yeniden Kıyı Medya'ya döner. Kısmi şema `undefined`ı "dokunma" okuduğu için
 * bu çeviri olmasa eski bağlantı sessizce kalırdı.
 */

type HizmetFormGirdi = z.input<typeof createServiceSchema>;

const BOS_FORM: HizmetFormGirdi = {
  locale: 'tr',
  title: '',
  description: '',
  iconKey: '',
  ctaUrl: '',
  order: 0,
};

function baslangicDegerleri(
  kayit: ServiceDto | undefined,
  dil: Dil = VARSAYILAN_DIL,
): HizmetFormGirdi {
  /* Yeni kayıt listenin SEÇİLİ dilinde açılır (`?dil=`, ADR-046); düzenlemede kaydın kendi dili. */
  if (!kayit) return { ...BOS_FORM, locale: dil };

  return {
    locale: kayit.locale,
    title: kayit.title,
    description: kayit.description,
    iconKey: kayit.iconKey ?? '',
    ctaUrl: kayit.ctaUrl ?? '',
    order: kayit.order,
  };
}

export function HizmetFormu({
  kayit,
  dil = VARSAYILAN_DIL,
}: {
  kayit?: ServiceDto;
  /** Yeni kayıtta dil — sayfa `?dil=`den okuyor. Düzenlemede yok sayılır. */
  dil?: Dil;
}) {
  const router = useRouter();
  const duzenleme = kayit !== undefined;
  /* Liste aynı dilde açılsın — İngilizce kaydı kaydedip Türkçe listeye düşmek kaybolmuş hissi verir. */
  const listeYolu = icerikYolu('/panel/icerik/hizmetler', {
    dil: kayit ? panelDili(kayit.locale) : dil,
  });

  const kaydet = async (degerler: CreateServiceInput) => {
    const sonuc = kayit
      ? await updateServiceAction({
          ...bosaltilanlariNullYap(degerler, kayit, ['iconKey', 'ctaUrl']),
          id: kayit.id,
        })
      : await createServiceAction(degerler);

    if (sonuc.ok) {
      router.refresh();
      if (!kayit) router.push(listeYolu);
    }

    return sonuc;
  };

  const { form, durum, formHatasi, gonder } = usePanelForm<HizmetFormGirdi, CreateServiceInput>({
    sema: createServiceSchema,
    varsayilanDegerler: baslangicDegerleri(kayit, dil),
    kaydet,
    temizle: false,
    /* Gizli input — mesajı yutmasın diye bildiriliyor (T-041f/T-043f dersi). */
    gorunmezAlanlar: ['locale'],
  });

  const {
    register,
    formState: { errors },
  } = form;

  return (
    <Card>
      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <CardTitle seviye="h2">{duzenleme ? 'Hizmeti düzenle' : 'Yeni hizmet'}</CardTitle>
          {/* Dil SALT OKUNUR: var olan satırın dilini değiştirmek desteklenen bir işlem değil. */}
          <DilRozeti dil={kayit?.locale ?? dil} />
        </div>

        <FormKabugu
          gonder={gonder}
          durum={durum}
          formHatasi={formHatasi}
          basariMetni={duzenleme ? 'Hizmet güncellendi.' : 'Hizmet eklendi.'}
          gonderEtiketi={duzenleme ? 'Kaydet' : 'Ekle'}
        >
          <input type="hidden" {...register('locale')} />

          <div className="grid gap-4 sm:grid-cols-2">
            <Alan id="title" etiket="Başlık" hata={errors.title?.message}>
              {(b) => <Input id="title" {...b} {...register('title')} />}
            </Alan>

            <Alan
              id="order"
              etiket="Sıra"
              hata={errors.order?.message}
              yardim="Küçük sayı önce gelir — sitedeki numara buradan."
            >
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

            <Alan
              id="ctaUrl"
              etiket="Yönlendirme bağlantısı (isteğe bağlı)"
              hata={errors.ctaUrl?.message}
              yardim="Boş bırakılırsa hizmet Kıyı Medya'ya yönlendirir."
            >
              {(b) => (
                <Input
                  id="ctaUrl"
                  type="url"
                  inputMode="url"
                  placeholder="https://"
                  {...b}
                  {...register('ctaUrl', BOS_ISE_YOK)}
                />
              )}
            </Alan>

            <Alan
              id="iconKey"
              etiket="Simge anahtarı (isteğe bağlı)"
              hata={errors.iconKey?.message}
              yardim="Boş bırakılabilir; boşaltırsan kayıtlı anahtar silinir."
            >
              {(b) => <Input id="iconKey" {...b} {...register('iconKey', BOS_ISE_YOK)} />}
            </Alan>
          </div>

          <Alan id="description" etiket="Açıklama" hata={errors.description?.message}>
            {(b) => <Textarea id="description" rows={3} {...b} {...register('description')} />}
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
