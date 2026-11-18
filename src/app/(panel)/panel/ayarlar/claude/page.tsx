import type { Metadata } from 'next';

import { BaglantiListesi } from '@/components/panel/oauth/baglanti-listesi';
import { Topbar } from '@/components/panel/topbar';
import { mcpKaynagi } from '@/lib/oauth/kurallar';
import { fetchBagliIstemciler } from '@/server/services/oauth';

export const metadata: Metadata = {
  title: 'Claude bağlayıcısı',
  robots: { index: false, follow: false, nocache: true },
};

const ADIMLAR = [
  'Claude uygulamasında (telefon ya da claude.ai): Ayarlar → Bağlayıcılar → Özel bağlayıcı ekle.',
  'Ad: "Panel". Adres: aşağıdaki MCP adresi. Ekle.',
  'Bağlan dediğinde bu panelin giriş sayfası açılır; giriş yapıp "İzin ver" de.',
  'Bitti. Sohbette "bugün neler var?", "Garage reels bitti", "cuma 14:00 Kozmos çekim planı ekle" diyebilirsin.',
];

/** `/panel/ayarlar/claude` — Claude bağlayıcısı (ADR-056): kurulum ve bağlı istemciler. */
export default async function ClaudeBaglayiciPage() {
  const baglantilar = await fetchBagliIstemciler();
  return (
    <>
      <Topbar title="Claude bağlayıcısı" />
      <main id="panel-icerik" className="flex-1 px-4 py-4 lg:p-6">
        <div className="mx-auto flex max-w-2xl flex-col gap-4">
          <section className="rounded-card border-line bg-surface flex flex-col gap-3 border p-5">
            <h2 className="text-primary text-base font-semibold">Kurulum</h2>
            <ol className="text-body flex list-decimal flex-col gap-2 pl-5 text-sm">
              {ADIMLAR.map((a) => (
                <li key={a}>{a}</li>
              ))}
            </ol>
            <code className="bg-elevated text-primary rounded-xl p-3 text-xs break-all">
              {mcpKaynagi()}
            </code>
            <p className="text-muted text-xs">
              Claude yalnızca İşler’e ve bugünün özetine erişir. Yaptığı her değişiklik denetim
              kaydına “mcp” olarak düşer.
            </p>
          </section>
          <section className="rounded-card border-line bg-surface flex flex-col gap-2 border p-5">
            <h2 className="text-primary text-base font-semibold">Bağlantılar</h2>
            <BaglantiListesi baglantilar={baglantilar} />
          </section>
        </div>
      </main>
    </>
  );
}
