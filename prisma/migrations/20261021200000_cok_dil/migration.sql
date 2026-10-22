-- AlterTable
ALTER TABLE "post" ADD COLUMN     "translationKey" TEXT;

-- AlterTable
ALTER TABLE "profile" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "project" ADD COLUMN     "translationKey" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "post_translationKey_locale_key" ON "post"("translationKey", "locale");

-- CreateIndex
CREATE UNIQUE INDEX "project_translationKey_locale_key" ON "project"("translationKey", "locale");
