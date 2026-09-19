import { ArrowLeft } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { MesajDetay } from '@/components/panel/mesaj-detay';
import { Topbar } from '@/components/panel/topbar';
import { buttonClasses } from '@/components/ui/button';
import { fetchContactMessageById } from '@/server/services/contact-message';

export const metadata: Metadata = {
  title: 'Mesaj',
  robots: { index: false, follow: false, nocache: true },
};

type SayfaProps = { params: Promise<{ id: string }> };

/**
 * `/panel/mesajlar/[id]` — tekil mesaj.
 *
 * ⚠️ KVKK SINIRI BU ROTADA: `fetchContactMessageById` `ip` ve `userAgent`i
 * döndüren TEK okuma (§8 / ADR-020). Liste rotası bu alanları hiç görmüyor
 * ve görmemeli — ayrım Backend'in `LIST_SELECT`inde kurulu, burada korunuyor.
 *
 * BAŞLIK METADATA'DA SABİT ("Mesaj"): gönderenin adını ya da konusunu sekme
 * başlığına yazmak, kişisel veriyi tarayıcı geçmişine düşürürdü. Panel zaten
 * `noindex`; sorun arama motoru değil, paylaşılan ekran ve geçmiş listesi.
 */
export default async function MesajDetaySayfasi({ params }: SayfaProps) {
  const { id } = await params;
  const mesaj = await fetchContactMessageById(id);

  if (!mesaj) notFound();

  return (
    <>
      <Topbar title={mesaj.subject ?? 'Konu yok'} />

      <main id="panel-icerik" className="flex-1 p-4 lg:p-6">
        <div className="flex max-w-3xl flex-col gap-6">
          <Link
            href="/panel/mesajlar"
            className={buttonClasses({ variant: 'ghost', size: 'sm', className: 'self-start' })}
          >
            <ArrowLeft className="size-4" aria-hidden="true" />
            Mesajlara dön
          </Link>

          <MesajDetay mesaj={mesaj} />
        </div>
      </main>
    </>
  );
}
