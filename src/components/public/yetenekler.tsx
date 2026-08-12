'use client';

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
