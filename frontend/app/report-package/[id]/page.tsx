import { redirect } from 'next/navigation';
import { requireSessionUser } from '../../../lib/auth';
import { prepareScamReportPackage } from '../../../lib/scam-report-package';

export const dynamic='force-dynamic';

export default async function ReportPackagePage({params}:{params:Promise<{id:string}>}){
  let user;try{user=await requireSessionUser();}catch{redirect('/');}
  const{id}=await params;
  let pkg;try{pkg=await prepareScamReportPackage(user.email,id);}catch(error){return <main style={{maxWidth:900,margin:'0 auto',padding:'32px 20px',color:'#eef2ff'}}><h1>Evidence package unavailable</h1><p>{error instanceof Error?error.message:'Unable to prepare this case.'}</p><a href="/report-queue" style={{color:'#8bb8ff'}}>Back to report queue</a></main>;}
  return <main style={{maxWidth:900,margin:'0 auto',padding:'32px 20px',color:'#eef2ff'}}>
    <p style={{letterSpacing:2,textTransform:'uppercase',fontSize:12,color:'#ff6b9a'}}>Inbox Outlaw</p><h1>Scam Evidence Package</h1>
    <p style={{color:'#b9c0d4',maxWidth:760}}>{pkg.privacyNote}</p>
    <section style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))',gap:12,margin:'24px 0'}}><div style={{padding:16,border:'1px solid #30384d',borderRadius:12}}>Risk<strong style={{display:'block',fontSize:26}}>{pkg.classification.riskScore}/100</strong></div><div style={{padding:16,border:'1px solid #30384d',borderRadius:12}}>Confidence<strong style={{display:'block',fontSize:26}}>{pkg.classification.confidenceScore}%</strong></div><div style={{padding:16,border:'1px solid #30384d',borderRadius:12}}>Independent reporters<strong style={{display:'block',fontSize:26}}>{pkg.corroboration.independentReporters}</strong></div></section>
    <section style={{padding:18,border:'1px solid #30384d',borderRadius:14,background:'#111727',marginBottom:14}}><h2>Message details</h2><p><strong>Classification:</strong> {pkg.classification.category}</p><p><strong>Sender:</strong> {pkg.message.senderEmail}</p><p><strong>Sender domain:</strong> {pkg.message.senderDomain||'Unknown'}</p><p><strong>Subject:</strong> {pkg.message.subject}</p><p><strong>Received:</strong> {pkg.message.receivedAt?new Date(pkg.message.receivedAt).toLocaleString():'Unknown'}</p></section>
    <section style={{padding:18,border:'1px solid #30384d',borderRadius:14,background:'#111727',marginBottom:14}}><h2>Detected indicators</h2><p><strong>Link domains:</strong> {pkg.indicators.linkDomains.length?pkg.indicators.linkDomains.join(', '):'None extracted'}</p><p><strong>Wallet addresses:</strong> {pkg.indicators.wallets.length?pkg.indicators.wallets.join(', '):'None extracted'}</p><p><strong>Phone numbers:</strong> {pkg.indicators.phones.length?pkg.indicators.phones.join(', '):'None extracted'}</p><p><strong>Shared evidence matches:</strong> {pkg.corroboration.sharedEvidenceCount}</p></section>
    <section style={{padding:18,border:'1px solid #30384d',borderRadius:14,background:'#111727',marginBottom:14}}><h2>Relevant email excerpt</h2><p style={{whiteSpace:'pre-wrap',lineHeight:1.6}}>{pkg.suspiciousExcerpt||'No readable excerpt available.'}</p></section>
    <section style={{padding:18,border:'1px solid #30384d',borderRadius:14,background:'#111727',marginBottom:14}}><h2>Possible reporting destinations</h2><ul>{pkg.recommendedDestinations.map(destination=><li key={destination}>{destination}</li>)}</ul><p style={{color:'#b9c0d4'}}>Inbox Outlaw has not submitted this report anywhere. The user must review the package and choose the appropriate reporting destination.</p></section>
    <a href="/report-queue" style={{color:'#8bb8ff'}}>Back to report queue</a>
  </main>;
}
