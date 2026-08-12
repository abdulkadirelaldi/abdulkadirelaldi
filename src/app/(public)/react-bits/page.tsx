import type { Metadata } from 'next';

import { ReactBitsGaleri } from '@/components/reactbits/galeri';

export const metadata: Metadata = {
  title: 'React Bits doğrulaması',
  description: 'T-020 — kurulan bileşenlerin token uyumu ve davranış kontrolü.',
  robots: { index: false, follow: false },
};

/**
 * T-020 DOĞRULAMA SAYFASI — GEÇİCİ.
 *
 * Kurulan React Bits bileşenlerinin tek yerde görülebilmesi için var: token
 * uyumu, iki tema, `prefers-reduced-motion` davranışı ve iskelet fallback'leri
 * burada gözle denetlenir. Bundle ölçümü de bu sayfa üzerinden yapıldı.
 *
 * F2'de (T-021 ve sonrası) bileşenler gerçek sayfalara yerleşince bu sayfa
 * SİLİNECEK. Ana sayfanın kendisi değildir, olmaya çalışmaz.
 */
export default function ReactBitsDogrulamaPage() {
  return <ReactBitsGaleri />;
}
