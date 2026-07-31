import { randomBytes } from 'node:crypto';
import { cookies } from 'next/headers';
import { writeStoredTokens } from './gmail-local';

const STATE_COOKIE = 'inbox_outlaw_gmail_oauth_state';
const DEFAULT_REDIRECT_PATH = '/api/gmail/oauth/callback';
const GMAIL_SCOPES = ['https://www.googleapis.com/auth/gmail.readonly'];

type OAuthState = {
  state: string;
  returnTo: string;
};

type TokenPayload = {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  scope?: string;
  error?: string;
  error_description?: string;
};

function googleCredentials() {
  return {
    clientId: (process.env.GOOGLE_CLIENT_ID || process.env.GMAIL_CLIENT_ID || '').trim(),
    clientSecret: (process.env.GOOGLE_CLIENT_SECRET || process.env.GMAIL_CLIENT_SECRET || '').trim(),
  };
}

function configuredOrigin(requestOrigin: string) {
  const appUrl = (process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || '').trim();
  if (appUrl && /^https?:\/\//i.test(appUrl)) return appUrl.replace(/\/$/, '');
  return requestOrigin.replace(/\/$/, '');
}

export function productionGmailRedirectUri(requestOrigin: string) {
  const explicit = (process.env.GOOGLE_REDIRECT_URI || '').trim();
  if (explicit && /^https?:\/\//i.test(explicit)) return explicit.replace(/\/$/, '');
  const path = explicit.startsWith('/') ? explicit : DEFAULT_REDIRECT_PATH;
  return `${configuredOrigin(requestOrigin)}${path}`;
}

function validateConfiguration(requestOrigin: string) {
  const { clientId, clientSecret } = googleCredentials();
  const missing = [!clientId ? 'GOOGLE_CLIENT_ID' : null, !clientSecret ? 'GOOGLE_CLIENT_SECRET' : null].filter(Boolean);
  if (missing.length) throw new Error(`Missing Gmail environment variable(s): ${missing.join(', ')}.`);
  if (!clientId.endsWith('.apps.googleusercontent.com')) {
    throw new Error('GOOGLE_CLIENT_ID is not a valid Google OAuth web client ID.');
  }
  return { clientId, clientSecret, redirectUri: productionGmailRedirectUri(requestOrigin) };
}

function encodeState(value: OAuthState) {
  return Buffer.from(JSON.stringify(value), 'utf8').toString('base64url');
}

function decodeState(value: string | undefined): OAuthState | null {
  if (!value) return null;
  try {
    return JSON.parse(Buffer.from(value, 'base64url').toString('utf8')) as OAuthState;
  } catch {
    return null;
  }
}

export async function createProductionGoogleAuthorizationUrl(requestOrigin: string, returnTo: string) {
  const { clientId, redirectUri } = validateConfiguration(requestOrigin);
  const state = randomBytes(24).toString('base64url');
  const cookieStore = await cookies();
  cookieStore.set(STATE_COOKIE, encodeState({ state, returnTo }), {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 10 * 60,
  });

  const authorizationUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  authorizationUrl.searchParams.set('client_id', clientId);
  authorizationUrl.searchParams.set('redirect_uri', redirectUri);
  authorizationUrl.searchParams.set('response_type', 'code');
  authorizationUrl.searchParams.set('scope', GMAIL_SCOPES.join(' '));
  authorizationUrl.searchParams.set('access_type', 'offline');
  authorizationUrl.searchParams.set('prompt', 'consent');
  authorizationUrl.searchParams.set('include_granted_scopes', 'true');
  authorizationUrl.searchParams.set('state', state);
  return authorizationUrl.toString();
}

export async function handleProductionGoogleCallback(requestOrigin: string, code: string, state: string) {
  const { clientId, clientSecret, redirectUri } = validateConfiguration(requestOrigin);
  const cookieStore = await cookies();
  const savedState = decodeState(cookieStore.get(STATE_COOKIE)?.value);
  cookieStore.delete(STATE_COOKIE);

  if (!savedState || savedState.state !== state) {
    throw new Error('Google sign-in state did not match. Start the Gmail connection again.');
  }

  const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      code,
      grant_type: 'authorization_code',
      redirect_uri: redirectUri,
    }),
    cache: 'no-store',
  });

  const payload = (await tokenResponse.json().catch(() => null)) as TokenPayload | null;
  if (!tokenResponse.ok || !payload?.access_token) {
    throw new Error(payload?.error_description || payload?.error || `Google token request failed with ${tokenResponse.status}.`);
  }

  await writeStoredTokens({
    access_token: payload.access_token,
    refresh_token: payload.refresh_token,
    expires_at: Date.now() + Number(payload.expires_in ?? 3600) * 1000,
    scope: payload.scope,
  });

  return savedState.returnTo || `${configuredOrigin(requestOrigin)}/dashboard`;
}
