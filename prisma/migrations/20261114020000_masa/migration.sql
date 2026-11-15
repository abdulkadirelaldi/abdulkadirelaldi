-- 2026-11-14 — ADR-049 M2: Masa (dolap, raf, görev). Yalnızca yeni tablolar; mevcut veriye dokunmaz.

-- CreateEnum
CREATE TYPE "GorevDurumu" AS ENUM ('YAPILACAK', 'SURUYOR', 'TAMAMLANDI');

-- CreateEnum
CREATE TYPE "GorevOnceligi" AS ENUM ('DUSUK', 'NORMAL', 'YUKSEK');

-- CreateEnum
CREATE TYPE "GorevKaynagi" AS ENUM ('ELLE', 'MAIL', 'CLAUDE');

-- CreateTable
CREATE TABLE "dolap" (
    "id" TEXT NOT NULL,
    "ad" TEXT NOT NULL,
    "emoji" TEXT NOT NULL DEFAULT '🗄️',
    "katman" "TakvimKatman" NOT NULL DEFAULT 'KISISEL',
    "sira" INTEGER NOT NULL DEFAULT 0,
    "arsivlendi" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "dolap_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "raf" (
    "id" TEXT NOT NULL,
    "dolapId" TEXT NOT NULL,
    "ustRafId" TEXT,
    "ad" TEXT NOT NULL,
    "sira" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "raf_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gorev" (
    "id" TEXT NOT NULL,
    "baslik" TEXT NOT NULL,
    "aciklama" TEXT,
    "dolapId" TEXT,
    "rafId" TEXT,
    "teslimGun" DATE,
    "teslimDakika" INTEGER,
    "durum" "GorevDurumu" NOT NULL DEFAULT 'YAPILACAK',
    "oncelik" "GorevOnceligi" NOT NULL DEFAULT 'NORMAL',
    "kaynak" "GorevKaynagi" NOT NULL DEFAULT 'ELLE',
    "tamamlandiAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "gorev_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "dolap_arsivlendi_sira_idx" ON "dolap"("arsivlendi", "sira");

-- CreateIndex
CREATE INDEX "raf_dolapId_ustRafId_sira_idx" ON "raf"("dolapId", "ustRafId", "sira");

-- CreateIndex
CREATE INDEX "raf_ustRafId_idx" ON "raf"("ustRafId");

-- CreateIndex
CREATE INDEX "gorev_durum_teslimGun_idx" ON "gorev"("durum", "teslimGun");

-- CreateIndex
CREATE INDEX "gorev_dolapId_idx" ON "gorev"("dolapId");

-- CreateIndex
CREATE INDEX "gorev_rafId_idx" ON "gorev"("rafId");

-- CreateIndex
CREATE INDEX "gorev_tamamlandiAt_idx" ON "gorev"("tamamlandiAt");

-- AddForeignKey
ALTER TABLE "raf" ADD CONSTRAINT "raf_dolapId_fkey" FOREIGN KEY ("dolapId") REFERENCES "dolap"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "raf" ADD CONSTRAINT "raf_ustRafId_fkey" FOREIGN KEY ("ustRafId") REFERENCES "raf"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gorev" ADD CONSTRAINT "gorev_dolapId_fkey" FOREIGN KEY ("dolapId") REFERENCES "dolap"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gorev" ADD CONSTRAINT "gorev_rafId_fkey" FOREIGN KEY ("rafId") REFERENCES "raf"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

