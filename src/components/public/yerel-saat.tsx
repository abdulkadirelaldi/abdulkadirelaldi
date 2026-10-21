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
 * İLK KAREDE BOŞ: sunucunun saati ile istemcinin saati farklı dakikaya
 * düşebilir ve hidrasyon uyuşmazlığı verir. Saat yalnızca istemcide, bağlandıktan
 * sonra basılıyor; yer tutucu genişliği sabit (`tabular`, 5 karakter) — CLS yok.
 */
export function YerelSaat() {
  const [saat, setSaat] = useState<string | null>(null);

  useEffect(() => {
    const guncelle = () => setSaat(BICIM.format(new Date()));
    guncelle();
    const zamanlayici = window.setInterval(guncelle, 15_000);
    return () => window.clearInterval(zamanlayici);
  }, []);

  return (
    <time className="tabular inline-block w-[5ch]" suppressHydrationWarning>
      {saat ?? '--:--'}
    </time>
  );
}
