import { randomUUID } from 'node:crypto';
import type {
  ClassificationResult,
  EmailInput,
  GmailSyncMessage,
  InboxSummary,
  StoredEmailRecord,
} from './types';

const DEFAULT_OWNER_EMAIL = 'anonymous@local.demo';
const emailRecordStore = new Map<string, StoredEmailRecord[]>();

export async function ensureEmailRecordStore() {
  return;
}

export async function createEmailRecord(
  ownerEmail: string = DEFAULT_OWNER_EMAIL,
  email: EmailInput,
  result: ClassificationResult,
) {
  const now = new Date().toISOString();
  const record: StoredEmailRecord = {
    id: randomUUID(),
    gmailMessageId: null,
    threadId: null,
    source: 'manual',
    senderName: email.sender_name ?? null,
    senderEmail: email.sender_email,
    subject: email.subject,
    bodyText: email.body_text,
    category: result.category,
    riskScore: result.risk_score,
    confidenceScore: result.confidence_score,
    recommendedAction: result.recommended_action,
    receivedAt: null,
    createdAt: now,
    updatedAt: now,
  };

  const existing = emailRecordStore.get(ownerEmail) || [];
  emailRecordStore.set(ownerEmail, [record, ...existing].slice(0, 100));
  return record;
}

function mapSyncedMessageToStoredRecord(message: GmailSyncMessage) {
  const now = new Date().toISOString();
  const receivedAt = message.received_at ?? null;
  return {
    id: randomUUID(),
    gmailMessageId: message.gmail_message_id,
    threadId: message.thread_id ?? null,
    source: message.source || 'gmail',
    senderName: message.email.sender_name ?? null,
    senderEmail: message.email.sender_email,
    subject: message.email.subject,
    bodyText: message.email.body_text,
    category: message.classification.category,
    riskScore: message.classification.risk_score,
    confidenceScore: message.classification.confidence_score,
    recommendedAction: message.classification.recommended_action,
    receivedAt,
    createdAt: receivedAt ?? now,
    updatedAt: now,
  } satisfies StoredEmailRecord;
}

export async function upsertSyncedEmailRecords(
  ownerEmail: string = DEFAULT_OWNER_EMAIL,
  messages: GmailSyncMessage[],
) {
  const existing = emailRecordStore.get(ownerEmail) || [];
  const byGmailId = new Map(existing.map((record) => [record.gmailMessageId || record.id, record]));
  const savedRecords: StoredEmailRecord[] = [];

  for (const message of messages) {
    const incoming = mapSyncedMessageToStoredRecord(message);
    const key = incoming.gmailMessageId || incoming.id;
    const current = byGmailId.get(key);
    const record = current ? { ...current, ...incoming, id: current.id, createdAt: current.createdAt, updatedAt: new Date().toISOString() } : incoming;
    byGmailId.set(key, record);
    savedRecords.push(record);
  }

  const merged = Array.from(byGmailId.values())
    .sort((a, b) => new Date(b.receivedAt || b.createdAt).getTime() - new Date(a.receivedAt || a.createdAt).getTime())
    .slice(0, 100);
  emailRecordStore.set(ownerEmail, merged);
  return savedRecords;
}

export async function listEmailRecords(ownerEmail: string = DEFAULT_OWNER_EMAIL, limit = 12) {
  return (emailRecordStore.get(ownerEmail) || [])
    .sort((a, b) => new Date(b.receivedAt || b.createdAt).getTime() - new Date(a.receivedAt || a.createdAt).getTime())
    .slice(0, limit);
}

function countByCategory(records: StoredEmailRecord[], categories: string[]) {
  if (categories.length === 0) return records.length;
  return records.filter((record) => categories.includes(record.category)).length;
}

export async function getInboxSummary(ownerEmail: string = DEFAULT_OWNER_EMAIL): Promise<InboxSummary> {
  const records = emailRecordStore.get(ownerEmail) || [];
  const total = countByCategory(records, []);
  const scams = countByCategory(records, ['Scam', 'Likely Scam']);
  const opportunities = countByCategory(records, ['Opportunity']);
  const handled = countByCategory(records, [
    'Scam',
    'Likely Scam',
    'Promotion',
    'Transactional',
    'Verified Business',
  ]);

  return { total, scams, opportunities, handled };
}
