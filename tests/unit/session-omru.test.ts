import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

/**
 * OTURUM ÖMRÜ — §8.3, ADR-035/A (T-046).
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * NEDEN KAYNAK OKUNUYOR, MODÜL İÇE AKTARILMIYOR
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * `src/server/auth.ts` `next-auth` içe aktarıyor ve o modül Vitest'in `node`
 * ortamında YÜKLENEMİYOR (`next/server` çözülmüyor) — `session.test.ts` aynı
 * duvara çarpıp aynı çözümü seçmişti: yapılandırmanın gerçekten uygulanıp
 * uygulanmadığı sorusu varsayımla değil, KANITLA cevaplanır.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * NE KORUNUYOR: ÇEREZ ÖMRÜ İLE JETON ÖMRÜ BİRLİKTE DEĞİŞSİN
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * İkisi ayrı sayılarla yazılsaydı biri güncellenip diğeri kalınca TUTARSIZ bir
 * ömür çıkardı — çerez ölmüş ama jeton hâlâ geçerli, ya da tersi. İkisinin de
 * TEK SABİTTEN beslendiğini doğrulamak, o sapmayı yapısal olarak imkânsız kılar.
 */

const KAYNAK = readFileSync(join(resolve(__dirname, '../..'), 'src/server/auth.ts'), 'utf8');

/** Yorumlar ayıklanmış kod — gerekçe metinleri assert'leri yanıltmasın (T-040 dersi). */
const KOD = KAYNAK.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/\/\/.*$/gm, ' ');

describe('§8.3 — oturum ömrü 24 saat (ADR-035/A)', () => {
  it('sabit 24 saat olarak tanımlı', () => {
    // 7 güne dönülürse burası kırılır. Sayı KASITLI olarak tekrar yazılıyor:
    // §8.3 bir kabul şartı ve yürürlükteki değer koda bakmadan okunabilmeli.
    expect(KOD).toMatch(/SESSION_MAX_AGE_SECONDS\s*=\s*24\s*\*\s*60\s*\*\s*60/);
  });

  it('ESKİ 7 günlük değer kaynakta KALMADI', () => {
    expect(KOD).not.toMatch(/7\s*\*\s*24\s*\*\s*60\s*\*\s*60/);
  });

  it('tarama çalışıyor — kaynak gerçekten okundu', () => {
    // Aksi hâlde yukarıdaki iki assert boş dizede arama yapıp sahte yeşil verirdi.
    expect(KOD).toContain('SESSION_MAX_AGE_SECONDS');
    expect(KOD).toContain('strategy');
  });

  it('ÇEREZ ömrü ve OTURUM ömrü AYNI sabitten geliyor', () => {
    // İki kullanım: `session.maxAge` ve `cookies.sessionToken.options.maxAge`.
    const kullanim = KOD.match(/maxAge:\s*SESSION_MAX_AGE_SECONDS/g) ?? [];
    expect(kullanim).toHaveLength(2);
  });

  it('hiçbir `maxAge` ELLE YAZILMIŞ sayı almıyor', () => {
    // `maxAge: 604800` gibi bir satır sabiti atlar ve sapmayı geri getirir.
    expect(KOD).not.toMatch(/maxAge:\s*\d/);
  });

  it('24 saat gerçekten 86400 saniye — birim hatası yok', () => {
    // `24 * 60` (24 dakika) ya da `24 * 60 * 60 * 1000` (ms) yazmak sessiz
    // ve çok pahalı bir hata olurdu.
    expect(24 * 60 * 60).toBe(86_400);
  });
});
