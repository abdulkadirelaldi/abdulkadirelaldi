'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import type * as z from 'zod';

import { Alan, BOS_ISE_YOK, ONDALIK_YA_DA_YOK, SAYI_YA_DA_YOK } from '@/components/panel/alan';
import { KaliciSilDugmesi } from '@/components/panel/kalici-sil-dugmesi';
import { RUH_HALI } from '@/components/panel/kisisel-etiketler';
import { FormKabugu, usePanelForm } from '@/components/panel/panel-form';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardTitle } from '@/components/ui/card';
import { Input, Textarea } from '@/components/ui/input';
import { createHealthLogSchema } from '@/lib/schemas/health-log';
import {
  createHealthLogAction,
  deleteHealthLogAction,
  updateHealthLogAction,
} from '@/server/actions/health-log';
import type { HealthLogDto } from '@/server/services/health-log';

/**
 * SAĞLIK KAYDI FORMU — §4.2 `/panel/saglik`, T-113. Yeni ve düzenleme tek bileşen.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * GÜNDE TEK KAYIT — ÇAKIŞMA BİR ÇIKIŞ YOLU GÖSTERİYOR
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * `HealthLog.date @unique`. Aynı güne ikinci kayıt CONFLICT dönüyor ve sunucu
 * `fields.existingId` ile MEVCUT kaydın kimliğini veriyor (T-110). Hata
 * mesajını göstermek yetmezdi — kullanıcının yapacağı şey o kaydı açmak.
 * Kimlik formun alanı olmadığı için kabuk onu basmıyor; burada yakalanıp
 * bağlantıya çevriliyor.
 *
 * ⚠️ ÖLÇÜLER SAYIYA ÇEVRİLMİYOR: `weightKg`/`bodyFatPct`/`sleepHours` dize
 * olarak gidiyor (`ONDALIK_YA_DA_YOK` yalnızca virgülü noktaya çeviriyor).
 *
 * ⚠️ BİLİNEN SINIR: güncelleme şeması KISMİ (`partialWithoutDefaults`), yani
 * dolu bir alanı BOŞALTMAK onu silmez — alan gönderilmez ve eski değer kalır.
 * Yardım metni bunu söylüyor; yanlış ölçüm için yol kaydı silip yeniden
 * girmek ya da değeri düzeltmek.
 */

type SaglikFormGirdi = z.input<typeof createHealthLogSchema>;

function baslangic(kayit: HealthLogDto | undefined, gun: string): SaglikFormGirdi {
  if (!kayit) return { date: gun };
  return {
    date: kayit.date,
    weightKg: kayit.weightKg ?? undefined,
    bodyFatPct: kayit.bodyFatPct ?? undefined,
    sleepHours: kayit.sleepHours ?? undefined,
    waterMl: kayit.waterMl ?? undefined,
    restingHr: kayit.restingHr ?? undefined,
    steps: kayit.steps ?? undefined,
    mood: kayit.mood ?? undefined,
    note: kayit.note ?? undefined,
  };
}

/** `"82.50"` → `"82,50"` — düzenlemede kullanıcının yazım alışkanlığıyla göster. */
const virgullu = (deger: string | undefined) => deger?.replace('.', ',');

export function SaglikFormu({ kayit, gun }: { kayit?: HealthLogDto; gun: string }) {
  const router = useRouter();
  const duzenleme = kayit !== undefined;
  const [mevcutId, setMevcutId] = useState<string | null>(null);

  const kaydet = async (degerler: SaglikFormGirdi) => {
    setMevcutId(null);
    const sonuc = kayit
      ? await updateHealthLogAction({ ...degerler, id: kayit.id })
      : await createHealthLogAction(degerler);

    if (sonuc.ok) {
      router.refresh();
      if (!kayit) router.push('/panel/saglik');
    } else if (sonuc.error.code === 'CONFLICT' && sonuc.error.fields?.existingId) {
      setMevcutId(sonuc.error.fields.existingId);
    }

    return sonuc;
  };

  const varsayilan = baslangic(kayit, gun);
  const { form, durum, formHatasi, gonder } = usePanelForm<SaglikFormGirdi>({
    sema: createHealthLogSchema,
    varsayilanDegerler: {
      ...varsayilan,
      weightKg: virgullu(varsayilan.weightKg),
      bodyFatPct: virgullu(varsayilan.bodyFatPct),
      sleepHours: virgullu(varsayilan.sleepHours),
    },
    kaydet,
  });

  const {
    register,
    formState: { errors },
  } = form;

  return (
    <Card>
      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <CardTitle seviye="h2">
            {duzenleme ? `${kayit.date} kaydı` : 'Yeni sağlık kaydı'}
          </CardTitle>

          {kayit && (
            <KaliciSilDugmesi
              kayitAdi={`${kayit.date} kaydı`}
              aciklama="Ölçüm değerleri hiçbir yerde saklanmaz; denetim kaydında yalnızca günün silindiği görünür."
              etiketGorunsun
              sil={async () => {
                const sonuc = await deleteHealthLogAction({ id: kayit.id });
                if (sonuc.ok) {
                  router.push('/panel/saglik');
                  router.refresh();
                }
                return sonuc;
              }}
            />
          )}
        </div>

        {mevcutId && (
          <p
            role="status"
            className="rounded-input border-warning/40 bg-warning/8 text-body border px-3 py-2.5 text-sm"
          >
            Bu güne ait kayıt zaten var.{' '}
            <Link
              href={`/panel/saglik/${mevcutId}`}
              className="text-primary focus-ring rounded-sm font-medium underline underline-offset-4"
            >
              O günün kaydını düzenle
            </Link>
          </p>
        )}

        <FormKabugu
          gonder={gonder}
          durum={durum}
          formHatasi={formHatasi}
          basariMetni={duzenleme ? 'Kaydedildi.' : 'Kayıt eklendi.'}
          gonderEtiketi={duzenleme ? 'Kaydet' : 'Ekle'}
        >
          <Alan
            id="date"
            etiket="Gün"
            hata={errors.date?.message}
            yardim="Günde tek kayıt tutulur."
          >
            {(b) => (
              <Input id="date" type="date" className="tabular w-fit" {...b} {...register('date')} />
            )}
          </Alan>

          <fieldset className="grid gap-4 sm:grid-cols-3">
            <legend className="text-primary mb-2 text-sm font-medium">Vücut ölçüleri</legend>
            <Alan id="weightKg" etiket="Kilo (kg)" hata={errors.weightKg?.message}>
              {(b) => (
                <Input
                  id="weightKg"
                  inputMode="decimal"
                  className="tabular"
                  placeholder="82,5"
                  {...b}
                  {...register('weightKg', ONDALIK_YA_DA_YOK)}
                />
              )}
            </Alan>
            <Alan id="bodyFatPct" etiket="Vücut yağı (%)" hata={errors.bodyFatPct?.message}>
              {(b) => (
                <Input
                  id="bodyFatPct"
                  inputMode="decimal"
                  className="tabular"
                  placeholder="18,5"
                  {...b}
                  {...register('bodyFatPct', ONDALIK_YA_DA_YOK)}
                />
              )}
            </Alan>
            <Alan id="restingHr" etiket="Dinlenik nabız (bpm)" hata={errors.restingHr?.message}>
              {(b) => (
                <Input
                  id="restingHr"
                  type="number"
                  inputMode="numeric"
                  className="tabular"
                  {...b}
                  {...register('restingHr', SAYI_YA_DA_YOK)}
                />
              )}
            </Alan>
          </fieldset>

          <fieldset className="grid gap-4 sm:grid-cols-3">
            <legend className="text-primary mb-2 text-sm font-medium">Günlük değerler</legend>
            <Alan id="sleepHours" etiket="Uyku (saat)" hata={errors.sleepHours?.message}>
              {(b) => (
                <Input
                  id="sleepHours"
                  inputMode="decimal"
                  className="tabular"
                  placeholder="7,5"
                  {...b}
                  {...register('sleepHours', ONDALIK_YA_DA_YOK)}
                />
              )}
            </Alan>
            <Alan id="waterMl" etiket="Su (ml)" hata={errors.waterMl?.message}>
              {(b) => (
                <Input
                  id="waterMl"
                  type="number"
                  inputMode="numeric"
                  step={250}
                  className="tabular"
                  {...b}
                  {...register('waterMl', SAYI_YA_DA_YOK)}
                />
              )}
            </Alan>
            <Alan id="steps" etiket="Adım" hata={errors.steps?.message}>
              {(b) => (
                <Input
                  id="steps"
                  type="number"
                  inputMode="numeric"
                  className="tabular"
                  {...b}
                  {...register('steps', SAYI_YA_DA_YOK)}
                />
              )}
            </Alan>
          </fieldset>

          <Alan id="mood" etiket="Ruh hâli" hata={errors.mood?.message}>
            {(b) => (
              <select
                id="mood"
                className="focus-ring rounded-input border-line-strong bg-elevated text-primary h-11 w-full max-w-xs border px-3 text-sm"
                {...b}
                {...register('mood', SAYI_YA_DA_YOK)}
              >
                <option value="">Girilmedi</option>
                {[5, 4, 3, 2, 1].map((p) => (
                  <option key={p} value={p}>
                    {p} — {RUH_HALI[p]}
                  </option>
                ))}
              </select>
            )}
          </Alan>

          <Alan
            id="note"
            etiket="Not"
            hata={errors.note?.message}
            yardim="Yalnızca panelde görünür; denetim kaydına yazılmaz."
          >
            {(b) => <Textarea id="note" rows={3} {...b} {...register('note', BOS_ISE_YOK)} />}
          </Alan>

          {duzenleme && (
            <p className="text-muted text-xs">
              Dolu bir alanı boşaltmak değeri silmez. Yanlış girilmiş bir ölçümü düzeltin ya da
              kaydı silip yeniden girin.
            </p>
          )}
        </FormKabugu>

        <Button
          variant="ghost"
          size="sm"
          className="self-start"
          onClick={() => router.push('/panel/saglik')}
        >
          Listeye dön
        </Button>
      </CardContent>
    </Card>
  );
}
