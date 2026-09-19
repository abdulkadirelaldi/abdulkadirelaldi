import type { Metadata } from 'next';
import Link from 'next/link';

import { gorunumBul, mesajlarYolu, VARSAYILAN_GORUNUM } from '@/components/panel/mesaj-gorunumleri';
import { MesajListesi } from '@/components/panel/mesaj-listesi';
import { MesajSuzgecleri } from '@/components/panel/mesaj-suzgecleri';
import { Topbar } from '@/components/panel/topbar';
import { Badge } from '@/components/ui/badge';
import { buttonClasses } from '@/components/ui/button';
import { contactMessageFilterSchema } from '@/lib/schemas/contact-message';
import { fetchContactMessages } from '@/server/services/contact-message';

export const metadata: Metadata = {
  title: 'Mesajlar',
  robots: { index: false, follow: false, nocache: true },
};

/** Sayfa başına satır. Panel tek kullanıcılı; 25 bir ekrana sığan üst sınır. */
const SAYFA_BOYUTU = 25;

type SayfaProps = { searchParams: Promise<Record<string, string | string[] | undefined>> };

/** `?sayfa=3` → 3. Çöp değer verilirse 1 — hata sayfası göstermeye değmez. */
function sayfaNumarasi(ham: string | string[] | undefined): number {
  const sayi = Number(Array.isArray(ham) ? ham[0] : ham);
  return Number.isInteger(sayi) && sayi > 0 ? sayi : 1;
}

function tekDeger(ham: string | string[] | undefined): string {
  return (Array.isArray(ham) ? ham[0] : ham) ?? '';
}

/**
 * `/panel/mesajlar` — §4.2.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * OKUMA SERVER COMPONENT İÇİNDE (§7.1)
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * `fetchContactMessages` doğrudan servisten çağrılıyor; Server Action'dan
 * yeniden ihraç EDİLMEDİ ve bu Backend'in bilinçli kararı: `'use server'`
 * dosyasından ihraç edilen her işlev ağdan çağrılabilir bir POST ucu olurdu.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * FİLTRE BACKEND'İN ŞEMASINDAN GEÇİYOR
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Adres çubuğu kullanıcı girdisidir. `contactMessageFilterSchema` zaten
 * sayfalama sınırlarını (`perPage ≤ 100`) ve arama uzunluğunu tanımlıyor;
 * burada kuralı yeniden yazmak yerine aynı şemadan geçiriliyor. Şema
 * reddederse görünümün kendi filtresine düşülüyor — panelin çöken bir adres
 * yüzünden kullanılamaz hâle gelmesi, süzgeci yok saymaktan kötü.
 */
export default async function MesajlarPage({ searchParams }: SayfaProps) {
  const parametreler = await searchParams;

  const gorunum = gorunumBul(tekDeger(parametreler.gorunum) || VARSAYILAN_GORUNUM.anahtar);
  const arama = tekDeger(parametreler.q).trim();
  const sayfa = sayfaNumarasi(parametreler.sayfa);

  const cozum = contactMessageFilterSchema.safeParse({
    ...gorunum.filtre,
    page: sayfa,
    perPage: SAYFA_BOYUTU,
    ...(arama ? { q: arama } : {}),
  });

  const liste = await fetchContactMessages(
    cozum.success ? cozum.data : { ...gorunum.filtre, page: 1, perPage: SAYFA_BOYUTU },
  );

  const sonSayfa = Math.max(1, Math.ceil(liste.total / liste.perPage));

  return (
    <>
      <Topbar title="Mesajlar" />

      <main id="panel-icerik" className="flex-1 p-4 lg:p-6">
        <div className="flex max-w-5xl flex-col gap-6">
          {/*
            OKUNMAMIŞ ROZETİ SEKMELERİN DIŞINDA.

            `unreadCount` filtreden BAĞIMSIZ gelir (Backend, T-038): hangi
            görünümde olursan ol aynı sayı. Sekmeye bitişik dursaydı "bu
            görünümün sayısı" diye okunur ve her sekmede aynı kalması hata
            gibi görünürdü. Ne saydığı da yazıyor — "3" tek başına hangi
            kümeyi anlattığını söylemiyor.
          */}
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={liste.unreadCount > 0 ? 'accent' : 'neutral'}>
              <span className="tabular">{liste.unreadCount}</span> okunmamış
            </Badge>
            <span className="text-muted text-xs">
              Gelen kutusunda, spam ve arşiv hariç. Görünüm değiştirince değişmez.
            </span>
          </div>

          <MesajSuzgecleri aktifGorunum={gorunum.anahtar} aramaTerimi={arama} />

          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
              <p className="text-muted text-sm">{gorunum.aciklama}</p>
              <p className="text-muted text-sm">
                <span className="tabular">{liste.total}</span> mesaj
                {arama && (
                  <>
                    {' · '}
                    <span className="text-body">“{arama}”</span> aramasında
                  </>
                )}
              </p>
            </div>

            <MesajListesi
              mesajlar={liste.items}
              bosBaslik={arama ? 'Arama sonuç vermedi' : gorunum.bosBaslik}
              bosAciklama={
                arama
                  ? `“${arama}” için bu görünümde eşleşen mesaj yok. Aramayı temizleyebilir ya da süzgeçsiz görünüme geçebilirsin.`
                  : gorunum.bosAciklama
              }
            />

            {sonSayfa > 1 && (
              <nav
                aria-label="Sayfalama"
                className="flex flex-wrap items-center justify-between gap-3"
              >
                <p className="tabular text-muted text-sm">
                  Sayfa {liste.page} / {sonSayfa}
                </p>

                <div className="flex gap-2">
                  {/*
                    Sınırdaki düğme BAĞLANTI OLARAK ÇİZİLMİYOR, devre dışı bir
                    metne dönüyor: tıklanıp aynı sayfada kalan bir bağlantı,
                    ölü bağlantının sayfalamadaki hâli olurdu.
                  */}
                  {liste.page > 1 ? (
                    <Link
                      href={mesajlarYolu({
                        gorunum: gorunum.anahtar,
                        q: arama || undefined,
                        sayfa: liste.page - 1,
                      })}
                      className={buttonClasses({ variant: 'secondary', size: 'sm' })}
                    >
                      Önceki
                    </Link>
                  ) : (
                    <span className="text-muted rounded-btn border-line border px-3 py-2 text-sm opacity-60">
                      Önceki
                    </span>
                  )}

                  {liste.page < sonSayfa ? (
                    <Link
                      href={mesajlarYolu({
                        gorunum: gorunum.anahtar,
                        q: arama || undefined,
                        sayfa: liste.page + 1,
                      })}
                      className={buttonClasses({ variant: 'secondary', size: 'sm' })}
                    >
                      Sonraki
                    </Link>
                  ) : (
                    <span className="text-muted rounded-btn border-line border px-3 py-2 text-sm opacity-60">
                      Sonraki
                    </span>
                  )}
                </div>
              </nav>
            )}
          </div>
        </div>
      </main>
    </>
  );
}
