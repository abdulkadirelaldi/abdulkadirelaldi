'use client';

import { Search, X } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import { MESAJ_GORUNUMLERI, mesajlarYolu } from '@/components/panel/mesaj-gorunumleri';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils/cn';

/**
 * Görünüm sekmeleri + arama.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * SEKMELER BAĞLANTI, DÜĞME DEĞİL
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Her görünüm bir ADRES (`?gorunum=spam`). Üç kazancı var ve üçü de bedavaya
 * gelmiyor olsaydı istemci durumu tercih edilebilirdi:
 *
 *   1. Sunucu süzüyor — `fetchContactMessages` filtreyi Prisma'ya geçiriyor.
 *      İstemcide süzmek, spam mesajların tamamını tarayıcıya indirmek olurdu.
 *   2. Adres paylaşılabilir ve geri tuşu çalışıyor.
 *   3. §9/2'nin bekleyen iddiası doğrudan bir adrese bakabiliyor.
 *
 * ARAMA İSE DÜĞME/GİRDİ: yazarken her tuşta gezinmek istemiyoruz. Gönderimde
 * (`Enter` ya da düğme) adrese yazılıyor — aynı tek doğruluk kaynağı.
 */
export function MesajSuzgecleri({
  aktifGorunum,
  aramaTerimi,
}: {
  aktifGorunum: string;
  aramaTerimi: string;
}) {
  const router = useRouter();
  const [metin, setMetin] = useState(aramaTerimi);

  /* Adres dışarıdan değişince (geri tuşu, sekme) girdi onu takip etsin. */
  useEffect(() => setMetin(aramaTerimi), [aramaTerimi]);

  const ara = (terim: string) => {
    router.push(mesajlarYolu({ gorunum: aktifGorunum, q: terim.trim() || undefined }));
  };

  return (
    <div className="flex flex-col gap-3">
      {/*
        `role="tablist"` KULLANILMIYOR: sekme deseni aynı sayfada panel
        değiştirmeyi anlatır, buradaysa her sekme ayrı bir adrese GİDİYOR.
        Yanlış rol, ekran okuyucuya olmayan bir davranış vaat ederdi.
        Gezinti olduğu için `nav` + `aria-current`.
      */}
      <nav aria-label="Mesaj görünümleri" className="-mx-1 overflow-x-auto px-1 pb-1">
        <ul className="flex min-w-max gap-1.5">
          {MESAJ_GORUNUMLERI.map((gorunum) => {
            const aktif = gorunum.anahtar === aktifGorunum;
            return (
              <li key={gorunum.anahtar}>
                <Link
                  href={mesajlarYolu({ gorunum: gorunum.anahtar, q: aramaTerimi || undefined })}
                  aria-current={aktif ? 'page' : undefined}
                  className={cn(
                    'focus-ring ease-brand duration-micro rounded-btn inline-flex items-center border px-3 py-2 text-sm transition-colors',
                    aktif
                      ? 'border-accent/40 bg-accent/12 text-accent-soft'
                      : 'border-line bg-surface text-body hover:border-line-hover hover:text-primary',
                  )}
                >
                  {gorunum.etiket}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <form
        role="search"
        onSubmit={(olay) => {
          olay.preventDefault();
          ara(metin);
        }}
        className="flex items-center gap-2"
      >
        <div className="relative flex-1">
          <Search
            className="text-muted pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2"
            aria-hidden="true"
          />
          <Input
            type="search"
            value={metin}
            onChange={(olay) => setMetin(olay.target.value)}
            placeholder="Ad, e-posta, konu veya mesaj içinde ara"
            aria-label="Mesajlarda ara"
            className="pl-9"
          />
        </div>

        {aramaTerimi && (
          <button
            type="button"
            onClick={() => {
              setMetin('');
              ara('');
            }}
            className="focus-ring rounded-btn border-line bg-surface text-body hover:text-primary inline-flex items-center gap-1.5 border px-3 py-2 text-sm"
          >
            <X className="size-4" aria-hidden="true" />
            Aramayı temizle
          </button>
        )}
      </form>
    </div>
  );
}
