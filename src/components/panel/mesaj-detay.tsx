'use client';

import { Archive, ArchiveRestore, Mail, MailOpen, ShieldAlert, ShieldCheck } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, type ReactNode } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardTitle } from '@/components/ui/card';
import { FormAlert } from '@/components/ui/form-error';
import {
  archiveContactMessageAction,
  markContactMessageReadAction,
  markContactMessageSpamAction,
  unarchiveContactMessageAction,
} from '@/server/actions/contact-message';
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
