import { MessageSquare } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { IsBakiye } from '@/components/panel/is-bakiye';
import { IsFormu } from '@/components/panel/is-formu';
import { paraBicim, paraBicimVeyaYok } from '@/components/panel/para-bicim';
import { Topbar } from '@/components/panel/topbar';
import { Card, CardContent, CardTitle } from '@/components/ui/card';
import { fetchClientsForPanel } from '@/server/services/client';
import { fetchJobFinancials, fetchJobForPanel } from '@/server/services/job';
import { Currency } from '@/types';

export const metadata: Metadata = {
  title: 'İşi düzenle',
  robots: { index: false, follow: false, nocache: true },
};

const SECICI_UST_SINIR = 100;

type SayfaProps = { params: Promise<{ id: string }> };

/**
 * `/panel/isler/[id]` — düzenleme.
 *
 * ⚠️ SEÇİCİ YİNE `isArchived: false` GÖNDERİYOR ama bu TEK BAŞINA bir bağı
 * koparırdı: arşivli bir müşteriye bağlı iş düzenlenirken o müşteri listede
 * olmaz, `<select>` değeri eşleşmeyince tarayıcı ilk seçeneğe düşer ve
 * KAYDETMEK işi BAŞKA BİR MÜŞTERİYE bağlar.
 *
 * `JobPanelDto.client.isArchived` tam bunun için var. Çözümün sunucu yarısı
 * burada değil `is-formu.tsx`te: form, kaydın kendi müşterisi arşivliyse onu
 * seçeneklere ekliyor ve "(arşivli)" işaretiyle çiziyor. Bu sayfa yalnızca
 * AKTİF listeyi ve işi veriyor; birleştirme formun işi çünkü hangi kaydın
 * düzenlendiğini o biliyor.
 *
 * ⚠️ TUTAR BURADA İKİ YERDE: `agreedAmount` formda DÜZENLENEBİLİR (kaydın kendi
 * gerçeği), `baseAmount` ise SALT OKUNUR ve etiketli (TRY karşılığı, sunucuda
 * türetiliyor). Kanban ve liste yalnızca `agreedAmount` gösteriyor — ikisini
 * aynı hücrede göstermek iki farklı tutar varmış gibi hissettirirdi.
 */
export default async function IsDuzenlePage({ params }: SayfaProps) {
  const { id } = await params;
  const is = await fetchJobForPanel(id);

  if (!is) notFound();

  const [musteriler, bakiyeler] = await Promise.all([
    fetchClientsForPanel({ page: 1, perPage: SECICI_UST_SINIR, isArchived: false }),
    /*
      TOPLU İMZA tek kayıt için de kullanılıyor — Backend `jobIds` dizisi
      alıyor ve iki sorgu atıyor. Tek kayıt için ayrı bir imza istemek, aynı
      hesabı iki yerde tutmak olurdu.
    */
    fetchJobFinancials([id]),
  ]);

  const bakiye = bakiyeler[id];

  return (
    <>
      <Topbar title={is.title} />

      <main id="panel-icerik" className="flex-1 p-4 lg:p-6">
        <div className="flex max-w-3xl flex-col gap-6">
          <IsFormu
            is={is}
            musteriler={musteriler.items.map((m) => ({
              id: m.id,
              name: m.name,
              isArchived: m.isArchived,
            }))}
          />

          {/*
            BAKİYE — T-104'te geldi. T-103'te yer AYIRMAMIŞTIM ve doğruydu;
            veri olmadan kart iskeleti çizmek boş kartın kılık değiştirmiş
            hâli olurdu (T-054f'in dersi).

            `bakiye` tanımsız olabilir: `fetchJobFinancials` yalnızca İŞLEMİ
            OLAN işler için kayıt döndürüyor olabilir. O durumda kart hiç
            çizilmiyor — "0,00 ₺" dört kez yazmak, hiç işlem olmadığını
            "hepsi sıfır" diye söylemek olurdu ve kullanıcı bunu bir hesap
            sonucu sanardı.
          */}
          {bakiye ? (
            <IsBakiye bakiye={bakiye} />
          ) : (
            <p className="text-muted text-sm">
              Bu işe bağlı işlem yok — bakiye hesaplanacak bir şey bulunmuyor.{' '}
              <Link href="/panel/muhasebe/yeni" className="focus-ring link rounded">
                İşlem ekle
              </Link>
            </p>
          )}

          {/* ── TUTAR ÖZETİ — kaydedilmiş hâl, salt okunur ───────────────── */}
          <Card>
            <CardContent className="flex flex-col gap-3">
              <CardTitle seviye="h2">Kaydedilmiş tutar</CardTitle>

              <dl className="grid gap-3 sm:grid-cols-3">
                <div className="flex flex-col gap-0.5">
                  <dt className="text-muted text-xs">Anlaşma tutarı</dt>
                  <dd className="tabular text-primary text-lg">
                    {paraBicimVeyaYok(is.agreedAmount, is.currency)}
                  </dd>
                </div>

                <div className="flex flex-col gap-0.5">
                  <dt className="text-muted text-xs">Kur</dt>
                  <dd className="tabular text-primary text-lg">{is.fxRate}</dd>
                </div>

                <div className="flex flex-col gap-0.5">
                  <dt className="text-muted text-xs">TRY karşılığı</dt>
                  <dd className="tabular text-primary text-lg">
                    {is.baseAmount === null ? '—' : paraBicim(is.baseAmount, Currency.TRY)}
                  </dd>
                </div>
              </dl>

              <p className="text-muted text-xs">
                TRY karşılığı sunucuda <span className="text-body">türetiliyor</span> — formdan
                düzenlenemez. Tutarı ya da kuru değiştirip kaydettiğinde yeniden hesaplanır.
              </p>
            </CardContent>
          </Card>

          {/* ── DÖNÜŞÜM KAYNAĞI — varsa ─────────────────────────────────── */}
          {is.sourceMessage && (
            <Card>
              <CardContent className="flex flex-col gap-3">
                <CardTitle seviye="h2">Bu iş bir mesajdan dönüştü</CardTitle>

                <div className="border-line bg-elevated/40 rounded-card flex items-start gap-3 border p-4">
                  <MessageSquare className="text-muted mt-0.5 size-5 shrink-0" aria-hidden="true" />
                  <div className="flex flex-col gap-1">
                    <p className="text-primary text-sm font-medium">
                      {is.sourceMessage.subject ?? 'Konu yok'}
                    </p>
                    <p className="text-body text-sm">{is.sourceMessage.name}</p>
                    <p className="tabular text-muted text-xs">
                      {new Date(is.sourceMessage.createdAt).toLocaleString('tr-TR')}
                    </p>
                  </div>
                </div>

                {/*
                  Mesaj GÖVDESİ burada YOK — §8.20: `sourceMessage` yalnızca
                  kimlik ve özet taşıyor. Gövdeyi okumak için mesaj ekranına
                  gidiliyor ve o rota GERÇEKTEN var (T-041f).
                */}
                <Link
                  href={`/panel/mesajlar/${is.sourceMessage.id}`}
                  className="focus-ring link self-start rounded text-sm"
                >
                  Mesajın tamamını aç
                </Link>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </>
  );
}
