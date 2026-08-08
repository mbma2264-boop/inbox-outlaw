'use client';

import { useRef, useState } from 'react';

type SyncPayload = {
  importedCount?: number;
  persistedCount?: number;
  nextPageToken?: string | null;
  hasMore?: boolean;
  error?: string;
  needsReconnect?: boolean;
};

const PAGE_SIZE = 25;
const MAX_PAGES_PER_RUN = 10;

export default function ScanEntireInbox() {
  const [running, setRunning] = useState(false);
  const [scanned, setScanned] = useState(0);
  const [pages, setPages] = useState(0);
  const [message, setMessage] = useState('');
  const stopRequested = useRef(false);

  async function startScan() {
    setRunning(true);
    setScanned(0);
    setPages(0);
    setMessage('Starting inbox scan…');
    stopRequested.current = false;

    let pageToken: string | null = null;
    let totalScanned = 0;
    let completedPages = 0;
    let moreAvailable = true;

    try {
      while (moreAvailable && completedPages < MAX_PAGES_PER_RUN && !stopRequested.current) {
        setMessage(`Scanning inbox page ${completedPages + 1}…`);
        const response = await fetch('/api/gmail/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          cache: 'no-store',
          body: JSON.stringify({ limit: PAGE_SIZE, pageToken }),
        });
        const payload = await response.json().catch(() => null) as SyncPayload | null;
        if (!response.ok) throw new Error(payload?.error || 'Unable to continue inbox scan.');

        totalScanned += Number(payload?.importedCount || 0);
        completedPages += 1;
        pageToken = payload?.nextPageToken || null;
        moreAvailable = Boolean(pageToken);
        setScanned(totalScanned);
        setPages(completedPages);
      }

      if (stopRequested.current) {
        setMessage(`Stopped after ${totalScanned} messages. Everything already scanned was saved.`);
      } else if (moreAvailable) {
        setMessage(`Scanned ${totalScanned} messages. More inbox history remains; run Scan Entire Inbox again to continue safely.`);
      } else {
        setMessage(`Inbox scan complete. ${totalScanned} messages were scanned in this run.`);
      }

      window.dispatchEvent(new Event('inbox-records-updated'));
      window.setTimeout(() => window.location.reload(), 1200);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to scan the inbox.');
    } finally {
      setRunning(false);
    }
  }

  return (
    <section className="controlPanel" style={{ marginTop: 18 }}>
      <div className="controlCopy">
        <span className="eyebrow">LARGE INBOX SCAN</span>
        <h2>Scan Entire Inbox</h2>
        <p>Automatically scans Gmail in batches of 25. For safety and reliability, each run stops after 250 messages and saves progress as it goes.</p>
      </div>
      <div className="controlActions">
        <button className="button" type="button" disabled={running} onClick={() => void startScan()}>{running ? 'Scanning inbox…' : 'Scan Entire Inbox'}</button>
        {running ? <button className="button secondary" type="button" onClick={() => { stopRequested.current = true; setMessage('Stopping after the current batch…'); }}>Stop after current batch</button> : null}
      </div>
      {(running || message) ? <div className="controlStatus">{message}{pages > 0 ? ` • ${pages} batch${pages === 1 ? '' : 'es'} • ${scanned} messages` : ''}</div> : null}
    </section>
  );
}
