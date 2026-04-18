import { NextResponse } from 'next/server';
import { addActivityLog, listActivityLogs } from '../../../../lib/activity-log';
import { requireSessionUser } from '../../../../lib/auth';
import { createEmailRecord, getInboxSummary, listEmailRecords } from '../../../../lib/email-records';
import type { ClassificationResult, EmailInput } from '../../../../lib/types';

const sampleItems: Array<{ email: EmailInput; result: ClassificationResult }> = [
  {
    email: {
      sender_name: 'Chris from LVT Online',
      sender_email: 'chris@lvtonline.com',
      subject: 'I personally pushed for you to get this automation spot',
      body_text:
        'I vouched for you. I am not mad, just confused. Prove me right here and confirm your automation access before the next round closes.',
      links: ['https://hustlerspot.com/7min/bridge.html'],
      known_contact: false,
      in_reply_thread: false,
      starred: false,
    },
    result: {
      category: 'scam',
      risk_score: 92,
      confidence_score: 95,
      reasons: [
        'Uses guilt and manipulation language.',
        'Creates false urgency around a vague automation offer.',
        'Pushes to an unverified funnel-style link.',
      ],
      matched_rules: [
        { rule_id: 'pressure_language', weight: 35, reason: 'Manipulative guilt phrasing' },
        { rule_id: 'urgent_cta', weight: 28, reason: 'Immediate action pressure' },
        { rule_id: 'vague_offer', weight: 29, reason: 'No clear product details' },
      ],
      recommended_action: 'report',
      used_llm: false,
    },
  },
  {
    email: {
      sender_name: 'OLSP Launch Desk',
      sender_email: 'launch@olsp.com',
      subject: 'JV invite: leaderboard points for live summit attendees',
      body_text:
        'We are opening our 3-day summit promo window. Affiliates earn leaderboard points for live attendees and approved upsells. Reply if you want swipe copy.',
      links: ['https://example.com/launch-assets'],
      known_contact: true,
      in_reply_thread: false,
      starred: true,
    },
    result: {
      category: 'opportunity',
      risk_score: 18,
      confidence_score: 88,
      reasons: [
        'Clear business context and concrete promotion terms.',
        'Consistent sender identity and non-deceptive CTA.',
        'Likely relevant to affiliate marketing workflows.',
      ],
      matched_rules: [
        { rule_id: 'business_language', weight: 22, reason: 'Clear JV / launch wording' },
        { rule_id: 'known_contact', weight: -10, reason: 'Trusted sender context' },
      ],
      recommended_action: 'keep',
      used_llm: false,
    },
  },
  {
    email: {
      sender_name: 'Substack Weekly',
      sender_email: 'newsletter@substack.com',
      subject: 'Your weekly creator economy roundup',
      body_text:
        'Here is your weekly digest of creator economy news, product launches, and social platform updates from the last seven days.',
      links: ['https://example.com/newsletter'],
      known_contact: false,
      in_reply_thread: false,
      starred: false,
    },
    result: {
      category: 'newsletter',
      risk_score: 12,
      confidence_score: 84,
      reasons: [
        'Routine digest pattern with low-risk content.',
        'Recognizable newsletter format.',
      ],
      matched_rules: [
        { rule_id: 'newsletter_digest', weight: 20, reason: 'Digest/newsletter phrasing' },
      ],
      recommended_action: 'archive',
      used_llm: false,
    },
  },
];

export async function POST() {
  let user;
  try {
    user = await requireSessionUser();
  } catch {
    return NextResponse.json({ error: 'Unauthenticated.' }, { status: 401 });
  }

  const existing = await listEmailRecords(user.email, 1);
  if (existing.length > 0) {
    const [records, summary, activity] = await Promise.all([
      listEmailRecords(user.email),
      getInboxSummary(user.email),
      listActivityLogs(user.email, 25),
    ]);
    return NextResponse.json({
      seeded: false,
      note: 'Demo data already exists for this user.',
      records,
      summary,
      activity,
      sessionUser: user,
    });
  }

  for (const item of sampleItems) {
    await createEmailRecord(user.email, item.email, item.result);
  }

  await addActivityLog(user.email, 'login', 'Demo workspace seeded with sample inbox items.', {
    sampleCount: sampleItems.length,
  });

  const [records, summary, activity] = await Promise.all([
    listEmailRecords(user.email),
    getInboxSummary(user.email),
    listActivityLogs(user.email, 25),
  ]);

  return NextResponse.json({
    seeded: true,
    note: `Loaded ${sampleItems.length} sample inbox records for the demo.`,
    records,
    summary,
    activity,
    sessionUser: user,
  });
}
