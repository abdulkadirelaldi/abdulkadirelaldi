-- ADR-058 — dükkân kaydı, paket sayacı, elle "acil" işareti (yalnızca EKLEME).

-- AlterTable
ALTER TABLE "gorev" ADD COLUMN "acil" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "dukkan" (
    "anahtar" TEXT NOT NULL,
    "driveUrl" TEXT,
    "not" TEXT,
    "paketReels" INTEGER,
    "paketPost" INTEGER,
    "paketStory" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "dukkan_pkey" PRIMARY KEY ("anahtar")
);

-- CreateTable
CREATE TABLE "paket_sayac" (
    "dukkanAnahtar" TEXT NOT NULL,
    "ay" TEXT NOT NULL,
    "reels" INTEGER NOT NULL DEFAULT 0,
    "post" INTEGER NOT NULL DEFAULT 0,
    "story" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "paket_sayac_pkey" PRIMARY KEY ("dukkanAnahtar","ay")
);

-- AddForeignKey
ALTER TABLE "paket_sayac" ADD CONSTRAINT "paket_sayac_dukkanAnahtar_fkey" FOREIGN KEY ("dukkanAnahtar") REFERENCES "dukkan"("anahtar") ON DELETE CASCADE ON UPDATE CASCADE;
