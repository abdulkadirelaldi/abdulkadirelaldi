/**
 * RSS 2.0 besleme üreticisi — §4.1.
 *
 * SAF modül: `next/*` içe aktarmaz, veritabanı bilmez. Girdi olarak hazır
 * öğeleri alır, dize döner. Böylece besleme biçimi (kaçış, tarih, sıra)
 * veritabanı ve Next çalışma zamanı olmadan sınanabilir.
 */

export interface RssItem {
  title: string;
  link: string;
  description: string;
  /** ISO 8601 an; `null` ise öğe beslemeye GİRMEZ (yayınlanmamış sayılır). */
  publishedAt: string | null;
  /** Kalıcı, benzersiz kimlik. Genellikle `link` ile aynı. */
  guid: string;
}

export interface RssChannel {
  title: string;
  description: string;
  /** Sitenin genel adresi. */
  link: string;
  /** Beslemenin kendi adresi — `atom:link rel="self"`. */
  feedUrl: string;
  language: string;
}

/**
 * XML metin kaçışı.
 *
 * ZORUNLU: başlık veya özet bir `&` ya da `<` içerirse kaçışsız besleme
 * GEÇERSİZ XML olur ve okuyucular beslemeyi tamamen reddeder — tek bir yazı
 * değil, besleme bütünüyle görünmez olur. `&`'in İLK sırada değiştirilmesi
 * şart, aksi hâlde sonraki değişimlerin ürettiği `&` işaretleri tekrar kaçar.
 */
export function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * RSS `pubDate` — RFC 822 biçimi.
 *
 * ISO 8601 KABUL EDİLMEZ; okuyucular tarihi çözemezse öğeyi tarihsiz sayar ve
 * sıralama bozulur. `toUTCString()` tam olarak beklenen biçimi üretir
 * (`Sun, 17 Aug 2026 08:00:00 GMT`).
 *
 * Geçersiz tarihte `null` döner — çağıran öğeyi atlar; `Invalid Date` yazmak
 * beslemeyi bozardı.
 */
export function toRssDate(isoInstant: string): string | null {
  const parsed = new Date(isoInstant);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toUTCString();
}

function renderItem(item: RssItem): string | null {
  if (item.publishedAt === null) return null;
  const pubDate = toRssDate(item.publishedAt);
  if (pubDate === null) return null;

  return [
    '    <item>',
    `      <title>${escapeXml(item.title)}</title>`,
    `      <link>${escapeXml(item.link)}</link>`,
    `      <guid isPermaLink="true">${escapeXml(item.guid)}</guid>`,
    `      <description>${escapeXml(item.description)}</description>`,
    `      <pubDate>${pubDate}</pubDate>`,
    '    </item>',
  ].join('\n');
}

/**
 * RSS 2.0 belgesi üretir.
 *
 * `lastBuildDate` DEĞİL, en yeni öğenin tarihi kullanılır: her istekte değişen
 * bir alan, içerik değişmese bile beslemeyi "güncellendi" gösterir ve
 * okuyucuları gereksiz yere uyandırır.
 */
export function buildRssFeed(channel: RssChannel, items: RssItem[]): string {
  const rendered = items.map(renderItem).filter((entry): entry is string => entry !== null);

  const header = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">',
    '  <channel>',
    `    <title>${escapeXml(channel.title)}</title>`,
    `    <link>${escapeXml(channel.link)}</link>`,
    `    <description>${escapeXml(channel.description)}</description>`,
    `    <language>${escapeXml(channel.language)}</language>`,
    `    <atom:link href="${escapeXml(channel.feedUrl)}" rel="self" type="application/rss+xml"/>`,
  ];

  return [...header, ...rendered, '  </channel>', '</rss>', ''].join('\n');
}
