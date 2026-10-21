import Link from 'next/link';

import { BolumGiris } from '@/components/public/bolum-giris';
import { ProjeYigini } from '@/components/public/proje-yigini';
import { gradyanSiniflari } from '@/components/public/tasarim/gradyan-baglanti';
import { KonturBaslik } from '@/components/public/tasarim/kontur-baslik';
import { SahnePaneli } from '@/components/public/tasarim/sahne-paneli';
import type { ProjectListItemDto } from '@/server/services/content-dto';

export type ProjelerProps = {
  projeler: ProjectListItemDto[];
};

/**
 * Ana sayfa proje bölümü — ADR-045. KOYU panel, açık hizmet panelinin
 * üstüne kayıyor; içinde yapışkan, üst üste yığılan kartlar (`ProjeYigini`).
 * Proje yoksa bölüm çizilmiyor.
 */
export function Projeler({ projeler }: ProjelerProps) {
  if (projeler.length === 0) return null;
  const sirali = [...projeler].sort((a, b) => a.order - b.order);

  return (
    <SahnePaneli ton="koyu" katman={20} id="projeler" aria-labelledby="projeler-baslik">
      <div className="mx-auto max-w-7xl px-4 pt-20 pb-24 md:px-8 md:pt-28 md:pb-32">
        <KonturBaslik
          id="projeler-baslik"
          metin="Projeler"
          className="text-center text-[clamp(2.5rem,11vw,10rem)]"
        />

        <div className="mt-14 md:mt-20">
          <ProjeYigini projeler={sirali} />
        </div>

        <BolumGiris className="mt-14 flex justify-center">
          <Link href="/projeler" className={gradyanSiniflari('md')}>
            Tüm projeler
          </Link>
        </BolumGiris>
      </div>
    </SahnePaneli>
  );
}
