import { randomBytes } from 'node:crypto';

import {
  KAPSAM,
  mcpKaynagi,
  ozet,
  pkceDogrula,
  yonlendirmeEslesir,
  yonlendirmeKaydaUygun,
} from '@/lib/oauth/kurallar';
import { db } from '@/server/db';

/**
 * CLAUDE BAĞLAYICISI — OAuth 2.1 yetkilendirme sunucusu (ADR-056). Tek kullanıcı, açık istemci
 * (`token_endpoint_auth_method: none`) + PKCE S256 zorunlu. Erişim jetonu 1 saat, yenileme 30 gün
 * ve HER kullanımda döner; dönmüş (eski) bir yenileme jetonu yeniden gelirse çalınmış sayılır ve o
 * yetkiden türeyen BÜTÜN jetonlar iptal edilir (OAuth 2.1 §4.3.1).
 */

export const KOD_OMRU_MS = 10 * 60_000;
export const ERISIM_OMRU_S = 60 * 60;
/**
 * Etkileşimli işlem süresi. Prisma varsayılanı 5 sn; 2026-11-19'da sıkışık sunucuda (yük ~15)
 * yenileme 7,5 sn sürdü, işlem iptal oldu ve uç 500 döndü — Claude bağlantıyı kaybetti. Claude
 * yenilemeye 30 sn, ilk takasa 10 sn tanıyor; 20 sn ikisinin içinde kalan güvenli üst sınır.
 */
const ISLEM_SURESI = { maxWait: 10_000, timeout: 20_000 } as const;

export const YENILEME_OMRU_MS = 30 * 24 * 60 * 60_000;

/** RFC 6749 hata kodlarıyla fırlatılır; uçlar `{ error, error_description }` döner. */
export class OAuthHatasi extends Error {
  constructor(
    readonly kod:
      | 'invalid_request'
      | 'invalid_client'
      | 'invalid_grant'
      | 'unsupported_grant_type'
      | 'invalid_redirect_uri'
      | 'invalid_client_metadata'
      | 'invalid_target',
    message: string,
  ) {
    super(message);
    this.name = 'OAuthHatasi';
  }
}

const rastgele = (bayt = 32) => randomBytes(bayt).toString('base64url');

/* ===========================================================================
 * İSTEMCİ KAYDI (RFC 7591)
 * ======================================================================== */

export async function istemciKaydet(
  girdi: { ad?: unknown; yonlendirmeler?: unknown; yetkilendirme?: unknown },
  client = db,
): Promise<{ id: string; ad: string; yonlendirmeler: string[] }> {
  const yonlendirmeler = Array.isArray(girdi.yonlendirmeler)
    ? girdi.yonlendirmeler.filter((u): u is string => typeof u === 'string')
    : [];
  if (yonlendirmeler.length === 0 || yonlendirmeler.length > 5) {
    throw new OAuthHatasi('invalid_redirect_uri', 'redirect_uris gerekli (1–5).');
  }
  const izinsiz = yonlendirmeler.filter((u) => !yonlendirmeKaydaUygun(u));
  if (izinsiz.length > 0) {
    throw new OAuthHatasi(
      'invalid_redirect_uri',
      'Bu sunucu yalnızca Claude uygulamalarının geri dönüş adreslerini kabul eder.',
    );
  }
  if (girdi.yetkilendirme !== undefined && girdi.yetkilendirme !== 'none') {
    throw new OAuthHatasi(
      'invalid_client_metadata',
      'Yalnızca açık istemci (token_endpoint_auth_method: none) desteklenir.',
    );
  }
  const ad =
    typeof girdi.ad === 'string' && girdi.ad.trim() ? girdi.ad.trim().slice(0, 80) : 'Claude';
  const s = await client.oAuthIstemci.create({
    data: { id: `ae_${rastgele(18)}`, ad, yonlendirmeler },
  });
  return { id: s.id, ad: s.ad, yonlendirmeler: s.yonlendirmeler };
}

export interface YetkiIstegi {
  istemciId: string;
  yonlendirme: string;
  kodSinami: string;
  sinamaYontemi: string;
  kaynak: string | null;
  kapsam: string | null;
  durum: string | null;
}

/** İzin ekranından önce: isteğin bütün parçaları doğru mu. Doğruysa istemci adı döner. */
export async function yetkiIsteginiDogrula(
  i: YetkiIstegi,
  client = db,
): Promise<{ istemciAdi: string; yonlendirmeHostu: string }> {
  const istemci = await client.oAuthIstemci.findUnique({ where: { id: i.istemciId } });
  if (!istemci) throw new OAuthHatasi('invalid_client', 'Bilinmeyen istemci.');
  // Yönlendirme doğrulanmadan HATA bile oraya gönderilmez (açık yönlendirme).
  if (!yonlendirmeEslesir(istemci.yonlendirmeler, i.yonlendirme)) {
    throw new OAuthHatasi('invalid_redirect_uri', 'Yönlendirme adresi kayıtlı değil.');
  }
  if (i.sinamaYontemi !== 'S256' || !/^[A-Za-z0-9_-]{43}$/.test(i.kodSinami)) {
    throw new OAuthHatasi('invalid_request', 'PKCE S256 zorunlu.');
  }
  if (i.kaynak !== null && i.kaynak !== mcpKaynagi()) {
    throw new OAuthHatasi('invalid_target', 'Bu sunucu yalnızca kendi MCP adresine jeton verir.');
  }
  return { istemciAdi: istemci.ad, yonlendirmeHostu: new URL(i.yonlendirme).host };
}

/** Sahibi onayladı: tek kullanımlık kod üretir. Düz kod yalnızca burada, bir kez görünür. */
export async function kodUret(
  i: YetkiIstegi,
  userId: string,
  simdi: Date = new Date(),
  client = db,
): Promise<string> {
  await yetkiIsteginiDogrula(i, client);
  const kod = rastgele();
  await client.oAuthKod.create({
    data: {
      ozet: ozet(kod),
      istemciId: i.istemciId,
      userId,
      yonlendirme: i.yonlendirme,
      kodSinami: i.kodSinami,
      kaynak: i.kaynak ?? mcpKaynagi(),
      kapsam: KAPSAM,
      bitis: new Date(simdi.getTime() + KOD_OMRU_MS),
    },
  });
  return kod;
}

export interface JetonYaniti {
  access_token: string;
  token_type: 'Bearer';
  expires_in: number;
  refresh_token: string;
  scope: string;
}

async function jetonCiftiVer(
  t: { istemciId: string; userId: string; kaynak: string; kapsam: string; aile: string },
  simdi: Date,
  client: Pick<typeof db, 'oAuthJeton'>,
): Promise<JetonYaniti> {
  const erisim = rastgele();
  const yenileme = rastgele();
  await client.oAuthJeton.createMany({
    data: [
      {
        ozet: ozet(erisim),
        tur: 'ERISIM',
        ...t,
        bitis: new Date(simdi.getTime() + ERISIM_OMRU_S * 1000),
      },
      {
        ozet: ozet(yenileme),
        tur: 'YENILEME',
        ...t,
        bitis: new Date(simdi.getTime() + YENILEME_OMRU_MS),
      },
    ],
  });
  return {
    access_token: erisim,
    token_type: 'Bearer',
    expires_in: ERISIM_OMRU_S,
    refresh_token: yenileme,
    scope: t.kapsam,
  };
}

/* ===========================================================================
 * JETON UCU
 * ======================================================================== */

export async function kodTakasEt(
  g: {
    kod: string;
    istemciId: string;
    yonlendirme: string;
    dogrulayici: string;
    kaynak: string | null;
  },
  simdi: Date = new Date(),
  client = db,
): Promise<JetonYaniti> {
  // Yeniden kullanım İŞLEM DIŞINDA ele alınır: iptal işlem içinde yazılıp ardından hata fırlatılırsa
  // işlem geri alınır ve iptal kaybolur (2026-11-18, entegrasyon testi yakaladı).
  const once = await client.oAuthKod.findUnique({ where: { ozet: ozet(g.kod) } });
  if (once?.kullanildi && once.istemciId === g.istemciId) {
    // Kod ikinci kez geldi: ilk takasta verilen jetonlar da iptal (OAuth 2.1 §4.1.3).
    await client.oAuthJeton.updateMany({
      where: { aile: once.ozet, iptal: null },
      data: { iptal: simdi },
    });
    throw new OAuthHatasi('invalid_grant', 'Kod zaten kullanıldı.');
  }
  return client.$transaction(async (tx) => {
    const k = await tx.oAuthKod.findUnique({ where: { ozet: ozet(g.kod) } });
    if (!k || k.istemciId !== g.istemciId) throw new OAuthHatasi('invalid_grant', 'Geçersiz kod.');
    if (k.kullanildi) throw new OAuthHatasi('invalid_grant', 'Kod zaten kullanıldı.');
    if (k.bitis <= simdi) throw new OAuthHatasi('invalid_grant', 'Kodun süresi doldu.');
    if (k.yonlendirme !== g.yonlendirme) {
      throw new OAuthHatasi('invalid_grant', 'Yönlendirme adresi uyuşmuyor.');
    }
    if (!pkceDogrula(g.dogrulayici, k.kodSinami)) {
      throw new OAuthHatasi('invalid_grant', 'PKCE doğrulanamadı.');
    }
    if (g.kaynak !== null && g.kaynak !== k.kaynak) {
      throw new OAuthHatasi('invalid_target', 'Kaynak uyuşmuyor.');
    }
    // Koşullu tek güncelleme: iki eşzamanlı takastan yalnızca biri kazanır.
    const { count } = await tx.oAuthKod.updateMany({
      where: { ozet: k.ozet, kullanildi: null },
      data: { kullanildi: simdi },
    });
    if (count === 0) throw new OAuthHatasi('invalid_grant', 'Kod zaten kullanıldı.');
    await tx.oAuthIstemci.update({ where: { id: k.istemciId }, data: { sonKullanim: simdi } });
    return jetonCiftiVer(
      {
        istemciId: k.istemciId,
        userId: k.userId,
        kaynak: k.kaynak,
        kapsam: k.kapsam,
        aile: k.ozet,
      },
      simdi,
      tx,
    );
  }, ISLEM_SURESI);
}

export async function jetonYenile(
  g: { yenileme: string; istemciId: string; kaynak: string | null },
  simdi: Date = new Date(),
  client = db,
): Promise<JetonYaniti> {
  // Dönmüş jeton yeniden geldi → çalınmış olabilir: bütün aile iptal — İŞLEM DIŞINDA (yukarıdaki not).
  const once = await client.oAuthJeton.findUnique({ where: { ozet: ozet(g.yenileme) } });
  if (once?.tur === 'YENILEME' && once.iptal && once.istemciId === g.istemciId) {
    await client.oAuthJeton.updateMany({
      where: { aile: once.aile, iptal: null },
      data: { iptal: simdi },
    });
    throw new OAuthHatasi('invalid_grant', 'Yenileme jetonu iptal edilmiş.');
  }
  return client.$transaction(async (tx) => {
    const j = await tx.oAuthJeton.findUnique({ where: { ozet: ozet(g.yenileme) } });
    if (!j || j.tur !== 'YENILEME' || j.istemciId !== g.istemciId) {
      throw new OAuthHatasi('invalid_grant', 'Geçersiz yenileme jetonu.');
    }
    if (j.iptal) throw new OAuthHatasi('invalid_grant', 'Yenileme jetonu iptal edilmiş.');
    if (j.bitis <= simdi)
      throw new OAuthHatasi('invalid_grant', 'Yenileme jetonunun süresi doldu.');
    if (g.kaynak !== null && g.kaynak !== j.kaynak) {
      throw new OAuthHatasi('invalid_target', 'Kaynak uyuşmuyor.');
    }
    const { count } = await tx.oAuthJeton.updateMany({
      where: { ozet: j.ozet, iptal: null },
      data: { iptal: simdi },
    });
    if (count === 0) throw new OAuthHatasi('invalid_grant', 'Yenileme jetonu iptal edilmiş.');
    await tx.oAuthIstemci.update({ where: { id: j.istemciId }, data: { sonKullanim: simdi } });
    return jetonCiftiVer(
      {
        istemciId: j.istemciId,
        userId: j.userId,
        kaynak: j.kaynak,
        kapsam: j.kapsam,
        aile: j.aile,
      },
      simdi,
      tx,
    );
  }, ISLEM_SURESI);
}

/* ===========================================================================
 * KAYNAK SUNUCU (MCP)
 * ======================================================================== */

/** Geçerli erişim jetonunun sahibi; geçersiz/süresi dolmuş/başka kaynağa verilmiş → null. */
export async function erisimDogrula(
  jeton: string,
  simdi: Date = new Date(),
  client = db,
): Promise<{ userId: string; istemciId: string } | null> {
  const j = await client.oAuthJeton.findUnique({ where: { ozet: ozet(jeton) } });
  if (!j || j.tur !== 'ERISIM' || j.iptal || j.bitis <= simdi) return null;
  if (j.kaynak !== mcpKaynagi()) return null;
  return { userId: j.userId, istemciId: j.istemciId };
}

/* ===========================================================================
 * AYARLAR — bağlı istemciler
 * ======================================================================== */

export interface BagliIstemci {
  id: string;
  ad: string;
  geriDonus: string;
  createdAt: string;
  sonKullanim: string | null;
  etkin: boolean;
}

export async function fetchBagliIstemciler(
  simdi: Date = new Date(),
  client = db,
): Promise<BagliIstemci[]> {
  const satirlar = await client.oAuthIstemci.findMany({
    where: { jetonlar: { some: {} } },
    orderBy: { createdAt: 'desc' },
    include: {
      jetonlar: {
        where: { tur: 'YENILEME', iptal: null, bitis: { gt: simdi } },
        select: { ozet: true },
        take: 1,
      },
    },
  });
  return satirlar.map((s) => ({
    id: s.id,
    ad: s.ad,
    geriDonus: s.yonlendirmeler[0] ? new URL(s.yonlendirmeler[0]).host : '',
    createdAt: s.createdAt.toISOString(),
    sonKullanim: s.sonKullanim?.toISOString() ?? null,
    etkin: s.jetonlar.length > 0,
  }));
}

/** Bağlantıyı kaldırır: istemcinin bütün jetonları iptal. Claude yeniden bağlanmak için izin ister. */
export async function baglantiyiKaldir(
  istemciId: string,
  simdi: Date = new Date(),
  client = db,
): Promise<{ id: string; iptal: number }> {
  const { count } = await client.oAuthJeton.updateMany({
    where: { istemciId, iptal: null },
    data: { iptal: simdi },
  });
  return { id: istemciId, iptal: count };
}

/** Günlük temizlik için: süresi 7 günden önce dolmuş kod/jeton satırları. */
export async function eskiOAuthKayitlariniSil(simdi: Date = new Date(), client = db) {
  const sinir = new Date(simdi.getTime() - 7 * 24 * 60 * 60_000);
  await client.oAuthKod.deleteMany({ where: { bitis: { lt: sinir } } });
  await client.oAuthJeton.deleteMany({ where: { bitis: { lt: sinir } } });
}
