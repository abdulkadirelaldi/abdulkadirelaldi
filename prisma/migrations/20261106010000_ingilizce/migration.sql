-- 2026-11-06 — İngilizce: tamamlanan dersler ve günlük XP hedefi. Müfredat kodda.

-- CreateTable
CREATE TABLE "ingilizce_ders" (
    "id" TEXT NOT NULL,
    "dersId" TEXT NOT NULL,
    "gun" DATE NOT NULL,
    "xp" INTEGER NOT NULL,
    "hatalar" TEXT[],
    "dogrular" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ingilizce_ders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ingilizce_ayar" (
    "userId" TEXT NOT NULL,
    "gunlukHedefXp" INTEGER NOT NULL DEFAULT 20,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ingilizce_ayar_pkey" PRIMARY KEY ("userId")
);

-- CreateIndex
CREATE INDEX "ingilizce_ders_dersId_idx" ON "ingilizce_ders"("dersId");

-- CreateIndex
CREATE INDEX "ingilizce_ders_gun_idx" ON "ingilizce_ders"("gun");

