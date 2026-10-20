'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import type * as z from 'zod';

import { Alan, SAYI_YA_DA_YOK } from '@/components/panel/alan';
import { etiketleriAyir, gunAyYil } from '@/components/panel/hayat-bicim';
import { KaliciSilDugmesi } from '@/components/panel/kalici-sil-dugmesi';
import { RUH_HALI } from '@/components/panel/kisisel-etiketler';
import { FormKabugu, usePanelForm } from '@/components/panel/panel-form';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardTitle } from '@/components/ui/card';
import { Input, Textarea } from '@/components/ui/input';
import { createJournalEntrySchema } from '@/lib/schemas/journal-entry';
import {
  createJournalEntryAction,
  deleteJournalEntryAction,
  updateJournalEntryAction,
} from '@/server/actions/journal-entry';
import type { JournalEntryDto } from '@/server/services/journal-entry';

/**
 * GÜNLÜK FORMU — §4.2 `/panel/hayat/gunluk`, T-115. Yeni + düzenleme.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ETİKETLER: EKRANDA METİN, FORMDA DİZİ
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Şema `tags: string[]` istiyor (`tagsSchema`, en fazla 20 × 32). Kullanıcı
 * ise "iş, spor, aile" yazıyor. İki yol vardı:
 *   - metin girdisine `register` + `setValueAs` → varsayılan değer DİZİ olduğu
 *     için girdiye `dizi.toString()` ("iş,spor") yazılır ve DOKUNULMAYAN alan
 *     dizi, dokunulan alan dönüştürülmüş dizi olur — iki farklı yol;
 *   - metni YEREL durumda tutup her değişiklikte `setValue('tags', dizi)` →
 *     form değeri HER ZAMAN dizi, ekran HER ZAMAN kullanıcının yazdığı metin.
 * İkincisi seçildi. Dönüşüm `etiketleriAyir`da (boş parça atılır, tekrar tek
 * kalır, uzunluk KESİLMEZ — sınırı şema söyler).
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * GİZLİLİK — DENETİM KAYDINA YALNIZCA GÜN
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * `content`, `title`, `tags`, `mood` denetim kaydına YAZILMIYOR (T-112 —
 * etiketler bile içeriğin özeti olabilir). Silme onayı bunu söylüyor:
 * silinen metin hiçbir yerde kalmıyor, kayıtta yalnızca gün görünüyor.
 *
 * ⚠️ BİLİNEN SINIR — RUH HÂLİ TEMİZLENEMİYOR: güncelleme şeması kısmi; "Girilmedi"
 * seçmek `undefined` gönderir ve eski değer kalır. `title` bu sınıra
 * TAKILMIYOR — servis boş metni `null`a çeviriyor, bu yüzden `BOS_ISE_YOK`
 * OLMADAN kaydediliyor. `tags` boş diziyle gerçekten temizleniyor.
 */

type GunlukFormGirdi = z.input<typeof createJournalEntrySchema>;

function baslangic(kayit: JournalEntryDto | undefined, gun: string): GunlukFormGirdi {
  if (!kayit) return { date: gun, title: '', content: '', tags: [] };
  return {
    date: kayit.date,
    title: kayit.title ?? '',
    content: kayit.content,
    mood: kayit.mood ?? undefined,
    tags: kayit.tags,
  };
}

/**
 * `tags` hatası iki biçimde gelebiliyor: dizinin KENDİSİNE (20'den fazla) ya
 * da tek bir ÖĞEYE (`tags.3` — 32 karakteri aşan etiket). İkisi de tek alanın
 * altında gösteriliyor; hangi etiketin uzun olduğu mesajda sırasıyla yazılıyor.
 */
function etiketHatasi(hata: unknown, etiketler: readonly string[]): string | undefined {
  if (!hata || typeof hata !== 'object') return undefined;
  const kayit = hata as { message?: unknown; root?: { message?: unknown } };
  if (typeof kayit.message === 'string') return kayit.message;
  if (typeof kayit.root?.message === 'string') return kayit.root.message;
  if (Array.isArray(hata)) {
    for (const [sira, oge] of hata.entries()) {
      const mesaj = (oge as { message?: unknown } | undefined)?.message;
      if (typeof mesaj === 'string') {
        const ad = etiketler[sira];
        return ad ? `“${ad}”: ${mesaj}` : mesaj;
      }
    }
  }
  return undefined;
}

export function GunlukFormu({ kayit, gun }: { kayit?: JournalEntryDto; gun: string }) {
  const router = useRouter();
  const duzenleme = kayit !== undefined;
  const [etiketMetni, setEtiketMetni] = useState(kayit ? kayit.tags.join(', ') : '');

  const kaydet = async (degerler: GunlukFormGirdi) => {
    const sonuc = kayit
      ? await updateJournalEntryAction({ ...degerler, id: kayit.id })
      : await createJournalEntryAction(degerler);

    if (sonuc.ok) {
      router.refresh();
      if (!kayit) router.push('/panel/hayat/gunluk');
    }

    return sonuc;
  };

  const { form, durum, formHatasi, gonder } = usePanelForm<GunlukFormGirdi>({
    sema: createJournalEntrySchema,
    varsayilanDegerler: baslangic(kayit, gun),
    kaydet,
  });

  const {
    register,
    setValue,
    watch,
    formState: { errors, isSubmitted },
  } = form;
  const etiketler = watch('tags') ?? [];
  const baslik = kayit ? (kayit.title ?? gunAyYil(kayit.date)) : 'Yeni günlük kaydı';

  return (
    <Card>
      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex min-w-0 flex-col gap-1">
            <CardTitle seviye="h2" className="break-words">
              {baslik}
            </CardTitle>
            {kayit?.title && <p className="tabular text-muted text-xs">{gunAyYil(kayit.date)}</p>}
          </div>

          {kayit && (
            <KaliciSilDugmesi
              kayitAdi={`${gunAyYil(kayit.date)} günlüğü`}
              aciklama="Günlüğün içeriği hiçbir yerde saklanmaz; denetim kaydında yalnızca hangi günün kaydının silindiği görünür."
              etiketGorunsun
              sil={async () => {
                const sonuc = await deleteJournalEntryAction({ id: kayit.id });
                if (sonuc.ok) {
                  router.push('/panel/hayat/gunluk');
                  router.refresh();
                }
                return sonuc;
              }}
            />
          )}
        </div>

        <FormKabugu
          gonder={gonder}
          durum={durum}
          formHatasi={formHatasi}
          basariMetni={duzenleme ? 'Kaydedildi.' : 'Günlük kaydı eklendi.'}
          gonderEtiketi={duzenleme ? 'Kaydet' : 'Ekle'}
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <Alan
              id="date"
              etiket="Gün"
              hata={errors.date?.message}
              yardim="Aynı güne birden çok kayıt yazılabilir."
            >
              {(b) => (
                <Input
                  id="date"
                  type="date"
                  className="tabular w-fit"
                  {...b}
                  {...register('date')}
                />
              )}
            </Alan>

            <Alan
              id="mood"
              etiket="Ruh hâli"
              hata={errors.mood?.message}
              yardim={duzenleme ? '“Girilmedi” seçmek kayıtlı değeri silmez.' : undefined}
            >
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
          </div>

          <Alan id="title" etiket="Başlık" hata={errors.title?.message} yardim="İsteğe bağlı.">
            {(b) => <Input id="title" {...b} {...register('title')} />}
          </Alan>

          <Alan
            id="content"
            etiket="Yazı"
            hata={errors.content?.message}
            yardim="Yalnızca panelde görünür; denetim kaydına yazılmaz."
          >
            {(b) => <Textarea id="content" rows={12} {...b} {...register('content')} />}
          </Alan>

          <Alan
            id="tags"
            etiket="Etiketler"
            hata={etiketHatasi(errors.tags, etiketler)}
            yardim="Virgülle ayır: iş, spor, aile. En fazla 20 etiket, her biri en fazla 32 karakter."
          >
            {(b) => (
              <Input
                id="tags"
                value={etiketMetni}
                onChange={(olay) => {
                  setEtiketMetni(olay.target.value);
                  setValue('tags', etiketleriAyir(olay.target.value), {
                    shouldDirty: true,
                    shouldValidate: isSubmitted,
                  });
                }}
                autoComplete="off"
                {...b}
              />
            )}
          </Alan>
        </FormKabugu>

        <Button
          variant="ghost"
          size="sm"
          className="self-start"
          onClick={() => router.push('/panel/hayat/gunluk')}
        >
          Listeye dön
        </Button>
      </CardContent>
    </Card>
  );
}
