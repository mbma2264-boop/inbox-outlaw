'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import ActivityFeed from './ActivityFeed';
import ClassifierForm from './ClassifierForm';
import RecordsTable from './RecordsTable';
import type { ActivityLogEntry, GmailStatus, InboxSummary, StoredEmailRecord } from '../lib/types';

type SessionUser = { id?: string; email: string; isDemoUser: boolean };
type DashboardPayload = { records: StoredEmailRecord[]; summary: InboxSummary; sessionUser?: SessionUser };
type GmailSyncPayload = { importedCount: number; persistedCount: number; nextPageToken: string | null; records: StoredEmailRecord[]; summary: InboxSummary; sessionUser?: SessionUser };

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
      setLoading(true); setError(null);
      const response = await fetch('/api/email-records', { cache: 'no-store' });
      const payload = (await response.json().catch(() => null)) as ({ error?: string } & Partial<DashboardPayload>) | null;
      if (!response.ok) throw new Error(payload?.error || `Dashboard request returned ${response.status}`);
      setRecords((payload?.records || []) as StoredEmailRecord[]);
      setSummary((payload?.summary || emptySummary) as InboxSummary);
      setSessionUser((payload?.sessionUser as SessionUser | undefined) || null);
    } catch (err) { setError(err instanceof Error ? err.message : 'Unable to load dashboard'); }
    finally { setLoading(false); }
  }, []);

  const loadActivity = useCallback(async () => {
    try {
      const response = await fetch('/api/activity', { cache: 'no-store' });
      const payload = (await response.json().catch(() => null)) as { items?: ActivityLogEntry[]; error?: string } | null;
      if (!response.ok) throw new Error(payload?.error || `Activity request returned ${response.status}`);
      setActivity(payload?.items || []);
    } catch (err) { console.error(err); }
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
    } catch (err) { setGmailMessage(err instanceof Error ? err.message : 'Unable to load Gmail status'); }
    finally { setStatusLoading(false); }
  }, []);

  useEffect(() => { void Promise.all([loadDashboard(), loadGmailStatus(), loadActivity()]); }, [loadDashboard, loadGmailStatus, loadActivity]);
  useEffect(() => {
    if (gmailBanner === 'connected') { setGmailMessage('Gmail connected successfully.'); void createActivity('gmail_connected', 'Connected Gmail for inbox sync.'); }
    else if (gmailBanner === 'error') setGmailMessage(searchParams.get('message') || 'Gmail connection failed.');
  }, [createActivity, gmailBanner, searchParams]);

  async function onSeedDemo() {
    try {
      setSeeding(true); setError(null); setGmailMessage(null);
      const response = await fetch('/api/demo/seed', { method: 'POST' });
      const payload = (await response.json().catch(() => null)) as ({ error?: string; note?: string; records?: StoredEmailRecord[]; summary?: InboxSummary; activity?: ActivityLogEntry[]; sessionUser?: SessionUser }) | null;
      if (!response.ok) throw new Error(payload?.error || `Seed request returned ${response.status}`);
      setRecords(payload?.records || []); setSummary(payload?.summary || emptySummary); setActivity(payload?.activity || []); setSessionUser(payload?.sessionUser || sessionUser); setGmailMessage(payload?.note || 'Demo data loaded.');
    } catch (err) { setGmailMessage(err instanceof Error ? err.message : 'Unable to load demo data.'); }
    finally { setSeeding(false); }
  }

  async function onConnectGmail() {
    try {
      setConnecting(true); setGmailMessage(null);
      const response = await fetch(`/api/gmail/connect?return_to=${encodeURIComponent(window.location.href)}`);
      if (!response.ok) { const payload = (await response.json().catch(() => null)) as { error?: string } | null; throw new Error(payload?.error || `Connect request returned ${response.status}`); }
      const payload = (await response.json()) as { authorizationUrl: string }; window.location.href = payload.authorizationUrl;
    } catch (err) { setGmailMessage(err instanceof Error ? err.message : 'Unable to start Gmail connection.'); }
    finally { setConnecting(false); }
  }

  async function onDisconnectGmail() {
    try {
      setGmailMessage(null);
      const response = await fetch('/api/gmail/disconnect', { method: 'POST' });
      const payload = (await response.json().catch(() => null)) as { error?: string; note?: string } | null;
      if (!response.ok) throw new Error(payload?.error || `Disconnect request returned ${response.status}`);
      setGmailStatus((current) => current ? { ...current, connected: false, has_refresh_token: false, token_expiry: null, note: payload?.note || 'Gmail disconnected.' } : null);
      setGmailMessage(payload?.note || 'Gmail disconnected.'); await loadActivity();
    } catch (err) { setGmailMessage(err instanceof Error ? err.message : 'Unable to disconnect Gmail.'); }
  }

  async function onSyncGmail() {
    try {
      setSyncing(true); setError(null); setGmailMessage(null);
      const response = await fetch('/api/gmail/sync', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ limit: 10 }) });
      const payload = (await response.json().catch(() => null)) as ({ error?: string } & Partial<GmailSyncPayload>) | null;
      if (!response.ok) throw new Error(payload?.error || `Sync request returned ${response.status}`);
      const syncPayload = payload as GmailSyncPayload;
      setRecords(syncPayload.records); setSummary(syncPayload.summary); setSessionUser(syncPayload.sessionUser || sessionUser);
      setGmailMessage(`Imported ${syncPayload.importedCount} Gmail messages and saved ${syncPayload.persistedCount} records.`);
      await Promise.all([loadGmailStatus(), loadActivity()]);
    } catch (err) { setGmailMessage(err instanceof Error ? err.message : 'Unable to sync Gmail.'); }
    finally { setSyncing(false); }
  }

  const healthScore = summary.total ? Math.max(0, Math.round(100 - (summary.scams / summary.total) * 70)) : 100;

  return (
    <section className="dashboardStack referenceDashboard">
      <section className="referenceWelcome">
        <div>
          <h1>Welcome back, Michelle! <span aria-hidden="true">👋</span></h1>
          <p>Here&apos;s what&apos;s happening with your inbox today.</p>
        </div>
        <div className="syncCluster">
          <span className={`miniSyncStatus ${gmailStatus?.connected ? 'connected' : ''}`}>
            <i /> {statusLoading ? 'Checking Gmail' : gmailStatus?.connected ? 'Last sync active' : 'Gmail disconnected'}
          </span>
          <button className="syncNowButton" onClick={onSyncGmail} disabled={syncing || statusLoading || !gmailStatus?.connected}>
            {syncing ? 'Syncing…' : '↻ Sync Now'}
          </button>
        </div>
      </section>

      <section className="referenceMetricGrid">
        <article className="referenceMetric pinkMetric">
          <div className="referenceMetricIcon">✉</div>
          <div><span>Scams caught</span><strong>{summary.scams}</strong><small>{summary.scams ? 'Threats flagged for review' : 'No new scams — keep it up!'}</small></div>
          <b className="metricGhost">⌁</b>
        </article>
        <article className="referenceMetric greenMetric">
          <div className="referenceMetricIcon">◎</div>
          <div><span>Opportunities</span><strong>{summary.opportunities}</strong><small>{summary.opportunities === 1 ? '1 new opportunity found' : `${summary.opportunities} opportunities found`}</small></div>
          <b className="metricGhost">⌁</b>
        </article>
        <article className="referenceMetric roseMetric">
          <div className="referenceMetricIcon">♟</div>
          <div><span>Handled automatically</span><strong>{summary.handled}</strong><small>Saved you time and hassle</small></div>
          <b className="metricGhost">ϟ</b>
        </article>
        <article className="referenceMetric blueMetric">
          <div className="referenceMetricIcon">▣</div>
          <div><span>Total processed</span><strong>{summary.total}</strong><small>Imported from Gmail</small></div>
          <b className="metricGhost">⌁</b>
        </article>
      </section>

      <section className="referenceToolbar" id="settings">
        <div className="toolbarFilters">
          <a href="#inbox" className="active">▣ All Emails</a>
          <a href="#inbox">◇ Scams</a>
          <a href="#inbox">◎ Opportunities</a>
          <a href="#inbox">▤ Promotions</a>
          <a href="#inbox">▧ Updates</a>
          <a href="#inbox">◉ Social</a>
          <a href="#inbox">◌ Security</a>
        </div>
        <div className="toolbarActions">
          <span className="miniSearch">⌕ Search emails...</span>
          <span className="filterButton">Filters ▽</span>
        </div>
      </section>

      {error ? <div className="errorBanner">{error}</div> : null}
      {loading ? <div className="loadingSkeleton" /> : null}

      <RecordsTable records={records} />

      <section className="referenceFooterStats">
        <div><span>⌁</span><p><strong>Protected</strong><b>24/7</b><small>AI never sleeps</small></p></div>
        <div><span>◫</span><p><strong>Database Updated</strong><b>Daily</b><small>Latest scam intelligence</small></p></div>
        <div><span>♙</span><p><strong>You&apos;re In Control</strong><b>{healthScore}%</b><small>We give you the power</small></p></div>
        <div className="missionStat"><span>♡</span><p><strong>Inbox Outlaw Mission</strong><small>Make the internet safer, one inbox at a time.</small></p></div>
      </section>

      <section className="hiddenUtilityPanels">
        <div className="controlPanel">
          <div className="controlCopy"><span className="eyebrow">GMAIL CONTROL</span><h2>Sync and protect your inbox</h2><p>Read-only access is used to classify recent messages. Inbox Outlaw cannot send, delete, archive, or mark your mail as read.</p></div>
          <div className="controlActions">
            <button className="button" onClick={onSyncGmail} disabled={syncing || statusLoading || !gmailStatus?.connected}>{syncing ? 'Syncing…' : 'Sync latest inbox'}</button>
            <button className="button secondary" onClick={onConnectGmail} disabled={connecting}>{connecting ? 'Opening Google…' : gmailStatus?.connected ? 'Reconnect Gmail' : 'Connect Gmail'}</button>
            <button className="button secondary quiet" onClick={onSeedDemo} disabled={seeding || loading}>{seeding ? 'Loading…' : 'Load demo data'}</button>
            <button className="textButton" onClick={onDisconnectGmail} disabled={statusLoading || !gmailStatus?.connected}>Disconnect</button>
          </div>
          <div className="controlStatus">{gmailMessage || gmailStatus?.note || 'Ready.'}</div>
        </div>
        <div id="classifier"><ClassifierForm onSaved={async () => { await loadDashboard(); await loadActivity(); }} /></div>
        <div id="activity"><ActivityFeed items={activity} /></div>
      </section>
    </section>
  );
}
