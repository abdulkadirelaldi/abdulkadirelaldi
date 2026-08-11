import { DatabaseBackup, KeyRound, Palette, ScrollText, ShieldCheck } from 'lucide-react';
import type { Metadata } from 'next';

import { SettingsSection } from '@/components/panel/settings-section';
import { Topbar } from '@/components/panel/topbar';
import { ThemeToggle } from '@/components/ui/theme-toggle';

export const metadata: Metadata = {
  title: 'Ayarlar',
  robots: { index: false, follow: false, nocache: true },
};

/**
 * §4.2 — `/panel/ayarlar`: şifre, 2FA, tema, yedek durumu, denetim kaydı.
 *
 * Beş bölümün ikisi bugün çalışıyor (2FA ekranı ve tema anahtarı); üçü henüz
 * yok ve AÇIKÇA "Yakında" olarak işaretli. Ölü bağlantı bırakılmadı — sidebar'daki
 * "Ayarlar" bağlantısının bu görevden önce 404 vermesi tam olarak bu sınıf bir
 * hataydı (T-036 / ENGEL-3).
 */
export default function AyarlarPage() {
  return (
    <>
      <Topbar title="Ayarlar" />

      <main id="panel-icerik" className="flex-1 p-4 lg:p-6">
        <div className="flex max-w-3xl flex-col gap-6">
          <p className="text-muted max-w-2xl text-sm">
            Hesap güvenliği, görünüm ve sistem durumu. Bu sayfadaki her değişiklik denetim kaydına
            yazılır.
          </p>

          <div className="flex flex-col gap-3">
            <SettingsSection
              icon={KeyRound}
              baslik="Şifre"
              aciklama="Panel şifreni değiştir. Mevcut şifren sorulur, yeni şifre en az 12 karakter olmalıdır."
            />

            <SettingsSection
              icon={ShieldCheck}
              baslik="İki adımlı doğrulama"
              aciklama="Girişte telefonundaki uygulamadan kod iste. Kurtarma kodlarını buradan yönetirsin."
              href="/panel/ayarlar/guvenlik"
            />

            <SettingsSection
              icon={Palette}
              baslik="Tema"
              aciklama="Koyu, aydınlık ya da sistem tercihini izle. Seçimin cookie'de tutulur ve tüm cihazlarda değil, bu tarayıcıda geçerlidir."
              eylem={<ThemeToggle />}
            />

            <SettingsSection
              icon={DatabaseBackup}
              baslik="Yedek durumu"
              aciklama="Son gece yedeğinin zamanı, boyutu ve bütünlük doğrulaması. Geri yükleme prosedürü ayrıca belgelenir."
            />

            <SettingsSection
              icon={ScrollText}
              baslik="Denetim kaydı"
              aciklama="Panelde yapılan her değişikliğin kaydı: ne, ne zaman, hangi IP'den."
            />
          </div>
        </div>
      </main>
    </>
  );
}
