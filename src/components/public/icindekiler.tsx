import { basligaSlug } from '@/components/public/baslik-slug';
import { cn } from '@/lib/utils/cn';

/**
 * İçindekiler — §4.1 (/blog detayı).
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ÜRETİM YÖNTEMİ
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Başlıklar MDX KAYNAĞINDAN, düz metin olarak ayrıştırılıyor; render edilmiş
 * ağaçtan toplanmıyor. Sebep: `Mdx` bileşeni MDX'i doğrudan React ağacına
 * derliyor, arada elle gezilebilecek bir ara yapı yok — ağaçtan toplamak için
 * ya ikinci bir derleme ya da render sırasında yan etkiyle toplama gerekirdi.
 * İkisi de aynı içeriği iki kez işlemek demek.
 *
 * Bağlantı hedefleri `basligaSlug` ile üretiliyor; `mdx.tsx`'in başlık
 * bileşenleri de `id`'yi AYNI fonksiyonla üretiyor. Tek kaynak, ayrışma yok.
 *
 * KOD BLOKLARI ATLANIYOR: ``` çitleri arasındaki satırlar sayılmıyor. Aksi
 * hâlde bir kod örneğindeki `# yorum` satırı içindekilerde başlık gibi görünür
 * ve hiçbir yere gitmeyen bir bağlantı üretirdi. (Seed'deki yazıda tam olarak
 * böyle bir kod bloğu var — ölçümle görüldü.)
 *
 * SEVİYE EŞLEMESİ `mdx.tsx` ile AYNI: kaynaktaki `#` ve `##` sayfada `<h2>`
 * olarak çiziliyor, `###` ise `<h3>`. İçindekiler de bu iki düzeyi gösteriyor;
 * `####` ve altı listeye girmiyor (derin başlık, gezinme değil ayrıntıdır).
 */

export type BaslikGirdisi = {
  seviye: 2 | 3;
  metin: string;
  slug: string;
};

/** ATX başlıklarını (`#`, `##`, `###`) çıkarır; çitli kod bloklarını atlar. */
export function basliklariCikar(kaynak: string): BaslikGirdisi[] {
  const girdiler: BaslikGirdisi[] = [];
  let kodBlogundayiz = false;

  for (const satir of kaynak.split('\n')) {
    /* ``` veya ~~~ — açılış/kapanış aynı işaretle. */
    if (/^\s*(```|~~~)/.test(satir)) {
      kodBlogundayiz = !kodBlogundayiz;
      continue;
    }
    if (kodBlogundayiz) continue;

    const eslesme = /^(#{1,3})\s+(.+?)\s*#*\s*$/.exec(satir);
    if (!eslesme) continue;

    const [, isaretler, ham] = eslesme;
    if (!isaretler || !ham) continue;

    /* Satır içi biçimlendirme temizleniyor: `**Not**` → `Not`. */
    const metin = ham
      .replace(/`([^`]*)`/g, '$1')
      .replace(/\*\*([^*]*)\*\*/g, '$1')
      .replace(/[*_]/g, '')
      .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
      .trim();

    if (!metin) continue;

    girdiler.push({
      /* `#` de `##` de sayfada <h2> — eşleme `mdx.tsx` ile birebir. */
      seviye: isaretler.length >= 3 ? 3 : 2,
      metin,
      slug: basligaSlug(metin),
    });
  }

  return girdiler;
}

/**
 * İki başlıktan azsa HİÇ render edilmez: tek maddelik bir içindekiler tablosu
 * gezinmeye yardım etmez, yalnızca yer kaplar.
 */
export function Icindekiler({ kaynak, className }: { kaynak: string; className?: string }) {
  const basliklar = basliklariCikar(kaynak);
  if (basliklar.length < 2) return null;

  return (
    <nav
      aria-labelledby="icindekiler-baslik"
      className={cn('border-line bg-surface/50 rounded-card border p-5', className)}
    >
      <h2 id="icindekiler-baslik" className="text-muted mb-3 text-xs tracking-wider uppercase">
        İçindekiler
      </h2>

      <ol className="flex flex-col gap-2">
        {basliklar.map((baslik) => (
          <li key={`${baslik.seviye}-${baslik.slug}`} className={baslik.seviye === 3 ? 'pl-4' : ''}>
            <a
              href={`#${baslik.slug}`}
              className="focus-ring text-body hover:text-accent-soft ease-brand duration-micro rounded-btn text-sm transition-colors"
            >
              {baslik.metin}
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}
