import { SQL } from 'bun';

export async function runDatabaseMigrations(databaseUrl: string): Promise<boolean> {
  if (!databaseUrl || (databaseUrl.includes('localhost') && !process.env.RUN_LOCAL_MIGRATIONS)) {
    if (databaseUrl.includes('postgres:postgres@localhost')) {
      return false;
    }
  }

  try {
    const db = new SQL(databaseUrl);
    console.log('[SocialVerify DB Migration] Connected to PostgreSQL. Verifying schema...');

    const statements = [
      `CREATE TABLE IF NOT EXISTS "user" (
          "id" CHAR(24) PRIMARY KEY,
          "email" TEXT UNIQUE NOT NULL,
          "name" TEXT,
          "imageUrl" TEXT,
          "password" TEXT,
          "provider" TEXT NOT NULL,
          "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );`,
      `CREATE TABLE IF NOT EXISTS "conversation" (
          "id" CHAR(36) PRIMARY KEY,
          "userId" CHAR(24) NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
          "title" TEXT,
          "variant" TEXT NOT NULL DEFAULT 'chat',
          "startedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          "lastUpdated" TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );`,
      `CREATE TABLE IF NOT EXISTS "chat" (
          "id" CHAR(36) PRIMARY KEY,
          "conversationId" CHAR(36) NOT NULL REFERENCES "conversation"("id") ON DELETE CASCADE,
          "sender" TEXT NOT NULL,
          "type" TEXT NOT NULL DEFAULT 'text',
          "content" TEXT,
          "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );`,
      `CREATE INDEX IF NOT EXISTS "user_email_idx" ON "user"("email");`,
      `CREATE INDEX IF NOT EXISTS "user_createdAt_idx" ON "user"("createdAt");`,
      `CREATE INDEX IF NOT EXISTS "conversation_userId_idx" ON "conversation"("userId");`,
      `CREATE INDEX IF NOT EXISTS "conversation_lastUpdated_idx" ON "conversation"("lastUpdated");`,
      `CREATE INDEX IF NOT EXISTS "chat_conversationId_idx" ON "chat"("conversationId");`,
      `CREATE INDEX IF NOT EXISTS "chat_createdAt_idx" ON "chat"("createdAt");`,
      `CREATE INDEX IF NOT EXISTS "chat_sender_idx" ON "chat"("sender");`
    ];

    for (const statement of statements) {
      await db([statement] as any);
    }

    console.log('[SocialVerify DB Migration] PostgreSQL tables ("user", "conversation", "chat") verified and ready.');
    return true;
  } catch (err) {
    console.warn('[SocialVerify DB Migration] Notice: Schema sync warning (local fallback will remain available):', err);
    return false;
  }
}
