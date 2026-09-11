'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { CheckCircle2, Loader2, Send } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';

import { Button } from '@/components/ui/button';
import { FormAlert, FormError } from '@/components/ui/form-error';
import { Input, Textarea } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  contactMessageFormSchema,
  createContactMessageSchema,
  type CreateContactMessageInput,
} from '@/lib/schemas/contact-message';
import type { ApiResponse } from '@/types';

/**
 * İletişim formu — §4.1 /iletisim. T-026'da UI, T-026b'de uca BAĞLANDI.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * DOĞRULAMA KURALI YENİDEN YAZILMIYOR (§7.3)
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * `resolver: zodResolver(contactMessageFormSchema)` — alan uzunlukları,
 * e-posta biçimi, telefon deseni ve Türkçe hata metinleri T-011'in şemasından
 * geliyor. Burada tek bir `min`/`max`/`regex` yok. Sunucu AYNI şemayı
 * çalıştırıyor; istemci doğrulaması bir KOLAYLIK, kapı sunucuda.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * UÇ SÖZLEŞMESİ (T-027, ölçülerek doğrulandı)
 * ═══════════════════════════════════════════════════════════════════════════
 *
 *   GET  /api/v1/iletisim → 200 { ok, data: { formToken, minFillSeconds } }
 *   POST /api/v1/iletisim → gövde = form alanları + `formToken`
 *        201 { ok: true, data: { id, createdAt } }
 *        400 VALIDATION_ERROR (+ `fields`) · 429 RATE_LIMITED (+ `Retry-After`)
 *        500 INTERNAL_ERROR
 *
 * ÜÇ İNCELİK — üçü de Backend'in notu, üçü de burada uygulanıyor:
 *
 * 1. `formToken` ZORUNLU DEĞİL. GET düşerse form YİNE gönderilir; yalnızca
 *    zaman tuzağı sinyali ölçülemez (spam puanına 20, eşik 50). Bu yüzden
 *    gönderim jetonun varlığına BAĞLANMADI — jeton için beklemek, ağ hatası
 *    yaşayan gerçek bir müşteriyi susturmak olurdu.
 * 2. `fields.website` ASLA dönmez; honeypot sunucuda şemadan çıkarılıyor, adı
 *    hata gövdesinde geçmiyor. Bu yüzden alan eşlemesinde ona yer yok.
 * 3. Honeypot'a takılan gönderim de 201 döner ve gövdesi temiz gönderimden
 *    AYIRT EDİLEMEZ. Başarı dalı buna göre yazıldı: bota "yakalandın"
 *    demiyoruz, yanlış pozitifte gerçek kullanıcıya da hata göstermiyoruz.
 */

/** Sözleşme: gönderim adresi. GET jeton verir, POST mesajı alır. */
export const ILETISIM_UCU = '/api/v1/iletisim';

/*
 * İSTEMCİ ŞEMASI — `contactMessageFormSchema` (T-031 konvansiyonu).
 *
 * T-026b'de burada yerel bir yama vardı: `createContactMessageSchema.extend({
 * website: z.string().optional() })`. Doğruydu — honeypot kuralı istemcide
 * koşunca dolu tuzak `handleSubmit`i hiç tetiklemiyor, bot sunucuya
 * ulaşmıyor ve yanlış pozitifte gerçek kullanıcı sessiz bir duvara çarpıyordu.
 *
 * Ama bilgi TEK BİR FORMUN İÇİNDE kalıyordu. Backend kuralı şemaya taşıdı:
 * sunucuda yorumlanan alan `serverInterpreted()` ile işaretli, `toFormSchema()`
 * onu çıkarıyor ve bir kapı testi ikisini birden koruyor. Yerel yama artık
 * gereksiz; kaldırıldı.
 */

type Durum = 'bos' | 'gonderiliyor' | 'basarili';

/**
 * `Retry-After` saniyesini insan diline çevirir.
 *
 * Uç en kötü durumu (bir saat) bildiriyor; başlık okunamazsa cümle süresiz
 * kurulur — uydurma bir süre söylemek, hiç söylememekten kötü.
 */
function beklemeMetni(retryAfter: string | null): string {
  const saniye = Number(retryAfter);
  if (!Number.isFinite(saniye) || saniye <= 0) return 'Biraz sonra tekrar dener misin?';
  if (saniye >= 3600) {
    const saat = Math.round(saniye / 3600);
    return `Yaklaşık ${saat} saat sonra tekrar deneyebilirsin.`;
  }
  const dakika = Math.max(1, Math.round(saniye / 60));
  return `Yaklaşık ${dakika} dakika sonra tekrar deneyebilirsin.`;
}

export function IletisimFormu({
  kaynakSayfa = '/iletisim',
  eposta = null,
}: {
  kaynakSayfa?: string;
  /**
   * Profilde e-posta VARSA adres; yoksa `null`.
   *
   * Hata metni buna göre değişiyor: gönderim başarısızsa alternatif yol
   * önerilir ama OLMAYAN bir yol önerilmez (T-026'da ölçümle yakalanmıştı).
   */
  eposta?: string | null;
}) {
  const {
    register,
    handleSubmit,
    setError,
    reset,
    formState: { errors },
  } = useForm<CreateContactMessageInput>({
    resolver: zodResolver(contactMessageFormSchema),
    defaultValues: { website: '', sourcePage: kaynakSayfa },
  });

  const [durum, setDurum] = useState<Durum>('bos');
  const [formHatasi, setFormHatasi] = useState<string | null>(null);

  /**
   * Jeton `ref`te, `state`te DEĞİL: değeri render'ı etkilemiyor ve her
   * güncellemede formu yeniden çizmenin anlamı yok.
   */
  const jeton = useRef<string | null>(null);

  /** Jetonu tazeler. Hata YUTULUYOR — jeton olmadan da gönderim çalışır (not 1). */
  const jetonAl = async () => {
    try {
      const yanit = await fetch(ILETISIM_UCU, {
        method: 'GET',
        headers: { Accept: 'application/json' },
      });
      if (!yanit.ok) return;
      const govde = (await yanit.json()) as ApiResponse<{ formToken: string }>;
      if (govde.ok) jeton.current = govde.data.formToken;
    } catch {
      /* Ağ hatası: jeton yok, form yine çalışır. */
    }
  };

  /* Form çizilince BİR KEZ — sözleşme böyle; bağımlılık listesi bilerek boş. */
  useEffect(() => {
    void jetonAl();
  }, []);

  const gonder = handleSubmit(async (degerler) => {
    setDurum('gonderiliyor');
    setFormHatasi(null);

    let yanit: Response;
    try {
      yanit = await fetch(ILETISIM_UCU, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...degerler, formToken: jeton.current ?? undefined }),
      });
    } catch {
      /*
       * AĞ HATASI — YAZILAN METİN KAYBOLMUYOR (T-036c disiplini).
       * `reset()` YALNIZCA başarı dalında çağrılıyor; burada form olduğu gibi
       * duruyor ve kullanıcı "Tekrar gönder"e basabiliyor.
       */
      setDurum('bos');
      setFormHatasi(
        eposta
          ? `Mesaj gönderilemedi — bağlantı kurulamadı. Yazdıkların duruyor, tekrar deneyebilirsin ya da doğrudan ${eposta} adresine yazabilirsin.`
          : 'Mesaj gönderilemedi — bağlantı kurulamadı. Yazdıkların duruyor, tekrar deneyebilirsin.',
      );
      return;
    }

    if (yanit.status === 201) {
      /*
       * BAŞARI. Honeypot'a takılan gönderim de buraya düşer ve düşmesi
       * GEREKİR (not 3) — yanıt ayırt edilemez, biz de ayırt etmiyoruz.
       *
       * FORM TEMİZLENİYOR — VE `reset` TÜM ALANLARI AÇIKÇA ALIYOR.
       *
       * ÖLÇÜMLE BULUNDU: `reset({ website: '', sourcePage })` gibi KISMİ bir
       * nesne verildiğinde react-hook-form yalnızca verdiğin anahtarları
       * yazıyor; listede olmayan alanlar DOM'da eski değerleriyle kalıyor.
       * Görünen sonuç şuydu: 201 dönüyor, başarı bildirimi çıkıyor, ama
       * yazdığın metin duruyordu (dört ayrı anda okundu: +0/+300/+1000/+2500 ms).
       * Hata yok, uyarı yok — sadece beklenen şey olmuyor.
       *
       * Bu yüzden alanların hepsi tek tek boşaltılıyor. Şemaya yeni bir alan
       * eklenirse buraya da eklenmeli; `pnpm typecheck` bunu YAKALAMAZ, çünkü
       * `reset` kısmi nesne kabul ediyor.
       */
      reset({
        name: '',
        email: '',
        phone: '',
        subject: '',
        message: '',
        website: '',
        sourcePage: kaynakSayfa,
      });
      setDurum('basarili');
      /* Bir sonraki mesaj için taze jeton; eskisi tek kullanımlık sayılmalı. */
      void jetonAl();
      return;
    }

    setDurum('bos');

    if (yanit.status === 429) {
      setFormHatasi(
        `Kısa sürede çok fazla mesaj gönderildi. ${beklemeMetni(yanit.headers.get('Retry-After'))}`,
      );
      return;
    }

    let govde: ApiResponse<unknown> | null = null;
    try {
      govde = (await yanit.json()) as ApiResponse<unknown>;
    } catch {
      govde = null;
    }

    if (govde && !govde.ok && yanit.status === 400) {
      /*
       * ALAN HATALARI SUNUCUDAN GELDİĞİ GİBİ BASILIYOR. `fields` anahtarları
       * form alan adlarıyla birebir (§7.2), bu yüzden eşleme tablosu yok —
       * tablo olsaydı sunucu yeni bir alan eklediğinde sessizce kaybolurdu.
       */
      const alanlar = govde.error.fields;
      let basildi = false;
      if (alanlar) {
        for (const [ad, mesaj] of Object.entries(alanlar)) {
          if (ad in createContactMessageSchema.shape) {
            setError(ad as keyof CreateContactMessageInput, { message: mesaj });
            basildi = true;
          }
        }
      }
      /* Alana bağlanamayan mesaj varsa (ör. gövde okunamadı) form düzeyinde göster. */
      if (!basildi) setFormHatasi(govde.error.message);
      return;
    }

    setFormHatasi(
      govde && !govde.ok
        ? govde.error.message
        : 'Mesaj gönderilemedi. Yazdıkların duruyor, birazdan tekrar deneyebilirsin.',
    );
  });

  const gonderiliyor = durum === 'gonderiliyor';

  return (
    <form onSubmit={gonder} noValidate className="flex flex-col gap-5">
      {/*
        BAŞARI BİLDİRİMİ — `role="status"`, `alert` DEĞİL.
        Ekran okuyucu kullanıcıyı kesmeden duyurur; hata değil, sonuç bildirimi.
        Form TEMİZLENDİĞİ için bildirim tek kanıt: "gönderildi mi?" sorusunu
        cevaplamayan bir boş form, gönderilmemiş formdan ayırt edilemezdi.
      */}
      {durum === 'basarili' && (
        <div
          role="status"
          className="rounded-input border-success/40 bg-success/8 text-success flex items-start gap-2.5 border px-3 py-2.5 text-sm"
        >
          <CheckCircle2 className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <span>
            Mesajın bana ulaştı. Genelde bir gün içinde dönüyorum — yanıtı yazdığın e-posta adresine
            göndereceğim.
          </span>
        </div>
      )}

      {formHatasi && <FormAlert>{formHatasi}</FormAlert>}

      <div className="grid gap-5 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="ad">Ad Soyad</Label>
          <Input
            id="ad"
            autoComplete="name"
            aria-invalid={errors.name ? true : undefined}
            aria-describedby={errors.name ? 'ad-hata' : undefined}
            {...register('name')}
          />
          {errors.name && <FormError id="ad-hata">{errors.name.message}</FormError>}
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="eposta">E-posta</Label>
          <Input
            id="eposta"
            type="email"
            inputMode="email"
            autoComplete="email"
            aria-invalid={errors.email ? true : undefined}
            aria-describedby={errors.email ? 'eposta-hata' : undefined}
            {...register('email')}
          />
          {errors.email && <FormError id="eposta-hata">{errors.email.message}</FormError>}
        </div>

        <div className="flex flex-col gap-1.5">
          {/* İsteğe bağlı alanlar ETİKETTE işaretleniyor: yıldızla zorunluyu
              işaretlemek yerine tersini yazmak, yıldızın ne demek olduğunu
              açıklama ihtiyacını ortadan kaldırıyor. */}
          <Label htmlFor="telefon">
            Telefon <span className="text-muted font-normal">(isteğe bağlı)</span>
          </Label>
          <Input
            id="telefon"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            aria-invalid={errors.phone ? true : undefined}
            aria-describedby={errors.phone ? 'telefon-hata' : undefined}
            {...register('phone')}
          />
          {errors.phone && <FormError id="telefon-hata">{errors.phone.message}</FormError>}
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="konu">
            Konu <span className="text-muted font-normal">(isteğe bağlı)</span>
          </Label>
          <Input
            id="konu"
            aria-invalid={errors.subject ? true : undefined}
            aria-describedby={errors.subject ? 'konu-hata' : undefined}
            {...register('subject')}
          />
          {errors.subject && <FormError id="konu-hata">{errors.subject.message}</FormError>}
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="mesaj">Mesaj</Label>
        <Textarea
          id="mesaj"
          rows={6}
          placeholder="Ne yapmak istediğini kısaca anlat — en iyisi birkaç cümle."
          aria-invalid={errors.message ? true : undefined}
          aria-describedby={errors.message ? 'mesaj-hata' : undefined}
          {...register('message')}
        />
        {errors.message && <FormError id="mesaj-hata">{errors.message.message}</FormError>}
      </div>

      {/*
        HONEYPOT — §8.15 / T-011 K6.

        Şema `website` alanını `.max(0)` ile taşıyor: dolu gelirse sunucu spam
        işaretler. Alanın ÜÇ KATMANDA birden gizlenmesi gerekiyor, çünkü her
        katman farklı bir "kullanıcı"yı kapsıyor:

          ekran dışına itme          → gözle görülmez
          `aria-hidden` + `tabIndex` → ekran okuyucu okumaz, Tab uğramaz
          `autoComplete="off"`       → tarayıcı parola/adres yöneticisi DOLDURMAZ

        Son madde en çok atlanan: `display:none` yerine ekran dışına itmek
        şart, çünkü bazı botlar `display:none` alanları atlıyor; ama ekran
        dışındaki alanı tarayıcının otomatik doldurması GERÇEK kullanıcıyı spam
        işaretletirdi. `autocomplete="off"` o kapıyı kapatıyor.

        `disabled` VERİLMİYOR: devre dışı alan gönderilmez ve tuzak kapanırdı.
      */}
      <div aria-hidden="true" className="pointer-events-none absolute left-[-9999px] h-0 w-0">
        <label htmlFor="website">Web siteniz (doldurmayın)</label>
        <input id="website" type="text" tabIndex={-1} autoComplete="off" {...register('website')} />
      </div>

      {/* `sourcePage`: mesajın hangi sayfadan geldiği. Kullanıcı verisi değil. */}
      <input type="hidden" {...register('sourcePage')} />

      <Button type="submit" disabled={gonderiliyor} className="self-start">
        {gonderiliyor ? (
          <Loader2 className="size-4 animate-spin" aria-hidden="true" />
        ) : (
          <Send className="size-4" aria-hidden="true" />
        )}
        {gonderiliyor ? 'Gönderiliyor…' : 'Mesajı gönder'}
      </Button>
    </form>
  );
}
