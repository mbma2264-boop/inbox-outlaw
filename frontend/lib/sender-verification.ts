import { detectBrandIdentityMismatch } from './brand-identity';
import type { EmailInput, SenderVerification } from './types';

function emailDomain(value:string|null|undefined){const match=String(value||'').toLowerCase().match(/@([^>\s]+)/);return(match?.[1]||String(value||'').split('@')[1]||'').replace(/[>),;]+$/,'').trim();}
function rootDomain(host:string){const clean=host.toLowerCase().replace(/^www\./,'').split(':')[0];const parts=clean.split('.').filter(Boolean);return parts.length<=2?clean:parts.slice(-2).join('.');}
function authState(raw:string|null|undefined,key:'spf'|'dkim'|'dmarc'){const value=String(raw||'').toLowerCase();if(new RegExp(`\\b${key}=pass\\b`).test(value))return'pass';if(new RegExp(`\\b${key}=(fail|softfail|permerror|temperror|neutral)\\b`).test(value))return'fail';return'unknown';}

export function verifySenderIdentity(email:EmailInput):SenderVerification{
 const senderDomain=emailDomain(email.sender_email);const replyDomain=emailDomain(email.reply_to);const returnDomain=emailDomain(email.return_path);const senderRoot=rootDomain(senderDomain);
 const spf=authState(email.authentication_results,'spf'),dkim=authState(email.authentication_results,'dkim'),dmarc=authState(email.authentication_results,'dmarc');const passes=[spf,dkim,dmarc].filter(v=>v==='pass').length;const fails=[spf,dkim,dmarc].filter(v=>v==='fail').length;
 const replyAligned=replyDomain?rootDomain(replyDomain)===senderRoot:null;const returnAligned=returnDomain?rootDomain(returnDomain)===senderRoot:null;const brand=detectBrandIdentityMismatch(email.sender_name,senderDomain);const evidence:string[]=[];
 if(passes) evidence.push(`${passes} of 3 SPF/DKIM/DMARC checks passed.`);if(fails)evidence.push(`${fails} authentication check${fails===1?'':'s'} failed.`);if(replyAligned===true)evidence.push('Reply-To aligns with the sender domain.');if(replyAligned===false)evidence.push('Reply-To does not align with the sender domain.');if(returnAligned===true)evidence.push('Return-Path aligns with the sender domain.');if(returnAligned===false)evidence.push('Return-Path does not align with the sender domain.');if(brand&&!brand.mismatch)evidence.push(`The displayed ${brand.brand} identity matches an official registered domain.`);if(brand?.mismatch)evidence.push(`The displayed ${brand.brand} identity does not match an official registered domain.`);
 const authenticated=passes===3&&fails===0;const hardMismatch=fails>0||replyAligned===false||Boolean(brand?.mismatch);let level:SenderVerification['level']='Unverified Sender';let brandVerified=false;
 if(hardMismatch)level='Sender Mismatch';else if(brand&&!brand.mismatch&&authenticated){level='Verified Brand';brandVerified=true;}else if(authenticated)level='Authenticated Domain';else if(email.sender_history_decision==='safe'||email.known_contact)level='Trusted Sender';
 if(!evidence.length)evidence.push('Not enough independent sender identity evidence is available yet.');
 return{level,sender_domain:senderDomain,authenticated,brand_verified:brandVerified,reply_aligned:replyAligned,return_path_aligned:returnAligned,evidence};
}
