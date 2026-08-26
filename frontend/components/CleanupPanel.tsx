'use client';
import { useMemo } from 'react';
import { evaluateCleanup } from '../lib/cleanup-gate';
import type { StoredEmailRecord } from '../lib/types';

export default function CleanupPanel({records}:{records:StoredEmailRecord[]}){
 const decisions=useMemo(()=>records.map(record=>({record,decision:evaluateCleanup(record)})),[records]);
 const cleared=decisions.filter(x=>x.decision.eligible&&x.decision.bucket==='spam_cleanup');
 const quarantined=decisions.filter(x=>x.decision.bucket==='scam_quarantine');
 const review=decisions.filter(x=>x.decision.bucket==='review');
 return <section className="inboxPanel" id="cleanup"><div className="inboxToolbar"><div><span className="eyebrow">SAFE CLEANUP</span><h2>{cleared.length} messages cleared for cleanup</h2><p className="subtle">These messages passed the strict cleanup gate. Nothing is deleted automatically during beta.</p></div></div><div className="referenceMetricGrid"><article className="referenceMetric greenMetric"><div><span>Cleanup eligible</span><strong>{cleared.length}</strong><small>High-confidence bulk mail only</small></div></article><article className="referenceMetric pinkMetric"><div><span>Scam quarantine</span><strong>{quarantined.length}</strong><small>Preserve evidence before removal</small></div></article><article className="referenceMetric blueMetric"><div><span>Needs review</span><strong>{review.length}</strong><small>Not safe to clear automatically</small></div></article></div>{cleared.length?<div className="recordsTableWrap"><table className="recordsTable modernTable"><thead><tr><th>Sender</th><th>Subject</th><th>Why cleared</th><th>Confidence</th></tr></thead><tbody>{cleared.map(({record,decision})=><tr key={record.id}><td>{record.senderName||record.senderEmail}<small>{record.senderEmail}</small></td><td>{record.subject}</td><td>{decision.reasons.join(' ')}</td><td>{decision.confidence}%</td></tr>)}</tbody></table></div>:<div className="emptyState"><strong>No messages are safe-cleanup eligible yet</strong><p>Inbox Outlaw will keep uncertain mail visible rather than risk removing something important.</p></div>}<p className="subtle">Beta safeguard: deletion and spam-report actions remain disabled until cleanup accuracy is validated against real inboxes.</p></section>;
}
