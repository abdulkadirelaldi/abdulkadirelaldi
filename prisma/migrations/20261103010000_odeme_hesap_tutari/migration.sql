-- 2026-11-02 — Dövizli borcu başka birimdeki hesaptan ödeme: hesaptan çıkan tutar saklanır,
-- ödeme silinince iade bu tutarla yapılır. Sık sorgular için dizinler.

-- AlterTable
ALTER TABLE "wallet_debt_payment" ADD COLUMN     "hesapTutar" DECIMAL(14,2);

-- CreateIndex
CREATE INDEX "wallet_debt_payment_date_idx" ON "wallet_debt_payment"("date");

-- CreateIndex
CREATE INDEX "wallet_odeme_donem_idx" ON "wallet_odeme"("donem");

-- CreateIndex
CREATE INDEX "bildirim_kaydi_gun_idx" ON "bildirim_kaydi"("gun");
