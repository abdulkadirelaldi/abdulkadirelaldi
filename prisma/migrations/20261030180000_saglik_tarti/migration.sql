-- 2026-10-30 — Sağlık: akıllı tartı ölçümleri. Yalnızca boş olabilen sütun EKLER.

-- AlterTable
ALTER TABLE "health_log" ADD COLUMN     "bmi" DECIMAL(4,1),
ADD COLUMN     "bmrKcal" INTEGER,
ADD COLUMN     "boneKg" DECIMAL(4,2),
ADD COLUMN     "metabolicAge" INTEGER,
ADD COLUMN     "muscleKg" DECIMAL(5,2),
ADD COLUMN     "proteinPct" DECIMAL(4,1),
ADD COLUMN     "skeletalMusclePct" DECIMAL(4,1),
ADD COLUMN     "subcutaneousFatPct" DECIMAL(4,1),
ADD COLUMN     "visceralFat" DECIMAL(4,1),
ADD COLUMN     "waterPct" DECIMAL(4,1);

