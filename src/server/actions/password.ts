'use server';

import { changePasswordSchema } from '@/lib/schemas';
import { changePassword, type ChangePasswordFailure } from '@/server/auth/change-password';
import { db } from '@/server/db';
import {
  fail,
  notFound,
  ok,
  parseOrFail,
  writeAuditLog,
  type ApiFailure,
  type ApiResponse,
} from '@/server/services/_shared';

import { currentActorId, toFailure, unauthorized } from './_shared';

/**
 * Şifre değiştirme Server Action'ı — §7.1, §8.1, §8.6, §8.20, ADR-022.
 *
 * §7.1 SIRASI: `auth()` → Zod → servis → `AuditLog` → **revalidate YOK**.
 *
 * Son adım neden yok: şifre hiçbir public okumayı ve hiçbir önbellek girdisini
 * etkilemiyor. `ContentEntity` birleşiminde `User` yok, `cached.ts`'teki hiçbir
 * okuma `User` tablosuna bakmıyor, panel rotaları dinamik. T-038'in kuralı
 * burada da geçerli: kopyalanmayacak adımı işaretlemek kalıbın parçası.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ DİĞER OTURUMLAR KAPANMIYOR — KULLANICIYA BU SÖZ VERİLMEMELİ
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * ADR-013 JWT stratejisi seçti: sunucuda oturum kaydı YOK. Şifre değişse bile
 * daha önce dağıtılmış JWT'ler süreleri dolana kadar (7 gün, §8.3) GEÇERLİ
 * KALIR. Yani şifre değiştirmek ELE GEÇİRİLMİŞ BİR OTURUMU KAPATMAZ.
 *
 * Bu bir eksiklik değil, ölçülmüş bir sınır — ayrıntı ve neden bu turda
 * kapatılamadığı raporda. Arayüz "tüm cihazlardan çıkış yapıldı" ya da
 * "diğer oturumlar sonlandırıldı" DEMEMELİ; tutulamayacak bir sözdür
 * (T-034'ün "410" dersi). Söylenebilecek doğru cümle: "Şifreniz değiştirildi."
 */

/** Servis sebebini §7.2 zarfına çevirir — `fields` FORM ALAN ADLARIYLA birebir. */
function toApiFailure(reason: ChangePasswordFailure): ApiFailure {
  switch (reason) {
    case 'USER_NOT_FOUND':
      // Oturum geçerli ama kullanıcı kaydı yok. UNAUTHORIZED değil: oturum
      // sahteliği değil, veri tutarsızlığı.
      return notFound('Kullanıcı kaydı bulunamadı.');

    case 'INVALID_CURRENT_PASSWORD':
      /*
       * `UNAUTHORIZED` DEĞİL, alan hatası. Oturum GEÇERLİ; yanlış olan bir form
       * alanı. `UNAUTHORIZED` dönmek Frontend'i kullanıcıyı giriş ekranına
       * atmaya iterdi — oysa kullanıcının yapması gereken tek şey alanı
       * düzeltmek.
       */
      return fail('VALIDATION_ERROR', 'Mevcut şifreniz yanlış.', {
        currentPassword: 'Mevcut şifreniz yanlış.',
      });

    case 'TOTP_REQUIRED':
      return fail('VALIDATION_ERROR', 'Doğrulama kodu gerekli.', {
        totpCode: 'Hesabınızda iki adımlı doğrulama açık; kodu girin.',
      });

    case 'INVALID_TOTP':
      return fail('VALIDATION_ERROR', 'Doğrulama kodu geçersiz.', {
        totpCode: 'Kod geçersiz veya süresi dolmuş.',
      });

    case 'SAME_PASSWORD':
      return fail('VALIDATION_ERROR', 'Yeni şifre mevcut şifreyle aynı olamaz.', {
        newPassword: 'Yeni şifre mevcut şifreyle aynı olamaz.',
      });
  }
}

/**
 * Başarısız bir şifre değiştirme denemesini kaydeder — ADR-022 okuması.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * NEDEN `LoginAttempt` DEĞİL
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * ADR-022: "`LoginAttempt` her GİRİŞ denemesini, `AuditLog` denemenin yol
 * açtığı KALICI DURUM DEĞİŞİKLİĞİNİ kaydeder." Buradaki olay ikisine de tam
 * oturmuyor: giriş denemesi değil (oturum açılmıyor, zaten açık) ve kalıcı bir
 * durum değişikliği de değil (hiçbir şey değişmedi).
 *
 * Ama `LoginAttempt`in ÖLÇÜLEBİLİR bir yan etkisi var ve kararı o belirliyor:
 * o tablo §8.4 hız sınırının VERİ KAYNAĞI ve sayım IP başına yapılıyor. Şifre
 * değiştirirken beş kez yanlış yazmak, kullanıcıyı KENDİ GİRİŞİNDEN 15 dakika
 * kilitlerdi — yanlış yarıçapta bir ceza, ve kendi kendine DoS.
 *
 * Bu tam olarak T-015b'de kurulum hız sınırı için verilen kararın aynısı:
 * "kurulum fumbling'i hesabı kilitlememeli" denip sayaç `AuditLog`a alınmıştı.
 * `actions/totp.ts`'teki `recordTotpFailure` da aynı kalıbı izliyor. Yani
 * kod tabanının bu sınıf için zaten bir cevabı var ve tutarlı kalıyorum.
 *
 * `LOGIN_FAILED` seçildi: `AuditAction` içinde şifre değiştirmeye özel bir
 * değer yok ve eklemek migration gerektirir. Ayırt edici bilgi `diff.context`.
 *
 * ASLA FIRLATMAZ — `writeAuditLog`un sözleşmesi bu.
 */
async function recordFailedAttempt(userId: string, reason: ChangePasswordFailure): Promise<void> {
  await writeAuditLog(
    {
      actorId: userId,
      action: 'LOGIN_FAILED',
      entity: 'User',
      entityId: userId,
      /*
       * §8.20 — `diff`e YALNIZCA sebep kodu giriyor. Ne girilen şifre, ne
       * uzunluğu, ne ilk harfi, ne de bir parçası. `redactAuditDiff` alan adı
       * bazlı çalışır ve `password` anahtarını maskelerdi; ama T-038'in dersi
       * tam olarak buydu: FARKLI ADLI bir anahtara konan sır maskelenmez.
       * Tek güvenilir koruma sırrı diff'e HİÇ KOYMAMAK.
       */
      diff: { context: 'CHANGE_PASSWORD', reason },
    },
    db,
  );
}

export async function changePasswordAction(raw: unknown): Promise<ApiResponse<null>> {
  const actorId = await currentActorId();
  if (!actorId) return unauthorized();

  const parsed = parseOrFail(changePasswordSchema, raw);
  if (!parsed.ok) return parsed.failure;

  try {
    const sonuc = await changePassword(actorId, parsed.data);

    if (!sonuc.ok) {
      // Başarısız kimlik adımları kaydedilir; şema hataları (zayıf şifre,
      // tekrar uyuşmazlığı) kaydedilmez — onlar bir saldırı sinyali değil,
      // yazım hatasıdır ve denetim kaydını gürültüyle doldururlardı.
      if (sonuc.reason === 'INVALID_CURRENT_PASSWORD' || sonuc.reason === 'INVALID_TOTP') {
        await recordFailedAttempt(actorId, sonuc.reason);
      }
      return toApiFailure(sonuc.reason);
    }

    await writeAuditLog(
      {
        actorId,
        action: 'UPDATE',
        entity: 'User',
        entityId: actorId,
        /*
         * §8.20 — ŞİFRE HİÇBİR BİÇİMDE YAZILMIYOR: ne eski, ne yeni, ne hash,
         * ne parçası. `buildDiff` KULLANILMADI çünkü önce/sonra değerlerini
         * taşımak burada şifreyi taşımak demek olurdu. Denetim kaydının
         * cevaplaması gereken soru "şifre ne zaman, kim tarafından değişti" —
         * yeni şifrenin NE OLDUĞU değil.
         */
        diff: { context: 'CHANGE_PASSWORD', changed: 'passwordHash' },
      },
      db,
    );

    // `data: null` — dönecek bir şey YOK ve olmamalı. Kullanıcı nesnesi
    // döndürmek, hiçbir işe yaramadan hassas alanları yanıta taşıma riski açar.
    return ok(null);
  } catch (error) {
    return toFailure('password:change', error);
  }
}
