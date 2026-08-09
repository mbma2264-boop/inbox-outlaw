'use client';

import { useMemo, useState } from 'react';

type Props={queueId:string;subject:string;senderEmail:string;riskScore:number;confidenceScore:number;excerpt:string;linkDomains:string[];wallets:string[];phones:string[];status:string};

const destinations=[
  {id:'ftc',label:'FTC ReportFraud',url:'https://reportfraud.ftc.gov/',description:'Consumer scams, impersonation, payment fraud, fake prizes, grants, and deceptive business practices.'},
  {id:'ic3',label:'FBI IC3',url:'https://www.ic3.gov/Home/ComplaintChoice',description:'Cyber-enabled crime, online financial fraud, crypto scams, account compromise, and related internet crime.'},
] as const;

export default function ReportSubmissionControls(props:Props){
 const[notice,setNotice]=useState('');const[saving,setSaving]=useState(false);
 const summary=useMemo(()=>[
   'Inbox Outlaw Scam Evidence Summary',
   `Subject: ${props.subject}`,
   `Sender: ${props.senderEmail}`,
   `Risk score: ${props.riskScore}/100`,
   `Confidence: ${props.confidenceScore}%`,
   props.linkDomains.length?`Link domains: ${props.linkDomains.join(', ')}`:'Link domains: none extracted',
   props.wallets.length?`Wallet addresses: ${props.wallets.join(', ')}`:'Wallet addresses: none extracted',
   props.phones.length?`Phone numbers: ${props.phones.join(', ')}`:'Phone numbers: none extracted',
   '',
   'Relevant excerpt:',
   props.excerpt,
 ].join('\n'),[props]);
 async function copySummary(){try{await navigator.clipboard.writeText(summary);setNotice('Evidence summary copied. Paste it into the official report form after reviewing it.');}catch{setNotice('Unable to copy automatically. Select and copy the evidence package manually.');}}
 async function markSubmitted(destination:string){if(!window.confirm(`Confirm that you personally completed the external report to ${destination}. Inbox Outlaw will only record that status; it will not send anything.`))return;try{setSaving(true);setNotice('Saving submission status…');const response=await fetch('/api/scam-report-queue',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:props.queueId,status:'submitted',destination,confirmExternalSubmission:true})});const payload=await response.json().catch(()=>null) as {error?:string;note?:string}|null;if(!response.ok)throw new Error(payload?.error||'Unable to save submission status.');setNotice(payload?.note||'Submission status saved.');}catch(error){setNotice(error instanceof Error?error.message:'Unable to save submission status.');}finally{setSaving(false);}}
 return <section style={{padding:18,border:'1px solid #30384d',borderRadius:14,background:'#111727',marginBottom:14}}>
   <h2>Final user-controlled reporting</h2>
   <p style={{color:'#b9c0d4'}}>Inbox Outlaw does not submit reports for you. Open the official destination, review the evidence, complete that agency&apos;s form yourself, then return here and mark it submitted.</p>
   <button type="button" onClick={()=>void copySummary()} style={{padding:'10px 14px',borderRadius:10,border:'1px solid #4a5878',background:'#172238',color:'#eef2ff',cursor:'pointer',marginBottom:14}}>Copy evidence summary</button>
   <div style={{display:'grid',gap:12}}>{destinations.map(d=><article key={d.id} style={{padding:14,border:'1px solid #30384d',borderRadius:12}}><strong>{d.label}</strong><p style={{color:'#b9c0d4',fontSize:14}}>{d.description}</p><div style={{display:'flex',gap:10,flexWrap:'wrap'}}><a href={d.url} target="_blank" rel="noreferrer" style={{padding:'9px 12px',borderRadius:9,background:'#234a72',color:'#fff',textDecoration:'none'}}>Open official site</a><button disabled={saving||props.status==='submitted'} onClick={()=>void markSubmitted(d.label)} style={{padding:'9px 12px',borderRadius:9,border:'1px solid #4a5878',background:'#172238',color:'#fff',cursor:'pointer'}}>{props.status==='submitted'?'Already marked submitted':'I submitted this report'}</button></div></article>)}</div>
   <div style={{marginTop:12,padding:12,borderRadius:10,background:'#151d2c',fontSize:13,color:'#c9d1e3'}}><strong>Gmail:</strong> For a phishing email in Gmail, use Gmail&apos;s built-in <em>Report phishing</em> or <em>Report spam</em> action on the original message. Inbox Outlaw does not perform that Gmail action yet.</div>
   {notice?<p style={{marginTop:12,color:'#9ed0ff'}}>{notice}</p>:null}
 </section>;
}
