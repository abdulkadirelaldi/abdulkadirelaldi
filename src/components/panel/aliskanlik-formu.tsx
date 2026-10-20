'use client';

import { ArchiveRestore } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import type * as z from 'zod';

import { Alan, BOS_ISE_YOK, SAYI_YA_DA_YOK } from '@/components/panel/alan';
import { ArsivleDugmesi } from '@/components/panel/arsivle-dugmesi';
import { FormKabugu, usePanelForm } from '@/components/panel/panel-form';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardTitle } from '@/components/ui/card';
import { FormAlert } from '@/components/ui/form-error';
import { Input } from '@/components/ui/input';
import { createHabitSchema } from '@/lib/schemas/habit';
import { archiveHabitAction, createHabitAction, updateHabitAction } from '@/server/actions/habit';
import type { HabitDto } from '@/server/services/habit';

/**
 * ALIŞKANLIK FORMU — §4.2 `/panel/hayat/aliskanliklar`, T-115. Yeni + düzenleme.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * İKİ HEDEF, İKİ AYRI SORU
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * `targetPerWeek` haftada kaç GÜN, `targetPerDay` gün içinde kaç KEZ
 * (ADR-021). İkincisi boşsa alışkanlık "yapıldı/yapılmadı" türünde ve
 * panodaki hücre aç/kapa; doluysa hücre sayaç. Yardım metinleri bu farkı
 * söylüyor — "hedef" kelimesi tek başına ikisini karıştırırdı.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ BİLİNEN SINIR — DOLU ALANI BOŞALTMAK ONU TEMİZLEMİYOR (iki alanda)
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Güncelleme şeması KISMİ (`partialWithoutDefaults`): `undefined` "dokunma"
 * demek ve şemada "temizle" anlamına gelen bir değer YOK (`null` kabul
 * edilmiyor). Sonuç:
 *   - `targetPerDay` boşaltılırsa sayaçlı alışkanlık aç/kapa türüne DÖNMEZ;
 *   - `color` boşaltılırsa renk KALIR (`''` biçim hatası verirdi, o yüzden
 *     `BOS_ISE_YOK` ile gönderilmiyor).
 * Arayüz bunu düzenleme ekranında açıkça yazıyor. `icon` BU SINIRA TAKILMIYOR:
 * servis boş metni `null`a çeviriyor, bu yüzden `icon` `BOS_ISE_YOK` OLMADAN
 * kaydediliyor ve boşaltmak gerçekten temizliyor.
 *
 * `isArchived` FORMUN ALANI DEĞİL — ayrı eylem (`archiveHabitAction`), başlıkta.
 */

type AliskanlikFormGirdi = z.input<typeof createHabitSchema>;

const RENK_BICIMI = /^#[0-9a-fA-F]{6}$/;

function baslangic(kayit: HabitDto | undefined): AliskanlikFormGirdi {
  if (!kayit) return { name: '', targetPerWeek: 7, isActive: true, icon: '' };
  return {
    name: kayit.name,
    targetPerWeek: kayit.targetPerWeek,
    targetPerDay: kayit.targetPerDay ?? undefined,
    color: kayit.color ?? undefined,
    icon: kayit.icon ?? '',
    isActive: kayit.isActive,
  };
}

export function AliskanlikFormu({ kayit }: { kayit?: HabitDto }) {
  const router = useRouter();
  const duzenleme = kayit !== undefined;
  const [arsivde, setArsivde] = useState(kayit?.isArchived ?? false);
  const [arsivHatasi, setArsivHatasi] = useState<string | null>(null);
  const [arsivCalisiyor, setArsivCalisiyor] = useState(false);

  const kaydet = async (degerler: AliskanlikFormGirdi) => {
    const sonuc = kayit
      ? await updateHabitAction({ ...degerler, id: kayit.id })
      : await createHabitAction(degerler);

    if (sonuc.ok) {
      router.refresh();
      if (!kayit) router.push('/panel/hayat/aliskanliklar');
    }

    return sonuc;
  };

  const { form, durum, formHatasi, gonder } = usePanelForm<AliskanlikFormGirdi>({
    sema: createHabitSchema,
    varsayilanDegerler: baslangic(kayit),
    kaydet,
  });

  const {
    register,
    watch,
    formState: { errors },
  } = form;
  const renk = watch('color');

  const arsivdenCikar = async () => {
    if (!kayit) return;
    setArsivCalisiyor(true);
    setArsivHatasi(null);
    try {
      const sonuc = await archiveHabitAction({ id: kayit.id, isArchived: false });
      if (sonuc.ok) {
        setArsivde(false);
        router.refresh();
      } else {
        setArsivHatasi(sonuc.error.message);
      }
    } catch {
      setArsivHatasi('İşlem tamamlanamadı — bağlantı kurulamadı. Kayıt olduğu gibi duruyor.');
    } finally {
      setArsivCalisiyor(false);
    }
  };

  return (
    <Card>
      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <CardTitle seviye="h2">{duzenleme ? kayit.name : 'Yeni alışkanlık'}</CardTitle>
            {arsivde && <Badge variant="warning">Arşiv</Badge>}
          </div>

          {kayit &&
            (arsivde ? (
              <Button
                variant="secondary"
                size="sm"
                disabled={arsivCalisiyor}
                onClick={() => void arsivdenCikar()}
              >
                <ArchiveRestore className="size-3.5" aria-hidden="true" />
                Arşivden çıkar
              </Button>
            ) : (
              <ArsivleDugmesi
                kayitAdi={kayit.name}
                arsivle={async () => {
                  const sonuc = await archiveHabitAction({ id: kayit.id, isArchived: true });
                  if (sonuc.ok) {
                    setArsivde(true);
                    router.refresh();
                  }
                  return sonuc;
                }}
              />
            ))}
        </div>

        {arsivHatasi && <FormAlert>{arsivHatasi}</FormAlert>}

        {arsivde && (
          <p
            role="status"
            className="rounded-input border-warning/40 bg-warning/8 text-body border px-3 py-2.5 text-sm"
          >
            Bu alışkanlık arşivde: panoda görünmez ve işaretlenemez. Geçmiş işaretleri silinmedi —
            arşivden çıkardığında olduğu gibi döner.
          </p>
        )}

        <FormKabugu
          gonder={gonder}
          durum={durum}
          formHatasi={formHatasi}
          basariMetni={duzenleme ? 'Kaydedildi.' : 'Alışkanlık eklendi.'}
          gonderEtiketi={duzenleme ? 'Kaydet' : 'Ekle'}
        >
          <Alan id="name" etiket="Ad" hata={errors.name?.message}>
            {(b) => <Input id="name" placeholder="Kitap oku" {...b} {...register('name')} />}
          </Alan>

          <div className="grid gap-4 sm:grid-cols-2">
            <Alan
              id="targetPerWeek"
              etiket="Haftalık hedef (gün)"
              hata={errors.targetPerWeek?.message}
              yardim="Haftada kaç GÜN (1–7). 7 ise seri gün gün, daha azsa hafta hafta sayılır."
            >
              {(b) => (
                <Input
                  id="targetPerWeek"
                  type="number"
                  inputMode="numeric"
                  min={1}
                  max={7}
                  className="tabular w-28"
                  {...b}
                  {...register('targetPerWeek', SAYI_YA_DA_YOK)}
                />
              )}
            </Alan>

            <Alan
              id="targetPerDay"
              etiket="Günlük hedef (kez)"
              hata={errors.targetPerDay?.message}
              yardim={
                duzenleme
                  ? 'Gün içinde kaç KEZ (ör. 8 bardak su). Boşaltmak mevcut değeri silmez.'
                  : 'Gün içinde kaç KEZ (ör. 8 bardak su). Boş bırakılırsa "yapıldı/yapılmadı" yeterli.'
              }
            >
              {(b) => (
                <Input
                  id="targetPerDay"
                  type="number"
                  inputMode="numeric"
                  min={1}
                  max={100}
                  className="tabular w-28"
                  {...b}
                  {...register('targetPerDay', SAYI_YA_DA_YOK)}
                />
              )}
            </Alan>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Alan
              id="color"
              etiket="Renk"
              hata={errors.color?.message}
              yardim={
                duzenleme
                  ? '#RRGGBB biçiminde. Boşaltmak mevcut rengi silmez.'
                  : '#RRGGBB biçiminde. Boş bırakılabilir.'
              }
            >
              {(b) => (
                <div className="flex items-center gap-2">
                  <Input
                    id="color"
                    placeholder="#22c55e"
                    className="tabular"
                    {...b}
                    {...register('color', BOS_ISE_YOK)}
                  />
                  {/* Önizleme yalnızca GEÇERLİ biçimde — `kategori-formu.tsx` gerekçesi. */}
                  {renk && RENK_BICIMI.test(renk) && (
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
              etiket="Simge"
              hata={errors.icon?.message}
              yardim="İsteğe bağlı kısa metin ya da emoji; panoda adın önünde görünür."
            >
              {(b) => <Input id="icon" placeholder="📚" {...b} {...register('icon')} />}
            </Alan>
          </div>

          <label className="flex w-fit items-center gap-2 text-sm">
            <input
              type="checkbox"
              className="focus-ring accent-accent size-4"
              {...register('isActive')}
            />
            Panoda göster
          </label>
          <p className="text-muted -mt-3 text-xs">
            Kaldırırsan alışkanlığa ara vermiş olursun: panodan çıkar ama arşivlenmez.
          </p>
        </FormKabugu>

        <Button
          variant="ghost"
          size="sm"
          className="self-start"
          onClick={() => router.push('/panel/hayat/aliskanliklar')}
        >
          Listeye dön
        </Button>
      </CardContent>
    </Card>
  );
}
