import Link from 'next/link';

import { KapakGorsel } from '@/components/public/kapak-gorsel';
import { Badge } from '@/components/ui/badge';
import type { ProjectListItemDto } from '@/server/services/content-dto';

/**
 * Proje kartı — /projeler listesi.
 *
 * SUNUCU BİLEŞENİ ve ana sayfadaki karttan AYRI. Ana sayfa kartı `TiltedCard`
 * (3B eğim, imleç gerektiriyor, masaüstünde tembel yükleniyor) — bir vitrin
 * öğesi. Burası KATALOG: onlarca kart olabilir, hepsine efekt bağlamak §5.2'nin
 * "sayfa başına efekt bütçesi" mantığına aykırı olurdu. Kapak kalıbı ise ORTAK:
 * ikisi de `KapakGorsel` kullanıyor, ikinci bir kapak yolu açılmadı (ADR-018).
 *
 * Bağlantı BAŞLIĞIN üstünde: kartın tamamını tıklanabilir bir kutu yapmak
 * klavye ve ekran okuyucu için bozuk olur, metin seçmeyi de engellerdi.
 */
export function ProjeKarti({
  proje,
  baslikEtiketi: Baslik = 'h2',
}: {
  proje: ProjectListItemDto;
  /**
   * Kart başlığının seviyesi — çağıranın belirlemesi ŞART.
   *
   * ÖLÇÜMDE YAKALANDI: kart sabit `<h3>` üretiyordu ve /projeler'de sayfa
   * `h1 → h3` ile ilerliyordu; Lighthouse `heading-order` düştü (erişilebilirlik
   * 98). Liste sayfasında kartların üstünde ara başlık YOK, yani doğru seviye
   * `h2`. Kartlar ileride bir bölüm başlığının (`h2`) altına konursa çağıran
   * `h3` verir. Seviye içeriğin değil KONUMUN işlevi olduğu için burada
   * sabitlenemez.
   */
  baslikEtiketi?: 'h2' | 'h3';
}) {
  return (
    <article className="border-line bg-surface/50 rounded-card flex h-full flex-col overflow-hidden border">
      <KapakGorsel kapak={proje.cover} baslik={proje.title} />

      <div className="flex flex-1 flex-col gap-2 p-5">
        <Baslik className="text-lg">
          <Link
            href={`/projeler/${proje.slug}`}
            className="focus-ring hover:text-accent-soft ease-brand duration-micro rounded-btn transition-colors"
          >
            {proje.title}
          </Link>
        </Baslik>

        <p className="text-muted text-sm">{proje.summary}</p>

        {proje.stack.length > 0 && (
          <ul className="mt-auto flex flex-wrap gap-1.5 pt-3">
            {proje.stack.slice(0, 4).map((teknoloji) => (
              <li key={teknoloji}>
                <Badge variant="outline">{teknoloji}</Badge>
              </li>
            ))}
          </ul>
        )}
      </div>
    </article>
  );
}
