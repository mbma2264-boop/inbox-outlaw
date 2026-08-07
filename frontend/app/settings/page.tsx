import Link from 'next/link';
import { redirect } from 'next/navigation';
import { requireSessionUser } from '../../lib/auth';
import { readStoredTokens } from '../../lib/gmail-local';
import SettingsClient from './SettingsClient';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function SettingsPage() {
  let user;
  try {
    user = await requireSessionUser();
  } catch {
    redirect('/');
  }

  const tokens = await readStoredTokens();
  const gmailConnected = Boolean(tokens?.access_token || tokens?.refresh_token);

  return (
    <main className="publicPage">
      <section className="card" style={{ maxWidth: 980, margin: '40px auto' }}>
        <span className="eyebrow">INBOX OUTLAW SETTINGS</span>
        <h1>Account & protection settings</h1>
        <p className="subtle">Manage Gmail access, synchronization, protection preferences, exports, and your current session.</p>
        <SettingsClient email={user.email} gmailConnected={gmailConnected} />
        <div style={{ marginTop: 24 }}><Link className="button secondary" href="/dashboard">Back to Inbox Outlaw</Link></div>
      </section>
    </main>
  );
}
