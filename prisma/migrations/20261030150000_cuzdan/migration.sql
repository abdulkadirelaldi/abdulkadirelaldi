-- 2026-10-30 — Cüzdan: hesap, borç (+ödeme), gelir/gider akışı, son kur önbelleği.

-- CreateEnum
CREATE TYPE "WalletUnit" AS ENUM ('TRY', 'USD', 'EUR', 'GBP', 'GOLD_GRAM', 'GOLD_HAS', 'GOLD_QUARTER', 'GOLD_HALF', 'GOLD_FULL', 'GOLD_REPUBLIC', 'GOLD_ATA', 'GOLD_BANGLE_22', 'SILVER_GRAM');

-- CreateEnum
CREATE TYPE "WalletAccountKind" AS ENUM ('BANK', 'CASH', 'INVESTMENT', 'OTHER');

-- CreateEnum
CREATE TYPE "WalletFlowKind" AS ENUM ('INCOME', 'EXPENSE');

-- CreateEnum
CREATE TYPE "WalletFrequency" AS ENUM ('MONTHLY', 'WEEKLY', 'YEARLY', 'ONCE');

-- CreateTable
CREATE TABLE "wallet_account" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "kind" "WalletAccountKind" NOT NULL DEFAULT 'BANK',
    "unit" "WalletUnit" NOT NULL DEFAULT 'TRY',
    "balance" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "order" INTEGER NOT NULL DEFAULT 0,
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "wallet_account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wallet_debt" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "lender" TEXT,
    "unit" "WalletUnit" NOT NULL DEFAULT 'TRY',
    "totalAmount" DECIMAL(14,2) NOT NULL,
    "remainingAmount" DECIMAL(14,2) NOT NULL,
    "monthlyPayment" DECIMAL(14,2),
    "paymentDay" INTEGER,
    "endDate" DATE,
    "note" TEXT,
    "isClosed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "wallet_debt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wallet_debt_payment" (
    "id" TEXT NOT NULL,
    "debtId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "wallet_debt_payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wallet_flow" (
    "id" TEXT NOT NULL,
    "kind" "WalletFlowKind" NOT NULL,
    "name" TEXT NOT NULL,
    "counterparty" TEXT,
    "unit" "WalletUnit" NOT NULL DEFAULT 'TRY',
    "amount" DECIMAL(14,2) NOT NULL,
    "frequency" "WalletFrequency" NOT NULL DEFAULT 'MONTHLY',
    "day" INTEGER,
    "date" DATE,
    "category" TEXT,
    "note" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "wallet_flow_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "price_quote" (
    "unit" "WalletUnit" NOT NULL,
    "buying" DECIMAL(18,4) NOT NULL,
    "selling" DECIMAL(18,4) NOT NULL,
    "source" TEXT NOT NULL,
    "fetchedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "price_quote_pkey" PRIMARY KEY ("unit")
);

-- CreateIndex
CREATE INDEX "wallet_account_isArchived_order_idx" ON "wallet_account"("isArchived", "order");

-- CreateIndex
CREATE INDEX "wallet_debt_isClosed_idx" ON "wallet_debt"("isClosed");

-- CreateIndex
CREATE INDEX "wallet_debt_payment_debtId_date_idx" ON "wallet_debt_payment"("debtId", "date");

-- CreateIndex
CREATE INDEX "wallet_flow_kind_isActive_idx" ON "wallet_flow"("kind", "isActive");

-- AddForeignKey
ALTER TABLE "wallet_debt_payment" ADD CONSTRAINT "wallet_debt_payment_debtId_fkey" FOREIGN KEY ("debtId") REFERENCES "wallet_debt"("id") ON DELETE CASCADE ON UPDATE CASCADE;

