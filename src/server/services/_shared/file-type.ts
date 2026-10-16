/**
 * DOSYA TİPİ VE BOYUT TESPİTİ — §8.11, T-037.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ UZANTI DEĞİL, `Content-Type` DEĞİL — İÇERİK
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * `Content-Type` başlığı ve dosya adı ZİYARETÇİ GİRDİSİDİR. Bir yürütülebilir
 * dosya `image/png` diye bildirilebilir ve `.png` uzantısı alabilir. Tek
 * güvenilir kaynak BAYTLARIN KENDİSİ.
 *
 * ÖLÇÜLDÜ (T-037, gerçek dosyalarla):
 *   gerçek PNG                        → image/png  ✓
 *   rastgele 12 bayt                  → null       ✓
 *   "image/png bu bir yalan" metni    → null       ✓  ← başlık yalanı tutmuyor
 *
 * Bu modül SAF: `node:crypto` bile içe aktarmıyor, yalnızca `Buffer` okuyor.
 * Dolayısıyla ortam değişkeni olmadan, R2 olmadan, DB olmadan sınanabiliyor.
 *
 * ───────────────────────────────────────────────────────────────────────────
 * ⚠️ SVG'NİN SİHİRLİ BAYTI YOK — VE BU ÖLÇÜLDÜ
 * ───────────────────────────────────────────────────────────────────────────
 *
 * SVG bir METİN biçimi: `<?xml`, `<!DOCTYPE`, bir YORUM ya da sade boşlukla
 * başlayabilir. Bu projenin KENDİ `src/app/icon.svg`i bir XML YORUMUYLA
 * başlıyor (`<!--\n  Site simgesi…`), yani naif bir `startsWith('<svg')`
 * kontrolü MEŞRU BİR SVG'Yİ REDDEDİYOR — ölçtüm.
 *
 * Bu yüzden SVG tespiti "ilk N baytta bir `<svg` ETİKETİ var mı" biçiminde
 * yapılıyor ve DOĞASI GEREĞİ sezgisel kalıyor. Sonucu raporladım: SVG,
 * `ALLOWED_MIME_TYPES` içinde içerikten güvenilir biçimde DOĞRULANAMAYAN tek
 * tip, ve ayrıca betik çalıştırabilen tek tip. İkisi birlikte onu listedeki
 * diğerlerinden ayırıyor.
 */

/**
 * İKİLİ imzalar için okunması yeterli ön kısım — hepsi ilk 12 baytta.
 */
export const SNIFF_BYTES = 512;

/**
 * SVG taraması için pencere — İKİLİ İMZALARDAN ÇOK DAHA GENİŞ, ve sebebi ölçüldü.
 *
 * ⚠️ 512 BAYT YETMİYOR VE BUNU BU PROJENİN KENDİ DOSYASI GÖSTERDİ:
 * `src/app/icon.svg` bir XML yorumuyla başlıyor ve `<svg` etiketi **514.
 * baytta** — pencerenin iki bayt ötesinde. İlk uygulamam o dosyayı SVG olarak
 * tanımıyordu.
 *
 * İkili biçimlerin imzası sabit ofsette (en fazla 12. bayt), yani onlar için
 * küçük pencere yeterli. SVG bir METİN biçimi: önünde yorum, `<?xml`
 * bildirimi, DOCTYPE ve boşluk olabilir ve uzunluğu sınırsız. Dört kilobayt,
 * gerçekçi her başlangıç için fazlasıyla geniş; sınırsız taramak ise 10 MB'lık
 * bir dosyanın tamamını dizeye çevirmek olurdu.
 */
export const SVG_SCAN_BYTES = 4096;

/** `ALLOWED_MIME_TYPES` ile birebir aynı küme (`schemas/attachment.ts`). */
export type SniffedMime =
  'image/jpeg' | 'image/png' | 'image/webp' | 'image/avif' | 'image/svg+xml' | 'application/pdf';

function startsWith(buf: Buffer, ...bytes: number[]): boolean {
  return bytes.every((value, index) => buf[index] === value);
}

/**
 * Baytlardan gerçek MIME tipini çıkarır. Tanınmazsa `null`.
 *
 * SIRA ÖNEMLİ: ikili biçimler ÖNCE, metin tabanlı SVG EN SONDA. SVG kontrolü
 * bir dize taraması olduğu için bir ikili dosyanın içinde tesadüfen `<svg`
 * geçmesi mümkün; ikili imzalar önce denenerek o yanlış pozitif kapatılıyor.
 */
export function sniffMime(buf: Buffer): SniffedMime | null {
  // PNG: 8 baytlık sabit imza.
  if (startsWith(buf, 0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a)) return 'image/png';

  // JPEG: SOI (`FF D8 FF`).
  if (startsWith(buf, 0xff, 0xd8, 0xff)) return 'image/jpeg';

  // WebP: RIFF kabı + 8..12 arasında 'WEBP'.
  if (startsWith(buf, 0x52, 0x49, 0x46, 0x46) && buf.toString('ascii', 8, 12) === 'WEBP') {
    return 'image/webp';
  }

  // AVIF: ISOBMFF `ftyp` kutusu + 'avif'/'avis' markası.
  if (buf.toString('ascii', 4, 8) === 'ftyp') {
    const marka = buf.toString('ascii', 8, 12);
    return marka === 'avif' || marka === 'avis' ? 'image/avif' : null;
  }

  // PDF: `%PDF`.
  if (startsWith(buf, 0x25, 0x50, 0x44, 0x46)) return 'application/pdf';

  /*
   * SVG — SEZGİSEL, ve bu kabul edilmiş bir sınır (gerekçe dosya başında).
   * Yorum/bildirim/DOCTYPE ile başlayabildiği için `<svg` etiketi ilk
   * `SNIFF_BYTES` içinde ARANIYOR, başta olması şart değil.
   */
  const bas = buf.toString('utf8', 0, SVG_SCAN_BYTES);
  if (/<svg[\s>]/i.test(bas)) return 'image/svg+xml';

  return null;
}

/* ===========================================================================
 * BOYUT — PNG / JPEG / WebP. AVIF ve SVG `null`.
 * ======================================================================== */

export interface ImageDimensions {
  width: number;
  height: number;
}

/**
 * Görsel boyutlarını BAŞLIKTAN okur. Okunamıyorsa `null`.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ AVIF VE SVG BİLEREK DESTEKLENMİYOR — KULLANICI ONAYLI KARAR (T-037)
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * AVIF boyutu ISOBMFF kutu ağacında (`ftyp → meta → iprp → ipco → ispe`) ve
 * depoda SINANACAK GERÇEK BİR AVIF DOSYASI YOK. Sınanmayan bir ayrıştırıcı
 * yazmak, bu projenin tekrar tekrar reddettiği şey — özellikle ziyaretçi
 * baytlarını gezen bir ayrıştırıcıda.
 *
 * SVG'nin İÇSEL RASTER ÖLÇÜSÜ zaten olmayabilir: `width`/`height` yüzde
 * olabilir ya da hiç bulunmayabilir, yalnızca `viewBox` olabilir.
 *
 * SONUÇ: ikisinde de `width`/`height` `null` kalıyor ve ŞEMA BUNA ZATEN İZİN
 * VERİYOR (`Int?`). Bedeli kayıtlı: AVIF yüklenirse `next/image` boyutu
 * bilmiyor ve o formatta CLS riski sürüyor. Bir bağımlılık (`image-size`)
 * bunu çözerdi; karar kullanıcının ve "sıfır bağımlılık, sınanmayan kod yok"
 * seçildi.
 */
export function readImageDimensions(buf: Buffer, mime: SniffedMime): ImageDimensions | null {
  switch (mime) {
    case 'image/png':
      return readPngDimensions(buf);
    case 'image/jpeg':
      return readJpegDimensions(buf);
    case 'image/webp':
      return readWebpDimensions(buf);
    // ⚠️ `default` YOK: yeni bir MIME eklenirse `tsc` burayı eksik bulup kırar.
    case 'image/avif':
    case 'image/svg+xml':
    case 'application/pdf':
      return null;
  }
}

/** PNG: IHDR SABİT OFSETTE — genişlik 16, yükseklik 20 (big-endian uint32). */
function readPngDimensions(buf: Buffer): ImageDimensions | null {
  if (buf.length < 24) return null;
  // IHDR ilk yığın olmak ZORUNDA (PNG spesifikasyonu), bu yüzden ofset sabit.
  if (buf.toString('ascii', 12, 16) !== 'IHDR') return null;

  return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
}

/**
 * JPEG: SOF yığınını ARAYARAK — sabit ofset YOK.
 *
 * JPEG değişken uzunlukta yığınlardan oluşuyor; boyut `SOFn` (0xC0–0xCF,
 * `C4`/`C8`/`CC` HARİÇ — onlar Huffman/aritmetik tabloları) içinde. Bu yüzden
 * yığın zinciri yürünüyor.
 */
function readJpegDimensions(buf: Buffer): ImageDimensions | null {
  let ofset = 2; // SOI'den sonra

  /*
   * ⚠️ SINIR `ofset + 8` — İLK YAZDIĞIMDA `ofset + 9` YAZDIM VE YANLIŞTI.
   *
   * SOF yığınının okunan en son baytı `ofset + 8`; `+ 9` istemek, SOF dosyanın
   * TAM SONUNDA olduğunda döngünün hiç girmemesine yol açıyordu ve geçerli bir
   * JPEG `null` dönüyordu. Ölçüldü: 19 baytlık geçerli bir JPEG'de SOF ofseti
   * 10, son bayt indeksi 18 → `10 + 9 < 19` **false**, döngü çıkıyor.
   */
  while (ofset + 8 < buf.length) {
    if (buf[ofset] !== 0xff) {
      // Hizalama bozulduysa devam etmek rastgele bayt okumak olur.
      return null;
    }

    const marker = buf[ofset + 1];
    if (marker === undefined) return null;

    // SOF0–SOF15, tablo işaretçileri hariç.
    const sofMu = marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker);
    if (sofMu) {
      // Yığın: [FF Mn] [uzunluk:2] [hassasiyet:1] [yükseklik:2] [genişlik:2]
      return { height: buf.readUInt16BE(ofset + 5), width: buf.readUInt16BE(ofset + 7) };
    }

    const uzunluk = buf.readUInt16BE(ofset + 2);
    // Sıfır/negatif uzunluk sonsuz döngü üretirdi.
    if (uzunluk < 2) return null;
    ofset += 2 + uzunluk;
  }

  return null;
}

/**
 * WebP: ÜÇ ALT BİÇİM ve üçü farklı yerde boyut taşıyor.
 *
 * `VP8 ` (kayıplı) · `VP8L` (kayıpsız) · `VP8X` (genişletilmiş). Tek bir ofset
 * varsaymak üç biçimden ikisinde yanlış sayı okurdu.
 */
function readWebpDimensions(buf: Buffer): ImageDimensions | null {
  if (buf.length < 30) return null;
  const altBicim = buf.toString('ascii', 12, 16);

  if (altBicim === 'VP8X') {
    // 24..27: (genişlik-1) ve (yükseklik-1), 24 bit little-endian.
    const w = 1 + (buf.readUIntLE(24, 3) & 0xffffff);
    const h = 1 + (buf.readUIntLE(27, 3) & 0xffffff);
    return { width: w, height: h };
  }

  if (altBicim === 'VP8 ') {
    // Anahtar kare başlığı: 26..29'da 14 bitlik boyutlar.
    return { width: buf.readUInt16LE(26) & 0x3fff, height: buf.readUInt16LE(28) & 0x3fff };
  }

  if (altBicim === 'VP8L') {
    // 21..24: 14+14 bit paketli.
    const bits = buf.readUInt32LE(21);
    return { width: 1 + (bits & 0x3fff), height: 1 + ((bits >> 14) & 0x3fff) };
  }

  return null;
}
