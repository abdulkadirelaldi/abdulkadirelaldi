import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { miktarBicim } from '@/components/panel/cuzdan-bicim';
import { BorcFormu, OdemeFormu } from '@/components/panel/cuzdan-formlari';
import { Topbar } from '@/components/panel/topbar';
import { cuidSchema } from '@/lib/schemas/common';
import { appToday } from '@/server/services/_shared';
import { fetchDebtPayments, fetchWalletDebtById } from '@/server/services/cuzdan';

export const metadata: Metadata = {
  title: 'Borç',
  robots: { index: false, follow: false, nocache: true },
};

/** Borç: özet, ödeme yap (kalanı aynı işlemde düşürür), geçmiş ödemeler, düzenle. */
export default async function BorcPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!cuidSchema.safeParse(id).success) notFound();
  const [borc, odemeler] = await Promise.all([fetchWalletDebtById(id), fetchDebtPayments(id)]);
  if (!borc) notFound();

  return (
    <>
      <Topbar title={borc.name} />
      <main id="panel-icerik" className="flex-1 px-4 py-4 lg:p-6">
        <div className="mx-auto flex max-w-xl flex-col gap-5">
          <section className="rounded-card border-line bg-surface flex flex-col gap-2 border p-4">
            <span className="text-muted text-sm">Kalan</span>
            <span className="tabular text-primary text-2xl font-semibold">
              {miktarBicim(borc.remainingAmount, borc.unit)}
            </span>
            <div className="bg-elevated h-2 overflow-hidden rounded-full">
              <div
                className="bg-success h-full rounded-full"
                style={{ width: `${borc.odenenYuzde}%` }}
              />
            </div>
            <span className="tabular text-muted text-xs">
              %{borc.odenenYuzde} ödendi · toplam {miktarBicim(borc.totalAmount, borc.unit)}
              {borc.kalanAy !== null && ` · ${borc.kalanAy} ay kaldı`}
              {borc.isClosed && ' · KAPANDI'}
            </span>
          </section>

          {!borc.isClosed && <OdemeFormu borcId={borc.id} birim={borc.unit} bugun={appToday()} />}

          {odemeler.length > 0 && (
            <section className="flex flex-col gap-2">
              <h2 className="text-primary text-base font-semibold">Ödemeler</h2>
              <ul className="flex flex-col gap-1.5">
                {odemeler.map((o) => (
                  <li
                    key={o.id}
                    className="border-line flex items-center justify-between border-b py-2 text-sm"
                  >
                    <span className="tabular text-muted">{o.date}</span>
                    <span className="tabular text-primary font-medium">
                      {miktarBicim(o.amount, borc.unit)}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section className="flex flex-col gap-3">
            <h2 className="text-primary text-base font-semibold">Düzenle</h2>
            <BorcFormu borc={borc} />
          </section>
        </div>
      </main>
    </>
  );
}
