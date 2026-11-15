-- 2026-11-15 — ADR-049 M2b: Masa öğeleri (not, dosya, ses kaydı). Yeni tablo + AttachmentEntity değeri; mevcut veriye dokunmaz.

-- CreateEnum
CREATE TYPE "MasaOgeTuru" AS ENUM ('NOT', 'DOSYA', 'SES');

-- CreateEnum
CREATE TYPE "MasaOgeDurumu" AS ENUM ('YUKLENIYOR', 'HAZIR');

-- AlterEnum
ALTER TYPE "AttachmentEntity" ADD VALUE 'MASA_OGESI';

-- CreateTable
CREATE TABLE "masa_ogesi" (
    "id" TEXT NOT NULL,
    "dolapId" TEXT NOT NULL,
    "rafId" TEXT,
    "tur" "MasaOgeTuru" NOT NULL,
    "baslik" TEXT NOT NULL,
    "metin" TEXT,
    "durum" "MasaOgeDurumu" NOT NULL DEFAULT 'HAZIR',
    "dosyaAdi" TEXT,
    "mime" TEXT,
    "boyut" INTEGER,
    "yuklemeKey" TEXT,
    "yuklemeId" TEXT,
    "parcalar" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "masa_ogesi_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "masa_ogesi_dolapId_rafId_idx" ON "masa_ogesi"("dolapId", "rafId");

-- CreateIndex
CREATE INDEX "masa_ogesi_rafId_idx" ON "masa_ogesi"("rafId");

-- CreateIndex
CREATE INDEX "masa_ogesi_durum_createdAt_idx" ON "masa_ogesi"("durum", "createdAt");

-- AddForeignKey
ALTER TABLE "masa_ogesi" ADD CONSTRAINT "masa_ogesi_dolapId_fkey" FOREIGN KEY ("dolapId") REFERENCES "dolap"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "masa_ogesi" ADD CONSTRAINT "masa_ogesi_rafId_fkey" FOREIGN KEY ("rafId") REFERENCES "raf"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

