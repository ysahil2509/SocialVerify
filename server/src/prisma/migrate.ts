import { Client } from 'pg';
import fs from 'fs';
import path from 'path';

export async function runDatabaseMigrations(databaseUrl: string): Promise<boolean> {
  if (!databaseUrl || databaseUrl.includes('localhost') && !process.env.RUN_LOCAL_MIGRATIONS) {
    // If using default local dummy string and not forced
    if (databaseUrl.includes('postgres:postgres@localhost')) {
      return false;
    }
  }

  let client: Client | null = null;
  try {
    const isSsl = !databaseUrl.includes('sslmode=disable') && !databaseUrl.includes('localhost');
    client = new Client({
      connectionString: databaseUrl,
      ssl: isSsl ? { rejectUnauthorized: false } : false,
      connectionTimeoutMillis: 10000,
    });

    await client.connect();
    console.log('[SocialVerify DB Migration] Connected to PostgreSQL. Verifying schema...');

    const possiblePaths = [
      path.join(__dirname, 'init.sql'),
      path.join(process.cwd(), 'src', 'prisma', 'init.sql'),
      path.join(process.cwd(), 'dist', 'prisma', 'init.sql'),
      path.join(process.cwd(), 'server', 'src', 'prisma', 'init.sql'),
    ];

    let sqlContent: string | null = null;
    for (const p of possiblePaths) {
      if (fs.existsSync(p)) {
        sqlContent = fs.readFileSync(p, 'utf8');
        break;
      }
    }

    if (!sqlContent) {
      // Inline fallback schema if file is not found in bundled dist
      sqlContent = `
        CREATE TABLE IF NOT EXISTS "user" (
            "id" CHAR(24) PRIMARY KEY,
            "email" TEXT UNIQUE NOT NULL,
            "name" TEXT,
            "imageUrl" TEXT,
            "password" TEXT,
            "provider" TEXT NOT NULL,
            "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
        CREATE TABLE IF NOT EXISTS "conversation" (
            "id" CHAR(36) PRIMARY KEY,
            "userId" CHAR(24) NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
            "title" TEXT,
            "variant" TEXT NOT NULL DEFAULT 'chat',
            "startedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            "lastUpdated" TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
        CREATE TABLE IF NOT EXISTS "chat" (
            "id" CHAR(36) PRIMARY KEY,
            "conversationId" CHAR(36) NOT NULL REFERENCES "conversation"("id") ON DELETE CASCADE,
            "sender" TEXT NOT NULL,
            "type" TEXT NOT NULL DEFAULT 'text',
            "content" TEXT,
            "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
        CREATE INDEX IF NOT EXISTS "user_email_idx" ON "user"("email");
        CREATE INDEX IF NOT EXISTS "user_createdAt_idx" ON "user"("createdAt");
        CREATE INDEX IF NOT EXISTS "conversation_userId_idx" ON "conversation"("userId");
        CREATE INDEX IF NOT EXISTS "conversation_lastUpdated_idx" ON "conversation"("lastUpdated");
        CREATE INDEX IF NOT EXISTS "chat_conversationId_idx" ON "chat"("conversationId");
        CREATE INDEX IF NOT EXISTS "chat_createdAt_idx" ON "chat"("createdAt");
        CREATE INDEX IF NOT EXISTS "chat_sender_idx" ON "chat"("sender");
      `;
    }

    await client.query(sqlContent);
    console.log('[SocialVerify DB Migration] Database tables (user, conversation, chat) verified and ready.');
    return true;
  } catch (err) {
    console.warn('[SocialVerify DB Migration] Notice: Schema sync skipped or encountered an error:', err);
    return false;
  } finally {
    if (client) {
      try {
        await client.end();
      } catch {}
    }
  }
}
