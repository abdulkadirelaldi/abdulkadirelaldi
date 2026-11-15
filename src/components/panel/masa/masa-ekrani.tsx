'use client';

import { ChevronRight, Plus } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import { Pencere } from '@/components/panel/takvim/pencere';
import { Button } from '@/components/ui/button';
import { FormError } from '@/components/ui/form-error';
import { TAKVIM_KATMANLARI } from '@/lib/takvim/katmanlar';
import { dolapOlusturAction, onerilenDolaplariKurAction } from '@/server/actions/masa';
import type { AppDay } from '@/server/services/_shared/app-date';
import type { DolapSecenegi, MasaUstu } from '@/server/services/masa';

import { DolapFormu } from './dolap-formu';
import { useGorevIslemleri } from './gorev-islemleri';
import { GorevObegi, GorevSatiri } from './gorev-satiri';

/**
 * MASA ÜSTÜ (ADR-049 M2) — gecikmiş, bugün, yaklaşan (7 gün), teslimsiz görevler; son
 * tamamlananlar; dolaplar. Öbekler sunucuda kurulur, ekran yalnızca çizer.
 */
export function MasaEkrani({
  ustu,
  secenekler,
  bugun,
}: {
  ustu: MasaUstu;
  secenekler: readonly DolapSecenegi[];
  bugun: AppDay;
}) {
  const router = useRouter();
  const gorev = useGorevIslemleri(secenekler);
  const { sifirla } = gorev;
  useEffect(() => sifirla(), [ustu, sifirla]);
  const [yeniDolap, setYeniDolap] = useState(false);
  const [kurHata, setKurHata] = useState<string | null>(null);
  const satir = (g: Parameters<typeof gorev.duzenle>[0]) => (
    <GorevSatiri
      key={g.id}
      g={g}
      bugun={bugun}
      durumDegistir={gorev.durumDegistir}
      ac={gorev.duzenle}
    />
  );
  const acikSayi =
    ustu.gecikmis.length + ustu.bugun.length + ustu.yaklasan.length + ustu.teslimsiz.length;

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6">
      <div className="flex items-center gap-3">
        <p className="text-muted text-sm">
          {acikSayi === 0 ? 'Masan temiz.' : `${acikSayi} açık görev`}
        </p>
        <Button size="sm" className="ml-auto" onClick={() => gorev.yeniGorev()}>
          <Plus className="size-4" aria-hidden="true" />
          Yeni görev
        </Button>
      </div>
      {gorev.hata && <FormError>{gorev.hata}</FormError>}

      <div className="flex flex-col gap-5">
        <GorevObegi baslik="Gecikmiş" ton="tehlike" gorevler={gorev.uygula(ustu.gecikmis)}>
          {satir}
        </GorevObegi>
        <GorevObegi baslik="Bugün" gorevler={gorev.uygula(ustu.bugun)}>
          {satir}
        </GorevObegi>
        <GorevObegi baslik="Önümüzdeki 7 gün" gorevler={gorev.uygula(ustu.yaklasan)}>
          {satir}
        </GorevObegi>
        <GorevObegi baslik="Teslim tarihi olmayanlar" gorevler={gorev.uygula(ustu.teslimsiz)}>
          {satir}
        </GorevObegi>
        {acikSayi === 0 && (
          <p className="rounded-card border-line-hover text-muted border border-dashed p-4 text-center text-sm">
            Yaklaşan görev yok. &ldquo;Yeni görev&rdquo; ile ekleyebilirsin.
          </p>
        )}
        {ustu.tamamlanan.length > 0 && (
          <details className="group">
            <summary className="focus-ring text-muted cursor-pointer rounded text-sm font-medium">
              Son 7 günde tamamlananlar · {ustu.tamamlanan.length}
            </summary>
            <ul className="rounded-card border-line bg-surface divide-line mt-2 divide-y border">
              {gorev.uygula(ustu.tamamlanan).map(satir)}
            </ul>
          </details>
        )}
      </div>

      <section aria-labelledby="dolaplar-baslik" className="flex flex-col gap-3">
        <div className="flex items-center gap-3">
          <h2 id="dolaplar-baslik" className="text-primary text-base font-semibold">
            Dolaplar
          </h2>
          <Button
            size="sm"
            variant="secondary"
            className="ml-auto"
            onClick={() => setYeniDolap(true)}
          >
            <Plus className="size-4" aria-hidden="true" />
            Yeni dolap
          </Button>
        </div>
        {ustu.dolaplar.length === 0 ? (
          <div className="rounded-card border-line-hover flex flex-col items-center gap-3 border border-dashed p-6 text-center">
            <p className="text-muted text-sm">
              Henüz dolap yok. Samsun Üniversitesi, Kıyı Medya ve Spectraloop dolaplarını ilk
              raflarıyla tek dokunuşla kurabilirsin.
            </p>
            <Button
              onClick={async () => {
                setKurHata(null);
                const sonuc = await onerilenDolaplariKurAction();
                if (sonuc.ok) router.refresh();
                else setKurHata(sonuc.error.message);
              }}
            >
              Önerilen dolapları kur
            </Button>
            {kurHata && <FormError>{kurHata}</FormError>}
          </div>
        ) : (
          <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {ustu.dolaplar.map((d) => (
              <li key={d.id}>
                <Link
                  href={`/panel/masa/${d.id}`}
                  className="focus-ring rounded-card border-line bg-surface hover:border-line-hover flex items-center gap-3 border p-4 transition-colors"
                >
                  <span aria-hidden="true" className="text-2xl">
                    {d.emoji}
                  </span>
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="text-primary truncate text-sm font-semibold">{d.ad}</span>
                    <span className="text-muted truncate text-xs">
                      {TAKVIM_KATMANLARI[d.katman].ad} · {d.rafSayisi} raf · {d.acikGorev} açık
                      görev
                    </span>
                  </span>
                  <ChevronRight className="text-muted size-4 shrink-0" aria-hidden="true" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {gorev.pencere}
      {yeniDolap && (
        <Pencere baslik="Yeni dolap" kapat={() => setYeniDolap(false)}>
          <DolapFormu
            ilk={{ ad: '', emoji: '🗄️', katman: 'KISISEL' }}
            vazgec={() => setYeniDolap(false)}
            kaydet={async (girdi) => {
              const sonuc = await dolapOlusturAction(girdi);
              if (sonuc.ok) {
                setYeniDolap(false);
                router.push(`/panel/masa/${sonuc.data.id}`);
              }
              return sonuc;
            }}
          />
        </Pencere>
      )}
    </div>
  );
}
