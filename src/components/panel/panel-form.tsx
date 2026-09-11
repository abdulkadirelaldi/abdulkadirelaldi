'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { CheckCircle2, Loader2 } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import {
  useForm,
  type DefaultValues,
  type FieldValues,
  type Path,
  type Resolver,
  type UseFormReturn,
} from 'react-hook-form';
import type * as z from 'zod';

import { Button } from '@/components/ui/button';
import { FormAlert } from '@/components/ui/form-error';
import type { ApiResponse } from '@/types';

/**
 * FORM KABUĞU — F3/F4/F5'in tüm yazma ekranlarının ortak deseni (T-032).
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * §7.2 `fields` İLE NASIL KONUŞUYOR
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Sunucu hata zarfı: `{ ok: false, error: { code, message, fields? } }`.
 * `fields` anahtarları FORM ALAN ADLARIYLA BİREBİR aynı (`toValidationFailure`
 * onları Zod `path`inden üretiyor), bu yüzden burada EŞLEME TABLOSU YOK:
 * her anahtar doğrudan `setError(ad, { message })` ile basılıyor.
 *
 * Tablo olsaydı, sunucu yeni bir alan doğruladığında hata sessizce kaybolurdu —
 * kullanıcı "kaydet"e basar, bir şey olmaz, sebebini kimse göremez.
 *
 * ŞEMADA OLMAYAN ANAHTAR gelirse forma basılamaz; o mesaj form düzeyinde
 * gösteriliyor. Yutulmuyor: sunucunun söylediği şey her hâlükârda ekranda.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * BAŞARISIZLIKTA VERİ YUTULMAZ (T-026b / T-036c dersi)
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * `reset()` YALNIZCA başarı dalında ve `temizle: true` verildiğinde çağrılıyor.
 * Hata, ağ kopması ya da 500 durumunda kullanıcının yazdığı her şey yerinde
 * kalıyor; "Tekrar dene"ye basmak yeterli.
 *
 * DÜZENLEME EKRANLARINDA `temizle: false` (varsayılan): kaydettikten sonra
 * formu boşaltmak, düzenlenen kaydı kaybetmiş gibi hissettirir.
 */

export type PanelFormDurumu = 'bos' | 'gonderiliyor' | 'basarili';

export type PanelFormSonucu<TGiris extends FieldValues, TCikis extends FieldValues = TGiris> = {
  form: UseFormReturn<TGiris, unknown, TCikis>;
  durum: PanelFormDurumu;
  formHatasi: string | null;
  /** `<form onSubmit={...}>`e verilir. */
  gonder: (olay?: React.BaseSyntheticEvent) => Promise<void>;
  /** Başarı bildirimini elle kapatmak için (ör. kullanıcı yazmaya başlayınca). */
  durumuSifirla: () => void;
};

export function usePanelForm<TGiris extends FieldValues, TCikis extends FieldValues = TGiris>({
  sema,
  varsayilanDegerler,
  kaydet,
  temizle = false,
}: {
  /**
   * `ZodType<ÇIKTI, GİRDİ>` — ikisi AYRI olabilir.
   *
   * T-034'te ayrıldı: içerik şemaları `.default()` taşıyor (`featured`,
   * `order`, `status`), yani formun tuttuğu GİRDİ ile şemanın ürettiği ÇIKTI
   * aynı tip değil. Tek tiple sabitlenseydi bu şemalar kabuğa hiç
   * verilemezdi ve her ekran kendi kuralını yeniden yazardı — §7.3 ihlali.
   *
   * Form alanları GİRDİ tipinde tutuluyor (kullanıcının gördüğü hâl),
   * `kaydet` ÇIKTI tipini alıyor (şemanın ürettiği, varsayılanları dolmuş hâl).
   */
  sema: z.ZodType<TCikis, TGiris>;
  varsayilanDegerler: DefaultValues<TGiris>;
  /**
   * Sunucuya yazan çağrı — Server Action ya da route handler `fetch`i.
   * §7.2 zarfı DÖNDÜRMELİ; fırlatırsa ağ hatası dalına düşer.
   */
  kaydet: (degerler: TCikis) => Promise<ApiResponse<unknown>>;
  /** Başarıda form boşaltılsın mı — "yeni kayıt" ekranlarında `true`. */
  temizle?: boolean;
}): PanelFormSonucu<TGiris, TCikis> {
  /*
   * `as Resolver<T, unknown, T>`: `zodResolver` şemanın GİRDİ ve ÇIKTI tiplerini
   * ayrı jeneriklerle taşıyor; burada ikisi de `T` olduğu hâlde TypeScript
   * eşleştiremiyor. Dönüşüm tip düzeyinde, davranış aynı — şema neyi kabul
   * ediyorsa form da onu kabul ediyor.
   */
  const form = useForm<TGiris, unknown, TCikis>({
    resolver: zodResolver(sema) as unknown as Resolver<TGiris, unknown, TCikis>,
    defaultValues: varsayilanDegerler,
  });

  const [durum, setDurum] = useState<PanelFormDurumu>('bos');
  const [formHatasi, setFormHatasi] = useState<string | null>(null);

  const gonder = form.handleSubmit(async (degerler) => {
    setDurum('gonderiliyor');
    setFormHatasi(null);

    let sonuc: ApiResponse<unknown>;
    try {
      sonuc = await kaydet(degerler);
    } catch {
      setDurum('bos');
      setFormHatasi(
        'Kaydedilemedi — bağlantı kurulamadı. Yazdıkların duruyor, tekrar deneyebilirsin.',
      );
      return;
    }

    if (sonuc.ok) {
      if (temizle) form.reset(varsayilanDegerler);
      setDurum('basarili');
      return;
    }

    setDurum('bos');

    const alanlar = sonuc.error.fields;
    let basildi = false;
    if (alanlar) {
      for (const [ad, mesaj] of Object.entries(alanlar)) {
        if (ad in form.getValues()) {
          form.setError(ad as Path<TGiris>, { message: mesaj });
          basildi = true;
        }
      }
    }

    /* Alana basılamayan mesaj form düzeyinde gösterilir — sessizlik yok. */
    if (!basildi) setFormHatasi(sonuc.error.message);
  });

  return {
    form,
    durum,
    formHatasi,
    gonder,
    durumuSifirla: () => {
      setDurum('bos');
      setFormHatasi(null);
    },
  };
}

/**
 * Kabuğun görsel kısmı: form etiketi, hata/başarı bildirimi, gönder düğmesi.
 *
 * Alanları ÇAĞIRAN yazar (`children`) — her ekranın alanları farklı, ama
 * çerçevesi aynı olmalı.
 */
export function FormKabugu({
  gonder,
  durum,
  formHatasi,
  basariMetni = 'Kaydedildi.',
  gonderEtiketi = 'Kaydet',
  ikincilEylem,
  children,
}: {
  gonder: (olay?: React.BaseSyntheticEvent) => Promise<void>;
  durum: PanelFormDurumu;
  formHatasi: string | null;
  basariMetni?: string;
  gonderEtiketi?: string;
  /** "Vazgeç" gibi ikinci bir eylem. */
  ikincilEylem?: ReactNode;
  children: ReactNode;
}) {
  const gonderiliyor = durum === 'gonderiliyor';

  return (
    <form
      onSubmit={(olay) => {
        void gonder(olay);
      }}
      noValidate
      className="flex flex-col gap-5"
    >
      {/* Başarı `role="status"`: hata değil sonuç bildirimi, kullanıcıyı kesmez. */}
      {durum === 'basarili' && (
        <div
          role="status"
          className="rounded-input border-success/40 bg-success/8 text-success flex items-start gap-2.5 border px-3 py-2.5 text-sm"
        >
          <CheckCircle2 className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <span>{basariMetni}</span>
        </div>
      )}

      {formHatasi && <FormAlert>{formHatasi}</FormAlert>}

      {children}

      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={gonderiliyor}>
          {gonderiliyor && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
          {gonderiliyor ? 'Kaydediliyor…' : gonderEtiketi}
        </Button>

        {ikincilEylem}
      </div>
    </form>
  );
}
