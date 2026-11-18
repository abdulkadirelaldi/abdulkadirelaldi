'use client';

import { ShieldCheck } from 'lucide-react';
import { useState, useTransition } from 'react';

import { Button } from '@/components/ui/button';
import { FormError } from '@/components/ui/form-error';
import { yetkiReddetAction, yetkiVerAction } from '@/server/actions/oauth';
import type { YetkiIstegi } from '@/server/services/oauth';

/** Claude bağlayıcısı izin ekranı (ADR-056). İstemci adı ve dönüş adresinin HOST'u açıkça yazılır. */
export function IzinKarti({
  istek,
  istemciAdi,
  yonlendirmeHostu,
}: {
  istek: YetkiIstegi;
  istemciAdi: string;
  yonlendirmeHostu: string;
}) {
  const [hata, setHata] = useState<string | null>(null);
  const [bekliyor, gecis] = useTransition();

  const git = (
    is: () => Promise<
      { ok: true; data: { adres: string } } | { ok: false; error: { message: string } }
    >,
  ) =>
    gecis(async () => {
      setHata(null);
      const s = await is();
      if (s.ok) window.location.assign(s.data.adres);
      else setHata(s.error.message);
    });

  return (
    <section className="rounded-card border-line bg-surface mx-auto flex max-w-md flex-col gap-5 border p-6">
      <div className="flex items-start gap-3">
        <ShieldCheck className="text-accent mt-0.5 size-6 shrink-0" aria-hidden="true" />
        <div className="flex flex-col gap-1">
          <h2 className="text-primary text-lg font-semibold">
            {istemciAdi} panelinize bağlanmak istiyor
          </h2>
          <p className="text-muted text-sm">
            Dönüş adresi: <strong className="text-primary">{yonlendirmeHostu}</strong>
          </p>
        </div>
      </div>
      <div className="text-body flex flex-col gap-2 text-sm">
        <p>İzin verirsen Claude:</p>
        <ul className="list-disc pl-5">
          <li>İşlerini ve bugünün özetini okuyabilir,</li>
          <li>iş ekleyip düzenleyebilir, tik atıp geri alabilir, silebilir.</li>
        </ul>
        <p className="text-muted">
          Cüzdan, sağlık ve diğer bölümlere erişemez. Bağlantıyı Ayarlar → Claude bağlayıcısı'ndan
          her an kaldırabilirsin.
        </p>
      </div>
      {hata && <FormError>{hata}</FormError>}
      <div className="flex gap-2">
        <Button disabled={bekliyor} onClick={() => git(() => yetkiVerAction(istek))}>
          İzin ver
        </Button>
        <Button
          variant="ghost"
          disabled={bekliyor}
          onClick={() =>
            git(() =>
              yetkiReddetAction({
                istemciId: istek.istemciId,
                yonlendirme: istek.yonlendirme,
                durum: istek.durum,
              }),
            )
          }
        >
          Reddet
        </Button>
      </div>
    </section>
  );
}
