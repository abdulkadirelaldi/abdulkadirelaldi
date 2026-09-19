import type { ChangePasswordInput } from '@/lib/schemas';
import { db } from '@/server/db';

import { verifyTotpWithRecovery, type TotpConsumerClient } from './credentials';
import { hashPassword, verifyPassword } from './password';

/**
 * Şifre değiştirme — §8.1'in eksik kalan yarısı (T-042s, Q8).
 *
 * F1'de kripto primitifleri (`hashPassword`/`verifyPassword`/`needsRehash`) ve
 * 2FA yazıldı ama şifreyi DEĞİŞTİRMENİN hiçbir yolu yoktu; şifre yalnızca seed
 * ile konuyordu.
 *
 * Bu modül `AuditLog` YAZMAZ ve oturuma dokunmaz — ikisi de action'ın işi
 * (§7.1). Servis yalnızca doğrular ve yazar.
 *
 * §8.20: Buradaki hiçbir satır şifreyi, hash'i veya parçasını LOGLAMAZ.
 */

/** Akışın Prisma'dan ihtiyaç duyduğu asgari kullanıcı alanları. */
export interface ChangePasswordUserRecord {
  id: string;
  passwordHash: string;
  totpSecret: string | null;
  /** `null` = 2FA kurulumu tamamlanmamış (ADR-013). İkinci faktör kararı buna bakar. */
  totpConfirmedAt: Date | null;
  totpBackupCodes: string[];
}

export interface ChangePasswordClient extends TotpConsumerClient {
  user: {
    findUnique(args: { where: { id: string } }): Promise<ChangePasswordUserRecord | null>;
    update(args: {
      where: { id: string };
      data: { passwordHash?: string; totpBackupCodes?: string[] };
    }): Promise<unknown>;
  };
}

/**
 * Başarısızlık sebepleri.
 *
 * Action bunları §7.2 zarfına çevirir. Servis HTTP kodu ya da kullanıcı metni
 * bilmez — o eşleme sunum kararıdır ve tek yerde (`actions/password.ts`) durur.
 */
export type ChangePasswordFailure =
  /** Oturum var ama kullanıcı kaydı yok (silinmiş hesap). */
  | 'USER_NOT_FOUND'
  | 'INVALID_CURRENT_PASSWORD'
  /** Hesapta 2FA kurulu ve kod gönderilmemiş. */
  | 'TOTP_REQUIRED'
  | 'INVALID_TOTP'
  /** Yeni şifre saklanan hash'le eşleşiyor — yani değişen bir şey yok. */
  | 'SAME_PASSWORD';

export type ChangePasswordResult = { ok: true } | { ok: false; reason: ChangePasswordFailure };

/**
 * Şifreyi değiştirir.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * SIRA ÖNEMLİ — ÖNCE KİMLİK, SONRA İKİNCİ FAKTÖR, EN SON YAZMA
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * 1. MEVCUT ŞİFRE (§8.4 gerekçesi): oturumu ele geçiren biri şifreyi
 *    değiştirip KALICI erişim kuramamalı. Oturum çerezi 7 gün geçerli (§8.3),
 *    yani "zaten giriş yapmış" olmak taze bir kimlik kanıtı değildir.
 *
 * 2. İKİNCİ FAKTÖR — bkz. aşağıdaki blok.
 *
 * 3. YENİ ŞİFRE ESKİSİYLE AYNI OLAMAZ, ve bu SAKLANAN HASH'e karşı ölçülür.
 *    Şemada da bir karşılaştırma var (`currentPassword !== newPassword`) ama o
 *    istemcide de koşan bir KOLAYLIK; sunucu istemcide koşan bir kurala
 *    güvenemez. Buradaki kontrol yetkilidir.
 *
 * Kurtarma kodu TÜKETİLİR (`verifyTotpWithRecovery` yapıyor) — şifre değiştirme
 * de tıpkı giriş gibi kodu harcar, yoksa kalıcı bir arka kapıya dönüşürdü.
 */
export async function changePassword(
  userId: string,
  input: ChangePasswordInput,
  client: ChangePasswordClient = db,
): Promise<ChangePasswordResult> {
  const user = await client.user.findUnique({ where: { id: userId } });
  if (!user) return { ok: false, reason: 'USER_NOT_FOUND' };

  if (!(await verifyPassword(user.passwordHash, input.currentPassword))) {
    return { ok: false, reason: 'INVALID_CURRENT_PASSWORD' };
  }

  /*
   * ═══════════════════════════════════════════════════════════════════════
   * İKİNCİ FAKTÖR İSTENİYOR — AMA YALNIZCA KURULUYSA
   * ═══════════════════════════════════════════════════════════════════════
   *
   * KARAR: 2FA kodu İSTENİR. Gerekçe tehdit modelinden çıkıyor, "§8.1 zorunlu
   * kıldı" gibi bir otoriteden değil:
   *
   *   Oturum çalınmış, şifre bilinmiyor  → mevcut şifre şartı zaten durduruyor;
   *                                        2FA burada bir şey eklemiyor.
   *   Oturum ÇALINMIŞ VE şifre SIZMIŞ    → mevcut şifre şartı GEÇİLİR. Geriye
   *                                        kalan tek engel ikinci faktördür.
   *
   * İkinci senaryo bileşik ama gerçek: çerez hırsızlığı (XSS) ile şifre
   * sızıntısı (yeniden kullanım, oltalama) bağımsız olaylardır. Ve "kullanıcı
   * zaten 2FA ile giriş yaptı" savunması burada zayıf, çünkü o giriş YEDİ GÜN
   * ÖNCE olmuş olabilir (§8.3). Kimlik bilgisini değiştiren bir işlemde cihaz
   * sahipliğini O AN yeniden kanıtlatmak standart adım-yükseltme (step-up)
   * pratiğidir ve maliyeti tek bir kod girişidir.
   *
   * KURULU DEĞİLSE İSTENMEZ: `totpConfirmedAt` boşken kod şart koşmak, 2FA
   * kurulumunu henüz bitirmemiş kullanıcıyı şifresini DEĞİŞTİREMEZ hâle
   * getirirdi — üstelik §8.1 gereği panel zaten kurulum ekranına yönlendiriyor,
   * yani bu dal pratikte yalnızca kurulum penceresinde görülür. Olmayan bir
   * faktörü istemek, güvenlik eklemeden kilitlenme üretirdi.
   *
   * TELEFONUNU KAYBEDENİN YOLU AÇIK: `verifyTotpWithRecovery` kurtarma kodunu
   * da kabul ediyor (ADR-013), yani kod şartı kullanıcıyı hesabından etmiyor.
   */
  if (user.totpConfirmedAt) {
    if (!input.totpCode) return { ok: false, reason: 'TOTP_REQUIRED' };
    if (!(await verifyTotpWithRecovery(user, input.totpCode, client))) {
      return { ok: false, reason: 'INVALID_TOTP' };
    }
  }

  if (await verifyPassword(user.passwordHash, input.newPassword)) {
    return { ok: false, reason: 'SAME_PASSWORD' };
  }

  await client.user.update({
    where: { id: userId },
    data: { passwordHash: await hashPassword(input.newPassword) },
  });

  return { ok: true };
}
