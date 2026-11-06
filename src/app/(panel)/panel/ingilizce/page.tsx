import { Check, Flame, Lock, Play, RotateCcw, Zap } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';

import { HedefSecici } from '@/components/panel/ingilizce/hedef-secici';
import { Topbar } from '@/components/panel/topbar';
import { dersBul, PARKURLAR, parkurBul } from '@/lib/ingilizce/mufredat';
import { cn } from '@/lib/utils/cn';
import { auth } from '@/server/auth';
import { acikMi, fetchIngilizceDurum, tekrarKimligi } from '@/server/services/ingilizce';

export const metadata: Metadata = {
  title: 'İngilizce',
  robots: { index: false, follow: false, nocache: true },
};

type SayfaProps = { searchParams: Promise<Record<string, string | string[] | undefined>> };

const GUN_KISA = ['Pz', 'Pt', 'Sa', 'Ça', 'Pe', 'Cu', 'Ct'];

/**
 * `/panel/ingilizce` — üç parkur (günlük, yazılım, sınav), üniteler temelden ileriye
 * (2026-11-06). Ders sırayla açılır; seri, günlük XP hedefi ve zayıf soru tekrarı.
 */
export default async function IngilizcePage({ searchParams }: SayfaProps) {
  const ham = (await searchParams).parkur;
  const parkur = (typeof ham === 'string' && parkurBul(ham)) || PARKURLAR[0]!;
  const session = await auth();
  const d = await fetchIngilizceDurum(session?.user?.id ?? null);
  const tamamlanan = new Set(d.tamamlanan);

  const dersler = parkur.uniteler.flatMap((u) => u.dersler);
  const siradaki = dersler.find((ders) => !tamamlanan.has(ders.id)) ?? null;
  const hedefOran = Math.min(1, d.bugunXp / d.hedefXp);
  const enCokXp = Math.max(d.hedefXp, ...d.hafta.map((h) => h.xp));

  return (
    <>
      <Topbar title="İngilizce" />
      <main id="panel-icerik" className="flex-1 px-4 py-4 lg:p-6">
        <div className="mx-auto flex max-w-2xl flex-col gap-4">
          <section className="aura aura-dil flex flex-col gap-4 p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="flex flex-col gap-1">
                <span className="ust-etiket">Seri</span>
                <span className="flex items-center gap-2 text-3xl font-semibold">
                  <Flame
                    className={cn('size-7', d.bugunYapildi ? 'text-orange-400' : 'text-white/40')}
                    aria-hidden="true"
                  />
                  <span className="tabular">{d.seri}</span>
                  <span className="text-base font-medium opacity-80">gün</span>
                </span>
                <span className="text-xs opacity-85">
                  {d.bugunYapildi
                    ? 'Bugünün dersi tamam.'
                    : d.seri > 0
                      ? 'Seri sürsün: bugün bir ders yap.'
                      : 'İlk dersle seriyi başlat.'}
                </span>
              </div>
              <div className="cam-kutu flex flex-col items-end gap-0.5 px-3 py-2">
                <span className="ust-etiket">Toplam</span>
                <span className="tabular flex items-center gap-1 text-lg font-semibold">
                  <Zap className="size-4 text-amber-300" aria-hidden="true" />
                  {d.toplamXp.toLocaleString('tr-TR')} XP
                </span>
              </div>
            </div>
            <div>
              <div className="mb-1.5 flex justify-between text-xs">
                <span className="opacity-85">Bugün</span>
                <span className="tabular">
                  {d.bugunXp} / {d.hedefXp} XP
                </span>
              </div>
              <div className="h-2.5 overflow-hidden rounded-full bg-white/15">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-amber-300 to-orange-400"
                  style={{ width: `${hedefOran * 100}%` }}
                />
              </div>
            </div>
            <ol className="grid grid-cols-7 gap-1.5" aria-label="Son 7 gün">
              {d.hafta.map((h) => {
                const tarih = new Date(`${h.gun}T00:00:00Z`);
                return (
                  <li
                    key={h.gun}
                    aria-label={`${h.gun}: ${h.xp} XP`}
                    className="flex flex-col items-center gap-1"
                  >
                    <span className="flex h-10 w-full items-end overflow-hidden rounded-md bg-white/10">
                      {h.xp > 0 && (
                        <span
                          className={cn(
                            'w-full rounded-md',
                            h.xp >= d.hedefXp ? 'bg-amber-300' : 'bg-white/55',
                          )}
                          style={{ height: `${Math.max(12, (h.xp / enCokXp) * 100)}%` }}
                        />
                      )}
                    </span>
                    <span className="text-[10px] opacity-75">{GUN_KISA[tarih.getUTCDay()]}</span>
                  </li>
                );
              })}
            </ol>
          </section>

          <nav
            aria-label="Parkurlar"
            className="bg-elevated grid grid-cols-3 gap-1 rounded-2xl p-1"
          >
            {PARKURLAR.map((p) => {
              const hepsi = p.uniteler.flatMap((u) => u.dersler);
              const biten = hepsi.filter((x) => tamamlanan.has(x.id)).length;
              const aktif = p.id === parkur.id;
              return (
                <Link
                  key={p.id}
                  href={`/panel/ingilizce?parkur=${p.id}`}
                  aria-current={aktif ? 'page' : undefined}
                  className={cn(
                    'focus-ring flex flex-col items-center rounded-xl px-2 py-2 text-center transition-colors',
                    aktif ? 'bg-surface text-primary shadow-sm' : 'text-muted',
                  )}
                >
                  <span className="text-sm font-semibold">{p.ad.split(' ')[0]}</span>
                  <span className="tabular text-[11px]">
                    {biten}/{hepsi.length}
                  </span>
                </Link>
              );
            })}
          </nav>

          <p className="text-body text-sm">{parkur.aciklama}</p>

          {d.zayif[parkur.id] > 0 && (
            <Link
              href={`/panel/ingilizce/ders/${tekrarKimligi(parkur.id)}`}
              className="focus-ring rounded-card border-line bg-surface flex items-center gap-3 border p-4"
            >
              <span className="flex size-10 items-center justify-center rounded-xl bg-amber-500/15 text-amber-500">
                <RotateCcw className="size-5" aria-hidden="true" />
              </span>
              <span className="flex min-w-0 flex-col">
                <span className="text-primary text-sm font-semibold">
                  Zayıf noktalarını tekrar et
                </span>
                <span className="text-muted text-xs">
                  {d.zayif[parkur.id]} soru — yanlış yaptıkların, bilene kadar
                </span>
              </span>
            </Link>
          )}

          {parkur.uniteler.map((u, ui) => {
            const biten = u.dersler.filter((x) => tamamlanan.has(x.id)).length;
            return (
              <section
                key={u.id}
                aria-labelledby={`${u.id}-baslik`}
                className="rounded-card border-line bg-surface flex flex-col gap-3 border p-4"
              >
                <header className="flex items-start gap-3">
                  <span className="bg-accent/15 text-accent tabular rounded-lg px-2 py-1 text-xs font-bold">
                    {u.seviye}
                  </span>
                  <div className="flex min-w-0 flex-1 flex-col">
                    <h2 id={`${u.id}-baslik`} className="text-primary font-semibold">
                      {ui + 1}. {u.baslik}
                    </h2>
                    <p className="text-muted text-xs">{u.ozet}</p>
                  </div>
                  <span className="text-muted tabular text-xs">
                    {biten}/{u.dersler.length}
                  </span>
                </header>
                <ol className="flex flex-col gap-1.5">
                  {u.dersler.map((ders) => {
                    const konum = dersBul(ders.id)!;
                    const bitti = tamamlanan.has(ders.id);
                    const acik = acikMi(konum, tamamlanan);
                    const simdi = siradaki?.id === ders.id;
                    const icerik = (
                      <>
                        <span
                          className={cn(
                            'flex size-9 shrink-0 items-center justify-center rounded-full',
                            bitti
                              ? 'bg-success text-white'
                              : simdi
                                ? 'bg-accent text-white'
                                : 'bg-elevated text-muted',
                          )}
                        >
                          {bitti ? (
                            <Check className="size-4" aria-hidden="true" />
                          ) : acik ? (
                            <Play className="size-4" aria-hidden="true" />
                          ) : (
                            <Lock className="size-4" aria-hidden="true" />
                          )}
                        </span>
                        <span className="flex min-w-0 flex-1 flex-col">
                          <span className={cn('text-sm', acik ? 'text-primary' : 'text-muted')}>
                            {ders.baslik}
                          </span>
                          <span className="text-muted text-xs">
                            {ders.alistirmalar.length} soru
                            {bitti ? ' · tamamlandı' : ''}
                          </span>
                        </span>
                        {simdi && (
                          <span className="bg-accent rounded-full px-3 py-1 text-xs font-semibold text-white">
                            Başla
                          </span>
                        )}
                      </>
                    );
                    return (
                      <li key={ders.id}>
                        {acik ? (
                          <Link
                            href={`/panel/ingilizce/ders/${ders.id}`}
                            className={cn(
                              'focus-ring flex items-center gap-3 rounded-2xl px-2 py-2',
                              simdi && 'bg-accent/8',
                            )}
                          >
                            {icerik}
                          </Link>
                        ) : (
                          <div className="flex items-center gap-3 rounded-2xl px-2 py-2 opacity-70">
                            {icerik}
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ol>
              </section>
            );
          })}

          <HedefSecici hedef={d.hedefXp} />
        </div>
      </main>
    </>
  );
}
