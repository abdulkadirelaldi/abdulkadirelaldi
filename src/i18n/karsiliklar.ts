import { getPublishedPosts, getPublishedProjects } from '@/server/services';

import { DILLER, type Dil } from './diller';

/**
 * ADR-046 — bir proje/yazının DİLLERDEKİ karşılıkları: dil → slug.
 *
 * YENİ SORGU YOK: her dilin yayındaki listesi zaten önbellekte (ADR-011) ve
 * `translationKey` taşıyor; karşılık oradan bulunuyor. Yalnızca YAYINDAKİ
 * kayıtlar — taslak bir çeviriye hreflang ya da dil bağlantısı verilmez.
 *
 * Anahtarı olmayan kayıt yalnızca kendi dilinde vardır.
 */
export async function karsiliklar(
  tur: 'proje' | 'yazi',
  translationKey: string | null,
  kendi: { dil: Dil; slug: string },
): Promise<Partial<Record<Dil, string>>> {
  if (!translationKey) return { [kendi.dil]: kendi.slug };

  const listeler = await Promise.all(
    DILLER.map((d) => (tur === 'proje' ? getPublishedProjects(d) : getPublishedPosts(d))),
  );
  const sonuc: Partial<Record<Dil, string>> = {};
  DILLER.forEach((d, i) => {
    const bulunan = listeler[i]?.find((k) => k.translationKey === translationKey);
    if (bulunan) sonuc[d] = bulunan.slug;
  });
  sonuc[kendi.dil] ??= kendi.slug;
  return sonuc;
}
