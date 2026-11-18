-- ADR-056 — Claude bağlayıcısı: OAuth 2.1 (yalnızca EKLEME).

-- CreateEnum
CREATE TYPE "OAuthJetonTuru" AS ENUM ('ERISIM', 'YENILEME');

-- CreateTable
CREATE TABLE "oauth_istemci" (
    "id" TEXT NOT NULL,
    "ad" TEXT NOT NULL,
    "yonlendirmeler" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sonKullanim" TIMESTAMP(3),

    CONSTRAINT "oauth_istemci_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "oauth_kod" (
    "ozet" TEXT NOT NULL,
    "istemciId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "yonlendirme" TEXT NOT NULL,
    "kodSinami" TEXT NOT NULL,
    "kaynak" TEXT NOT NULL,
    "kapsam" TEXT NOT NULL,
    "bitis" TIMESTAMP(3) NOT NULL,
    "kullanildi" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "oauth_kod_pkey" PRIMARY KEY ("ozet")
);

-- CreateTable
CREATE TABLE "oauth_jeton" (
    "ozet" TEXT NOT NULL,
    "tur" "OAuthJetonTuru" NOT NULL,
    "istemciId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "kaynak" TEXT NOT NULL,
    "kapsam" TEXT NOT NULL,
    "aile" TEXT NOT NULL,
    "bitis" TIMESTAMP(3) NOT NULL,
    "iptal" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "oauth_jeton_pkey" PRIMARY KEY ("ozet")
);

-- CreateIndex
CREATE INDEX "oauth_kod_istemciId_idx" ON "oauth_kod"("istemciId");
CREATE INDEX "oauth_jeton_istemciId_idx" ON "oauth_jeton"("istemciId");
CREATE INDEX "oauth_jeton_aile_idx" ON "oauth_jeton"("aile");
CREATE INDEX "oauth_jeton_bitis_idx" ON "oauth_jeton"("bitis");

-- AddForeignKey
ALTER TABLE "oauth_kod" ADD CONSTRAINT "oauth_kod_istemciId_fkey" FOREIGN KEY ("istemciId") REFERENCES "oauth_istemci"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "oauth_jeton" ADD CONSTRAINT "oauth_jeton_istemciId_fkey" FOREIGN KEY ("istemciId") REFERENCES "oauth_istemci"("id") ON DELETE CASCADE ON UPDATE CASCADE;
