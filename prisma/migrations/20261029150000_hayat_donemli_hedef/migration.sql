-- 2026-10-29 — Hayat: alışkanlık sırası, açık "yapmadım" işareti, dönemli hedefler.

-- CreateEnum
CREATE TYPE "GoalPeriod" AS ENUM ('WEEKLY', 'MONTHLY', 'YEARLY');

-- AlterTable
ALTER TABLE "goal" ADD COLUMN     "period" "GoalPeriod",
ADD COLUMN     "periodKey" TEXT;

-- AlterTable
ALTER TABLE "habit" ADD COLUMN     "order" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "habit_log" ADD COLUMN     "missed" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "goal_period_periodKey_idx" ON "goal"("period", "periodKey");

