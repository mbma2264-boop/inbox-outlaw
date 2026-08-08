import { classifyEmailEvidence } from './classification-engine';
import type {
  ClassificationResult,
  EmailInput,
  GmailSyncMessage,
  InboxSummary,
  ReviewState,
  StoredEmailRecord,
} from './types';

const DEFAULT_OWNER_EMAIL = 'anonymous@local.demo';

type DatabaseEmailRecord = {
  id: string;
  user_email: string;
  gmail_message_id: string | null;
  thread_id: string | null;
  source: string;
  sender_name: string | null;
  sender_email: string;
  subject: string;
  body_text: string;
  category: string;
  risk_score: number;
  confidence_score: number;
  recommended_action: string | null;
  review_state: ReviewState;
  reviewed_at: string | null;
  received_at: string | null;
  created_at: string;
  updated_at: string;
};

type SenderRuleRow = { sender_email: string; decision: 'safe' | 'blocked' };

function getSupabaseCredentials() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_JWT_SECRET;
  if (!url || !key) throw new Error('Supabase server credentials are not configured.');
  return { url: url.replace(/\/$/, ''), key };
}

async function supabaseRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const { url, key } = getSupabaseCredentials();
  const response = await fetch(`${url}/rest/v1/${path}`, { ...init, headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json', ...init.headers }, cache: 'no-store' });
  const responseText = await response.text().catch(() => '');
  if (!response.ok) throw new Error(`Supabase request failed (${response.status})${responseText ? `: ${responseText}` : ''}`);
  if (!responseText.trim()) return undefined as T;
  try { return JSON.parse(responseText) as T; } catch { throw new Error(`Supabase returned an invalid JSON response (${response.status}).`); }
}

function mapDatabaseRecord(row: DatabaseEmailRecord): StoredEmailRecord {
  return { id: row.id, gmailMessageId: row.gmail_message_id, threadId: row.thread_id, source: row.source, senderName: row.sender_name, senderEmail: row.sender_email, subject: row.subject, bodyText: row.body_text, category: row.category, riskScore: row.risk_score, confidenceScore: row.confidence_score, recommendedAction: row.recommended_action, reviewState: row.review_state, reviewedAt: row.reviewed_at, receivedAt: row.received_at, createdAt: row.created_at, updatedAt: row.updated_at };
}
function encodeFilter(value: string) { return encodeURIComponent(value); }
async function ensureUser(ownerEmail: string) { await supabaseRequest<unknown>('app_users?on_conflict=email', { method: 'POST', headers: { Prefer: 'resolution=merge-duplicates,return=minimal' }, body: JSON.stringify({ email: ownerEmail }) }); }
export async function ensureEmailRecordStore() { getSupabaseCredentials(); }

async function getSenderRule(ownerEmail: string, senderEmail: string) {
  const normalized = senderEmail.trim().toLowerCase();
  const rows = await supabaseRequest<SenderRuleRow[]>(`sender_rules?user_email=eq.${encodeFilter(ownerEmail)}&sender_email=eq.${encodeFilter(normalized)}&select=sender_email,decision&limit=1`);
  return rows[0]?.decision ?? null;
}

export async function createEmailRecord(ownerEmail: string = DEFAULT_OWNER_EMAIL, email: EmailInput, _result: ClassificationResult) {
  await ensureUser(ownerEmail);
  const history = await getSenderRule(ownerEmail, email.sender_email);
  const classificationInput: EmailInput = { ...email, sender_history_decision: history };
  const result = classifyEmailEvidence(classificationInput);
  const reviewState: ReviewState = history === 'blocked' ? 'scam' : history === 'safe' ? 'safe' : null;
  const rows = await supabaseRequest<DatabaseEmailRecord[]>('email_records?select=*', {
    method: 'POST', headers: { Prefer: 'return=representation' },
    body: JSON.stringify({ user_email: ownerEmail, gmail_message_id: null, thread_id: null, source: 'manual', sender_name: email.sender_name ?? null, sender_email: email.sender_email, subject: email.subject, body_text: email.body_text, category: result.category, risk_score: result.risk_score, confidence_score: result.confidence_score, recommended_action: result.recommended_action, review_state: reviewState, reviewed_at: reviewState ? new Date().toISOString() : null, received_at: null }),
  });
  return mapDatabaseRecord(rows[0]);
}

export async function upsertSyncedEmailRecords(ownerEmail: string = DEFAULT_OWNER_EMAIL, messages: GmailSyncMessage[]) {
  if (!messages.length) return [];
  await ensureUser(ownerEmail);
  const senderRules = await supabaseRequest<SenderRuleRow[]>(`sender_rules?user_email=eq.${encodeFilter(ownerEmail)}&select=sender_email,decision`);
  const ruleBySender = new Map(senderRules.map((rule) => [rule.sender_email.trim().toLowerCase(), rule.decision]));

  const rows = messages.map((message) => {
    const senderEmail = message.email.sender_email;
    const history = ruleBySender.get(senderEmail.trim().toLowerCase()) ?? null;
    const senderDecision: ReviewState = history === 'blocked' ? 'scam' : history === 'safe' ? 'safe' : null;
    const classification = classifyEmailEvidence({ ...message.email, sender_history_decision: history });
    return { user_email: ownerEmail, gmail_message_id: message.gmail_message_id, thread_id: message.thread_id ?? null, source: message.source || 'gmail', sender_name: message.email.sender_name ?? null, sender_email: senderEmail, subject: message.email.subject, body_text: message.email.body_text, category: classification.category, risk_score: classification.risk_score, confidence_score: classification.confidence_score, recommended_action: classification.recommended_action, review_state: senderDecision, reviewed_at: senderDecision ? new Date().toISOString() : null, received_at: message.received_at ?? null };
  });

  const saved = await supabaseRequest<DatabaseEmailRecord[]>('email_records?on_conflict=user_email,gmail_message_id&select=*', { method: 'POST', headers: { Prefer: 'resolution=merge-duplicates,return=representation' }, body: JSON.stringify(rows) });
  return saved.map(mapDatabaseRecord);
}

export async function updateEmailReview(ownerEmail: string = DEFAULT_OWNER_EMAIL, recordId: string, reviewState: ReviewState) {
  const rows = await supabaseRequest<DatabaseEmailRecord[]>(`email_records?user_email=eq.${encodeFilter(ownerEmail)}&id=eq.${encodeFilter(recordId)}&select=*`, { method: 'PATCH', headers: { Prefer: 'return=representation' }, body: JSON.stringify({ review_state: reviewState, reviewed_at: reviewState ? new Date().toISOString() : null }) });
  return rows[0] ? mapDatabaseRecord(rows[0]) : null;
}

export async function updateSenderReview(ownerEmail: string = DEFAULT_OWNER_EMAIL, senderEmail: string, reviewState: Extract<ReviewState, 'safe' | 'scam'> | null) {
  await ensureUser(ownerEmail);
  const normalized = senderEmail.trim().toLowerCase();
  if (reviewState) await supabaseRequest<unknown>('sender_rules?on_conflict=user_email,sender_email', { method: 'POST', headers: { Prefer: 'resolution=merge-duplicates,return=minimal' }, body: JSON.stringify({ user_email: ownerEmail, sender_email: normalized, decision: reviewState === 'scam' ? 'blocked' : 'safe' }) });
  else await supabaseRequest<unknown>(`sender_rules?user_email=eq.${encodeFilter(ownerEmail)}&sender_email=eq.${encodeFilter(normalized)}`, { method: 'DELETE', headers: { Prefer: 'return=minimal' } });
  const rows = await supabaseRequest<DatabaseEmailRecord[]>(`email_records?user_email=eq.${encodeFilter(ownerEmail)}&sender_email=ilike.${encodeFilter(normalized)}&select=*`, { method: 'PATCH', headers: { Prefer: 'return=representation' }, body: JSON.stringify({ review_state: reviewState, reviewed_at: reviewState ? new Date().toISOString() : null }) });
  return rows.map(mapDatabaseRecord);
}

export async function listEmailRecords(ownerEmail: string = DEFAULT_OWNER_EMAIL, limit = 12) { const rows = await supabaseRequest<DatabaseEmailRecord[]>(`email_records?user_email=eq.${encodeFilter(ownerEmail)}&select=*&order=received_at.desc.nullslast,created_at.desc&limit=${limit}`); return rows.map(mapDatabaseRecord); }
export async function getInboxSummary(ownerEmail: string = DEFAULT_OWNER_EMAIL): Promise<InboxSummary> {
  const rows = await supabaseRequest<Pick<DatabaseEmailRecord, 'category' | 'review_state'>[]>(`email_records?user_email=eq.${encodeFilter(ownerEmail)}&select=category,review_state`);
  const total = rows.length;
  const scams = rows.filter((record) => record.review_state === 'scam' || ['Scam', 'Likely Scam'].includes(record.category)).length;
  const opportunities = rows.filter((record) => record.review_state === 'opportunity' || record.category === 'Opportunity').length;
  const handled = rows.filter((record) => Boolean(record.review_state)).length;
  return { total, scams, opportunities, handled };
}
