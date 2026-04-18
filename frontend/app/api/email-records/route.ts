import { NextResponse } from 'next/server';
import { addActivityLog } from '../../../lib/activity-log';
import { requireSessionUser } from '../../../lib/auth';
import { createEmailRecord, getInboxSummary, listEmailRecords } from '../../../lib/email-records';
import type { ClassificationResult, EmailInput } from '../../../lib/types';

const BACKEND_API_BASE_URL =
  process.env.BACKEND_API_BASE_URL || process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000';

function validateEmailPayload(payload: Partial<EmailInput>): payload is EmailInput {
  return Boolean(
    payload.sender_email &&
      payload.subject &&
      payload.body_text &&
      Array.isArray(payload.links) &&
      typeof payload.known_contact === 'boolean' &&
      typeof payload.in_reply_thread === 'boolean' &&
      typeof payload.starred === 'boolean'
  );
}

export async function GET() {
  let user;
  try {
    user = await requireSessionUser();
  } catch {
    return NextResponse.json({ error: 'Unauthenticated.' }, { status: 401 });
  }
  const [records, summary] = await Promise.all([
    listEmailRecords(user.email),
    getInboxSummary(user.email),
  ]);
  return NextResponse.json({ records, summary, sessionUser: user });
}

export async function POST(request: Request) {
  let user;
  try {
    user = await requireSessionUser();
  } catch {
    return NextResponse.json({ error: 'Unauthenticated.' }, { status: 401 });
  }
  let payload: Partial<EmailInput>;

  try {
    payload = (await request.json()) as Partial<EmailInput>;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON payload.' }, { status: 400 });
  }

  if (!validateEmailPayload(payload)) {
    return NextResponse.json({ error: 'Missing required email fields.' }, { status: 400 });
  }

  const classifyResponse = await fetch(`${BACKEND_API_BASE_URL}/api/classify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    cache: 'no-store',
  });

  if (!classifyResponse.ok) {
    return NextResponse.json({ error: `Classifier request failed with ${classifyResponse.status}.` }, { status: 502 });
  }

  const result = (await classifyResponse.json()) as ClassificationResult;
  const record = await createEmailRecord(user.email, payload, result);
  await addActivityLog(user.email, 'manual_classification', `Saved manual classification for ${payload.subject}.`, {
    category: result.category,
    riskScore: result.risk_score,
  });
  return NextResponse.json({ result, record }, { status: 201 });
}
