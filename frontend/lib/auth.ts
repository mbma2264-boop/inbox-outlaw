import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { cookies } from 'next/headers';
import { getDatabase } from './db';

export const DEMO_EMAIL = 'mbma2264@gmail.com';
export const SESSION_COOKIE = 'inbox_guardian_session';
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 14;

export type SessionUser = {
  id: string;
  email: string;
  isDemoUser: boolean;
  createdAt: string;
  lastLoginAt: string | null;
};

export function normalizeEmail(value: string | null | undefined) {
  return (value || '').trim().toLowerCase();
}

function hashSessionToken(token: string) {
  return createHash('sha256').update(token).digest('hex');
}

function buildUser(row: Record<string, unknown>): SessionUser {
  return {
    id: String(row.id),
    email: String(row.email),
    isDemoUser: String(row.email) === DEMO_EMAIL,
    createdAt: String(row.createdAt),
    lastLoginAt: row.lastLoginAt ? String(row.lastLoginAt) : null,
  };
}

export async function upsertUser(email: string) {
  const normalizedEmail = normalizeEmail(email);
  const db = getDatabase();
  const now = new Date().toISOString();
  const existing = db.prepare(`SELECT id, email, createdAt, lastLoginAt FROM UserAccount WHERE email = ?`).get(normalizedEmail) as Record<string, unknown> | undefined;

  if (existing) {
    db.prepare(`UPDATE UserAccount SET updatedAt = ?, lastLoginAt = ? WHERE email = ?`).run(now, now, normalizedEmail);
    const refreshed = db.prepare(`SELECT id, email, createdAt, lastLoginAt FROM UserAccount WHERE email = ?`).get(normalizedEmail) as Record<string, unknown>;
    return buildUser(refreshed);
  }

  const id = randomUUID();
  db.prepare(`
    INSERT INTO UserAccount (id, email, createdAt, updatedAt, lastLoginAt)
    VALUES (?, ?, ?, ?, ?)
  `).run(id, normalizedEmail, now, now, now);

  const created = db.prepare(`SELECT id, email, createdAt, lastLoginAt FROM UserAccount WHERE id = ?`).get(id) as Record<string, unknown>;
  return buildUser(created);
}

export async function createSession(email: string) {
  const user = await upsertUser(email);
  const db = getDatabase();
  const token = randomBytes(32).toString('hex');
  const now = new Date();
  const expiresAt = new Date(now.getTime() + SESSION_TTL_SECONDS * 1000).toISOString();
  const createdAt = now.toISOString();

  db.prepare(`DELETE FROM UserSession WHERE userId = ?`).run(user.id);
  db.prepare(`
    INSERT INTO UserSession (id, userId, sessionHash, createdAt, expiresAt, lastSeenAt)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(randomUUID(), user.id, hashSessionToken(token), createdAt, expiresAt, createdAt);

  return { user, token, expiresAt, maxAge: SESSION_TTL_SECONDS };
}

export async function getSessionUser(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(SESSION_COOKIE)?.value;
  if (!sessionToken) {
    return null;
  }

  const db = getDatabase();
  const now = new Date().toISOString();
  const row = db.prepare(`
    SELECT u.id, u.email, u.createdAt, u.lastLoginAt, s.id as sessionId
    FROM UserSession s
    INNER JOIN UserAccount u ON u.id = s.userId
    WHERE s.sessionHash = ? AND datetime(s.expiresAt) > datetime(?)
    LIMIT 1
  `).get(hashSessionToken(sessionToken), now) as Record<string, unknown> | undefined;

  if (!row) {
    return null;
  }

  db.prepare(`UPDATE UserSession SET lastSeenAt = ? WHERE id = ?`).run(now, String(row.sessionId));
  return buildUser(row);
}

export async function requireSessionUser(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) {
    throw new Error('UNAUTHENTICATED');
  }
  return user;
}

export async function destroySession() {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(SESSION_COOKIE)?.value;
  if (!sessionToken) {
    return;
  }

  const db = getDatabase();
  db.prepare(`DELETE FROM UserSession WHERE sessionHash = ?`).run(hashSessionToken(sessionToken));
}
