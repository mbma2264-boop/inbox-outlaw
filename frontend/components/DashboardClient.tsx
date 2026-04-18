'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import ActivityFeed from './ActivityFeed';
import ClassifierForm from './ClassifierForm';
import RecordsTable from './RecordsTable';
import type { ActivityLogEntry, GmailStatus, InboxSummary, StoredEmailRecord } from '../lib/types';

type SessionUser = {
  id?: string;
  email: string;
  isDemoUser: boolean;
};

type DashboardPayload = {
  records: StoredEmailRecord[];
  summary: InboxSummary;
  sessionUser?: SessionUser;
};

type GmailSyncPayload = {
  importedCount: number;
  persistedCount: number;
  nextPageToken: string | null;
  records: StoredEmailRecord[];
  summary: InboxSummary;
  sessionUser?: SessionUser;
};

const emptySummary: InboxSummary = { total: 0, scams: 0, opportunities: 0, handled: 0 };

export default function DashboardClient() {
  const searchParams = useSearchParams();
  const gmailBanner = useMemo(() => searchParams.get('gmail'), [searchParams]);
  const [records, setRecords] = useState<StoredEmailRecord[]>([]);
  const [summary, setSummary] = useState<InboxSummary>(emptySummary);
  const [activity, setActivity] = useState<ActivityLogEntry[]>([]);
  const [sessionUser, setSessionUser] = useState<SessionUser | null>(null);
  const [gmailStatus, setGmailStatus] = useState<GmailStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [statusLoading, setStatusLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [gmailMessage, setGmailMessage] = useState<string | null>(null);

  const loadDashboard = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch('/api/email-records', { cache: 'no-store' });
      const payload = (await response.json().catch(() => null)) as ({ error?: string } & Partial<DashboardPayload>) | null;
      if (!response.ok) throw new Error(payload?.error || `Dashboard request returned ${response.status}`);
      setRecords((payload?.records || []) as StoredEmailRecord[]);
      setSummary((payload?.summary || emptySummary) as InboxSummary);
      setSessionUser((payload?.sessionUser as SessionUser | undefined) || null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load dashboard');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadActivity = useCallback(async () => {
    try {
      const response = await fetch('/api/activity', { cache: 'no-store' });
      const payload = (await response.json().catch(() => null)) as { items?: ActivityLogEntry[]; error?: string } | null;
      if (!response.ok) throw new Error(payload?.error || `Activity request returned ${response.status}`);
      setActivity(payload?.items || []);
    } catch (err) {
      console.error(err);
    }
  }, []);

  const createActivity = useCallback(async (type: ActivityLogEntry['type'], message: string, metadata?: Record<string, unknown>) => {
    await fetch('/api/activity', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type, message, metadata: metadata ?? null }) });
    await loadActivity();
  }, [loadActivity]);

  const loadGmailStatus = useCallback(async () => {
    try {
      setStatusLoading(true);
      const response = await fetch('/api/gmail/status', { cache: 'no-store' });
      const payload = (await response.json().catch(() => null)) as (GmailStatus & { error?: string }) | null;
      if (!response.ok) throw new Error(payload?.error || `Gmail status returned ${response.status}`);
      setGmailStatus(payload as GmailStatus);
    } catch (err) {
      setGmailMessage(err instanceof Error ? err.message : 'Unable to load Gmail status');
    } finally {
      setStatusLoading(false);
    }
  }, []);

  useEffect(() => {
    void Promise.all([loadDashboard(), loadGmailStatus(), loadActivity()]);
  }, [loadDashboard, loadGmailStatus, loadActivity]);

  useEffect(() => {
    if (gmailBanner === 'connected') {
      setGmailMessage('Gmail connected successfully.');
      void createActivity('gmail_connected', 'Connected Gmail for inbox sync.');
    } else if (gmailBanner === 'error') {
      setGmailMessage(searchParams.get('message') || 'Gmail connection failed.');
    }
  }, [createActivity, gmailBanner, searchParams]);

  async function onSeedDemo() {
    try {
      setSeeding(true);
      setError(null);
      setGmailMessage(null);
      const response = await fetch('/api/demo/seed', { method: 'POST' });
      const payload = (await response.json().catch(() => null)) as ({ error?: string; note?: string; records?: StoredEmailRecord[]; summary?: InboxSummary; activity?: ActivityLogEntry[]; sessionUser?: SessionUser; }) | null;
      if (!response.ok) throw new Error(payload?.error || `Seed request returned ${response.status}`);
      setRecords(payload?.records || []);
      setSummary(payload?.summary || emptySummary);
      setActivity(payload?.activity || []);
      setSessionUser(payload?.sessionUser || sessionUser);
      setGmailMessage(payload?.note || 'Demo data loaded.');
    } catch (err) {
      setGmailMessage(err instanceof Error ? err.message : 'Unable to load demo data.');
    } finally {
      setSeeding(false);
    }
  }

  async function onConnectGmail() {
    try {
      setConnecting(true);
      setGmailMessage(null);
      const response = await fetch(`/api/gmail/connect?return_to=${encodeURIComponent(window.location.href)}`);
      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(payload?.error || `Connect request returned ${response.status}`);
      }
      const payload = (await response.json()) as { authorizationUrl: string };
      window.location.href = payload.authorizationUrl;
    } catch (err) {
      setGmailMessage(err instanceof Error ? err.message : 'Unable to start Gmail connection.');
    } finally {
      setConnecting(false);
    }
  }

  async function onDisconnectGmail() {
    try {
      setGmailMessage(null);
      const response = await fetch('/api/gmail/disconnect', { method: 'POST' });
      const payload = (await response.json().catch(() => null)) as { error?: string; note?: string } | null;
      if (!response.ok) throw new Error(payload?.error || `Disconnect request returned ${response.status}`);
      setGmailStatus((current) => current ? { ...current, connected: false, has_refresh_token: false, token_expiry: null, note: payload?.note || 'Gmail disconnected.' } : null);
      setGmailMessage(payload?.note || 'Gmail disconnected.');
      await loadActivity();
    } catch (err) {
      setGmailMessage(err instanceof Error ? err.message : 'Unable to disconnect Gmail.');
    }
  }

  async function onSyncGmail() {
    try {
      setSyncing(true);
      setError(null);
      setGmailMessage(null);
      const response = await fetch('/api/gmail/sync', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ limit: 10 }) });
      const payload = (await response.json().catch(() => null)) as ({ error?: string } & Partial<GmailSyncPayload>) | null;
      if (!response.ok) throw new Error(payload?.error || `Sync request returned ${response.status}`);
      const syncPayload = payload as GmailSyncPayload;
      setRecords(syncPayload.records);
      setSummary(syncPayload.summary);
      setSessionUser(syncPayload.sessionUser || sessionUser);
      setGmailMessage(`Imported ${syncPayload.importedCount} Gmail messages and persisted ${syncPayload.persistedCount} records.`);
      await Promise.all([loadGmailStatus(), loadActivity()]);
    } catch (err) {
      setGmailMessage(err instanceof Error ? err.message : 'Unable to sync Gmail.');
    } finally {
      setSyncing(false);
    }
  }

  return (
    <section style={{ display: 'grid', gap: 24 }}>
      <div className="panel" style={{ display: 'flex', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        <div>
          <h2 style={{ marginBottom: 6 }}>Signed in</h2>
          <p className="subtle" style={{ marginBottom: 0 }}>{sessionUser?.email || 'Loading user...'}{sessionUser?.isDemoUser ? ' · demo account' : ''}</p>
        </div>
        <form action="/api/auth/logout" method="post"><button className="button secondary" type="submit">Log out</button></form>
      </div>
      <section className="grid" style={{ marginBottom: 0 }}>
        <div className="card"><h3>Scams caught</h3><p>{summary.scams}</p></div>
        <div className="card"><h3>Opportunities found</h3><p>{summary.opportunities}</p></div>
        <div className="card"><h3>Handled automatically</h3><p>{summary.handled}</p></div>
      </section>
      <div className="panel">
        <h2>Gmail sync</h2>
        <p>Connect Gmail once, then pull the latest inbox messages for <strong>{sessionUser?.email || 'your signed-in account'}</strong> into that user's classified record store.</p>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 16 }}>
          <button className="button secondary" onClick={onSeedDemo} disabled={seeding || loading}>{seeding ? 'Loading sample inbox...' : 'Load demo sample data'}</button>
          <button className="button" onClick={onConnectGmail} disabled={connecting}>{connecting ? 'Opening Google consent...' : gmailStatus?.connected ? 'Reconnect Gmail' : 'Connect Gmail'}</button>
          <button className="button secondary" onClick={onSyncGmail} disabled={syncing || statusLoading || !gmailStatus?.connected}>{syncing ? 'Syncing latest inbox...' : 'Sync latest inbox'}</button>
          <button className="button secondary" onClick={onDisconnectGmail} disabled={statusLoading || !gmailStatus?.connected}>Disconnect Gmail</button>
        </div>
        <div style={{ marginTop: 16 }}>
          <div className="subtle">{statusLoading ? 'Checking Gmail connection...' : gmailStatus?.note || 'Gmail status is unavailable.'}</div>
          {gmailStatus?.token_expiry ? <div className="subtle">Access token refreshes automatically. Current token expiry: {new Date(gmailStatus.token_expiry).toLocaleString()}</div> : null}
          {gmailMessage ? <p style={{ color: '#b8baff' }}>{gmailMessage}</p> : null}
        </div>
      </div>
      {error ? <p style={{ color: '#ff8ea1' }}>Error: {error}</p> : null}
      {loading ? <p className="subtle">Loading saved inbox records…</p> : null}
      <ClassifierForm onSaved={async () => { await loadDashboard(); await loadActivity(); }} />
      <RecordsTable records={records} />
      <ActivityFeed items={activity} />
    </section>
  );
}
