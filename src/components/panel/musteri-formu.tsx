'use client';

import { useRouter } from 'next/navigation';
import type * as z from 'zod';

import { Alan, BOS_ISE_YOK } from '@/components/panel/alan';
import { FormKabugu, usePanelForm } from '@/components/panel/panel-form';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardTitle } from '@/components/ui/card';
import { Input, Textarea } from '@/components/ui/input';
import { createClientSchema } from '@/lib/schemas/client';
import { createClientAction, updateClientAction } from '@/server/actions/client';
import type { ClientPanelDto } from '@/server/services/client';

/**
 * MÜŞTERİ FORMU — yeni kayıt ve düzenleme, TEK bileşen. Kalıbın yedinci kopyası.
 *
 * `notes` YALNIZCA DETAY DTO'SUNDA var (`ClientPanelDto`), listede yok — bu
 * yüzden form tek kayıt okumasından besleniyor. T-043f'te proje MDX'i için
 * verilen kararın aynısı: liste DTO'su taşımayan bir alan formu besleyemez,
 * yoksa kaydetmek o alanı siler.
 *
 * `isArchived` BU FORMDA YOK ve olmamalı: arşivleme ayrı bir eylem
 * (`archiveClientAction`) ve listeden iki yönde tetikleniyor. Forma koymak,
 * `updateClientAction`ın hiç almadığı bir alanı göndermek olurdu.
 */

type MusteriFormGirdi = z.input<typeof createClientSchema>;

const BOS_FORM: MusteriFormGirdi = {
  name: '',
  isKiyiMedya: false,
};

function baslangicDegerleri(musteri: ClientPanelDto | undefined): MusteriFormGirdi {
  if (!musteri) return BOS_FORM;

  return {
    name: musteri.name,
    company: musteri.company ?? undefined,
    email: musteri.email ?? undefined,
    phone: musteri.phone ?? undefined,
    notes: musteri.notes ?? undefined,
    isKiyiMedya: musteri.isKiyiMedya,
  };
}

export function MusteriFormu({ musteri }: { musteri?: ClientPanelDto }) {
  const router = useRouter();
  const duzenleme = musteri !== undefined;

  const kaydet = async (degerler: MusteriFormGirdi) => {
    const sonuc = musteri
      ? await updateClientAction({ ...degerler, id: musteri.id })
      : await createClientAction(degerler);

    if (sonuc.ok) {
      router.refresh();
      if (!musteri) router.push('/panel/musteriler');
    }

    return sonuc;
  };

  const { form, durum, formHatasi, gonder } = usePanelForm<MusteriFormGirdi>({
    sema: createClientSchema,
    varsayilanDegerler: baslangicDegerleri(musteri),
    kaydet,
    temizle: false,
    /* Gizli alan yok — `id` programatik geçiyor, `register`a bağlı değil. */
  });

  const {
    register,
    formState: { errors },
  } = form;

  return (
    <Card>
      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <CardTitle seviye="h2">{duzenleme ? 'Müşteriyi düzenle' : 'Yeni müşteri'}</CardTitle>

          {duzenleme && musteri.jobCount > 0 && (
            <p className="text-muted text-sm">
              Bağlı iş: <span className="tabular text-body">{musteri.jobCount}</span>
            </p>
          )}
        </div>

        <FormKabugu
          gonder={gonder}
          durum={durum}
          formHatasi={formHatasi}
          basariMetni={duzenleme ? 'Kaydedildi.' : 'Müşteri eklendi.'}
          gonderEtiketi={duzenleme ? 'Kaydet' : 'Ekle'}
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <Alan id="name" etiket="Ad" hata={errors.name?.message}>
              {(b) => <Input id="name" {...b} {...register('name')} />}
            </Alan>

            <Alan id="company" etiket="Şirket" hata={errors.company?.message}>
              {(b) => <Input id="company" {...b} {...register('company', BOS_ISE_YOK)} />}
            </Alan>

            <Alan
              id="email"
              etiket="E-posta"
              hata={errors.email?.message}
              yardim="Benzersiz: mesajdan otomatik müşteri açma bu alanla eşleştiriyor."
            >
              {(b) => (
                <Input
                  id="email"
                  type="email"
                  className="tabular"
                  {...b}
                  {...register('email', BOS_ISE_YOK)}
                />
              )}
            </Alan>

            <Alan id="phone" etiket="Telefon" hata={errors.phone?.message}>
              {(b) => (
                <Input
                  id="phone"
                  type="tel"
                  className="tabular"
                  {...b}
                  {...register('phone', BOS_ISE_YOK)}
                />
              )}
            </Alan>
          </div>

          <Alan
            id="notes"
            etiket="Notlar"
            hata={errors.notes?.message}
            yardim="Yalnızca panelde görünür."
          >
            {(b) => <Textarea id="notes" rows={5} {...b} {...register('notes', BOS_ISE_YOK)} />}
          </Alan>

          <label className="flex w-fit items-center gap-2 text-sm">
            <input
              type="checkbox"
              className="focus-ring accent-accent size-4"
              {...register('isKiyiMedya')}
            />
            Kıyı Medya üzerinden gelen müşteri
          </label>
        </FormKabugu>

        <Button
          variant="ghost"
          size="sm"
          className="self-start"
          onClick={() => router.push('/panel/musteriler')}
        >
          Listeye dön
        </Button>
      </CardContent>
    </Card>
  );
}
