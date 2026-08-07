import Link from 'next/link';
import { redirect } from 'next/navigation';
import { requireSessionUser } from '../../lib/auth';
import { getInboxSummary, listEmailRecords } from '../../lib/email-records';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function ReportsPage() {
  let user;
  try {
    user = await requireSessionUser();
  } catch {
    redirect('/');
  }

  const [summary, records] = await Promise.all([
    getInboxSummary(user.email),
    listEmailRecords(user.email, 1000),
  ]);

  const safe = records.filter((record) => record.reviewState === 'safe').length;
  const blocked = records.filter((record) => record.reviewState === 'scam').length;
  const reviewed = records.filter((record) => Boolean(record.reviewState)).length;
  const averageRisk = records.length
    ? Math.round(records.reduce((total, record) => total + record.riskScore, 0) / records.length)
    : 0;

  return (
    <main className="publicPage">
      <section className="card" style={{ maxWidth: 980, margin: '40px auto' }}>
        <span className="eyebrow">INBOX OUTLAW REPORTS</span>
        <h1>Inbox protection report</h1>
        <p className="subtle">Live totals for {user.email}. Reports are generated from the records saved in Inbox Outlaw.</p>

        <div className="referenceMetricGrid" style={{ marginTop: 24 }}>
          <article className="referenceMetric pinkMetric"><div><span>Total processed</span><strong>{summary.total}</strong><small>Saved email records</small></div></article>
          <article className="referenceMetric roseMetric"><div><span>Threat alerts</span><strong>{summary.scams}</strong><small>Detected or reported scams</small></div></article>
          <article className="referenceMetric greenMetric"><div><span>Safe decisions</span><strong>{safe}</strong><small>Emails or senders marked safe</small></div></article>
          <article className="referenceMetric blueMetric"><div><span>Average risk</span><strong>{averageRisk}</strong><small>Across saved records</small></div></article>
        </div>

        <div className="controlPanel" style={{ marginTop: 24 }}>
          <div className="controlCopy">
            <h2>Decision summary</h2>
            <p>{reviewed} emails reviewed, {blocked} blocked or reported, and {summary.opportunities} opportunities saved or detected.</p>
          </div>
          <div className="controlActions">
            <a className="button" href="/api/reports/export">Download CSV report</a>
            <Link className="button secondary" href="/dashboard">Return to dashboard</Link>
          </div>
        </div>
      </section>
    </main>
  );
}
