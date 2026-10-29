import { ChevronRight, Plus } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import type { ReactNode } from 'react';

import { HESAP_TURU, miktarBicim, SIKLIK, tlBicim } from '@/components/panel/cuzdan-bicim';
import { paraBicim } from '@/components/panel/para-bicim';
import { Topbar } from '@/components/panel/topbar';
import { fetchCuzdan, type AkisDto, type HesapDto } from '@/server/services/cuzdan';
import { cn } from '@/lib/utils/cn';

export const metadata: Metadata = {
  title: 'Cüzdan',
  robots: { index: false, follow: false, nocache: true },
};

const SAAT = new Intl.DateTimeFormat('tr-TR', {
  day: 'numeric',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
  timeZone: 'Europe/Istanbul',
});

/**
 * CÜZDAN (2026-10-30, telefon öncelikli) — muhasebenin yerine.
 *
 * En üstte NET (varlık − borç) ve bu ayın hesabı (gelir − gider − taksit);
 * altta hesaplar (altın/döviz dahil, güncel TL karşılığıyla), borçlar (kalan,
 * taksit, bitişe kalan ay), gelirler ve giderler. Kur zamanı ve "bayat" uyarısı
 * görünür — uydurma ya da sıfır kur yok.
 */
export default async function CuzdanPage() {
  const c = await fetchCuzdan();
  const { ozet } = c;
  const eksi = ozet.netTl.startsWith('-');

  return (
    <>
      <Topbar title="Cüzdan" />
      <main id="panel-icerik" className="flex-1 px-4 py-4 lg:p-6">
        <div className="mx-auto flex max-w-2xl flex-col gap-5">
          {/* ── NET ───────────────────────────────────────────────────── */}
          <section className="rounded-card bg-gradient-accent relative isolate flex flex-col gap-3 overflow-hidden p-5 text-white shadow-[0_12px_32px_-12px_var(--accent-glow)]">
            {/* Dekoratif ışık — içerik değil. */}
            <span
              aria-hidden="true"
              className="absolute -top-16 -right-10 -z-10 size-48 rounded-full bg-white/15 blur-2xl"
            />
            <span className="text-sm opacity-90">Net varlık</span>
            <span className="tabular text-[2.125rem] leading-none font-semibold tracking-tight">
              {paraBicim(ozet.netTl, 'TRY')}
            </span>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="flex flex-col">
                <span className="opacity-80">Varlıklar</span>
                <span className="tabular font-medium">{paraBicim(ozet.varlikTl, 'TRY')}</span>
              </div>
              <div className="flex flex-col">
                <span className="opacity-80">Borçlar</span>
                <span className="tabular font-medium">{paraBicim(ozet.borcTl, 'TRY')}</span>
              </div>
            </div>
            {eksi && <span className="text-xs opacity-90">Borçların varlıklarından fazla.</span>}
          </section>

          <Dagilim hesaplar={c.hesaplar} />

          {/* ── BU AY ─────────────────────────────────────────────────── */}
          <section className="rounded-card border-line bg-surface grid grid-cols-2 gap-3 border p-4 text-sm">
            <Satir etiket="Aylık gelir" deger={ozet.aylikGelirTl} ton="text-success" />
            <Satir etiket="Aylık gider" deger={ozet.aylikGiderTl} ton="text-danger" />
            <Satir etiket="Borç taksitleri" deger={ozet.aylikTaksitTl} ton="text-warning" />
            <Satir
              etiket="Ay sonunda kalan"
              deger={ozet.aylikKalanTl}
              ton={ozet.aylikKalanTl.startsWith('-') ? 'text-danger' : 'text-primary'}
            />
          </section>

          <p className="text-muted -mt-2 text-xs">
            Kurlar: {c.kur.guncellendi ? SAAT.format(new Date(c.kur.guncellendi)) : 'alınamadı'}{' '}
            (Truncgil · varlık alış, borç satış)
            {c.kur.bayat && (
              <span className="text-warning"> — canlı kaynağa ulaşılamadı, son bilinen kur</span>
            )}
            {ozet.kursuzKalem > 0 && (
              <span className="text-warning">
                {' '}
                · {ozet.kursuzKalem} kalemin kuru yok, toplamlara girmedi
              </span>
            )}
          </p>

          {/* ── HESAPLAR ──────────────────────────────────────────────── */}
          <Bolum baslik="Hesaplar" ekle="/panel/cuzdan/yeni?tur=hesap" ekleEtiket="Hesap ekle">
            {c.hesaplar.length === 0 ? (
              <Bos>Banka, nakit, altın ya da döviz — hepsi hesap olarak eklenir.</Bos>
            ) : (
              c.hesaplar.map((h) => (
                <Kalem
                  key={h.id}
                  href={`/panel/cuzdan/hesap/${h.id}`}
                  baslik={h.name}
                  alt={`${HESAP_TURU[h.kind]} · ${miktarBicim(h.balance, h.unit)}`}
                  deger={tlBicim(h.tl)}
                />
              ))
            )}
          </Bolum>

          {/* ── BORÇLAR ───────────────────────────────────────────────── */}
          <Bolum baslik="Borçlar" ekle="/panel/cuzdan/yeni?tur=borc" ekleEtiket="Borç ekle">
            {c.borclar.length === 0 ? (
              <Bos>Kredi, kart, kişiye borç — altın borcu da güncel TL karşılığıyla görünür.</Bos>
            ) : (
              c.borclar.map((b) => (
                <li key={b.id}>
                  <Link
                    href={`/panel/cuzdan/borc/${b.id}`}
                    className="focus-ring rounded-card border-line bg-surface flex flex-col gap-2 border p-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <span className="flex min-w-0 flex-col">
                        <span className="text-primary truncate font-medium">{b.name}</span>
                        <span className="text-muted truncate text-xs">
                          Kalan {miktarBicim(b.remainingAmount, b.unit)}
                          {b.lender && ` · ${b.lender}`}
                        </span>
                      </span>
                      <span className="tabular text-danger shrink-0 text-sm font-semibold">
                        {tlBicim(b.kalanTl)}
                      </span>
                    </div>
                    <div className="bg-elevated h-1.5 overflow-hidden rounded-full">
                      <div
                        className="bg-success h-full rounded-full"
                        style={{ width: `${b.odenenYuzde}%` }}
                      />
                    </div>
                    <span className="tabular text-muted text-xs">
                      %{b.odenenYuzde} ödendi
                      {b.monthlyPayment && ` · aylık ${miktarBicim(b.monthlyPayment, b.unit)}`}
                      {b.paymentDay && ` · ayın ${b.paymentDay}'i`}
                      {b.kalanAy !== null && ` · ${b.kalanAy} ay kaldı`}
                    </span>
                  </Link>
                </li>
              ))
            )}
          </Bolum>

          <AkisBolumu baslik="Gelirler" tur="gelir" akislar={c.gelirler} />
          <AkisBolumu baslik="Giderler" tur="gider" akislar={c.giderler} />
        </div>
      </main>
    </>
  );
}

function Satir({ etiket, deger, ton }: { etiket: string; deger: string; ton: string }) {
  return (
    <div className="flex flex-col">
      <span className="text-muted text-xs">{etiket}</span>
      <span className={cn('tabular font-semibold', ton)}>{paraBicim(deger, 'TRY')}</span>
    </div>
  );
}

function Bolum({
  baslik,
  ekle,
  ekleEtiket,
  children,
}: {
  baslik: string;
  ekle: string;
  ekleEtiket: string;
  children: ReactNode;
}) {
  return (
    <section className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <h2 className="text-primary text-base font-semibold">{baslik}</h2>
        <Link
          href={ekle}
          aria-label={ekleEtiket}
          className="focus-ring bg-accent/10 text-accent flex size-9 items-center justify-center rounded-full"
        >
          <Plus className="size-5" aria-hidden="true" />
        </Link>
      </div>
      <ul className="flex flex-col gap-2">{children}</ul>
    </section>
  );
}

function Kalem({
  href,
  baslik,
  alt,
  deger,
  ton = 'text-primary',
}: {
  href: string;
  baslik: string;
  alt: string;
  deger: string;
  ton?: string;
}) {
  return (
    <li>
      <Link
        href={href}
        className="focus-ring rounded-card border-line bg-surface flex items-center justify-between gap-3 border p-3"
      >
        <span className="flex min-w-0 flex-col">
          <span className="text-primary truncate font-medium">{baslik}</span>
          <span className="text-muted truncate text-xs">{alt}</span>
        </span>
        <span className="flex shrink-0 items-center gap-1">
          <span className={cn('tabular text-sm font-semibold', ton)}>{deger}</span>
          <ChevronRight className="text-muted size-4" aria-hidden="true" />
        </span>
      </Link>
    </li>
  );
}

function Bos({ children }: { children: ReactNode }) {
  return (
    <li className="text-muted rounded-card border-line bg-surface border border-dashed p-4 text-center text-sm">
      {children}
    </li>
  );
}

function AkisBolumu({
  baslik,
  tur,
  akislar,
}: {
  baslik: string;
  tur: 'gelir' | 'gider';
  akislar: AkisDto[];
}) {
  return (
    <Bolum
      baslik={baslik}
      ekle={`/panel/cuzdan/yeni?tur=${tur}`}
      ekleEtiket={tur === 'gelir' ? 'Gelir ekle' : 'Gider ekle'}
    >
      {akislar.length === 0 ? (
        <Bos>
          {tur === 'gelir'
            ? 'Maaş, burs, serbest iş — kimden, ne zaman, ne kadar.'
            : 'Kira, abonelik, fatura — kime, ne zaman, ne kadar.'}
        </Bos>
      ) : (
        akislar.map((a) => (
          <Kalem
            key={a.id}
            href={`/panel/cuzdan/akis/${a.id}`}
            baslik={a.name}
            alt={[
              a.counterparty,
              SIKLIK[a.frequency],
              a.frequency === 'MONTHLY' && a.day ? `ayın ${a.day}'i` : null,
              a.date,
            ]
              .filter(Boolean)
              .join(' · ')}
            deger={miktarBicim(a.amount, a.unit)}
            ton={tur === 'gelir' ? 'text-success' : 'text-danger'}
          />
        ))
      )}
    </Bolum>
  );
}

const DAGILIM_RENK = ['#6d4aff', '#10b981', '#f59e0b', '#0ea5e9', '#f43f5e', '#8b5cf6'];

/**
 * VARLIK DAĞILIMI — hesapların TL karşılığına göre tek şerit + açıklama.
 * Oran yalnızca GÖSTERİM (yüzde, tam sayı); tutarlar yine metin ve kayıpsız.
 * Kuru olmayan ya da sıfır/eksi bakiyeli hesap şeride girmez.
 */
function Dagilim({ hesaplar }: { hesaplar: HesapDto[] }) {
  const kalemler = hesaplar
    .map((h) => ({ ad: h.name, tl: h.tl === null ? 0 : Number(h.tl) }))
    .filter((k) => k.tl > 0)
    .sort((a, b) => b.tl - a.tl);
  const toplam = kalemler.reduce((t, k) => t + k.tl, 0);
  if (kalemler.length < 2 || toplam <= 0) return null;

  return (
    <section
      aria-label="Varlık dağılımı"
      className="rounded-card border-line bg-surface flex flex-col gap-3 border p-4"
    >
      <span className="text-muted text-xs font-medium">Varlık dağılımı</span>
      <div className="flex h-2.5 gap-0.5 overflow-hidden rounded-full">
        {kalemler.map((k, i) => (
          <span
            key={k.ad}
            className="h-full first:rounded-l-full last:rounded-r-full"
            style={{
              width: `${(k.tl / toplam) * 100}%`,
              background: DAGILIM_RENK[i % DAGILIM_RENK.length],
            }}
          />
        ))}
      </div>
      <ul className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
        {kalemler.map((k, i) => (
          <li key={k.ad} className="flex min-w-0 items-center gap-2">
            <span
              aria-hidden="true"
              className="size-2 shrink-0 rounded-full"
              style={{ background: DAGILIM_RENK[i % DAGILIM_RENK.length] }}
            />
            <span className="text-body truncate">{k.ad}</span>
            <span className="tabular text-muted ml-auto">%{Math.round((k.tl / toplam) * 100)}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
