import { createHash } from 'node:crypto';

import { beforeEach, describe, expect, it } from 'vitest';

import {
  CLAUDE_GERI_DONUS,
  mcpKaynagi,
  ozet,
  pkceDogrula,
  siteAdresi,
  yonlendirmeEslesir,
  yonlendirmeKaydaUygun,
} from '@/lib/oauth/kurallar';
import {
  baglantiyiKaldir,
  erisimDogrula,
  eskiOAuthKayitlariniSil,
  fetchBagliIstemciler,
  istemciKaydet,
  jetonYenile,
  kodTakasEt,
  kodUret,
  yetkiIsteginiDogrula,
  type YetkiIstegi,
} from '@/server/services/oauth';

/**
 * OAuth (ADR-056) — BİRİM: bellek içi sahte Prisma istemcisiyle her ret yolu. Gerçek PostgreSQL ile
 * aynı akış `tests/integration/oauth-mcp.test.ts`te; burada dallar tek tek sınanır.
 */

type Satir = Record<string, unknown>;

function eslesir(s: Satir, where: Satir = {}): boolean {
  return Object.entries(where).every(([k, v]) => {
    const d = s[k];
    if (v === null) return d === null || d === undefined;
    if (v && typeof v === 'object' && !(v instanceof Date)) {
      const o = v as Record<string, unknown>;
      if ('gt' in o) return d instanceof Date && d > (o.gt as Date);
      if ('lt' in o) return d instanceof Date && d < (o.lt as Date);
      if ('startsWith' in o) return typeof d === 'string' && d.startsWith(o.startsWith as string);
      return true;
    }
    return d === v;
  });
}

function tablo(anahtar: string) {
  const satirlar: Satir[] = [];
  return {
    satirlar,
    async create({ data }: { data: Satir }) {
      const s = {
        createdAt: new Date(),
        iptal: null,
        kullanildi: null,
        sonKullanim: null,
        ...data,
      };
      satirlar.push(s);
      return s;
    },
    async createMany({ data }: { data: Satir[] }) {
      for (const d of data) satirlar.push({ createdAt: new Date(), iptal: null, ...d });
      return { count: data.length };
    },
    async findUnique({ where }: { where: Satir }) {
      return satirlar.find((s) => s[anahtar] === where[anahtar]) ?? null;
    },
    async findMany() {
      return satirlar.map((s) => ({ ...s, jetonlar: [] }));
    },
    async count({ where }: { where: Satir }) {
      return satirlar.filter((s) => eslesir(s, where)).length;
    },
    async update({ where, data }: { where: Satir; data: Satir }) {
      const s = satirlar.find((x) => x[anahtar] === where[anahtar]);
      Object.assign(s!, data);
      return s;
    },
    async updateMany({ where, data }: { where: Satir; data: Satir }) {
      const l = satirlar.filter((s) => eslesir(s, where));
      for (const s of l) Object.assign(s, data);
      return { count: l.length };
    },
    async deleteMany({ where }: { where: Satir }) {
      const once = satirlar.length;
      for (let i = satirlar.length - 1; i >= 0; i--)
        if (eslesir(satirlar[i]!, where)) satirlar.splice(i, 1);
      return { count: once - satirlar.length };
    },
  };
}

type Tablo = ReturnType<typeof tablo>;
interface SahteDb {
  oAuthIstemci: Tablo;
  oAuthKod: Tablo;
  oAuthJeton: Tablo;
  $transaction<T>(fn: (tx: SahteDb) => Promise<T>): Promise<T>;
}

function sahteDb(): SahteDb {
  const c: SahteDb = {
    oAuthIstemci: tablo('id'),
    oAuthKod: tablo('ozet'),
    oAuthJeton: tablo('ozet'),
    async $transaction<T>(fn: (tx: SahteDb) => Promise<T>) {
      return fn(c);
    },
  };
  return c;
}

const DOGRULAYICI = 'a'.repeat(43);
const SINAMA = createHash('sha256').update(DOGRULAYICI).digest('base64url');
const SIMDI = new Date('2026-11-18T09:00:00Z');

let c: SahteDb;
const db = () => c as never;

beforeEach(() => {
  process.env.NEXT_PUBLIC_SITE_URL = 'https://ornek.test/';
  c = sahteDb();
});

async function istemci() {
  return istemciKaydet({ ad: 'Claude', yonlendirmeler: [CLAUDE_GERI_DONUS] }, db());
}
const istek = (istemciId: string, p: Partial<YetkiIstegi> = {}): YetkiIstegi => ({
  istemciId,
  yonlendirme: CLAUDE_GERI_DONUS,
  kodSinami: SINAMA,
  sinamaYontemi: 'S256',
  kaynak: null,
  kapsam: null,
  durum: null,
  ...p,
});

describe('kurallar (saf)', () => {
  it('site adresi sondaki eğik çizgisiz; MCP kaynağı ondan türer', () => {
    expect(siteAdresi()).toBe('https://ornek.test');
    expect(mcpKaynagi()).toBe('https://ornek.test/api/v1/mcp');
    delete process.env.NEXT_PUBLIC_SITE_URL;
    expect(siteAdresi()).toBe('http://localhost:3000');
  });

  it('kayıt yalnızca Claude geri dönüşüne ve yerel /callback adreslerine', () => {
    expect(yonlendirmeKaydaUygun(CLAUDE_GERI_DONUS)).toBe(true);
    expect(yonlendirmeKaydaUygun('http://127.0.0.1:5555/callback')).toBe(true);
    expect(yonlendirmeKaydaUygun('http://localhost/callback')).toBe(true);
    expect(yonlendirmeKaydaUygun('https://localhost/callback')).toBe(false);
    expect(yonlendirmeKaydaUygun('http://localhost:1/baska')).toBe(false);
    expect(yonlendirmeKaydaUygun('https://claude.ai.kotu.test/api/mcp/auth_callback')).toBe(false);
  });

  it('eşleşme: birebir; yerelde port bağımsız ama host aynı olmalı', () => {
    expect(yonlendirmeEslesir(['http://127.0.0.1:1/callback'], 'http://127.0.0.1:9/callback')).toBe(
      true,
    );
    expect(yonlendirmeEslesir(['http://localhost:1/callback'], 'http://127.0.0.1:9/callback')).toBe(
      false,
    );
    expect(yonlendirmeEslesir([CLAUDE_GERI_DONUS], 'http://localhost:9/callback')).toBe(false);
    expect(yonlendirmeEslesir([], 'https://x.test')).toBe(false);
  });

  it('PKCE: biçimsiz doğrulayıcı, yanlış uzunluk ve yanlış değer reddedilir', () => {
    expect(pkceDogrula(DOGRULAYICI, SINAMA)).toBe(true);
    expect(pkceDogrula('kisa', SINAMA)).toBe(false);
    expect(pkceDogrula('b'.repeat(43), SINAMA)).toBe(false);
    expect(pkceDogrula(DOGRULAYICI, 'x')).toBe(false);
    expect(ozet('a')).toHaveLength(64);
  });
});

describe('istemci kaydı', () => {
  it('eksik/fazla/yabancı yönlendirme ve gizli yöntem reddedilir; ad kırpılır ya da varsayılan', async () => {
    await expect(istemciKaydet({}, db())).rejects.toMatchObject({ kod: 'invalid_redirect_uri' });
    await expect(
      istemciKaydet({ yonlendirmeler: Array(6).fill(CLAUDE_GERI_DONUS) }, db()),
    ).rejects.toMatchObject({ kod: 'invalid_redirect_uri' });
    await expect(
      istemciKaydet({ yonlendirmeler: ['https://kotu.test/cb'] }, db()),
    ).rejects.toMatchObject({ kod: 'invalid_redirect_uri' });
    await expect(
      istemciKaydet(
        { yonlendirmeler: [CLAUDE_GERI_DONUS], yetkilendirme: 'private_key_jwt' },
        db(),
      ),
    ).rejects.toMatchObject({ kod: 'invalid_client_metadata' });
    const v = await istemciKaydet({ yonlendirmeler: [CLAUDE_GERI_DONUS, 42] }, db());
    expect(v).toMatchObject({ ad: 'Claude', yonlendirmeler: [CLAUDE_GERI_DONUS] });
    const u = await istemciKaydet(
      { ad: `  ${'x'.repeat(100)}  `, yonlendirmeler: [CLAUDE_GERI_DONUS], yetkilendirme: 'none' },
      db(),
    );
    expect(u.ad).toHaveLength(80);
  });
});

describe('yetki isteği', () => {
  it('bilinmeyen istemci, kayıtsız yönlendirme, PKCE ve kaynak hataları', async () => {
    await expect(yetkiIsteginiDogrula(istek('yok'), db())).rejects.toMatchObject({
      kod: 'invalid_client',
    });
    const i = await istemci();
    await expect(
      yetkiIsteginiDogrula(istek(i.id, { yonlendirme: 'https://x.test' }), db()),
    ).rejects.toMatchObject({ kod: 'invalid_redirect_uri' });
    await expect(
      yetkiIsteginiDogrula(istek(i.id, { kodSinami: 'kisa' }), db()),
    ).rejects.toMatchObject({ kod: 'invalid_request' });
    await expect(
      yetkiIsteginiDogrula(istek(i.id, { kaynak: 'https://baska.test' }), db()),
    ).rejects.toMatchObject({ kod: 'invalid_target' });
    await expect(
      yetkiIsteginiDogrula(istek(i.id, { kaynak: mcpKaynagi() }), db()),
    ).resolves.toEqual({ istemciAdi: 'Claude', yonlendirmeHostu: 'claude.ai' });
  });
});

describe('jeton ucu', () => {
  async function kodVeIstemci() {
    const i = await istemci();
    const kod = await kodUret(istek(i.id), 'u1', SIMDI, db());
    return { i, kod };
  }
  const takas = (kod: string, istemciId: string, p: Record<string, unknown> = {}) =>
    kodTakasEt(
      {
        kod,
        istemciId,
        yonlendirme: CLAUDE_GERI_DONUS,
        dogrulayici: DOGRULAYICI,
        kaynak: null,
        ...p,
      } as never,
      SIMDI,
      db(),
    );

  it('geçersiz kod, yabancı istemci, süre, yönlendirme, PKCE ve kaynak reddedilir', async () => {
    const { i, kod } = await kodVeIstemci();
    await expect(takas('yok', i.id)).rejects.toMatchObject({ kod: 'invalid_grant' });
    await expect(takas(kod, 'baska')).rejects.toMatchObject({ kod: 'invalid_grant' });
    await expect(
      takas(kod, i.id, { yonlendirme: 'http://localhost:1/callback' }),
    ).rejects.toMatchObject({
      kod: 'invalid_grant',
    });
    await expect(takas(kod, i.id, { dogrulayici: 'b'.repeat(43) })).rejects.toMatchObject({
      kod: 'invalid_grant',
    });
    await expect(takas(kod, i.id, { kaynak: 'https://baska.test' })).rejects.toMatchObject({
      kod: 'invalid_target',
    });
    await expect(
      kodTakasEt(
        {
          kod,
          istemciId: i.id,
          yonlendirme: CLAUDE_GERI_DONUS,
          dogrulayici: DOGRULAYICI,
          kaynak: null,
        },
        new Date(SIMDI.getTime() + 11 * 60_000),
        db(),
      ),
    ).rejects.toMatchObject({ kod: 'invalid_grant' });
  });

  it('başarılı takas, ikinci takasta aile iptali; yenileme ret yolları', async () => {
    const { i, kod } = await kodVeIstemci();
    const j = await takas(kod, i.id);
    expect(await erisimDogrula(j.access_token, SIMDI, db())).toEqual({
      userId: 'u1',
      istemciId: i.id,
    });
    await expect(takas(kod, i.id)).rejects.toMatchObject({ kod: 'invalid_grant' });
    expect(await erisimDogrula(j.access_token, SIMDI, db())).toBeNull();

    const { i: i2, kod: kod2 } = await kodVeIstemci();
    const k = await takas(kod2, i2.id);
    const yen = (yenileme: string, p: Record<string, unknown> = {}, simdi = SIMDI) =>
      jetonYenile({ yenileme, istemciId: i2.id, kaynak: null, ...p } as never, simdi, db());
    await expect(yen('yok')).rejects.toMatchObject({ kod: 'invalid_grant' });
    await expect(yen(k.access_token)).rejects.toMatchObject({ kod: 'invalid_grant' });
    await expect(yen(k.refresh_token, { istemciId: 'baska' })).rejects.toMatchObject({
      kod: 'invalid_grant',
    });
    await expect(yen(k.refresh_token, { kaynak: 'https://baska.test' })).rejects.toMatchObject({
      kod: 'invalid_target',
    });
    await expect(
      yen(k.refresh_token, {}, new Date(SIMDI.getTime() + 31 * 24 * 3600_000)),
    ).rejects.toMatchObject({ kod: 'invalid_grant' });
    const k2 = await yen(k.refresh_token, { kaynak: mcpKaynagi() });
    await expect(yen(k.refresh_token)).rejects.toMatchObject({ kod: 'invalid_grant' });
    expect(await erisimDogrula(k2.access_token, SIMDI, db())).toBeNull();
  });

  it('erişim doğrulaması: süresi dolmuş, iptal edilmiş ve başka kaynağa verilmiş jeton', async () => {
    const { i, kod } = await kodVeIstemci();
    const j = await takas(kod, i.id);
    expect(await erisimDogrula('yok', SIMDI, db())).toBeNull();
    expect(
      await erisimDogrula(j.access_token, new Date(SIMDI.getTime() + 3601_000), db()),
    ).toBeNull();
    process.env.NEXT_PUBLIC_SITE_URL = 'https://baska.test';
    expect(await erisimDogrula(j.access_token, SIMDI, db())).toBeNull();
    process.env.NEXT_PUBLIC_SITE_URL = 'https://ornek.test';
    expect((await baglantiyiKaldir(i.id, SIMDI, db())).iptal).toBe(2);
    expect(await erisimDogrula(j.access_token, SIMDI, db())).toBeNull();
  });

  it('bağlı istemci listesi ve eski kayıt temizliği', async () => {
    await istemciKaydet({ yonlendirmeler: ['http://localhost:1/callback'] }, db());
    const l = await fetchBagliIstemciler(SIMDI, db());
    expect(l[0]).toMatchObject({ geriDonus: 'localhost:1', etkin: false, sonKullanim: null });
    await eskiOAuthKayitlariniSil(SIMDI, db());
  });
});
