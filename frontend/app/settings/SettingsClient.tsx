'use client';

import { useEffect, useState } from 'react';

export default function SettingsClient({ email, gmailConnected }: { email: string; gmailConnected: boolean }) {
  const [dailyAlerts, setDailyAlerts] = useState(true);
  const [autoSync, setAutoSync] = useState(false);
  const [lastSync, setLastSync] = useState<string | null>(null);
  const [status, setStatus] = useState('');
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    setDailyAlerts(window.localStorage.getItem('inbox-outlaw-daily-alerts') !== 'false');
    setAutoSync(window.localStorage.getItem('inbox-outlaw-auto-sync') === 'true');
    setLastSync(window.localStorage.getItem('inbox-outlaw-last-auto-sync'));
  }, []);

  function savePreference(key: string, value: boolean) {
    window.localStorage.setItem(key, String(value));
    setStatus('Preference saved.');
  }

  async function syncNow() {
    setSyncing(true);
    setStatus('Syncing Gmail…');
    try {
      const response = await fetch('/api/gmail/sync', { method: 'POST', headers: { 'Content-Type': 'application/json' }, cache: 'no-store', body: JSON.stringify({ limit: 10 }) });
      const payload = await response.json().catch(() => null) as { error?: string; importedCount?: number; needsReconnect?: boolean } | null;
      if (!response.ok) throw new Error(payload?.error || 'Unable to sync Gmail.');
      const now = new Date().toISOString();
      window.localStorage.setItem('inbox-outlaw-last-auto-sync', now);
      setLastSync(now);
      setStatus(`Gmail synced. ${payload?.importedCount ?? 0} messages checked.`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Unable to sync Gmail.');
    } finally {
      setSyncing(false);
    }
  }

  return (
    <>
      <div className="controlPanel" style={{ marginTop: 24 }}>
        <div className="controlCopy"><h2>Gmail connection</h2><p>Connected account: {email}</p></div>
        <div className="controlActions">
          <span className="button secondary">{gmailConnected ? 'Gmail connected' : 'Gmail needs connection'}</span>
          <a className="button secondary" href="/api/auth/google?returnTo=/settings">{gmailConnected ? 'Reconnect Gmail' : 'Connect Gmail'}</a>
          <button className="button secondary" type="button" disabled={syncing || !gmailConnected} onClick={() => void syncNow()}>{syncing ? 'Syncing…' : 'Sync Gmail now'}</button>
          {gmailConnected ? <a className="button secondary" href="/api/gmail/disconnect">Disconnect Gmail</a> : null}
        </div>
        <div className="controlStatus">Read-only Gmail access. Inbox Outlaw cannot send, delete, archive, or mark Gmail messages as read. {lastSync ? `Last successful sync: ${new Date(lastSync).toLocaleString()}.` : ''}</div>
      </div>

      <div className="controlPanel" style={{ marginTop: 24 }}>
        <div className="controlCopy"><h2>Protection preferences</h2><p>Choose how Inbox Outlaw keeps your saved inbox information current.</p></div>
        <div className="controlActions">
          <button type="button" className="button secondary" onClick={() => { const next = !dailyAlerts; setDailyAlerts(next); savePreference('inbox-outlaw-daily-alerts', next); }}>{dailyAlerts ? 'Daily alerts enabled' : 'Daily alerts disabled'}</button>
          <button type="button" className="button secondary" onClick={() => { const next = !autoSync; setAutoSync(next); savePreference('inbox-outlaw-auto-sync', next); }}>{autoSync ? 'Auto-sync every 5 minutes' : 'Auto-sync is off'}</button>
        </div>
        {status ? <div className="controlStatus">{status}</div> : null}
      </div>

      <div className="controlPanel" style={{ marginTop: 24 }}>
        <div className="controlCopy"><h2>Your data</h2><p>Download a copy of your saved classification and review records.</p></div>
        <div className="controlActions"><a className="button secondary" href="/api/reports/export">Download CSV report</a></div>
        <div className="controlStatus">Disconnecting Gmail removes the Gmail authorization cookie from this browser. Previously saved Inbox Outlaw records remain available for your account.</div>
      </div>

      <div className="controlPanel" style={{ marginTop: 24 }}>
        <div className="controlCopy"><h2>Account</h2><p>Securely end your current Inbox Outlaw session.</p></div>
        <div className="controlActions"><a className="button secondary" href="/api/auth/logout">Log out securely</a><a className="button secondary" href="/dashboard">Return to dashboard</a></div>
      </div>
    </>
  );
}
