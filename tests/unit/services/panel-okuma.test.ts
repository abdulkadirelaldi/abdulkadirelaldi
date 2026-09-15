import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

import { describe, expect, it, vi } from 'vitest';

import { experienceFilterSchema, postFilterSchema, projectFilterSchema } from '@/lib/schemas';
import { fetchExperienceForPanel, fetchExperienceForPanelById } from '@/server/services/experience';
import { fetchPostForPanel, fetchPostsForPanel, fetchPublishedPosts } from '@/server/services/post';
import {
  fetchProjectForPanel,
  fetchProjectsForPanel,
  fetchPublishedProjects,
} from '@/server/services/project';

/**
 * PANEL OKUMA YOLU — T-040, ENGEL-1.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ENGEL-1'İN ÜÇÜNCÜ SONUCU BU DOSYANIN ASIL KONUSU
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * 1 ve 2 (taslak listede yok, arşivlenen geri alınamıyor) GÖRÜNÜR hatalardı.
 * 3 SESSİZDİ: düzenleme formu DTO'da `status` olmadığı için sabit `PUBLISHED`
 * yazıyordu. Servis tüm durumları döndürmeye başladığı gün — yani BUGÜN — o
 * satır bir TASLAĞI KAYDETMEK ONU YAYINA ALIR hâline gelirdi.
 *
 * Bu yüzden buradaki en önemli assert'ler ikisi:
 *   - Panel DTO'su `status` TAŞIYOR (Frontend'in sabit yazmasına gerek yok).
 *   - Public yol DEĞİŞMEDİ: `DRAFT` konur, dönmediği ölçülür.
 */

const ID = 'clx0000000000000000000001';
const AN = new Date('2026-09-13T12:00:00.000Z');

const PROJE_PANEL_SATIRI = {
  id: ID,
  locale: 'tr',
  slug: 'taslak-proje',
  title: 'Taslak Proje',
  status: 'DRAFT' as const,
  featured: false,
  order: 0,
  publishedAt: null,
  updatedAt: AN,
  summary: 'Özet',
  content: '# MDX gövdesi',
  coverAttachmentId: 'ek_1',
  tags: ['web'],
  stack: ['next'],
  liveUrl: null,
  repoUrl: null,
  clientName: null,
  cover: { id: 'ek_1', key: 'k', mime: 'image/webp', width: 1, height: 1 },
};

const YAZI_PANEL_SATIRI = {
  id: ID,
  locale: 'tr',
  slug: 'taslak-yazi',
  title: 'Taslak Yazı',
  status: 'DRAFT' as const,
  readingMinutes: 4,
  publishedAt: null,
  updatedAt: AN,
  excerpt: 'Özet',
  content: '# MDX',
  coverAttachmentId: null,
  tags: ['notlar'],
  cover: null,
};

const DENEYIM_SATIRI = {
  id: ID,
  locale: 'tr',
  organization: 'Kurum',
  role: 'Rol',
  type: 'WORK' as const,
  startDate: new Date('2020-01-01T00:00:00.000Z'),
  endDate: null,
  current: true,
  description: null,
  order: 0,
};

function sahteIstemci(satir: Record<string, unknown>, toplam = 1) {
  const findMany = vi.fn().mockResolvedValue([satir]);
  const count = vi.fn().mockResolvedValue(toplam);
  const findUnique = vi.fn().mockResolvedValue(satir);
  return { findMany, count, findUnique };
}

/* ===========================================================================
 * ⚠️ KABUL KRİTERİ: DTO `status` TAŞIYOR
 * ======================================================================== */

describe('panel DTO’su durum taşıyor — ENGEL-1/3', () => {
  it('proje panel listesi `status` döndürüyor', async () => {
    const p = sahteIstemci(PROJE_PANEL_SATIRI);
    const sayfa = await fetchProjectsForPanel(projectFilterSchema.parse({}), {
      project: p,
    } as never);

    // Frontend'in forma sabit `PUBLISHED` yazma ihtiyacı BURADA bitiyor.
    expect(sayfa.items[0]?.status).toBe('DRAFT');
  });

  it('proje panel tek kaydı `status` döndürüyor', async () => {
    const p = sahteIstemci(PROJE_PANEL_SATIRI);
    const dto = await fetchProjectForPanel(ID, { project: p } as never);
    expect(dto?.status).toBe('DRAFT');
  });

  it('yazı panel listesi ve tek kaydı `status` döndürüyor', async () => {
    const p = sahteIstemci(YAZI_PANEL_SATIRI);
    const sayfa = await fetchPostsForPanel(postFilterSchema.parse({}), { post: p } as never);
    const dto = await fetchPostForPanel(ID, { post: p } as never);

    expect(sayfa.items[0]?.status).toBe('DRAFT');
    expect(dto?.status).toBe('DRAFT');
  });

  it('public DTO’larda `status` YOK — sözleşme kirlenmedi', async () => {
    // Panel ihtiyacı public DTO'ya `status` eklenerek çözülseydi public
    // sözleşme panelin ihtiyacıyla kirlenirdi. İki ayrı DTO ailesi var.
    const p = sahteIstemci({
      ...PROJE_PANEL_SATIRI,
      status: 'PUBLISHED',
      publishedAt: new Date('2026-01-01T00:00:00.000Z'),
    });
    const liste = await fetchPublishedProjects({}, { project: p } as never);
    expect(liste[0]).not.toHaveProperty('status');
  });
});

/* ===========================================================================
 * ⚠️ KABUL KRİTERİ: PANEL TÜM DURUMLARI GÖRÜYOR
 * ======================================================================== */

describe('panel tüm durumları görüyor', () => {
  it('durum filtresi VERİLMEZSE `where`e status HİÇ girmiyor', async () => {
    const p = sahteIstemci(PROJE_PANEL_SATIRI);
    await fetchProjectsForPanel(projectFilterSchema.parse({}), { project: p } as never);

    const where = p.findMany.mock.calls[0]?.[0].where as Record<string, unknown>;
    // `status` girmezse DRAFT/SCHEDULED/PUBLISHED/ARCHIVED hepsi döner.
    expect(where).not.toHaveProperty('status');
    // Varsayılanı `{ not: 'ARCHIVED' }` yapmak da yanlış olurdu: arşivlenen
    // kayıt panelden GERİ ALINABİLMELİ (ENGEL-1/2).
    expect(JSON.stringify(where)).not.toContain('ARCHIVED');
  });

  it('panel sorgusunda publishedAt KARŞILAŞTIRMASI YOK', async () => {
    const p = sahteIstemci(PROJE_PANEL_SATIRI);
    await fetchProjectsForPanel(projectFilterSchema.parse({}), { project: p } as never);

    const where = p.findMany.mock.calls[0]?.[0].where as Record<string, unknown>;
    // `publishedWhere` sızsaydı SCHEDULED ve ileri tarihli kayıtlar panelde de
    // gizlenirdi — ENGEL-1 farklı bir kılıkta geri gelirdi.
    expect(where).not.toHaveProperty('publishedAt');
  });

  it('durum filtresi VERİLİRSE ona süzülüyor', async () => {
    const p = sahteIstemci(PROJE_PANEL_SATIRI);
    await fetchProjectsForPanel(projectFilterSchema.parse({ status: 'ARCHIVED' }), {
      project: p,
    } as never);

    expect(p.findMany.mock.calls[0]?.[0].where).toMatchObject({ status: 'ARCHIVED' });
  });

  it('yazı panelinde de durum filtresi yok', async () => {
    const p = sahteIstemci(YAZI_PANEL_SATIRI);
    await fetchPostsForPanel(postFilterSchema.parse({}), { post: p } as never);

    const where = p.findMany.mock.calls[0]?.[0].where as Record<string, unknown>;
    expect(where).not.toHaveProperty('status');
    expect(where).not.toHaveProperty('publishedAt');
  });
});

/* ===========================================================================
 * ⚠️ KABUL KRİTERİ: PUBLIC YOL DEĞİŞMEDİ
 * ======================================================================== */

describe('public yol DEĞİŞMEDİ — can damarı', () => {
  /**
   * DRAFT bir kayıt public sorguya konur ve DÖNMEDİĞİ ölçülür.
   *
   * Taklit istemci `where`i UYGULAMADIĞI için satırı yine döndürür; bu yüzden
   * assert DÖNEN VERİ üzerinde değil, SORGUNUN KENDİSİ üzerinde: public yol
   * `status: 'PUBLISHED'` ve `publishedAt: { lte: now }` koşullarını
   * GÖNDERİYOR mu? Gerçek veritabanı bu koşullarla taslağı elemek zorunda.
   */
  it('fetchPublishedProjects HÂLÂ publishedWhere uyguluyor', async () => {
    const p = sahteIstemci(PROJE_PANEL_SATIRI);
    await fetchPublishedProjects({ now: AN }, { project: p } as never);

    expect(p.findMany.mock.calls[0]?.[0].where).toMatchObject({
      status: 'PUBLISHED',
      publishedAt: { lte: AN },
    });
  });

  it('fetchPublishedPosts HÂLÂ publishedWhere uyguluyor', async () => {
    const p = sahteIstemci(YAZI_PANEL_SATIRI);
    await fetchPublishedPosts({ now: AN }, { post: p } as never);

    expect(p.findMany.mock.calls[0]?.[0].where).toMatchObject({
      status: 'PUBLISHED',
      publishedAt: { lte: AN },
    });
  });

  it('public ve panel AYRI FONKSİYONLAR — ortak bayrak yok', () => {
    /*
     * "Tek fonksiyon + includeUnpublished bayrağı" kısa görünürdü ama o
     * bayrağın varsayılanını bir gün yanlış yazan biri TASLAKLARI PUBLIC'E
     * SIZDIRIR — ve o gün hiçbir test kırmızıya dönmez, çünkü public sayfa
     * yine çalışıyor olur, sadece fazlasını gösterir.
     *
     * Bu assert kaynağı okuyor: böyle bir bayrak eklenirse kırılır.
     */
    const kok = resolve(__dirname, '../../..');
    for (const dosya of ['src/server/services/project.ts', 'src/server/services/post.ts']) {
      // YORUMLAR ÇIKARILIYOR: ilk hâlinde bu assert kendi gerekçe yorumumu
      // yakalayıp kırıldı ("ortak bir `includeUnpublished` bayrağı…" cümlesi).
      // Aranan şey KOD; bir yasağı anlatan yorum onun ihlali değil.
      const kod = readFileSync(join(kok, dosya), 'utf8')
        .replace(/\/\*[\s\S]*?\*\//g, ' ')
        .replace(/\/\/.*$/gm, ' ');

      // Tarama VAKUM DEĞİL: yorumlar çıkınca gerçek kod kalıyor mu?
      expect(kod, `${dosya} yorum ayıklaması her şeyi sildi`).toContain('publishedWhere');

      expect(kod, `${dosya} yayın durumunu bayrakla geçiyor`).not.toMatch(
        /includeUnpublished|includeDrafts|allStatuses/,
      );
    }
  });
});

/* ===========================================================================
 * ⚠️ KABUL KRİTERİ: PANEL OKUMALARI ÖNBELLEKLENMİYOR
 * ======================================================================== */

describe('panel okumaları ÖNBELLEKLENMİYOR', () => {
  /**
   * Gerekçe T-038'deki ile aynı: tek kullanıcılı bir panelde hiçbir yükü
   * azaltmadan "yeni kayıt görünmüyor" sınıfından hata riski açar.
   *
   * Bunu `cachedRead`i taklit ederek ölçmek kırılgan olurdu (çağrılmadığını
   * kanıtlamak zor). Onun yerine KAYNAK okunuyor: önbellek katmanı
   * `cached.ts`'tir ve panel fonksiyonlarının orada SARMALANMAMIŞ olması
   * gerekiyor.
   */
  const kok = resolve(__dirname, '../../..');
  const cachedKaynak = readFileSync(join(kok, 'src/server/services/cached.ts'), 'utf8');

  const PANEL_FONKSIYONLARI = [
    'fetchProjectsForPanel',
    'fetchProjectForPanel',
    'fetchPostsForPanel',
    'fetchPostForPanel',
    'fetchExperienceForPanel',
    'fetchExperienceForPanelById',
  ];

  it.each(PANEL_FONKSIYONLARI)('%s cached.ts’te SARMALANMAMIŞ', (fn) => {
    expect(cachedKaynak, `${fn} önbellek katmanına girmiş`).not.toContain(fn);
  });

  it('tarama gerçekten çalışıyor — cached.ts public okumaları İÇERİYOR', () => {
    // Kontrol: dosya okunuyor ve içerik bekleneni taşıyor. Aksi hâlde yukarıdaki
    // altı assert boş bir dizede arama yapıp sahte yeşil verirdi.
    expect(cachedKaynak).toContain('fetchPublishedProjects');
    expect(cachedKaynak).toContain('cachedRead');
  });
});

/* ===========================================================================
 * TEK KAYIT — düzenleme formunun TAM alan kümesi
 * ======================================================================== */

describe('panel tek kayıt — düzenleme formunun ihtiyacı', () => {
  it('proje tek kaydı MDX taşıyor', async () => {
    const p = sahteIstemci(PROJE_PANEL_SATIRI);
    const dto = await fetchProjectForPanel(ID, { project: p } as never);

    // Liste DTO'sunun MDX taşımaması T-030/K3'ün doğru kararıydı; TEK KAYIT
    // farklı bir soru — form içeriği düzenleyecekse onu almak zorunda.
    expect(dto?.content).toBe('# MDX gövdesi');
  });

  it('panel LİSTESİ MDX taşımıyor — K1/LCP kararı korunuyor', async () => {
    const p = sahteIstemci(PROJE_PANEL_SATIRI);
    const sayfa = await fetchProjectsForPanel(projectFilterSchema.parse({}), {
      project: p,
    } as never);

    expect(sayfa.items[0]).not.toHaveProperty('content');
    expect(p.findMany.mock.calls[0]?.[0].select).not.toHaveProperty('content');
  });

  it('ham FK (`coverAttachmentId`) VE çözülmüş `cover` birlikte dönüyor', async () => {
    const p = sahteIstemci(PROJE_PANEL_SATIRI);
    const dto = await fetchProjectForPanel(ID, { project: p } as never);

    // Form alanı kimliği gönderiyor; önizleme çözülmüş referansı gösteriyor.
    expect(dto?.coverAttachmentId).toBe('ek_1');
    expect(dto?.cover).toMatchObject({ id: 'ek_1' });
  });

  it('güncelleme şemasının TÜM alanları tek kayıt DTO’sunda var', async () => {
    /*
     * Sözleşme kapısı: form `updateProjectSchema`yı dolduruyor, dolayısıyla
     * okuma DTO'su o şemanın her alanını sağlamak ZORUNDA. Biri eksik olsaydı
     * form o alanı boş gönderir ve kaydetmek onu SİLERDİ.
     */
    const p = sahteIstemci(PROJE_PANEL_SATIRI);
    const dto = await fetchProjectForPanel(ID, { project: p } as never);

    for (const alan of [
      'locale',
      'slug',
      'title',
      'summary',
      'content',
      'coverAttachmentId',
      'tags',
      'stack',
      'liveUrl',
      'repoUrl',
      'clientName',
      'featured',
      'order',
      'status',
      'publishedAt',
    ]) {
      expect(dto, `${alan} panel DTO'sunda yok — form onu SİLER`).toHaveProperty(alan);
    }
  });

  it('yazı tek kaydı da tam küme taşıyor', async () => {
    const p = sahteIstemci(YAZI_PANEL_SATIRI);
    const dto = await fetchPostForPanel(ID, { post: p } as never);

    for (const alan of [
      'locale',
      'slug',
      'title',
      'excerpt',
      'content',
      'coverAttachmentId',
      'tags',
      'status',
      'publishedAt',
    ]) {
      expect(dto, `${alan} eksik`).toHaveProperty(alan);
    }
  });

  it('kayıt yoksa null — fırlatmıyor', async () => {
    const p = sahteIstemci(PROJE_PANEL_SATIRI);
    p.findUnique.mockResolvedValue(null);
    expect(await fetchProjectForPanel(ID, { project: p } as never)).toBeNull();
  });

  it('`id` ile aranıyor, `slug` ile DEĞİL', async () => {
    const p = sahteIstemci(PROJE_PANEL_SATIRI);
    await fetchProjectForPanel(ID, { project: p } as never);

    // Panel formu slug'ı DEĞİŞTİREBİLİR; slug kararlı bir adres değil.
    expect(p.findUnique.mock.calls[0]?.[0].where).toEqual({ id: ID });
  });
});

/* ===========================================================================
 * SAYFALAMA VE SIRALAMA
 * ======================================================================== */

describe('sayfalama ve sıralama', () => {
  it('sayfa 3 / 10 → skip 20, take 10', async () => {
    const p = sahteIstemci(PROJE_PANEL_SATIRI, 57);
    const sayfa = await fetchProjectsForPanel(
      projectFilterSchema.parse({ page: '3', perPage: '10' }),
      { project: p } as never,
    );

    expect(p.findMany.mock.calls[0]?.[0]).toMatchObject({ skip: 20, take: 10 });
    expect(sayfa).toMatchObject({ total: 57, page: 3, perPage: 10 });
  });

  it('panel sıralaması `updatedAt desc` — public anahtar kullanılamaz', async () => {
    const p = sahteIstemci(PROJE_PANEL_SATIRI);
    await fetchProjectsForPanel(projectFilterSchema.parse({}), { project: p } as never);

    // `DRAFT` kayıtların `publishedAt`i `null`; public anahtar (`publishedAt
    // desc`) panelde bütün taslakları bir uca yığar ve aralarındaki sırayı
    // belirsiz bırakır. `updatedAt` her kayıtta dolu.
    expect(p.findMany.mock.calls[0]?.[0].orderBy).toEqual([{ updatedAt: 'desc' }]);
  });

  it('public sıralama DEĞİŞMEDİ', async () => {
    const p = sahteIstemci(PROJE_PANEL_SATIRI);
    await fetchPublishedProjects({}, { project: p } as never);

    expect(p.findMany.mock.calls[0]?.[0].orderBy).toEqual([
      { featured: 'desc' },
      { order: 'asc' },
      { publishedAt: 'desc' },
    ]);
  });

  it('arama başlık/özet/slug üzerinde ve harf duyarsız', async () => {
    const p = sahteIstemci(PROJE_PANEL_SATIRI);
    await fetchProjectsForPanel(projectFilterSchema.parse({ q: 'kıyı' }), {
      project: p,
    } as never);

    const where = p.findMany.mock.calls[0]?.[0].where as {
      OR: Record<string, { mode: string }>[];
    };
    expect(where.OR).toHaveLength(3);
    for (const kosul of where.OR) {
      expect(Object.values(kosul)[0]?.mode).toBe('insensitive');
    }
  });

  it('etiket / teknoloji / öne çıkan süzmeleri where’e giriyor', async () => {
    const p = sahteIstemci(PROJE_PANEL_SATIRI);
    await fetchProjectsForPanel(
      projectFilterSchema.parse({ tag: 'web', stack: 'next', featured: 'true' }),
      { project: p } as never,
    );

    expect(p.findMany.mock.calls[0]?.[0].where).toMatchObject({
      tags: { has: 'web' },
      stack: { has: 'next' },
      featured: true,
    });
  });
});

/* ===========================================================================
 * EXPERIENCE — durum kolonu YOK
 * ======================================================================== */

describe('Experience — ENGEL-1’in durum kısmı burada YOK', () => {
  it('panel listesi sayfalı ve durum filtresi İÇERMİYOR', async () => {
    const e = sahteIstemci(DENEYIM_SATIRI, 3);
    const sayfa = await fetchExperienceForPanel(experienceFilterSchema.parse({}), {
      experience: e,
    } as never);

    const where = e.findMany.mock.calls[0]?.[0].where as Record<string, unknown>;
    // `Experience` modelinde `status` kolonu YOK (şema tarandı). Simetri uğruna
    // olmayan bir kolona göre süzmek ölü bir dal bırakırdı.
    expect(where).not.toHaveProperty('status');
    expect(sayfa.total).toBe(3);
  });

  it('DTO ham `Date` taşımıyor — AppDay (ADR-016)', async () => {
    const e = sahteIstemci(DENEYIM_SATIRI);
    const sayfa = await fetchExperienceForPanel(experienceFilterSchema.parse({}), {
      experience: e,
    } as never);

    expect(sayfa.items[0]?.startDate).toBe('2020-01-01');
  });

  it('tek kayıt okuma id ile çalışıyor', async () => {
    const e = sahteIstemci(DENEYIM_SATIRI);
    const dto = await fetchExperienceForPanelById(ID, { experience: e } as never);
    expect(dto).toMatchObject({ organization: 'Kurum', role: 'Rol' });
  });

  it('tür filtresi where’e giriyor', async () => {
    const e = sahteIstemci(DENEYIM_SATIRI);
    await fetchExperienceForPanel(experienceFilterSchema.parse({ type: 'EDUCATION' }), {
      experience: e,
    } as never);

    expect(e.findMany.mock.calls[0]?.[0].where).toMatchObject({ type: 'EDUCATION' });
  });
});
