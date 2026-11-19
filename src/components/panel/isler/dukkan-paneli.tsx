'use client';

import { FolderOpen, Minus, Pencil, Plus } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useTransition } from 'react';

import { Alan } from '@/components/panel/alan';
import { Pencere } from '@/components/panel/takvim/pencere';
import { Button } from '@/components/ui/button';
import { FormError } from '@/components/ui/form-error';
import { Input, Textarea } from '@/components/ui/input';
import { DUKKAN_SINIRLARI, type PaketTuru } from '@/lib/schemas/dukkan';
import { cn } from '@/lib/utils/cn';
import { dukkanKaydetAction, paketSayAction } from '@/server/actions/dukkan';
import type { DukkanKaydiDto } from '@/server/services/dukkan';

const TUR_ADI: Record<PaketTuru, string> = { reels: 'Reels', post: 'Gönderi', story: 'Story' };
/** Kıyı Medya'nın standart aylık paketi — "paket var" seçilince form bununla dolar. */
const STANDART_PAKET = { reels: 4, post: 8, story: 8 } as const;

const tente = (renk: string) => ({
  background: `repeating-linear-gradient(90deg, ${renk} 0 22px, transparent 22px 44px)`,
});

/**
 * DÜKKÂN PANELİ (ADR-058) — dükkânın içinde, işlerin üstünde: tabela, Drive klasörü, bu ayın paket
 * sayacı (dokununca +1 / −1), not. "Düzenle" Drive adresini, notu ve paket hedeflerini değiştirir.
 * Sayaç dokunuşu önce ekranda işlenir, sunucu yanıtıyla düzeltilir.
 */
export function DukkanPaneli({
  ad,
  tur,
  renk,
  ayAdi,
  kayit,
}: {
  ad: string;
  tur: string;
  renk: string;
  /** "Kasım" */
  ayAdi: string;
  kayit: DukkanKaydiDto;
}) {
  const router = useRouter();
  const [, gecis] = useTransition();
  const [yerel, setYerel] = useState(kayit);
  const [duzenle, setDuzenle] = useState(false);
  const [hata, setHata] = useState<string | null>(null);
  useEffect(() => setYerel(kayit), [kayit]);
  // Aşağı kaydırılmış sokaktan girilince içerisi baştan görünsün (Next aynı rotada kaydırmıyor).
  useEffect(() => window.scrollTo(0, 0), [ad]);

  const say = (t: PaketTuru, fark: 1 | -1) => {
    const once = yerel;
    setYerel((y) => ({
      ...y,
      paket: y.paket?.map((p) => (p.tur === t ? { ...p, n: Math.max(0, p.n + fark) } : p)) ?? null,
    }));
    gecis(async () => {
      setHata(null);
      const s = await paketSayAction({ anahtar: kayit.anahtar, tur: t, fark });
      if (s.ok) {
        setYerel(s.data);
        router.refresh();
      } else {
        setYerel(once);
        setHata(s.error.message);
      }
    });
  };

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-3 pt-1">
      <Link
        href="/panel/isler"
        className="focus-ring text-body hover:text-primary -ml-1 flex min-h-11 w-fit items-center gap-1.5 rounded-lg px-1 text-sm"
      >
        <span aria-hidden="true">←</span> Sokağa dön
      </Link>

      <section
        aria-labelledby="dukkan-adi"
        className="border-line bg-surface overflow-hidden rounded-xl border"
      >
        <div aria-hidden="true" className="h-3.5 opacity-80" style={tente(renk)} />
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
          <div className="flex min-w-0 flex-col gap-0.5">
            <h2 id="dukkan-adi" className="text-primary truncate text-xl font-semibold">
              {ad}
            </h2>
            <span className="text-muted text-sm">{tur}</span>
          </div>
          <div className="flex items-center gap-2">
            {yerel.driveUrl && (
              <a
                href={yerel.driveUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="focus-ring border-line text-body hover:text-primary flex min-h-11 items-center gap-2 rounded-lg border px-3.5 text-sm"
              >
                <FolderOpen className="size-4" aria-hidden="true" />
                Drive
              </a>
            )}
            <button
              type="button"
              onClick={() => setDuzenle(true)}
              aria-label={`${ad} dükkânını düzenle`}
              title="Drive, not, paket"
              className="focus-ring border-line text-body hover:text-primary flex size-11 items-center justify-center rounded-lg border"
            >
              <Pencil className="size-4" aria-hidden="true" />
            </button>
          </div>
        </div>

        {yerel.paket && (
          <div className="border-line flex flex-col gap-3 border-t px-5 py-4">
            <h3 className="text-muted text-xs font-semibold tracking-wide uppercase">
              {ayAdi} paketi
            </h3>
            <ul className="flex flex-col gap-3">
              {yerel.paket.map((p) => {
                const bitti = p.hedef > 0 && p.n >= p.hedef;
                return (
                  <li key={p.tur} className="flex items-center gap-3">
                    <span className="text-body w-16 shrink-0 text-sm">{TUR_ADI[p.tur]}</span>
                    <span
                      className="bg-elevated h-2 flex-1 overflow-hidden rounded-full"
                      aria-hidden="true"
                    >
                      <span
                        className="block h-full rounded-full transition-[width]"
                        style={{
                          width: `${p.hedef ? Math.min(100, (p.n / p.hedef) * 100) : 0}%`,
                          background: renk,
                        }}
                      />
                    </span>
                    <span
                      className={cn(
                        'w-12 shrink-0 text-right text-sm tabular-nums',
                        bitti ? 'text-success font-medium' : 'text-primary',
                      )}
                    >
                      {p.n}/{p.hedef}
                    </span>
                    <span className="flex shrink-0 gap-1">
                      <button
                        type="button"
                        onClick={() => say(p.tur, -1)}
                        disabled={p.n === 0}
                        aria-label={`${TUR_ADI[p.tur]} sayısını bir azalt`}
                        className="focus-ring border-line text-body flex size-11 items-center justify-center rounded-lg border disabled:opacity-40"
                      >
                        <Minus className="size-4" aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        onClick={() => say(p.tur, 1)}
                        aria-label={`${TUR_ADI[p.tur]} teslim edildi, bir artır`}
                        className="focus-ring border-line text-primary flex size-11 items-center justify-center rounded-lg border"
                      >
                        <Plus className="size-4" aria-hidden="true" />
                      </button>
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        {yerel.not && (
          <p className="border-line text-body border-t px-5 py-4 text-sm leading-relaxed whitespace-pre-line">
            {yerel.not}
          </p>
        )}
      </section>

      {hata && <FormError>{hata}</FormError>}

      {duzenle && (
        <Pencere baslik={`${ad} — dükkân`} kapat={() => setDuzenle(false)}>
          <DukkanFormu
            kayit={yerel}
            kapat={(yeni) => {
              if (yeni) {
                setYerel(yeni);
                router.refresh();
              }
              setDuzenle(false);
            }}
          />
        </Pencere>
      )}
    </div>
  );
}

function DukkanFormu({
  kayit,
  kapat,
}: {
  kayit: DukkanKaydiDto;
  kapat: (yeni?: DukkanKaydiDto) => void;
}) {
  const hedef = (t: PaketTuru) => kayit.paket?.find((p) => p.tur === t)?.hedef ?? STANDART_PAKET[t];
  const [driveUrl, setDriveUrl] = useState(kayit.driveUrl ?? '');
  const [not, setNot] = useState(kayit.not ?? '');
  const [paketVar, setPaketVar] = useState(kayit.paket !== null);
  const [paket, setPaket] = useState({
    reels: hedef('reels'),
    post: hedef('post'),
    story: hedef('story'),
  });
  const [hata, setHata] = useState<{ mesaj: string; alanlar: Record<string, string> } | null>(null);
  const [bekliyor, setBekliyor] = useState(false);

  return (
    <form
      noValidate
      className="flex flex-col gap-4"
      onSubmit={async (e) => {
        e.preventDefault();
        setBekliyor(true);
        setHata(null);
        const s = await dukkanKaydetAction({
          anahtar: kayit.anahtar,
          driveUrl: driveUrl.trim() || null,
          not: not || null,
          paket: paketVar ? paket : null,
        });
        setBekliyor(false);
        if (s.ok) kapat(s.data);
        else setHata({ mesaj: s.error.message, alanlar: s.error.fields ?? {} });
      }}
    >
      <Alan
        id="dukkan-drive"
        etiket="Drive klasörü"
        yardim="Klasörün bağlantısını yapıştır"
        hata={hata?.alanlar.driveUrl}
      >
        {(b) => (
          <Input
            id="dukkan-drive"
            data-ilk-odak
            type="url"
            inputMode="url"
            value={driveUrl}
            maxLength={DUKKAN_SINIRLARI.url}
            onChange={(e) => setDriveUrl(e.target.value)}
            placeholder="https://drive.google.com/drive/folders/…"
            {...b}
          />
        )}
      </Alan>

      <fieldset className="border-line flex flex-col gap-3 rounded-lg border p-3">
        <legend className="px-1">
          <label className="text-primary flex min-h-11 cursor-pointer items-center gap-3 text-sm font-medium">
            <input
              type="checkbox"
              checked={paketVar}
              onChange={(e) => setPaketVar(e.target.checked)}
              className="accent-accent size-4"
            />
            Aylık paket var
          </label>
        </legend>
        {paketVar && (
          <div className="grid grid-cols-3 gap-3">
            {(['reels', 'post', 'story'] as const).map((t) => (
              <Alan
                key={t}
                id={`dukkan-${t}`}
                etiket={TUR_ADI[t]}
                hata={hata?.alanlar[`paket.${t}`]}
              >
                {(b) => (
                  <Input
                    id={`dukkan-${t}`}
                    type="number"
                    inputMode="numeric"
                    min={0}
                    max={DUKKAN_SINIRLARI.hedef}
                    value={paket[t]}
                    onChange={(e) =>
                      setPaket((p) => ({ ...p, [t]: Math.max(0, Number(e.target.value) || 0) }))
                    }
                    {...b}
                  />
                )}
              </Alan>
            ))}
          </div>
        )}
      </fieldset>

      <Alan id="dukkan-not" etiket="Not" hata={hata?.alanlar.not}>
        {(b) => (
          <Textarea
            id="dukkan-not"
            rows={3}
            value={not}
            maxLength={DUKKAN_SINIRLARI.not}
            onChange={(e) => setNot(e.target.value)}
            placeholder="Yetkili kişi, marka renkleri, çekim notları…"
            {...b}
          />
        )}
      </Alan>

      {hata && <FormError>{hata.mesaj}</FormError>}

      <div className="flex justify-end gap-2">
        <Button variant="ghost" onClick={() => kapat()}>
          Vazgeç
        </Button>
        <Button type="submit" disabled={bekliyor}>
          Kaydet
        </Button>
      </div>
    </form>
  );
}
