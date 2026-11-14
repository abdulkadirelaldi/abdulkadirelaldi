-- 2026-11-14 — ADR-049: takvim katmanı (Kişisel · Okul · Kıyı Medya · Spectraloop). Eklemeli;
-- mevcut kayıtlar varsayılanla KISISEL olur.

-- CreateEnum
CREATE TYPE "TakvimKatman" AS ENUM ('KISISEL', 'OKUL', 'KIYI_MEDYA', 'SPECTRALOOP');

-- AlterTable
ALTER TABLE "takvim_etkinligi" ADD COLUMN     "katman" "TakvimKatman" NOT NULL DEFAULT 'KISISEL';

-- CreateIndex
CREATE INDEX "takvim_etkinligi_katman_idx" ON "takvim_etkinligi"("katman");
