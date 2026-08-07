import { NextResponse } from 'next/server';
import { requireSessionUser } from '../../../../lib/auth';
import { listEmailRecords } from '../../../../lib/email-records';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function csvCell(value: unknown) {
  const text = value == null ? '' : String(value);
  return `"${text.replace(/"/g, '""')}"`;
}

export async function GET() {
  let user;
  try {
    user = await requireSessionUser();
  } catch {
    return NextResponse.json({ error: 'Unauthenticated.' }, { status: 401 });
  }

  const records = await listEmailRecords(user.email, 1000);
  const header = [
    'Received',
    'Sender Name',
    'Sender Email',
    'Subject',
    'Classification',
    'Risk Score',
    'Confidence',
    'Review Decision',
    'Recommended Action',
  ];

  const rows = records.map((record) => [
    record.receivedAt || record.createdAt,
    record.senderName || '',
    record.senderEmail,
    record.subject,
    record.category,
    record.riskScore,
    record.confidenceScore,
    record.reviewState || '',
    record.recommendedAction || '',
  ]);

  const csv = [header, ...rows].map((row) => row.map(csvCell).join(',')).join('\r\n');
  const date = new Date().toISOString().slice(0, 10);

  return new NextResponse(csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="inbox-outlaw-report-${date}.csv"`,
      'Cache-Control': 'no-store',
    },
  });
}
