-- 2026-11-01 — Su hedefi ve hatırlatma saatleri kişisel. Varsayılanlar eski sabit
-- değerlerle aynı: ayara dokunulmazsa hiçbir davranış değişmez.

-- AlterTable
ALTER TABLE "bildirim_tercihi" ADD COLUMN     "aliskanlikSaati" INTEGER NOT NULL DEFAULT 21,
ADD COLUMN     "suHedefMl" INTEGER NOT NULL DEFAULT 3500,
ADD COLUMN     "suSaatleri" INTEGER[] DEFAULT ARRAY[11, 15, 18]::INTEGER[];
