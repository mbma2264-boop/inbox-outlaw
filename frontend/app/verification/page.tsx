import { redirect } from 'next/navigation';
import { requireSessionUser } from '../../lib/auth';
import { runClassificationVerification } from '../../lib/classification-verification';

export const dynamic = 'force-dynamic';

export default async function VerificationPage() {
  try { await requireSessionUser(); } catch { redirect('/'); }
  const report = runClassificationVerification();
  return (
    <main className="publicPage">
      <section className="card" style={{ maxWidth: 1100, margin: '40px auto' }}>
        <span className="eyebrow">CLASSIFIER VERIFICATION</span>
        <h1>Classification regression checks</h1>
        <p className="subtle">This page runs a fixed set of representative email cases through the current classifier and compares the output with the expected category.</p>
        <div className="referenceMetricGrid" style={{ marginTop: 24 }}>
          <article className="referenceMetric greenMetric"><div><span>Passed</span><strong>{report.passed}</strong><small>of {report.total} cases</small></div></article>
          <article className="referenceMetric blueMetric"><div><span>Pass rate</span><strong>{report.passRate}%</strong><small>Current verification set</small></div></article>
          <article className="referenceMetric roseMetric"><div><span>Failed</span><strong>{report.failed}</strong><small>Cases needing review</small></div></article>
        </div>
        <div className="recordsTableWrap" style={{ marginTop: 24 }}><table className="recordsTable modernTable"><thead><tr><th>Case</th><th>Expected</th><th>Actual</th><th>Risk</th><th>Confidence</th><th>Status</th></tr></thead><tbody>{report.results.map((result) => <tr key={result.name}><td><strong>{result.name}</strong></td><td>{result.expected}</td><td>{result.actual}</td><td>{result.risk}/100</td><td>{result.confidence}%</td><td>{result.passed ? 'PASS' : 'FAIL'}</td></tr>)}</tbody></table></div>
        <div className="controlActions" style={{ marginTop: 20 }}><a className="button secondary" href="/dashboard">Back to dashboard</a><a className="button secondary" href="/rules">Rules & Filters</a></div>
      </section>
    </main>
  );
}
