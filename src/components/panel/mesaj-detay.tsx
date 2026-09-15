'use client';

import {
  Archive,
  ArchiveRestore,
  Briefcase,
  Check,
  Copy,
  Mail,
  MailOpen,
  ShieldAlert,
  ShieldCheck,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, type ReactNode } from 'react';

import { Alan } from '@/components/panel/alan';
import { FormKabugu, usePanelForm } from '@/components/panel/panel-form';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardTitle } from '@/components/ui/card';
import { FormAlert } from '@/components/ui/form-error';
import { Input } from '@/components/ui/input';
import { convertMessageToJobSchema, type ConvertMessageToJobInput } from '@/lib/schemas/job';
import {
  archiveContactMessageAction,
  markContactMessageReadAction,
  markContactMessageSpamAction,
  unarchiveContactMessageAction,
} from '@/server/actions/contact-message';
import { convertMessageToJobAction } from '@/server/actions/job';
import type { ContactMessageDto } from '@/server/services/contact-message';
import type { ApiResponse } from '@/types';

/**
 * TEKİL MESAJ — §4.2 `/panel/mesajlar/[id]`.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * NEDEN AYRI ROTA (KVKK'NIN MİMARİ KARŞILIĞI)
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * `ip` ve `userAgent` yalnızca `fetchContactMessageById`den geliyor; liste
 * DTO'su onları TAŞIMIYOR (§8 / ADR-020). Detayı listenin içinde açılan bir
 * panel yapsaydım, o veriyi getirmek için ya listeye eklemem ya da istemciden
 * bir uç çağırmam gerekirdi — ikisi de Backend'in kurduğu ayrımı bozardı.
 * Ayrı bir sunucu rotası, ayrımı kod düzeyinde zorunlu kılıyor: bu bileşen
 * yalnızca TEK mesajın KVKK alanlarını görüyor, hiç listeninkini değil.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * OKUNDU İŞARETLEME ELLE — AÇINCA OTOMATİK DEĞİL
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Sayfayı açmak yazma yapmıyor. Sebep: okundu durumu bir KARAR ve panelin tek
 * kullanıcısı bir mesajı "sonra bakacağım" diye açıp kapatabilmeli. Otomatik
 * işaretleme, okunmamış rozetini kullanıcının niyeti dışında sıfırlardı ve
 * geri almanın tek yolu "okunmadı işaretle" olurdu. Düğme her iki yönde de
 * çalışıyor, karar kullanıcıda.
 */
export function MesajDetay({ mesaj }: { mesaj: ContactMessageDto }) {
  const router = useRouter();
  const [calisan, setCalisan] = useState<string | null>(null);
  const [bildirim, setBildirim] = useState<ReactNode>(null);
  const [eylemHatasi, setEylemHatasi] = useState<string | null>(null);

  const eylemiCalistir = async (
    ad: string,
    cagri: () => Promise<ApiResponse<unknown>>,
    basariMetni: string,
  ) => {
    setCalisan(ad);
    setEylemHatasi(null);
    try {
      const sonuc = await cagri();
      if (sonuc.ok) {
        setBildirim(basariMetni);
        router.refresh();
      } else {
        setEylemHatasi(sonuc.error.message);
      }
    } catch {
      setEylemHatasi('İşlem tamamlanamadı — bağlantı kurulamadı. Mesaj olduğu gibi duruyor.');
    } finally {
      setCalisan(null);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {bildirim && (
        <div
          role="status"
          className="rounded-input border-success/40 bg-success/8 text-success border px-3 py-2.5 text-sm"
        >
          {bildirim}
        </div>
      )}

      {eylemHatasi && <FormAlert>{eylemHatasi}</FormAlert>}

      {/* ── GÖNDEREN + DURUM ────────────────────────────────────────────── */}
      <Card>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex flex-col gap-1">
              <CardTitle seviye="h2">{mesaj.subject ?? 'Konu yok'}</CardTitle>
              <p className="text-body text-sm">
                {mesaj.name} ·{' '}
                <a href={`mailto:${mesaj.email}`} className="focus-ring tabular underline">
                  {mesaj.email}
                </a>
                {mesaj.phone && (
                  <>
                    {' · '}
                    <a href={`tel:${mesaj.phone}`} className="focus-ring tabular underline">
                      {mesaj.phone}
                    </a>
                  </>
                )}
              </p>
              <p className="tabular text-muted text-xs">
                {new Date(mesaj.createdAt).toLocaleString('tr-TR')}
                {mesaj.sourcePage && ` · ${mesaj.sourcePage}`}
              </p>
            </div>

            <div className="flex flex-wrap gap-1">
              {!mesaj.isRead && <Badge variant="accent">Okunmamış</Badge>}
              {mesaj.isSpam && <Badge variant="danger">Spam</Badge>}
              {mesaj.honeypotHit && <Badge variant="warning">Tuzak alanı dolduruldu</Badge>}
              {mesaj.archivedAt && <Badge variant="neutral">Arşivlenmiş</Badge>}
              {mesaj.convertedJobId && <Badge variant="success">İşe dönüştü</Badge>}
            </div>
          </div>

          {/* Gövde `whitespace-pre-wrap`: kullanıcının yazdığı satır sonları
              anlam taşıyor. HTML olarak yorumlanmıyor — düz metin. */}
          <p className="text-body rounded-card bg-elevated/40 border-line border p-4 text-sm whitespace-pre-wrap">
            {mesaj.message}
          </p>
        </CardContent>
      </Card>

      {/* ── DÖRT DURUM EYLEMİ ───────────────────────────────────────────── */}
      <Card>
        <CardContent className="flex flex-col gap-3">
          <CardTitle seviye="h2">Durum</CardTitle>

          <div className="flex flex-wrap gap-2">
            <Button
              variant="secondary"
              size="sm"
              disabled={calisan !== null}
              onClick={() =>
                void eylemiCalistir(
                  'okundu',
                  () => markContactMessageReadAction({ id: mesaj.id, isRead: !mesaj.isRead }),
                  mesaj.isRead ? 'Okunmadı işaretlendi.' : 'Okundu işaretlendi.',
                )
              }
            >
              {mesaj.isRead ? (
                <Mail className="size-4" aria-hidden="true" />
              ) : (
                <MailOpen className="size-4" aria-hidden="true" />
              )}
              {mesaj.isRead ? 'Okunmadı işaretle' : 'Okundu işaretle'}
            </Button>

            <Button
              variant="secondary"
              size="sm"
              disabled={calisan !== null}
              onClick={() =>
                void eylemiCalistir(
                  'spam',
                  () => markContactMessageSpamAction({ id: mesaj.id, isSpam: !mesaj.isSpam }),
                  mesaj.isSpam
                    ? 'Spam işareti kaldırıldı. Puan değişmedi — o bir ölçüm.'
                    : 'Spam işaretlendi. Puan değişmedi — o bir ölçüm.',
                )
              }
            >
              {mesaj.isSpam ? (
                <ShieldCheck className="size-4" aria-hidden="true" />
              ) : (
                <ShieldAlert className="size-4" aria-hidden="true" />
              )}
              {mesaj.isSpam ? 'Spam değil' : 'Spam işaretle'}
            </Button>

            {mesaj.archivedAt ? (
              <Button
                variant="secondary"
                size="sm"
                disabled={calisan !== null}
                onClick={() =>
                  void eylemiCalistir(
                    'arsiv',
                    () => unarchiveContactMessageAction({ id: mesaj.id }),
                    'Arşivden çıkarıldı. Gelen kutusunda yeniden görünüyor.',
                  )
                }
              >
                <ArchiveRestore className="size-4" aria-hidden="true" />
                Arşivden çıkar
              </Button>
            ) : (
              <Button
                variant="secondary"
                size="sm"
                disabled={calisan !== null}
                onClick={() =>
                  void eylemiCalistir(
                    'arsiv',
                    () => archiveContactMessageAction({ id: mesaj.id }),
                    'Arşivlendi. Mesaj SİLİNMEDİ — Arşiv görünümünde duruyor ve geri alınabilir.',
                  )
                }
              >
                <Archive className="size-4" aria-hidden="true" />
                Arşivle
              </Button>
            )}
          </div>

          <p className="text-muted text-xs">
            Her düğme yalnızca kendi alanını değiştirir: okundu işaretlemek yanıtlanma ve arşivlenme
            bilgisini bozmaz.
          </p>
        </CardContent>
      </Card>

      <SpamOlcumu mesaj={mesaj} />
      <IseDonustur mesaj={mesaj} />
    </div>
  );
}

/**
 * SPAM ÖLÇÜMÜ + KVKK ALANLARI.
 *
 * `spamScore`/`honeypotHit` ÖLÇÜM, `isSpam` KARAR — ayrım kullanıcıya da
 * yazıyor, çünkü "spam değil" düğmesinin puanı düşürmemesi aksi hâlde hata
 * gibi görünürdü.
 *
 * `ip` ve `userAgent` KAPALI BAŞLIYOR — ama düğmenin NE YAPTIĞI konusunda
 * kendimizi kandırmayalım, ölçüldü:
 *
 *   | Nerede                          | Kapalıyken | Açıkken |
 *   | ------------------------------- | ---------- | ------- |
 *   | Liste sayfasının HTML'i         | yok        | yok     |
 *   | Detay sayfasının ham HTML'i     | VAR        | VAR     |
 *   | Ekranda görünen metin           | yok        | var     |
 *
 * Yani bu düğme bir YETKİ SINIRI DEĞİL, omuz üstünden bakışa karşı bir
 * perdedir: veri `fetchContactMessageById`den geliyor ve bu bileşene prop
 * olarak verildiği için RSC yükünde ilk bayttan beri duruyor. Panelin tek
 * kullanıcısı zaten bu veriyi görmeye yetkili; korunan şey, ekran
 * paylaşılırken ya da yanında biri varken kişisel verinin istemeden
 * görünmesi.
 *
 * GERÇEK SINIR LİSTE/DETAY AYRIMI ve o Backend'in `LIST_SELECT`inde kurulu
 * (§8 / ADR-020) — ölçümün ilk satırı onu doğruluyor. Düğmeye "veriyi
 * getirir" anlamı yüklemek, panelde doğrulanamayan bir söz vermek olurdu.
 */
function SpamOlcumu({ mesaj }: { mesaj: ContactMessageDto }) {
  const [acik, setAcik] = useState(false);

  return (
    <Card>
      <CardContent className="flex flex-col gap-4">
        <CardTitle seviye="h2">Spam ölçümü</CardTitle>

        <dl className="grid gap-3 sm:grid-cols-3">
          <div className="flex flex-col gap-0.5">
            <dt className="text-muted text-xs">Puan</dt>
            <dd className="tabular text-primary text-lg">{mesaj.spamScore ?? '—'}</dd>
          </div>
          <div className="flex flex-col gap-0.5">
            <dt className="text-muted text-xs">Tuzak alanı</dt>
            <dd className="text-primary text-sm">
              {mesaj.honeypotHit ? 'Dolduruldu (bot işareti)' : 'Boş'}
            </dd>
          </div>
          <div className="flex flex-col gap-0.5">
            <dt className="text-muted text-xs">Karar</dt>
            <dd className="text-primary text-sm">{mesaj.isSpam ? 'Spam' : 'Spam değil'}</dd>
          </div>
        </dl>

        <p className="text-muted text-xs">
          Puan ve tuzak alanı <span className="text-body">ölçümdür</span> — gönderim anında
          kaydedildi ve değişmez. &quot;Spam&quot; ise <span className="text-body">karardır</span>{' '}
          ve geri alınabilir.
        </p>

        <div className="border-line rounded-card border border-dashed p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex flex-col gap-1">
              <p className="text-primary text-sm font-medium">Gönderim izleri (IP, tarayıcı)</p>
              <p className="text-muted text-sm">
                Kişisel veri (KVKK). Yalnızca spam incelemesi için tutuluyor, 90 gün sonra siliniyor
                ve mesaj listesine hiç taşınmıyor.
              </p>
            </div>

            <Button variant="ghost" size="sm" onClick={() => setAcik((o) => !o)}>
              {acik ? 'Gizle' : 'Göster'}
            </Button>
          </div>

          {acik && (
            <dl className="mt-3 flex flex-col gap-2">
              <div className="flex flex-col gap-0.5">
                <dt className="text-muted text-xs">IP</dt>
                <dd className="tabular text-body text-sm break-all">
                  {mesaj.ip ?? 'Kaydedilmemiş'}
                </dd>
              </div>
              <div className="flex flex-col gap-0.5">
                <dt className="text-muted text-xs">Tarayıcı</dt>
                <dd className="tabular text-body text-sm break-all">
                  {mesaj.userAgent ?? 'Kaydedilmemiş'}
                </dd>
              </div>
            </dl>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * İŞE DÖNÜŞTÜRME — §6'nın kritik ilişkisinin görünen yüzü.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * İKİ SONUÇ, İKİ AYRI CÜMLE
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * `client.created` müşterinin bu çağrıda mı açıldığını söylüyor. İki durumu
 * tek cümleyle bildirmek ("müşteriye bağlandı") en önemli bilgiyi yutardı:
 * MEVCUT bir kayda bağlanıldığında kullanıcı, beklemediği bir müşteriye
 * bağlandığını fark edebilmeli — e-posta eşleşmesi üzerinden bağlanıyor ve
 * aynı kişinin iki farklı işi olabilir.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * "İŞİ GÖSTER" BAĞLANTISI YOK — KİMLİK VAR
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * İş ekranları F4'te gelecek; `/panel/isler` henüz `hazir` değil. Oraya
 * bağlantı koymak, tıklanınca 404 veren bir düğme olurdu (T-018'in dersi).
 * Bunun yerine iş kimliği kopyalanabilir olarak gösteriliyor — kopyalama
 * GERÇEKTEN çalışan bir eylem ve kimliği elinde olan kullanıcı kaydı bulabilir.
 * `fields.jobId` böylece yutulmadan kullanılmış oluyor. F4'te bu blok
 * bağlantıya dönüşecek; metin de o zamana kadar söz vermiyor.
 */
function IseDonustur({ mesaj }: { mesaj: ContactMessageDto }) {
  const router = useRouter();
  const [sonucMetni, setSonucMetni] = useState<string | null>(null);
  const [catismaMetni, setCatismaMetni] = useState<string | null>(null);
  const [isKimligi, setIsKimligi] = useState<string | null>(mesaj.convertedJobId);

  const kaydet = async (degerler: ConvertMessageToJobInput) => {
    const sonuc = await convertMessageToJobAction(degerler);

    if (sonuc.ok) {
      const { job, client } = sonuc.data;
      setIsKimligi(job.id);
      setSonucMetni(
        client.created
          ? `“${job.title}” işi açıldı ve ${client.name} için YENİ bir müşteri kaydı oluşturuldu.`
          : `“${job.title}” işi açıldı ve MEVCUT müşteri kaydına bağlandı: ${client.name}${
              client.email ? ` (${client.email})` : ''
            }. Beklediğin kayıt bu değilse e-posta eşleşmesini kontrol et.`,
      );
      router.refresh();
    } else if (sonuc.error.code === 'CONFLICT') {
      /*
       * ÇATIŞMA MESAJI ELLE BASILIYOR — ÖLÇÜMLE EKLENDİ.
       *
       * `usePanelForm` sunucunun `fields` anahtarlarını forma basıyor ve
       * Backend burada `contactMessageId` gönderiyor. O alan formda VAR ama
       * GİZLİ (`<input type="hidden">`), yani hata "basıldı" sayılıp form
       * düzeyindeki uyarı hiç gösterilmiyordu: iki sekmeli yarış denemesinde
       * kullanıcı başlığı yazıp düğmeye basıyor, aşağıda bir kutu beliriyor ve
       * NEDEN belirdiğini söyleyen tek cümle ekranda olmuyordu.
       *
       * Kabuk suçlu değil — görünmez bir alana hata basmak onun bilebileceği
       * bir şey değil. Çözüm bu ekranın kendi sorumluluğu: çatışmayı ayrı bir
       * bildirimle söylüyoruz.
       */
      setCatismaMetni(sonuc.error.message);

      /* `fields.jobId` — Backend bunu "işi göster" kurabilelim diye koyuyor. */
      const kimlik = sonuc.error.fields?.jobId;
      if (kimlik) setIsKimligi(kimlik);

      router.refresh();
    }

    return sonuc;
  };

  const { form, durum, formHatasi, gonder } = usePanelForm<ConvertMessageToJobInput>({
    sema: convertMessageToJobSchema,
    varsayilanDegerler: { contactMessageId: mesaj.id, title: mesaj.subject ?? '' },
    kaydet,
  });

  const {
    register,
    formState: { errors },
  } = form;

  return (
    <Card>
      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <CardTitle seviye="h2">İşe dönüştür</CardTitle>
          <p className="text-muted text-sm">
            Mesajdan bir iş kartı açar ve göndereni müşteri kaydına bağlar. Bir mesaj yalnızca bir
            işe dönüşebilir.
          </p>
        </div>

        {sonucMetni && (
          <p
            role="status"
            className="rounded-input border-success/40 bg-success/8 text-success border px-3 py-2.5 text-sm"
          >
            {sonucMetni}
          </p>
        )}

        {catismaMetni && <FormAlert>{catismaMetni}</FormAlert>}

        {isKimligi && <IsKimligi kimlik={isKimligi} />}

        {!isKimligi && (
          <FormKabugu
            gonder={gonder}
            durum={durum}
            formHatasi={formHatasi}
            basariMetni="İş kartı oluşturuldu."
            gonderEtiketi="İş kartı oluştur"
          >
            <input type="hidden" {...register('contactMessageId')} />

            <Alan
              id="title"
              etiket="İş başlığı"
              hata={errors.title?.message}
              yardim="Mesajın konusu önerildi; istediğin gibi değiştirebilirsin."
            >
              {(b) => <Input id="title" {...b} {...register('title')} />}
            </Alan>
          </FormKabugu>
        )}
      </CardContent>
    </Card>
  );
}

/** İş kimliği — kopyalanabilir. Bağlantı DEĞİL (yukarıdaki nota bakınız). */
function IsKimligi({ kimlik }: { kimlik: string }) {
  const [kopyalandi, setKopyalandi] = useState(false);

  return (
    <div className="border-line bg-elevated/40 rounded-card flex flex-wrap items-center gap-3 border p-4">
      <Briefcase className="text-muted size-5 shrink-0" aria-hidden="true" />

      <div className="flex min-w-0 flex-col gap-0.5">
        <p className="text-primary text-sm font-medium">Bu mesaj bir iş kartına dönüştürülmüş</p>
        <p className="tabular text-muted text-xs break-all">{kimlik}</p>
      </div>

      <Button
        variant="ghost"
        size="sm"
        className="ml-auto"
        onClick={() => {
          void navigator.clipboard.writeText(kimlik).then(
            () => {
              setKopyalandi(true);
              setTimeout(() => setKopyalandi(false), 2000);
            },
            () => setKopyalandi(false),
          );
        }}
      >
        {kopyalandi ? (
          <Check className="size-4" aria-hidden="true" />
        ) : (
          <Copy className="size-4" aria-hidden="true" />
        )}
        {kopyalandi ? 'Kopyalandı' : 'Kimliği kopyala'}
      </Button>

      {/* İş ekranı F4'te gelecek — buraya bağlantı koymak 404 üretirdi. */}
      <p className="text-muted basis-full text-xs">
        İş kartı ekranı henüz yok (F4). Kart açıldı ve duruyor; görüntülemek için gereken ekran
        geldiğinde bu kutu bağlantıya dönüşecek.
      </p>
    </div>
  );
}
