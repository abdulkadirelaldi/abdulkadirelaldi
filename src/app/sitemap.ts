import type { MetadataRoute } from 'next';

import { DILLER, VARSAYILAN_DIL, type Dil } from '@/i18n/diller';
import { yol, type Sayfa } from '@/i18n/rotalar';
import {
  absoluteUrl,
  getPostSitemapEntries,
  getProjectSitemapEntries,
  type SitemapEntryDto,
} from '@/server/services';

/**
 * sitemap.xml — §4.1.
 *
 * YALNIZCA YAYINDAKİ İÇERİK. `getXSitemapEntries` servisleri `publishedWhere`
 * kullanır, dolayısıyla `DRAFT`, `SCHEDULED` ve ileri tarihli `PUBLISHED`
 * kayıtlar sızmaz.
 *
 * `ARCHIVED` DE YOK ve bu bilinçli: slug'ı korunuyor ama sayfa 410 dönüyor
 * (ADR-019). Sitemap "bu URL'yi tara" demektir; sunucunun aynı URL'de "kalıcı
 * olarak gitti" demesi çelişkili bir sinyaldir ve tarama bütçesini boşa harcar.
 *
 * Statik rotalar ELLE listeleniyor. Dosya sistemini taramak daha "akıllı"
 * görünürdü ama `(public)` altındaki her yeni dosyayı — hata sayfası, yükleme
 * durumu, panel parçaları — otomatik olarak sitemap'e sokma riski taşırdı.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ KURAL (§4.1) — BİR ROTA, YAYINA GİRDİĞİ TURDA EKLENİR. ÖNCEDEN DEĞİL.
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * BULGU-016: bu liste `/blog` ve `/iletisim` bildiriyordu, ama o rotalar henüz
 * yazılmamıştı (T-025/T-026). Var olmayan adres bildirmek arama motoruna KIRIK
 * BAĞLANTI sinyali verir ve tarama bütçesi harcar — sitemap kamuya yapılan bir
 * beyandır, niyet listesi değil. Aynı dürüstlük kuralı `NavItem.hazir` ve
 * "Yakında" kartlarında da geçerli.
 *
 * Bu, `ARCHIVED` içeriği dışarıda tutma gerekçesinin aynısı: orada sunucu 410
 * derken sitemap "tara" diyordu, burada sunucu 404 derken sitemap "tara" diyor.
 * İki yönlü tek kural: SİTEMAP YALNIZCA 200 DÖNEN ADRESLERİ BİLDİRİR.
 *
 * EKLEME SIRASI — rota yayına girdiğinde:
 *   T-025 → `/blog` + yazı akışı        ✅ AÇILDI (T-028d)
 *   T-026 → `/iletisim`, `/hizmetler`   ✅ AÇILDI (T-028e)
 *
 * `/hizmetler` bu listede ÖNCEDEN YOKTU — bekletilen bir satır değildi, hiç
 * yazılmamıştı. §4.1'de tanımlı üst düzey bir sayfa, kendine ait dizinlenebilir
 * içeriği var (hizmet listesi + §1.A/K4 ticari yönlendirme), menü ve alt
 * bilgiden bağlı ve 200 dönüyor — yani yukarıdaki tek kuralın her şartını
 * sağlıyor. Bildirilmemesi bir eksiklikti, bir karar değil.
 *
 * Kuralın ikinci yönü artık `seo.test.ts` ile de zorlanıyor: var olan bir
 * statik rota sitemap'te YOKSA da test kırılır. Bu turda `/hizmetler`in
 * unutulmuş olması, tek yönlü tuzağın böyle bir eksiği sessizce geçirdiğini
 * gösterdi.
 */
/**
 * İSTEK ZAMANINDA ÜRETİLİR — DERLEMEDE DEĞİL (BULGU-017).
 *
 * Bu satır olmadan Next bu rotayı ön-render eder ve `getProjectSitemapEntries`
 * DERLEME SIRASINDA veritabanına gider. Sonuç ölçüldü: `pnpm build` yalnızca
 * `DATABASE_URL` değil, ERİŞİLEBİLİR BİR VERİTABANI istiyordu — DB kapalıyken
 * `Can't reach database server` ile kırılıyordu. Derlemeyi çalışan bir altyapıya
 * bağlamak BULGU-002'nin nöbet tuttuğu tam durumdur.
 *
 * İkinci ve daha sinsi sorun: ön-render, içeriğin DERLEME ANINDAKİ hâlini
 * dondurur. Panelden yeni bir proje yayımlandığında sitemap yeniden dağıtım
 * yapılana kadar eski kalırdı — üstelik sessizce.
 *
 * ISR (`export const revalidate`) BU SORUNU ÇÖZMEZ: ÖLÇÜLDÜ — `revalidate = 3600`
 * ile de ilk sürüm derlemede üretiliyor ve build aynı hatayla kırılıyor.
 *
 * MALİYET DÜŞÜK: veri okuması `unstable_cache` ile önbellekli (ADR-011), yani
 * "her istekte üretilir" DEMEK "her istekte veritabanına gidilir" DEMEK DEĞİL.
 * İstek başına yapılan iş, önbellekten okunan listeyi XML'e çevirmektir.
 */
export const dynamic = 'force-dynamic';

type Siklik = NonNullable<MetadataRoute.Sitemap[number]['changeFrequency']>;

/**
 * Statik sayfalar — SAYFA ADIYLA, adres değil. Her dildeki adres `yol()`dan
 * (ADR-046: adres tablosu tek). `seo.test.ts` bu listeyi `sayfa: '…'`
 * satırlarından okuyup dosya sistemindeki rotalarla karşılaştırıyor.
 */
const STATIK: readonly { sayfa: Sayfa; siklik: Siklik; oncelik: number }[] = [
  { sayfa: 'anasayfa', siklik: 'weekly', oncelik: 1 },
  { sayfa: 'hakkimda', siklik: 'monthly', oncelik: 0.8 },
  { sayfa: 'projeler', siklik: 'weekly', oncelik: 0.9 },
  // Ticari niyetin girişi (§1.A/K4). İçeriği nadiren değişir ama önceliği
  // yüksek: aranıp bulunması İSTENEN sayfa bu.
  { sayfa: 'hizmetler', siklik: 'monthly', oncelik: 0.8 },
  { sayfa: 'cv', siklik: 'monthly', oncelik: 0.6 },
  { sayfa: 'blog', siklik: 'weekly', oncelik: 0.9 },
  // Dönüşümün son adımı; içeriği neredeyse hiç değişmez, aranarak değil
  // site içinden gelinir — bu yüzden düşük öncelik ve `yearly`.
  { sayfa: 'iletisim', siklik: 'yearly', oncelik: 0.5 },
];

/**
 * ADR-046 — hreflang kümesi: aynı içeriğin her dildeki mutlak adresi.
 * Google'ın sitemap biçimi: kümedeki HER adres kendi girdisini alır ve
 * kümenin tamamını (kendisi dahil) `alternates` olarak taşır.
 */
type Kume = Partial<Record<Dil, string>>;

function girdiler(
  kume: Kume,
  ortak: Omit<MetadataRoute.Sitemap[number], 'url' | 'alternates'>,
): MetadataRoute.Sitemap {
  const languages: Record<string, string> = { ...kume };
  if (kume[VARSAYILAN_DIL]) languages['x-default'] = kume[VARSAYILAN_DIL];
  return DILLER.flatMap((d) => {
    const url = kume[d];
    return url ? [{ ...ortak, url, alternates: { languages } }] : [];
  });
}

/**
 * Detay sayfaları: her dilin yayındaki kayıtları `translationKey` ile
 * kümelenir. Anahtarı olmayan kayıt tek dilli kendi kümesidir. Yalnızca
 * YAYINDAKİ kayıtlar kümeye girer — taslak çeviriye hreflang verilmez.
 */
function detaylar(sayfa: Sayfa, dilBasina: Record<Dil, SitemapEntryDto[]>): MetadataRoute.Sitemap {
  const kumeler = new Map<string, { kume: Kume; guncelleme: string }>();
  for (const d of DILLER) {
    for (const entry of dilBasina[d]) {
      const anahtar = entry.translationKey ?? `${d}:${entry.slug}`;
      const k = kumeler.get(anahtar) ?? { kume: {}, guncelleme: entry.updatedAt };
      k.kume[d] = absoluteUrl(yol(d, sayfa, entry.slug));
      if (entry.updatedAt > k.guncelleme) k.guncelleme = entry.updatedAt;
      kumeler.set(anahtar, k);
    }
  }
  return [...kumeler.values()].flatMap(({ kume, guncelleme }) =>
    girdiler(kume, {
      lastModified: new Date(guncelleme),
      changeFrequency: 'monthly',
      priority: 0.7,
    }),
  );
}

async function dilBasina(
  oku: (locale: string) => Promise<SitemapEntryDto[]>,
): Promise<Record<Dil, SitemapEntryDto[]>> {
  const listeler = await Promise.all(DILLER.map((d) => oku(d)));
  return Object.fromEntries(DILLER.map((d, i) => [d, listeler[i] ?? []])) as Record<
    Dil,
    SitemapEntryDto[]
  >;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [projects, posts] = await Promise.all([
    dilBasina(getProjectSitemapEntries),
    dilBasina(getPostSitemapEntries),
  ]);

  // Statik sayfalar her dilde VAR (arayüz sözlükten); içerik boşsa sayfa
  // kendi boş durumunu gösterir ve yine 200 döner.
  const statik = STATIK.flatMap(({ sayfa, siklik, oncelik }) =>
    girdiler(Object.fromEntries(DILLER.map((d) => [d, absoluteUrl(yol(d, sayfa))])) as Kume, {
      changeFrequency: siklik,
      priority: oncelik,
    }),
  );

  return [...statik, ...detaylar('projeler', projects), ...detaylar('blog', posts)];
}
