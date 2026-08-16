'use client';

/*
 * İSTEMCİ BİLEŞENİ OLARAK KALDI — T-023'te sunucuya alındı, ÖLÇÜLDÜ, geri alındı.
 *
 * Beklenti: `'use client'` kalkarsa bölümün işaretlemesi istemci paketinden
 * çıkar. Derleme çıktısı bunu doğruladı bile: ana sayfa parçası 11.5 kB →
 * 3.39 kB, ilk yük 127 kB → 118 kB.
 *
 * GERÇEK ÖLÇÜM TERSİNİ SÖYLEDİ (Lighthouse mobil, her kol için 3 koşu, medyan;
 * her koşudan önce `.next` silinip sunucu yeniden ayağa kaldırıldı):
 *
 *   | Bölümler | belge | FCP    | LCP     | performans |
 *   | -------- | ----- | ------ | ------- | ---------- |
 *   | istemci  | 11 kB | 758 ms | 3312 ms | 92/91/92   |
 *   | sunucu   | 19 kB | 909 ms | 3556 ms | 91/91/89   |
 *
 * SEBEP: bölüm sunucuda render edilince RSC yükü BELGEYE SATIR İÇİ giriyor —
 * aynı içerik hem HTML hem flight verisi olarak iki kez. Belge 8 kB büyüyor ve
 * Slow 4G'de bu, ilk boyamayı doğrudan geciktiriyor. "First Load JS" sayısı
 * düşerken kullanıcının gördüğü an gecikiyor; derleme çıktısındaki sayı burada
 * yanıltıcı bir vekil.
 *
 * §7'nin "varsayılan Sunucu Bileşeni" kuralı hâlâ doğru; bu altı bölüm, uçtan
 * uca istemci bileşenlerinden (React Bits sarmalayıcıları, `BolumGiris`) oluşan
 * bir ağacın kökü oldukları için ölçüme dayalı istisna. Yeniden denenecekse
 * yukarıdaki tablo yeniden üretilmeli — sayısız değil, sayıyla tartışılsın.
 */

import { BolumGiris } from '@/components/public/bolum-giris';
import { SpotlightCard } from '@/components/reactbits/lazy';
import { EmptyState } from '@/components/ui/empty-state';
import type { SkillDto } from '@/server/services/content-dto';
import { SkillCategory } from '@/types';

export type YeteneklerProps = {
  /** ADR-026 sözleşmesi. Gruplama `category` alanına göre yapılır. */
  yetenekler: SkillDto[];
};

/**
 * Kategori → görünen başlık. `SkillCategory` Backend'in enum'u (§7.3);
 * burada yalnızca TÜRKÇE KARŞILIĞI tanımlanıyor, yeni bir kavram değil.
 * Sıra da buradan gelir — `Object.keys` sırası şablonun sırasıdır.
 */
const KATEGORI_BASLIK: Record<SkillCategory, string> = {
  [SkillCategory.FRONTEND]: 'Frontend',
  [SkillCategory.BACKEND]: 'Backend',
  [SkillCategory.DATABASE]: 'Veritabanı',
  [SkillCategory.DEVOPS]: 'Altyapı',
  [SkillCategory.MOBILE]: 'Mobil',
  [SkillCategory.DESIGN]: 'Tasarım',
  [SkillCategory.TOOLING]: 'Araçlar',
  [SkillCategory.SOFT_SKILL]: 'Çalışma biçimi',
  [SkillCategory.OTHER]: 'Diğer',
};

/** Kategoriye göre gruplar; `order` alanına saygı duyar, boş grubu atlar. */
function grupla(yetenekler: SkillDto[]) {
  const sirali = [...yetenekler].sort((a, b) => a.order - b.order);

  return (Object.keys(KATEGORI_BASLIK) as SkillCategory[])
    .map((kategori) => ({
      kategori,
      baslik: KATEGORI_BASLIK[kategori],
      uyeler: sirali.filter((y) => y.category === kategori),
    }))
    .filter((grup) => grup.uyeler.length > 0);
}

/**
 * "Yetenekler" bölümü — §4.1.
 *
 * Kartlar `SpotlightCard` (§5.1): hover'da imleci takip eden mor ışık.
 * İşaretçisi olmayan cihazda ve hareket tercihi kapalıyken kart sabit kalır —
 * bileşen kendi içinde hover'a bağlı, kendiliğinden hareket etmiyor.
 *
 * SEVİYE YÜZDESİ GÖSTERİLMİYOR: `Skill.level` alanı şemada var ama "React %87"
 * gibi uydurma bir kesinlik güven kaybettirir. Seviye ayrımı `/hakkimda`
 * sayfasında gruplama olarak kullanılabilir (T-000 kararı).
 */
export function Yetenekler({ yetenekler }: YeteneklerProps) {
  const gruplar = grupla(yetenekler);
  return (
    <section id="yetenekler" aria-labelledby="yetenekler-baslik" className="scroll-mt-20">
      <div className="mx-auto max-w-6xl px-4 py-16 md:py-24">
        <BolumGiris className="flex flex-col gap-3">
          <p className="tabular text-accent-soft text-xs tracking-wider uppercase">
            03 — Yetenekler
          </p>
          <h2 id="yetenekler-baslik" className="text-3xl md:text-4xl">
            Neyle çalışıyorum
          </h2>
        </BolumGiris>

        {gruplar.length === 0 ? (
          <EmptyState
            className="mt-8"
            title="Yetenekler henüz eklenmedi"
            description="Panelden yetenek eklendiğinde bu bölüm otomatik dolar."
          />
        ) : (
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {gruplar.map((grup, sira) => (
              <BolumGiris key={grup.kategori} gecikme={sira * 0.06}>
                <SpotlightCard className="h-full">
                  <h3 className="text-primary mb-3 text-base font-semibold">{grup.baslik}</h3>
                  <ul className="flex flex-wrap gap-2">
                    {grup.uyeler.map((yetenek) => (
                      <li
                        key={yetenek.id}
                        className="border-line bg-elevated text-body rounded-pill border px-2.5 py-0.5 text-xs"
                      >
                        {yetenek.name}
                      </li>
                    ))}
                  </ul>
                </SpotlightCard>
              </BolumGiris>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
