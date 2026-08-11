/*
  Warnings:

  - You are about to drop the `health_check` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "ContentStatus" AS ENUM ('DRAFT', 'SCHEDULED', 'PUBLISHED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "ExperienceType" AS ENUM ('WORK', 'EDUCATION');

-- CreateEnum
CREATE TYPE "SkillCategory" AS ENUM ('FRONTEND', 'BACKEND', 'DATABASE', 'DEVOPS', 'MOBILE', 'DESIGN', 'TOOLING', 'SOFT_SKILL', 'OTHER');

-- CreateEnum
CREATE TYPE "JobStatus" AS ENUM ('LEAD', 'PROPOSAL', 'ACTIVE', 'DELIVERED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "TransactionType" AS ENUM ('INCOME', 'EXPENSE');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('CASH', 'BANK_TRANSFER', 'CREDIT_CARD', 'OTHER');

-- CreateEnum
CREATE TYPE "Currency" AS ENUM ('TRY', 'USD', 'EUR', 'GBP');

-- CreateEnum
CREATE TYPE "WorkoutType" AS ENUM ('GYM', 'CARDIO', 'KAYAK', 'OTHER');

-- CreateEnum
CREATE TYPE "MuscleGroup" AS ENUM ('CHEST', 'BACK', 'SHOULDERS', 'ARMS', 'LEGS', 'CORE', 'FULL_BODY', 'CARDIO', 'OTHER');

-- CreateEnum
CREATE TYPE "Equipment" AS ENUM ('BARBELL', 'DUMBBELL', 'MACHINE', 'CABLE', 'BODYWEIGHT', 'KETTLEBELL', 'BAND', 'OTHER');

-- CreateEnum
CREATE TYPE "GoalStatus" AS ENUM ('ACTIVE', 'PAUSED', 'ACHIEVED', 'ABANDONED');

-- CreateEnum
CREATE TYPE "GoalCategory" AS ENUM ('CAREER', 'FINANCE', 'HEALTH', 'FITNESS', 'LEARNING', 'PERSONAL', 'OTHER');

-- CreateEnum
CREATE TYPE "AuditAction" AS ENUM ('CREATE', 'UPDATE', 'DELETE', 'ARCHIVE', 'RESTORE', 'LOGIN', 'LOGIN_FAILED', 'LOGOUT', 'EXPORT');

-- CreateEnum
CREATE TYPE "AttachmentEntity" AS ENUM ('PROJECT', 'POST', 'PROFILE', 'TRANSACTION', 'JOB', 'CLIENT');

-- DropTable
DROP TABLE "health_check";

-- CreateTable
CREATE TABLE "user" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "lastLoginAt" TIMESTAMP(3),
    "lockedUntil" TIMESTAMP(3),
    "totpSecret" TEXT,
    "totpEnabled" BOOLEAN NOT NULL DEFAULT false,
    "totpConfirmedAt" TIMESTAMP(3),
    "totpBackupCodes" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "login_attempt" (
    "id" TEXT NOT NULL,
    "ip" TEXT NOT NULL,
    "emailHash" TEXT NOT NULL,
    "success" BOOLEAN NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "login_attempt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_log" (
    "id" TEXT NOT NULL,
    "actorId" TEXT,
    "actorEmailHash" TEXT,
    "action" "AuditAction" NOT NULL,
    "entity" TEXT NOT NULL,
    "entityId" TEXT,
    "diff" JSONB,
    "ip" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_log_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attachment" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "mime" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "checksum" TEXT NOT NULL,
    "width" INTEGER,
    "height" INTEGER,
    "entity" "AttachmentEntity" NOT NULL,
    "entityId" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "uploadedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "attachment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "profile" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "locale" TEXT NOT NULL DEFAULT 'tr',
    "headline" TEXT NOT NULL,
    "subtitle" TEXT,
    "bio" TEXT NOT NULL,
    "location" TEXT,
    "availability" TEXT,
    "socials" JSONB,
    "avatarAttachmentId" TEXT,
    "cvAttachmentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "profile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "skill" (
    "id" TEXT NOT NULL,
    "locale" TEXT NOT NULL DEFAULT 'tr',
    "name" TEXT NOT NULL,
    "category" "SkillCategory" NOT NULL,
    "level" INTEGER NOT NULL,
    "iconKey" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "skill_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project" (
    "id" TEXT NOT NULL,
    "locale" TEXT NOT NULL DEFAULT 'tr',
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "coverAttachmentId" TEXT,
    "tags" TEXT[],
    "stack" TEXT[],
    "liveUrl" TEXT,
    "repoUrl" TEXT,
    "clientName" TEXT,
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "order" INTEGER NOT NULL DEFAULT 0,
    "status" "ContentStatus" NOT NULL DEFAULT 'DRAFT',
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "project_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "post" (
    "id" TEXT NOT NULL,
    "locale" TEXT NOT NULL DEFAULT 'tr',
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "excerpt" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "coverAttachmentId" TEXT,
    "tags" TEXT[],
    "status" "ContentStatus" NOT NULL DEFAULT 'DRAFT',
    "publishedAt" TIMESTAMP(3),
    "readingMinutes" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "post_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "experience" (
    "id" TEXT NOT NULL,
    "locale" TEXT NOT NULL DEFAULT 'tr',
    "organization" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "type" "ExperienceType" NOT NULL,
    "startDate" DATE NOT NULL,
    "endDate" DATE,
    "current" BOOLEAN NOT NULL DEFAULT false,
    "description" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "experience_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "service" (
    "id" TEXT NOT NULL,
    "locale" TEXT NOT NULL DEFAULT 'tr',
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "iconKey" TEXT,
    "ctaUrl" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "service_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contact_message" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "subject" TEXT,
    "message" TEXT NOT NULL,
    "sourcePage" TEXT,
    "ip" TEXT,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "isSpam" BOOLEAN NOT NULL DEFAULT false,
    "repliedAt" TIMESTAMP(3),
    "archivedAt" TIMESTAMP(3),
    "honeypotHit" BOOLEAN NOT NULL DEFAULT false,
    "spamScore" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contact_message_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "client" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "company" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "notes" TEXT,
    "isKiyiMedya" BOOLEAN NOT NULL DEFAULT false,
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "client_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "job" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" "JobStatus" NOT NULL DEFAULT 'LEAD',
    "clientId" TEXT,
    "contactMessageId" TEXT,
    "startDate" DATE,
    "dueDate" DATE,
    "deliveredAt" TIMESTAMP(3),
    "agreedAmount" DECIMAL(12,2),
    "currency" "Currency" NOT NULL DEFAULT 'TRY',
    "fxRate" DECIMAL(18,8) NOT NULL DEFAULT 1.0,
    "baseAmount" DECIMAL(12,2),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "job_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transaction_category" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "TransactionType" NOT NULL,
    "color" TEXT,
    "icon" TEXT,
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "transaction_category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transaction" (
    "id" TEXT NOT NULL,
    "type" "TransactionType" NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "currency" "Currency" NOT NULL DEFAULT 'TRY',
    "fxRate" DECIMAL(18,8) NOT NULL DEFAULT 1.0,
    "baseAmount" DECIMAL(12,2) NOT NULL,
    "date" DATE NOT NULL,
    "categoryId" TEXT NOT NULL,
    "jobId" TEXT,
    "clientId" TEXT,
    "description" TEXT,
    "method" "PaymentMethod" NOT NULL DEFAULT 'BANK_TRANSFER',
    "isPaid" BOOLEAN NOT NULL DEFAULT true,
    "paidAt" TIMESTAMP(3),
    "invoiceNo" TEXT,
    "sourceRecurringId" TEXT,
    "periodKey" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "transaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recurring_transaction" (
    "id" TEXT NOT NULL,
    "type" "TransactionType" NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "currency" "Currency" NOT NULL DEFAULT 'TRY',
    "categoryId" TEXT NOT NULL,
    "description" TEXT,
    "method" "PaymentMethod" NOT NULL DEFAULT 'BANK_TRANSFER',
    "recurrenceRule" TEXT NOT NULL,
    "startDate" DATE NOT NULL,
    "endDate" DATE,
    "nextRunAt" TIMESTAMP(3),
    "lastGeneratedAt" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "recurring_transaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "health_log" (
    "id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "weightKg" DECIMAL(5,2),
    "bodyFatPct" DECIMAL(4,1),
    "sleepHours" DECIMAL(4,2),
    "waterMl" INTEGER,
    "restingHr" INTEGER,
    "steps" INTEGER,
    "mood" INTEGER,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "health_log_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "exercise" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "muscleGroup" "MuscleGroup" NOT NULL,
    "equipment" "Equipment" NOT NULL DEFAULT 'OTHER',
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "exercise_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workout" (
    "id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "type" "WorkoutType" NOT NULL DEFAULT 'GYM',
    "durationMin" INTEGER,
    "feeling" INTEGER,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "workout_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workout_set" (
    "id" TEXT NOT NULL,
    "workoutId" TEXT NOT NULL,
    "exerciseId" TEXT NOT NULL,
    "setNo" INTEGER NOT NULL,
    "reps" INTEGER NOT NULL,
    "weightKg" DECIMAL(6,2),
    "rpe" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "workout_set_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "personal_record" (
    "id" TEXT NOT NULL,
    "exerciseId" TEXT NOT NULL,
    "reps" INTEGER NOT NULL,
    "weightKg" DECIMAL(6,2) NOT NULL,
    "date" DATE NOT NULL,
    "workoutSetId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "personal_record_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "habit" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "targetPerWeek" INTEGER NOT NULL DEFAULT 7,
    "targetPerDay" INTEGER,
    "color" TEXT,
    "icon" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "habit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "habit_log" (
    "id" TEXT NOT NULL,
    "habitId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "habit_log_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "goal" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "category" "GoalCategory" NOT NULL DEFAULT 'PERSONAL',
    "targetDate" DATE,
    "progress" INTEGER NOT NULL DEFAULT 0,
    "status" "GoalStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "goal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "journal_entry" (
    "id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "title" TEXT,
    "content" TEXT NOT NULL,
    "mood" INTEGER,
    "tags" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "journal_entry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_email_key" ON "user"("email");

-- CreateIndex
CREATE INDEX "login_attempt_ip_createdAt_idx" ON "login_attempt"("ip", "createdAt");

-- CreateIndex
CREATE INDEX "login_attempt_emailHash_createdAt_idx" ON "login_attempt"("emailHash", "createdAt");

-- CreateIndex
CREATE INDEX "login_attempt_createdAt_idx" ON "login_attempt"("createdAt");

-- CreateIndex
CREATE INDEX "audit_log_entity_entityId_idx" ON "audit_log"("entity", "entityId");

-- CreateIndex
CREATE INDEX "audit_log_createdAt_idx" ON "audit_log"("createdAt");

-- CreateIndex
CREATE INDEX "audit_log_actorId_idx" ON "audit_log"("actorId");

-- CreateIndex
CREATE UNIQUE INDEX "attachment_key_key" ON "attachment"("key");

-- CreateIndex
CREATE INDEX "attachment_entity_entityId_order_idx" ON "attachment"("entity", "entityId", "order");

-- CreateIndex
CREATE INDEX "attachment_uploadedById_idx" ON "attachment"("uploadedById");

-- CreateIndex
CREATE UNIQUE INDEX "profile_locale_key" ON "profile"("locale");

-- CreateIndex
CREATE INDEX "skill_category_order_idx" ON "skill"("category", "order");

-- CreateIndex
CREATE UNIQUE INDEX "skill_name_locale_key" ON "skill"("name", "locale");

-- CreateIndex
CREATE INDEX "project_status_publishedAt_idx" ON "project"("status", "publishedAt");

-- CreateIndex
CREATE INDEX "project_featured_order_idx" ON "project"("featured", "order");

-- CreateIndex
CREATE UNIQUE INDEX "project_slug_locale_key" ON "project"("slug", "locale");

-- CreateIndex
CREATE INDEX "post_status_publishedAt_idx" ON "post"("status", "publishedAt");

-- CreateIndex
CREATE UNIQUE INDEX "post_slug_locale_key" ON "post"("slug", "locale");

-- CreateIndex
CREATE INDEX "experience_type_startDate_idx" ON "experience"("type", "startDate");

-- CreateIndex
CREATE INDEX "service_order_idx" ON "service"("order");

-- CreateIndex
CREATE INDEX "contact_message_isRead_createdAt_idx" ON "contact_message"("isRead", "createdAt");

-- CreateIndex
CREATE INDEX "contact_message_isSpam_createdAt_idx" ON "contact_message"("isSpam", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "client_email_key" ON "client"("email");

-- CreateIndex
CREATE INDEX "client_isArchived_name_idx" ON "client"("isArchived", "name");

-- CreateIndex
CREATE UNIQUE INDEX "job_contactMessageId_key" ON "job"("contactMessageId");

-- CreateIndex
CREATE INDEX "job_status_dueDate_idx" ON "job"("status", "dueDate");

-- CreateIndex
CREATE INDEX "job_clientId_idx" ON "job"("clientId");

-- CreateIndex
CREATE INDEX "transaction_category_type_isArchived_idx" ON "transaction_category"("type", "isArchived");

-- CreateIndex
CREATE UNIQUE INDEX "transaction_category_name_type_key" ON "transaction_category"("name", "type");

-- CreateIndex
CREATE INDEX "transaction_date_type_idx" ON "transaction"("date", "type");

-- CreateIndex
CREATE INDEX "transaction_jobId_idx" ON "transaction"("jobId");

-- CreateIndex
CREATE INDEX "transaction_categoryId_idx" ON "transaction"("categoryId");

-- CreateIndex
CREATE INDEX "transaction_clientId_idx" ON "transaction"("clientId");

-- CreateIndex
CREATE UNIQUE INDEX "transaction_sourceRecurringId_periodKey_key" ON "transaction"("sourceRecurringId", "periodKey");

-- CreateIndex
CREATE INDEX "recurring_transaction_isActive_nextRunAt_idx" ON "recurring_transaction"("isActive", "nextRunAt");

-- CreateIndex
CREATE UNIQUE INDEX "health_log_date_key" ON "health_log"("date");

-- CreateIndex
CREATE INDEX "health_log_date_idx" ON "health_log"("date");

-- CreateIndex
CREATE UNIQUE INDEX "exercise_name_key" ON "exercise"("name");

-- CreateIndex
CREATE INDEX "exercise_muscleGroup_isArchived_idx" ON "exercise"("muscleGroup", "isArchived");

-- CreateIndex
CREATE INDEX "workout_date_type_idx" ON "workout"("date", "type");

-- CreateIndex
CREATE INDEX "workout_set_exerciseId_idx" ON "workout_set"("exerciseId");

-- CreateIndex
CREATE UNIQUE INDEX "workout_set_workoutId_exerciseId_setNo_key" ON "workout_set"("workoutId", "exerciseId", "setNo");

-- CreateIndex
CREATE UNIQUE INDEX "personal_record_workoutSetId_key" ON "personal_record"("workoutSetId");

-- CreateIndex
CREATE INDEX "personal_record_exerciseId_date_idx" ON "personal_record"("exerciseId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "personal_record_exerciseId_reps_key" ON "personal_record"("exerciseId", "reps");

-- CreateIndex
CREATE INDEX "habit_isActive_isArchived_idx" ON "habit"("isActive", "isArchived");

-- CreateIndex
CREATE INDEX "habit_log_date_idx" ON "habit_log"("date");

-- CreateIndex
CREATE UNIQUE INDEX "habit_log_habitId_date_key" ON "habit_log"("habitId", "date");

-- CreateIndex
CREATE INDEX "goal_status_targetDate_idx" ON "goal"("status", "targetDate");

-- CreateIndex
CREATE INDEX "goal_category_idx" ON "goal"("category");

-- CreateIndex
CREATE INDEX "journal_entry_date_idx" ON "journal_entry"("date");

-- AddForeignKey
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attachment" ADD CONSTRAINT "attachment_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "profile" ADD CONSTRAINT "profile_avatarAttachmentId_fkey" FOREIGN KEY ("avatarAttachmentId") REFERENCES "attachment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "profile" ADD CONSTRAINT "profile_cvAttachmentId_fkey" FOREIGN KEY ("cvAttachmentId") REFERENCES "attachment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project" ADD CONSTRAINT "project_coverAttachmentId_fkey" FOREIGN KEY ("coverAttachmentId") REFERENCES "attachment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "post" ADD CONSTRAINT "post_coverAttachmentId_fkey" FOREIGN KEY ("coverAttachmentId") REFERENCES "attachment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job" ADD CONSTRAINT "job_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job" ADD CONSTRAINT "job_contactMessageId_fkey" FOREIGN KEY ("contactMessageId") REFERENCES "contact_message"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transaction" ADD CONSTRAINT "transaction_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "transaction_category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transaction" ADD CONSTRAINT "transaction_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "job"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transaction" ADD CONSTRAINT "transaction_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transaction" ADD CONSTRAINT "transaction_sourceRecurringId_fkey" FOREIGN KEY ("sourceRecurringId") REFERENCES "recurring_transaction"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recurring_transaction" ADD CONSTRAINT "recurring_transaction_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "transaction_category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workout_set" ADD CONSTRAINT "workout_set_workoutId_fkey" FOREIGN KEY ("workoutId") REFERENCES "workout"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workout_set" ADD CONSTRAINT "workout_set_exerciseId_fkey" FOREIGN KEY ("exerciseId") REFERENCES "exercise"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "personal_record" ADD CONSTRAINT "personal_record_exerciseId_fkey" FOREIGN KEY ("exerciseId") REFERENCES "exercise"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "personal_record" ADD CONSTRAINT "personal_record_workoutSetId_fkey" FOREIGN KEY ("workoutSetId") REFERENCES "workout_set"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "habit_log" ADD CONSTRAINT "habit_log_habitId_fkey" FOREIGN KEY ("habitId") REFERENCES "habit"("id") ON DELETE CASCADE ON UPDATE CASCADE;
