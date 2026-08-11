/**
 * Para hesapları — ADR-014.
 *
 * KAYAN NOKTA YASAK. `1250.00 * 34.12345678` IEEE-754'te kuruş sapması üretir
 * ve bu sapma aylık toplamlarda birikir. Tüm çarpım tamsayı (BigInt) üzerinden
 * yapılır: tutar kuruşa (10^2), kur 10^8'e ölçeklenir.
 *
 * Para DEĞERLERİ SERVİS SINIRINDA DAİMA `string`'dir (ADR-014) — `number`'a
 * hiçbir noktada çevrilmez.
 */

/** `Decimal(12,2)` — 10 tam basamak + 2 ondalık. */
const MONEY_PATTERN = /^-?\d{1,10}(?:\.\d{1,2})?$/;
/** `Decimal(18,8)` — 10 tam basamak + 8 ondalık. */
const RATE_PATTERN = /^\d{1,10}(?:\.\d{1,8})?$/;

const MONEY_SCALE = 2;
const RATE_SCALE = 8;

/** `"12.5"` → `1250n` (scale 2). Ondalık kısım kırpılmaz, sağa sıfırla doldurulur. */
function toScaledInt(value: string, scale: number): bigint {
  const negative = value.startsWith('-');
  const unsigned = negative ? value.slice(1) : value;
  const [whole = '0', fraction = ''] = unsigned.split('.');
  const padded = fraction.padEnd(scale, '0').slice(0, scale);
  const magnitude = BigInt(whole + padded);
  return negative ? -magnitude : magnitude;
}

/** `1250n` (scale 2) → `"12.50"`. */
function fromScaledInt(value: bigint, scale: number): string {
  const negative = value < 0n;
  const magnitude = negative ? -value : value;
  const divisor = 10n ** BigInt(scale);
  const whole = magnitude / divisor;
  const fraction = (magnitude % divisor).toString().padStart(scale, '0');
  return `${negative ? '-' : ''}${whole}.${fraction}`;
}

/**
 * `baseAmount = amount × fxRate` — ADR-014.
 *
 * Sonuç 2 ondalığa YARIM YUKARI yuvarlanır (kuruş). Bankacılık yuvarlaması
 * (banker's rounding) tercih edilmedi: kullanıcı elle kur giriyor ve beklenen
 * davranış okul yuvarlaması; ayrıca §6 tek kullanıcılı bir defter, istatistiksel
 * sapma kaygısı yok.
 *
 * @throws Girdi biçimi `Decimal(12,2)` / `Decimal(18,8)` sınırlarına uymuyorsa.
 */
export function computeBaseAmount(amount: string, fxRate: string): string {
  if (!MONEY_PATTERN.test(amount)) {
    throw new Error(`Geçersiz tutar: "${amount}". En fazla 2 ondalık basamak.`);
  }
  if (!RATE_PATTERN.test(fxRate)) {
    throw new Error(`Geçersiz kur: "${fxRate}". En fazla 8 ondalık basamak.`);
  }

  const scaledAmount = toScaledInt(amount, MONEY_SCALE);
  const scaledRate = toScaledInt(fxRate, RATE_SCALE);

  const product = scaledAmount * scaledRate; // ölçek: 10^(2+8)
  const divisor = 10n ** BigInt(RATE_SCALE);

  // Yarım yukarı yuvarlama, işaret korunarak
  const negative = product < 0n;
  const magnitude = negative ? -product : product;
  const rounded = (magnitude + divisor / 2n) / divisor;

  return fromScaledInt(negative ? -rounded : rounded, MONEY_SCALE);
}

/** Para dizelerini kuruş hassasiyetinde toplar. Boş liste `"0.00"` döner. */
export function sumMoney(values: readonly string[]): string {
  let total = 0n;
  for (const value of values) {
    if (!MONEY_PATTERN.test(value)) {
      throw new Error(`Geçersiz tutar: "${value}".`);
    }
    total += toScaledInt(value, MONEY_SCALE);
  }
  return fromScaledInt(total, MONEY_SCALE);
}

/** `a - b`. Job bakiyesi gibi türetilmiş tutarlarda kullanılır (ADR-014). */
export function subtractMoney(a: string, b: string): string {
  return sumMoney([a, negateMoney(b)]);
}

function negateMoney(value: string): string {
  return value.startsWith('-') ? value.slice(1) : `-${value}`;
}
