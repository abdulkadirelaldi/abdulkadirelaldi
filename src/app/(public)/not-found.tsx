import type { Metadata } from 'next';
import { headers } from 'next/headers';

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

/** Public sayfaların içinden çağrılan `notFound()` — ör. bilinmeyen proje slug'ı. */
export default async function PublicBulunamadi() {
  return <Bulunamadi dil={await istekDili()} />;
}
