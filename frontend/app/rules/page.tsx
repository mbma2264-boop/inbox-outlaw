import Link from 'next/link';
import { redirect } from 'next/navigation';
import { requireSessionUser } from '../../lib/auth';

export const dynamic = 'force-dynamic';

const rules = [
  ['Urgency and pressure', 'Detects phrases such as urgent, act now, final notice, immediately, and limited time.'],
  ['High-risk payments', 'Raises risk for gift cards, crypto, wallet transfers, wire transfers, and Cash App requests.'],
  ['Account security requests', 'Flags password, login, verification, suspension, and unexpected security-alert language.'],
  ['Unexpected money', 'Detects prize, grant, compensation, inheritance, lottery, and winner claims.'],
  ['Authority impersonation', 'Looks for government, IRS, Social Security, Department of Justice, and similar authority language.'],
  ['Financial offers', 'Reviews loan, financing, investment, guaranteed profit, and return claims.'],
  ['Sender history', 'Your Safe Senders and Blocked Senders decisions override the general inbox view for that sender.'],
  ['Manual review', 'Low-confidence classifications remain available for your decision instead of being treated as certain.'],
];

export default async function RulesPage() {
  try {
    await requireSessionUser();
  } catch {
    redirect('/');
  }

  return (
    <main className="publicPage">
      <section className="card" style={{ maxWidth: 980, margin: '40px auto' }}>
        <span className="eyebrow">RULES & FILTERS</span>
        <h1>How Inbox Outlaw reviews email</h1>
        <p className="subtle">These rules explain the warning signals used alongside the email classifier and your saved sender decisions.</p>

        <div style={{ display: 'grid', gap: 14, marginTop: 24 }}>
          {rules.map(([title, description]) => (
            <article key={title} style={{ border: '1px solid rgba(255,255,255,0.1)', borderRadius: 16, padding: 18 }}>
              <h3 style={{ marginTop: 0 }}>{title}</h3>
              <p className="subtle" style={{ marginBottom: 0 }}>{description}</p>
            </article>
          ))}
        </div>

        <div className="controlPanel" style={{ marginTop: 24 }}>
          <div className="controlCopy">
            <h2>Your decisions train your inbox</h2>
            <p>Mark individual emails safe, scam, or opportunity. Add a sender to Safe Senders or Blocked Senders when the same decision should apply to all saved messages from that address.</p>
          </div>
          <div className="controlActions">
            <Link className="button" href="/dashboard">Return to dashboard</Link>
          </div>
        </div>
      </section>
    </main>
  );
}
