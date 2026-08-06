import { NextResponse } from 'next/server';
import { addActivityLog } from '../../../lib/activity-log';
import { requireSessionUser } from '../../../lib/auth';
import { getBackendApiBaseUrl } from '../../../lib/backend';
import { createEmailRecord, getInboxSummary, listEmailRecords, updateEmailReview, updateSenderReview } from '../../../lib/email-records';
import type { ClassificationResult, EmailInput, ReviewState } from '../../../lib/types';

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

  const classifyResponse = await fetch(`${getBackendApiBaseUrl()}/api/classify`, {
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

export async function PATCH(request: Request) {
  let user;
  try {
    user = await requireSessionUser();
  } catch {
    return NextResponse.json({ error: 'Unauthenticated.' }, { status: 401 });
  }

  let payload: { id?: string; senderEmail?: string; reviewState?: ReviewState; applyToSender?: boolean };
  try {
    payload = (await request.json()) as { id?: string; senderEmail?: string; reviewState?: ReviewState; applyToSender?: boolean };
  } catch {
    return NextResponse.json({ error: 'Invalid JSON payload.' }, { status: 400 });
  }

  const allowed: ReviewState[] = ['safe', 'scam', 'opportunity', null];
  const state = payload.reviewState ?? null;
  if (!allowed.includes(state)) {
    return NextResponse.json({ error: 'A valid review state is required.' }, { status: 400 });
  }

  if (payload.applyToSender) {
    if (!payload.senderEmail || (state !== 'safe' && state !== 'scam' && state !== null)) {
      return NextResponse.json({ error: 'A sender email and safe, scam, or cleared state are required.' }, { status: 400 });
    }
    const records = await updateSenderReview(user.email, payload.senderEmail, state);
    if (!records.length) return NextResponse.json({ error: 'No records found for that sender.' }, { status: 404 });
    const summary = await getInboxSummary(user.email);
    return NextResponse.json({ records, record: records[0], summary });
  }

  if (!payload.id) {
    return NextResponse.json({ error: 'A valid record id is required.' }, { status: 400 });
  }

  const record = await updateEmailReview(user.email, payload.id, state);
  if (!record) {
    return NextResponse.json({ error: 'Email record not found.' }, { status: 404 });
  }

  const summary = await getInboxSummary(user.email);
  return NextResponse.json({ record, summary });
}
