'use client';

import { useRouter } from 'next/navigation';
import type * as z from 'zod';

import { Alan, BOS_ISE_YOK, SAYI_YA_DA_YOK, bosaltilanlariNullYap } from '@/components/panel/alan';
import { DilRozeti } from '@/components/panel/dil-sekmeleri';
import { icerikYolu, panelDili } from '@/components/panel/icerik-gorunumleri';
import { FormKabugu, usePanelForm } from '@/components/panel/panel-form';
import { KATEGORI_BASLIK } from '@/components/public/yetenek-kategori';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { VARSAYILAN_DIL, type Dil } from '@/i18n/diller';
import { createSkillSchema, type CreateSkillInput } from '@/lib/schemas/skill';
import { createSkillAction, updateSkillAction } from '@/server/actions/skill';
import type { SkillDto } from '@/server/services/content-dto';
import { SkillCategory } from '@/types';

/**
 * YETENEK FORMU — yeni kayıt ve düzenleme, TEK bileşen (`DeneyimFormu` kalıbı).
 *
 * `Skill`te de DURUM YOK: profil bileşeni, içerik değil — kaydedilen her şey
 * sitede görünür. Taslak/yayın seçeneği eklemek olmayan bir kavramı arayüze
 * icat etmek olurdu.
 *
 * `level` SİTEDE GÖSTERİLMİYOR — ne ana sayfadaki kartlar ne `/cv` onu basıyor;
 * public sıra `order`dan geliyor. Alan yine de zorunlu (şema, ADR-020) ve
 * yardım metni bunu açıkça söylüyor: kullanıcı "%70" yazıp sitede çubuk
 * aramasın.
 *
 * `iconKey` boşaltılırsa SİLİNİR (`bosaltilanlariNullYap`); kısmi şema
 * `undefined`ı "dokunma" okuduğu için aksi hâlde eski anahtar sessizce kalırdı.
 */

type YetenekFormGirdi = z.input<typeof createSkillSchema>;

/** Seçim listesinin sırası = sitedeki grup sırası (`KATEGORI_BASLIK`ın sırası). */
const KATEGORILER = Object.keys(KATEGORI_BASLIK) as SkillCategory[];

const BOS_FORM: YetenekFormGirdi = {
  locale: 'tr',
  name: '',
  category: SkillCategory.FRONTEND,
  level: 50,
  iconKey: '',
  order: 0,
};

function baslangicDegerleri(
  kayit: SkillDto | undefined,
  dil: Dil = VARSAYILAN_DIL,
): YetenekFormGirdi {
  /* Yeni kayıt listenin SEÇİLİ dilinde açılır (`?dil=`, ADR-046); düzenlemede kaydın kendi dili. */
  if (!kayit) return { ...BOS_FORM, locale: dil };

  return {
    locale: kayit.locale,
    name: kayit.name,
    category: kayit.category,
    level: kayit.level,
    iconKey: kayit.iconKey ?? '',
    order: kayit.order,
  };
}

export function YetenekFormu({
  kayit,
  dil = VARSAYILAN_DIL,
}: {
  kayit?: SkillDto;
  /** Yeni kayıtta dil — sayfa `?dil=`den okuyor. Düzenlemede yok sayılır. */
  dil?: Dil;
}) {
  const router = useRouter();
  const duzenleme = kayit !== undefined;
  /* Liste aynı dilde açılsın — İngilizce kaydı kaydedip Türkçe listeye düşmek kaybolmuş hissi verir. */
  const listeYolu = icerikYolu('/panel/icerik/yetenekler', {
    dil: kayit ? panelDili(kayit.locale) : dil,
  });

  const kaydet = async (degerler: CreateSkillInput) => {
    const sonuc = kayit
      ? await updateSkillAction({
          ...bosaltilanlariNullYap(degerler, kayit, ['iconKey']),
          id: kayit.id,
        })
      : await createSkillAction(degerler);

    if (sonuc.ok) {
      router.refresh();
      if (!kayit) router.push(listeYolu);
    }

    return sonuc;
  };

  const { form, durum, formHatasi, gonder } = usePanelForm<YetenekFormGirdi, CreateSkillInput>({
    sema: createSkillSchema,
    varsayilanDegerler: baslangicDegerleri(kayit, dil),
    kaydet,
    temizle: false,
    /* Gizli input — mesajı yutmasın diye bildiriliyor (T-041f/T-043f dersi). */
    gorunmezAlanlar: ['locale'],
  });

  const {
    register,
    formState: { errors },
  } = form;

  return (
    <Card>
      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <CardTitle seviye="h2">{duzenleme ? 'Yeteneği düzenle' : 'Yeni yetenek'}</CardTitle>
          {/* Dil SALT OKUNUR: var olan satırın dilini değiştirmek desteklenen bir işlem değil. */}
          <DilRozeti dil={kayit?.locale ?? dil} />
        </div>

        <FormKabugu
          gonder={gonder}
          durum={durum}
          formHatasi={formHatasi}
          basariMetni={duzenleme ? 'Yetenek güncellendi.' : 'Yetenek eklendi.'}
          gonderEtiketi={duzenleme ? 'Kaydet' : 'Ekle'}
        >
          <input type="hidden" {...register('locale')} />

          <div className="grid gap-4 sm:grid-cols-2">
            <Alan id="name" etiket="Ad" hata={errors.name?.message}>
              {(b) => <Input id="name" {...b} {...register('name')} />}
            </Alan>

            <Alan id="category" etiket="Kategori" hata={errors.category?.message}>
              {(b) => (
                <select
                  id="category"
                  className="focus-ring rounded-input border-line-strong bg-elevated text-primary h-11 w-full border px-3 text-sm"
                  {...b}
                  {...register('category')}
                >
                  {KATEGORILER.map((k) => (
                    <option key={k} value={k}>
                      {KATEGORI_BASLIK[k]}
                    </option>
                  ))}
                </select>
              )}
            </Alan>

            <Alan
              id="level"
              etiket="Seviye (0–100)"
              hata={errors.level?.message}
              yardim="Sitede gösterilmez; yalnızca kendi değerlendirmen ve paneldeki sıralama için."
            >
              {/* §3.2 — sayısal alan sekmeli rakamla yazılır. */}
              {(b) => (
                <Input
                  id="level"
                  type="number"
                  inputMode="numeric"
                  min={0}
                  max={100}
                  className="tabular"
                  {...b}
                  {...register('level', SAYI_YA_DA_YOK)}
                />
              )}
            </Alan>

            <Alan
              id="order"
              etiket="Sıra"
              hata={errors.order?.message}
              yardim="Küçük sayı önce gelir — sitedeki sıra buradan."
            >
              {(b) => (
                <Input
                  id="order"
                  type="number"
                  inputMode="numeric"
                  className="tabular"
                  {...b}
                  {...register('order', SAYI_YA_DA_YOK)}
                />
              )}
            </Alan>

            <Alan
              id="iconKey"
              etiket="Simge anahtarı (isteğe bağlı)"
              hata={errors.iconKey?.message}
              yardim="Boş bırakılabilir; boşaltırsan kayıtlı anahtar silinir."
            >
              {(b) => <Input id="iconKey" {...b} {...register('iconKey', BOS_ISE_YOK)} />}
            </Alan>
          </div>
        </FormKabugu>

        <Button
          variant="ghost"
          size="sm"
          className="self-start"
          onClick={() => router.push(listeYolu)}
        >
          Listeye dön
        </Button>
      </CardContent>
    </Card>
  );
}
