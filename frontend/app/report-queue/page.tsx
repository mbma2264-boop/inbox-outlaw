import { redirect } from 'next/navigation';
import { requireSessionUser } from '../../lib/auth';
import { listScamReportQueue } from '../../lib/scam-report-queue';
import ReportQueueClient from '../../components/ReportQueueClient';

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
    <ReportQueueClient initialItems={items}/>
  </main>;
}
