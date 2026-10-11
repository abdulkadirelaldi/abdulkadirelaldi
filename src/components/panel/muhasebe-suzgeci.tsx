'use client';

import { X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import { muhasebeYolu } from '@/components/panel/muhasebe-gorunumleri';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { TransactionCategoryPanelDto } from '@/server/services/transaction-category';

/**
 * Tarih aralığı + kategori süzgeci.
 *
 * Görünüm sekmeleri `Link` (ayrı adresler, sunucu süzüyor); tarih ve kategori
 * GÖNDERİMDE adrese yazılıyor — her tuşta gezinmek istemiyoruz. T-054f'teki
 * denetim süzgeciyle aynı ayrım.
 *
 * ⚠️ KATEGORİ SÜZGECİ ARŞİVİ DE GÖSTERİYOR ve bu SEÇİCİNİN TERSİ. Sebep:
 * süzgecin işi GEÇMİŞİ okumak ve arşivlenmiş bir kategoriye bağlı eski
 * işlemler duruyor; onları süzememek "işlemim kayboldu" sorusunu üretirdi.
 * Seçicinin işi ise YENİ kayıt yazmak ve orada arşivli seçilemez. İki yüzeyin
 * ihtiyacı zıt — T-100/T-101'in tekrarlayan dersi.
 */
export function MuhasebeSuzgeci({
  gorunum,
  from,
  to,
  kategori,
  kategoriler,
}: {
  gorunum: string;
  from: string;
  to: string;
  kategori: string;
  /** Arşiv DAHİL — yukarıdaki nota bakınız. */
  kategoriler: TransactionCategoryPanelDto[];
}) {
  const router = useRouter();
  const [bas, setBas] = useState(from);
  const [bit, setBit] = useState(to);
  const [kat, setKat] = useState(kategori);

  useEffect(() => {
    setBas(from);
    setBit(to);
    setKat(kategori);
  }, [from, to, kategori]);

  const uygula = (yeniBas: string, yeniBit: string, yeniKat: string) => {
    router.push(
      muhasebeYolu({
        gorunum,
        from: yeniBas || undefined,
        to: yeniBit || undefined,
        kategori: yeniKat || undefined,
      }),
    );
  };

  const suzgecVar = Boolean(from || to || kategori);

  return (
    <form
      onSubmit={(olay) => {
        olay.preventDefault();
        uygula(bas, bit, kat);
      }}
      className="flex flex-wrap items-end gap-3"
    >
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="muhasebe-from">Başlangıç</Label>
        <Input
          id="muhasebe-from"
          type="date"
          value={bas}
          onChange={(o) => setBas(o.target.value)}
          className="tabular"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="muhasebe-to">Bitiş (dahil)</Label>
        <Input
          id="muhasebe-to"
          type="date"
          value={bit}
          onChange={(o) => setBit(o.target.value)}
          className="tabular"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="muhasebe-kategori">Kategori</Label>
        <select
          id="muhasebe-kategori"
          value={kat}
          onChange={(o) => setKat(o.target.value)}
          className="focus-ring rounded-input border-line-strong bg-elevated text-primary h-11 border px-3 text-sm"
        >
          <option value="">Hepsi</option>
          {kategoriler.map((k) => (
            <option key={k.id} value={k.id}>
              {k.name}
              {k.isArchived ? ' (arşivli)' : ''}
            </option>
          ))}
        </select>
      </div>

      <Button type="submit" variant="secondary" size="sm">
        Uygula
      </Button>

      {suzgecVar && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => {
            setBas('');
            setBit('');
            setKat('');
            uygula('', '', '');
          }}
        >
          <X className="size-4" aria-hidden="true" />
          Süzgeçleri temizle
        </Button>
      )}
    </form>
  );
}
