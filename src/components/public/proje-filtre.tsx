import Link from 'next/link';

import { cn } from '@/lib/utils/cn';

/**
 * Proje filtresi — §4.1 "etiket / teknoloji filtresi".
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * NEDEN BAĞLANTI, NEDEN İSTEMCİ DURUMU DEĞİL
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Filtre `<Link>`lerden ibaret ve durum URL'de. Bunun üç somut karşılığı var:
 *   - Bağlantı PAYLAŞILABİLİR: `?etiket=cms` birine gönderilebilir.
 *   - GERİ/İLERİ düğmeleri kendiliğinden doğru çalışır — istemci durumuyla
 *     yapılsaydı tarayıcı geçmişini elle yönetmek gerekirdi.
 *   - Sayfa İSTEMCİ BİLEŞENİ AÇMIYOR: filtre JS olmadan da çalışır ve pakete
 *     tek bayt eklemez.
 *
 * URL ŞEMASI (T-028 sitemap için): `/projeler?etiket=<tag>&teknoloji=<stack>`
 * İki parametre BİRLİKTE kullanılabilir; seçili olmayan parametre URL'e hiç
 * yazılmaz (boş değerli parametre bırakmak, aynı içeriği iki adresten servis
 * etmek olurdu).
 *
 * BİLİNMEYEN DEĞER 404 DEĞİL: `?etiket=olmayan` boş sonuç + boş durum üretir.
 * Filtre sonucunun boş olması "içerik yok olmuş" demek değildir; ADR-019'un
 * 404/410 ayrımı tekil içerik içindir, liste görünümü için değil.
 */

export type FiltreProps = {
  /** Tüm yayındaki projelerden türetilen seçenekler — filtre uygulanınca KAYBOLMAZ. */
  etiketler: string[];
  teknolojiler: string[];
  seciliEtiket?: string;
  seciliTeknoloji?: string;
};

/** Seçili değerlere göre adres üretir; `undefined` verilen parametre URL'e yazılmaz. */
export function filtreAdresi(secim: { etiket?: string; teknoloji?: string }): string {
  const parametreler = new URLSearchParams();
  if (secim.etiket) parametreler.set('etiket', secim.etiket);
  if (secim.teknoloji) parametreler.set('teknoloji', secim.teknoloji);
  const sorgu = parametreler.toString();
  return sorgu ? `/projeler?${sorgu}` : '/projeler';
}

function Cip({
  adres,
  secili,
  children,
}: {
  adres: string;
  secili: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={adres}
      /*
        `aria-current="true"`: seçili çip, listedeki geçerli görünümü işaret
        ediyor. Görsel durumu yalnızca renkle vermek yetmez (K5) — seçili çip
        ayrıca DOLU zemin ve kalın kenarla ayrışıyor.
      */
      aria-current={secili ? 'true' : undefined}
      className={cn(
        'focus-ring rounded-pill ease-brand duration-micro border px-3 py-1.5 text-sm transition-colors',
        secili
          ? 'bg-accent/15 text-accent-soft border-accent/40 font-medium'
          : 'border-line text-body hover:border-line-hover hover:text-primary',
      )}
    >
      {children}
    </Link>
  );
}

export function ProjeFiltre({
  etiketler,
  teknolojiler,
  seciliEtiket,
  seciliTeknoloji,
}: FiltreProps) {
  if (etiketler.length === 0 && teknolojiler.length === 0) return null;

  return (
    <div className="flex flex-col gap-4">
      {etiketler.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-muted w-20 shrink-0 text-xs tracking-wider uppercase">Etiket</span>

          <Cip adres={filtreAdresi({ teknoloji: seciliTeknoloji })} secili={!seciliEtiket}>
            Tümü
          </Cip>

          {etiketler.map((etiket) => (
            <Cip
              key={etiket}
              adres={filtreAdresi({ etiket, teknoloji: seciliTeknoloji })}
              secili={seciliEtiket === etiket}
            >
              {etiket}
            </Cip>
          ))}
        </div>
      )}

      {teknolojiler.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-muted w-20 shrink-0 text-xs tracking-wider uppercase">
            Teknoloji
          </span>

          <Cip adres={filtreAdresi({ etiket: seciliEtiket })} secili={!seciliTeknoloji}>
            Tümü
          </Cip>

          {teknolojiler.map((teknoloji) => (
            <Cip
              key={teknoloji}
              adres={filtreAdresi({ etiket: seciliEtiket, teknoloji })}
              secili={seciliTeknoloji === teknoloji}
            >
              {teknoloji}
            </Cip>
          ))}
        </div>
      )}
    </div>
  );
}
