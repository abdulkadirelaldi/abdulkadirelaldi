-- 2026-11-15 — ADR-049 M6: Mac köprüsü (ses → yazı). Yeni tablo + öğeye eklemeli sütunlar.

-- CreateEnum
CREATE TYPE "SesYaziDurumu" AS ENUM ('SIRADA', 'ISLENIYOR', 'TAMAM', 'HATA');

-- AlterTable
ALTER TABLE "masa_ogesi" ADD COLUMN     "ozet" TEXT,
ADD COLUMN     "yaziBaslangic" TIMESTAMP(3),
ADD COLUMN     "yaziDurumu" "SesYaziDurumu",
ADD COLUMN     "yaziHata" TEXT;

-- CreateTable
CREATE TABLE "masa_koprusu" (
    "userId" TEXT NOT NULL,
    "anahtarOzeti" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sonKullanim" TIMESTAMP(3),

    CONSTRAINT "masa_koprusu_pkey" PRIMARY KEY ("userId")
);

-- CreateIndex
CREATE UNIQUE INDEX "masa_koprusu_anahtarOzeti_key" ON "masa_koprusu"("anahtarOzeti");

-- CreateIndex
CREATE INDEX "masa_ogesi_yaziDurumu_createdAt_idx" ON "masa_ogesi"("yaziDurumu", "createdAt");

