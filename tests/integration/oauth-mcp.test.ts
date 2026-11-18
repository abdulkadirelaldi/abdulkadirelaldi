import { createHash, randomBytes } from 'node:crypto';

import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { CLAUDE_GERI_DONUS, mcpKaynagi, yonlendirmeEslesir } from '@/lib/oauth/kurallar';
import { db } from '@/server/db';
import { aracCalistir, aracListesi } from '@/server/services/mcp-araclar';
import {
  baglantiyiKaldir,
  erisimDogrula,
  istemciKaydet,
  jetonYenile,
  kodTakasEt,
  kodUret,
  OAuthHatasi,
  yetkiIsteginiDogrula,
  type YetkiIstegi,
} from '@/server/services/oauth';

/**
 * CLAUDE BAĞLAYICISI — OAuth 2.1 + MCP araçları, gerçek PostgreSQL (ADR-056). Sınanan güvenlik
 * kuralları: yalnızca Claude'un geri dönüş adreslerine kayıt, kayıtlı yönlendirme, PKCE S256,
 * kaynak (RFC 8707) bağlama, tek kullanımlık kod (ikinci kullanımda jetonlar iptal), yenileme
 * jetonu dönüşü (eskisi gelirse aile iptal), erişim jetonunun yalnızca MCP kaynağında geçmesi.
 */
const ONEK = 'zzit-mcp';
let KULLANICI = '';
const SIMDI = new Date('2026-11-18T09:00:00Z');

const dogrulayici = () => randomBytes(32).toString('base64url');
const sinama = (d: string) => createHash('sha256').update(d).digest('base64url');

async function temizle() {
  await db.oAuthIstemci.deleteMany({ where: { ad: { startsWith: ONEK } } });
  await db.gorev.deleteMany({ where: { baslik: { startsWith: ONEK } } });
}

async function istemci() {
  return istemciKaydet({ ad: `${ONEK} Claude`, yonlendirmeler: [CLAUDE_GERI_DONUS] });
}

function istek(istemciId: string, d: string, p: Partial<YetkiIstegi> = {}): YetkiIstegi {
  return {
    istemciId,
    yonlendirme: CLAUDE_GERI_DONUS,
    kodSinami: sinama(d),
    sinamaYontemi: 'S256',
    kaynak: mcpKaynagi(),
    kapsam: 'panel',
    durum: 'xyz',
    ...p,
  };
}

async function tamAkis(simdi = SIMDI) {
  const i = await istemci();
  const d = dogrulayici();
  const kod = await kodUret(istek(i.id, d), KULLANICI, simdi);
  const j = await kodTakasEt(
    { kod, istemciId: i.id, yonlendirme: CLAUDE_GERI_DONUS, dogrulayici: d, kaynak: mcpKaynagi() },
    simdi,
  );
  return { i, d, kod, j };
}

beforeAll(async () => {
  process.env.NEXT_PUBLIC_SITE_URL = 'https://ornek.test';
  // Denetim kaydı `User`a bağlı (FK, hata yutulur) — gerçek (seed) kullanıcı kullanılır.
  KULLANICI = (await db.user.findFirstOrThrow({ select: { id: true } })).id;
});
beforeEach(temizle);
afterAll(async () => {
  await temizle();
  await db.$disconnect();
});

describe('yönlendirme kuralları (saf)', () => {
  it('claude.ai birebir; yerel adres porttan bağımsız; başka her şey reddedilir', () => {
    expect(yonlendirmeEslesir([CLAUDE_GERI_DONUS], CLAUDE_GERI_DONUS)).toBe(true);
    expect(
      yonlendirmeEslesir(['http://localhost:3118/callback'], 'http://localhost:51234/callback'),
    ).toBe(true);
    expect(
      yonlendirmeEslesir(['http://localhost:3118/callback'], 'http://127.0.0.1:1/callback'),
    ).toBe(false);
    expect(
      yonlendirmeEslesir([CLAUDE_GERI_DONUS], 'https://claude.ai/api/mcp/auth_callback?x=1'),
    ).toBe(false);
  });
});

describe('istemci kaydı', () => {
  it('yalnızca Claude geri dönüşlerine açık; gizli istemci yöntemi reddedilir', async () => {
    await expect(
      istemciKaydet({ ad: `${ONEK} kötü`, yonlendirmeler: ['https://kotu.example/callback'] }),
    ).rejects.toMatchObject({ kod: 'invalid_redirect_uri' });
    await expect(
      istemciKaydet({
        ad: `${ONEK} x`,
        yonlendirmeler: [CLAUDE_GERI_DONUS],
        yetkilendirme: 'client_secret_basic',
      }),
    ).rejects.toMatchObject({ kod: 'invalid_client_metadata' });
    const i = await istemci();
    expect(i.id).toMatch(/^ae_/);
  });
});

describe('yetki isteği doğrulaması', () => {
  it('kayıtsız yönlendirme, PKCE yokluğu ve yabancı kaynak reddedilir', async () => {
    const i = await istemci();
    const d = dogrulayici();
    await expect(
      yetkiIsteginiDogrula(istek(i.id, d, { yonlendirme: 'https://claude.ai/baska' })),
    ).rejects.toMatchObject({ kod: 'invalid_redirect_uri' });
    await expect(
      yetkiIsteginiDogrula(istek(i.id, d, { sinamaYontemi: 'plain' })),
    ).rejects.toMatchObject({
      kod: 'invalid_request',
    });
    await expect(
      yetkiIsteginiDogrula(istek(i.id, d, { kaynak: 'https://baska.test/mcp' })),
    ).rejects.toMatchObject({ kod: 'invalid_target' });
    await expect(yetkiIsteginiDogrula(istek(i.id, d))).resolves.toMatchObject({
      yonlendirmeHostu: 'claude.ai',
    });
  });
});

describe('jeton akışı', () => {
  it('kod → jeton; erişim jetonu MCP’de geçer, yenileme jetonu erişim olarak geçmez', async () => {
    const { j } = await tamAkis();
    expect(j).toMatchObject({ token_type: 'Bearer', expires_in: 3600, scope: 'panel' });
    expect(await erisimDogrula(j.access_token, SIMDI)).toMatchObject({ userId: KULLANICI });
    expect(await erisimDogrula(j.refresh_token, SIMDI)).toBeNull();
    expect(await erisimDogrula(j.access_token, new Date(SIMDI.getTime() + 3601_000))).toBeNull();
  });

  it('yanlış PKCE doğrulayıcısı reddedilir', async () => {
    const i = await istemci();
    const kod = await kodUret(istek(i.id, dogrulayici()), KULLANICI, SIMDI);
    await expect(
      kodTakasEt(
        {
          kod,
          istemciId: i.id,
          yonlendirme: CLAUDE_GERI_DONUS,
          dogrulayici: dogrulayici(),
          kaynak: null,
        },
        SIMDI,
      ),
    ).rejects.toMatchObject({ kod: 'invalid_grant' });
  });

  it('kod ikinci kez gelirse reddedilir VE ilk takasın jetonları iptal edilir', async () => {
    const { i, d, kod, j } = await tamAkis();
    await expect(
      kodTakasEt(
        { kod, istemciId: i.id, yonlendirme: CLAUDE_GERI_DONUS, dogrulayici: d, kaynak: null },
        SIMDI,
      ),
    ).rejects.toBeInstanceOf(OAuthHatasi);
    expect(await erisimDogrula(j.access_token, SIMDI)).toBeNull();
  });

  it('süresi dolmuş kod reddedilir', async () => {
    const i = await istemci();
    const d = dogrulayici();
    const kod = await kodUret(istek(i.id, d), KULLANICI, SIMDI);
    await expect(
      kodTakasEt(
        { kod, istemciId: i.id, yonlendirme: CLAUDE_GERI_DONUS, dogrulayici: d, kaynak: null },
        new Date(SIMDI.getTime() + 11 * 60_000),
      ),
    ).rejects.toMatchObject({ kod: 'invalid_grant' });
  });

  it('yenileme jetonu döner; ESKİSİ yeniden gelirse bütün aile iptal edilir', async () => {
    const { i, j } = await tamAkis();
    const j2 = await jetonYenile(
      { yenileme: j.refresh_token, istemciId: i.id, kaynak: null },
      SIMDI,
    );
    expect(j2.refresh_token).not.toBe(j.refresh_token);
    expect(await erisimDogrula(j2.access_token, SIMDI)).not.toBeNull();

    await expect(
      jetonYenile({ yenileme: j.refresh_token, istemciId: i.id, kaynak: null }, SIMDI),
    ).rejects.toMatchObject({ kod: 'invalid_grant' });
    expect(await erisimDogrula(j2.access_token, SIMDI)).toBeNull();
    await expect(
      jetonYenile({ yenileme: j2.refresh_token, istemciId: i.id, kaynak: null }, SIMDI),
    ).rejects.toMatchObject({ kod: 'invalid_grant' });
  });

  it('bağlantıyı kaldırmak bütün jetonları iptal eder', async () => {
    const { i, j } = await tamAkis();
    await baglantiyiKaldir(i.id, SIMDI);
    expect(await erisimDogrula(j.access_token, SIMDI)).toBeNull();
  });
});

describe('MCP araçları', () => {
  const sonra = vi.fn();
  const b = {
    get userId() {
      return KULLANICI;
    },
    sonra,
  };
  const yazi = (r: { content: { text: string }[] }) => r.content.map((c) => c.text).join('\n');

  it('araç listesi: şemalar JSON Schema, silme yıkıcı işaretli', () => {
    const l = aracListesi();
    expect(l.map((a) => a.name)).toEqual([
      'bugun_ozeti',
      'isleri_listele',
      'is_ekle',
      'is_bitti',
      'is_geri_al',
      'is_guncelle',
      'is_sil',
    ]);
    expect(l.find((a) => a.name === 'is_sil')!.annotations.destructiveHint).toBe(true);
    expect(l.find((a) => a.name === 'is_ekle')!.inputSchema).toMatchObject({ type: 'object' });
  });

  it('ekle → aramayla tik (tek eşleşme) → Google kuyruğu → geri al → güncelle → sil', async () => {
    sonra.mockClear();
    const e = await aracCalistir(
      'is_ekle',
      { baslik: `${ONEK} Garage 4 reels`, alan: 'KIYI_MEDYA', etiket: 'Garage', gun: '2026-11-28' },
      b,
    );
    expect(e.isError).toBeUndefined();
    const id = /\[([^\]]+)\]/.exec(yazi(e))![1]!;
    expect(sonra).toHaveBeenCalledWith(id);

    const t = await aracCalistir('is_bitti', { ara: `${ONEK} garage reels` }, b);
    expect(yazi(t)).toContain('Bitti');
    expect((await db.gorev.findUniqueOrThrow({ where: { id } })).tamamlandiAt).not.toBeNull();

    await aracCalistir('is_geri_al', { id }, b);
    const u = await aracCalistir('is_guncelle', { id, saat: '14:00' }, b);
    expect(yazi(u)).toContain('14:00');
    expect(await db.gorev.findUniqueOrThrow({ where: { id } })).toMatchObject({
      teslimDakika: 14 * 60,
    });

    await aracCalistir('is_sil', { id }, b);
    expect(await db.gorev.findUnique({ where: { id } })).toBeNull();

    const denetim = await db.auditLog.count({
      where: { entity: 'Gorev', entityId: id, actorId: KULLANICI },
    });
    expect(denetim).toBe(5);
  });

  it('arama birden çok işe uyarsa hiçbirine dokunmaz, adayları sayar', async () => {
    await aracCalistir('is_ekle', { baslik: `${ONEK} Kozmos 8 post` }, b);
    await aracCalistir('is_ekle', { baslik: `${ONEK} Kozmos 8 story` }, b);
    const r = await aracCalistir('is_bitti', { ara: `${ONEK} kozmos` }, b);
    expect(r.isError).toBe(true);
    expect(yazi(r)).toContain('2 işe uyuyor');
    expect(
      await db.gorev.count({
        where: { baslik: { startsWith: ONEK }, tamamlandiAt: { not: null } },
      }),
    ).toBe(0);
  });

  it('geçersiz girdi hata döner, yazmaz', async () => {
    const r = await aracCalistir('is_ekle', { baslik: `${ONEK} x`, saat: '25:00' }, b);
    expect(r.isError).toBe(true);
    expect(await db.gorev.count({ where: { baslik: `${ONEK} x` } })).toBe(0);
  });
});
