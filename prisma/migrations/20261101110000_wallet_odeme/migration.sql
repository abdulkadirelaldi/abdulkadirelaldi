-- 2026-11-01 — Aylık ödeme onayı. Yalnızca tablo EKLER.

-- CreateTable
CREATE TABLE "wallet_odeme" (
    "id" TEXT NOT NULL,
    "kaynakTur" TEXT NOT NULL,
    "kaynakId" TEXT NOT NULL,
    "donem" TEXT NOT NULL,
    "durum" TEXT NOT NULL,
    "hesapId" TEXT,
    "tutar" DECIMAL(12,2),
    "gun" DATE NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "wallet_odeme_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "wallet_odeme_kaynakTur_kaynakId_donem_key" ON "wallet_odeme"("kaynakTur", "kaynakId", "donem");
