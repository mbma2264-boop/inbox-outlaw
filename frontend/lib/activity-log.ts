import { randomUUID } from 'node:crypto';
import { getDatabase } from './db';
import type { ActivityLogEntry } from './types';

function normalizeType(value: unknown): ActivityLogEntry['type'] {
  const text = String(value || 'manual_classification');
  const allowed: ActivityLogEntry['type'][] = [
    'login',
    'manual_classification',
    'gmail_connected',
    'gmail_disconnected',
    'gmail_synced',
    'logout',
  ];
  return allowed.includes(text as ActivityLogEntry['type'])
    ? (text as ActivityLogEntry['type'])
    : 'manual_classification';
}

function serialize(row: Record<string, unknown>): ActivityLogEntry {
  return {
    id: String(row.id),
    type: normalizeType(row.type),
    message: String(row.message),
    metadata: row.metadataJson ? JSON.parse(String(row.metadataJson)) : null,
    createdAt: String(row.createdAt),
  };
}

export async function addActivityLog(
  ownerEmail: string,
  type: ActivityLogEntry['type'],
  message: string,
  metadata?: Record<string, unknown> | null,
) {
  const db = getDatabase();
  const entry: ActivityLogEntry = {
    id: randomUUID(),
    type,
    message,
    metadata: metadata ?? null,
    createdAt: new Date().toISOString(),
  };

  db.prepare(`
    INSERT INTO ActivityLog (id, ownerEmail, type, message, metadataJson, createdAt)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(entry.id, ownerEmail, entry.type, entry.message, entry.metadata ? JSON.stringify(entry.metadata) : null, entry.createdAt);

  return entry;
}

export async function listActivityLogs(ownerEmail: string, limit = 20) {
  const db = getDatabase();
  const rows = db.prepare(`
    SELECT id, type, message, metadataJson, createdAt
    FROM ActivityLog
    WHERE ownerEmail = ?
    ORDER BY datetime(createdAt) DESC
    LIMIT ?
  `).all(ownerEmail, limit) as Record<string, unknown>[];

  return rows.map(serialize);
}
