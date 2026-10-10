'use client';

import { FileText, ImageOff } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type * as z from 'zod';

import { Alan, BOS_ISE_YOK } from '@/components/panel/alan';
import { FormKabugu, usePanelForm } from '@/components/panel/panel-form';
import { buttonClasses } from '@/components/ui/button';
import { Card, CardContent, CardTitle } from '@/components/ui/card';
import { Input, Textarea } from '@/components/ui/input';
import { updateProfileSchema } from '@/lib/schemas/profile';
import { saveProfileAction } from '@/server/actions/profile';
import type { ProfileDto } from '@/server/services/content-dto';

/**
 * PROFİL FORMU — §4.2 `/panel/icerik/profil`.
 *
 * Kalıbın BEŞİNCİ kopyası ve ilk TEKİL VARLIK. Projeler/blog/deneyimde liste +
 * `[id]` + `yeni` üçlüsü vardı; burada yalnızca TEK sayfa var ve bu doğru:
 * `Profile` dil başına tek satır (ADR-017), seed ile açılıyor. "Yeni profil"
 * ya da "profili sil" diye bir eylem Backend'de de YOK — simetri uğruna liste
 * ekranı uydurmak, olmayan bir seçimi arayüze taşımak olurdu.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * TEK EYLEM: `saveProfileAction` (`upsert`)
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * `create`/`update` ayrımı yok, bu yüzden formda "ekle/kaydet" ayrımı da yok —
 * düğme her zaman "Kaydet". `durum` alanı da yok: profil yayınlanmaz, vardır.
 * Bu, kalıbın durum sekmelerinin/arşivleme düğmesinin buraya HİÇ gelmemesi
 * demek; ekran o yüzden kalıbın en küçük hâli.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * `locale` GÜNCELLENEN ALAN DEĞİL, ADRES
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Eylem `locale`ü `where` anahtarı olarak kullanıyor (hangi satır). Formda
 * gizli bir alan olarak taşınıyor ve kullanıcıya DEĞİŞTİRİLEBİLİR bir alan
 * olarak sunulmuyor: açılır liste koymak, Türkçe profili kaydederken dilini
 * değiştirmenin kaydı taşıdığı izlenimini verirdi — oysa başka bir satıra
 * yazardı.
 */

type ProfilFormGirdi = z.input<typeof updateProfileSchema>;

/**
 * SOSYAL ALANLAR SABİT LİSTE — anahtar/değer editörü DEĞİL. ÖLÇÜLDÜ.
 *
 * Kart "sabit liste daha güvenli ama esnekliği öldürür" diyordu; ölçüm bunu
 * çürüttü: ÖLDÜRÜLECEK BİR ESNEKLİK YOK. `socialsSchema` `.strict()` ile
 * bağlı ve tam olarak bu yedi anahtarı tanıyor. Serbest bir anahtar/değer
 * editörü kullanıcıya `githubb` yazdırabilirdi ve sunucu bunu sessizce
 * düşürmez — şemanın yorumu gereği KAYDIN TAMAMINI reddeder.
 *
 * Yani serbest editör, sunucunun hiçbir koşulda kabul etmeyeceği bir girdiyi
 * davet eden bir arayüz olurdu. Sabit liste burada bir kısıtlama değil,
 * şemanın olduğu gibi gösterilmesi.
 *
 * Şema yeni bir anahtar kazandığında bu dizi de büyümeli. Tipi `ProfilFormGirdi`
 * üzerinden bağlı olduğu için, şemadan kalkan bir anahtar burada derleme hatası
 * verir — sessizce ayrışamaz.
 */
const SOSYAL_ALANLAR: ReadonlyArray<{
  anahtar: 'github' | 'linkedin' | 'x' | 'instagram' | 'youtube' | 'website' | 'email';
  etiket: string;
  tur: 'url' | 'email';
  ipucu: string;
}> = [
  { anahtar: 'github', etiket: 'GitHub', tur: 'url', ipucu: 'https://github.com/kullanici' },
  {
    anahtar: 'linkedin',
    etiket: 'LinkedIn',
    tur: 'url',
    ipucu: 'https://linkedin.com/in/kullanici',
  },
  { anahtar: 'x', etiket: 'X', tur: 'url', ipucu: 'https://x.com/kullanici' },
  {
    anahtar: 'instagram',
    etiket: 'Instagram',
    tur: 'url',
    ipucu: 'https://instagram.com/kullanici',
  },
  { anahtar: 'youtube', etiket: 'YouTube', tur: 'url', ipucu: 'https://youtube.com/@kanal' },
  { anahtar: 'website', etiket: 'Web sitesi', tur: 'url', ipucu: 'https://ornek.com' },
  { anahtar: 'email', etiket: 'E-posta', tur: 'email', ipucu: 'ad@ornek.com' },
];

function baslangicDegerleri(profil: ProfileDto): ProfilFormGirdi {
  return {
    locale: profil.locale,
    headline: profil.headline,
    subtitle: profil.subtitle ?? undefined,
    bio: profil.bio,
    location: profil.location ?? undefined,
    availability: profil.availability ?? undefined,
    /*
      `socials` nesnesi alan alan açılıyor. Tamamını `profil.socials ?? {}` diye
      geçirmek de çalışırdı ama şemada olmayan bir anahtar veritabanında varsa
      (sütun serbest `Json`) o anahtar forma sızar ve `.strict()` kaydı
      reddederdi — kullanıcı hiç dokunmadığı bir alan yüzünden kaydedemezdi.
      Alan alan okumak, formun yalnızca şemanın tanıdığı anahtarları taşımasını
      garanti ediyor.
    */
    socials: Object.fromEntries(
      SOSYAL_ALANLAR.map(({ anahtar }) => [anahtar, profil.socials?.[anahtar] ?? undefined]),
    ),
    avatarAttachmentId: profil.avatar?.id ?? undefined,
    cvAttachmentId: profil.cv?.id ?? undefined,
  };
}

export function ProfilFormu({ profil }: { profil: ProfileDto }) {
  const router = useRouter();

  const kaydet = async (degerler: ProfilFormGirdi) => {
    const sonuc = await saveProfileAction(degerler);
    if (sonuc.ok) router.refresh();
    return sonuc;
  };

  const { form, durum, formHatasi, gonder } = usePanelForm<ProfilFormGirdi>({
    sema: updateProfileSchema,
    varsayilanDegerler: baslangicDegerleri(profil),
    kaydet,
    temizle: false,
    /*
      Gizli alanlar — bunlara düşen mesaj form düzeyine yükseltilsin (T-041f'te
      bulunan, T-043f'te desene taşınan kusur). `locale` adres, ikisi de R2
      kimliği ve hiçbiri ekranda bir girdi olarak görünmüyor.
    */
    gorunmezAlanlar: ['locale', 'avatarAttachmentId', 'cvAttachmentId'],
  });

  const {
    register,
    formState: { errors },
  } = form;

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardContent className="flex flex-col gap-4">
          <CardTitle seviye="h2">Profil</CardTitle>

          <FormKabugu
            gonder={gonder}
            durum={durum}
            formHatasi={formHatasi}
            basariMetni="Kaydedildi. Değişiklikler ana sayfa ve /hakkimda’da görünüyor."
            gonderEtiketi="Kaydet"
          >
            <input type="hidden" {...register('locale')} />
            <input type="hidden" {...register('avatarAttachmentId', BOS_ISE_YOK)} />
            <input type="hidden" {...register('cvAttachmentId', BOS_ISE_YOK)} />

            <div className="grid gap-4 sm:grid-cols-2">
              <Alan
                id="headline"
                etiket="Hero başlığı"
                hata={errors.headline?.message}
                yardim="Ana sayfanın en üstünde, en büyük metin."
              >
                {(b) => <Input id="headline" {...b} {...register('headline')} />}
              </Alan>

              <Alan
                id="subtitle"
                etiket="Alt başlık"
                hata={errors.subtitle?.message}
                yardim="Hero başlığının altındaki tek satır."
              >
                {(b) => <Input id="subtitle" {...b} {...register('subtitle', BOS_ISE_YOK)} />}
              </Alan>

              <Alan id="location" etiket="Konum" hata={errors.location?.message}>
                {(b) => <Input id="location" {...b} {...register('location', BOS_ISE_YOK)} />}
              </Alan>

              <Alan
                id="availability"
                etiket="Müsaitlik"
                hata={errors.availability?.message}
                yardim="Örn. “Yeni projelere açığım”. Boş bırakılırsa gösterilmez."
              >
                {(b) => (
                  <Input id="availability" {...b} {...register('availability', BOS_ISE_YOK)} />
                )}
              </Alan>
            </div>

            <Alan
              id="bio"
              etiket="Biyografi"
              hata={errors.bio?.message}
              yardim="/hakkimda sayfasının giriş metni. Düz metin — MDX değil, biçimlendirme uygulanmaz."
            >
              {(b) => <Textarea id="bio" rows={8} {...b} {...register('bio')} />}
            </Alan>

            {/* ── SOSYAL BAĞLANTILAR ─────────────────────────────────────── */}
            <fieldset className="flex flex-col gap-3">
              <legend className="text-primary text-sm font-medium">Sosyal bağlantılar</legend>

              <p className="text-muted text-xs">
                Boş bıraktığın alan hiç kaydedilmez. Şemanın tanıdığı anahtarlar bunlar; serbest
                anahtar eklenemiyor, sunucu bilinmeyen bir anahtarı reddediyor.
              </p>

              <div className="grid gap-4 sm:grid-cols-2">
                {SOSYAL_ALANLAR.map(({ anahtar, etiket, tur, ipucu }) => (
                  <Alan
                    key={anahtar}
                    id={`socials-${anahtar}`}
                    etiket={etiket}
                    hata={errors.socials?.[anahtar]?.message}
                  >
                    {(b) => (
                      <Input
                        id={`socials-${anahtar}`}
                        type={tur}
                        placeholder={ipucu}
                        {...b}
                        {...register(`socials.${anahtar}`, BOS_ISE_YOK)}
                      />
                    )}
                  </Alan>
                ))}
              </div>
            </fieldset>
          </FormKabugu>
        </CardContent>
      </Card>

      <DosyaDurumu profil={profil} />
    </div>
  );
}

/**
 * AVATAR VE CV — DURUM BİLDİRİMİ, YÜKLEME DEĞİL.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * NE "YÜKLE" DÜĞMESİ NE DE "YAKINDA" SÖZÜ
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * R2 anahtarları yok (T-037), yani yükleme bugün YAPILAMAZ. İki kolay ve iki
 * yanlış seçenek vardı:
 *
 *   - Tıklayınca hiçbir şey olmayan "Yükle" düğmesi → T-018'in yasakladığı şey.
 *   - "Yakında" rozeti → tarihini bilmediğim bir söz; T-034'te panelde "410
 *     dönüyor" yazıp sonra ölçüp geri almak zorunda kaldığım hatanın aynısı.
 *
 * Seçtiğim üçüncü yol: KAYDIN BUGÜNKÜ HÂLİNİ ve ZİYARETÇİNİN NE GÖRDÜĞÜNÜ
 * söylemek. İkisi de doğrulanabilir olgu, söz değil. CV için `/cv` sayfasına
 * bağlantı veriyorum çünkü o sayfa GERÇEKTEN çalışıyor ve dosyaya bağlı değil
 * — yazar tıklayıp ziyaretçinin gördüğünü kendi gözüyle görebilir.
 *
 * Form bu alanları yine de GİZLİ olarak taşıyor: mevcut bir eklenti kimliğini
 * düşürmeden kaydedebilmek için.
 */
function DosyaDurumu({ profil }: { profil: ProfileDto }) {
  return (
    <Card>
      <CardContent className="flex flex-col gap-4">
        <CardTitle seviye="h2">Dosyalar</CardTitle>

        <div className="border-line bg-elevated/40 rounded-card flex items-start gap-3 border border-dashed p-4">
          <ImageOff className="text-muted mt-0.5 size-5 shrink-0" aria-hidden="true" />
          <div className="flex flex-col gap-1">
            <p className="text-primary text-sm font-medium">Avatar</p>
            <p className="text-muted text-sm">
              {profil.avatar
                ? `Bağlı bir görsel var (${profil.avatar.mime}). Kaydetmek onu düşürmez — kimliği gizli alanda taşınıyor.`
                : 'Bağlı bir görsel yok. Ana sayfa ve /hakkimda bugün token’lı yer tutucu çiziyor; düzen bir görsel bağlandığında da değişmeyecek.'}
            </p>
          </div>
        </div>

        <div className="border-line bg-elevated/40 rounded-card flex flex-col gap-3 border border-dashed p-4">
          <div className="flex items-start gap-3">
            <FileText className="text-muted mt-0.5 size-5 shrink-0" aria-hidden="true" />
            <div className="flex flex-col gap-1">
              <p className="text-primary text-sm font-medium">Özgeçmiş (PDF)</p>
              <p className="text-muted text-sm">
                {profil.cv
                  ? `Bağlı bir dosya var (${profil.cv.mime}). İmzalı indirme adresi henüz üretilmiyor, bu yüzden /hakkimda’daki indirme kutusu tıklanamaz duruyor.`
                  : 'Bağlı bir PDF yok. /hakkimda sayfasındaki indirme kutusu bu yüzden ziyaretçiyi yazdırılabilir CV sayfasına yönlendiriyor.'}
              </p>
            </div>
          </div>

          {/*
            GERÇEKTEN ÇALIŞAN tek eylem: yazarın ziyaretçinin gördüğünü görmesi.
            Yükleme yerine konan bir "sanki" değil — var olan bir sayfa.
          */}
          <Link
            href="/cv"
            target="_blank"
            rel="noopener noreferrer"
            className={buttonClasses({ variant: 'secondary', size: 'sm', className: 'self-start' })}
          >
            Yazdırılabilir CV sayfasını aç
          </Link>
        </div>

        <p className="text-muted text-xs">
          Dosya yükleme panelden henüz yapılamıyor: nesne deposu bağlanmadı. Bugün yapılabilen,
          bağlı bir dosya varsa onu korumak — yukarıdaki metinler kaydın gerçek hâlini gösteriyor.
        </p>
      </CardContent>
    </Card>
  );
}
