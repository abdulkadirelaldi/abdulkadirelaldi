-- 2026-11-06 — İngilizce serisi akşam hatırlatması; ayarlardan kapatılabilir.

-- AlterTable
ALTER TABLE "bildirim_tercihi" ADD COLUMN     "ingilizce" BOOLEAN NOT NULL DEFAULT true;

