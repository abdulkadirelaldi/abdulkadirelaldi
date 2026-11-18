import type { Metadata } from 'next';

import { IzinKarti } from '@/components/panel/oauth/izin-karti';
import { Topbar } from '@/components/panel/topbar';
import { OAuthHatasi, yetkiIsteginiDogrula, type YetkiIstegi } from '@/server/services/oauth';

export const metadata: Metadata = {
  title: 'Claude bağlantısı',
  robots: { index: false, follow: false, nocache: true },
};

type Sorgu = Promise<Record<string, string | string[] | undefined>>;
const tek = (v: string | string[] | undefined) => (typeof v === 'string' ? v : null);

/**
 * `/panel/oauth/yetki` — OAuth 2.1 yetkilendirme ucu (ADR-056). Panel yolu: ara katman oturumsuzu
 * girişe, 2FA'sızı kuruluma gönderir; buraya yalnızca 2FA'lı sahibi ulaşır. İstek doğrulanmadan
 * hiçbir yere yönlendirilmez (hatalı istekte sayfa hatayı söyler).
 */
export default async function YetkiPage({ searchParams }: { searchParams: Sorgu }) {
  const q = await searchParams;
  const istek: YetkiIstegi = {
    istemciId: tek(q.client_id) ?? '',
    yonlendirme: tek(q.redirect_uri) ?? '',
    kodSinami: tek(q.code_challenge) ?? '',
    sinamaYontemi: tek(q.code_challenge_method) ?? '',
    kaynak: tek(q.resource),
    kapsam: tek(q.scope),
    durum: tek(q.state),
  };
  let icerik;
  if (tek(q.response_type) !== 'code') {
    icerik = <Hata metin="Geçersiz istek: response_type=code olmalı." />;
  } else {
    try {
      const d = await yetkiIsteginiDogrula(istek);
      icerik = (
        <IzinKarti istek={istek} istemciAdi={d.istemciAdi} yonlendirmeHostu={d.yonlendirmeHostu} />
      );
    } catch (e) {
      if (!(e instanceof OAuthHatasi)) throw e;
      icerik = <Hata metin={e.message} />;
    }
  }
  return (
    <>
      <Topbar title="Claude bağlantısı" />
      <main id="panel-icerik" className="flex-1 px-4 py-6 lg:p-6">
        {icerik}
      </main>
    </>
  );
}

function Hata({ metin }: { metin: string }) {
  return (
    <p
      role="alert"
      className="rounded-card border-danger/30 text-danger mx-auto max-w-md border p-5 text-sm"
    >
      Bağlantı isteği geçersiz: {metin}
    </p>
  );
}
