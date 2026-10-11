'use client';

import { useRouter } from 'next/navigation';
import type * as z from 'zod';

import { ANI_ISOYA, Alan, BOS_ISE_YOK, isodanYerelAna } from '@/components/panel/alan';
import { ISLEM_TURU_ETIKET, ODEME_YONTEMI_ETIKET } from '@/components/panel/muhasebe-gorunumleri';
import { FormKabugu, usePanelForm } from '@/components/panel/panel-form';
import { paraBicim } from '@/components/panel/para-bicim';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardTitle } from '@/components/ui/card';
import { Input, Textarea } from '@/components/ui/input';
import { createTransactionSchema } from '@/lib/schemas/transaction';
import { createTransactionAction, updateTransactionAction } from '@/server/actions/transaction';
import type { TransactionPanelDto } from '@/server/services/transaction';
import { Currency, PaymentMethod, TransactionType } from '@/types';

/**
 * İŞLEM FORMU — hızlı ekleme ve düzenleme, TEK bileşen.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ ARŞİVLİ KATEGORİ ↔ BAĞLI İŞLEM — T-103'ün KALIBI ÇOĞALTILDI
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Seçicinin seçenekleri SUNUCUDAN `isArchived: false` ile geliyor (sayfa
 * dosyasında, açıkça) — arşivlenmiş kategoriler yeni işlem için seçilebilir
 * olmamalı, yoksa arşivleme anlamını yitirir.
 *
 * Ama bu TEK BAŞINA bir bağı koparırdı; T-103'te müşteri seçicisinde ölçtüğüm
 * ÜÇÜNCÜ DURUMUN aynısı:
 *
 *   Arşivli bir kategoriye BAĞLI işlem düzenlenirken o kategori listede
 *   olmazdı; `<select>` değeri eşleşmeyince tarayıcı ilk seçeneğe düşer ve
 *   KAYDETMEK işlemi BAŞKA BİR KATEGORİYE bağlar. Sessiz veri kaybı — ve
 *   burada defteri de bozar, çünkü kategori raporlamanın kırılım anahtarı.
 *
 * Fark şu: `Transaction.categoryId` ZORUNLU (müşteri opsiyoneldi), yani
 * "kategori yok" seçeneği bile yok — ilk seçeneğe düşme riski daha yüksek.
 *
 * Çözüm aynı: sayfa, düzenlenen işlemin kategorisi arşivliyse onu seçeneklere
 * EK OLARAK geçiriyor ve burada "(arşivli)" işaretiyle çiziliyor. Kullanıcı
 * başka bir arşivli kategori seçemiyor ama kendi bağını da kaybetmiyor.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * SİLME YOK — ve bu formun bir eksiği değil
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Backend'in kararı: "bir işlemi silmek defteri geriye dönük değiştirmektir."
 * Eylem yazılmadı, o yüzden düğme de yok (ölü düğme yasağı, T-018). Yanlış
 * giriş DÜZELTİLİR — bu form tam olarak o yol.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * PARA — ADR-014
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * `amount` + `currency` + `fxRate` düzenlenebilir; `baseAmount` FORMDA YOK
 * (sunucuda türetiliyor). Düzenlemede salt okunur gösteriliyor. Kur tutarlılığı
 * ŞEMADA (`isFxRateConsistent`) ve hata `fields.fxRate` ile alana basılıyor.
 */

type IslemFormGirdi = z.input<typeof createTransactionSchema>;

export type KategoriSecenek = {
  id: string;
  name: string;
  type: TransactionType;
  isArchived: boolean;
};
export type IsSecenek = { id: string; title: string };

/** Bugünün günü — `YYYY-MM-DD`, yerel takvime göre (ADR-016 gün semantiği). */
function bugun(): string {
  const d = new Date();
  const p = (s: number) => String(s).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

const PARA_BIRIMI_ETIKET: Record<Currency, string> = {
  [Currency.TRY]: 'TRY — Türk lirası',
  [Currency.USD]: 'USD — Amerikan doları',
  [Currency.EUR]: 'EUR — Euro',
  [Currency.GBP]: 'GBP — Sterlin',
};

function baslangicDegerleri(
  islem: TransactionPanelDto | undefined,
  varsayilanKategori: string,
): IslemFormGirdi {
  if (!islem) {
    return {
      type: TransactionType.INCOME,
      amount: '',
      currency: Currency.TRY,
      fxRate: '1',
      /* HIZLI EKLEME: tarih bugüne, yöntem havaleye, ödenmiş işaretli —
         en sık girilen hâl. Kullanıcı üç alanı daha az dokunarak kaydediyor. */
      date: bugun(),
      categoryId: varsayilanKategori,
      method: PaymentMethod.BANK_TRANSFER,
      isPaid: true,
    };
  }

  return {
    type: islem.type,
    amount: islem.amount,
    currency: islem.currency,
    fxRate: islem.fxRate,
    date: islem.date,
    categoryId: islem.categoryId,
    jobId: islem.jobId ?? undefined,
    clientId: islem.clientId ?? undefined,
    description: islem.description ?? undefined,
    method: islem.method,
    isPaid: islem.isPaid,
    paidAt: isodanYerelAna(islem.paidAt),
    invoiceNo: islem.invoiceNo ?? undefined,
  };
}

export function IslemFormu({
  islem,
  kategoriler,
  isler,
}: {
  islem?: TransactionPanelDto;
  /** Sunucudan `isArchived: false` ile gelen aktif kategoriler. */
  kategoriler: KategoriSecenek[];
  isler: IsSecenek[];
}) {
  const router = useRouter();
  const duzenleme = islem !== undefined;

  /*
    Kaydın kendi kategorisi arşivliyse seçeneklere EKLENİYOR — yukarıdaki nota
    bakınız. `kategoriler` zaten aktifleri taşıyor, yani çakışma olmaz.
  */
  const arsivliBagli =
    islem && !kategoriler.some((k) => k.id === islem.categoryId)
      ? {
          id: islem.categoryId,
          name: islem.categoryName,
          type: islem.type,
          isArchived: true,
        }
      : null;

  const kategoriSecenekleri = arsivliBagli ? [...kategoriler, arsivliBagli] : kategoriler;

  const kaydet = async (degerler: IslemFormGirdi) => {
    const sonuc = islem
      ? await updateTransactionAction({ ...degerler, id: islem.id })
      : await createTransactionAction(degerler);

    if (sonuc.ok) {
      router.refresh();
      if (!islem) router.push('/panel/muhasebe');
    }

    return sonuc;
  };

  const { form, durum, formHatasi, gonder } = usePanelForm<IslemFormGirdi>({
    sema: createTransactionSchema,
    varsayilanDegerler: baslangicDegerleri(islem, kategoriler[0]?.id ?? ''),
    kaydet,
    temizle: false,
  });

  const {
    register,
    watch,
    formState: { errors },
  } = form;

  const secilenBirim = watch('currency');
  const secilenTur = watch('type');
  const odendi = watch('isPaid');

  /*
    KATEGORİ TÜRÜ İŞLEM TÜRÜYLE EŞLEŞMELİ mi? Şema bunu ZORUNLU KILMIYOR
    (`categoryId` yalnızca cuid). Yani gelir işlemine gider kategorisi
    bağlanabilir ve sunucu kabul eder. Arayüz bunu ENGELLEMİYOR — uydurma bir
    kural koymak, şemanın söylemediği bir şeyi dayatmak olurdu — ama seçeneklerde
    türü YAZIYOR, böylece kullanıcı ne seçtiğini görüyor.
  */
  const kategoriEtiketi = (k: KategoriSecenek) =>
    `${k.name} — ${ISLEM_TURU_ETIKET[k.type]}${k.isArchived ? ' (arşivli)' : ''}`;

  return (
    <Card>
      <CardContent className="flex flex-col gap-4">
        <CardTitle seviye="h2">{duzenleme ? 'İşlemi düzenle' : 'Yeni işlem'}</CardTitle>

        {arsivliBagli && (
          <p
            role="status"
            className="rounded-input border-warning/40 bg-warning/8 text-warning border px-3 py-2.5 text-sm"
          >
            Bu işlem <span className="font-medium">{arsivliBagli.name}</span> kategorisine bağlı ve
            o kategori arşivlenmiş. Bağ korunuyor — seçimde “(arşivli)” işaretiyle görünüyor. Başka
            bir arşivli kategori seçemezsin.
          </p>
        )}

        {kategoriler.length === 0 && !arsivliBagli && (
          <p
            role="alert"
            className="rounded-input border-danger/40 bg-danger/8 text-danger border px-3 py-2.5 text-sm"
          >
            Aktif kategori yok. İşlem kaydetmek için en az bir kategori gerekiyor — kategori
            yönetiminden ekleyebilirsin.
          </p>
        )}

        <FormKabugu
          gonder={gonder}
          durum={durum}
          formHatasi={formHatasi}
          basariMetni={duzenleme ? 'Kaydedildi.' : 'İşlem eklendi.'}
          gonderEtiketi={duzenleme ? 'Kaydet' : 'Ekle'}
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <Alan id="type" etiket="Tür" hata={errors.type?.message}>
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
              id="date"
              etiket="Tarih"
              hata={errors.date?.message}
              yardim="Gün — saat bilgisi taşımaz."
            >
              {(b) => (
                <Input id="date" type="date" className="tabular" {...b} {...register('date')} />
              )}
            </Alan>

            <Alan
              id="categoryId"
              etiket="Kategori"
              hata={errors.categoryId?.message}
              yardim="Arşivlenmiş kategoriler listede yoktur. Seçeneklerde türü de yazılı."
            >
              {(b) => (
                <select
                  id="categoryId"
                  className="focus-ring rounded-input border-line-strong bg-elevated text-primary h-11 w-full border px-3 text-sm"
                  {...b}
                  {...register('categoryId')}
                >
                  {kategoriSecenekleri.map((k) => (
                    <option key={k.id} value={k.id}>
                      {kategoriEtiketi(k)}
                    </option>
                  ))}
                </select>
              )}
            </Alan>

            <Alan id="method" etiket="Ödeme yöntemi" hata={errors.method?.message}>
              {(b) => (
                <select
                  id="method"
                  className="focus-ring rounded-input border-line-strong bg-elevated text-primary h-11 w-full border px-3 text-sm"
                  {...b}
                  {...register('method')}
                >
                  {Object.values(PaymentMethod).map((m) => (
                    <option key={m} value={m}>
                      {ODEME_YONTEMI_ETIKET[m]}
                    </option>
                  ))}
                </select>
              )}
            </Alan>

            <Alan
              id="jobId"
              etiket="İş"
              hata={errors.jobId?.message}
              yardim="Boş bırakılabilir. Bağlanan iş, iş detayındaki bakiyeye girer."
            >
              {(b) => (
                <select
                  id="jobId"
                  className="focus-ring rounded-input border-line-strong bg-elevated text-primary h-11 w-full border px-3 text-sm"
                  {...b}
                  {...register('jobId', BOS_ISE_YOK)}
                >
                  <option value="">İşe bağlı değil</option>
                  {isler.map((i) => (
                    <option key={i.id} value={i.id}>
                      {i.title}
                    </option>
                  ))}
                </select>
              )}
            </Alan>

            <Alan id="invoiceNo" etiket="Fatura no" hata={errors.invoiceNo?.message}>
              {(b) => (
                <Input
                  id="invoiceNo"
                  className="tabular"
                  {...b}
                  {...register('invoiceNo', BOS_ISE_YOK)}
                />
              )}
            </Alan>
          </div>

          {/* ── TUTAR ───────────────────────────────────────────────────── */}
          <fieldset className="flex flex-col gap-3">
            <legend className="text-primary text-sm font-medium">Tutar</legend>

            <div className="grid gap-4 sm:grid-cols-3">
              <Alan
                id="amount"
                etiket="Tutar"
                hata={errors.amount?.message}
                yardim="Kendi para biriminde. En fazla 2 ondalık."
              >
                {(b) => (
                  <Input
                    id="amount"
                    inputMode="decimal"
                    placeholder="1250.00"
                    className="tabular"
                    {...b}
                    {...register('amount')}
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
                /* Kural ŞEMADA (`isFxRateConsistent`); burada görünür kılınıyor. */
                yardim={
                  secilenBirim === Currency.TRY
                    ? 'TRY işlemlerde kur 1.0 olmak zorunda.'
                    : 'TRY dışı işlemlerde kur 1.0 olamaz. En fazla 8 ondalık.'
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
              `baseAmount` SALT OKUNUR — form alanı DEĞİL, sunucuda türetiliyor.
              Düzenlemede KAYDEDİLMİŞ hâliyle gösteriliyor; formdaki tutarı
              değiştirince CANLI HESAPLANMIYOR çünkü ADR-014/D para aritmetiğini
              istemciye yasaklıyor.
            */}
            {duzenleme && (
              <p className="text-muted text-sm">
                TRY karşılığı (kaydedilmiş):{' '}
                <span className="tabular text-body">
                  {paraBicim(islem.baseAmount, Currency.TRY)}
                </span>{' '}
                · kur <span className="tabular">{islem.fxRate}</span>. Sunucuda türetiliyor;
                kaydettiğinde yeniden hesaplanır.
              </p>
            )}
          </fieldset>

          {/* ── ÖDEME DURUMU ────────────────────────────────────────────── */}
          <div className="flex flex-col gap-3">
            <label className="flex w-fit items-center gap-2 text-sm">
              <input
                type="checkbox"
                className="focus-ring accent-accent size-4"
                {...register('isPaid')}
              />
              {secilenTur === TransactionType.INCOME ? 'Tahsil edildi' : 'Ödendi'}
            </label>

            <Alan
              id="paidAt"
              etiket={secilenTur === TransactionType.INCOME ? 'Tahsilat anı' : 'Ödeme anı'}
              hata={errors.paidAt?.message}
              yardim={
                odendi
                  ? 'Boş bırakılabilir — işaret tek başına yeterli.'
                  : 'İşaret kaldırıldığında bu alan anlamsız; boş bırak.'
              }
            >
              {(b) => (
                <Input
                  id="paidAt"
                  type="datetime-local"
                  className="tabular"
                  {...b}
                  {...register('paidAt', ANI_ISOYA)}
                />
              )}
            </Alan>
          </div>

          <Alan id="description" etiket="Açıklama" hata={errors.description?.message}>
            {(b) => (
              <Textarea
                id="description"
                rows={4}
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
          onClick={() => router.push('/panel/muhasebe')}
        >
          Listeye dön
        </Button>
      </CardContent>
    </Card>
  );
}
