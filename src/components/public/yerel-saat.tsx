'use client';

import { useEffect, useState } from 'react';

const BICIM = new Intl.DateTimeFormat('tr-TR', {
  hour: '2-digit',
  minute: '2-digit',
  timeZone: 'Europe/Istanbul',
});

/**
 * Hero'daki canlı yerel saat ("İSTANBUL · 14:32").
 *
 * SUNUCUDA DA BASILIYOR: sayfa her istekte üretiliyor (CSP nonce'u, bkz.
 * middleware), yani sunucunun saati isteğin saati. Önceden ilk karede `--:--`
 * gösteriliyordu ve boş bir alan gibi duruyordu (2026-10-26). Sunucu ile
 * istemci farklı dakikaya düşerse uyuşmazlık uyarısı `suppressHydrationWarning`
 * ile susturuluyor; etkisi sonraki güncellemede düzelen tek bir dakika.
 */
export function YerelSaat() {
  const [saat, setSaat] = useState(() => BICIM.format(new Date()));

  useEffect(() => {
    const guncelle = () => setSaat(BICIM.format(new Date()));
    guncelle();
    const zamanlayici = window.setInterval(guncelle, 15_000);
    return () => window.clearInterval(zamanlayici);
  }, []);

  return (
    <time className="tabular inline-block w-[5ch]" suppressHydrationWarning>
      {saat}
    </time>
  );
}
