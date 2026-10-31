-- 2026-11-01 — iPhone Kısayollar sağlık bağlantısı. Yalnızca tablo EKLER.

-- CreateTable
CREATE TABLE "saglik_baglantisi" (
    "userId" TEXT NOT NULL,
    "anahtarOzeti" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sonKullanim" TIMESTAMP(3),

    CONSTRAINT "saglik_baglantisi_pkey" PRIMARY KEY ("userId")
);

-- CreateIndex
CREATE UNIQUE INDEX "saglik_baglantisi_anahtarOzeti_key" ON "saglik_baglantisi"("anahtarOzeti");
