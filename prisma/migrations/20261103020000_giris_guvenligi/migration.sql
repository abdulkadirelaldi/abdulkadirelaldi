-- 2026-11-02 — Giriş güvenliği. Son kabul edilen doğrulama kodunun özeti (aynı kod ikinci kez
-- kullanılamasın) ve meydan okumanın IP grubu (giriş seçenekleri IP başına sınırlansın).

-- AlterTable
ALTER TABLE "user" ADD COLUMN     "totpSonKod" TEXT,
ADD COLUMN     "totpSonZaman" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "webauthn_challenge" ADD COLUMN     "ip" TEXT;
