import Link from 'next/link';
import { redirect } from 'next/navigation';
import { requireSessionUser } from '../../lib/auth';
import { listSharedEvidence } from '../../lib/shared-scam-evidence';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function label(type:string){return type.replaceAll('_',' ').replace(/\b\w/g,(c)=>c.toUpperCase());}

export default async function EvidencePage(){
  try{await requireSessionUser();}catch{redirect('/');}
  const evidence=await listSharedEvidence(150).catch(()=>[]);
  const high=evidence.filter((item)=>item.confidence_level==='high').length;
  const medium=evidence.filter((item)=>item.confidence_level==='medium').length;
  const independentReports=evidence.reduce((sum,item)=>sum+item.independent_reporters,0);
  return <main className="publicPage"><section className="card" style={{maxWidth:1100,margin:'40px auto'}}>
    <span className="eyebrow">SHARED SCAM EVIDENCE</span><h1>Community Evidence Library</h1>
    <p className="subtle">Privacy-minimized scam intelligence built from user-confirmed scam reports. Full private email bodies and reporter identities are not stored in this shared library.</p>
    <div className="referenceMetricGrid" style={{marginTop:24}}><article className="referenceMetric pinkMetric"><div><span>Evidence indicators</span><strong>{evidence.length}</strong><small>Reusable technical indicators</small></div></article><article className="referenceMetric roseMetric"><div><span>High confidence</span><strong>{high}</strong><small>5+ independent reporters</small></div></article><article className="referenceMetric greenMetric"><div><span>Medium confidence</span><strong>{medium}</strong><small>3–4 independent reporters</small></div></article><article className="referenceMetric blueMetric"><div><span>Independent reports</span><strong>{independentReports}</strong><small>Aggregated reporter matches</small></div></article></div>
    <div className="controlPanel" style={{marginTop:24}}><div className="controlCopy"><h2>How confidence works</h2><p>One report is a weak supporting signal. Three independent reporters create a medium-confidence community signal. Five or more create a high-confidence signal. Community evidence supports classification but does not override contradictory technical evidence by itself.</p></div></div>
    <div className="recordsTableWrap" style={{marginTop:24}}><table className="recordsTable modernTable"><thead><tr><th>Evidence type</th><th>Indicator</th><th>Independent reporters</th><th>Total reports</th><th>Confidence</th><th>Last seen</th></tr></thead><tbody>{evidence.map((item)=><tr key={`${item.evidence_type}:${item.evidence_value}`}><td>{label(item.evidence_type)}</td><td><strong>{item.evidence_value}</strong></td><td>{item.independent_reporters}</td><td>{item.total_reports}</td><td><span className="categoryBadge">{item.confidence_level}</span></td><td>{item.last_seen_at?new Date(item.last_seen_at).toLocaleString():'—'}</td></tr>)}</tbody></table></div>
    {evidence.length===0?<div className="emptyState"><strong>No shared evidence yet</strong><p>The library will grow as users explicitly confirm scam messages.</p></div>:null}
    <div style={{marginTop:24,display:'flex',gap:12,flexWrap:'wrap'}}><Link className="button secondary" href="/dashboard">Back to dashboard</Link><Link className="button secondary" href="/verify">Classifier Verification</Link></div>
  </section></main>;
}
