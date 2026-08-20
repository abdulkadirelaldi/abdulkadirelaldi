import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it, vi } from 'vitest';

import {
  absoluteUrl,
  buildRssFeed,
  escapeXml,
  getSiteUrl,
  toRssDate,
  type RssItem,
} from '@/server/services';
import { fetchPostSitemapEntries, type PostClient } from '@/server/services/post';
import { fetchProjectSitemapEntries, type ProjectClient } from '@/server/services/project';

/** T-028 — SEO altyapısı. VERİTABANI GEREKTİRMEZ. */

const NOW = new Date('2026-08-17T09:00:00Z');
const ENV = { NEXT_PUBLIC_SITE_URL: 'https://abdulkadirelaldi.com' };

/* ===================== SİTE ADRESİ (§12) ================================= */

describe('getSiteUrl — adres koda gömülmez', () => {
  it('ortam değişkeninden okur', () => {
    expect(getSiteUrl(ENV)).toBe('https://abdulkadirelaldi.com');
  });

  it('sondaki eğik çizgiyi kırpar — çift eğik çizgi yinelenen URL üretir', () => {
    expect(getSiteUrl({ NEXT_PUBLIC_SITE_URL: 'https://x.dev/' })).toBe(
      'https://x.dev',
    );
    expect(getSiteUrl({ NEXT_PUBLIC_SITE_URL: 'https://x.dev///' })).toBe(
      'https://x.dev',
    );
  });

  it('TANIMSIZSA FIRLATIR — sessizce localhost yayınlamaz', () => {
    // Varsayılana düşmek üretimde fark edilmez ve tüm dünyaya localhost adresleri yayınlar.
    expect(() => getSiteUrl({})).toThrow(/NEXT_PUBLIC_SITE_URL tanımlı değil/);
    expect(() => getSiteUrl({ NEXT_PUBLIC_SITE_URL: '   ' })).toThrow();
  });

  it('şemasız değer FIRLATIR', () => {
    expect(() =>
      getSiteUrl({ NEXT_PUBLIC_SITE_URL: 'abdulkadirelaldi.com' }),
    ).toThrow(/geçerli bir URL değil/);
  });

  it('http/https dışı şema FIRLATIR', () => {
    expect(() =>
      getSiteUrl({ NEXT_PUBLIC_SITE_URL: 'ftp://x.dev' }),
    ).toThrow(/http\/https/);
  });
});

describe('absoluteUrl', () => {
  it('mutlak adres üretir', () => {
    expect(absoluteUrl('/blog/yazi', ENV)).toBe('https://abdulkadirelaldi.com/blog/yazi');
  });

  it('kök için tek eğik çizgi', () => {
    expect(absoluteUrl('/', ENV)).toBe('https://abdulkadirelaldi.com/');
  });

  it('baştaki eğik çizgi eksikse ekler', () => {
    expect(absoluteUrl('rss.xml', ENV)).toBe('https://abdulkadirelaldi.com/rss.xml');
  });
});

/* ===================== SITEMAP =========================================== */

describe('sitemap girdileri — yayın penceresi (ADR-019)', () => {
  function harness(rows: unknown[]) {
    const findMany = vi.fn().mockResolvedValue(rows);
    return { findMany, client: { project: { findMany }, post: { findMany } } };
  }

  it('SADECE PUBLISHED + publishedAt <= now sorgulanır', async () => {
    const h = harness([]);
    await fetchProjectSitemapEntries({ now: NOW }, h.client as unknown as ProjectClient);

    const where = h.findMany.mock.calls[0]?.[0].where;
    expect(where.status).toBe('PUBLISHED');
    expect(where.publishedAt).toEqual({ lte: NOW });
  });

  it('SCHEDULED/ARCHIVED/ileri tarihli eleme sorgunun İÇİNDE — sonradan süzülmüyor', async () => {
    // Sorguda olmasaydı arşivlenmiş bir kayıt sitemap'e girer, sunucu ise 410 dönerdi.
    const h = harness([]);
    await fetchPostSitemapEntries({ now: NOW }, h.client as unknown as PostClient);
    const where = h.findMany.mock.calls[0]?.[0].where;
    expect(where).toHaveProperty('status', 'PUBLISHED');
    expect(where).toHaveProperty('publishedAt');
  });

  it('yalnızca slug ve updatedAt seçilir — DTO şişirilmiyor', async () => {
    const h = harness([]);
    await fetchProjectSitemapEntries({ now: NOW }, h.client as unknown as ProjectClient);
    expect(h.findMany.mock.calls[0]?.[0].select).toEqual({ slug: true, updatedAt: true });
  });

  it('lastModified GERÇEK updatedAt’ten, ISO 8601', async () => {
    const h = harness([{ slug: 'a', updatedAt: new Date('2026-08-14T13:38:55.142Z') }]);
    const [entry] = await fetchProjectSitemapEntries({}, h.client as unknown as ProjectClient);
    expect(entry).toEqual({ slug: 'a', updatedAt: '2026-08-14T13:38:55.142Z' });
  });

  it('BOŞ VERİTABANI → boş dizi, patlamaz', async () => {
    const h = harness([]);
    expect(await fetchProjectSitemapEntries({}, h.client as unknown as ProjectClient)).toEqual([]);
    expect(await fetchPostSitemapEntries({}, h.client as unknown as PostClient)).toEqual([]);
  });

  it('varsayılan locale tr', async () => {
    const h = harness([]);
    await fetchPostSitemapEntries({}, h.client as unknown as PostClient);
    expect(h.findMany.mock.calls[0]?.[0].where.locale).toBe('tr');
  });
});

/* ===================== RSS =============================================== */

describe('escapeXml — kaçış olmazsa besleme BÜTÜNÜYLE reddedilir', () => {
  it('beş XML karakteri', () => {
    expect(escapeXml('a & b < c > d "e" \'f\'')).toBe(
      'a &amp; b &lt; c &gt; d &quot;e&quot; &apos;f&apos;',
    );
  });

  it('& ÖNCE kaçar — çifte kaçış yok', () => {
    expect(escapeXml('&lt;')).toBe('&amp;lt;');
    expect(escapeXml('<')).toBe('&lt;');
  });

  it('Türkçe harfler dokunulmadan geçer', () => {
    expect(escapeXml('Yazılım Geliştirme İşi')).toBe('Yazılım Geliştirme İşi');
  });
});

describe('toRssDate — RFC 822', () => {
  it('ISO girdiyi RFC 822’ye çevirir', () => {
    expect(toRssDate('2026-06-01T08:00:00.000Z')).toBe('Mon, 01 Jun 2026 08:00:00 GMT');
  });

  it('geçersiz tarihte null — "Invalid Date" beslemeyi bozardı', () => {
    expect(toRssDate('deger-degil')).toBeNull();
  });
});

describe('buildRssFeed', () => {
  const channel = {
    title: 'Abdulkadir Elaldı',
    description: 'Notlar',
    link: 'https://x.dev',
    feedUrl: 'https://x.dev/rss.xml',
    language: 'tr',
  };
  const item = (over: Partial<RssItem>): RssItem => ({
    title: 'Başlık',
    link: 'https://x.dev/blog/a',
    guid: 'https://x.dev/blog/a',
    description: 'Özet',
    publishedAt: '2026-06-01T08:00:00.000Z',
    ...over,
  });

  it('geçerli RSS 2.0 iskeleti', () => {
    const xml = buildRssFeed(channel, [item({})]);
    expect(xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>')).toBe(true);
    expect(xml).toContain('<rss version="2.0"');
    expect(xml).toContain('rel="self"');
    expect(xml).toContain('<pubDate>Mon, 01 Jun 2026 08:00:00 GMT</pubDate>');
  });

  it('publishedAt null olan öğe BESLEMEYE GİRMEZ', () => {
    const xml = buildRssFeed(channel, [item({ publishedAt: null, title: 'Taslak' })]);
    expect(xml).not.toContain('Taslak');
    expect(xml).not.toContain('<item>');
  });

  it('geçersiz tarihli öğe atlanır, besleme bozulmaz', () => {
    const xml = buildRssFeed(channel, [item({ publishedAt: 'xx', title: 'Bozuk' })]);
    expect(xml).not.toContain('Bozuk');
    expect(xml).toContain('</rss>');
  });

  it('başlıktaki & ve < KAÇIRILIR — yoksa XML geçersiz olur', () => {
    const xml = buildRssFeed(channel, [item({ title: 'Ar-Ge & <script>' })]);
    expect(xml).toContain('Ar-Ge &amp; &lt;script&gt;');
    expect(xml).not.toContain('<script>');
  });

  it('BOŞ liste → geçerli ama öğesiz besleme', () => {
    const xml = buildRssFeed(channel, []);
    expect(xml).toContain('</channel>');
    expect(xml).not.toContain('<item>');
  });
});

/* ===================== SITEMAP DÜRÜSTLÜĞÜ (BULGU-016) ==================== */

describe('sitemap yalnızca VAR OLAN rotaları bildirir — §4.1', () => {
  /**
   * BULGU-016: sitemap `/blog` ve `/iletisim` bildiriyordu ama o rotalar
   * yazılmamıştı; yayınlanmış yazılar da `/blog/[slug]`e işaret ediyordu.
   * Var olmayan adres bildirmek arama motoruna kırık bağlantı sinyalidir.
   *
   * Bu test sitemap MODÜLÜNÜ değil, dosyanın bildirdiği statik rota listesini
   * okur: `sitemap()` çağırmak Next çalışma zamanı ve veritabanı isterdi.
   * Kaynağı okumak, kuralın kendisini (liste ile gerçek rotalar örtüşmeli)
   * doğrudan sınamanın en ucuz yolu.
   */
  const kaynak = readFileSync(resolve(__dirname, '../../../src/app/sitemap.ts'), 'utf8');

  /** Yalnızca ETKİN satırlar — yorum satırları hariç. */
  const bildirilen = kaynak
    .split('\n')
    .filter((line) => !line.trimStart().startsWith('//') && !line.trimStart().startsWith('*'))
    .flatMap((line) => [...line.matchAll(/absoluteUrl\('([^']*)'\)/g)].map((m) => m[1]));

  it('statik liste tam olarak var olan rotalar', () => {
    expect(bildirilen.sort()).toEqual(['/', '/cv', '/hakkimda', '/projeler']);
  });

  it('YAZILMAMIŞ rotalar bildirilmiyor', () => {
    expect(bildirilen).not.toContain('/blog');
    expect(bildirilen).not.toContain('/iletisim');
  });

  it('yazı akışı KAPALI — /blog/[slug] rotası yok', () => {
    // Etkin kodda `getPostSitemapEntries` çağrısı olmamalı.
    const etkin = kaynak
      .split('\n')
      .filter((line) => !line.trimStart().startsWith('//') && !line.trimStart().startsWith('*'))
      .join('\n');
    expect(etkin).not.toContain('getPostSitemapEntries');
    expect(etkin).not.toContain('/blog/');
  });

  it('proje akışı AÇIK — /projeler/[slug] rotası var', () => {
    expect(kaynak).toContain('getProjectSitemapEntries');
    expect(kaynak).toContain('/projeler/');
  });

  it('kural dosyada YAZILI — sonraki tur bilerek eklesin', () => {
    expect(kaynak).toContain('YAYINA GİRDİĞİ TURDA');
  });
});
