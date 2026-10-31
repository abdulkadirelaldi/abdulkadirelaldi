-- 2026-11-01 — Günlük net varlık geçmişi. Yalnızca tablo EKLER.

-- CreateTable
CREATE TABLE "net_varlik_kaydi" (
    "gun" DATE NOT NULL,
    "varlikTl" DECIMAL(14,2) NOT NULL,
    "borcTl" DECIMAL(14,2) NOT NULL,
    "netTl" DECIMAL(14,2) NOT NULL,

    CONSTRAINT "net_varlik_kaydi_pkey" PRIMARY KEY ("gun")
);
