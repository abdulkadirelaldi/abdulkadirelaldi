-- 2026-10-31 — Cüzdan: kategori başına aylık bütçe. Yalnızca tablo EKLER.

-- CreateTable
CREATE TABLE "wallet_butce" (
    "kategori" TEXT NOT NULL,
    "limitTl" DECIMAL(12,2) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "wallet_butce_pkey" PRIMARY KEY ("kategori")
);
