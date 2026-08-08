import { redirect } from 'next/navigation';
import { requireSessionUser } from '../../lib/auth';
import { listScamReportQueue } from '../../lib/scam-report-queue';

export const dynamic='force-dynamic';

export default async function ReportQueuePage(){
  let user;try{user=await requireSessionUser();}catch{redirect('/');}
  const items=await listScamReportQueue(user.email,150);
  const pending=items.filter(item=>item.status==='pending_review');
  const approved=items.filter(item=>item.status==='approved');
  return <main style={{maxWidth:1100,margin:'0 auto',padding:'32px 20px',color:'#eef2ff'}}>
    <p style={{letterSpacing:2,textTransform:'uppercase',fontSize:12,color:'#ff6b9a'}}>Inbox Outlaw</p>
    <h1>Scam Report Review Queue</h1>
    <p style={{maxWidth:760,color:'#b9c0d4'}}>Only strongly corroborated scam cases appear here. Nothing on this page is automatically submitted to Google, the FTC, law enforcement, or any outside service. Approval means the case is ready for report preparation and a final user-controlled submission step.</p>
    <section style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))',gap:12,margin:'24px 0'}}>
      <div style={{padding:16,border:'1px solid #30384d',borderRadius:12}}><small>Pending review</small><strong style={{display:'block',fontSize:28}}>{pending.length}</strong></div>
      <div style={{padding:16,border:'1px solid #30384d',borderRadius:12}}><small>Approved for preparation</small><strong style={{display:'block',fontSize:28}}>{approved.length}</strong></div>
      <div style={{padding:16,border:'1px solid #30384d',borderRadius:12}}><small>Total queued</small><strong style={{display:'block',fontSize:28}}>{items.length}</strong></div>
    </section>
    <div style={{display:'grid',gap:14}}>{items.length?items.map(item=><article key={item.id} style={{padding:18,border:'1px solid #30384d',borderRadius:14,background:'#111727'}}>
      <div style={{display:'flex',justifyContent:'space-between',gap:16,flexWrap:'wrap'}}><div><strong>{item.subject||'(no subject)'}</strong><div style={{color:'#aeb7cc',marginTop:4}}>{item.sender_email}</div></div><span>{item.status.replace('_',' ')}</span></div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(150px,1fr))',gap:8,marginTop:16,fontSize:14}}><div>Risk: <strong>{item.risk_score}/100</strong></div><div>Confidence: <strong>{item.confidence_score}%</strong></div><div>Shared indicators: <strong>{item.shared_evidence_count}</strong></div><div>Independent reporters: <strong>{item.independent_reporters}</strong></div></div>
      <p style={{color:'#aeb7cc',fontSize:13,marginTop:12}}>Queued {new Date(item.created_at).toLocaleString()}. External submission has not occurred.</p>
    </article>):<p>No cases currently meet the reporting-review threshold.</p>}</div>
  </main>;
}
