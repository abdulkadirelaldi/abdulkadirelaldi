'use client';

import { CalendarPlus, Plus } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState, useTransition } from 'react';

import { Pencere } from '@/components/panel/takvim/pencere';
import { FormError } from '@/components/ui/form-error';
import { ALAN_SIRASI, ALANLAR } from '@/lib/gorev/bicim';
import { kapsamaUyar, kapsamTabelasi, type Kapsam } from '@/lib/gorev/sokak';
import { cn } from '@/lib/utils/cn';
import {
  gorevBittiAction,
  gorevGuncelleAction,
  gorevOlusturAction,
  gorevSilAction,
} from '@/server/actions/gorev';
import type { AppDay } from '@/server/services/_shared/app-date';
import type { GorevDto, IsListesi } from '@/server/services/gorev';
import type { ApiResponse, IsAlani } from '@/types';

import { bosGorev, GorevFormu, gorevdenForm } from './gorev-formu';
import { GorevObegi, GorevSatiri } from './gorev-satiri';

type Pencere =
  { tur: 'kapali' } | { tur: 'yeni'; baslik: string } | { tur: 'duzenle'; g: GorevDto };
type Suzgec = IsAlani | 'TUMU';

const ACIK_OBEKLER = [
  { anahtar: 'gecikmis', baslik: 'Gecikmiş', ton: 'tehlike' },
  { anahtar: 'bugun', baslik: 'Bugün', ton: 'normal' },
  { anahtar: 'buHafta', baslik: 'Bu hafta', ton: 'normal' },
  { anahtar: 'sonra', baslik: 'Daha sonra', ton: 'normal' },
  { anahtar: 'tarihsiz', baslik: 'Tarihsiz', ton: 'normal' },
] as const;

/**
 * İŞLER EKRANI (ADR-050). Üstte hızlı ekleme (yaz + Enter), alan süzgeci; altta tarih öbekleri ve
 * katlanmış "Bitenler". Öbekler sunucuda kurulur; süzgeç istemcide.
 *
 * YEREL GÜNCEL HÂL: tik ve kayıttan sonra sayfa sunucudan tazelenir ama telefonda bu belirgin
 * sürer. Arada satır eski hâliyle kalmasın diye sunucunun döndürdüğü DTO tutulur (`null` = silindi);
 * taze liste gelince yerel hâl sıfırlanır.
 */
export function IslerEkrani({
  liste,
  bugun,
  kapsam,
}: {
  liste: IsListesi;
  bugun: AppDay;
  /** Dükkânın içi (ADR-057): yalnızca bu kapsamın işleri; yeni iş bu kapsama eklenir. */
  kapsam?: Kapsam;
}) {
  const router = useRouter();
  const [, gecis] = useTransition();
  const [pencere, setPencere] = useState<Pencere>({ tur: 'kapali' });
  const [suzgec, setSuzgec] = useState<Suzgec>('TUMU');
  const [hata, setHata] = useState<string | null>(null);
  const [hizli, setHizli] = useState('');
  const [yerel, setYerel] = useState<Readonly<Record<string, GorevDto | null>>>({});
  useEffect(() => setYerel({}), [liste]);

  const yaz = (id: string, g: GorevDto | null) => setYerel((y) => ({ ...y, [id]: g }));
  const kapat = () => setPencere({ tur: 'kapali' });

  const uygula = (gorevler: readonly GorevDto[]) =>
    gorevler.flatMap((g) => {
      const y = yerel[g.id];
      if (y === null) return [];
      const guncel = y ?? g;
      if (kapsam) return kapsamaUyar(guncel, kapsam) ? [guncel] : [];
      return suzgec === 'TUMU' || guncel.alan === suzgec ? [guncel] : [];
    });

  const tumAcik = useMemo(() => ACIK_OBEKLER.flatMap((o) => liste[o.anahtar]), [liste]);
  const sayilar = useMemo(() => {
    const s: Record<Suzgec, number> = {
      TUMU: 0,
      KIYI_MEDYA: 0,
      OKUL: 0,
      SPECTRALOOP: 0,
      KISISEL: 0,
    };
    for (const g of tumAcik) {
      s.TUMU++;
      s[g.alan]++;
    }
    return s;
  }, [tumAcik]);
  const etiketOnerileri = useMemo(
    () =>
      [
        ...new Set([...tumAcik, ...liste.bitenler].flatMap((g) => (g.etiket ? [g.etiket] : []))),
      ].sort((a, b) => a.localeCompare(b, 'tr')),
    [tumAcik, liste.bitenler],
  );

  // Yeni işin varsayılanı: dükkânda o müşteri (Kıyı + etiket), binada o alan, değilse süzgeç.
  const yeniAlan: IsAlani = kapsam
    ? kapsam.tur === 'dukkan'
      ? 'KIYI_MEDYA'
      : kapsam.alan
    : suzgec === 'TUMU'
      ? 'KISISEL'
      : suzgec;
  const yeniEtiket = kapsam?.tur === 'dukkan' ? kapsam.etiket : '';
  const yerAdi = kapsam ? kapsamTabelasi(kapsam).ad : suzgec === 'TUMU' ? null : ALANLAR[suzgec].ad;

  const tikle = (g: GorevDto) => {
    const bitti = g.tamamlandiAt === null;
    // Önce ekranda işaretle — dokunuşun karşılığı anında görünsün.
    yaz(g.id, { ...g, tamamlandiAt: bitti ? new Date().toISOString() : null });
    gecis(async () => {
      setHata(null);
      const sonuc = await gorevBittiAction({ id: g.id, bitti });
      if (sonuc.ok) {
        yaz(g.id, sonuc.data);
        router.refresh();
      } else {
        yaz(g.id, g);
        setHata(sonuc.error.message);
      }
    });
  };

  const bitir = <T,>(sonuc: ApiResponse<T>, silinen?: string): ApiResponse<T> => {
    if (sonuc.ok) {
      if (silinen) yaz(silinen, null);
      else yaz((sonuc.data as GorevDto).id, sonuc.data as GorevDto);
      kapat();
      router.refresh();
    }
    return sonuc;
  };

  const hizliEkle = () => {
    const baslik = hizli.trim();
    if (!baslik) return;
    gecis(async () => {
      setHata(null);
      const sonuc = await gorevOlusturAction({
        baslik,
        alan: yeniAlan,
        ...(yeniEtiket ? { etiket: yeniEtiket } : {}),
      });
      if (sonuc.ok) {
        setHizli('');
        router.refresh();
      } else setHata(sonuc.error.message);
    });
  };

  const satir = (g: GorevDto) => (
    <GorevSatiri
      key={g.id}
      g={g}
      bugun={bugun}
      tikle={tikle}
      ac={(x) => setPencere({ tur: 'duzenle', g: x })}
    />
  );

  const obekler = ACIK_OBEKLER.map((o) => ({ ...o, gorevler: uygula(liste[o.anahtar]) }));
  const acikSayi = obekler.reduce((t, o) => t + o.gorevler.length, 0);
  const bitenler = uygula(liste.bitenler);
  const bugunSayi = obekler.find((o) => o.anahtar === 'bugun')!.gorevler.length;
  const gecikmisSayi = obekler.find((o) => o.anahtar === 'gecikmis')!.gorevler.length;

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-5 pb-24 lg:pb-0">
      <div className="flex items-end justify-between gap-3">
        <p className="text-muted text-sm" aria-live="polite">
          {acikSayi === 0
            ? 'Yapılacak iş yok.'
            : [
                bugunSayi > 0 ? `Bugün ${bugunSayi} iş` : 'Bugün için iş yok',
                gecikmisSayi > 0 ? `${gecikmisSayi} gecikmiş` : null,
                bitenler.length > 0 ? `bu hafta ${bitenler.length} bitti` : null,
              ]
                .filter(Boolean)
                .join(' · ')}
        </p>
      </div>

      <form
        className="rounded-card border-line bg-surface focus-within:border-accent flex items-center gap-2 border px-3 transition-colors"
        onSubmit={(e) => {
          e.preventDefault();
          hizliEkle();
        }}
      >
        <Plus className="text-muted size-4 shrink-0" aria-hidden="true" />
        <label htmlFor="hizli-gorev" className="sr-only">
          Hızlı ekle
        </label>
        <input
          id="hizli-gorev"
          value={hizli}
          onChange={(e) => setHizli(e.target.value)}
          maxLength={160}
          enterKeyHint="done"
          placeholder={yerAdi ? `${yerAdi} için hızlı ekle…` : 'Hızlı ekle…'}
          className="text-primary placeholder:text-muted min-h-12 flex-1 bg-transparent text-base outline-none sm:text-sm"
        />
        {/* Tek giriş (ADR-053): tarih/alan/etiket gerekiyorsa aynı satırdan ayrıntılı form. */}
        <button
          type="button"
          aria-label="Ayrıntılı ekle"
          title="Tarih, alan ve etiketle ekle"
          onClick={() => {
            setPencere({ tur: 'yeni', baslik: hizli.trim() });
            setHizli('');
          }}
          className="focus-ring text-muted hover:text-primary -mr-1 flex size-10 shrink-0 items-center justify-center rounded-full"
        >
          <CalendarPlus className="size-5" aria-hidden="true" />
        </button>
      </form>

      {!kapsam && (
        <div
          role="tablist"
          aria-label="Alan"
          className="-mx-4 flex [scrollbar-width:none] gap-2 overflow-x-auto px-4 lg:mx-0 lg:px-0"
        >
          {(['TUMU', ...ALAN_SIRASI] as const).map((a) => (
            <button
              key={a}
              type="button"
              role="tab"
              aria-selected={suzgec === a}
              onClick={() => setSuzgec(a)}
              className={cn(
                'focus-ring flex min-h-9 shrink-0 items-center gap-1.5 rounded-full border px-3.5 text-sm transition-colors',
                suzgec === a
                  ? 'border-primary bg-primary text-surface font-medium'
                  : 'border-line text-body',
              )}
            >
              {a !== 'TUMU' && (
                <span
                  aria-hidden="true"
                  className={cn('size-1.5 rounded-full', ALANLAR[a].nokta)}
                />
              )}
              {a === 'TUMU' ? 'Tümü' : ALANLAR[a].ad}
              {sayilar[a] > 0 && <span className="opacity-60">{sayilar[a]}</span>}
            </button>
          ))}
        </div>
      )}

      {hata && <FormError>{hata}</FormError>}

      <div className="flex flex-col gap-5">
        {obekler.map((o) => (
          <GorevObegi
            key={o.anahtar}
            id={`obek-${o.anahtar}`}
            baslik={o.baslik}
            ton={o.ton}
            gorevler={o.gorevler}
          >
            {satir}
          </GorevObegi>
        ))}
        {acikSayi === 0 && (
          <p className="rounded-card border-line-hover text-muted border border-dashed p-6 text-center text-sm">
            {yerAdi ? `${yerAdi} için açık iş yok.` : 'Liste boş. Yukarıdan yazıp Enter’a bas.'}
          </p>
        )}
        {bitenler.length > 0 && (
          <details className="group">
            <summary className="focus-ring text-muted cursor-pointer rounded px-1 text-xs font-semibold tracking-wide uppercase">
              Bitenler · son 7 gün · {bitenler.length}
            </summary>
            <ul className="rounded-card border-line bg-surface divide-line mt-2 divide-y border">
              {bitenler.map(satir)}
            </ul>
          </details>
        )}
      </div>

      {pencere.tur !== 'kapali' && (
        <Pencere baslik={pencere.tur === 'yeni' ? 'Yeni iş' : 'İşi düzenle'} kapat={kapat}>
          {pencere.tur === 'yeni' ? (
            <GorevFormu
              ilk={{ ...bosGorev(yeniAlan), etiket: yeniEtiket, baslik: pencere.baslik }}
              etiketOnerileri={etiketOnerileri}
              vazgec={kapat}
              kaydet={async (girdi) => bitir(await gorevOlusturAction(girdi))}
            />
          ) : (
            <GorevFormu
              ilk={gorevdenForm(yerel[pencere.g.id] ?? pencere.g)}
              etiketOnerileri={etiketOnerileri}
              vazgec={kapat}
              kaydet={async (girdi) =>
                bitir(await gorevGuncelleAction({ ...girdi, id: pencere.g.id }))
              }
              sil={async () => bitir(await gorevSilAction({ id: pencere.g.id }), pencere.g.id)}
            />
          )}
        </Pencere>
      )}
    </div>
  );
}
