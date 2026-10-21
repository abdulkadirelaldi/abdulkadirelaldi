import { guvenliHata, guvenliUyari } from '@/lib/security/guvenli-log';
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
 * ADR-042 EKİ (2026-10-21): Resend adaptörü eklendi, ortam değişkenleriyle
 * İSTEĞE BAĞLI (`resolveContactNotifier`). Çağıran taraf (route handler)
 * değişmedi — adaptör sözleşmesi tam bunun için kurulmuştu.
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
    guvenliUyari(
      `[iletisim] bildirim sağlayıcısı kurulu değil, atlandı (mesaj=${notification.messageId})`,
    );
    return Promise.resolve();
  },
};

export type NotificationEnv = Record<string, string | undefined>;

/** Resend'in gönderim ucu — https://resend.com/docs/api-reference/emails/send-email */
const RESEND_UCU = 'https://api.resend.com/emails';

/**
 * Doğrulanmış bir alan adı olmadan Resend YALNIZCA bu göndericiyle ve yalnızca
 * hesap sahibinin kendi adresine gönderir — kurulumu denemek için yeter.
 * Alan adı doğrulanınca `CONTACT_FROM_EMAIL` ile değiştirilir (docs/yayin.md).
 */
const VARSAYILAN_GONDEREN = 'Site <onboarding@resend.dev>';

/** Sağlayıcı yavaşsa form yanıtı en fazla bu kadar bekler (ziyaretçi bekliyor). */
const ZAMAN_ASIMI_MS = 5_000;

/** Konu tek satır: CR/LF ve kontrol karakterleri boşluğa iner, uzunluk sınırlı. */
function tekSatir(metin: string, enCok = 140): string {
  return metin
    .replace(/[\u0000-\u001f\u007f]+/g, ' ')
    .trim()
    .slice(0, enCok);
}

/**
 * Resend adaptörü — ADR-042 eki (2026-10-21): bildirim İSTEĞE BAĞLI açıldı.
 *
 * DÜZ METİN, HTML YOK: ziyaretçinin yazdığı her şey gövdeye olduğu gibi girer;
 * HTML gövde, kaçışlama hatasında e-posta istemcisinde içerik enjeksiyonu
 * demekti. "Yanıtla" ziyaretçiye gider (`reply_to`), gönderen bizim adresimiz.
 * Paket YOK — tek bir `fetch` (ADR-004: bağımlılık eklenmedi).
 */
export function resendNotificationAdapter(ayar: {
  apiKey: string;
  to: string;
  from: string;
}): NotificationAdapter {
  return {
    name: 'resend',
    async send(n) {
      const konu = tekSatir(
        `${n.isSpam ? '[SPAM?] ' : ''}[Site] ${n.subject ?? 'Yeni mesaj'} — ${n.name}`,
      );
      const govde = [
        `Gönderen: ${n.name} <${n.email}>`,
        n.subject ? `Konu: ${n.subject}` : null,
        n.sourcePage ? `Sayfa: ${n.sourcePage}` : null,
        `Zaman: ${n.receivedAt.toISOString()}`,
        n.isSpam ? 'UYARI: spam puanı eşiği aştı — dikkatle oku.' : null,
        '',
        n.message,
        '',
        `Panel: /panel/mesajlar/${n.messageId}`,
      ]
        .filter((satir) => satir !== null)
        .join('\n');

      const yanit = await fetch(RESEND_UCU, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${ayar.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: ayar.from,
          to: [ayar.to],
          reply_to: n.email,
          subject: konu,
          text: govde,
        }),
        signal: AbortSignal.timeout(ZAMAN_ASIMI_MS),
      });
      if (!yanit.ok) {
        // Gövde LOGA GİRMİYOR — sağlayıcı hata metni adresi yankılayabilir (§8.20).
        throw new Error(`Resend ${yanit.status}`);
      }
    },
  };
}

/**
 * Yürürlükteki adaptörü seçer.
 *
 * `RESEND_API_KEY` VE `CONTACT_NOTIFY_EMAIL` ikisi de doluysa Resend, yoksa
 * `noop` (form yine tam çalışır; mesaj panelde, okunmamış rozetiyle — ADR-042).
 * Biri eksikken Resend'i yarım kurmak, sessizce hiçbir yere gitmeyen bir
 * adaptör üretirdi; o yüzden ikisi birden şart.
 *
 * `env` parametre olarak alınıyor — modül yüklenirken `process.env` okumak,
 * testin ortam değişkeni kurmasını zorunlu kılardı.
 */
export function resolveContactNotifier(env: NotificationEnv = process.env): NotificationAdapter {
  const apiKey = env.RESEND_API_KEY?.trim();
  const to = env.CONTACT_NOTIFY_EMAIL?.trim();
  if (!apiKey || !to) return noopNotificationAdapter;
  return resendNotificationAdapter({
    apiKey,
    to,
    from: env.CONTACT_FROM_EMAIL?.trim() || VARSAYILAN_GONDEREN,
  });
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
    guvenliHata(
      `[iletisim] bildirim gönderilemedi (adaptör=${adapter.name}, mesaj=${notification.messageId}):`,
      error instanceof Error ? error.message : error,
    );
    return { delivered: false, adapter: adapter.name };
  }
}
