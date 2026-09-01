import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

const LOGIN_CALLBACK_PATH = '/api/auth/google/callback';
const STATE_MAX_AGE_MS = 10 * 60 * 1000;

type LoginState = { nonce: string; issuedAt: number; returnTo: string };
type TokenResponse = { access_token?: string; error?: string; error_description?: string };
type GoogleUserInfo = { email?: string; email_verified?: boolean; sub?: string };

function credentials() {
  return {
    clientId: (process.env.GOOGLE_CLIENT_ID || process.env.GMAIL_CLIENT_ID || '').trim(),
    clientSecret: (process.env.GOOGLE_CLIENT_SECRET || process.env.GMAIL_CLIENT_SECRET || '').trim(),
  };
}

function stateSecret() {
  const secret = (process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET || process.env.GOOGLE_CLIENT_SECRET || '').trim();
  if (!secret) throw new Error('Missing AUTH_SECRET (or NEXTAUTH_SECRET) for Google login state signing.');
  return secret;
}

function appOrigin(requestOrigin: string) {
  const configured = (process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || '').trim();
  if (configured && /^https?:\/\//i.test(configured)) return configured.replace(/\/$/, '');
  return requestOrigin.replace(/\/$/, '');
}

export function googleLoginRedirectUri(requestOrigin: string) {
  const explicit = (process.env.GOOGLE_LOGIN_REDIRECT_URI || '').trim();
  if (explicit && /^https?:\/\//i.test(explicit)) return explicit;
  return `${appOrigin(requestOrigin)}${LOGIN_CALLBACK_PATH}`;
}

function validate(requestOrigin: string) {
  const { clientId, clientSecret } = credentials();
  if (!clientId || !clientSecret) throw new Error('Google login credentials are not configured.');
  if (!clientId.endsWith('.apps.googleusercontent.com')) throw new Error('GOOGLE_CLIENT_ID is not a valid Google OAuth web client ID.');
  stateSecret();
  return { clientId, clientSecret, redirectUri: googleLoginRedirectUri(requestOrigin) };
}

function encodeState(state: LoginState) {
  const payload = Buffer.from(JSON.stringify(state), 'utf8').toString('base64url');
  const signature = createHmac('sha256', stateSecret()).update(payload).digest('base64url');
  return `${payload}.${signature}`;
}

function decodeState(value: string | null) {
  if (!value) return null;
  const [payload, signature] = value.split('.');
  if (!payload || !signature) return null;
  const expected = createHmac('sha256', stateSecret()).update(payload).digest('base64url');
  const suppliedBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  if (suppliedBuffer.length !== expectedBuffer.length || !timingSafeEqual(suppliedBuffer, expectedBuffer)) return null;
  try {
    const parsed = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as LoginState;
    if (!parsed.nonce || !Number.isFinite(parsed.issuedAt) || !parsed.returnTo) return null;
    if (Date.now() - parsed.issuedAt > STATE_MAX_AGE_MS || parsed.issuedAt > Date.now() + 60_000) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function createGoogleLoginUrl(requestOrigin: string, returnTo = '/dashboard') {
  const { clientId, redirectUri } = validate(requestOrigin);
  const safeReturnTo = returnTo.startsWith('/') && !returnTo.startsWith('//') ? returnTo : '/dashboard';
  const state = encodeState({ nonce: randomBytes(24).toString('base64url'), issuedAt: Date.now(), returnTo: safeReturnTo });
  const url = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  url.searchParams.set('client_id', clientId);
  url.searchParams.set('redirect_uri', redirectUri);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('scope', 'openid email profile');
  url.searchParams.set('state', state);
  url.searchParams.set('prompt', 'select_account');
  return url.toString();
}

export async function verifyGoogleLogin(requestOrigin: string, code: string, stateValue: string | null) {
  const { clientId, clientSecret, redirectUri } = validate(requestOrigin);
  const state = decodeState(stateValue);
  if (!state) throw new Error('Google login state did not match. Start sign-in again.');

  const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ client_id: clientId, client_secret: clientSecret, code, grant_type: 'authorization_code', redirect_uri: redirectUri }),
    cache: 'no-store',
  });
  const token = await tokenResponse.json().catch(() => null) as TokenResponse | null;
  if (!tokenResponse.ok || !token?.access_token) throw new Error(token?.error_description || token?.error || 'Google token exchange failed.');

  const userResponse = await fetch('https://openidconnect.googleapis.com/v1/userinfo', {
    headers: { Authorization: `Bearer ${token.access_token}` },
    cache: 'no-store',
  });
  const user = await userResponse.json().catch(() => null) as GoogleUserInfo | null;
  if (!userResponse.ok || !user?.email || user.email_verified !== true) throw new Error('Google did not return a verified email address.');

  return { email: user.email.trim().toLowerCase(), googleSubject: user.sub || null, returnTo: state.returnTo };
}
