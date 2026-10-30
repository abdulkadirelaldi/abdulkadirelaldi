-- 2026-10-31 — Hata kaydı. Yalnızca tablo EKLER.

-- CreateTable
CREATE TABLE "hata_kaydi" (
    "id" TEXT NOT NULL,
    "imza" TEXT NOT NULL,
    "kaynak" TEXT NOT NULL,
    "ad" TEXT NOT NULL,
    "mesaj" TEXT NOT NULL,
    "yol" TEXT,
    "ayrinti" TEXT,
    "sayi" INTEGER NOT NULL DEFAULT 1,
    "ilk" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "son" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "hata_kaydi_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "hata_kaydi_imza_key" ON "hata_kaydi"("imza");

-- CreateIndex
CREATE INDEX "hata_kaydi_son_idx" ON "hata_kaydi"("son");
