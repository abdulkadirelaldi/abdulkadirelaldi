'use client';

import { useRouter } from 'next/navigation';
import type * as z from 'zod';

import { Alan, BOS_ISE_YOK } from '@/components/panel/alan';
import { IS_DURUM_ETIKET } from '@/components/panel/is-gorunumleri';
import { FormKabugu, usePanelForm } from '@/components/panel/panel-form';
import { paraBicim } from '@/components/panel/para-bicim';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardTitle } from '@/components/ui/card';
import { Input, Textarea } from '@/components/ui/input';
import { createJobSchema } from '@/lib/schemas/job';
import { createJobAction, updateJobAction } from '@/server/actions/job';
import type { JobPanelDto } from '@/server/services/job';
import { Currency, JobStatus } from '@/types';

/**
 * İŞ FORMU — yeni kayıt ve düzenleme, TEK bileşen.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ ARŞİVLİ MÜŞTERİ ↔ BAĞLI İŞ — ÇÖZÜM BURADA
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Seçicinin seçenekleri SUNUCUDAN `isArchived: false` ile geliyor (sayfa
 * dosyasında, açıkça) — arşivlenmiş müşteriler yeni iş için seçilebilir
 * olmamalı. Ama bu tek başına BİR BAĞI KOPARIRDI:
 *
 *   Arşivli bir müşteriye BAĞLI bir iş düzenlenirken o müşteri listede
 *   olmazdı; `<select>` değeri eşleşmeyince tarayıcı ilk seçeneğe düşer ve
 *   KAYDETMEK işi BAŞKA BİR MÜŞTERİYE bağlar. Sessiz veri kaybı.
 *
 * `JobPanelDto.client.isArchived` tam bunun için var. Çözüm: sayfa, düzenlenen
 * işin müşterisi arşivliyse onu seçeneklere EK OLARAK geçiriyor ve burada
 * "(arşivli)" işaretiyle çiziliyor. Yani:
 *
 *   - yeni iş       → yalnızca aktif müşteriler
 *   - düzenleme     → aktif müşteriler + varsa kaydın KENDİ arşivli müşterisi
 *
 * Arşivli seçenek listeye eklenmiyor, yalnızca MEVCUT değer olarak duruyor:
 * kullanıcı başka bir arşivli müşteri seçemiyor ama kendi bağını da kaybetmiyor.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * PARA — ADR-014'ün üç kuralı
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * `agreedAmount` ve `currency` DÜZENLENEBİLİR: kaydın kendi gerçeği.
 * `fxRate` düzenlenebilir ve tutarlılık kuralı ŞEMADA (`isFxRateConsistent`):
 * TRY'de 1.0 olmak zorunda, diğerlerinde olamaz. Hata `fields.fxRate` ile
 * geliyor ve alana basılıyor.
 *
 * ⚠️ `baseAmount` FORMDA YOK — sunucuda türetiliyor. Alan koymak, kullanıcıya
 * düzenleyebileceği izlenimi verip kaydetmede sessizce üzerine yazılan bir alan
 * göstermek olurdu. Düzenlemede SALT OKUNUR olarak gösteriliyor (aşağıda).
 *
 * KDV/stopaj v1 kapsamı DIŞI (ADR-014/B8) — alan yok, not da yok: kapsam dışı
 * olmak eksiklik değil ve "yakında" demeyen bir not bile beklenti üretir.
 */

type IsFormGirdi = z.input<typeof createJobSchema>;

export type MusteriSecenek = { id: string; name: string; isArchived: boolean };

const BOS_FORM: IsFormGirdi = {
  title: '',
  status: JobStatus.LEAD,
  currency: Currency.TRY,
  fxRate: '1',
};

const PARA_BIRIMI_ETIKET: Record<Currency, string> = {
  [Currency.TRY]: 'TRY — Türk lirası',
  [Currency.USD]: 'USD — Amerikan doları',
  [Currency.EUR]: 'EUR — Euro',
  [Currency.GBP]: 'GBP — Sterlin',
};

function baslangicDegerleri(is: JobPanelDto | undefined): IsFormGirdi {
  if (!is) return BOS_FORM;

  return {
    title: is.title,
    description: is.description ?? undefined,
    status: is.status,
    clientId: is.clientId ?? undefined,
    startDate: is.startDate ?? undefined,
    dueDate: is.dueDate ?? undefined,
    deliveredAt: is.deliveredAt ?? undefined,
    agreedAmount: is.agreedAmount ?? undefined,
    currency: is.currency,
    fxRate: is.fxRate,
  };
}

export function IsFormu({
  is,
  musteriler,
}: {
  is?: JobPanelDto;
  /** Sunucudan `isArchived: false` ile gelen aktif müşteriler. */
  musteriler: MusteriSecenek[];
}) {
  const router = useRouter();
  const duzenleme = is !== undefined;

  /*
    Kaydın kendi müşterisi arşivliyse seçeneklere EKLENİYOR — yukarıdaki nota
    bakınız. `musteriler` zaten aktifleri taşıyor, yani çakışma olmaz.
  */
  const arsivliBagli =
    is?.client && is.client.isArchived
      ? { id: is.client.id, name: is.client.name, isArchived: true }
      : null;

  const secenekler: MusteriSecenek[] = arsivliBagli ? [...musteriler, arsivliBagli] : musteriler;

  const kaydet = async (degerler: IsFormGirdi) => {
    const sonuc = is
      ? await updateJobAction({ ...degerler, id: is.id })
      : await createJobAction(degerler);

    if (sonuc.ok) {
      router.refresh();
      if (!is) router.push('/panel/isler');
    }

    return sonuc;
  };

  const { form, durum, formHatasi, gonder } = usePanelForm<IsFormGirdi>({
    sema: createJobSchema,
    varsayilanDegerler: baslangicDegerleri(is),
    kaydet,
    temizle: false,
  });

  const {
    register,
    watch,
    formState: { errors },
  } = form;

  const secilenBirim = watch('currency');

  return (
    <Card>
      <CardContent className="flex flex-col gap-4">
        <CardTitle seviye="h2">{duzenleme ? 'İşi düzenle' : 'Yeni iş'}</CardTitle>

        {arsivliBagli && (
          <p
            role="status"
            className="rounded-input border-warning/40 bg-warning/8 text-warning border px-3 py-2.5 text-sm"
          >
            Bu iş <span className="font-medium">{arsivliBagli.name}</span> müşterisine bağlı ve o
            müşteri arşivlenmiş. Bağ korunuyor — müşteri seçiminde “(arşivli)” işaretiyle görünüyor.
            Başka bir arşivli müşteri seçemezsin.
          </p>
        )}

        <FormKabugu
          gonder={gonder}
          durum={durum}
          formHatasi={formHatasi}
          basariMetni={duzenleme ? 'Kaydedildi.' : 'İş eklendi.'}
          gonderEtiketi={duzenleme ? 'Kaydet' : 'Ekle'}
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <Alan id="title" etiket="İş başlığı" hata={errors.title?.message}>
              {(b) => <Input id="title" {...b} {...register('title')} />}
            </Alan>

            <Alan
              id="clientId"
              etiket="Müşteri"
              hata={errors.clientId?.message}
              yardim="Boş bırakılabilir — iş müşterisiz açılabilir. Arşivlenmiş müşteriler listede yoktur."
            >
              {(b) => (
                <select
                  id="clientId"
                  className="focus-ring rounded-input border-line-strong bg-elevated text-primary h-11 w-full border px-3 text-sm"
                  {...b}
                  {...register('clientId', BOS_ISE_YOK)}
                >
                  <option value="">Müşteri yok</option>
                  {secenekler.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                      {m.isArchived ? ' (arşivli)' : ''}
                    </option>
                  ))}
                </select>
              )}
            </Alan>

            <Alan id="status" etiket="Durum" hata={errors.status?.message}>
              {(b) => (
                <select
                  id="status"
                  className="focus-ring rounded-input border-line-strong bg-elevated text-primary h-11 w-full border px-3 text-sm"
                  {...b}
                  {...register('status')}
                >
                  {Object.values(JobStatus).map((durumDeger) => (
                    <option key={durumDeger} value={durumDeger}>
                      {IS_DURUM_ETIKET[durumDeger]}
                    </option>
                  ))}
                </select>
              )}
            </Alan>

            <Alan
              id="deliveredAt"
              etiket="Teslim anı"
              hata={errors.deliveredAt?.message}
              yardim="Teslim edilen işlerde doldurulur."
            >
              {(b) => (
                <Input
                  id="deliveredAt"
                  type="datetime-local"
                  className="tabular"
                  {...b}
                  {...register('deliveredAt', BOS_ISE_YOK)}
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
                  {...register('startDate', BOS_ISE_YOK)}
                />
              )}
            </Alan>

            <Alan
              id="dueDate"
              etiket="Teslim tarihi"
              hata={errors.dueDate?.message}
              yardim="Başlangıçtan önce olamaz."
            >
              {(b) => (
                <Input
                  id="dueDate"
                  type="date"
                  className="tabular"
                  {...b}
                  {...register('dueDate', BOS_ISE_YOK)}
                />
              )}
            </Alan>
          </div>

          <Alan id="description" etiket="Açıklama" hata={errors.description?.message}>
            {(b) => (
              <Textarea
                id="description"
                rows={5}
                {...b}
                {...register('description', BOS_ISE_YOK)}
              />
            )}
          </Alan>

          {/* ── PARA ─────────────────────────────────────────────────────── */}
          <fieldset className="flex flex-col gap-3">
            <legend className="text-primary text-sm font-medium">Tutar</legend>

            <div className="grid gap-4 sm:grid-cols-3">
              <Alan
                id="agreedAmount"
                etiket="Anlaşma tutarı"
                hata={errors.agreedAmount?.message}
                yardim="Brüt, kendi para biriminde. En fazla 2 ondalık."
              >
                {(b) => (
                  <Input
                    id="agreedAmount"
                    inputMode="decimal"
                    placeholder="1250.00"
                    className="tabular"
                    {...b}
                    {...register('agreedAmount', BOS_ISE_YOK)}
                  />
                )}
              </Alan>

              <Alan id="currency" etiket="Para birimi" hata={errors.currency?.message}>
                {(b) => (
                  <select
                    id="currency"
                    className="focus-ring rounded-input border-line-strong bg-elevated text-primary h-11 w-full border px-3 text-sm"
                    {...b}
                    {...register('currency')}
                  >
                    {Object.values(Currency).map((birim) => (
                      <option key={birim} value={birim}>
                        {PARA_BIRIMI_ETIKET[birim]}
                      </option>
                    ))}
                  </select>
                )}
              </Alan>

              <Alan
                id="fxRate"
                etiket="Kur"
                hata={errors.fxRate?.message}
                /* Kural ŞEMADA (`isFxRateConsistent`); burada yalnızca görünür kılınıyor. */
                yardim={
                  secilenBirim === Currency.TRY
                    ? 'TRY işlerde kur 1.0 olmak zorunda.'
                    : 'TRY dışı işlerde kur 1.0 olamaz. En fazla 8 ondalık.'
                }
              >
                {(b) => (
                  <Input
                    id="fxRate"
                    inputMode="decimal"
                    placeholder={secilenBirim === Currency.TRY ? '1' : '34.12345678'}
                    className="tabular"
                    {...b}
                    {...register('fxRate')}
                  />
                )}
              </Alan>
            </div>

            {/*
              `baseAmount` SALT OKUNUR — form alanı DEĞİL. Sunucuda türetiliyor
              (`agreedAmount × fxRate`), yani düzenlenebilir göstermek kaydetmede
              sessizce üzerine yazılan bir alan göstermek olurdu. Yalnızca
              düzenlemede ve yalnızca kaydedilmiş hâliyle görünüyor; formdaki
              tutarı değiştirince CANLI HESAPLANMIYOR — ADR-014/D para
              aritmetiğini istemciye yasaklıyor.
            */}
            {duzenleme && is.baseAmount !== null && (
              <p className="text-muted text-sm">
                TRY karşılığı (kaydedilmiş):{' '}
                <span className="tabular text-body">{paraBicim(is.baseAmount, Currency.TRY)}</span>{' '}
                · kur <span className="tabular">{is.fxRate}</span>. Sunucuda türetiliyor; tutarı
                değiştirip kaydettiğinde yeniden hesaplanır.
              </p>
            )}
          </fieldset>
        </FormKabugu>

        <Button
          variant="ghost"
          size="sm"
          className="self-start"
          onClick={() => router.push('/panel/isler')}
        >
          Panoya dön
        </Button>
      </CardContent>
    </Card>
  );
}
