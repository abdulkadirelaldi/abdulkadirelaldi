-- Projenin dönemi (serbest metin) ve ticari iş bayrağı — inceleme bulguları,
-- 2026-10-22. Yayın tarihi proje tarihi gibi gösteriliyordu; ticari olmayan
-- projelerde de ajans çağrısı çıkıyordu.
-- AlterTable
ALTER TABLE "project" ADD COLUMN     "commercial" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "period" TEXT;
