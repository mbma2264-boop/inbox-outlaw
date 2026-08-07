import Link from 'next/link';
import { redirect } from 'next/navigation';
import { requireSessionUser } from '../../lib/auth';
import { listEmailRecords } from '../../lib/email-records';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function TrainingPage() {
  let user;
  try {
    user = await requireSessionUser();
  } catch {
    redirect('/');
  }

  const records = await listEmailRecords(user.email, 1000);
  const reviewed = records.filter((record) => Boolean(record.reviewState));
  const safe = reviewed.filter((record) => record.reviewState === 'safe').length;
  const scams = reviewed.filter((record) => record.reviewState === 'scam').length;
  const opportunities = reviewed.filter((record) => record.reviewState === 'opportunity').length;
  const corrections = reviewed.filter((record) => {
    if (record.reviewState === 'safe') return record.category === 'Scam' || record.category === 'Likely Scam';
    if (record.reviewState === 'scam') return record.category !== 'Scam' && record.category !== 'Likely Scam';
    if (record.reviewState === 'opportunity') return record.category !== 'Opportunity';
    return false;
  });

  return (
    <main className="publicPage">
      <section className="card" style={{ maxWidth: 1080, margin: '40px auto' }}>
        <span className="eyebrow">AI TRAINING</span>
        <h1>Your decisions improve future reviews</h1>
        <p className="subtle">
          This page summarizes where your saved decisions agree with or correct Inbox Outlaw classifications. Your feedback remains tied to your account and is used as decision history inside the app.
        </p>

        <div className="referenceMetricGrid" style={{ marginTop: 24 }}>
          <article className="referenceMetric blueMetric"><div><span>Reviewed</span><strong>{reviewed.length}</strong><small>Total saved decisions</small></div></article>
          <article className="referenceMetric greenMetric"><div><span>Marked safe</span><strong>{safe}</strong><small>Trusted email or sender decisions</small></div></article>
          <article className="referenceMetric pinkMetric"><div><span>Marked scam</span><strong>{scams}</strong><small>Reported or blocked decisions</small></div></article>
          <article className="referenceMetric roseMetric"><div><span>Opportunities</span><strong>{opportunities}</strong><small>Saved business opportunities</small></div></article>
        </div>

        <div className="controlPanel" style={{ marginTop: 24 }}>
          <div className="controlCopy">
            <h2>Classification corrections</h2>
            <p>{corrections.length} reviewed message{corrections.length === 1 ? '' : 's'} currently differ from the original automatic classification.</p>
          </div>
          <div className="controlActions">
            <Link className="button" href="/dashboard">Review inbox decisions</Link>
            <Link className="button secondary" href="/rules">View active rules</Link>
          </div>
        </div>

        {corrections.length === 0 ? (
          <div className="emptyState" style={{ marginTop: 24 }}>
            <strong>No classification corrections yet</strong>
            <p>When you override a classification, the corrected message will appear here.</p>
          </div>
        ) : (
          <div className="recordsTableWrap" style={{ marginTop: 24 }}>
            <table className="recordsTable modernTable">
              <thead><tr><th>Sender</th><th>Subject</th><th>Original</th><th>Your decision</th><th>Reviewed</th></tr></thead>
              <tbody>
                {corrections.slice(0, 100).map((record) => (
                  <tr key={record.id}>
                    <td><strong>{record.senderName || record.senderEmail}</strong><small>{record.senderEmail}</small></td>
                    <td>{record.subject}</td>
                    <td><span className="categoryBadge">{record.category}</span></td>
                    <td><span className={`reviewTag ${record.reviewState || ''}`}>{record.reviewState}</span></td>
                    <td>{new Date(record.reviewedAt || record.updatedAt).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <p className="sessionNote" style={{ marginTop: 24 }}>
          Inbox Outlaw does not automatically retrain a public model from your private email. It uses your saved decisions as account-specific review history and rule guidance.
        </p>
      </section>
    </main>
  );
}
