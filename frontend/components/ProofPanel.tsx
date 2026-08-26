'use client';
import { useMemo,useState } from 'react';
import type { StoredEmailRecord } from '../lib/types';
import AddProofButton from './AddProofButton';

export default function ProofPanel({records}:{records:StoredEmailRecord[]}){
 const unique=useMemo(()=>{const seen=new Set<string>();return records.filter(r=>{const key=r.senderEmail.toLowerCase();if(seen.has(key))return false;seen.add(key);return true;});},[records]);
 const[selectedId,setSelectedId]=useState('');const selected=unique.find(r=>r.id===selectedId)||unique[0];
 return <section className="inboxPanel" id="proof"><div className="inboxToolbar"><div><span className="eyebrow">VERIFICATION PROOF</span><h2>Add real-world proof</h2><p className="subtle">Document payouts, purchases, receipts, account relationships, or independently verified identity. Proof adds context but cannot override failed authentication, mismatched senders, or dangerous links.</p></div></div>{selected?<><label>Select sender<select value={selected.id} onChange={e=>setSelectedId(e.target.value)}>{unique.map(r=><option key={r.id} value={r.id}>{r.senderName||r.senderEmail} — {r.senderEmail}</option>)}</select></label><AddProofButton record={selected}/></>:<div className="emptyState"><strong>No sender available yet</strong><p>Sync or classify an email before adding proof.</p></div>}</section>;
}
