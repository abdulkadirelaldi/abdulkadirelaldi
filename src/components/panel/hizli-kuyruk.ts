/**
 * ÇEVRİMDIŞI KUYRUK (2026-10-31) — bağlantı yokken girilen hızlı kayıtlar.
 *
 * `localStorage`da yalnızca GÖNDERİLENE KADAR durur; gönderilince silinir.
 * Depo erişilemezse (gizli sekme) kayıt tutulamaz ve sessizce atlanmaz:
 * `kuyrugaEkle` `false` döner. Saf çekirdek (`kuyruguIsle`) depodan bağımsız.
 */

export type KuyrukTuru = 'harcama' | 'kilo' | 'su' | 'uyku';

export interface KuyrukKaydi {
  id: string;
  tur: KuyrukTuru;
  girdi: Record<string, unknown>;
}

/** `tamam` gönderildi · `red` sunucu kabul etmiyor, yeniden denemek boşuna · `bekle` sonra dene. */
export type GonderimSonucu = 'tamam' | 'red' | 'bekle';

const ANAHTAR = 'ae-hizli-kuyruk';
export const KUYRUK_OLAYI = 'ae-kuyruk-degisti';

const GUN = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Istanbul' });
/** İstanbul günü `YYYY-MM-DD` — kayıt GİRİLDİĞİ güne yazılsın (ADR-016). */
export const istanbulGunu = (simdi: Date = new Date()): string => GUN.format(simdi);

export function kuyruguOku(): KuyrukKaydi[] {
  try {
    const ham = window.localStorage.getItem(ANAHTAR);
    const veri: unknown = ham ? JSON.parse(ham) : [];
    return Array.isArray(veri) ? (veri as KuyrukKaydi[]) : [];
  } catch {
    return [];
  }
}

function yaz(kayitlar: KuyrukKaydi[]): boolean {
  try {
    if (kayitlar.length === 0) window.localStorage.removeItem(ANAHTAR);
    else window.localStorage.setItem(ANAHTAR, JSON.stringify(kayitlar));
    window.dispatchEvent(new Event(KUYRUK_OLAYI));
    return true;
  } catch {
    return false;
  }
}

export function kuyrugaEkle(tur: KuyrukTuru, girdi: Record<string, unknown>): boolean {
  return yaz([...kuyruguOku(), { id: crypto.randomUUID(), tur, girdi }]);
}

export const kuyruguYaz = yaz;

/**
 * Sırayla gönderir; ilk `bekle`de durur (ağ yine yok). Dönen: kalanlar ve kaç
 * kaydın reddedildiği. Fırlatan gönderici `bekle` sayılır. SAF.
 */
export async function kuyruguIsle(
  kayitlar: readonly KuyrukKaydi[],
  gonder: (k: KuyrukKaydi) => Promise<GonderimSonucu>,
): Promise<{ kalan: KuyrukKaydi[]; gonderilen: number; reddedilen: number }> {
  let gonderilen = 0;
  let reddedilen = 0;
  for (let i = 0; i < kayitlar.length; i += 1) {
    const kayit = kayitlar[i] as KuyrukKaydi;
    const sonuc = await gonder(kayit).catch((): GonderimSonucu => 'bekle');
    if (sonuc === 'bekle') return { kalan: kayitlar.slice(i), gonderilen, reddedilen };
    if (sonuc === 'tamam') gonderilen += 1;
    else reddedilen += 1;
  }
  return { kalan: [], gonderilen, reddedilen };
}
