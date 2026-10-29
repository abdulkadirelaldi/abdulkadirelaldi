-- 2026-10-29 — İş, müşteri ve muhasebe modülleri panelden kaldırıldı.
-- İş yönetimi Kıyı Medya'nın kendi panelinde; muhasebenin yerini kişisel
-- "Cüzdan" alıyor (ayrı göç). Üretimde bu tablolar BOŞTU (2026-10-28 sayıldı:
-- job, client, transaction, recurring_transaction, transaction_category = 0;
-- eklenti tablosunda JOB/CLIENT/TRANSACTION türünde kayıt yok).

-- AlterEnum
BEGIN;
CREATE TYPE "AttachmentEntity_new" AS ENUM ('PROJECT', 'POST', 'PROFILE');
ALTER TABLE "attachment" ALTER COLUMN "entity" TYPE "AttachmentEntity_new" USING ("entity"::text::"AttachmentEntity_new");
ALTER TYPE "AttachmentEntity" RENAME TO "AttachmentEntity_old";
ALTER TYPE "AttachmentEntity_new" RENAME TO "AttachmentEntity";
DROP TYPE "public"."AttachmentEntity_old";
COMMIT;

-- DropForeignKey
ALTER TABLE "client" DROP CONSTRAINT "client_logoAttachmentId_fkey";

-- DropForeignKey
ALTER TABLE "job" DROP CONSTRAINT "job_clientId_fkey";

-- DropForeignKey
ALTER TABLE "job" DROP CONSTRAINT "job_contactMessageId_fkey";

-- DropForeignKey
ALTER TABLE "recurring_transaction" DROP CONSTRAINT "recurring_transaction_categoryId_fkey";

-- DropForeignKey
ALTER TABLE "transaction" DROP CONSTRAINT "transaction_categoryId_fkey";

-- DropForeignKey
ALTER TABLE "transaction" DROP CONSTRAINT "transaction_clientId_fkey";

-- DropForeignKey
ALTER TABLE "transaction" DROP CONSTRAINT "transaction_jobId_fkey";

-- DropForeignKey
ALTER TABLE "transaction" DROP CONSTRAINT "transaction_sourceRecurringId_fkey";

-- DropTable
DROP TABLE "client";

-- DropTable
DROP TABLE "job";

-- DropTable
DROP TABLE "recurring_transaction";

-- DropTable
DROP TABLE "transaction";

-- DropTable
DROP TABLE "transaction_category";

-- DropEnum
DROP TYPE "Currency";

-- DropEnum
DROP TYPE "JobStatus";

-- DropEnum
DROP TYPE "PaymentMethod";

-- DropEnum
DROP TYPE "TransactionType";

