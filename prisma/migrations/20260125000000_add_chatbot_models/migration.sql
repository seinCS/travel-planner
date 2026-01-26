-- CreateTable: ChatSession
CREATE TABLE IF NOT EXISTS "ChatSession" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChatSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable: ChatMessage
CREATE TABLE IF NOT EXISTS "ChatMessage" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "places" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChatMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable: ChatUsage
CREATE TABLE IF NOT EXISTS "ChatUsage" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ChatUsage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex: ChatSession
CREATE UNIQUE INDEX IF NOT EXISTS "ChatSession_projectId_userId_key" ON "ChatSession"("projectId", "userId");
CREATE INDEX IF NOT EXISTS "ChatSession_projectId_idx" ON "ChatSession"("projectId");
CREATE INDEX IF NOT EXISTS "ChatSession_userId_idx" ON "ChatSession"("userId");

-- CreateIndex: ChatMessage
CREATE INDEX IF NOT EXISTS "ChatMessage_sessionId_idx" ON "ChatMessage"("sessionId");
CREATE INDEX IF NOT EXISTS "ChatMessage_createdAt_idx" ON "ChatMessage"("createdAt");

-- CreateIndex: ChatUsage
CREATE UNIQUE INDEX IF NOT EXISTS "ChatUsage_userId_date_key" ON "ChatUsage"("userId", "date");
CREATE INDEX IF NOT EXISTS "ChatUsage_userId_idx" ON "ChatUsage"("userId");
CREATE INDEX IF NOT EXISTS "ChatUsage_date_idx" ON "ChatUsage"("date");

-- AddForeignKey: ChatMessage -> ChatSession
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'ChatMessage_sessionId_fkey'
    ) THEN
        ALTER TABLE "ChatMessage" ADD CONSTRAINT "ChatMessage_sessionId_fkey"
        FOREIGN KEY ("sessionId") REFERENCES "ChatSession"("id")
        ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;
