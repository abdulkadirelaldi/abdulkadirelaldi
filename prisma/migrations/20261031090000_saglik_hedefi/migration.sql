-- 2026-10-31 — Sağlık hedefi (hedef kilo). Yalnızca tablo EKLER.

-- CreateTable
CREATE TABLE "saglik_hedefi" (
    "userId" TEXT NOT NULL,
    "hedefKg" DECIMAL(5,2) NOT NULL,
    "baslangicKg" DECIMAL(5,2),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "saglik_hedefi_pkey" PRIMARY KEY ("userId")
);
