-- AlterTable
ALTER TABLE "client" ADD COLUMN     "logoAttachmentId" TEXT,
ADD COLUMN     "showOnSite" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "client_showOnSite_isArchived_idx" ON "client"("showOnSite", "isArchived");

-- AddForeignKey
ALTER TABLE "client" ADD CONSTRAINT "client_logoAttachmentId_fkey" FOREIGN KEY ("logoAttachmentId") REFERENCES "attachment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
