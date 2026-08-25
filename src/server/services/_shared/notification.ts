/**
 * Bildirim ADAPTÖRÜ — §4.2, §12 (`RESEND_API_KEY`, `CONTACT_NOTIFY_EMAIL`).
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * NEDEN ADAPTÖR — VE NEDEN SAĞLAYICI YOK
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * §4.2 mesaj kutusunu tanımlıyor: gereksinim mesajın VERİTABANINA yazılmasıdır.
 * E-posta bildirimi bir KOLAYLIK — panel açıldığında mesaj zaten orada. Bu
 * yüzden form, mail hiç kurulmamışken de tam çalışır ve sağlayıcı seçimi (Q2)
 * F7'ye kalabilir: bu dosya hiçbir sağlayıcıya bağımlılık İÇE AKTARMAZ,
 * `package.json`'a paket eklenmez.
 *
 * F7'DE YAPILACAK TEK ŞEY: `NotificationAdapter` uygulayan bir modül yazmak ve
 * `resolveContactNotifier`'ın döndürdüğü değeri onunla değiştirmek. Çağıran
 * taraf (route handler) değişmez.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * BAŞARISIZLIK AKIŞI DURDURMAZ
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * T-013b/K5'in mantığı: hangi başarısızlığın akışı durduracağını ayırt et.
 * Bildirim bir GÜVENLİK SINIRI DEĞİLDİR — mesaj kaydedildikten sonra çalışır ve
 * çökmesi hiçbir kuralı ihlal etmez. Buna karşılık kullanıcıya hata döndürmek
 * gerçek bir zarar üretir: mesajı KAYDEDİLMİŞ olan ziyaretçi başarısız sandığı
 * için formu tekrar doldurur, hız sınırını kendi üstüne çeker ve panelde
 * yinelenen kayıt oluşur.
 *
 * Bu yüzden `notifyContactMessage` ASLA FIRLATMAZ — ama sessizce de yutmaz:
 * `delivered: false` döner ve olay loga yazılır.
 *
 * §8.20: bu modül HAM E-POSTA LOGLAMAZ. Adres yükün içindedir (sağlayıcının
 * "yanıtla" için ihtiyacı var), ama log satırlarına yalnızca `messageId` ve
 * adaptör adı girer.
 *
 * Modül SAFTIR (`next/*` yok) — kapı testinin saf tarafında.
 */

/** Bildirimin taşıdığı bilgi. Prisma satırı DEĞİL: adaptör veritabanı şeklini bilmez. */
export interface ContactNotification {
  /** `ContactMessage.id` — logda kullanılabilecek TEK tanımlayıcı (§8.20). */
  messageId: string;
  name: string;
  /** Ziyaretçinin adresi — sağlayıcı "yanıtla" için kullanır. LOGA YAZILMAZ. */
  email: string;
  subject: string | null;
  message: string;
  sourcePage: string | null;
  receivedAt: Date;
  /** Spam işaretliyse bildirim yine gönderilir; alıcı bunu bilerek okusun. */
  isSpam: boolean;
}

export interface NotificationAdapter {
  /** Log satırlarında görünen ad — hangi adaptörün yürürlükte olduğu görülebilsin. */
  readonly name: string;
  send(notification: ContactNotification): Promise<void>;
}

/**
 * Sağlayıcı kurulmadığında yürürlükte olan adaptör.
 *
 * SESSİZ DEĞİL: gönderilmediğini loga yazar. Sessiz bir no-op, üretimde
 * "bildirim gelmiyor" sorununu haftalarca görünmez kılardı — mesaj panelde
 * durduğu için hiçbir şey kırılmış görünmez.
 */
export const noopNotificationAdapter: NotificationAdapter = {
  name: 'noop',
  send(notification) {
    // `warn`, `info` değil: ESLint yapılandırması yalnızca `warn`/`error`a izin
    // veriyor ve seviye zaten doğru — bu, üretimde fark edilmesi GEREKEN bir durum.
    console.warn(
      `[iletisim] bildirim sağlayıcısı kurulu değil, atlandı (mesaj=${notification.messageId})`,
    );
    return Promise.resolve();
  },
};

export type NotificationEnv = Record<string, string | undefined>;

/**
 * Yürürlükteki adaptörü seçer.
 *
 * BUGÜN HER ZAMAN `noop` DÖNER — sağlayıcı seçimi (Q2) F7'de yapılacak. İmza
 * şimdiden burada olsun ki route handler F7'de DEĞİŞMESİN: o turda yalnızca bu
 * fonksiyonun gövdesine bir dal eklenecek (`env.RESEND_API_KEY` varsa Resend
 * adaptörü, yoksa `noop`).
 *
 * `env` parametre olarak alınıyor — modül yüklenirken `process.env` okumak,
 * testin ortam değişkeni kurmasını zorunlu kılardı.
 */
export function resolveContactNotifier(
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- F7'de okunacak; imza şimdiden sabit.
  env: NotificationEnv = process.env,
): NotificationAdapter {
  return noopNotificationAdapter;
}

export interface NotifyResult {
  delivered: boolean;
  adapter: string;
}

/**
 * Bildirimi gönderir. ASLA FIRLATMAZ.
 *
 * Çağıran taraf sonucu göz ardı EDEBİLİR; dönüş değeri yalnızca test ve
 * gelecekte bir yeniden deneme kuyruğu için var.
 */
export async function notifyContactMessage(
  notification: ContactNotification,
  adapter: NotificationAdapter = noopNotificationAdapter,
): Promise<NotifyResult> {
  try {
    await adapter.send(notification);
    return { delivered: true, adapter: adapter.name };
  } catch (error) {
    // §8.20 — ham e-posta YOK; yalnızca kayıt kimliği ve hata metni.
    console.error(
      `[iletisim] bildirim gönderilemedi (adaptör=${adapter.name}, mesaj=${notification.messageId}):`,
      error instanceof Error ? error.message : error,
    );
    return { delivered: false, adapter: adapter.name };
  }
}
