-- 2026-11-02 — Süreli alışkanlık ("Kitap oku, günde 30 dakika"). Süreli olanda `targetPerDay`
-- ve `habit_log.count` DAKİKA taşır; mevcut kayıtlar değişmez (`sureli` varsayılan kapalı).

-- AlterTable
ALTER TABLE "habit" ADD COLUMN     "sayacBaslangic" TIMESTAMP(3),
ADD COLUMN     "sureli" BOOLEAN NOT NULL DEFAULT false;
