import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  CONTACT_RATE_LIMIT,
  CONTACT_SPAM_SIGNAL_SCORES,
  CONTACT_SPAM_THRESHOLD,
  CONTACT_TIME_TRAP,
  assessContactSpam,
  contactRateWindowStart,
  isContactRateExceeded,
  issueFormToken,
  noopNotificationAdapter,
  notifyContactMessage,
  resolveContactNotifier,
  verifyFormToken,
  type ContactNotification,
  type NotificationAdapter,
} from '@/server/services/_shared';

/**
 * §8.15 politikası — T-027.
 *
 * Bu dosya SAF tarafı sınar: eşikler, jeton imzası, zaman tuzağı ve spam puanı.
 * Ucun kendisi (`route.ts`) `tests/unit/api/iletisim.test.ts` içinde.
 */

const SIR = 'test-secret-abcdefghijklmnopqrstuvwxyz';
const AN = new Date('2026-08-24T12:00:00.000Z');

/** `AN`'dan `saniye` kadar ÖNCE verilmiş bir jeton. */
function jeton(saniye: number, sir = SIR): string {
  return issueFormToken(new Date(AN.getTime() - saniye * 1000), sir);
}

afterEach(() => {
  vi.restoreAllMocks();
});

/* ======================= HIZ SINIRI — §8.15 eşiği ======================= */

describe('CONTACT_RATE_LIMIT — §8.15 "IP başına saatte 3"', () => {
  it('eşik ve pencere §8.15 metniyle birebir', () => {
    // Bu iki assert kasıtlı olarak "sayıyı tekrar yazıyor": sabitin sessizce
    // değişmesi §8.15'in ihlali olur ve testin kırılması bunu gösterir.
    expect(CONTACT_RATE_LIMIT.maxPerWindow).toBe(3);
    expect(CONTACT_RATE_LIMIT.windowMinutes).toBe(60);
  });

  it('pencere başlangıcı tam bir saat geriye gider', () => {
    expect(contactRateWindowStart(AN).toISOString()).toBe('2026-08-24T11:00:00.000Z');
  });

  it('eşiğin ALTINDA geçer, eşiğE ULAŞINCA reddeder', () => {
    expect(isContactRateExceeded(0)).toBe(false);
    expect(isContactRateExceeded(2)).toBe(false);
    // 3. mesaj kabul edildikten SONRA sayaç 3'tür; 4. istek reddedilir.
    expect(isContactRateExceeded(3)).toBe(true);
    expect(isContactRateExceeded(9)).toBe(true);
  });

  it('giriş sayacından AYRI: eşikler çakışmıyor', async () => {
    const { LOGIN_RATE_LIMIT } = await import('@/lib/security/rate-limit');
    // Ortak sayaç kullanılsaydı bu iki değerin biri diğerini bastırırdı.
    expect(CONTACT_RATE_LIMIT.maxPerWindow).not.toBe(LOGIN_RATE_LIMIT.maxFailures);
    expect(CONTACT_RATE_LIMIT.windowMinutes).not.toBe(LOGIN_RATE_LIMIT.windowMinutes);
  });
});

/* ===================== ZAMAN TUZAĞI — jeton imzası ====================== */

describe('form jetonu — imza', () => {
  it('yeterince beklenmiş geçerli jeton kabul edilir', () => {
    const sonuc = verifyFormToken(jeton(30), AN, SIR);
    expect(sonuc.status).toBe('ok');
    expect(sonuc).toMatchObject({ elapsedSeconds: 30 });
  });

  it('BAŞKA sırla imzalanmış jeton doğrulanamaz', () => {
    expect(verifyFormToken(jeton(30, 'baska-sir'), AN, SIR).status).toBe('unverifiable');
  });

  it('zaman damgası kurcalanınca imza tutmaz — damga imzanın içinde', () => {
    const gecerli = jeton(30);
    const [surum, , imza] = gecerli.split('.');
    // Bot, damgayı geriye çekip "çok bekledim" demeye çalışıyor.
    const sahte = `${surum}.${AN.getTime() - 999_000}.${imza}`;
    expect(verifyFormToken(sahte, AN, SIR).status).toBe('unverifiable');
  });

  it('jeton yoksa, boşsa veya biçimi bozuksa doğrulanamaz', () => {
    for (const kotu of [undefined, null, '', 'abc', 'v1.123', 'v2.123.deadbeef', 'v1.abc.dead']) {
      expect(verifyFormToken(kotu, AN, SIR).status).toBe('unverifiable');
    }
  });

  it('kısa bir imza `timingSafeEqual`i düşürmez, doğrulanamaz döner', () => {
    // Uzunluk kontrolü olmasaydı `timingSafeEqual` FIRLATIRDI ve uç 500 verirdi.
    expect(verifyFormToken(`v1.${AN.getTime() - 30_000}.ab`, AN, SIR).status).toBe('unverifiable');
  });
});

describe('zaman tuzağı — §8.15', () => {
  it('asgari süre dolmadan gönderim "too-fast"', () => {
    expect(verifyFormToken(jeton(0), AN, SIR).status).toBe('too-fast');
    expect(verifyFormToken(jeton(CONTACT_TIME_TRAP.minFillSeconds - 1), AN, SIR).status).toBe(
      'too-fast',
    );
  });

  it('asgari sürenin TAM üstünde kabul edilir — sınır kapsayıcı', () => {
    expect(verifyFormToken(jeton(CONTACT_TIME_TRAP.minFillSeconds), AN, SIR).status).toBe('ok');
  });

  it('GELECEKTEN gelen damga en katı yorumla "too-fast"', () => {
    // İmza geçerli olabilir (sır sızmışsa) ama "bekledi" sayılamaz.
    expect(verifyFormToken(jeton(-600), AN, SIR).status).toBe('too-fast');
  });

  it('çok eski jeton "expired" — ayrı bir durum, hızlı gönderim değil', () => {
    const cokEski = CONTACT_TIME_TRAP.maxAgeMinutes * 60 + 1;
    expect(verifyFormToken(jeton(cokEski), AN, SIR).status).toBe('expired');
  });

  it('asgari süre insan hızının altında kalır (hızlı kullanıcıyı işaretlemez)', () => {
    expect(CONTACT_TIME_TRAP.minFillSeconds).toBeGreaterThan(0);
    expect(CONTACT_TIME_TRAP.minFillSeconds).toBeLessThanOrEqual(5);
  });
});

/* ========================= SPAM PUANI — ADR-020/C11 ===================== */

describe('assessContactSpam — spamScore DOLDURULUYOR', () => {
  const temizJeton = verifyFormToken(jeton(30), AN, SIR);
  const hizli = verifyFormToken(jeton(0), AN, SIR);
  const jetonsuz = verifyFormToken(undefined, AN, SIR);
  const eskimis = verifyFormToken(jeton(CONTACT_TIME_TRAP.maxAgeMinutes * 60 + 1), AN, SIR);

  it('temiz gönderim: puan 0, spam değil, honeypot temiz', () => {
    expect(assessContactSpam({ honeypotFilled: false, tokenVerdict: temizJeton })).toEqual({
      spamScore: 0,
      isSpam: false,
      honeypotHit: false,
      signals: [],
    });
  });

  it('honeypot tek başına eşiği aşar ve honeypotHit yazar', () => {
    const sonuc = assessContactSpam({ honeypotFilled: true, tokenVerdict: temizJeton });
    expect(sonuc.honeypotHit).toBe(true);
    expect(sonuc.isSpam).toBe(true);
    expect(sonuc.spamScore).toBe(CONTACT_SPAM_SIGNAL_SCORES.honeypotFilled);
    expect(sonuc.signals).toContain('honeypotFilled');
  });

  it('zaman tuzağı TEK BAŞINA spam saymaz — puanı yazılır ama eşiğin altında', () => {
    const sonuc = assessContactSpam({ honeypotFilled: false, tokenVerdict: hizli });
    expect(sonuc.spamScore).toBe(CONTACT_SPAM_SIGNAL_SCORES.tooFast);
    expect(sonuc.spamScore).toBeLessThan(CONTACT_SPAM_THRESHOLD);
    expect(sonuc.isSpam).toBe(false);
  });

  it('jetonsuzluk TEK BAŞINA spam saymaz — ağ hatası gerçek müşteriyi susturmasın', () => {
    const sonuc = assessContactSpam({ honeypotFilled: false, tokenVerdict: jetonsuz });
    expect(sonuc.spamScore).toBe(CONTACT_SPAM_SIGNAL_SCORES.tokenUnverifiable);
    expect(sonuc.isSpam).toBe(false);
  });

  it('jetonsuz + hızlı BİRLİKTE eşiği aşar', () => {
    const jetonsuzVeHizli = assessContactSpam({
      honeypotFilled: false,
      // Jeton doğrulanamadığında geçen süre bilinemez; "unverifiable" tek sinyal.
      tokenVerdict: jetonsuz,
    });
    expect(jetonsuzVeHizli.spamScore).toBeLessThan(CONTACT_SPAM_THRESHOLD);

    const ikisi = assessContactSpam({ honeypotFilled: true, tokenVerdict: hizli });
    expect(ikisi.spamScore).toBe(
      CONTACT_SPAM_SIGNAL_SCORES.honeypotFilled + CONTACT_SPAM_SIGNAL_SCORES.tooFast,
    );
    expect(ikisi.isSpam).toBe(true);
  });

  it('eskimiş jeton PUAN GETİRMEZ — açık unutulmuş sekme spam kanıtı değil', () => {
    const sonuc = assessContactSpam({ honeypotFilled: false, tokenVerdict: eskimis });
    expect(sonuc.spamScore).toBe(0);
    expect(sonuc.isSpam).toBe(false);
  });
});

/* ===================== BİLDİRİM ADAPTÖRÜ — §4.2 ========================= */

const BILDIRIM: ContactNotification = {
  messageId: 'msj_1',
  name: 'Ada',
  email: 'ada@ornek.com',
  subject: 'Merhaba',
  message: 'Bir işim var.',
  sourcePage: '/iletisim',
  receivedAt: AN,
  isSpam: false,
};

describe('bildirim adaptörü — başarısızlık akışı DURDURMAZ', () => {
  it('başarılı adaptör delivered:true döner', async () => {
    const gonderilen: ContactNotification[] = [];
    const adaptor: NotificationAdapter = {
      name: 'test',
      send: (n) => {
        gonderilen.push(n);
        return Promise.resolve();
      },
    };

    await expect(notifyContactMessage(BILDIRIM, adaptor)).resolves.toEqual({
      delivered: true,
      adapter: 'test',
    });
    expect(gonderilen).toHaveLength(1);
  });

  it('FIRLATAN adaptör: hata yutulmaz ama YAYILMAZ — delivered:false', async () => {
    const hata = vi.spyOn(console, 'error').mockImplementation(() => {});
    const patlayan: NotificationAdapter = {
      name: 'patlayan',
      send: () => Promise.reject(new Error('SMTP 500')),
    };

    // Fırlatsaydı route handler'ın `await`i 500'e düşerdi ve kaydedilmiş bir
    // mesaj için kullanıcıya hata dönerdi — kabul kriterinin tam tersi.
    await expect(notifyContactMessage(BILDIRIM, patlayan)).resolves.toEqual({
      delivered: false,
      adapter: 'patlayan',
    });
    expect(hata).toHaveBeenCalledOnce();
  });

  it('§8.20 — hata logunda HAM E-POSTA yok', async () => {
    const hata = vi.spyOn(console, 'error').mockImplementation(() => {});
    await notifyContactMessage(BILDIRIM, {
      name: 'patlayan',
      send: () => Promise.reject(new Error('SMTP 500')),
    });

    const satir = hata.mock.calls.flat().map(String).join(' ');
    expect(satir).not.toContain(BILDIRIM.email);
    expect(satir).not.toContain('ada@');
    expect(satir).toContain(BILDIRIM.messageId);
  });

  it('varsayılan adaptör noop — sağlayıcı yokken de akış tamamlanır', async () => {
    const uyari = vi.spyOn(console, 'warn').mockImplementation(() => {});
    await expect(notifyContactMessage(BILDIRIM)).resolves.toEqual({
      delivered: true,
      adapter: 'noop',
    });
    // SESSİZ DEĞİL: gönderilmediği loga yazılır. Sessiz bir no-op, "bildirim
    // gelmiyor" sorununu üretimde haftalarca görünmez kılardı.
    expect(uyari).toHaveBeenCalledOnce();
    // §8.20 — bu satırda da ham e-posta yok.
    expect(uyari.mock.calls.flat().map(String).join(' ')).not.toContain(BILDIRIM.email);
  });

  it('F7 öncesi yürürlükteki adaptör noop — sağlayıcı seçimi (Q2) açık', () => {
    expect(resolveContactNotifier({}).name).toBe('noop');
    expect(resolveContactNotifier({ RESEND_API_KEY: 'x' })).toBe(noopNotificationAdapter);
  });
});
