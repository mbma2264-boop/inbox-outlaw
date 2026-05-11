import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { cookies } from 'next/headers';

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

function buildSessionUser(email: string): SessionUser {
  const normalizedEmail = normalizeEmail(email) || DEMO_EMAIL;
  return {
    id: createHash('sha256').update(normalizedEmail).digest('hex').slice(0, 24),
    email: normalizedEmail,
    isDemoUser: normalizedEmail === DEMO_EMAIL,
    createdAt: new Date().toISOString(),
    lastLoginAt: new Date().toISOString(),
  };
}

function encodeSession(email: string, expiresAt: string) {
  const payload = Buffer.from(JSON.stringify({ email: normalizeEmail(email), expiresAt, nonce: randomBytes(8).toString('hex') })).toString('base64url');
  const signature = createHash('sha256').update(payload).digest('hex');
  return `${payload}.${signature}`;
}

function decodeSession(token: string | undefined): { email: string; expiresAt: string } | null {
  if (!token || !token.includes('.')) return null;
  const [payload, signature] = token.split('.');
  const expectedSignature = createHash('sha256').update(payload).digest('hex');
  if (signature !== expectedSignature) return null;
  try {
    const parsed = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as { email?: string; expiresAt?: string };
    if (!parsed.email || !parsed.expiresAt) return null;
    if (new Date(parsed.expiresAt).getTime() <= Date.now()) return null;
    return { email: normalizeEmail(parsed.email), expiresAt: parsed.expiresAt };
  } catch {
    return null;
  }
}

export async function upsertUser(email: string) {
  return buildSessionUser(email);
}

export async function createSession(email: string) {
  const user = buildSessionUser(email);
  const expiresAt = new Date(Date.now() + SESSION_TTL_SECONDS * 1000).toISOString();
  const token = encodeSession(user.email, expiresAt);
  return { user, token, expiresAt, maxAge: SESSION_TTL_SECONDS };
}

export async function getSessionUser(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const session = decodeSession(cookieStore.get(SESSION_COOKIE)?.value);
  if (!session) return null;
  return buildSessionUser(session.email);
}

export async function requireSessionUser(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) throw new Error('UNAUTHENTICATED');
  return user;
}

export async function destroySession() {
  return;
}
