-- ADR-050 — İşler: düz görev listesi (yalnızca EKLEME).

-- CreateEnum
CREATE TYPE "IsAlani" AS ENUM ('KIYI_MEDYA', 'OKUL', 'SPECTRALOOP', 'KISISEL');

-- CreateTable
CREATE TABLE "gorev" (
    "id" TEXT NOT NULL,
    "baslik" TEXT NOT NULL,
    "not" TEXT,
    "alan" "IsAlani" NOT NULL DEFAULT 'KISISEL',
    "etiket" TEXT,
    "teslimGun" DATE,
    "teslimDakika" INTEGER,
    "tamamlandiAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "gorev_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "gorev_tamamlandiAt_teslimGun_idx" ON "gorev"("tamamlandiAt", "teslimGun");

-- CreateIndex
CREATE INDEX "gorev_alan_idx" ON "gorev"("alan");
