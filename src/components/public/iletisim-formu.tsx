'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Send } from 'lucide-react';
import { useForm } from 'react-hook-form';

import { Button } from '@/components/ui/button';
import { FormAlert, FormError } from '@/components/ui/form-error';
import { Input, Textarea } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  createContactMessageSchema,
  type CreateContactMessageInput,
} from '@/lib/schemas/contact-message';

/**
 * İletişim formu — §4.1 /iletisim.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * DOĞRULAMA KURALI YENİDEN YAZILMIYOR (§7.3)
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * `resolver: zodResolver(createContactMessageSchema)` — alan uzunlukları,
 * e-posta biçimi, telefon deseni ve Türkçe hata metinleri T-011'in şemasından
 * geliyor. Burada tek bir `min`/`max`/`regex` yok. Sunucu AYNI şemayı
 * çalıştıracak (T-027), yani istemci doğrulaması bir KOLAYLIK; kapı sunucuda.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * GÖNDERİM HENÜZ BAĞLI DEĞİL — VE FORM BUNU SÖYLÜYOR
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Uç T-027'de yazılıyor (paralel). Formu çalışıyormuş gibi göstermek T-018'in
 * dersine aykırı olurdu: kullanıcı yazar, gönderir, hiçbir şey olmaz ve
 * sorunun kendisinde olduğunu düşünür. Bu yüzden:
 *
 *   - Gönder düğmesi DEVRE DIŞI ve yanında sebebi yazıyor.
 *   - `onSubmit` yine de savunma amaçlı bağlı: bir metin alanında Enter'a
 *     basmak formu göndermeye çalışır, devre dışı düğme bunu engellemez.
 *     O durumda sessizce hiçbir şey olmuyor değil — aynı bilgi duyuruluyor.
 *   - Doğrulama ÇALIŞIYOR: alanlar denenebilir, hatalar görünür. Yani T-027
 *     geldiğinde bağlanacak tek şey ağ çağrısı.
 *
 * BAĞLANTI NOKTASI (T-027): `UC_HAZIR` true yapılır ve `gonder` içindeki
 * `fetch` açılır. Sözleşme UYDURULMADI — T-027'nin çalışma ağacındaki ucu
 * okundu (`src/app/api/v1/iletisim/route.ts`) ve bu form ona göre hazırlandı:
 *
 *   GET  /api/v1/iletisim → { ok, data: { formToken, minFillSeconds } }
 *        Form çizildiğinde BİR KEZ çağrılır; `formToken` POST gövdesine konur.
 *        Jeton §8.15'in ZAMAN TUZAĞI'dır: formu 3 saniyeden hızlı dolduran
 *        istek spam sinyali alır. Jeton gönderilmezse istek REDDEDİLMEZ,
 *        yalnızca o sinyal ölçülemez.
 *   POST /api/v1/iletisim → gövde = bu formun alanları + `formToken`
 *        201 { ok: true, data: <fiş> } · 400 VALIDATION_ERROR (+ `fields`)
 *        429 RATE_LIMITED (+ `Retry-After`) · 500 INTERNAL
 *
 * `error.fields` anahtarları bu formdaki `name` değerleriyle birebir aynı
 * (§7.2 `toValidationFailure` yolu `path`ten üretiyor), yani sunucu hatası
 * doğrudan `setError(alan, { message })` ile basılabilir — eşleme tablosu
 * gerekmiyor.
 */

/** T-027'nin ucu yayına girdiğinde `true` olur. Tek bayrak, tek yer. */
const UC_HAZIR = false;

/** Sözleşme: gönderim adresi. T-027 bu yolu uygulayacak (raporda istendi). */
export const ILETISIM_UCU = '/api/v1/iletisim';

export function IletisimFormu({
  kaynakSayfa = '/iletisim',
  eposta = null,
}: {
  kaynakSayfa?: string;
  /**
   * Profilde e-posta VARSA adres; yoksa `null`.
   *
   * Uyarı metni buna göre değişiyor. Sabit "e-posta ya da sosyal hesaplardan
   * yazabilirsin" cümlesi ÖLÇÜMDE yakalandı: seed profilinde e-posta yok, yani
   * metin olmayan bir yolu tarif ediyordu. Küçük ama gerçek bir yalan — form
   * gönderilemezken kullanıcıyı da yanlış yere gönderirdi.
   */
  eposta?: string | null;
}) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<CreateContactMessageInput>({
    resolver: zodResolver(createContactMessageSchema),
    defaultValues: { website: '', sourcePage: kaynakSayfa },
  });

  const gonder = handleSubmit(async () => {
    if (!UC_HAZIR) return;
    /* T-027: buraya `fetch(ILETISIM_UCU, { method: 'POST', ... })` gelecek. */
  });

  return (
    <form onSubmit={gonder} noValidate className="flex flex-col gap-5">
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

          `sr-only`-benzeri gizleme  → gözle görülmez
          `aria-hidden` + `tabIndex` → ekran okuyucu okumaz, Tab uğramaz
          `autoComplete="off"`       → tarayıcı parola/adres yöneticisi DOLDURMAZ

        Son madde en çok atlanan: `display:none` yerine ekran dışına itmek
        şart, çünkü bazı botlar `display:none` alanları atlıyor; ama ekran
        dışındaki alanı tarayıcının otomatik doldurması GERÇEK kullanıcıyı spam
        işaretletirdi. `autocomplete="off"` o kapıyı kapatıyor.
      */}
      <div aria-hidden="true" className="pointer-events-none absolute left-[-9999px] h-0 w-0">
        <label htmlFor="website">Web siteniz (doldurmayın)</label>
        <input id="website" type="text" tabIndex={-1} autoComplete="off" {...register('website')} />
      </div>

      {/* `sourcePage`: mesajın hangi sayfadan geldiği. Kullanıcı verisi değil. */}
      <input type="hidden" {...register('sourcePage')} />

      <div className="flex flex-col gap-3">
        <FormAlert>
          Form gönderimi henüz açık değil — uç nokta hazırlanıyor.{' '}
          {eposta ? (
            <>
              Bu arada doğrudan{' '}
              <a href={`mailto:${eposta}`} className="focus-ring link rounded-btn break-all">
                {eposta}
              </a>{' '}
              adresine yazabilirsin.
            </>
          ) : (
            'Bu arada sosyal hesaplardan yazabilirsin; bağlantılar hemen yanda.'
          )}
        </FormAlert>

        <Button type="submit" disabled={!UC_HAZIR || isSubmitting} className="self-start">
          <Send className="size-4" aria-hidden="true" />
          Mesajı gönder
        </Button>
      </div>
    </form>
  );
}
