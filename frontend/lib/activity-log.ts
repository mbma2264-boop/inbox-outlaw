import { randomUUID } from 'node:crypto';
import type { ActivityLogEntry } from './types';

const activityStore = new Map<string, ActivityLogEntry[]>();

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

export async function addActivityLog(
  ownerEmail: string,
  type: ActivityLogEntry['type'],
  message: string,
  metadata?: Record<string, unknown> | null,
) {
  const entry: ActivityLogEntry = {
    id: randomUUID(),
    type: normalizeType(type),
    message,
    metadata: metadata ?? null,
    createdAt: new Date().toISOString(),
  };

  const existing = activityStore.get(ownerEmail) || [];
  existing.unshift(entry);
  activityStore.set(ownerEmail, existing.slice(0, 50));

  return entry;
}

export async function listActivityLogs(ownerEmail: string, limit = 20) {
  return (activityStore.get(ownerEmail) || []).slice(0, limit);
}
