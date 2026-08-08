'use client';
import { useState } from 'react';
import type { ScamReportQueueItem } from '../lib/scam-report-queue';

export default function ReportQueueClient({initialItems}:{initialItems:ScamReportQueueItem[]}){
  const[items,setItems]=useState(initialItems);const[notice,setNotice]=useState('');const[saving,setSaving]=useState<string|null>(null);
  async function update(item:ScamReportQueueItem,status:'approved'|'dismissed'){
    try{setSaving(item.id);setNotice('');const r=await fetch('/api/scam-report-queue',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:item.id,status})});const p=await r.json().catch(()=>null) as {item?:ScamReportQueueItem;note?:string;error?:string}|null;if(!r.ok||!p?.item)throw new Error(p?.error||'Unable to update case.');setItems(current=>current.map(x=>x.id===item.id?p.item!:x));setNotice(p.note||'Updated.');}catch(e){setNotice(e instanceof Error?e.message:'Unable to update case.');}finally{setSaving(null);}
  }
  return <><div style={{display:'grid',gap:14}}>{items.length?items.map(item=><article key={item.id} style={{padding:18,border:'1px solid #30384d',borderRadius:14,background:'#111727'}}>
    <div style={{display:'flex',justifyContent:'space-between',gap:16,flexWrap:'wrap'}}><div><strong>{item.subject||'(no subject)'}</strong><div style={{color:'#aeb7cc',marginTop:4}}>{item.sender_email}</div></div><span>{item.status.replace('_',' ')}</span></div>
    <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(150px,1fr))',gap:8,marginTop:16,fontSize:14}}><div>Risk: <strong>{item.risk_score}/100</strong></div><div>Confidence: <strong>{item.confidence_score}%</strong></div><div>Shared indicators: <strong>{item.shared_evidence_count}</strong></div><div>Independent reporters: <strong>{item.independent_reporters}</strong></div></div>
    <p style={{color:'#aeb7cc',fontSize:13,marginTop:12}}>Queued {new Date(item.created_at).toLocaleString()}. External submission has not occurred.</p>
    <div style={{display:'flex',gap:10,flexWrap:'wrap',marginTop:12}}>{item.status==='pending_review'?<><button disabled={saving===item.id} onClick={()=>void update(item,'approved')} style={{padding:'10px 14px',borderRadius:10,border:'1px solid #38c991',background:'#153d32',color:'#eafff7'}}>Approve for preparation</button><button disabled={saving===item.id} onClick={()=>void update(item,'dismissed')} style={{padding:'10px 14px',borderRadius:10,border:'1px solid #e2637b',background:'#3b1d27',color:'#fff0f3'}}>Dismiss</button></>:null}{item.status==='approved'?<a href={`/report-package/${item.id}`} style={{padding:'10px 14px',borderRadius:10,border:'1px solid #6fa8ff',background:'#172c4d',color:'#eaf2ff',textDecoration:'none'}}>Prepare evidence package</a>:null}</div>
  </article>):<p>No cases currently meet the reporting-review threshold.</p>}</div>{notice?<p style={{marginTop:16,color:'#c9d5ee'}}>{notice}</p>:null}</>;
}
