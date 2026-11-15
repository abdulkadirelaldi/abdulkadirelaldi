'use client';

import { FolderPlus, Paperclip, Pencil, Plus, StickyNote } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import { Alan } from '@/components/panel/alan';
import { Pencere } from '@/components/panel/takvim/pencere';
import { Button } from '@/components/ui/button';
import { FormError } from '@/components/ui/form-error';
import { Input } from '@/components/ui/input';
import { rafYollari, type RafYolu } from '@/lib/masa/raf';
import { TAKVIM_KATMANLARI } from '@/lib/takvim/katmanlar';
import { cn } from '@/lib/utils/cn';
import {
  dolapGuncelleAction,
  dolapSilAction,
  rafGuncelleAction,
  rafOlusturAction,
  rafSilAction,
} from '@/server/actions/masa';
import type { AppDay } from '@/server/services/_shared/app-date';
import type { DolapAyrintisi, DolapSecenegi, GorevDto, OgeDto } from '@/server/services/masa';
import type { ApiResponse } from '@/types';

import { ClaudePaneli } from './claude-paneli';
import { DolapFormu } from './dolap-formu';
import { useGorevIslemleri } from './gorev-islemleri';
import { GorevSatiri } from './gorev-satiri';
import { OgeSatiri, useOgeIslemleri } from './oge-islemleri';

type RafPenceresi =
  { tur: 'kapali' } | { tur: 'yeni'; ustRaf: RafYolu | null } | { tur: 'duzenle'; raf: RafYolu };

/**
 * DOLAP EKRANI (ADR-049 M2) — raflar ağaç sırasıyla (girintili), her rafın altında açık
 * görevleri; rafsız görevler en üstte. Silme iki adımlı ("Sil" → "Eminim, sil"); içi dolu raf ve
 * dolap sunucuda reddedilir, mesaj ekranda.
 */
export function DolapEkrani({
  dolap,
  secenekler,
  bugun,
}: {
  dolap: DolapAyrintisi;
  secenekler: readonly DolapSecenegi[];
  bugun: AppDay;
}) {
  const router = useRouter();
  const gorev = useGorevIslemleri(secenekler);
  const oge = useOgeIslemleri();
  // Sunucudan taze dolap geldi: yerel güncel kopyalar artık gereksiz.
  const { sifirla: gorevSifirla } = gorev;
  const { sifirla: ogeSifirla } = oge;
  useEffect(() => {
    gorevSifirla();
    ogeSifirla();
  }, [dolap, gorevSifirla, ogeSifirla]);
  const [rafPenceresi, setRafPenceresi] = useState<RafPenceresi>({ tur: 'kapali' });
  const [dolapPenceresi, setDolapPenceresi] = useState(false);
  const yollar = rafYollari(dolap.raflar);
  const rafGorevleri = new Map<string | null, GorevDto[]>();
  for (const g of gorev.uygula(dolap.acik)) {
    const k = rafGorevleri.get(g.rafId) ?? [];
    k.push(g);
    rafGorevleri.set(g.rafId, k);
  }
  const rafsiz = rafGorevleri.get(null) ?? [];
  const rafOgeleri = new Map<string | null, OgeDto[]>();
  for (const o of oge.uygula(dolap.ogeler)) {
    const k = rafOgeleri.get(o.rafId) ?? [];
    k.push(o);
    rafOgeleri.set(o.rafId, k);
  }
  const rafsizOgeler = rafOgeleri.get(null) ?? [];
  const ogeSatiri = (o: OgeDto) => <OgeSatiri key={o.id} o={o} ac={oge.ac} />;
  const kucukDugme =
    'focus-ring text-muted hover:text-primary flex size-9 items-center justify-center rounded-full';
  const satir = (g: GorevDto) => (
    <GorevSatiri
      key={g.id}
      g={g}
      bugun={bugun}
      durumDegistir={gorev.durumDegistir}
      ac={gorev.duzenle}
      yerGoster={false}
    />
  );
  const tazele = <T,>(sonuc: ApiResponse<T>, kapat: () => void): ApiResponse<T> => {
    if (sonuc.ok) {
      kapat();
      router.refresh();
    }
    return sonuc;
  };

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-5 pb-20 lg:pb-0">
      <div className="flex flex-wrap items-center gap-3">
        <span aria-hidden="true" className="text-3xl">
          {dolap.emoji}
        </span>
        {/* Dolabın adı üst çubukta (h1) — burada tekrar başlık olmaz. */}
        <p className="text-muted min-w-0 text-sm">
          Takvimde {TAKVIM_KATMANLARI[dolap.katman].ad} katmanı
          {dolap.arsivlendi && ' · Arşivde'}
        </p>
        <div className="ml-auto flex flex-wrap gap-2">
          <Button size="sm" variant="ghost" onClick={() => setDolapPenceresi(true)}>
            <Pencil className="size-4" aria-hidden="true" />
            Dolabı düzenle
          </Button>
          <Button size="sm" variant="secondary" onClick={() => oge.yeniNot(dolap.id, null)}>
            <StickyNote className="size-4" aria-hidden="true" />
            Not
          </Button>
          <Button size="sm" variant="secondary" onClick={() => oge.dosyaSec(dolap.id, null)}>
            <Paperclip className="size-4" aria-hidden="true" />
            Dosya yükle
          </Button>
          <Button size="sm" onClick={() => gorev.yeniGorev({ dolapId: dolap.id })}>
            <Plus className="size-4" aria-hidden="true" />
            Yeni görev
          </Button>
        </div>
      </div>
      {gorev.hata && <FormError>{gorev.hata}</FormError>}
      {oge.ekler}

      {(rafsiz.length > 0 || rafsizOgeler.length > 0) && (
        <ul className="rounded-card border-line bg-surface divide-line divide-y border">
          {rafsiz.map(satir)}
          {rafsizOgeler.map(ogeSatiri)}
        </ul>
      )}

      <section aria-labelledby="raflar-baslik" className="flex flex-col gap-3">
        <div className="flex items-center gap-3">
          <h3 id="raflar-baslik" className="text-primary text-base font-semibold">
            Raflar
          </h3>
          <Button
            size="sm"
            variant="secondary"
            className="ml-auto"
            onClick={() => setRafPenceresi({ tur: 'yeni', ustRaf: null })}
          >
            <FolderPlus className="size-4" aria-hidden="true" />
            Yeni raf
          </Button>
        </div>
        {yollar.length === 0 ? (
          <p className="rounded-card border-line-hover text-muted border border-dashed p-4 text-center text-sm">
            Bu dolapta raf yok. Örneğin &ldquo;Derslerim&rdquo;, sonra her ders için bir alt raf.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {yollar.map((r) => {
              const gorevler = rafGorevleri.get(r.id) ?? [];
              const ogeler = rafOgeleri.get(r.id) ?? [];
              return (
                <li
                  key={r.id}
                  style={{ marginInlineStart: `${r.derinlik * 1.25}rem` }}
                  className="rounded-card border-line bg-surface border"
                >
                  <div className="flex items-center gap-1 px-3 py-2">
                    <span aria-hidden="true">📂</span>
                    <h4 className="text-primary min-w-0 flex-1 truncate text-sm font-semibold">
                      {r.ad}
                      <span className="text-muted ml-1.5 font-normal">
                        · {gorevler.length + ogeler.length}
                      </span>
                    </h4>
                    <button
                      type="button"
                      aria-label={`${r.ad} rafına görev ekle`}
                      onClick={() => gorev.yeniGorev({ dolapId: dolap.id, rafId: r.id })}
                      className={kucukDugme}
                    >
                      <Plus className="size-4" aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      aria-label={`${r.ad} rafına not ekle`}
                      onClick={() => oge.yeniNot(dolap.id, r.id)}
                      className={kucukDugme}
                    >
                      <StickyNote className="size-4" aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      aria-label={`${r.ad} rafına dosya yükle`}
                      onClick={() => oge.dosyaSec(dolap.id, r.id)}
                      className={kucukDugme}
                    >
                      <Paperclip className="size-4" aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      aria-label={`${r.ad} rafını düzenle`}
                      onClick={() => setRafPenceresi({ tur: 'duzenle', raf: r })}
                      className="focus-ring text-muted hover:text-primary flex size-9 items-center justify-center rounded-full"
                    >
                      <Pencil className="size-4" aria-hidden="true" />
                    </button>
                  </div>
                  {gorevler.length + ogeler.length > 0 && (
                    <ul className="divide-line border-line divide-y border-t">
                      {gorevler.map(satir)}
                      {ogeler.map(ogeSatiri)}
                    </ul>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {dolap.tamamlanan.length > 0 && (
        <details>
          <summary className="focus-ring text-muted cursor-pointer rounded text-sm font-medium">
            Tamamlananlar · {dolap.tamamlanan.length}
          </summary>
          <ul className="rounded-card border-line bg-surface divide-line mt-2 divide-y border">
            {gorev.uygula(dolap.tamamlanan).map(satir)}
          </ul>
        </details>
      )}

      {gorev.pencere}
      <ClaudePaneli dolapId={dolap.id} dolapAdi={dolap.ad} />

      {rafPenceresi.tur !== 'kapali' && (
        <Pencere
          baslik={rafPenceresi.tur === 'yeni' ? 'Yeni raf' : 'Rafı düzenle'}
          kapat={() => setRafPenceresi({ tur: 'kapali' })}
        >
          <RafFormu
            ilkAd={rafPenceresi.tur === 'duzenle' ? rafPenceresi.raf.ad : ''}
            ustSecenekleri={
              rafPenceresi.tur === 'yeni' ? yollar.filter((y) => y.derinlik < 2) : null
            }
            ilkUst={rafPenceresi.tur === 'yeni' ? (rafPenceresi.ustRaf?.id ?? '') : ''}
            vazgec={() => setRafPenceresi({ tur: 'kapali' })}
            kaydet={async ({ ad, ustRafId }) => {
              const kapat = () => setRafPenceresi({ tur: 'kapali' });
              return rafPenceresi.tur === 'yeni'
                ? tazele(
                    await rafOlusturAction({ dolapId: dolap.id, ustRafId: ustRafId || null, ad }),
                    kapat,
                  )
                : tazele(await rafGuncelleAction({ id: rafPenceresi.raf.id, ad }), kapat);
            }}
            sil={
              rafPenceresi.tur === 'duzenle'
                ? async () =>
                    tazele(await rafSilAction({ id: rafPenceresi.raf.id }), () =>
                      setRafPenceresi({ tur: 'kapali' }),
                    )
                : undefined
            }
          />
        </Pencere>
      )}

      {dolapPenceresi && (
        <Pencere baslik="Dolabı düzenle" kapat={() => setDolapPenceresi(false)}>
          <DolapFormu
            ilk={{ ad: dolap.ad, emoji: dolap.emoji, katman: dolap.katman }}
            vazgec={() => setDolapPenceresi(false)}
            kaydet={async (girdi) =>
              tazele(await dolapGuncelleAction({ id: dolap.id, ...girdi }), () =>
                setDolapPenceresi(false),
              )
            }
            ek={
              <DolapEkIslemleri
                arsivde={dolap.arsivlendi}
                arsivle={async () =>
                  tazele(
                    await dolapGuncelleAction({ id: dolap.id, arsivlendi: !dolap.arsivlendi }),
                    () => setDolapPenceresi(false),
                  )
                }
                sil={async () => {
                  const sonuc = await dolapSilAction({ id: dolap.id });
                  if (sonuc.ok) router.push('/panel/masa');
                  return sonuc;
                }}
              />
            }
          />
        </Pencere>
      )}
    </div>
  );
}

function RafFormu({
  ilkAd,
  ilkUst,
  ustSecenekleri,
  kaydet,
  vazgec,
  sil,
}: {
  ilkAd: string;
  ilkUst: string;
  /** `null`: düzenlemede üst raf değişmez. */
  ustSecenekleri: readonly RafYolu[] | null;
  kaydet: (g: { ad: string; ustRafId: string }) => Promise<ApiResponse<unknown>>;
  vazgec: () => void;
  sil?: () => Promise<ApiResponse<unknown>>;
}) {
  const [ad, setAd] = useState(ilkAd);
  const [ust, setUst] = useState(ilkUst);
  const [hata, setHata] = useState<{ mesaj: string; alanlar: Record<string, string> } | null>(null);
  const [silOnay, setSilOnay] = useState(false);
  const calistir = async (is: () => Promise<ApiResponse<unknown>>) => {
    setHata(null);
    const sonuc = await is();
    if (!sonuc.ok) setHata({ mesaj: sonuc.error.message, alanlar: sonuc.error.fields ?? {} });
  };

  return (
    <form
      noValidate
      className="flex flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        void calistir(() => kaydet({ ad, ustRafId: ust }));
      }}
    >
      <Alan id="raf-ad" etiket="Raf adı" hata={hata?.alanlar.ad}>
        {(b) => (
          <Input
            id="raf-ad"
            data-ilk-odak
            value={ad}
            maxLength={60}
            onChange={(e) => setAd(e.target.value)}
            placeholder="Fizik"
            {...b}
          />
        )}
      </Alan>
      {ustSecenekleri && ustSecenekleri.length > 0 && (
        <Alan id="raf-ust" etiket="Üst raf" hata={hata?.alanlar.ustRafId}>
          {(b) => (
            <select
              id="raf-ust"
              value={ust}
              onChange={(e) => setUst(e.target.value)}
              className="focus-ring border-line bg-elevated text-primary min-h-11 w-full rounded-lg border px-3 text-base sm:text-sm"
              {...b}
            >
              <option value="">Yok (dolabın içinde)</option>
              {ustSecenekleri.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.yol}
                </option>
              ))}
            </select>
          )}
        </Alan>
      )}
      {hata && <FormError>{hata.mesaj}</FormError>}
      <div className="flex flex-wrap items-center gap-2">
        <Button type="submit">Kaydet</Button>
        <Button variant="ghost" onClick={vazgec}>
          Vazgeç
        </Button>
        {sil && (
          <Button
            variant="danger"
            className="ml-auto"
            onClick={() => (silOnay ? void calistir(sil) : setSilOnay(true))}
          >
            {silOnay ? 'Eminim, sil' : 'Sil'}
          </Button>
        )}
      </div>
    </form>
  );
}

function DolapEkIslemleri({
  arsivde,
  arsivle,
  sil,
}: {
  arsivde: boolean;
  arsivle: () => Promise<ApiResponse<unknown>>;
  sil: () => Promise<ApiResponse<unknown>>;
}) {
  const [silOnay, setSilOnay] = useState(false);
  const [hata, setHata] = useState<string | null>(null);
  const calistir = async (is: () => Promise<ApiResponse<unknown>>) => {
    setHata(null);
    const sonuc = await is();
    if (!sonuc.ok) setHata(sonuc.error.message);
  };
  return (
    <div className={cn('ml-auto flex flex-wrap items-center gap-2')}>
      <Button variant="secondary" onClick={() => void calistir(arsivle)}>
        {arsivde ? 'Arşivden çıkar' : 'Arşivle'}
      </Button>
      <Button variant="danger" onClick={() => (silOnay ? void calistir(sil) : setSilOnay(true))}>
        {silOnay ? 'Eminim, sil' : 'Sil'}
      </Button>
      {hata && (
        <p role="alert" className="text-danger w-full text-sm">
          {hata}
        </p>
      )}
    </div>
  );
}
