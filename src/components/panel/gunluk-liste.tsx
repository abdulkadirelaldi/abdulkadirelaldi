'use client';

import { Check, Minus, Plus, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';

import { simgeMetni } from '@/components/panel/hayat-bicim';
import { setHabitDayCountAction, setHabitDayStatusAction } from '@/server/actions/habit';
import type { GunDurumu, GunlukAliskanlikDto } from '@/server/services/habit-gun';
import { cn } from '@/lib/utils/cn';

/** Sayaç + açık işaret → durum. Sunucudaki `gunDurumu` ile aynı kural (iyimser güncelleme). */
function durumHesapla(count: number, missed: boolean, hedef: number | null): GunDurumu {
  if (missed) return 'YAPILMADI';
  if (count <= 0) return 'ISARETSIZ';
  return count >= (hedef ?? 1) ? 'YAPILDI' : 'EKSIK';
}

/**
 * HAYAT · GÜNLÜK LİSTE (2026-10-29) — telefonda her gün sırayla işaretlenen liste.
 *
 * Dokunuş ANINDA yansır (iyimser), sunucu yanıtı gelince kesinleşir; hata
 * olursa satır eski hâline döner ve hata satırın altında yazar. Sayfa sonra
 * `router.refresh()` ile özet kartını tazeler.
 *
 *   ✓  YAPTIM   — sayılı alışkanlıkta hedefe tamamlar; yeniden dokununca kaldırır
 *   ✗  YAPMADIM — açık işaret; yeniden dokununca kaldırır
 *   − / +       — yalnızca sayılı alışkanlıkta (ör. 7 bardak su)
 */
export function GunlukListe({ gun, items }: { gun: string; items: GunlukAliskanlikDto[] }) {
  return (
    <ul className="flex flex-col gap-2">
      {items.map((item) => (
        <Satir key={`${gun}-${item.id}`} gun={gun} item={item} />
      ))}
    </ul>
  );
}

function Satir({ gun, item }: { gun: string; item: GunlukAliskanlikDto }) {
  const router = useRouter();
  const [count, setCount] = useState(item.count);
  const [durum, setDurum] = useState<GunDurumu>(item.durum);
  const [hata, setHata] = useState<string | null>(null);
  const [bekliyor, basla] = useTransition();
  const hedef = item.targetPerDay;

  const uygula = (
    yeniCount: number,
    yeniMissed: boolean,
    eylem: () => Promise<{ ok: boolean; error?: { message: string } }>,
  ) => {
    const onceki = { count, durum };
    setCount(yeniCount);
    setDurum(durumHesapla(yeniCount, yeniMissed, hedef));
    setHata(null);
    basla(async () => {
      const sonuc = await eylem();
      if (!sonuc.ok) {
        setCount(onceki.count);
        setDurum(onceki.durum);
        setHata(sonuc.error?.message ?? 'Kaydedilemedi.');
        return;
      }
      router.refresh();
    });
  };

  const yaptim = () =>
    durum === 'YAPILDI'
      ? uygula(0, false, () =>
          setHabitDayStatusAction({ habitId: item.id, date: gun, durum: 'TEMIZLE' }),
        )
      : uygula(hedef ?? 1, false, () =>
          setHabitDayStatusAction({ habitId: item.id, date: gun, durum: 'YAPTIM' }),
        );

  const yapmadim = () =>
    durum === 'YAPILMADI'
      ? uygula(0, false, () =>
          setHabitDayStatusAction({ habitId: item.id, date: gun, durum: 'TEMIZLE' }),
        )
      : uygula(0, true, () =>
          setHabitDayStatusAction({ habitId: item.id, date: gun, durum: 'YAPMADIM' }),
        );

  const sayac = (fark: 1 | -1) => {
    const yeni = Math.max(0, Math.min(100, count + fark));
    if (yeni === count) return;
    uygula(yeni, false, () => setHabitDayCountAction({ habitId: item.id, date: gun, count: yeni }));
  };

  return (
    <li
      className={cn(
        'rounded-card border p-3 transition-colors',
        durum === 'YAPILDI' && 'border-success/40 bg-success/8',
        durum === 'YAPILMADI' && 'border-danger/40 bg-danger/8',
        durum === 'EKSIK' && 'border-warning/40 bg-warning/8',
        durum === 'ISARETSIZ' && 'border-line bg-surface',
      )}
    >
      <div className="flex items-center gap-3">
        <span aria-hidden="true" className="w-7 shrink-0 text-center text-xl">
          {simgeMetni(item.icon).trim() || '•'}
        </span>

        <div className="flex min-w-0 flex-1 flex-col">
          <span
            className={cn(
              'text-primary truncate font-medium',
              durum === 'YAPILDI' && 'text-muted line-through',
            )}
          >
            {item.name}
          </span>
          {hedef !== null && (
            <span className="tabular text-muted text-xs">
              {count} / {hedef}
            </span>
          )}
        </div>

        {hedef !== null && (
          <div className="flex items-center gap-1">
            <Dugme
              etiket={`${item.name}: bir azalt`}
              onClick={() => sayac(-1)}
              disabled={bekliyor || count === 0}
            >
              <Minus className="size-4" />
            </Dugme>
            <Dugme etiket={`${item.name}: bir artır`} onClick={() => sayac(1)} disabled={bekliyor}>
              <Plus className="size-4" />
            </Dugme>
          </div>
        )}

        <Dugme
          etiket={`${item.name}: yapmadım`}
          aktif={durum === 'YAPILMADI'}
          ton="danger"
          onClick={yapmadim}
          disabled={bekliyor}
        >
          <X className="size-5" />
        </Dugme>
        <Dugme
          etiket={`${item.name}: yaptım`}
          aktif={durum === 'YAPILDI'}
          ton="success"
          onClick={yaptim}
          disabled={bekliyor}
        >
          <Check className="size-5" />
        </Dugme>
      </div>

      {hata && (
        <p role="alert" className="text-danger mt-2 text-xs">
          {hata}
        </p>
      )}
    </li>
  );
}

/** 44 px dokunma hedefi; `aktif` iken dolu renk. */
function Dugme({
  etiket,
  aktif = false,
  ton,
  onClick,
  disabled,
  children,
}: {
  etiket: string;
  aktif?: boolean;
  ton?: 'success' | 'danger';
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={etiket}
      aria-pressed={ton ? aktif : undefined}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'focus-ring flex size-11 shrink-0 items-center justify-center rounded-full border transition-[transform,background-color,color] active:scale-90 disabled:opacity-50',
        !aktif && 'border-line bg-canvas text-muted',
        aktif && ton === 'success' && 'border-success bg-success text-white',
        aktif && ton === 'danger' && 'border-danger bg-danger text-white',
      )}
    >
      {children}
    </button>
  );
}
