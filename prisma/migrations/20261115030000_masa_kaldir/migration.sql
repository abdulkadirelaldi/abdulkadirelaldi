-- 2026-11-15 — ADR-049 Masa GERİ ALINDI (sahibinin isteği): Masa tabloları, enum'ları ve takvim katmanı kaldırılır.
-- Masa'ya bağlı ek kayıtları önce silinir (canlıda 0).
DELETE FROM "attachment" WHERE "entity"::text = 'MASA_OGESI';
-- AlterEnum
BEGIN;
CREATE TYPE "AttachmentEntity_new" AS ENUM ('PROJECT', 'POST', 'PROFILE');
ALTER TABLE "attachment" ALTER COLUMN "entity" TYPE "AttachmentEntity_new" USING ("entity"::text::"AttachmentEntity_new");
ALTER TYPE "AttachmentEntity" RENAME TO "AttachmentEntity_old";
ALTER TYPE "AttachmentEntity_new" RENAME TO "AttachmentEntity";
DROP TYPE "AttachmentEntity_old";
COMMIT;

-- DropForeignKey
ALTER TABLE "raf" DROP CONSTRAINT "raf_dolapId_fkey";

-- DropForeignKey
ALTER TABLE "raf" DROP CONSTRAINT "raf_ustRafId_fkey";

-- DropForeignKey
ALTER TABLE "gorev" DROP CONSTRAINT "gorev_dolapId_fkey";

-- DropForeignKey
ALTER TABLE "gorev" DROP CONSTRAINT "gorev_rafId_fkey";

-- DropForeignKey
ALTER TABLE "masa_ogesi" DROP CONSTRAINT "masa_ogesi_dolapId_fkey";

-- DropForeignKey
ALTER TABLE "masa_ogesi" DROP CONSTRAINT "masa_ogesi_rafId_fkey";

-- DropIndex
DROP INDEX "takvim_etkinligi_katman_idx";

-- AlterTable
ALTER TABLE "takvim_etkinligi" DROP COLUMN "katman";

-- DropTable
DROP TABLE "dolap";

-- DropTable
DROP TABLE "raf";

-- DropTable
DROP TABLE "gorev";

-- DropTable
DROP TABLE "masa_ogesi";

-- DropTable
DROP TABLE "masa_koprusu";

-- DropEnum
DROP TYPE "TakvimKatman";

-- DropEnum
DROP TYPE "GorevDurumu";

-- DropEnum
DROP TYPE "GorevOnceligi";

-- DropEnum
DROP TYPE "GorevKaynagi";

-- DropEnum
DROP TYPE "MasaOgeTuru";

-- DropEnum
DROP TYPE "MasaOgeDurumu";

-- DropEnum
DROP TYPE "SesYaziDurumu";

