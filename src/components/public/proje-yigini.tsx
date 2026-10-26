import Link from 'next/link';

import { KapakGorsel } from '@/components/public/kapak-gorsel';
import { statikKapak } from '@/components/public/statik-kapak';
import { hapSiniflari } from '@/components/public/tasarim/gradyan-baglanti';
import type { Dil } from '@/i18n/diller';
import { yol } from '@/i18n/rotalar';
import { sozluk } from '@/i18n/sozluk';
import type { ProjectListItemDto } from '@/server/services/content-dto';

/** Kartların yapışma noktası; her kart bir öncekinin bu kadar altında durur. */
const UST = 6; // rem
const ADIM = 4.25; // rem — kart başlık şeridinin yüksekliği
/**
 * Üstte görünür kalan en fazla başlık şeridi. Sınırsız yığında 16 projeyle
 * şeritler ekranı dolduruyor, yeni kart görünmüyordu (2026-10-26); bu
 * sınırdan sonraki kartlar aynı noktaya yapışıp öncekinin üstüne biniyor.
 */
const YIGIN = 3;

/**
 * ADR-045 — yapışkan, üst üste yığılan proje kartları (örnekteki
 * "01 CLIENT · LIVE PROJECT").
 *
 * SAF CSS: her kart `position: sticky` ve yapışma noktası sırasıyla biraz daha
 * aşağıda. Kaydırdıkça yeni kart bir öncekinin üstüne biniyor, öncekilerin
 * başlık şeritleri üstte bir yığın olarak görünür kalıyor. JS yok.
 *
 * SAĞ SÜTUN — `proje.json`: projenin künyesi kod bloğu olarak. Sitenin
 * "yazılım mühendisi" imzası; bilgi zaten DTO'da var, uydurma alan yok.
 *
 * Kartın TAMAMI tıklanabilir DEĞİL: bağlantı başlıkta ve "İncele" hapında.
 * Tüm kartı bağlantı yapmak içindeki her şeyi tek, uzun bir bağlantı adına
 * çevirirdi (ekran okuyucu için okunmaz).
 */
export function ProjeYigini({
  dil,
  projeler,
  baslikDuzeyi: Baslik = 'h3',
}: {
  dil: Dil;
  projeler: ProjectListItemDto[];
  baslikDuzeyi?: 'h2' | 'h3';
}) {
  const s = sozluk(dil).projelerBolum;
  return (
    <ol className="flex flex-col gap-6 md:gap-10">
      {projeler.map((proje, sira) => (
        <li
          key={proje.id}
          className="[@media(min-width:768px)_and_(min-height:760px)]:sticky"
          style={{ top: `${UST + Math.min(sira, YIGIN - 1) * ADIM}rem` }}
        >
          <article className="border-line-hover bg-surface overflow-hidden rounded-[1.75rem] border shadow-[0_-20px_60px_-30px_rgba(0,0,0,0.9)] md:rounded-[2.25rem]">
            {/* Mobilde ve kısa ekranda (<760px yükseklik — kart, yığının altına sığmıyor)
                yığılma yok, başlık SATIR KIRABİLİR; masaüstünde
                yığın şeridi sabit yükseklikte olmalı, orada tek satır + üç nokta. */}
            <header className="flex min-h-[4.25rem] items-center gap-4 px-5 py-3 md:h-[4.25rem] md:px-8 md:py-0">
              <span className="dev-baslik text-primary text-2xl md:text-3xl">
                {String(sira + 1).padStart(2, '0')}
              </span>
              <div className="min-w-0 flex-1 leading-tight">
                <Baslik className="text-primary font-display text-sm font-bold tracking-[0.12em] uppercase md:truncate md:text-base">
                  <Link
                    href={yol(dil, 'projeler', proje.slug)}
                    className="focus-ring rounded-btn hover:text-accent-soft transition-colors"
                  >
                    {proje.title}
                  </Link>
                </Baslik>
                {proje.tags[0] && (
                  <p className="text-muted truncate text-[0.7rem] tracking-[0.12em] uppercase">
                    {proje.tags.slice(0, 2).join(' · ')}
                  </p>
                )}
              </div>
              <Link
                href={yol(dil, 'projeler', proje.slug)}
                aria-label={s.inceleEtiket(proje.title)}
                className={hapSiniflari('hidden sm:inline-flex')}
              >
                {s.incele}
              </Link>
            </header>

            <div className="grid gap-3 p-3 pt-0 md:grid-cols-[1.6fr_1fr] md:gap-4 md:p-4 md:pt-0">
              <div className="group overflow-hidden rounded-[1.25rem] md:rounded-[1.75rem]">
                <KapakGorsel
                  kapak={proje.cover}
                  // Yüklenmiş kapak yoksa statik kapak (statik-kapak.ts).
                  src={proje.cover ? undefined : (statikKapak(proje) ?? undefined)}
                  baslik={proje.title}
                  className="ease-brand h-full transition-transform duration-700 group-hover:scale-[1.04]"
                />
              </div>

              <div className="bg-canvas border-line flex flex-col justify-between gap-6 rounded-[1.25rem] border p-5 md:rounded-[1.75rem] md:p-6">
                <p className="text-body text-sm leading-relaxed">{proje.summary}</p>

                <pre
                  aria-label={s.kunyeEtiket(proje.title)}
                  className="tabular text-muted overflow-x-auto text-[0.72rem] leading-relaxed"
                >
                  <code>
                    <span className="text-accent-soft">const</span>{' '}
                    <span className="text-primary">{s.kodDegisken}</span> = {'{'}
                    {'\n'}
                    {/* Boş dizi satırı YAZILMIYOR: `yığın: []` "yığın yok" diye okunur. */}
                    {(
                      [
                        [s.kodYigin, proje.stack],
                        [s.kodEtiketler, proje.tags],
                      ] as const
                    ).map(
                      ([anahtar, liste]) =>
                        liste.length > 0 && (
                          <span key={anahtar}>
                            {'  '}
                            {anahtar}: [
                            {liste.slice(0, 4).map((t, i) => (
                              <span key={t}>
                                {i > 0 && ', '}
                                <span className="text-success">&apos;{t}&apos;</span>
                              </span>
                            ))}
                            ],{'\n'}
                          </span>
                        ),
                    )}
                    {/* Dönem — yayın tarihi değil (bkz. `Project.period`); boşsa satır yok. */}
                    {proje.period && (
                      <>
                        {'  '}
                        {s.kodDonem}:{' '}
                        <span className="text-success">&apos;{proje.period}&apos;</span>,{'\n'}
                      </>
                    )}
                    {'}'};
                  </code>
                </pre>
              </div>
            </div>
          </article>
        </li>
      ))}
    </ol>
  );
}
