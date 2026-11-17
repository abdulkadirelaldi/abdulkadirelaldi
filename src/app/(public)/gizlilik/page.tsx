import type { Metadata } from 'next';
import Link from 'next/link';

import { SayfaBasligi } from '@/components/public/tasarim/sayfa-basligi';

export const metadata: Metadata = {
  title: 'Gizlilik',
  description: 'Bu sitenin hangi verileri, neden ve nasıl işlediği.',
};

const GUNCELLEME = '17 Kasım 2026';

/**
 * `/gizlilik` — gizlilik politikası (yalnızca Türkçe). Google OAuth izin ekranının istediği
 * adres de budur (ADR-051): paneldeki Google Takvim bağlantısının neyi okuyup yazdığı burada.
 */
export default function Page() {
  return (
    <>
      <SayfaBasligi
        baslik="Gizlilik"
        aciklama={`Bu site hangi verileri neden işliyor? Son güncelleme: ${GUNCELLEME}.`}
      />
      <section className="bg-surface border-line border-t">
        <div className="text-body mx-auto flex max-w-3xl flex-col gap-8 px-4 py-14 text-[0.9375rem] leading-relaxed md:px-8">
          <Bolum baslik="Kim">
            Bu site Abdulkadir Elaldı&apos;nın kişisel sitesidir (Samsun, Türkiye). Sorular ve silme
            talepleri için:{' '}
            <a href="mailto:elaldiabdulkadir1@gmail.com">elaldiabdulkadir1@gmail.com</a> ya da{' '}
            <Link href="/iletisim">iletişim formu</Link>.
          </Bolum>

          <Bolum baslik="Ziyaretçiler">
            Siteyi gezmek için hesap gerekmez. Reklam ya da üçüncü taraf takip çerezi kullanılmaz;
            yalnızca tema ve dil tercihi tarayıcında saklanır. Sunucu, güvenlik için istek
            kayıtlarını (IP, zaman, adres) kısa süre tutar.
          </Bolum>

          <Bolum baslik="İletişim formu">
            Formla gönderdiğin ad, e-posta ve mesaj yalnızca sana dönmek için saklanır, kimseyle
            paylaşılmaz ve istediğinde silinir.
          </Bolum>

          <Bolum baslik="Yönetim paneli ve Google Takvim">
            Sitenin yönetim paneli yalnızca site sahibinin kişisel kullanımı içindir. Panel,
            sahibinin izniyle kendi Google Takvim&apos;ine erişir (<code>calendar.events</code>{' '}
            kapsamı): yalnızca panelde oluşturduğu işleri takvimine etkinlik olarak yazar, günceller
            ve siler. Google verisi başka bir amaçla kullanılmaz, satılmaz, kimseyle paylaşılmaz ve
            yapay zekâ modellerinin eğitiminde kullanılmaz. Erişim anahtarı şifreli saklanır;
            bağlantı panelden ya da{' '}
            <a href="https://myaccount.google.com/permissions">Google hesap izinlerinden</a> her an
            kaldırılabilir, kaldırılınca anahtar silinir.
            <br />
            <br />
            Google API&apos;lerinden alınan bilgilerin kullanımı{' '}
            <a href="https://developers.google.com/terms/api-services-user-data-policy">
              Google API Services User Data Policy
            </a>
            &apos;ye, Sınırlı Kullanım (Limited Use) koşulları dahil, uyar.
          </Bolum>

          <Bolum baslik="Saklama ve güvenlik">
            Veriler Türkiye&apos;deki sunucuda, şifreli yedeklerle tutulur. Panel iki adımlı
            doğrulamayla korunur.
          </Bolum>
        </div>
      </section>
    </>
  );
}

function Bolum({ baslik, children }: { baslik: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-primary text-lg font-semibold">{baslik}</h2>
      <p className="[&_a]:text-accent [&_a]:underline">{children}</p>
    </section>
  );
}
