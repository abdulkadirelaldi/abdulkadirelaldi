-- 2026-11-01 — Tek seferlik kalemin hesabı ve hesaplar arası transfer. Yalnızca ekler;
-- mevcut kayıtlar hesapsız kalır, bakiyeler değişmez.

-- AlterTable
ALTER TABLE "wallet_flow" ADD COLUMN "hesapId" TEXT;

-- CreateTable
CREATE TABLE "wallet_transfer" (
    "id" TEXT NOT NULL,
    "kaynakId" TEXT NOT NULL,
    "hedefId" TEXT NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "gun" DATE NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "wallet_transfer_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "wallet_transfer_gun_idx" ON "wallet_transfer"("gun");
