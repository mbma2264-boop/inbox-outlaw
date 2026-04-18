import { randomUUID } from 'node:crypto';
import type {
  ClassificationResult,
  EmailInput,
  GmailSyncMessage,
  InboxSummary,
  StoredEmailRecord,
} from './types';
import { getDatabase } from './db';

const DEFAULT_OWNER_EMAIL = 'anonymous@local.demo';

function serializeRecord(row: Record<string, unknown>): StoredEmailRecord {
  return {
    id: String(row.id),
    gmailMessageId: row.gmailMessageId ? String(row.gmailMessageId) : null,
    threadId: row.threadId ? String(row.threadId) : null,
    source: row.source ? String(row.source) : 'manual',
    senderName: row.senderName ? String(row.senderName) : null,
    senderEmail: String(row.senderEmail),
    subject: String(row.subject),
    bodyText: String(row.bodyText),
    category: String(row.category),
    riskScore: Number(row.riskScore),
    confidenceScore: Number(row.confidenceScore),
    recommendedAction: row.recommendedAction ? String(row.recommendedAction) : null,
    receivedAt: row.receivedAt ? String(row.receivedAt) : null,
    createdAt: String(row.createdAt),
    updatedAt: String(row.updatedAt),
  };
}

export async function ensureEmailRecordStore() {
  getDatabase();
}

export async function createEmailRecord(
  ownerEmail: string = DEFAULT_OWNER_EMAIL,
  email: EmailInput,
  result: ClassificationResult,
) {
  const db = getDatabase();
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

  db.prepare(`
    INSERT INTO EmailRecord (
      id, ownerEmail, gmailMessageId, threadId, source, senderName, senderEmail, subject, bodyText, category,
      riskScore, confidenceScore, recommendedAction, receivedAt, createdAt, updatedAt
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    record.id,
    ownerEmail,
    record.gmailMessageId,
    record.threadId,
    record.source,
    record.senderName,
    record.senderEmail,
    record.subject,
    record.bodyText,
    record.category,
    record.riskScore,
    record.confidenceScore,
    record.recommendedAction,
    record.receivedAt,
    record.createdAt,
    record.updatedAt,
  );

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
  const db = getDatabase();
  const savedRecords: StoredEmailRecord[] = [];

  const upsert = db.prepare(`
    INSERT INTO EmailRecord (
      id, ownerEmail, gmailMessageId, threadId, source, senderName, senderEmail, subject, bodyText, category,
      riskScore, confidenceScore, recommendedAction, receivedAt, createdAt, updatedAt
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(ownerEmail, gmailMessageId) DO UPDATE SET
      threadId=excluded.threadId,
      source=excluded.source,
      senderName=excluded.senderName,
      senderEmail=excluded.senderEmail,
      subject=excluded.subject,
      bodyText=excluded.bodyText,
      category=excluded.category,
      riskScore=excluded.riskScore,
      confidenceScore=excluded.confidenceScore,
      recommendedAction=excluded.recommendedAction,
      receivedAt=COALESCE(excluded.receivedAt, EmailRecord.receivedAt),
      updatedAt=excluded.updatedAt
  `);

  for (const message of messages) {
    const record = mapSyncedMessageToStoredRecord(message);
    upsert.run(
      record.id,
      ownerEmail,
      record.gmailMessageId,
      record.threadId,
      record.source,
      record.senderName,
      record.senderEmail,
      record.subject,
      record.bodyText,
      record.category,
      record.riskScore,
      record.confidenceScore,
      record.recommendedAction,
      record.receivedAt,
      record.createdAt,
      record.updatedAt,
    );

    const stored = db.prepare(`
      SELECT id, gmailMessageId, threadId, source, senderName, senderEmail, subject, bodyText,
             category, riskScore, confidenceScore, recommendedAction, receivedAt, createdAt, updatedAt
      FROM EmailRecord
      WHERE ownerEmail = ? AND gmailMessageId = ?
    `).get(ownerEmail, record.gmailMessageId) as Record<string, unknown>;

    savedRecords.push(serializeRecord(stored));
  }

  return savedRecords;
}

export async function listEmailRecords(ownerEmail: string = DEFAULT_OWNER_EMAIL, limit = 12) {
  const db = getDatabase();
  const rows = db.prepare(`
    SELECT id, gmailMessageId, threadId, source, senderName, senderEmail, subject, bodyText, category,
           riskScore, confidenceScore, recommendedAction, receivedAt, createdAt, updatedAt
    FROM EmailRecord
    WHERE ownerEmail = ?
    ORDER BY COALESCE(datetime(receivedAt), datetime(createdAt)) DESC
    LIMIT ?
  `).all(ownerEmail, limit) as Record<string, unknown>[];

  return rows.map(serializeRecord);
}

function countByCategory(ownerEmail: string, categories: string[]) {
  const db = getDatabase();
  if (categories.length === 0) {
    const row = db.prepare(`SELECT COUNT(*) as total FROM EmailRecord WHERE ownerEmail = ?`).get(ownerEmail) as { total: number };
    return Number(row.total);
  }

  const placeholders = categories.map(() => '?').join(', ');
  const row = db
    .prepare(`SELECT COUNT(*) as total FROM EmailRecord WHERE ownerEmail = ? AND category IN (${placeholders})`)
    .get(ownerEmail, ...categories) as { total: number };
  return Number(row.total);
}

export async function getInboxSummary(ownerEmail: string = DEFAULT_OWNER_EMAIL): Promise<InboxSummary> {
  const total = countByCategory(ownerEmail, []);
  const scams = countByCategory(ownerEmail, ['Scam', 'Likely Scam']);
  const opportunities = countByCategory(ownerEmail, ['Opportunity']);
  const handled = countByCategory(ownerEmail, [
    'Scam',
    'Likely Scam',
    'Promotion',
    'Transactional',
    'Verified Business',
  ]);

  return { total, scams, opportunities, handled };
}
