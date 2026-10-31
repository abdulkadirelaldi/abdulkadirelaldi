'use client';

import { Check, Minus, Plus, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';

import { AliskanlikRozeti, aliskanlikRengi } from '@/components/panel/aliskanlik-rozeti';
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
export function GunlukListe({
  gun,
  items,
  seriler = {},
}: {
  gun: string;
  items: GunlukAliskanlikDto[];
  /** Alışkanlık kimliği → süren seri metni ("12 gün"). */
  seriler?: Readonly<Record<string, string>>;
}) {
  return (
    <ul className="flex flex-col gap-2.5">
      {items.map((item) => (
        <Satir key={`${gun}-${item.id}`} gun={gun} item={item} seri={seriler[item.id]} />
      ))}
    </ul>
  );
}

function Satir({
  gun,
  item,
  seri,
}: {
  gun: string;
  item: GunlukAliskanlikDto;
  seri: string | undefined;
}) {
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

  const ton = aliskanlikRengi(item.name, item.color);
  const durumMetni =
    durum === 'YAPILDI'
      ? 'Tamamlandı'
      : durum === 'YAPILMADI'
        ? 'Yapılmadı'
        : durum === 'EKSIK'
          ? 'Devam ediyor'
          : null;

  return (
    <li
      className={cn(
        'rounded-card flex flex-col gap-3 border p-3.5 transition-colors',
        durum === 'YAPILDI' && 'border-success/25 bg-success/8',
        durum === 'YAPILMADI' && 'border-danger/25 bg-danger/6',
        durum !== 'YAPILDI' && durum !== 'YAPILMADI' && 'border-line bg-surface',
      )}
    >
      <div className="flex items-center gap-3">
        <AliskanlikRozeti ad={item.name} simge={item.icon} renk={item.color} />

        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="text-primary truncate font-medium">{item.name}</span>
          <span className="text-muted flex items-center gap-2 text-xs">
            {seri && (
              <span className="tabular text-warning font-medium">
                <span aria-hidden="true">🔥 </span>
                {seri}
              </span>
            )}
            {durumMetni && <span>{durumMetni}</span>}
            {!seri && !durumMetni && <span>Bekliyor</span>}
          </span>
        </div>

        <Dugme
          etiket={`${item.name}: yapmadım`}
          aktif={durum === 'YAPILMADI'}
          ton="danger"
          kucuk
          onClick={yapmadim}
          disabled={bekliyor}
        >
          <X className="size-4" />
        </Dugme>
        <Dugme
          etiket={`${item.name}: yaptım`}
          aktif={durum === 'YAPILDI'}
          ton="success"
          onClick={yaptim}
          disabled={bekliyor}
        >
          <Check className="size-5" strokeWidth={2.5} />
        </Dugme>
      </div>

      {hedef !== null && (
        <div className="flex items-center gap-3">
          <Dugme
            etiket={`${item.name}: bir azalt`}
            kucuk
            onClick={() => sayac(-1)}
            disabled={bekliyor || count === 0}
          >
            <Minus className="size-4" />
          </Dugme>
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <div className="bg-elevated h-2 overflow-hidden rounded-full">
              <div
                className="h-full rounded-full transition-[width] duration-300"
                style={{
                  width: `${Math.min(100, (count / Math.max(1, hedef)) * 100)}%`,
                  backgroundColor: ton,
                }}
              />
            </div>
            <span className="tabular text-muted text-center text-xs">
              {count} / {hedef}
            </span>
          </div>
          <Dugme
            etiket={`${item.name}: bir artır`}
            kucuk
            onClick={() => sayac(1)}
            disabled={bekliyor}
          >
            <Plus className="size-4" />
          </Dugme>
        </div>
      )}

      {hata && (
        <p role="alert" className="text-danger text-xs">
          {hata}
        </p>
      )}
    </li>
  );
}

/** Ana düğme 44 px; `kucuk` 40 px, kenarsız. `aktif` iken dolu renk. */
function Dugme({
  etiket,
  aktif = false,
  ton,
  kucuk = false,
  onClick,
  disabled,
  children,
}: {
  etiket: string;
  aktif?: boolean;
  ton?: 'success' | 'danger';
  kucuk?: boolean;
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
        'focus-ring flex shrink-0 items-center justify-center rounded-full border transition-[transform,background-color,color] active:scale-90 disabled:opacity-50',
        kucuk ? 'size-10' : 'size-11',
        !aktif && kucuk && 'bg-elevated text-muted border-transparent',
        !aktif && !kucuk && 'border-line-strong/50 bg-canvas text-muted',
        aktif && ton === 'success' && 'border-success bg-success text-white',
        aktif && ton === 'danger' && 'border-danger bg-danger text-white',
      )}
    >
      {children}
    </button>
  );
}
