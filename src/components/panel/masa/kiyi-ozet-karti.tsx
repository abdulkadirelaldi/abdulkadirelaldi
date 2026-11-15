import { ExternalLink } from 'lucide-react';

import { cn } from '@/lib/utils/cn';
import type { KiyiOzet, KiyiSonuc } from '@/server/services/kiyi-medya';

const TL = new Intl.NumberFormat('tr-TR', {
  style: 'currency',
  currency: 'TRY',
  maximumFractionDigits: 0,
});
const GUN = new Intl.DateTimeFormat('tr-TR', {
  weekday: 'short',
  day: 'numeric',
  month: 'short',
  timeZone: 'Europe/Istanbul',
});

/**
 * KIYI MEDYA ÖZETİ (ADR-049 M3) — Kıyı Medya dolabının başında, Kıyı Medya'nın KENDİ verisi
 * (salt-okur köprü). Sunucu bileşeni. Bağlı değilse ya da ulaşılamazsa bunu söyler; sıfırlar
 * gösterip "her şey yolunda" izlenimi vermez.
 */
export function KiyiOzetKarti({
  sonuc,
  panelAdresi,
}: {
  sonuc: KiyiSonuc<KiyiOzet>;
  panelAdresi: string;
}) {
  return (
    <section
      aria-labelledby="kiyi-ozet"
      className="rounded-card border-line bg-surface flex flex-col gap-3 border p-4"
    >
      <div className="flex items-center gap-2">
        <h3 id="kiyi-ozet" className="text-primary text-base font-semibold">
          Kıyı Medya — bu ay
        </h3>
        <a
          href={panelAdresi}
          target="_blank"
          rel="noopener noreferrer"
          className="focus-ring text-accent ml-auto inline-flex min-h-10 items-center gap-1 rounded text-xs font-medium"
        >
          Kıyı Medya paneli
          <ExternalLink className="size-3.5" aria-hidden="true" />
        </a>
      </div>

      {sonuc.durum === 'kapali' ? (
        <p className="text-muted text-sm">
          Köprü bağlı değil. Kıyı Medya muhasebesi, çekimler ve görevler burada görünsün diye
          sunucuya köprü anahtarı tanımlanmalı.
        </p>
      ) : sonuc.durum === 'hata' ? (
        <p role="alert" className="text-danger text-sm">
          {sonuc.mesaj} Rakamlar şu an gösterilemiyor.
        </p>
      ) : (
        <>
          <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              ['Gelir', sonuc.veri.muhasebe.buAy.gelir, 'text-success'],
              ['Gider', sonuc.veri.muhasebe.buAy.gider, 'text-primary'],
              [
                'Net',
                sonuc.veri.muhasebe.buAy.net,
                sonuc.veri.muhasebe.buAy.net < 0 ? 'text-danger' : 'text-success',
              ],
              ['Bekleyen alacak', sonuc.veri.muhasebe.alacak.bekleyen, 'text-primary'],
            ].map(([ad, tutar, renk]) => (
              <div key={ad as string} className="flex flex-col">
                <dt className="text-muted text-xs">{ad}</dt>
                <dd className={cn('tabular text-base font-semibold', renk as string)}>
                  {TL.format(tutar as number)}
                </dd>
              </div>
            ))}
          </dl>
          <p className="text-muted text-xs">
            {sonuc.veri.acikGorev} açık görev
            {sonuc.veri.muhasebe.alacak.gecikenSayi > 0 && (
              <span className="text-danger font-medium">
                {' '}
                · {sonuc.veri.muhasebe.alacak.gecikenSayi} geciken tahsilat (
                {TL.format(sonuc.veri.muhasebe.alacak.geciken)})
              </span>
            )}
          </p>
          {sonuc.veri.yaklasanCekimler.length > 0 && (
            <div className="flex flex-col gap-1">
              <h4 className="text-primary text-sm font-medium">Önümüzdeki 7 gün çekimler</h4>
              <ul className="divide-line divide-y text-sm">
                {sonuc.veri.yaklasanCekimler.map((c) => (
                  <li key={c.id} className="flex gap-2 py-1.5">
                    <span aria-hidden="true">🎬</span>
                    <span className="text-primary min-w-0 flex-1 truncate">
                      {c.baslik}
                      {c.musteri && <span className="text-muted"> · {c.musteri}</span>}
                    </span>
                    <span className="text-muted tabular shrink-0 text-xs">
                      {c.gun ? GUN.format(new Date(c.gun)) : ''}
                      {c.baslangicSaat ? ` ${c.baslangicSaat}` : ''}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}
    </section>
  );
}
