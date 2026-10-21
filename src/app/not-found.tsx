import type { Metadata } from 'next';
import { headers } from 'next/headers';

import PublicLayout from '@/app/(public)/layout';
import { Bulunamadi } from '@/components/public/bulunamadi';
import { DIL_BASLIGI, dilMi, VARSAYILAN_DIL, type Dil } from '@/i18n/diller';
import { sozluk } from '@/i18n/sozluk';

/** Dil middleware'in başlığından (ADR-046) — 404'ün `[dil]` parametresi yok. */
async function istekDili(): Promise<Dil> {
  const d = (await headers()).get(DIL_BASLIGI);
  return dilMi(d) ? d : VARSAYILAN_DIL;
}

export async function generateMetadata(): Promise<Metadata> {
  return { title: sozluk(await istekDili()).bulunamadi.metaBaslik, robots: { index: false } };
}

/**
 * Hiçbir rotaya uymayan adres. Kök seviyede yalnızca kök layout var; public
 * layout'u (gezinme, alt bilgi, koyu sahne, Archivo) burada AÇIKÇA sarıyoruz —
 * yoksa 404 sitenin geri kalanından kopuk, çıplak bir sayfa olurdu.
 */
export default async function KokBulunamadi() {
  return (
    <PublicLayout>
      <Bulunamadi dil={await istekDili()} />
    </PublicLayout>
  );
}
