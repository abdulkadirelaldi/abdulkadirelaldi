'use client';

import { Sparkles } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useRef, useState } from 'react';

import { Pencere } from '@/components/panel/takvim/pencere';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/input';
import { TAKVIM_KATMANLARI } from '@/lib/takvim/katmanlar';
import { cn } from '@/lib/utils/cn';
import { gorevOlusturAction } from '@/server/actions/masa';
import { takvimEtkinligiOlusturAction } from '@/server/actions/takvim';
import type { SohbetOlayi, SohbetOnerisi } from '@/server/services/masa-sohbet';
import type { ApiResponse } from '@/types';

/**
 * CLAUDE PANELİ (ADR-049 M4) — Masa'dan sohbet. Yanıt satır satır akar (NDJSON). Claude'un
 * önerileri KART olarak gelir; "Ekle" mevcut denetimli eylemle yazar, "Vazgeç" düşürür. Hiçbir
 * öneri kendiliğinden kaydedilmez. Sohbet yalnızca bu pencerede yaşar (sunucu saklamaz).
 */

type Satir =
  | { tur: 'sen'; metin: string }
  | { tur: 'claude'; metin: string; oneriler: SohbetOnerisi[]; hata: string | null };

type OneriDurumu = 'bekliyor' | 'eklendi' | 'vazgecildi' | { hata: string };

export function ClaudePaneli({ dolapId, dolapAdi }: { dolapId: string | null; dolapAdi?: string }) {
  const [acik, setAcik] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setAcik(true)}
        aria-haspopup="dialog"
        className="focus-ring bg-accent fixed right-4 bottom-24 z-30 flex min-h-12 items-center gap-2 rounded-full px-4 text-sm font-semibold text-white shadow-lg lg:bottom-6"
      >
        <Sparkles className="size-4" aria-hidden="true" />
        Claude&apos;a sor
      </button>
      {acik && (
        <Pencere
          baslik={dolapAdi ? `Claude · ${dolapAdi}` : 'Claude · Masa'}
          kapat={() => setAcik(false)}
        >
          <Sohbet dolapId={dolapId} />
        </Pencere>
      )}
    </>
  );
}

function Sohbet({ dolapId }: { dolapId: string | null }) {
  const router = useRouter();
  const [satirlar, setSatirlar] = useState<Satir[]>([]);
  const [soru, setSoru] = useState('');
  const [bekliyor, setBekliyor] = useState(false);
  const [durumlar, setDurumlar] = useState<Record<string, OneriDurumu>>({});
  const gecmis = useRef<unknown[]>([]);

  const sonuncuyuGuncelle = (
    f: (s: Extract<Satir, { tur: 'claude' }>) => Extract<Satir, { tur: 'claude' }>,
  ) =>
    setSatirlar((l) => {
      const son = l[l.length - 1];
      return son?.tur === 'claude' ? [...l.slice(0, -1), f(son)] : l;
    });

  const gonder = async () => {
    const metin = soru.trim();
    if (!metin || bekliyor) return;
    setSoru('');
    setBekliyor(true);
    setSatirlar((l) => [
      ...l,
      { tur: 'sen', metin },
      { tur: 'claude', metin: '', oneriler: [], hata: null },
    ]);
    try {
      const yanit = await fetch('/api/v1/panel/masa/sohbet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ soru: metin, dolapId, gecmis: gecmis.current }),
      });
      if (!yanit.ok || !yanit.body) {
        const g = (await yanit.json().catch(() => null)) as ApiResponse<never> | null;
        sonuncuyuGuncelle((s) => ({
          ...s,
          hata: g && !g.ok ? g.error.message : 'Claude’a ulaşılamadı.',
        }));
        return;
      }
      const okuyucu = yanit.body.pipeThrough(new TextDecoderStream()).getReader();
      let tampon = '';
      for (;;) {
        const { done, value } = await okuyucu.read();
        if (done) break;
        tampon += value;
        const parcalar = tampon.split('\n');
        tampon = parcalar.pop() ?? '';
        for (const p of parcalar) {
          if (!p.trim()) continue;
          const olay = JSON.parse(p) as SohbetOlayi;
          if (olay.tur === 'metin')
            sonuncuyuGuncelle((s) => ({ ...s, metin: s.metin + olay.metin }));
          else if (olay.tur === 'oneri') {
            sonuncuyuGuncelle((s) => ({ ...s, oneriler: [...s.oneriler, olay.oneri] }));
          } else if (olay.tur === 'hata') sonuncuyuGuncelle((s) => ({ ...s, hata: olay.mesaj }));
          // Geçmiş yalnızca tam biten turla büyür; hata alan tur eklenmez.
          else if (olay.tur === 'bitti') gecmis.current = [...gecmis.current, ...olay.yeniMesajlar];
        }
      }
    } catch {
      sonuncuyuGuncelle((s) => ({ ...s, hata: 'Bağlantı koptu.' }));
    } finally {
      setBekliyor(false);
    }
  };

  const uygula = async (o: SohbetOnerisi) => {
    setDurumlar((d) => ({ ...d, [o.id]: 'bekliyor' }));
    const sonuc =
      o.tur === 'gorev'
        ? await gorevOlusturAction(o.veri)
        : await takvimEtkinligiOlusturAction(o.veri);
    if (sonuc.ok) {
      setDurumlar((d) => ({ ...d, [o.id]: 'eklendi' }));
      router.refresh();
    } else setDurumlar((d) => ({ ...d, [o.id]: { hata: sonuc.error.message } }));
  };

  return (
    <div className="flex flex-col gap-3">
      <div
        role="log"
        aria-live="polite"
        aria-label="Sohbet"
        className="flex max-h-[55vh] flex-col gap-3 overflow-y-auto"
      >
        {satirlar.length === 0 && (
          <p className="text-muted text-sm">
            Örneğin: &ldquo;Bu haftaki teslimlerim neler?&rdquo; · &ldquo;Fizik notlarımı
            özetle&rdquo; · &ldquo;Cuma 14:00&apos;e proje toplantısı ekle&rdquo;
          </p>
        )}
        {satirlar.map((s, i) =>
          s.tur === 'sen' ? (
            <p
              key={i}
              className="bg-accent/12 text-primary self-end rounded-2xl px-3 py-2 text-sm whitespace-pre-wrap"
            >
              {s.metin}
            </p>
          ) : (
            <div key={i} className="flex flex-col gap-2">
              {(s.metin || (!s.hata && bekliyor && i === satirlar.length - 1)) && (
                <p className="text-body text-sm whitespace-pre-wrap">{s.metin || '…'}</p>
              )}
              {s.oneriler.map((o) => (
                <OneriKarti
                  key={o.id}
                  o={o}
                  durum={durumlar[o.id]}
                  uygula={() => void uygula(o)}
                  vazgec={() => setDurumlar((d) => ({ ...d, [o.id]: 'vazgecildi' }))}
                />
              ))}
              {s.hata && (
                <p role="alert" className="text-danger text-sm">
                  {s.hata}
                </p>
              )}
            </div>
          ),
        )}
      </div>

      <form
        className="flex flex-col gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          void gonder();
        }}
      >
        <label htmlFor="claude-soru" className="sr-only">
          Claude&apos;a sor
        </label>
        <Textarea
          id="claude-soru"
          data-ilk-odak
          rows={2}
          maxLength={4000}
          value={soru}
          onChange={(e) => setSoru(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              void gonder();
            }
          }}
          placeholder="Sor ya da görev iste…"
        />
        <div className="flex items-center gap-2">
          <Button type="submit" disabled={bekliyor || !soru.trim()}>
            {bekliyor ? 'Yanıtlıyor…' : 'Gönder'}
          </Button>
          {satirlar.length > 0 && (
            <Button
              variant="ghost"
              disabled={bekliyor}
              onClick={() => {
                setSatirlar([]);
                setDurumlar({});
                gecmis.current = [];
              }}
            >
              Yeni sohbet
            </Button>
          )}
        </div>
      </form>
    </div>
  );
}

function OneriKarti({
  o,
  durum,
  uygula,
  vazgec,
}: {
  o: SohbetOnerisi;
  durum: OneriDurumu | undefined;
  uygula: () => void;
  vazgec: () => void;
}) {
  const baslik = o.veri.baslik;
  const ayrinti =
    o.tur === 'gorev'
      ? [
          o.veri.teslimGun &&
            `teslim ${o.veri.teslimGun}${o.veri.teslimSaat ? ` ${o.veri.teslimSaat}` : ''}`,
          o.veri.oncelik === 'YUKSEK' && 'yüksek öncelik',
        ]
          .filter(Boolean)
          .join(' · ')
      : [
          o.veri.baslangicGun,
          o.veri.tumGun ? 'gün boyu' : `${o.veri.baslangicSaat}–${o.veri.bitisSaat}`,
          o.veri.katman && TAKVIM_KATMANLARI[o.veri.katman].ad,
        ]
          .filter(Boolean)
          .join(' · ');
  const bitti = durum === 'eklendi' || durum === 'vazgecildi';
  return (
    <div
      role="group"
      aria-label={`Öneri: ${baslik}`}
      className={cn(
        'rounded-card border-line bg-surface flex flex-col gap-2 border p-3',
        bitti && 'opacity-70',
      )}
    >
      <p className="text-muted text-xs font-medium">
        {o.tur === 'gorev' ? '☑️ Görev önerisi' : '📅 Etkinlik önerisi'}
      </p>
      <p className="text-primary text-sm font-semibold">{baslik}</p>
      {ayrinti && <p className="text-muted text-xs">{ayrinti}</p>}
      {durum === 'eklendi' ? (
        <p role="status" className="text-success text-sm font-medium">
          Eklendi ✓
        </p>
      ) : durum === 'vazgecildi' ? (
        <p className="text-muted text-sm">Eklenmedi.</p>
      ) : (
        <div className="flex items-center gap-2">
          <Button size="sm" onClick={uygula} disabled={durum === 'bekliyor'}>
            Ekle
          </Button>
          <Button size="sm" variant="ghost" onClick={vazgec} disabled={durum === 'bekliyor'}>
            Vazgeç
          </Button>
          {typeof durum === 'object' && (
            <p role="alert" className="text-danger text-xs">
              {durum.hata}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
