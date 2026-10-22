'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import type * as z from 'zod';

import { Alan, BOS_ISE_YOK } from '@/components/panel/alan';
import { DilRozeti } from '@/components/panel/dil-sekmeleri';
import { DosyaYukleyici } from '@/components/panel/dosya-yukleyici';
import { FormKabugu, usePanelForm } from '@/components/panel/panel-form';
import { KapakGorsel } from '@/components/public/kapak-gorsel';
import { buttonClasses } from '@/components/ui/button';
import { Card, CardContent, CardTitle } from '@/components/ui/card';
import { Input, Textarea } from '@/components/ui/input';
import type { Dil } from '@/i18n/diller';
import { yol } from '@/i18n/rotalar';
import { dosyaAdresi } from '@/lib/dosya-adresi';
import { updateProfileSchema } from '@/lib/schemas/profile';
import { saveProfileAction } from '@/server/actions/profile';
import type { AttachmentDto } from '@/server/services/attachment';
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
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * DİL SEKMELERİ (ADR-046) — `profil` `null` OLABİLİR
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * İngilizce/Almanca satır henüz yazılmamışsa form BOŞ başlıyor ve `locale`
 * sekmenin dili; ilk "Kaydet" satırı açıyor (`upsert`). Türkçe metni ön
 * doldurmak bilinçli olarak YAPILMADI: kullanıcı yarısını çevirip kaydederse
 * İngilizce profilde Türkçe cümleler kalırdı ve bunu fark ettirecek hiçbir şey
 * olmazdı.
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

export function baslangicDegerleri(profil: ProfileDto | null, dil: Dil): ProfilFormGirdi {
  /* Bu dilde henüz satır yok — boş form, ilk kayıt açar (yukarıdaki nota bakınız). */
  if (!profil) return { locale: dil, headline: '', bio: '', socials: {} };

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

export function ProfilFormu({ profil, dil }: { profil: ProfileDto | null; dil: Dil }) {
  const router = useRouter();

  const kaydet = async (degerler: ProfilFormGirdi) => {
    const sonuc = await saveProfileAction(degerler);
    if (sonuc.ok) router.refresh();
    return sonuc;
  };

  const { form, durum, formHatasi, gonder } = usePanelForm<ProfilFormGirdi>({
    sema: updateProfileSchema,
    varsayilanDegerler: baslangicDegerleri(profil, dil),
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
          <div className="flex flex-wrap items-center gap-2">
            <CardTitle seviye="h2">Profil</CardTitle>
            <DilRozeti dil={profil?.locale ?? dil} />
          </div>

          {!profil && (
            <p role="status" className="text-muted text-sm">
              Bu dilde henüz profil yok. Doldurup kaydettiğinde oluşturulur.
            </p>
          )}

          <FormKabugu
            gonder={gonder}
            durum={durum}
            formHatasi={formHatasi}
            basariMetni={`Kaydedildi. Değişiklikler bu dilin ana sayfasında ve ${yol(dil, 'hakkimda')} sayfasında görünüyor.`}
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

      {profil ? (
        <DosyaDurumu
          profil={profil}
          dil={dil}
          onAvatar={(dosya) => form.setValue('avatarAttachmentId', dosya.id, { shouldDirty: true })}
          onCv={(dosya) => form.setValue('cvAttachmentId', dosya.id, { shouldDirty: true })}
        />
      ) : (
        /*
          Yükleme dosyayı profil SATIRININ havuzuna koyuyor (`entityId`); satır
          yokken bağlanacak bir kimlik de yok. Ölü bir düğme yerine sırayı söyle.
        */
        <Card>
          <CardContent className="flex flex-col gap-2">
            <CardTitle seviye="h2">Dosyalar</CardTitle>
            <p className="text-muted text-sm">
              Avatar ve CV bu dilin profil kaydına bağlanıyor. Önce profili kaydet, sonra
              yükleyebilirsin.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

/**
 * AVATAR VE CV — YÜKLEME (T-037f, ADR-044).
 *
 * T-036b'de burası bilinçli olarak yalnızca DURUM bildiriyordu: R2 bağlı
 * değildi ve ne ölü bir "Yükle" düğmesi ne tarihsiz bir "yakında" sözü
 * istendi. Yükleme artık gerçek; ilke aynı kaldı — ekran yalnızca DOĞRU olanı
 * söylüyor.
 *
 * Yüklemek BAĞLAMAK değil: dosya profilin havuzuna girer, avatar/CV olması
 * formun KAYDIYLA olur (`onAvatar`/`onCv` formun gizli alanlarını dolduruyor).
 * Böylece değişiklik formun geri kalanıyla tek kayıtta ve tek denetim satırında.
 */
function DosyaDurumu({
  profil,
  dil,
  onAvatar,
  onCv,
}: {
  profil: ProfileDto;
  dil: Dil;
  onAvatar: (dosya: AttachmentDto) => void;
  onCv: (dosya: AttachmentDto) => void;
}) {
  const [avatar, setAvatar] = useState(profil.avatar);
  const [cv, setCv] = useState(profil.cv);
  const bekleyen = avatar?.id !== profil.avatar?.id || cv?.id !== profil.cv?.id;

  return (
    <Card>
      <CardContent className="flex flex-col gap-5">
        <CardTitle seviye="h2">Dosyalar</CardTitle>

        <section aria-labelledby="avatar-baslik" className="flex flex-col gap-3">
          <h3 id="avatar-baslik" className="text-primary text-sm font-medium">
            Avatar
          </h3>
          {avatar ? (
            <div className="w-32">
              <KapakGorsel kapak={avatar} baslik="Avatar" className="rounded-full" />
            </div>
          ) : (
            <p className="text-muted text-sm">Bağlı bir görsel yok.</p>
          )}
          <DosyaYukleyici
            entity="PROFILE"
            entityId={profil.id}
            tur="gorsel"
            etiket={avatar ? 'Avatarı değiştir' : 'Avatar yükle'}
            onYuklendi={(dosya) => {
              setAvatar({
                id: dosya.id,
                key: dosya.key,
                mime: dosya.mime,
                width: dosya.width,
                height: dosya.height,
              });
              onAvatar(dosya);
            }}
          />
        </section>

        <section aria-labelledby="cv-baslik" className="flex flex-col gap-3">
          <h3 id="cv-baslik" className="text-primary text-sm font-medium">
            Özgeçmiş (PDF)
          </h3>
          <p className="text-muted text-sm">
            {cv ? (
              <>
                Bağlı bir PDF var.{' '}
                <a
                  href={dosyaAdresi(cv.id)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="link focus-ring rounded"
                >
                  Dosyayı aç
                </a>
              </>
            ) : (
              'Bağlı bir PDF yok — /hakkimda ziyaretçiyi yazdırılabilir CV sayfasına yönlendiriyor.'
            )}
          </p>
          <DosyaYukleyici
            entity="PROFILE"
            entityId={profil.id}
            tur="pdf"
            etiket={cv ? 'CV’yi değiştir' : 'CV yükle'}
            onYuklendi={(dosya) => {
              setCv({
                id: dosya.id,
                key: dosya.key,
                mime: dosya.mime,
                width: dosya.width,
                height: dosya.height,
              });
              onCv(dosya);
            }}
          />
          <Link
            href={yol(dil, 'cv')}
            target="_blank"
            rel="noopener noreferrer"
            className={buttonClasses({ variant: 'secondary', size: 'sm', className: 'self-start' })}
          >
            Yazdırılabilir CV sayfasını aç
          </Link>
        </section>

        {bekleyen && (
          <p role="status" className="text-warning text-sm">
            Yeni dosya yüklendi — profil formunu <span className="font-medium">kaydedince</span>{' '}
            geçerli olur.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
