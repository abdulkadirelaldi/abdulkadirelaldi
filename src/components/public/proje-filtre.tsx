import Link from 'next/link';

import { VARSAYILAN_DIL, type Dil } from '@/i18n/diller';
import { yolSorgulu } from '@/i18n/rotalar';

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
  dil: Dil;
  metin: { tumu: string; etiket: string; teknoloji: string };
};

/** Seçili değerlere göre adres üretir; `undefined` verilen parametre URL'e yazılmaz. */
export function filtreAdresi(
  secim: { etiket?: string; teknoloji?: string },
  dil: Dil = VARSAYILAN_DIL,
): string {
  // ADR-046: adres dile göre (`/en/projects?etiket=…`); sorgu anahtarları tek.
  return yolSorgulu(dil, 'projeler', { etiket: secim.etiket, teknoloji: secim.teknoloji });
}

/**
 * ADR-045 — süzgeç çipi. Seçili çip DOLU (açık zemin, koyu metin): durum
 * yalnızca renkle verilmiyor, zemin/kenar biçimi de değişiyor (K5).
 * Blog etiketleri de aynı sınıfları kullanıyor.
 */
export function cipSiniflari(secili: boolean) {
  return cn(
    'focus-ring rounded-pill ease-brand inline-flex h-9 items-center border px-4 text-[0.7rem] font-semibold tracking-[0.12em] uppercase transition-colors duration-300',
    secili
      ? 'bg-primary text-canvas border-primary'
      : 'border-line-hover text-body hover:border-primary hover:text-primary',
  );
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
      className={cipSiniflari(secili)}
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
  dil,
  metin,
}: FiltreProps) {
  if (etiketler.length === 0 && teknolojiler.length === 0) return null;

  return (
    <div className="flex flex-col gap-4">
      {etiketler.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="tabular text-muted w-24 shrink-0 text-xs">
            <span aria-hidden="true">--</span>
            {metin.etiket}
          </span>

          <Cip adres={filtreAdresi({ teknoloji: seciliTeknoloji }, dil)} secili={!seciliEtiket}>
            {metin.tumu}
          </Cip>

          {etiketler.map((etiket) => (
            <Cip
              key={etiket}
              adres={filtreAdresi({ etiket, teknoloji: seciliTeknoloji }, dil)}
              secili={seciliEtiket === etiket}
            >
              {etiket}
            </Cip>
          ))}
        </div>
      )}

      {teknolojiler.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="tabular text-muted w-24 shrink-0 text-xs">
            <span aria-hidden="true">--</span>
            {metin.teknoloji}
          </span>

          <Cip adres={filtreAdresi({ etiket: seciliEtiket }, dil)} secili={!seciliTeknoloji}>
            {metin.tumu}
          </Cip>

          {teknolojiler.map((teknoloji) => (
            <Cip
              key={teknoloji}
              adres={filtreAdresi({ etiket: seciliEtiket, teknoloji }, dil)}
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
