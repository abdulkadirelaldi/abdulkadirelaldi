-- 2026-11-01 — Ödemenin düştüğü hesap ve düzenli kalemin bitiş günü. Yalnızca sütun EKLER.

-- AlterTable
ALTER TABLE "wallet_debt_payment" ADD COLUMN "hesapId" TEXT;

-- AlterTable
ALTER TABLE "wallet_flow" ADD COLUMN "bitisGunu" DATE;
