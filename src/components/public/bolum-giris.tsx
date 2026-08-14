'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';

import { useAzHareket } from '@/components/az-hareket';
import { cn } from '@/lib/utils/cn';

/**
 * Bölüm giriş animasyonu — §5.1.
 *
 * ADR-025: `AnimatedContent` / `ScrollReveal` gsap istiyordu, gsap reddedildi.
 *
 * T-023'TE framer-motion'DAN CSS'E TAŞINDI. Eski sürüm `whileInView` kullanıyordu
 * ve bu tek satır, framer-motion'ı ana sayfanın BAŞLANGIÇ paketine sokuyordu:
 * 43 kB ve 4× CPU kısıtında ~280 ms betik. Yapılan iş "görününce opaklık ve
 * 16 px kaydırma" — tarayıcının `transition`'ı bunu bedavaya yapıyor; tek
 * gereken görünürlük bilgisi, o da 15 satır `IntersectionObserver`.
 *
 * §5.1 ayarları KORUNDU: `once` (gözlemci ilk kesişmede kendini kapatır) ve
 * `amount: 0.2` (eşik). Süre/easing §3.4 token'ları (`duration-enter`,
 * `ease-brand`) — sayı elle yazılmıyor.
 *
 * `prefers-reduced-motion`: kanca `true` döndüğünde geçiş sınıfları hiç
 * eklenmez, içerik son hâlinde durur. globals.css'teki global kural da ayrıca
 * yürürlükte — iki savunma hattı.
 */

/** Öğenin görünen oranı bu eşiği geçince giriş başlar (§5.1 `amount: 0.2`). */
const ESIK = 0.2;

export function BolumGiris({
  children,
  className,
  gecikme = 0,
}: {
  children: ReactNode;
  className?: string;
  /** Saniye. Ardışık öğeleri kademelendirmek için (§3.4 giriş 400ms). */
  gecikme?: number;
}) {
  const azHareket = useAzHareket();
  const kap = useRef<HTMLDivElement>(null);
  const [gorundu, setGorundu] = useState(false);

  useEffect(() => {
    const oge = kap.current;
    if (!oge) return;

    const gozlemci = new IntersectionObserver(
      (girdiler) => {
        /**
         * TÜM GİRDİLER TARANIR, YALNIZCA `girdiler[0]` DEĞİL.
         *
         * Ölçülen hata: 300 px'lik bir kaydırma adımında öğe iki eşiği (0 ve
         * 0.2) AYNI KAREDE geçiyor ve tarayıcı ikisini TEK çağrıda, dizi olarak
         * veriyor. İlk girdi "yeni değdi" (oran ~0) olduğu için erken dönülüyor,
         * ikinci girdi (oran 1) hiç okunmuyordu. Her iki eşik de geçilmiş
         * olduğundan gözlemci bir daha tetiklenmiyor ve bölüm KALICI OLARAK
         * GÖRÜNMEZ kalıyordu — 1440×900'de altı sarmalayıcı bu hâlde bulundu.
         */
        for (const girdi of girdiler) {
          /**
           * ÜSTTEN ÇIKMIŞ ÖĞE: hızlı kaydırmada bir blok tek karede ekranın
           * altından girip üstünden çıkabilir. Kesişme koşulu artık sağlanmaz
           * ama içerik geride görünmez kalamaz — kullanıcı yukarı kaydırdığında
           * boşluk görürdü. Geçilmişse doğrudan açılır.
           */
          const gecti = girdi.boundingClientRect.bottom <= 0;

          if (!girdi.isIntersecting && !gecti) continue;

          /**
           * EKRANDAN UZUN ÖĞE TUZAĞI: `threshold: 0.2` öğenin KENDİ
           * yüksekliğinin %20'sini ister. Ekrandan uzun bir blok bu orana hiç
           * ulaşamaz. Kesişen alan ekranın beşte birini geçtiyse de kabul edilir.
           */
          const ekranPayi = girdi.intersectionRect.height / window.innerHeight;
          if (!gecti && girdi.intersectionRatio < ESIK && ekranPayi < ESIK) continue;

          setGorundu(true);
          gozlemci.disconnect();
          return;
        }
      },
      { threshold: [0, ESIK] },
    );

    gozlemci.observe(oge);
    return () => gozlemci.disconnect();
  }, []);

  if (azHareket) {
    return <div className={className}>{children}</div>;
  }

  return (
    <div
      ref={kap}
      className={cn(
        'ease-brand duration-enter transition-[opacity,transform]',
        gorundu ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0',
        className,
      )}
      style={gecikme ? { transitionDelay: `${gecikme}s` } : undefined}
    >
      {children}
    </div>
  );
}
