import { existsSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Projenin STATİK kapağı — `public/kapak/<çeviri-anahtarı>.webp` (2026-10-23).
 *
 * NEDEN: kapaklar panelden yükleniyor ve yükleme R2 istiyor; R2 kurulana dek
 * bütün proje kartları boş yer tutucu gösteriyordu. Canlı sitelerin kapakları
 * sitenin KENDİSİNDEN alınan ekran görüntüsü, diğerleri projenin kendi
 * görselleri. Panelden yüklenen kapak HER ZAMAN önceliklidir — bu yalnızca
 * yedek.
 *
 * ANAHTAR çeviri anahtarı (Türkçe slug): üç dil aynı görseli kullanır.
 * Klasör MODÜL YÜKLENİRKEN bir kez okunur (yalnızca dağıtımla değişir);
 * `v` değişme anı — `public/` görselleri 7 gün önbellekte.
 */
const KLASOR = join(process.cwd(), 'public', 'kapak');

const KAPAKLAR: ReadonlyMap<string, string> = new Map(
  existsSync(KLASOR)
    ? readdirSync(KLASOR)
        .filter((ad) => ad.endsWith('.webp'))
        .map((ad) => [
          ad.slice(0, -'.webp'.length),
          `/kapak/${ad}?v=${Math.floor(statSync(join(KLASOR, ad)).mtimeMs)}`,
        ])
    : [],
);

export function statikKapak(proje: { translationKey: string | null; slug: string }): string | null {
  return KAPAKLAR.get(proje.translationKey ?? proje.slug) ?? null;
}
