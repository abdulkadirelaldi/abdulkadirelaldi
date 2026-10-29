-- 2026-10-30 — Spor: antrenman programı (gün + hareket), canlı oturum alanları, form ipucu.

-- AlterTable
ALTER TABLE "exercise" ADD COLUMN     "tip" TEXT;

-- AlterTable
ALTER TABLE "workout" ADD COLUMN     "finishedAt" TIMESTAMP(3),
ADD COLUMN     "kcal" INTEGER,
ADD COLUMN     "programDayId" TEXT,
ADD COLUMN     "startedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "program_day" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "focus" TEXT,
    "weekday" INTEGER,
    "order" INTEGER NOT NULL DEFAULT 0,
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "program_day_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "program_exercise" (
    "id" TEXT NOT NULL,
    "dayId" TEXT NOT NULL,
    "exerciseId" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "sets" INTEGER NOT NULL,
    "reps" TEXT NOT NULL,
    "restSec" INTEGER NOT NULL DEFAULT 90,

    CONSTRAINT "program_exercise_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "program_day_isArchived_order_idx" ON "program_day"("isArchived", "order");

-- CreateIndex
CREATE INDEX "program_exercise_dayId_order_idx" ON "program_exercise"("dayId", "order");

-- AddForeignKey
ALTER TABLE "workout" ADD CONSTRAINT "workout_programDayId_fkey" FOREIGN KEY ("programDayId") REFERENCES "program_day"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "program_exercise" ADD CONSTRAINT "program_exercise_dayId_fkey" FOREIGN KEY ("dayId") REFERENCES "program_day"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "program_exercise" ADD CONSTRAINT "program_exercise_exerciseId_fkey" FOREIGN KEY ("exerciseId") REFERENCES "exercise"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

