'use client';

import { useRouter } from 'next/navigation';
import type * as z from 'zod';

import { Alan, BOS_ISE_YOK } from '@/components/panel/alan';
import { ISLEM_TURU_ETIKET } from '@/components/panel/muhasebe-gorunumleri';
import { FormKabugu, usePanelForm } from '@/components/panel/panel-form';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { createTransactionCategorySchema } from '@/lib/schemas/transaction-category';
import {
  createTransactionCategoryAction,
  updateTransactionCategoryAction,
} from '@/server/actions/transaction-category';
import type { TransactionCategoryPanelDto } from '@/server/services/transaction-category';
import { TransactionType } from '@/types';

/**
 * KATEGORİ FORMU — yeni kayıt ve düzenleme.
 *
 * `isArchived` BU FORMDA YOK: arşivleme ayrı bir eylem
 * (`archiveTransactionCategoryAction`) ve listeden iki yönde tetikleniyor.
 * Forma koymak, `updateTransactionCategoryAction`ın hiç almadığı bir alanı
 * göndermek olurdu — T-103'te müşteri formunda verilen kararın aynısı.
 *
 * RENK: `type="color"` yerine metin alanı. Sebep ölçülebilir — şema
 * `#RRGGBB` istiyor ve `<input type="color">` tarayıcıya göre farklı biçimde
 * değer verebiliyor; ayrıca BOŞ BIRAKILAMAZ (her zaman bir renk döndürür) ama
 * alan opsiyonel. Metin alanı hem şemanın istediği biçimi hem "renk yok"
 * durumunu ifade edebiliyor.
 */

type KategoriFormGirdi = z.input<typeof createTransactionCategorySchema>;

const BOS_FORM: KategoriFormGirdi = {
  name: '',
  type: TransactionType.EXPENSE,
};

function baslangicDegerleri(k: TransactionCategoryPanelDto | undefined): KategoriFormGirdi {
  if (!k) return BOS_FORM;
  return {
    name: k.name,
    type: k.type,
    color: k.color ?? undefined,
    icon: k.icon ?? undefined,
  };
}

export function KategoriFormu({ kategori }: { kategori?: TransactionCategoryPanelDto }) {
  const router = useRouter();
  const duzenleme = kategori !== undefined;

  const kaydet = async (degerler: KategoriFormGirdi) => {
    const sonuc = kategori
      ? await updateTransactionCategoryAction({ ...degerler, id: kategori.id })
      : await createTransactionCategoryAction(degerler);

    if (sonuc.ok) {
      router.refresh();
      if (!kategori) router.push('/panel/muhasebe/kategoriler');
    }

    return sonuc;
  };

  const { form, durum, formHatasi, gonder } = usePanelForm<KategoriFormGirdi>({
    sema: createTransactionCategorySchema,
    varsayilanDegerler: baslangicDegerleri(kategori),
    kaydet,
    temizle: false,
  });

  const {
    register,
    watch,
    formState: { errors },
  } = form;

  const renk = watch('color');

  return (
    <Card>
      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <CardTitle seviye="h2">{duzenleme ? 'Kategoriyi düzenle' : 'Yeni kategori'}</CardTitle>

          {duzenleme && kategori.transactionCount > 0 && (
            <p className="text-muted text-sm">
              Bağlı kayıt: <span className="tabular text-body">{kategori.transactionCount}</span>
            </p>
          )}
        </div>

        <FormKabugu
          gonder={gonder}
          durum={durum}
          formHatasi={formHatasi}
          basariMetni={duzenleme ? 'Kaydedildi.' : 'Kategori eklendi.'}
          gonderEtiketi={duzenleme ? 'Kaydet' : 'Ekle'}
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <Alan id="name" etiket="Ad" hata={errors.name?.message}>
              {(b) => <Input id="name" {...b} {...register('name')} />}
            </Alan>

            <Alan
              id="type"
              etiket="Tür"
              hata={errors.type?.message}
              yardim={
                duzenleme
                  ? 'Türü değiştirmek bağlı kayıtların kırılımını değiştirir.'
                  : 'Gelir ve gider kategorileri ayrı tutulur.'
              }
            >
              {(b) => (
                <select
                  id="type"
                  className="focus-ring rounded-input border-line-strong bg-elevated text-primary h-11 w-full border px-3 text-sm"
                  {...b}
                  {...register('type')}
                >
                  {Object.values(TransactionType).map((t) => (
                    <option key={t} value={t}>
                      {ISLEM_TURU_ETIKET[t]}
                    </option>
                  ))}
                </select>
              )}
            </Alan>

            <Alan
              id="color"
              etiket="Renk"
              hata={errors.color?.message}
              yardim="#RRGGBB biçiminde. Boş bırakılabilir — grafiklerde (T-105) kullanılacak."
            >
              {(b) => (
                <div className="flex items-center gap-2">
                  <Input
                    id="color"
                    placeholder="#4f46e5"
                    className="tabular"
                    {...b}
                    {...register('color', BOS_ISE_YOK)}
                  />
                  {/*
                    ÖNİZLEME yalnızca GEÇERLİ biçimde çiziliyor: yarım yazılmış
                    bir hex ("#4f4") tarayıcıda farklı bir renge çözülür ve
                    kullanıcıya kaydedilecek olandan farklı bir şey gösterirdi.
                  */}
                  {renk && /^#[0-9a-fA-F]{6}$/.test(renk) && (
                    <span
                      aria-hidden="true"
                      className="border-line size-9 shrink-0 rounded border"
                      style={{ backgroundColor: renk }}
                    />
                  )}
                </div>
              )}
            </Alan>

            <Alan
              id="icon"
              etiket="İkon"
              hata={errors.icon?.message}
              yardim="Serbest metin. Bugün hiçbir yerde çizilmiyor; T-105'te grafiklerde kullanılabilir."
            >
              {(b) => <Input id="icon" {...b} {...register('icon', BOS_ISE_YOK)} />}
            </Alan>
          </div>
        </FormKabugu>

        <Button
          variant="ghost"
          size="sm"
          className="self-start"
          onClick={() => router.push('/panel/muhasebe/kategoriler')}
        >
          Listeye dön
        </Button>
      </CardContent>
    </Card>
  );
}
