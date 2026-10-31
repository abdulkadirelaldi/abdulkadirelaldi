-- 2026-11-01 — Haftalık özet bildirimi tercihi. Yalnızca sütun EKLER.

-- AlterTable
ALTER TABLE "bildirim_tercihi" ADD COLUMN "haftalik" BOOLEAN NOT NULL DEFAULT true;
