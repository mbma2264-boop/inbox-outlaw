import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';

let database: DatabaseSync | null = null;

function resolveDatabasePath() {
  const connectionString = process.env.DATABASE_URL ?? 'file:./prisma/dev.db';
  const normalized = connectionString.replace(/^file:/, '');
  return path.isAbsolute(normalized)
    ? normalized
    : path.join(process.cwd(), normalized.replace(/^\.\//, ''));
}

function hasColumn(db: DatabaseSync, tableName: string, columnName: string) {
  const columns = db.prepare(`PRAGMA table_info('${tableName}')`).all() as Array<{ name: string }>;
  return columns.some((column) => column.name === columnName);
}

function ensureTableColumns(db: DatabaseSync, tableName: string, migrations: Array<[string, string]>) {
  for (const [columnName, sql] of migrations) {
    if (!hasColumn(db, tableName, columnName)) {
      db.exec(sql);
    }
  }
}

function ensureSchema(db: DatabaseSync) {
  db.exec(`
    PRAGMA journal_mode = WAL;

    CREATE TABLE IF NOT EXISTS UserAccount (
      id TEXT NOT NULL PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      displayName TEXT,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL,
      lastLoginAt TEXT
    );

    CREATE TABLE IF NOT EXISTS UserSession (
      id TEXT NOT NULL PRIMARY KEY,
      userId TEXT NOT NULL,
      sessionHash TEXT NOT NULL UNIQUE,
      createdAt TEXT NOT NULL,
      expiresAt TEXT NOT NULL,
      lastSeenAt TEXT NOT NULL,
      FOREIGN KEY(userId) REFERENCES UserAccount(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS EmailRecord (
      id TEXT NOT NULL PRIMARY KEY,
      ownerEmail TEXT NOT NULL DEFAULT 'anonymous@local.demo',
      gmailMessageId TEXT,
      threadId TEXT,
      source TEXT NOT NULL DEFAULT 'manual',
      senderName TEXT,
      senderEmail TEXT NOT NULL,
      subject TEXT NOT NULL,
      bodyText TEXT NOT NULL,
      category TEXT NOT NULL,
      riskScore INTEGER NOT NULL DEFAULT 0,
      confidenceScore INTEGER NOT NULL DEFAULT 0,
      recommendedAction TEXT,
      receivedAt TEXT,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS ActivityLog (
      id TEXT NOT NULL PRIMARY KEY,
      ownerEmail TEXT NOT NULL,
      type TEXT NOT NULL,
      message TEXT NOT NULL,
      metadataJson TEXT,
      createdAt TEXT NOT NULL
    );
  `);

  ensureTableColumns(db, 'EmailRecord', [
    ['ownerEmail', `ALTER TABLE EmailRecord ADD COLUMN ownerEmail TEXT NOT NULL DEFAULT 'anonymous@local.demo'`],
    ['gmailMessageId', `ALTER TABLE EmailRecord ADD COLUMN gmailMessageId TEXT`],
    ['threadId', `ALTER TABLE EmailRecord ADD COLUMN threadId TEXT`],
    ['source', `ALTER TABLE EmailRecord ADD COLUMN source TEXT NOT NULL DEFAULT 'manual'`],
    ['receivedAt', `ALTER TABLE EmailRecord ADD COLUMN receivedAt TEXT`],
  ]);

  db.exec(`
    CREATE INDEX IF NOT EXISTS UserAccount_email_idx ON UserAccount(email);
    CREATE INDEX IF NOT EXISTS UserSession_userId_idx ON UserSession(userId);
    CREATE INDEX IF NOT EXISTS UserSession_expiresAt_idx ON UserSession(expiresAt);
    CREATE INDEX IF NOT EXISTS EmailRecord_ownerEmail_idx ON EmailRecord(ownerEmail);
    CREATE INDEX IF NOT EXISTS EmailRecord_category_idx ON EmailRecord(category);
    CREATE INDEX IF NOT EXISTS EmailRecord_senderEmail_idx ON EmailRecord(senderEmail);
    CREATE INDEX IF NOT EXISTS EmailRecord_createdAt_idx ON EmailRecord(createdAt);
    CREATE UNIQUE INDEX IF NOT EXISTS EmailRecord_owner_gmailMessageId_idx ON EmailRecord(ownerEmail, gmailMessageId)
      WHERE gmailMessageId IS NOT NULL;
    CREATE INDEX IF NOT EXISTS ActivityLog_ownerEmail_idx ON ActivityLog(ownerEmail);
    CREATE INDEX IF NOT EXISTS ActivityLog_createdAt_idx ON ActivityLog(createdAt);
  `);
}

export function getDatabase() {
  if (database) {
    return database;
  }

  const dbPath = resolveDatabasePath();
  mkdirSync(path.dirname(dbPath), { recursive: true });
  database = new DatabaseSync(dbPath);
  ensureSchema(database);
  return database;
}
