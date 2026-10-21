import { NextResponse, type NextRequest } from 'next/server';

import { dilMi } from '@/i18n/diller';
import { karsiliklar } from '@/i18n/karsiliklar';
import { cozumle, yol } from '@/i18n/rotalar';
import { getPostBySlug, getProjectBySlug } from '@/server/services';

/**
 * GET /api/v1/dil?hedef=en&yol=/projeler/x — ADR-046 dil seçicisi.
 *
 * NEDEN BİR UÇ NOKTA: liste sayfalarının karşılığı adres tablosundan
 * hesaplanır (`yol()`), ama bir proje/yazının ÖBÜR DİLDEKİ slug'ı yalnızca
 * veritabanında — `translationKey` üzerinden. Her sayfada bütün karşılıkları
 * önceden hesaplayıp navbar'a taşımak, ziyaretçilerin çoğunun hiç tıklamadığı
 * bir bağlantı için her istekte iki ek okuma demekti; burada yalnızca
 * tıklayan öder.
 *
 * AÇIK YÖNLENDİRME YOK: `yol` parametresi doğrudan hedef OLMAZ; yalnızca
 * `cozumle` ile bilinen bir public sayfaya çözümlenir ve hedef adres
 * `yol()` ile yeniden KURULUR. Bilinmeyen her girdi hedef dilin ana sayfasına.
 *
 * KARŞILIK YOKSA (çeviri henüz yok ya da yayında değil): hedef dilin LİSTE
 * sayfası — ziyaretçi 404 yerine o dildeki diğer içeriği görür.
 *
 * 307: karar içeriğe bağlı ve değişebilir (çeviri sonradan yayınlanabilir);
 * kalıcı yönlendirme tarayıcıda önbelleğe alınırdı.
 */
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest): Promise<NextResponse> {
  const params = request.nextUrl.searchParams;
  const hedefParam = params.get('hedef');
  const hedef = dilMi(hedefParam) ? hedefParam : 'tr';
  // GÖRELİ `Location` (RFC 9110 izin veriyor): mutlak adres kurmak için
  // `request.url`/`nextUrl` sunucunun bağlandığı kökeni (0.0.0.0) taşıyabiliyor
  // — ÖLÇÜLDÜ, `next start`. Göreli adres istemcinin kendi kökeninde çözülür.
  const yonlendir = (adres: string) =>
    new NextResponse(null, { status: 307, headers: { Location: adres } });

  const c = cozumle(params.get('yol') ?? '/');
  if (c.tur !== 'sayfa') return yonlendir(yol(hedef, 'anasayfa'));
  if (!c.slug || (c.sayfa !== 'projeler' && c.sayfa !== 'blog')) {
    return yonlendir(yol(hedef, c.sayfa));
  }

  const tur = c.sayfa === 'projeler' ? 'proje' : 'yazi';
  const sonuc =
    tur === 'proje' ? await getProjectBySlug(c.slug, c.dil) : await getPostBySlug(c.slug, c.dil);
  if (sonuc.state !== 'FOUND') return yonlendir(yol(hedef, c.sayfa));

  const eslesen = await karsiliklar(tur, sonuc.data.translationKey, { dil: c.dil, slug: c.slug });
  const slug = eslesen[hedef];
  return yonlendir(slug ? yol(hedef, c.sayfa, slug) : yol(hedef, c.sayfa));
}
