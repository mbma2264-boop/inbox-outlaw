'use client';

import { useMemo, useState } from 'react';

const topics = [
  { title: 'Connect Gmail', body: 'Open Settings, choose Connect Gmail, then approve read-only Gmail access. Inbox Outlaw cannot send, delete, archive, or mark messages as read.' },
  { title: 'Sync your inbox', body: 'Use Sync Gmail now to check the latest messages. Auto-sync can also run every five minutes while the dashboard is open.' },
  { title: 'Understand risk scores', body: 'Risk scores range from 0 to 100. Higher scores mean more warning signals were found. Always review the explanation before acting.' },
  { title: 'Understand confidence', body: 'Confidence shows how certain the classifier is about its category. Lower confidence means the message deserves closer manual review.' },
  { title: 'Mark an email safe', body: 'Open the message analysis and choose Mark email safe. This saves your decision for that message inside Inbox Outlaw.' },
  { title: 'Report an email as a scam', body: 'Open the message analysis and choose Report email scam. The report is saved to your Inbox Outlaw account and appears in Scam Alerts.' },
  { title: 'Safe Senders', body: 'Choose Add sender to Safe Senders to apply a safe decision to saved messages from that sender. This does not change Gmail itself.' },
  { title: 'Blocked Senders', body: 'Choose Add sender to Blocked Senders to flag saved messages from that sender inside Inbox Outlaw. It does not block delivery in Gmail.' },
  { title: 'Undo a decision', body: 'Open the analyzed message and choose Undo current decision. The saved review is removed and the change persists after refresh.' },
  { title: 'Save an opportunity', body: 'Use Save opportunity for legitimate business or affiliate messages you want to keep. They appear in the Opportunities view.' },
  { title: 'Search and filters', body: 'Use the search box for sender names, email addresses, subjects, or message text. Sidebar views filter scams, opportunities, safe senders, and blocked senders.' },
  { title: 'Reports and exports', body: 'Open Reports to view totals, average risk, review decisions, and download a CSV copy of saved records.' },
  { title: 'Rules and filters', body: 'The Rules & Filters page explains the warning signals used for urgency, payment methods, account verification, impersonation, prizes, and financial offers.' },
  { title: 'AI Training History', body: 'This page shows your saved corrections and decisions. Private emails are not used to retrain a public AI model.' },
  { title: 'Disconnect Gmail', body: 'Open Settings and choose Disconnect Gmail. This removes Gmail authorization from the current browser while leaving saved Inbox Outlaw records intact.' },
  { title: 'A sync error says reconnect', body: 'Open Settings and choose Reconnect Gmail. Approve read-only access again, then run Sync Gmail now.' },
  { title: 'A message looks suspicious', body: 'Do not click links, send money, share passwords, provide verification codes, or open accounts until the sender is independently verified.' },
];

export default function HelpCenterClient() {
  const [query, setQuery] = useState('');
  const filtered = useMemo(() => {
    const value = query.trim().toLowerCase();
    if (!value) return topics;
    return topics.filter((topic) => `${topic.title} ${topic.body}`.toLowerCase().includes(value));
  }, [query]);

  return (
    <>
      <label className="globalSearch" style={{ display: 'flex', marginTop: 24 }}>
        <span>⌕</span>
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search help topics..." />
      </label>

      <div style={{ display: 'grid', gap: 14, marginTop: 24 }}>
        {filtered.map((topic) => (
          <details key={topic.title} className="card" style={{ padding: 18 }}>
            <summary style={{ cursor: 'pointer', fontWeight: 700 }}>{topic.title}</summary>
            <p className="subtle" style={{ marginTop: 12 }}>{topic.body}</p>
          </details>
        ))}
        {filtered.length === 0 ? <div className="emptyState"><strong>No matching help topic</strong><p>Try a different word or contact support.</p></div> : null}
      </div>
    </>
  );
}
