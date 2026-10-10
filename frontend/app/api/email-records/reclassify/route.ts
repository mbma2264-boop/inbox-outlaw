import { NextResponse } from 'next/server';
import { requireSessionUser } from '../../../../lib/auth';
import { fetchGmailMessageById } from '../../../../lib/gmail-local';
import { listReclassificationCandidates, reclassifyStoredGmailRecord } from '../../../../lib/email-records';
import { verifyEmailLinks } from '../../../../lib/link-verification';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export const revalidate=0;

async function inspect(owner:string,id:string,apply:boolean){
 const message=await fetchGmailMessageById(id);
 message.email.link_verifications=await verifyEmailLinks(message.email.links||[],message.email.sender_email);
 const result=await reclassifyStoredGmailRecord(owner,message);
 if(apply)await result.commit();
 return {gmailMessageId:id,before:result.before,after:result.after,changed:result.changed,applied:apply};
}
export async function POST(request:Request){
 let user;
 try{user=await requireSessionUser();}catch{return NextResponse.json({error:'Sign in again.'},{status:401});}
 const payload=await request.json().catch(()=>null) as {gmailMessageId?:string;batch?:boolean;limit?:number;offset?:number;apply?:boolean}|null;
 if(!payload)return NextResponse.json({error:'Invalid request.'},{status:400});
 const apply=payload.apply===true;
 const limit=Math.max(1,Math.min(10,Math.trunc(Number(payload.limit)||5)));
 const offset=Math.max(0,Math.trunc(Number(payload.offset)||0));
 const candidates=payload.batch?await listReclassificationCandidates(user.email,limit,offset):[];
 const ids=payload.batch?candidates.map(r=>r.gmailMessageId!).filter(Boolean):payload.gmailMessageId?[payload.gmailMessageId.trim()]:[];
 if(!ids.length)return NextResponse.json({error:'No matching stored Gmail messages.',offset},{status:400});
 const results:Awaited<ReturnType<typeof inspect>>[]=[];
 const failures:{gmailMessageId:string;error:string}[]=[];
 for(const id of ids){try{results.push(await inspect(user.email,id,apply));}catch(error){failures.push({gmailMessageId:id,error:error instanceof Error?error.message:'Unable to inspect message.'});}}
 return NextResponse.json({mode:apply?'apply':'dry-run',requested:ids.length,processed:results.length,changed:results.filter(r=>r.changed).length,failed:failures.length,results,failures,nextOffset:payload.batch?offset+candidates.length:null},{headers:{'Cache-Control':'no-store'}});
}
