/*
  Warnings:

  - A unique constraint covering the columns `[username]` on the table `User` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "User" ADD COLUMN     "birthday" TIMESTAMP(3),
ADD COLUMN     "heightCm" DOUBLE PRECISION,
ADD COLUMN     "onboardingAnswers" JSONB,
ADD COLUMN     "onboardingCompleted" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "sex" TEXT,
ADD COLUMN     "username" TEXT,
ADD COLUMN     "weightKg" DOUBLE PRECISION;

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");
