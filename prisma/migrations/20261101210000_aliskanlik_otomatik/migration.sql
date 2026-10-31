-- 2026-11-01 — Alışkanlığı kayıtlardan otomatik işaretleme. Sütun ekler; önerilen
-- listedeki iki alışkanlığa bağlar (yalnızca birebir aynı ad).

-- AlterTable
ALTER TABLE "habit" ADD COLUMN "otoKaynak" TEXT;

UPDATE "habit" SET "otoKaynak" = 'SPOR' WHERE "name" = 'Spor / egzersiz';
UPDATE "habit" SET "otoKaynak" = 'SU' WHERE "name" = 'Su iç (3,5 L)';
