/**
 * Okuma süresi — ADR-019, §9 ("okuma süresi" açıkça test edilmesi istenen
 * hesaplamalardan biri).
 *
 * `Post.readingMinutes` İSTEMCİDEN ALINMAZ; içerikten hesaplanır (T-011).
 * `prisma/seed.ts` içindeki geçici tahmin bu fonksiyona devredildi.
 */

/** Ortalama okuma hızı. Türkçe için 200 kelime/dk yaygın kabul gören değerdir. */
export const WORDS_PER_MINUTE = 200;

/**
 * MDX/Markdown işaretlerini metinden ayıklar.
 *
 * Ham içerik sayılsaydı kod blokları, bağlantı hedefleri ve görsel yolları
 * kelime sayılır ve süre şişerdi — özellikle teknik yazılarda fark büyük.
 */
function toPlainText(content: string): string {
  return (
    content
      // Kod blokları tamamen çıkar (okunmuyor, taranıyor)
      .replace(/```[\s\S]*?```/g, ' ')
      .replace(/`[^`]*`/g, ' ')
      // Görsel: alt metni kalsın, yol gitsin
      .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')
      // Bağlantı: metni kalsın, hedef gitsin
      .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
      // HTML/JSX etiketleri
      .replace(/<[^>]+>/g, ' ')
      // Başlık, liste, alıntı işaretleri ve vurgu
      .replace(/^[>#\-*+]+\s*/gm, ' ')
      .replace(/[*_~]/g, ' ')
  );
}

/** İçerikteki kelime sayısı (işaretlerden arındırılmış). */
export function countWords(content: string): number {
  const text = toPlainText(content).trim();
  if (text.length === 0) return 0;
  return text.split(/\s+/).length;
}

/**
 * Okuma süresi (dakika). En az 1 döner — "0 dakika okuma" anlamsız bir etikettir.
 * Yukarı yuvarlanır: yarım kalan bir dakika yine okunuyor.
 */
export function calculateReadingMinutes(content: string): number {
  const words = countWords(content);
  return Math.max(1, Math.ceil(words / WORDS_PER_MINUTE));
}
