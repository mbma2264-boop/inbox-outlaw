import { randomBytes } from 'node:crypto';
import { cookies } from 'next/headers';
import type { ClassificationResult, EmailInput, GmailSyncMessage } from './types';

export const GMAIL_TOKEN_COOKIE = 'inbox_guardian_gmail_tokens';
export const GMAIL_STATE_COOKIE = 'inbox_guardian_gmail_state';

const GMAIL_SCOPES = ['https://www.googleapis.com/auth/gmail.readonly'];

type StoredTokens = {
  access_token?: string;
  refresh_token?: string;
  expires_at?: number;
  scope?: string;
};

type GmailMessageListResponse = {
  messages?: { id: string; threadId: string }[];
  nextPageToken?: string;
};

type GmailMessageResponse = {
  id: string;
  threadId?: string;
  internalDate?: string;
  payload?: {
    headers?: { name: string; value: string }[];
    body?: { data?: string };
    parts?: GmailMessageResponse['payload'][];
  };
  snippet?: string;
};

function requiredEnv() {
  return {
    clientId: process.env.GOOGLE_CLIENT_ID || process.env.GMAIL_CLIENT_ID || '',
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || process.env.GMAIL_CLIENT_SECRET || '',
  };
}

export function getMissingGmailEnv() {
  const env = requiredEnv();
  return [
    !env.clientId ? 'GOOGLE_CLIENT_ID' : null,
    !env.clientSecret ? 'GOOGLE_CLIENT_SECRET' : null,
  ].filter(Boolean) as string[];
}

function encodeCookie(value: unknown) {
  return Buffer.from(JSON.stringify(value)).toString('base64url');
}

function decodeCookie<T>(value: string | undefined): T | null {
  if (!value) return null;
  try {
    return JSON.parse(Buffer.from(value, 'base64url').toString('utf8')) as T;
  } catch {
    return null;
  }
}

export async function readStoredTokens() {
  const cookieStore = await cookies();
  return decodeCookie<StoredTokens>(cookieStore.get(GMAIL_TOKEN_COOKIE)?.value);
}

export async function writeStoredTokens(tokens: StoredTokens) {
  const cookieStore = await cookies();
  cookieStore.set(GMAIL_TOKEN_COOKIE, encodeCookie(tokens), {
    httpOnly: true,
    sameSite: 'lax',
    secure: true,
    path: '/',
    maxAge: 60 * 60 * 24 * 30,
  });
}

export async function clearStoredTokens() {
  const cookieStore = await cookies();
  cookieStore.delete(GMAIL_TOKEN_COOKIE);
}

export async function createGoogleAuthorizationUrl(origin: string, returnTo: string) {
  const { clientId } = requiredEnv();
  const state = randomBytes(18).toString('base64url');
  const cookieStore = await cookies();
  cookieStore.set(GMAIL_STATE_COOKIE, encodeCookie({ state, returnTo }), {
    httpOnly: true,
    sameSite: 'lax',
    secure: true,
    path: '/',
    maxAge: 10 * 60,
  });

  const url = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  url.searchParams.set('client_id', clientId);
  url.searchParams.set('redirect_uri', `${origin}/api/gmail/callback`);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('scope', GMAIL_SCOPES.join(' '));
  url.searchParams.set('access_type', 'offline');
  url.searchParams.set('prompt', 'consent');
  url.searchParams.set('state', state);
  return url.toString();
}

export async function handleGoogleCallback(origin: string, code: string, state: string) {
  const { clientId, clientSecret } = requiredEnv();
  const cookieStore = await cookies();
  const savedState = decodeCookie<{ state: string; returnTo: string }>(cookieStore.get(GMAIL_STATE_COOKIE)?.value);
  cookieStore.delete(GMAIL_STATE_COOKIE);
  if (!savedState || savedState.state !== state) throw new Error('Google sign-in state did not match. Please try connecting Gmail again.');

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      code,
      grant_type: 'authorization_code',
      redirect_uri: `${origin}/api/gmail/callback`,
    }),
    cache: 'no-store',
  });

  const payload = (await response.json().catch(() => null)) as (StoredTokens & { expires_in?: number; error_description?: string; error?: string }) | null;
  if (!response.ok || !payload?.access_token) throw new Error(payload?.error_description || payload?.error || `Google token request failed with ${response.status}.`);

  await writeStoredTokens({
    access_token: payload.access_token,
    refresh_token: payload.refresh_token,
    expires_at: Date.now() + Number(payload.expires_in ?? 3600) * 1000,
    scope: payload.scope,
  });

  return savedState.returnTo || `${origin}/dashboard`;
}

async function refreshAccessToken(tokens: StoredTokens) {
  if (tokens.access_token && tokens.expires_at && tokens.expires_at > Date.now() + 60_000) return tokens;
  if (!tokens.refresh_token) return tokens;
  const { clientId, clientSecret } = requiredEnv();
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: tokens.refresh_token,
      grant_type: 'refresh_token',
    }),
    cache: 'no-store',
  });
  const payload = (await response.json().catch(() => null)) as (StoredTokens & { expires_in?: number }) | null;
  if (!response.ok || !payload?.access_token) throw new Error(`Could not refresh Gmail access token. Reconnect Gmail.`);
  const updated = { ...tokens, access_token: payload.access_token, expires_at: Date.now() + Number(payload.expires_in ?? 3600) * 1000, scope: payload.scope || tokens.scope };
  await writeStoredTokens(updated);
  return updated;
}

export async function getValidAccessToken() {
  const tokens = await readStoredTokens();
  if (!tokens?.access_token && !tokens?.refresh_token) throw new Error('Gmail is not connected yet.');
  const valid = await refreshAccessToken(tokens);
  if (!valid.access_token) throw new Error('Gmail access token is missing. Reconnect Gmail.');
  return valid;
}

function decodeBase64Url(value: string | undefined) {
  if (!value) return '';
  return Buffer.from(value.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8');
}

function findTextPart(part: GmailMessageResponse['payload']): string {
  if (!part) return '';
  const bodyText = decodeBase64Url(part.body?.data);
  if (bodyText) return bodyText;
  for (const child of part.parts || []) {
    const found = findTextPart(child);
    if (found) return found;
  }
  return '';
}

function getHeader(message: GmailMessageResponse, headerName: string) {
  return message.payload?.headers?.find((header) => header.name.toLowerCase() === headerName.toLowerCase())?.value || '';
}

function parseSender(from: string) {
  const match = from.match(/^(.*?)\s*<([^>]+)>$/);
  if (!match) return { sender_name: null, sender_email: from || 'unknown@email.local' };
  return { sender_name: match[1].replace(/^"|"$/g, '').trim() || null, sender_email: match[2].trim() };
}

function extractLinks(text: string) {
  return Array.from(new Set((text.match(/https?:\/\/[^\s)]+/gi) || []).slice(0, 20)));
}

export function classifyEmail(email: EmailInput): ClassificationResult {
  const content = `${email.subject}\n${email.body_text}`.toLowerCase();
  const reasons: string[] = [];
  let risk = 10;

  const riskyTerms = [
    ['urgent', 15, 'Urgency language detected.'],
    ['verify', 10, 'Verification request detected.'],
    ['password', 15, 'Password/account language detected.'],
    ['gift card', 20, 'Gift card language detected.'],
    ['crypto', 20, 'Crypto language detected.'],
    ['wallet', 15, 'Wallet language detected.'],
    ['prize', 15, 'Prize/reward language detected.'],
    ['click here', 10, 'Click-through language detected.'],
    ['payment', 10, 'Payment language detected.'],
  ] as const;

  for (const [term, weight, reason] of riskyTerms) {
    if (content.includes(term)) {
      risk += weight;
      reasons.push(reason);
    }
  }

  if (email.links.length > 0) {
    risk += Math.min(20, email.links.length * 5);
    reasons.push('One or more links were found.');
  }
  if (!email.known_contact) risk += 10;

  risk = Math.max(0, Math.min(100, risk));
  const category = risk >= 70 ? 'Likely Scam' : risk >= 45 ? 'Promotion' : content.includes('opportunity') ? 'Opportunity' : 'Verified Business';
  const recommended_action = risk >= 70 ? 'Do not click links or reply until verified.' : risk >= 45 ? 'Review carefully before acting.' : 'Low risk. Keep for review.';

  return {
    category,
    risk_score: risk,
    confidence_score: 72,
    reasons: reasons.length ? reasons : ['No high-risk scam wording detected by the local classifier.'],
    matched_rules: reasons.map((reason, index) => ({ rule_id: `local_rule_${index + 1}`, weight: 10, reason })),
    recommended_action,
    used_llm: false,
  };
}

export async function fetchLatestGmailMessages(limit: number): Promise<{ imported_count: number; next_page_token: string | null; messages: GmailSyncMessage[] }> {
  const tokens = await getValidAccessToken();
  const listUrl = new URL('https://gmail.googleapis.com/gmail/v1/users/me/messages');
  listUrl.searchParams.set('maxResults', String(limit));
  listUrl.searchParams.set('labelIds', 'INBOX');

  const listResponse = await fetch(listUrl, { headers: { Authorization: `Bearer ${tokens.access_token}` }, cache: 'no-store' });
  if (!listResponse.ok) throw new Error(`Gmail inbox request failed with ${listResponse.status}.`);
  const listPayload = (await listResponse.json()) as GmailMessageListResponse;
  const messages: GmailSyncMessage[] = [];

  for (const item of listPayload.messages || []) {
    const messageResponse = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${item.id}?format=full`, {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
      cache: 'no-store',
    });
    if (!messageResponse.ok) continue;
    const gmailMessage = (await messageResponse.json()) as GmailMessageResponse;
    const body = findTextPart(gmailMessage.payload) || gmailMessage.snippet || '';
    const sender = parseSender(getHeader(gmailMessage, 'From'));
    const subject = getHeader(gmailMessage, 'Subject') || '(no subject)';
    const email: EmailInput = {
      sender_name: sender.sender_name,
      sender_email: sender.sender_email,
      subject,
      body_text: body,
      links: extractLinks(body),
      known_contact: false,
      in_reply_thread: Boolean(getHeader(gmailMessage, 'In-Reply-To')),
      starred: false,
    };
    messages.push({
      gmail_message_id: gmailMessage.id,
      thread_id: gmailMessage.threadId || item.threadId,
      email,
      classification: classifyEmail(email),
      received_at: gmailMessage.internalDate ? new Date(Number(gmailMessage.internalDate)).toISOString() : null,
      source: 'gmail',
    });
  }

  return { imported_count: messages.length, next_page_token: listPayload.nextPageToken || null, messages };
}
