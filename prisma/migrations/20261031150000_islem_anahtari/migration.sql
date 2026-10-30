-- 2026-10-31 — Hızlı kayıt tekrar önleme anahtarı. Yalnızca tablo EKLER.

-- CreateTable
CREATE TABLE "islem_anahtari" (
    "anahtar" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "islem_anahtari_pkey" PRIMARY KEY ("anahtar")
);

-- CreateIndex
CREATE INDEX "islem_anahtari_createdAt_idx" ON "islem_anahtari"("createdAt");
