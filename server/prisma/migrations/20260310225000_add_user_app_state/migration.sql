-- CreateTable
CREATE TABLE "UserAppState" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "planState" JSONB,
    "workoutLogs" JSONB,
    "restDays" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserAppState_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UserAppState_userId_key" ON "UserAppState"("userId");

-- CreateIndex
CREATE INDEX "UserAppState_userId_updatedAt_idx" ON "UserAppState"("userId", "updatedAt");

-- AddForeignKey
ALTER TABLE "UserAppState" ADD CONSTRAINT "UserAppState_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
