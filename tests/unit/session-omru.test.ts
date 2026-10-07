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

/**
 * KAPININ KÖR NOKTASI — T-048g'de ölçüldü ve kapatıldı.
 *
 * Yukarıdaki taramanın tamamı `src/server/auth.ts`e bakıyor. ADR-035/A ömrü
 * 7 günden 24 saate indirdiğinde o dosya güncellendi, kapı yeşil kaldı — ve
 * `tests/e2e/_helpers/session.ts` **7 gün üretmeye devam etti**. Hiçbir test
 * kırılmadı çünkü kimse oraya bakmıyordu.
 *
 * Zararı "yalnızca testte" diye küçümsemek yanlış olurdu: E2E paketi, üretimde
 * ARTIK ÜRETİLEMEYEN bir jeton biçimiyle koşuyordu. Ölçülen ortam ile gerçek
 * ortam arasındaki sessiz sapma, bu deponun defalarca adını koyduğu sınıf
 * (bayat öncül) — bu kez kendi test altyapımızda.
 *
 * Bu blok o boşluğu kapatıyor: kapı artık ÜRETİM sabitini ve TEST jetonunu
 * BİRLİKTE tarıyor.
 */
describe('§8.3 — E2E yardımcısı da 24 saat üretiyor (T-048g)', () => {
  const E2E_KAYNAK = readFileSync(
    join(resolve(__dirname, '../..'), 'tests/e2e/_helpers/session.ts'),
    'utf8',
  );
  const E2E_KOD = E2E_KAYNAK.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/\/\/.*$/gm, ' ');

  it('tarama çalışıyor — yardımcı gerçekten okundu', () => {
    // Sahte yeşil koruması: dosya taşınırsa/adı değişirse burası önce kırılır.
    expect(E2E_KOD).toContain('maxAge');
    expect(E2E_KOD).toContain('encode');
  });

  it('varsayılan ömür 24 saat', () => {
    expect(E2E_KOD).toMatch(/maxAge:\s*input\.maxAgeSeconds\s*\?\?\s*24\s*\*\s*60\s*\*\s*60/);
  });

  it('ESKİ 7 günlük değer yardımcıda KALMADI', () => {
    expect(E2E_KOD).not.toMatch(/7\s*\*\s*24\s*\*\s*60\s*\*\s*60/);
    expect(E2E_KOD).not.toMatch(/604800/);
  });
});
