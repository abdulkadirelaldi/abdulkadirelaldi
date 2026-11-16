-- ADR-051 — Google Takvim eşitlemesi (yalnızca EKLEME).

-- AlterTable
ALTER TABLE "gorev" ADD COLUMN "googleEtkinlikId" TEXT,
ADD COLUMN "googleBekliyor" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "gorev_googleBekliyor_idx" ON "gorev"("googleBekliyor");

-- CreateTable
CREATE TABLE "google_baglantisi" (
    "userId" TEXT NOT NULL,
    "yenilemeJetonu" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sonEsitleme" TIMESTAMP(3),
    "sonHata" TEXT,

    CONSTRAINT "google_baglantisi_pkey" PRIMARY KEY ("userId")
);
