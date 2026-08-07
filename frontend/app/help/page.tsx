import Link from 'next/link';
import { redirect } from 'next/navigation';
import { requireSessionUser } from '../../lib/auth';
import HelpCenterClient from './HelpCenterClient';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function HelpPage() {
  try {
    await requireSessionUser();
  } catch {
    redirect('/');
  }

  return (
    <main className="publicPage">
      <section className="card" style={{ maxWidth: 980, margin: '40px auto' }}>
        <span className="eyebrow">INBOX OUTLAW HELP CENTER</span>
        <h1>How can we help?</h1>
        <p className="subtle">Search setup instructions, inbox actions, reports, account controls, and scam-safety guidance.</p>
        <HelpCenterClient />

        <div className="controlPanel" style={{ marginTop: 28 }}>
          <div className="controlCopy">
            <h2>Need more help?</h2>
            <p>Include the screen you are on and the exact error message. Do not send passwords, verification codes, OAuth secrets, or payment information.</p>
          </div>
          <div className="controlActions">
            <a className="button secondary" href="mailto:support@inboxoutlaw.app?subject=Inbox%20Outlaw%20Support">Contact support</a>
            <Link className="button secondary" href="/settings">Open settings</Link>
            <Link className="button secondary" href="/dashboard">Return to dashboard</Link>
          </div>
        </div>
      </section>
    </main>
  );
}
