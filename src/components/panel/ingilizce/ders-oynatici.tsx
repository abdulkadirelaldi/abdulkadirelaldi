'use client';

import { BookOpen, Flame, Loader2, Target, X, Zap } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';

import type { Alistirma } from '@/lib/ingilizce/tipler';
import { cn } from '@/lib/utils/cn';
import { ingilizceDersBitirAction } from '@/server/actions/ingilizce';
import type { DersSonucu } from '@/server/services/ingilizce';

import {
  DinleSoru,
  EslestirSoru,
  KonusSoru,
  SecmeliSoru,
  SonucIsareti,
  YazSoru,
  type Cevap,
} from './alistirmalar';
import { NotMetni } from './not-metni';

interface Props {
  dersId: string;
  baslik: string;
  ust: string;
  /** Tekrar dersinde yok. */
  not: string | null;
  alistirmalar: readonly Alistirma[];
  geriHref: string;
  sonrakiHref: string | null;
}

interface GeriBildirim extends Cevap {
  aciklama?: string;
}

function aciklamasi(a: Alistirma): string | undefined {
  if (a.tur === 'bosluk' || a.tur === 'secmeli') return a.aciklama;
  if (a.tur === 'dinle' || a.tur === 'yaz') return a.aciklama;
  if (a.tur === 'konus') return a.ipucu;
  return undefined;
}

const BIRINCIL =
  'focus-ring bg-accent hover:bg-accent-hover flex h-12 w-full items-center justify-center rounded-full font-semibold text-white transition-colors disabled:opacity-50';

/**
 * Ders oynatıcısı (2026-11-06). Duolingo gibi: yanlış soru sıranın sonuna eklenir ve
 * doğru bilinene kadar döner; ilerleme çubuğu doğru bilinen soru sayısıdır. Sonuç
 * sunucuya yalnızca kimliklerle gider, XP orada hesaplanır.
 */
export function DersOynatici({
  dersId,
  baslik,
  ust,
  not,
  alistirmalar,
  geriHref,
  sonrakiHref,
}: Props) {
  const router = useRouter();
  const [asama, setAsama] = useState<'not' | 'soru' | 'bitti'>(not ? 'not' : 'soru');
  const [kuyruk, setKuyruk] = useState<Alistirma[]>(() => [...alistirmalar]);
  const [sira, setSira] = useState(0);
  const [deneme, setDeneme] = useState(0);
  const [geri, setGeri] = useState<GeriBildirim | null>(null);
  const [bilinen, setBilinen] = useState<Set<string>>(() => new Set());
  const [hatalar, setHatalar] = useState<Set<string>>(() => new Set());
  const [ilkDogru, setIlkDogru] = useState<Set<string>>(() => new Set());
  const [kayit, setKayit] = useState<
    { durum: 'bekliyor' } | { durum: 'tamam'; sonuc: DersSonucu } | { durum: 'hata'; mesaj: string }
  >({ durum: 'bekliyor' });

  const toplam = useMemo(() => new Set(alistirmalar.map((a) => a.id)).size, [alistirmalar]);
  const simdiki = kuyruk[sira];

  const cevapla = (c: Cevap) => {
    if (!simdiki || geri) return;
    const id = simdiki.id;
    if (c.dogru) {
      if (!hatalar.has(id)) setIlkDogru((s) => new Set(s).add(id));
      setBilinen((s) => new Set(s).add(id));
    } else {
      setHatalar((s) => new Set(s).add(id));
      if (c.tekrarla === false) setBilinen((s) => new Set(s).add(id));
    }
    setGeri({ ...c, aciklama: aciklamasi(simdiki) });
  };

  const devam = () => {
    if (!simdiki || !geri) return;
    let yeniKuyruk = kuyruk;
    if (!geri.dogru && geri.tekrarla !== false) {
      yeniKuyruk = [...kuyruk, simdiki];
      setKuyruk(yeniKuyruk);
    }
    setGeri(null);
    setDeneme((d) => d + 1);
    if (sira + 1 >= yeniKuyruk.length) setAsama('bitti');
    else setSira(sira + 1);
  };

  /** Konuşma atlanırsa dersin geri kalan konuşma soruları da çıkar; sayılmaz. */
  const konusmayiAtla = () => {
    const kalan = kuyruk.filter((a, i) => i <= sira || a.tur !== 'konus');
    const atlanan = new Set(kuyruk.filter((a) => a.tur === 'konus').map((a) => a.id));
    setBilinen((s) => new Set([...s, ...atlanan]));
    const yeni = kalan.filter((_, i) => i !== sira);
    setKuyruk(yeni);
    setDeneme((d) => d + 1);
    if (sira >= yeni.length) setAsama('bitti');
  };

  const kaydet = useCallback(async () => {
    setKayit({ durum: 'bekliyor' });
    try {
      const sonuc = await ingilizceDersBitirAction({
        dersId,
        hatalar: [...hatalar],
        dogrular: [...ilkDogru],
      });
      if (sonuc.ok) {
        setKayit({ durum: 'tamam', sonuc: sonuc.data });
        router.refresh();
      } else setKayit({ durum: 'hata', mesaj: sonuc.error.message });
    } catch {
      setKayit({ durum: 'hata', mesaj: 'Bağlantı kurulamadı. İnternet gelince yeniden dene.' });
    }
  }, [dersId, hatalar, ilkDogru, router]);

  useEffect(() => {
    if (asama === 'bitti') void kaydet();
    // Yalnızca bitişte bir kez.
  }, [asama]);

  // Her yeni adım sayfanın başından: uzun ders notundan sonra ilk soru yukarıdan kesik kalıyordu.
  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [asama, deneme]);

  useEffect(() => {
    if (!geri) return;
    const tus = (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        devam();
      }
    };
    window.addEventListener('keydown', tus);
    return () => window.removeEventListener('keydown', tus);
  });

  if (asama === 'not' && not) {
    return (
      <div className="mx-auto flex w-full max-w-xl flex-col gap-5">
        <div className="flex items-center gap-3">
          <span className="bg-accent/15 text-accent flex size-11 items-center justify-center rounded-2xl">
            <BookOpen className="size-5" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <p className="ust-etiket">{ust}</p>
            <h1 className="text-primary text-xl font-semibold tracking-tight">{baslik}</h1>
          </div>
        </div>
        <article className="rounded-card border-line bg-surface border p-5">
          <NotMetni metin={not} />
        </article>
        <button type="button" onClick={() => setAsama('soru')} className={BIRINCIL}>
          Derse başla · {toplam} soru
        </button>
        <Link href={geriHref} className="text-muted text-center text-sm">
          Sonra
        </Link>
      </div>
    );
  }

  if (asama === 'bitti') {
    const dogruluk = toplam === 0 ? 100 : Math.round((ilkDogru.size / toplam) * 100);
    return (
      <div className="mx-auto flex w-full max-w-xl flex-col items-center gap-5 pt-6 text-center">
        <span className="text-5xl" aria-hidden="true">
          {hatalar.size === 0 ? '🏆' : '🎉'}
        </span>
        <h1 className="text-primary text-2xl font-semibold tracking-tight">Ders bitti!</h1>
        {kayit.durum === 'bekliyor' && (
          <Loader2 className="text-muted size-6 animate-spin" aria-label="Kaydediliyor" />
        )}
        {kayit.durum === 'hata' && (
          <div className="flex flex-col items-center gap-3">
            <p className="text-danger text-sm">{kayit.mesaj}</p>
            <button type="button" onClick={() => void kaydet()} className={cn(BIRINCIL, 'w-48')}>
              Yeniden kaydet
            </button>
          </div>
        )}
        {kayit.durum === 'tamam' && (
          <>
            <div className="grid w-full grid-cols-3 gap-2">
              <Kutu
                ikon={<Zap className="size-4" />}
                renk="text-amber-500"
                etiket="XP"
                deger={`+${kayit.sonuc.xp}`}
              />
              <Kutu
                ikon={<Target className="size-4" />}
                renk="text-emerald-500"
                etiket="Doğruluk"
                deger={`%${dogruluk}`}
              />
              <Kutu
                ikon={<Flame className="size-4" />}
                renk="text-orange-500"
                etiket="Seri"
                deger={`${kayit.sonuc.seri} gün`}
              />
            </div>
            <div className="w-full">
              <div className="text-muted mb-1 flex justify-between text-xs">
                <span>Günlük hedef</span>
                <span className="tabular">
                  {kayit.sonuc.bugunXp} / {kayit.sonuc.hedefXp} XP
                </span>
              </div>
              <div className="bg-elevated h-2.5 overflow-hidden rounded-full">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-amber-400 to-orange-500"
                  style={{
                    width: `${Math.min(100, (kayit.sonuc.bugunXp / kayit.sonuc.hedefXp) * 100)}%`,
                  }}
                />
              </div>
              {kayit.sonuc.bugunXp >= kayit.sonuc.hedefXp && (
                <p className="text-success mt-2 text-sm font-medium">Bugünün hedefi tamam 🎯</p>
              )}
            </div>
            <div className="flex w-full flex-col gap-2">
              {sonrakiHref && (
                <Link href={sonrakiHref} className={BIRINCIL}>
                  Sonraki ders
                </Link>
              )}
              <Link
                href={geriHref}
                className="focus-ring text-primary border-line flex h-12 items-center justify-center rounded-full border font-medium"
              >
                Parkura dön
              </Link>
            </div>
          </>
        )}
      </div>
    );
  }

  if (!simdiki) return null;
  const ilerleme = Math.round((bilinen.size / Math.max(1, toplam)) * 100);
  const ortak = { kilitli: geri !== null, onCevap: cevapla };
  const anahtar = `${simdiki.id}-${deneme}`;

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-5 pb-72">
      <div className="flex items-center gap-3">
        <Link
          href={geriHref}
          aria-label="Dersten çık"
          className="focus-ring text-muted -m-1 rounded p-1"
        >
          <X className="size-6" aria-hidden="true" />
        </Link>
        <div
          className="bg-elevated h-3 flex-1 overflow-hidden rounded-full"
          role="progressbar"
          aria-valuenow={ilerleme}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Ders ilerlemesi"
        >
          <div
            className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-teal-500 transition-[width] duration-500"
            style={{ width: `${ilerleme}%` }}
          />
        </div>
        {hatalar.has(simdiki.id) && (
          <span className="text-warning text-xs font-medium whitespace-nowrap">Tekrar</span>
        )}
      </div>

      <div data-alistirma={simdiki.id} className="contents">
        {(simdiki.tur === 'bosluk' || simdiki.tur === 'secmeli') && (
          <SecmeliSoru key={anahtar} a={simdiki} {...ortak} />
        )}
        {simdiki.tur === 'dinle' && <DinleSoru key={anahtar} a={simdiki} {...ortak} />}
        {simdiki.tur === 'konus' && (
          <KonusSoru key={anahtar} a={simdiki} {...ortak} onAtla={konusmayiAtla} />
        )}
        {simdiki.tur === 'yaz' && <YazSoru key={anahtar} a={simdiki} {...ortak} />}
        {simdiki.tur === 'eslestir' && <EslestirSoru key={anahtar} a={simdiki} {...ortak} />}
      </div>

      {geri && (
        <div
          role="status"
          className={cn(
            'fixed inset-x-0 bottom-0 z-[60] border-t px-4 pt-4 pb-[calc(1rem+env(safe-area-inset-bottom))]',
            geri.dogru
              ? 'border-success/30 bg-[color-mix(in_oklab,var(--success)_14%,var(--bg-base))]'
              : 'border-danger/30 bg-[color-mix(in_oklab,var(--danger)_14%,var(--bg-base))]',
          )}
        >
          <div className="mx-auto flex max-w-xl flex-col gap-2">
            <p
              className={cn(
                'flex items-center gap-2 text-lg font-semibold',
                geri.dogru ? 'text-success' : 'text-danger',
              )}
            >
              <SonucIsareti dogru={geri.dogru} />
              {geri.dogru ? (geri.not ? 'Neredeyse kusursuz' : 'Harika!') : 'Doğru cevap:'}
            </p>
            {!geri.dogru && geri.dogruCevap && (
              <p className="text-primary whitespace-pre-line">{geri.dogruCevap}</p>
            )}
            {geri.not && <p className="text-primary text-sm">{geri.not}</p>}
            {geri.aciklama && (
              <p className="text-body max-h-40 overflow-y-auto text-sm leading-relaxed">
                {geri.aciklama}
              </p>
            )}
            <button
              type="button"
              autoFocus
              onClick={devam}
              className={cn(
                BIRINCIL,
                geri.dogru
                  ? 'bg-success hover:bg-success text-white'
                  : 'bg-danger hover:bg-danger text-white',
              )}
            >
              Devam
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function Kutu({
  ikon,
  renk,
  etiket,
  deger,
}: {
  ikon: React.ReactNode;
  renk: string;
  etiket: string;
  deger: string;
}) {
  return (
    <div className="rounded-card border-line bg-surface flex flex-col items-center gap-1 border p-3">
      <span className={cn('flex items-center gap-1 text-xs font-medium', renk)}>
        {ikon}
        {etiket}
      </span>
      <span className="tabular text-primary text-xl font-semibold">{deger}</span>
    </div>
  );
}
