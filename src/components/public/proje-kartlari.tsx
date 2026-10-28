import Link from 'next/link';

import { BolumGiris } from '@/components/public/bolum-giris';
import { KapakGorsel } from '@/components/public/kapak-gorsel';
import { statikKapak } from '@/components/public/statik-kapak';
import type { Dil } from '@/i18n/diller';
import { yol } from '@/i18n/rotalar';
import { sozluk } from '@/i18n/sozluk';
import type { ProjectListItemDto } from '@/server/services/content-dto';

/** Yüklenmiş ya da statik kapağı olan proje; olmayan görselsiz kart olarak çizilir. */
function gorselVar(proje: ProjectListItemDto): boolean {
  return Boolean(proje.cover || statikKapak(proje));
}

/**
 * Proje kartları — iki sütun ızgara (2026-10-27 kurumsal tasarım).
 *
 * ADR-045'in yapışkan, üst üste binen kart yığını ve `const proje = {…}` kod
 * künyesi "şablon" duruyordu; yığın ayrıca 16 projeyle ekranı doldurmuştu
 * (2026-10-26). Şimdi düz bir ızgara: kapak, dönem, başlık, özet, yığın.
 *
 * Kartın TAMAMI tıklanabilir DEĞİL: bağlantı başlıkta, `after:` ile kartın
 * yüzeyine yayılıyor. Tüm kartı `<a>` yapmak içindeki her şeyi tek, uzun bir
 * bağlantı adına çevirirdi (ekran okuyucu için okunmaz).
 */
export function ProjeKartlari({
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
    <ul className="grid gap-6 md:grid-cols-2">
      {projeler.map((proje, sira) => (
        <li key={proje.id}>
          {/* Sütun sırasına göre kademeli belirme; üzerine gelince 4 px yükselir. */}
          <BolumGiris gecikme={(sira % 2) * 0.08} className="h-full">
            <article className="group border-line bg-canvas hover:border-line-strong rounded-card relative flex h-full flex-col overflow-hidden border transition-[transform,box-shadow,border-color] duration-300 hover:-translate-y-1 hover:shadow-[0_12px_32px_-12px_rgba(15,23,42,0.18)]">
              {gorselVar(proje) && (
                <div className="border-line overflow-hidden border-b">
                  <KapakGorsel
                    kapak={proje.cover}
                    src={proje.cover ? undefined : (statikKapak(proje) ?? undefined)}
                    baslik={proje.title}
                    className="!aspect-[16/9] transition-transform duration-500 group-hover:scale-[1.02]"
                  />
                </div>
              )}

              <div className="flex flex-1 flex-col gap-3 p-6">
                {(proje.tags[0] || proje.period) && (
                  <p className="text-muted text-sm">
                    {[proje.tags.slice(0, 2).join(' · '), proje.period].filter(Boolean).join(' — ')}
                  </p>
                )}
                <Baslik className="text-primary text-xl leading-snug font-semibold">
                  <Link
                    href={yol(dil, 'projeler', proje.slug)}
                    aria-label={s.inceleEtiket(proje.title)}
                    className="focus-ring rounded-btn group-hover:text-accent transition-colors after:absolute after:inset-0"
                  >
                    {proje.title}
                  </Link>
                </Baslik>
                <p className="text-body line-clamp-3 text-sm leading-relaxed">{proje.summary}</p>

                {proje.stack.length > 0 && (
                  <ul aria-label={s.yiginEtiket} className="mt-auto flex flex-wrap gap-1.5 pt-2">
                    {proje.stack.slice(0, 5).map((t) => (
                      <li
                        key={t}
                        className="bg-surface text-body border-line rounded-md border px-2 py-0.5 text-xs"
                      >
                        {t}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </article>
          </BolumGiris>
        </li>
      ))}
    </ul>
  );
}
