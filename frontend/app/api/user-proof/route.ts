import { NextResponse } from 'next/server';
import { requireSessionUser } from '../../../lib/auth';
import { addActivityLog } from '../../../lib/activity-log';
import { addUserProof, listUserProof, type NewUserProof, type UserProofType } from '../../../lib/user-proof';

const allowed:UserProofType[]=['payout','purchase','receipt','account','identity','relationship','other'];

export async function GET(request:Request){
 let user;try{user=await requireSessionUser();}catch{return NextResponse.json({error:'Unauthenticated.'},{status:401});}
 const sender=new URL(request.url).searchParams.get('sender')||undefined;
 try{return NextResponse.json({items:await listUserProof(user.email,sender)});}catch(error){return NextResponse.json({error:error instanceof Error?error.message:'Unable to load proof.'},{status:500});}
}

export async function POST(request:Request){
 let user;try{user=await requireSessionUser();}catch{return NextResponse.json({error:'Unauthenticated.'},{status:401});}
 let body:Partial<NewUserProof>;try{body=await request.json() as Partial<NewUserProof>;}catch{return NextResponse.json({error:'Invalid JSON payload.'},{status:400});}
 if(!body.senderEmail||!body.proofSummary||!body.proofType||!allowed.includes(body.proofType))return NextResponse.json({error:'Sender, proof type, and proof summary are required.'},{status:400});
 if(body.proofUrl){try{const url=new URL(body.proofUrl);if(!['http:','https:'].includes(url.protocol))throw new Error();}catch{return NextResponse.json({error:'Proof URL must be a valid http(s) link.'},{status:400});}}
 try{const item=await addUserProof(user.email,body as NewUserProof);await addActivityLog(user.email,'email_reviewed',`Added personal proof for ${item.senderEmail}.`,{proofType:item.proofType,emailRecordId:item.emailRecordId});return NextResponse.json({item},{status:201});}catch(error){return NextResponse.json({error:error instanceof Error?error.message:'Unable to save proof.'},{status:500});}
}
