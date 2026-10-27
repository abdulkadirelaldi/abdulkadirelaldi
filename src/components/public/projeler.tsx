import Link from 'next/link';

import { ProjeKartlari } from '@/components/public/proje-kartlari';
import { Bolum } from '@/components/public/tasarim/bolum';
import type { Dil } from '@/i18n/diller';
import { yol } from '@/i18n/rotalar';
import { sozluk } from '@/i18n/sozluk';
import type { ProjectListItemDto } from '@/server/services/content-dto';

export type ProjelerProps = {
  dil: Dil;
  projeler: ProjectListItemDto[];
};

/**
 * Ana sayfa "Projeler" — öne çıkan projeler iki sütun ızgarada (`ProjeKartlari`).
 */
export function Projeler({ dil, projeler }: ProjelerProps) {
  const s = sozluk(dil).projelerBolum;
  if (projeler.length === 0) return null;
  const sirali = [...projeler].sort((a, b) => a.order - b.order);

  return (
    <Bolum
      id="projeler"
      baslik={s.baslik}
      ek={
        <Link
          href={yol(dil, 'projeler')}
          className="focus-ring rounded-btn text-accent hover:text-accent-hover text-sm font-medium"
        >
          {s.tumu} →
        </Link>
      }
    >
      <ProjeKartlari dil={dil} projeler={sirali} />
    </Bolum>
  );
}
