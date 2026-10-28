import { FolderOpen, FilterX } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';

import { filtreAdresi, ProjeFiltre } from '@/components/public/proje-filtre';
import { ProjeKartlari } from '@/components/public/proje-kartlari';
import { SayfaBasligi } from '@/components/public/tasarim/sayfa-basligi';
import { buttonClasses } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import type { Dil } from '@/i18n/diller';
import { dilAlternatifleri } from '@/i18n/meta';
import { yol } from '@/i18n/rotalar';
import { sozluk } from '@/i18n/sozluk';
import { getFilteredProjects, getPublishedProjects } from '@/server/services';

export function projelerMetadata(dil: Dil): Metadata {
  const m = sozluk(dil).sayfaBaslik.projeler;
  return { title: m.baslik, description: m.metaAciklama, ...dilAlternatifleri(dil, 'projeler') };
}

/** Tek değerli parametre okuma — dizi gelirse (`?etiket=a&etiket=b`) İLKİ geçerli. */
function tekDeger(deger: string | string[] | undefined): string | undefined {
  if (Array.isArray(deger)) return deger[0];
  return deger;
}

/** Listedeki tüm değerleri toplayıp alfabetik sıralar (Türkçe sıralama). */
function secenekler(listeler: string[][]): string[] {
  return [...new Set(listeler.flat())].sort((a, b) => a.localeCompare(b, 'tr'));
}

/**
 * /projeler — §4.1 liste + filtre.
 *
 * SUNUCU BİLEŞENİ, istemci bileşeni yok: filtre `<Link>`lerle çalışıyor
 * (gerekçe `proje-filtre.tsx`'te).
 *
 * İKİ OKUMA, TEK VERİTABANI İSTEĞİ: `getPublishedProjects` önbellekli tam
 * listeyi verir, `getFilteredProjects` de AYNI önbellek girdisini okuyup
 * bellekte süzer (ADR-032). Yani filtre seçenekleri için tam listeyi ayrıca
 * istemek bedava; seçeneklerin filtre uygulandıkça KAYBOLMAMASI da böylece
 * sağlanıyor — süzülmüş listeden türetilseydi ikinci bir filtre seçmek
 * imkânsızlaşırdı.
 *
 * `searchParams` Next 15'te Promise; bu sayfayı dinamik render'a çeker
 * (ADR-011 zaten kabul ediyor, okumalar önbellekli).
 */
export async function ProjelerSayfasi({
  dil,
  searchParams,
}: {
  dil: Dil;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const s = sozluk(dil);
  const parametreler = await searchParams;
  const etiket = tekDeger(parametreler.etiket);
  const teknoloji = tekDeger(parametreler.teknoloji);

  const [tumProjeler, projeler] = await Promise.all([
    getPublishedProjects(dil),
    getFilteredProjects({ tag: etiket, stack: teknoloji }, dil),
  ]);

  const etiketler = secenekler(tumProjeler.map((p) => p.tags));
  const teknolojiler = secenekler(tumProjeler.map((p) => p.stack));

  const filtreVar = Boolean(etiket || teknoloji);

  return (
    <>
      <SayfaBasligi
        baslik={s.sayfaBaslik.projeler.baslik}
        aciklama={s.sayfaBaslik.projeler.aciklama}
        ek={
          projeler.length > 0 && (
            <p className="tabular text-muted text-xs">
              {s.liste.projeSayisi(projeler.length, filtreVar)}
            </p>
          )
        }
      />

      <div className="mx-auto flex max-w-6xl flex-col gap-12 px-4 pb-32 md:px-8">
        <ProjeFiltre
          etiketler={etiketler}
          teknolojiler={teknolojiler}
          seciliEtiket={etiket}
          seciliTeknoloji={teknoloji}
          dil={dil}
          metin={{ tumu: s.liste.tumu, etiket: s.liste.etiket, teknoloji: s.liste.teknoloji }}
        />

        {projeler.length === 0 ? (
          /*
          İKİ FARKLI BOŞ DURUM, İKİ FARKLI SEBEP:
          - Filtre seçiliyken boş → seçim fazla dar. Çıkış yolu filtreyi
            temizlemek; ziyaretçiyi iletişime yollamak burada yanlış olurdu.
          - Hiç proje yokken boş → katalog henüz kurulmamış.
          Bilinmeyen etiket İLK duruma düşer ve 404 DÖNDÜRMEZ (ADR-019 tekil
          içerik için; boş filtre sonucu "yok olmuş içerik" değildir).
        */
          filtreVar ? (
            <EmptyState
              icon={FilterX}
              title={s.liste.bosSuzgecProje}
              description={s.liste.bosSuzgecProjeAciklama}
              action={
                <Link href={filtreAdresi({}, dil)} className={buttonClasses({ size: 'sm' })}>
                  {s.liste.suzgeciTemizle}
                </Link>
              }
            />
          ) : (
            <EmptyState
              icon={FolderOpen}
              title={s.liste.bosProje}
              description={s.liste.bosProjeAciklama}
              action={
                <Link href={yol(dil, 'iletisim')} className={buttonClasses({ size: 'sm' })}>
                  {s.liste.banaYaz}
                </Link>
              }
            />
          )
        ) : (
          // Sonuç sayısı `aria-live` DEĞİL: filtre bir sayfa gezinmesi; ekran okuyucu
          // yeni sayfayı zaten baştan duyuruyor (sayaç başlığın yanında).
          <ProjeKartlari dil={dil} projeler={projeler} baslikDuzeyi="h2" />
        )}
      </div>
    </>
  );
}
