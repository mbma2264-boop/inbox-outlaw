'use client';

import { useMemo, useState } from 'react';

type Props={queueId:string;subject:string;senderEmail:string;riskScore:number;confidenceScore:number;excerpt:string;linkDomains:string[];wallets:string[];phones:string[];status:string};

type Destination={id:string;label:string;url:string;description:string;whenToUse:string};

const destinations:Destination[]=[
  {id:'ftc',label:'FTC ReportFraud',url:'https://reportfraud.ftc.gov/',description:'Consumer scams, impersonation, fake prizes or grants, payment fraud, and deceptive business practices.',whenToUse:'Best general destination for consumer fraud and impersonation scams.'},
  {id:'ic3',label:'FBI IC3',url:'https://www.ic3.gov/Home/ComplaintChoice',description:'Cyber-enabled crime, online financial fraud, crypto scams, account compromise, and related internet crime.',whenToUse:'Use when the scam involves online crime, financial loss, cryptocurrency, account compromise, or other cyber-enabled activity.'},
];

export default function ReportSubmissionControls(props:Props){
 const[notice,setNotice]=useState('');const[saving,setSaving]=useState(false);const[selected,setSelected]=useState('');
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
 async function copySummary(){try{await navigator.clipboard.writeText(summary);setNotice('Evidence summary copied. Review it, then paste it into the official report form.');}catch{setNotice('Unable to copy automatically. Select and copy the evidence package manually.');}}
 function openDestination(destination:Destination){setSelected(destination.id);window.open(destination.url,'_blank','noopener,noreferrer');setNotice(`${destination.label} opened in a new tab. Complete the official form there, then return here to record that you submitted it.`);}
 async function markSubmitted(destination:Destination){if(selected!==destination.id){setNotice(`Open ${destination.label} first. Inbox Outlaw will not record a submission until you have been sent to the official reporting site.`);return;}if(!window.confirm(`Confirm that you personally completed the external report to ${destination.label}. Inbox Outlaw will only record that status; it did not send the report.`))return;try{setSaving(true);setNotice('Saving submission status…');const response=await fetch('/api/scam-report-queue',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:props.queueId,status:'submitted',destination:destination.label,confirmExternalSubmission:true})});const payload=await response.json().catch(()=>null) as {error?:string;note?:string}|null;if(!response.ok)throw new Error(payload?.error||'Unable to save submission status.');setNotice(payload?.note||`Recorded as submitted to ${destination.label}.`);}catch(error){setNotice(error instanceof Error?error.message:'Unable to save submission status.');}finally{setSaving(false);}}
 const alreadySubmitted=props.status==='submitted';
 return <section style={{padding:18,border:'1px solid #30384d',borderRadius:14,background:'#111727',marginBottom:14}}>
   <h2>Report this scam</h2>
   <p style={{color:'#b9c0d4'}}>Inbox Outlaw prepares the evidence. You remain in control of the external report: copy the evidence, open the appropriate official destination, submit its form, then return here to record completion.</p>
   <div style={{padding:12,borderRadius:10,background:'#151d2c',marginBottom:14,color:'#c9d1e3'}}><strong>1. Copy evidence</strong><br/>Review the summary before submitting it. Inbox Outlaw intentionally leaves out unrelated inbox content and account credentials.</div>
   <button type="button" onClick={()=>void copySummary()} style={{padding:'10px 14px',borderRadius:10,border:'1px solid #4a5878',background:'#172238',color:'#eef2ff',cursor:'pointer',marginBottom:18}}>Copy evidence summary</button>
   <div style={{padding:12,borderRadius:10,background:'#151d2c',marginBottom:14,color:'#c9d1e3'}}><strong>2. Choose the official reporting destination</strong><br/>A case can be reported to more than one appropriate authority, but do not submit duplicate reports to the same authority.</div>
   <div style={{display:'grid',gap:12}}>{destinations.map(d=><article key={d.id} style={{padding:14,border:selected===d.id?'1px solid #79b8ff':'1px solid #30384d',borderRadius:12}}><strong>{d.label}</strong><p style={{color:'#b9c0d4',fontSize:14}}>{d.description}</p><p style={{fontSize:13,color:'#d7deef'}}><strong>When to use:</strong> {d.whenToUse}</p><div style={{display:'flex',gap:10,flexWrap:'wrap'}}><button type="button" onClick={()=>openDestination(d)} style={{padding:'9px 12px',borderRadius:9,border:'none',background:'#234a72',color:'#fff',cursor:'pointer'}}>Open official site</button><button disabled={saving||alreadySubmitted} onClick={()=>void markSubmitted(d)} style={{padding:'9px 12px',borderRadius:9,border:'1px solid #4a5878',background:'#172238',color:'#fff',cursor:alreadySubmitted?'default':'pointer',opacity:alreadySubmitted?.65:1}}>{alreadySubmitted?'Already marked submitted':'I submitted this report'}</button></div></article>)}</div>
   <div style={{marginTop:14,padding:12,borderRadius:10,background:'#151d2c',fontSize:13,color:'#c9d1e3'}}><strong>3. Gmail protection</strong><br/>On the original Gmail message, the user can also use Gmail&apos;s built-in <em>Report phishing</em> or <em>Report spam</em> action. This is separate from an FTC or IC3 complaint and Inbox Outlaw does not trigger it automatically.</div>
   <div style={{marginTop:14,padding:12,borderRadius:10,background:'#151d2c',fontSize:13,color:'#c9d1e3'}}><strong>Privacy safeguard</strong><br/>Opening an official site does not transmit the Inbox Outlaw evidence package. Nothing leaves Inbox Outlaw until the user intentionally copies information into the external form and submits it there.</div>
   {notice?<p role="status" style={{marginTop:12,color:'#9ed0ff'}}>{notice}</p>:null}
 </section>;
}
