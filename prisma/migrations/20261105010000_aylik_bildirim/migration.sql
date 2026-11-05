-- 2026-11-05 — Aylık rapor bildirimi: ayın 1'i önceki ayın özeti, ayarlardan kapatılabilir.

-- AlterTable
ALTER TABLE "bildirim_tercihi" ADD COLUMN     "aylik" BOOLEAN NOT NULL DEFAULT true;
