-- CreateTable
CREATE TABLE "AiChatConversation" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "title" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AiChatConversation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiChatMessage" (
    "id" SERIAL NOT NULL,
    "conversationId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AiChatMessage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AiChatConversation_userId_updatedAt_idx" ON "AiChatConversation"("userId", "updatedAt");

-- CreateIndex
CREATE INDEX "AiChatMessage_conversationId_createdAt_idx" ON "AiChatMessage"("conversationId", "createdAt");

-- CreateIndex
CREATE INDEX "AiChatMessage_userId_createdAt_idx" ON "AiChatMessage"("userId", "createdAt");

-- AddForeignKey
ALTER TABLE "AiChatConversation" ADD CONSTRAINT "AiChatConversation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiChatMessage" ADD CONSTRAINT "AiChatMessage_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "AiChatConversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiChatMessage" ADD CONSTRAINT "AiChatMessage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
