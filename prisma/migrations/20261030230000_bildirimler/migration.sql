-- 2026-10-30 — Bildirimler: push aboneliği, tercih, gönderim kaydı. Yalnızca tablo EKLER.

-- CreateTable
CREATE TABLE "push_abonelik" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "p256dh" TEXT NOT NULL,
    "auth" TEXT NOT NULL,
    "cihaz" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "push_abonelik_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bildirim_tercihi" (
    "userId" TEXT NOT NULL,
    "borc" BOOLEAN NOT NULL DEFAULT true,
    "aliskanlik" BOOLEAN NOT NULL DEFAULT true,
    "su" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bildirim_tercihi_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "bildirim_kaydi" (
    "id" TEXT NOT NULL,
    "tur" TEXT NOT NULL,
    "anahtar" TEXT NOT NULL,
    "gun" DATE NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bildirim_kaydi_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "push_abonelik_endpoint_key" ON "push_abonelik"("endpoint");

-- CreateIndex
CREATE INDEX "push_abonelik_userId_idx" ON "push_abonelik"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "bildirim_kaydi_tur_anahtar_gun_key" ON "bildirim_kaydi"("tur", "anahtar", "gun");
