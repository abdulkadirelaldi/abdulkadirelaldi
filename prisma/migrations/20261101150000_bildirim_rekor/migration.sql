-- 2026-11-01 — Rekor bildirimi tercihi. Yalnızca sütun EKLER.

-- AlterTable
ALTER TABLE "bildirim_tercihi" ADD COLUMN "rekor" BOOLEAN NOT NULL DEFAULT true;
