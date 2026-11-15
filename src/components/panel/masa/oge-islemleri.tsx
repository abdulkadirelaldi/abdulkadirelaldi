'use client';

import { ExternalLink } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useCallback, useRef, useState } from 'react';

import { Alan } from '@/components/panel/alan';
import { Pencere } from '@/components/panel/takvim/pencere';
import { Button, buttonClasses } from '@/components/ui/button';
import { FormError } from '@/components/ui/form-error';
import { Input, Textarea } from '@/components/ui/input';
import { boyutMetni, indirilirMi, MASA_KABUL } from '@/lib/masa/dosya-sinirlari';
import { cn } from '@/lib/utils/cn';
import {
  notGuncelleAction,
  notOlusturAction,
  ogeAdiAction,
  ogeSilAction,
  yaziYenidenAction,
} from '@/server/actions/masa';
import type { OgeDto } from '@/server/services/masa';
import type { ApiResponse } from '@/types';

import { masaDosyasiYukle } from './yukleyici';

/**
 * MASA ÖĞELERİ (ADR-049 M2b) — not, dosya, ses kaydı. Satır, pencereler ve yükleme durumu tek
 * kancada; dolap ekranı yalnızca yerleştirir.
 */

const SIMGE = { NOT: '📝', DOSYA: '📄', SES: '🎙️' } as const;
const TARIH = new Intl.DateTimeFormat('tr-TR', {
  day: 'numeric',
  month: 'short',
  timeZone: 'Europe/Istanbul',
});

export function OgeSatiri({ o, ac }: { o: OgeDto; ac: (o: OgeDto) => void }) {
  const yukleniyor = o.durum === 'YUKLENIYOR';
  const ayrinti = [
    o.tur === 'NOT' ? 'Not' : o.boyut !== null ? boyutMetni(o.boyut) : null,
    TARIH.format(new Date(o.createdAt)),
    yukleniyor ? 'yükleme yarım kaldı' : null,
  ]
    .filter(Boolean)
    .join(' · ');
  return (
    <li>
      <button
        type="button"
        onClick={() => ac(o)}
        className="focus-ring flex min-h-12 w-full items-center gap-3 px-3 py-2 text-left"
      >
        <span aria-hidden="true" className="w-7 shrink-0 text-center text-lg">
          {yukleniyor ? '⏳' : SIMGE[o.tur]}
        </span>
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="text-primary truncate text-sm font-medium">{o.baslik}</span>
          <span className={cn('truncate text-xs', yukleniyor ? 'text-danger' : 'text-muted')}>
            {ayrinti}
          </span>
        </span>
      </button>
    </li>
  );
}

type Durum =
  | { tur: 'kapali' }
  | { tur: 'yeni-not'; dolapId: string; rafId: string | null }
  | { tur: 'oge'; o: OgeDto };

type Yukleme = { ad: string; oran: number; hata: string | null };

export function useOgeIslemleri() {
  const router = useRouter();
  const [durum, setDurum] = useState<Durum>({ tur: 'kapali' });
  const [yuklemeler, setYuklemeler] = useState<Yukleme[]>([]);
  const secici = useRef<HTMLInputElement>(null);
  const hedef = useRef<{ dolapId: string; rafId: string | null } | null>(null);
  /** Görevlerdeki gerekçeyle (`gorev-islemleri.tsx`): tazeleme gelene dek güncel hâl; `null` = silindi. */
  const [yerel, setYerel] = useState<Readonly<Record<string, Partial<OgeDto> | null>>>({});
  const kapat = () => setDurum({ tur: 'kapali' });
  const bitti = <T,>(
    sonuc: ApiResponse<T>,
    degisim?: { id: string; alanlar: Partial<OgeDto> | null },
  ): ApiResponse<T> => {
    if (sonuc.ok) {
      if (degisim) setYerel((y) => ({ ...y, [degisim.id]: degisim.alanlar }));
      kapat();
      router.refresh();
    }
    return sonuc;
  };
  const guncel = (o: OgeDto): OgeDto | null => {
    const y = yerel[o.id];
    return y === null ? null : { ...o, ...y };
  };

  const yukle = async (dosyalar: File[]) => {
    const yer = hedef.current;
    if (!yer || dosyalar.length === 0) return;
    setYuklemeler(dosyalar.map((d) => ({ ad: d.name, oran: 0, hata: null })));
    let biri = false;
    // Sırayla: telefonda paralel yükleme bant genişliğini böler, hiçbiri bitmez.
    for (const [i, dosya] of dosyalar.entries()) {
      const guncelle = (p: Partial<Yukleme>) =>
        setYuklemeler((l) => l.map((y, j) => (j === i ? { ...y, ...p } : y)));
      const sonuc = await masaDosyasiYukle(dosya, yer, (oran) => guncelle({ oran }));
      if (sonuc.ok) {
        guncelle({ oran: 1 });
        biri = true;
      } else guncelle({ hata: sonuc.error.message });
    }
    if (biri) router.refresh();
    // Başarılılar ekrandan düşer; hatalılar kullanıcı kapatana dek kalır.
    setYuklemeler((l) => l.filter((y) => y.hata !== null));
  };

  const ekler = (
    <>
      <input
        ref={secici}
        type="file"
        multiple
        accept={MASA_KABUL}
        className="sr-only"
        tabIndex={-1}
        aria-label="Yüklenecek dosyalar"
        data-testid="masa-dosya-secici"
        onChange={(e) => {
          const dosyalar = Array.from(e.target.files ?? []);
          e.target.value = '';
          void yukle(dosyalar);
        }}
      />
      {yuklemeler.length > 0 && (
        <div
          role="status"
          aria-label="Yüklemeler"
          className="rounded-card border-line bg-surface flex flex-col gap-2 border p-3"
        >
          {yuklemeler.map((y, i) => (
            <div key={`${y.ad}-${i}`} className="flex flex-col gap-1">
              <div className="flex items-center gap-2 text-sm">
                <span className="text-primary min-w-0 flex-1 truncate">{y.ad}</span>
                <span className={cn('tabular text-xs', y.hata ? 'text-danger' : 'text-muted')}>
                  {y.hata ? 'olmadı' : `%${Math.round(y.oran * 100)}`}
                </span>
              </div>
              {y.hata ? (
                <p className="text-danger text-xs">{y.hata}</p>
              ) : (
                <div className="bg-elevated h-1.5 overflow-hidden rounded-full">
                  <div
                    className="bg-accent h-full transition-[width]"
                    style={{ width: `${Math.round(y.oran * 100)}%` }}
                  />
                </div>
              )}
            </div>
          ))}
          {yuklemeler.every((y) => y.hata) && (
            <Button
              size="sm"
              variant="ghost"
              className="self-end"
              onClick={() => setYuklemeler([])}
            >
              Kapat
            </Button>
          )}
        </div>
      )}
      {durum.tur === 'yeni-not' && (
        <Pencere baslik="Yeni not" kapat={kapat}>
          <NotFormu
            vazgec={kapat}
            kaydet={async (g) =>
              bitti(await notOlusturAction({ ...g, dolapId: durum.dolapId, rafId: durum.rafId }))
            }
          />
        </Pencere>
      )}
      {durum.tur === 'oge' && (
        <Pencere
          baslik={durum.o.tur === 'NOT' ? 'Not' : durum.o.tur === 'SES' ? 'Ses kaydı' : 'Dosya'}
          kapat={kapat}
        >
          {durum.o.tur === 'NOT' ? (
            <NotFormu
              ilk={{ baslik: durum.o.baslik, metin: durum.o.metin ?? '' }}
              vazgec={kapat}
              kaydet={async (g) =>
                bitti(await notGuncelleAction({ ...g, id: durum.o.id }), {
                  id: durum.o.id,
                  alanlar: { baslik: g.baslik, metin: g.metin },
                })
              }
              sil={async () =>
                bitti(await ogeSilAction({ id: durum.o.id }), { id: durum.o.id, alanlar: null })
              }
            />
          ) : (
            <DosyaGorunumu
              o={durum.o}
              adlandir={async (baslik) =>
                bitti(await ogeAdiAction({ id: durum.o.id, baslik }), {
                  id: durum.o.id,
                  alanlar: { baslik },
                })
              }
              sil={async () =>
                bitti(await ogeSilAction({ id: durum.o.id }), { id: durum.o.id, alanlar: null })
              }
            />
          )}
        </Pencere>
      )}
    </>
  );

  return {
    ekler,
    yeniNot: (dolapId: string, rafId: string | null) =>
      setDurum({ tur: 'yeni-not', dolapId, rafId }),
    dosyaSec: (dolapId: string, rafId: string | null) => {
      hedef.current = { dolapId, rafId };
      secici.current?.click();
    },
    ac: (o: OgeDto) => {
      const g = guncel(o);
      if (g) setDurum({ tur: 'oge', o: g });
    },
    uygula: (liste: readonly OgeDto[]): OgeDto[] =>
      liste.flatMap((o) => {
        const g = guncel(o);
        return g ? [g] : [];
      }),
    sifirla: useCallback(() => setYerel({}), []),
  };
}

function useCalistir() {
  const [hata, setHata] = useState<{ mesaj: string; alanlar: Record<string, string> } | null>(null);
  const [bekliyor, setBekliyor] = useState(false);
  const calistir = async (is: () => Promise<ApiResponse<unknown>>) => {
    setBekliyor(true);
    setHata(null);
    const sonuc = await is();
    setBekliyor(false);
    if (!sonuc.ok) setHata({ mesaj: sonuc.error.message, alanlar: sonuc.error.fields ?? {} });
  };
  return { hata, bekliyor, calistir };
}

function SilDugmesi({ sil, bekliyor }: { sil: () => void; bekliyor: boolean }) {
  const [onay, setOnay] = useState(false);
  return (
    <Button
      variant="danger"
      className="ml-auto"
      disabled={bekliyor}
      onClick={() => (onay ? sil() : setOnay(true))}
    >
      {onay ? 'Eminim, sil' : 'Sil'}
    </Button>
  );
}

function NotFormu({
  ilk = { baslik: '', metin: '' },
  kaydet,
  vazgec,
  sil,
}: {
  ilk?: { baslik: string; metin: string };
  kaydet: (g: { baslik: string; metin: string | null }) => Promise<ApiResponse<unknown>>;
  vazgec: () => void;
  sil?: () => Promise<ApiResponse<unknown>>;
}) {
  const [f, setF] = useState(ilk);
  const { hata, bekliyor, calistir } = useCalistir();
  return (
    <form
      noValidate
      className="flex flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        void calistir(() => kaydet({ baslik: f.baslik, metin: f.metin || null }));
      }}
    >
      <Alan id="not-baslik" etiket="Başlık" hata={hata?.alanlar.baslik}>
        {(b) => (
          <Input
            id="not-baslik"
            data-ilk-odak
            value={f.baslik}
            maxLength={160}
            onChange={(e) => setF({ ...f, baslik: e.target.value })}
            placeholder="3. hafta — Newton yasaları"
            {...b}
          />
        )}
      </Alan>
      <Alan id="not-metin" etiket="Not" hata={hata?.alanlar.metin}>
        {(b) => (
          <Textarea
            id="not-metin"
            rows={12}
            value={f.metin}
            maxLength={50_000}
            onChange={(e) => setF({ ...f, metin: e.target.value })}
            {...b}
          />
        )}
      </Alan>
      {hata && <FormError>{hata.mesaj}</FormError>}
      <div className="flex flex-wrap items-center gap-2">
        <Button type="submit" disabled={bekliyor}>
          Kaydet
        </Button>
        <Button variant="ghost" onClick={vazgec} disabled={bekliyor}>
          Vazgeç
        </Button>
        {sil && <SilDugmesi bekliyor={bekliyor} sil={() => void calistir(sil)} />}
      </div>
    </form>
  );
}

function DosyaGorunumu({
  o,
  adlandir,
  sil,
}: {
  o: OgeDto;
  adlandir: (baslik: string) => Promise<ApiResponse<unknown>>;
  sil: () => Promise<ApiResponse<unknown>>;
}) {
  const [baslik, setBaslik] = useState(o.baslik);
  const { hata, bekliyor, calistir } = useCalistir();
  const adres = o.dosyaId ? `/api/v1/dosya/${o.dosyaId}` : null;
  const indirilir = o.mime !== null && indirilirMi(o.mime);

  return (
    <div className="flex flex-col gap-4">
      {o.durum === 'YUKLENIYOR' ? (
        <p className="text-danger text-sm">
          Bu dosyanın yüklemesi yarım kaldı. Silip yeniden yükleyebilirsin; 24 saat içinde
          kendiliğinden temizlenir.
        </p>
      ) : o.tur === 'SES' && adres ? (
        <audio controls preload="metadata" src={adres} className="w-full">
          Tarayıcın ses oynatmayı desteklemiyor.
        </audio>
      ) : o.mime?.startsWith('image/') && adres ? (
        // eslint-disable-next-line @next/next/no-img-element -- özel dosya, oturumla sunuluyor.
        <img src={adres} alt={o.baslik} className="rounded-card max-h-96 w-full object-contain" />
      ) : null}

      <p className="text-muted text-xs">
        {[o.dosyaAdi, o.boyut !== null ? boyutMetni(o.boyut) : null].filter(Boolean).join(' · ')}
      </p>

      {o.tur === 'SES' && o.durum === 'HAZIR' && <SesYazisi o={o} />}

      {adres && o.tur !== 'SES' && (
        <a
          href={adres}
          target={indirilir ? undefined : '_blank'}
          rel="noopener"
          className={buttonClasses({ variant: 'secondary', size: 'sm' })}
        >
          <ExternalLink className="size-4" aria-hidden="true" />
          {indirilir ? 'İndir' : 'Aç'}
        </a>
      )}

      <form
        noValidate
        className="flex flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          void calistir(() => adlandir(baslik));
        }}
      >
        <Alan id="oge-baslik" etiket="Ad" hata={hata?.alanlar.baslik}>
          {(b) => (
            <Input
              id="oge-baslik"
              value={baslik}
              maxLength={160}
              onChange={(e) => setBaslik(e.target.value)}
              {...b}
            />
          )}
        </Alan>
        {hata && <FormError>{hata.mesaj}</FormError>}
        <div className="flex flex-wrap items-center gap-2">
          <Button type="submit" disabled={bekliyor || baslik === o.baslik}>
            Adı kaydet
          </Button>
          <SilDugmesi bekliyor={bekliyor} sil={() => void calistir(sil)} />
        </div>
      </form>
    </div>
  );
}

const YAZI_DURUMU = {
  SIRADA: 'Mac köprüsünde yazıya dökülmeyi bekliyor.',
  ISLENIYOR: "Mac'te yazıya dökülüyor…",
} as const;

/** Ses kaydının yazısı ve özeti (ADR-049 M6). */
function SesYazisi({ o }: { o: OgeDto }) {
  const router = useRouter();
  const [bekliyor, setBekliyor] = useState(false);
  const yeniden = async () => {
    setBekliyor(true);
    const s = await yaziYenidenAction({ id: o.id });
    setBekliyor(false);
    if (s.ok) router.refresh();
  };
  if (o.yaziDurumu === 'SIRADA' || o.yaziDurumu === 'ISLENIYOR') {
    return (
      <p role="status" className="text-muted text-sm">
        {YAZI_DURUMU[o.yaziDurumu]}
      </p>
    );
  }
  if (o.yaziDurumu === 'HATA') {
    return (
      <div className="flex flex-col gap-2">
        <p role="alert" className="text-danger text-sm">
          Yazıya dökülemedi: {o.yaziHata ?? 'bilinmeyen hata'}
        </p>
        <Button size="sm" variant="secondary" disabled={bekliyor} onClick={() => void yeniden()}>
          Yeniden dene
        </Button>
      </div>
    );
  }
  if (o.yaziDurumu !== 'TAMAM') return null;
  return (
    <div className="flex flex-col gap-3">
      {o.ozet ? (
        <section aria-label="Ders özeti" className="bg-elevated rounded-lg p-3">
          <p className="text-primary mb-1 text-sm font-semibold">Özet (Claude)</p>
          <div className="text-body text-sm whitespace-pre-wrap">{o.ozet}</div>
        </section>
      ) : (
        <p className="text-muted text-xs">Özet yok (Claude bağlı değil ya da özet çıkarılamadı).</p>
      )}
      <details>
        <summary className="focus-ring text-accent cursor-pointer rounded text-sm font-medium">
          Tam yazı
        </summary>
        <p className="text-body mt-2 max-h-80 overflow-y-auto text-sm whitespace-pre-wrap">
          {o.metin}
        </p>
      </details>
    </div>
  );
}
