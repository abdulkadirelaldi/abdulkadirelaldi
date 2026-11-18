import { createHash, timingSafeEqual } from 'node:crypto';

/**
 * CLAUDE BAĞLAYICISI — OAuth kuralları (ADR-056). SAF: veritabanına dokunmaz, testte doğrudan sınanır.
 */

/** Barındırılan Claude uygulamalarının (web, masaüstü, mobil) tek geri dönüş adresi. */
export const CLAUDE_GERI_DONUS = 'https://claude.ai/api/mcp/auth_callback';

/** `localhost` ya da `127.0.0.1`, herhangi bir port, `/callback` — Claude Code (RFC 8252). */
const YEREL = /^http:\/\/(localhost|127\.0\.0\.1)(:\d{1,5})?\/callback$/;

/**
 * İstemci kaydına (DCR) izin verilen yönlendirmeler. Açık kayıt herkese açık bir uç; bu liste
 * olmasa biri kendi sitesini "Claude" diye kaydedip sahibini sahte bir izin ekranına çekebilirdi.
 */
export function yonlendirmeKaydaUygun(uri: string): boolean {
  return uri === CLAUDE_GERI_DONUS || YEREL.test(uri);
}

/** Yerel adreste port yok sayılır (RFC 8252 §7.3); geri kalanında birebir eşleşme. */
export function yonlendirmeEslesir(kayitli: readonly string[], gelen: string): boolean {
  if (kayitli.includes(gelen)) return true;
  const g = YEREL.exec(gelen);
  if (!g) return false;
  return kayitli.some((k) => {
    const m = YEREL.exec(k);
    return m !== null && m[1] === g[1];
  });
}

export function ozet(deger: string): string {
  return createHash('sha256').update(deger).digest('hex');
}

/** PKCE S256: BASE64URL(SHA256(verifier)) === challenge, sabit zamanlı. */
export function pkceDogrula(dogrulayici: string, sinama: string): boolean {
  if (!/^[A-Za-z0-9\-._~]{43,128}$/.test(dogrulayici)) return false;
  const hesap = Buffer.from(createHash('sha256').update(dogrulayici).digest('base64url'));
  const beklenen = Buffer.from(sinama);
  return hesap.length === beklenen.length && timingSafeEqual(hesap, beklenen);
}

export function siteAdresi(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000').replace(/\/$/, '');
}

/** MCP sunucusunun kanonik adresi (RFC 8707 `resource`) — jetonlar YALNIZCA buna verilir. */
export function mcpKaynagi(): string {
  return `${siteAdresi()}/api/v1/mcp`;
}

export const KAPSAM = 'panel';
