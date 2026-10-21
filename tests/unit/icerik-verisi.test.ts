import { describe, expect, it } from 'vitest';

import {
  createExperienceSchema,
  createPostSchema,
  createProjectSchema,
  createSkillSchema,
  updateProfileSchema,
} from '@/lib/schemas';

import { DENEYIMLER, PROFIL, PROJELER, YETENEKLER } from '../../scripts/icerik/abdulkadir';
import { YAZILAR } from '../../scripts/icerik/yazilar';

/**
 * `scripts/icerik/abdulkadir.ts` — üretime `scripts/icerik-yukle.ts` ile giden
 * GERÇEK içerik. Betik her kaydı panelin şemasından geçiriyor; bozuk bir kayıt
 * üretimde betiği yarıda keserdi. Bu test aynı kontrolü CI'da, yayından ÖNCE yapar.
 */
describe('gerçek içerik verisi', () => {
  it('profil şemadan geçiyor', () => {
    expect(() => updateProfileSchema.parse(PROFIL)).not.toThrow();
  });

  it('her yetenek şemadan geçiyor ve adlar tekil (upsert anahtarı)', () => {
    for (const y of YETENEKLER) expect(() => createSkillSchema.parse(y), y.name).not.toThrow();
    expect(new Set(YETENEKLER.map((y) => y.name)).size).toBe(YETENEKLER.length);
  });

  it('her deneyim/ödül şemadan geçiyor ve (tür, kurum, ünvan) tekil', () => {
    for (const d of DENEYIMLER) {
      expect(() => createExperienceSchema.parse(d), `${d.organization} / ${d.role}`).not.toThrow();
    }
    const anahtarlar = DENEYIMLER.map((d) => `${d.type}|${d.organization}|${d.role}`);
    expect(new Set(anahtarlar).size).toBe(anahtarlar.length);
  });

  it('her proje şemadan geçiyor ve slug tekil', () => {
    for (const p of PROJELER) {
      expect(() => createProjectSchema.parse({ ...p, status: 'PUBLISHED' }), p.slug).not.toThrow();
    }
    expect(new Set(PROJELER.map((p) => p.slug)).size).toBe(PROJELER.length);
  });

  it('her blog yazısı şemadan geçiyor ve slug tekil', () => {
    for (const y of YAZILAR) {
      expect(() => createPostSchema.parse({ ...y, status: 'PUBLISHED' }), y.slug).not.toThrow();
    }
    expect(new Set(YAZILAR.map((y) => y.slug)).size).toBe(YAZILAR.length);
  });

  it('herkese açık içerikte telefon numarası YOK', () => {
    // Bilinçli karar (abdulkadir.ts başlığı): numara toplayıcı botlara açık olmasın.
    const metin = JSON.stringify({ PROFIL, DENEYIMLER, PROJELER, YAZILAR });
    expect(metin).not.toMatch(/0?5\d{2}[\s-]?\d{3}[\s-]?\d{2}[\s-]?\d{2}/);
  });
});
