import { FolderOpen, FilterX } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';

import { filtreAdresi, ProjeFiltre } from '@/components/public/proje-filtre';
import { ProjeKarti } from '@/components/public/proje-karti';
import { buttonClasses } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { getFilteredProjects, getPublishedProjects } from '@/server/services';

export const metadata: Metadata = {
  title: 'Projeler',
  description:
    'Ürettiğim işler: kurumsal siteler, web uygulamaları ve paneller. Etikete ve kullanılan teknolojiye göre süzebilirsin.',
};

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
export default async function ProjelerSayfasi({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const parametreler = await searchParams;
  const etiket = tekDeger(parametreler.etiket);
  const teknoloji = tekDeger(parametreler.teknoloji);

  const [tumProjeler, projeler] = await Promise.all([
    getPublishedProjects(),
    getFilteredProjects({ tag: etiket, stack: teknoloji }),
  ]);

  const etiketler = secenekler(tumProjeler.map((p) => p.tags));
  const teknolojiler = secenekler(tumProjeler.map((p) => p.stack));

  const filtreVar = Boolean(etiket || teknoloji);

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-10 px-4 py-16 md:py-24">
      <header className="flex flex-col gap-4">
        <p className="tabular text-accent-soft text-xs tracking-wider uppercase">Projeler</p>
        <h1 className="text-3xl md:text-5xl">Öne çıkan işler</h1>
        <p className="text-body max-w-2xl text-lg">
          Kurumsal siteler, web uygulamaları ve paneller. Etikete veya kullanılan teknolojiye göre
          süzebilirsin.
        </p>
      </header>

      <ProjeFiltre
        etiketler={etiketler}
        teknolojiler={teknolojiler}
        seciliEtiket={etiket}
        seciliTeknoloji={teknoloji}
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
            title="Bu süzgece uyan proje yok"
            description="Seçtiğin etiket ve teknoloji birleşimiyle eşleşen bir iş bulunmuyor. Süzgeci temizleyip tümüne bakabilirsin."
            action={
              <Link href={filtreAdresi({})} className={buttonClasses({ size: 'sm' })}>
                Süzgeci temizle
              </Link>
            }
          />
        ) : (
          <EmptyState
            icon={FolderOpen}
            title="Vitrin hazırlanıyor"
            description="İlk projeler çok yakında burada olacak. Bu arada nasıl çalıştığımı konuşalım."
            action={
              <Link href="/iletisim" className={buttonClasses({ size: 'sm' })}>
                Bana yaz
              </Link>
            }
          />
        )
      ) : (
        <>
          {/*
            Sonuç sayısı `aria-live` DEĞİL: filtre bir sayfa gezinmesi, bir
            içerik güncellemesi değil — ekran okuyucu yeni sayfayı zaten
            baştan duyuruyor. `aria-live` burada çifte duyuru üretirdi.
          */}
          <p className="text-muted text-sm">
            <span className="tabular">{projeler.length}</span> proje
            {filtreVar && ' (süzülmüş)'}
          </p>

          <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {projeler.map((proje) => (
              <li key={proje.id}>
                <ProjeKarti proje={proje} />
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
