import type { ClassificationResult, EmailInput, MessageType, TrustLevel } from './types';
import { detectBrandIdentityMismatch } from './brand-identity';

type RuleHit = { id: string; weight: number; reason: string; confidence: number };
const FREE_MAIL = new Set(['gmail.com', 'yahoo.com', 'outlook.com', 'hotmail.com', 'aol.com', 'icloud.com', 'proton.me', 'protonmail.com']);
const URL_SHORTENERS = new Set(['bit.ly', 'tinyurl.com', 't.co', 'ow.ly', 'buff.ly', 'rebrand.ly', 'cutt.ly', 'is.gd']);
function clamp(value:number,min=0,max=100){return Math.max(min,Math.min(max,Math.round(value)));}
function emailDomain(value:string|null|undefined){const match=String(value||'').toLowerCase().match(/@([^>\s]+)/);return(match?.[1]||String(value||'').split('@')[1]||'').replace(/[>),;]+$/,'').trim();}
function rootDomain(host:string){const clean=host.toLowerCase().replace(/^www\./,'').split(':')[0];const parts=clean.split('.').filter(Boolean);return parts.length<=2?clean:parts.slice(-2).join('.');}
function linkHosts(links:string[]){return links.flatMap(link=>{try{return[new URL(link).hostname.toLowerCase()];}catch{return[];}});}
function authState(raw:string|null|undefined,key:'spf'|'dkim'|'dmarc'){const value=String(raw||'').toLowerCase();if(new RegExp(`\\b${key}=pass\\b`).test(value))return'pass';if(new RegExp(`\\b${key}=(fail|softfail|permerror|temperror|neutral)\\b`).test(value))return'fail';return'unknown';}
function containsAny(content:string,phrases:string[]){return phrases.filter(phrase=>content.includes(phrase));}

export function classifyEmailEvidence(email:EmailInput):ClassificationResult{
  const content=`${email.subject}\n${email.body_text}`.toLowerCase();const hits:RuleHit[]=[];const positive:RuleHit[]=[];let risk=8;
  const addRisk=(id:string,weight:number,reason:string,confidence=0.7)=>{risk+=weight;hits.push({id,weight,reason,confidence});};
  const addPositive=(id:string,weight:number,reason:string,confidence=0.7)=>{risk-=weight;positive.push({id,weight:-weight,reason,confidence});};
  if(email.sender_history_decision==='blocked')addRisk('sender_history_blocked',42,'You previously blocked or reported this sender as unsafe.',0.995);
  if(email.sender_history_decision==='safe')addPositive('sender_history_safe',24,'You previously marked this sender as safe.',0.97);
  const domainHistory=email.domain_history;
  if(!email.sender_history_decision&&domainHistory&&domainHistory.total>=3){const safeRatio=domainHistory.safe/domainHistory.total;const scamRatio=domainHistory.scam/domainHistory.total;if(domainHistory.scam>=3&&scamRatio>=0.75)addRisk('domain_history_risky',Math.min(18,8+domainHistory.scam*2),`You previously marked ${domainHistory.scam} messages from this sender domain as scams.`,0.86);else if(domainHistory.safe>=3&&safeRatio>=0.8)addPositive('domain_history_safe',Math.min(10,4+domainHistory.safe),`You previously marked ${domainHistory.safe} messages from this sender domain as safe.`,0.78);}
  const community=email.community_evidence||[];
  const strongestCommunity=community.reduce((best,item)=>item.independent_reporters>(best?.independent_reporters||0)?item:best,community[0]);
  if(strongestCommunity){if(strongestCommunity.independent_reporters>=5)addRisk('community_evidence_high',30,`${strongestCommunity.independent_reporters} independent Inbox Outlaw users reported matching ${strongestCommunity.evidence_type.replace('_',' ')} evidence.`,0.97);else if(strongestCommunity.independent_reporters>=3)addRisk('community_evidence_medium',18,`${strongestCommunity.independent_reporters} independent Inbox Outlaw users reported matching ${strongestCommunity.evidence_type.replace('_',' ')} evidence.`,0.9);else if(strongestCommunity.independent_reporters>=1)addRisk('community_evidence_low',6,'A matching scam indicator has been reported by another Inbox Outlaw user.',0.62);}
  const senderDomain=emailDomain(email.sender_email);const replyDomain=emailDomain(email.reply_to);const returnDomain=emailDomain(email.return_path);const senderRoot=rootDomain(senderDomain);const hosts=linkHosts(email.links);
  const brandIdentity=detectBrandIdentityMismatch(email.sender_name,senderDomain);const brandMismatch=Boolean(brandIdentity?.mismatch);
  if(brandMismatch&&brandIdentity)addRisk('brand_impersonation',55,`Display name claims ${brandIdentity.brand}, but the authenticated sender domain is ${brandIdentity.senderDomain}, not an official ${brandIdentity.brand} domain.`,0.995);
  const spf=authState(email.authentication_results,'spf');const dkim=authState(email.authentication_results,'dkim');const dmarc=authState(email.authentication_results,'dmarc');const authPasses=[spf,dkim,dmarc].filter(state=>state==='pass').length;const authFails=[spf,dkim,dmarc].filter(state=>state==='fail').length;
  if(authPasses>=2)addPositive('auth_pass',18,`${authPasses} email authentication checks passed (SPF/DKIM/DMARC).`,0.95);if(authPasses===3)addPositive('auth_all_pass',8,'SPF, DKIM, and DMARC all passed.',0.99);if(authFails>=1)addRisk('auth_fail',25+(authFails-1)*8,`${authFails} email authentication check${authFails===1?'':'s'} failed.`,0.97);
  if(replyDomain&&senderDomain&&rootDomain(replyDomain)!==senderRoot)addRisk('reply_to_mismatch',18,'Reply-To domain does not match the sender domain.',0.9);else if(replyDomain&&senderDomain)addPositive('reply_to_match',5,'Reply-To domain matches the sender domain.',0.85);if(returnDomain&&senderDomain&&rootDomain(returnDomain)===senderRoot)addPositive('return_path_match',5,'Return-Path aligns with the sender domain.',0.8);
  const highRiskPayments=containsAny(content,['gift card','bitcoin','crypto wallet','wallet address','wire transfer','western union','moneygram']);if(highRiskPayments.length)addRisk('high_risk_payment',25,'High-risk payment method language detected.',0.94);
  const credentialTerms=containsAny(content,['password','verification code','security code','one-time code','login now','verify your account','confirm your account']);if(credentialTerms.length)addRisk('credential_request',20,'Credential or account-verification language detected.',0.9);
  const pressureTerms=containsAny(content,['urgent','immediately','act now','final notice','within 24 hours','suspended','expires today']);if(pressureTerms.length)addRisk('urgency_pressure',Math.min(18,6+pressureTerms.length*4),'Urgency or time-pressure language detected.',0.82);
  const sweepstakesTerms=containsAny(content,['sweepstakes','sweepstake','contest','contest director','official rules','no purchase necessary','enter to win','daily entry','bonus entry','drawing date','drawing']);
  const rewardTerms=containsAny(content,['prize','winner','you won','reward','claim now','grant','compensation','inheritance']);
  const looksLikeSweepstakes=sweepstakesTerms.length>=1&&(containsAny(content,['prize','winner','reward','entry','enter','contest','drawing']).length>=1);
  if(looksLikeSweepstakes)addPositive('sweepstakes_context',10,'Sweepstakes, contest, or entry/rules context was detected.',0.82);
  if(rewardTerms.length&&!looksLikeSweepstakes)addRisk('reward_claim',Math.min(18,7+rewardTerms.length*3),'Prize, reward, grant, or unexpected-payment language detected.',0.78);else if(rewardTerms.length&&looksLikeSweepstakes)addRisk('sweepstakes_reward_language',Math.min(8,2+rewardTerms.length*2),'Prize or reward language is present, but it appears in a sweepstakes context.',0.6);
  const authorityTerms=containsAny(content,['irs','department of justice','fbi','social security administration','government grant','federal compensation','compensation fund','supreme court','chief justice','chief judge','world bank','usa bank','release approval order']);if(authorityTerms.length&&FREE_MAIL.has(senderDomain))addRisk('authority_free_mail',30,'Authority or government language is paired with a free-email sender.',0.98);
  if(email.links.length>=8)addRisk('many_links',5,'Message contains many links.',0.55);if(hosts.some(host=>URL_SHORTENERS.has(host)))addRisk('shortened_link',10,'A shortened-link service was detected.',0.75);if(hosts.some(host=>/^\d{1,3}(\.\d{1,3}){3}$/.test(host)))addRisk('ip_link',24,'A link points directly to an IP address instead of a normal domain.',0.95);if(hosts.some(host=>host.includes('xn--')))addRisk('punycode_link',18,'An internationalized/punycode link was detected and needs review.',0.88);
  const senderLinked=hosts.some(host=>rootDomain(host)===senderRoot);if(senderRoot&&senderLinked)addPositive('official_domain_link',10,'At least one link matches the sender’s domain.',0.84);if(senderRoot&&hosts.length>0&&!senderLinked&&credentialTerms.length)addRisk('credential_link_mismatch',18,'Account-verification language points to domains unrelated to the sender.',0.92);if(email.in_reply_thread)addPositive('reply_thread',4,'Message is part of an existing reply thread.',0.65);if(email.known_contact)addPositive('known_contact',12,'Sender is a known contact.',0.88);

  const purchaseTerms=containsAny(content,['receipt','order confirmation','order #','order number','purchase','payment received','payment confirmation','invoice','shipped','shipping confirmation','delivery','tracking number','your order']);
  const accountAlertTerms=containsAny(content,['security alert','new sign-in','new login','account alert','password changed','payment failed','payment issue','billing issue','subscription','membership','verification','two-step verification','2-step verification']);
  const newsletterTerms=containsAny(content,['newsletter','unsubscribe','manage preferences','view in browser','weekly update','daily digest','latest news']);
  const opportunityTerms=containsAny(content,['opportunity','affiliate','partnership','collaboration','commission']);
  const personalContext=(email.known_contact||email.in_reply_thread)&&newsletterTerms.length===0&&purchaseTerms.length===0&&accountAlertTerms.length===0&&!looksLikeSweepstakes;

  const sweepstakesIdentityStrong=looksLikeSweepstakes&&authPasses>=2&&authFails===0&&(hosts.length===0||senderLinked)&&!highRiskPayments.length&&!credentialTerms.length&&!brandMismatch;
  if(sweepstakesIdentityStrong)addPositive('sweepstakes_verified_context',16,'Sweepstakes sender authentication and link alignment are consistent, with no payment or credential request detected.',0.93);
  const sweepstakesDanger=looksLikeSweepstakes&&(highRiskPayments.length>0||credentialTerms.length>0||authFails>0||brandMismatch||hits.some(hit=>['reply_to_mismatch','ip_link','punycode_link','community_evidence_high','community_evidence_medium'].includes(hit.id)));
  if(sweepstakesDanger)addRisk('sweepstakes_danger',22,'Sweepstakes language is combined with a strong scam indicator such as payment, credential, authentication, identity, or destination risk.',0.95);
  const promotional=new Set([...newsletterTerms,...containsAny(content,['sale','offer','coupon','deal','rewards'])]).size>=2;const opportunity=opportunityTerms.length>=1;if(brandMismatch)risk=Math.max(risk,55);risk=clamp(risk);
  const strongRisk=hits.filter(hit=>hit.confidence>=0.85);const strongPositive=positive.filter(hit=>hit.confidence>=0.85);const strongEvidence=strongRisk.length+strongPositive.length;const totalEvidence=hits.length+positive.length;const conflict=hits.length>0&&positive.length>0;
  let confidence=52+Math.min(30,strongEvidence*7)+Math.min(12,Math.max(0,totalEvidence-strongEvidence)*3);if(authPasses===3||authFails>=1)confidence+=6;if(email.sender_history_decision)confidence+=8;if(domainHistory&&domainHistory.total>=3)confidence+=3;if(strongestCommunity?.independent_reporters>=3)confidence+=5;if(conflict)confidence-=10;if(totalEvidence<=1)confidence-=12;
  const independentRiskFamilies=new Set(hits.map(hit=>hit.id.split('_')[0]));const corroboratedRisk=hits.length>=3&&independentRiskFamilies.size>=2;const highlyCorroboratedRisk=strongRisk.length>=2&&hits.length>=3;if(corroboratedRisk)confidence+=8;if(highlyCorroboratedRisk)confidence+=6;if(risk>=65&&hits.length>=3)confidence+=5;if(strongRisk.length>0&&strongPositive.length>0)confidence-=6;if(sweepstakesIdentityStrong)confidence+=5;if(brandMismatch)confidence+=10;confidence=clamp(confidence,45,98);
  const hasHighRiskEvidence=hits.some(hit=>hit.confidence>=0.85&&hit.weight>=18);const verifiedByAuthentication=authPasses===3&&authFails===0&&!hasHighRiskEvidence&&!brandMismatch&&(hosts.length===0||senderLinked);const verifiedByUserHistory=email.sender_history_decision==='safe'&&!hasHighRiskEvidence&&!brandMismatch&&risk<=20;

  let messageType:MessageType='Unknown';
  if(looksLikeSweepstakes)messageType='Sweepstakes / Promotion';
  else if(purchaseTerms.length>=2||containsAny(content,['receipt','order confirmation','shipping confirmation']).length)messageType='Purchase / Receipt';
  else if(accountAlertTerms.length>=1)messageType='Account Alert';
  else if(newsletterTerms.length>=1||promotional)messageType='Newsletter / Promotion';
  else if(opportunity)messageType='Opportunity';
  else if(personalContext)messageType='Personal';
  else if(authPasses>=2||email.sender_history_decision==='safe')messageType='Business';

  let trustLevel:TrustLevel='Unverified';
  if(risk>=75||email.sender_history_decision==='blocked'||sweepstakesDanger&&risk>=55)trustLevel='High Risk';
  else if(brandMismatch||risk>=50||hasHighRiskEvidence)trustLevel='Suspicious';
  else if(verifiedByAuthentication||sweepstakesIdentityStrong)trustLevel='Verified';
  else if(verifiedByUserHistory||email.known_contact)trustLevel='Trusted';

  let category:string;let recommended_action:string;
  if(trustLevel==='High Risk'){category='Likely Scam';recommended_action=brandMismatch?'Possible brand impersonation is combined with high-risk evidence. Do not use links or contact details in this message; verify through the brand’s official app or website.':looksLikeSweepstakes?'Sweepstakes offer contains strong scam indicators. Do not pay fees, provide credentials, or follow suspicious links.':'High risk. Do not click links, reply, send money, or provide codes until independently verified.';}
  else if(trustLevel==='Suspicious'){category=brandMismatch?'Possible Brand Impersonation':'Needs Review';recommended_action=brandMismatch?'The displayed brand does not match the authenticated sender domain. Authentication can prove the real sending domain, but it does not prove that domain belongs to the brand being claimed. Verify independently through the brand’s official app or website.':'Mixed or suspicious signals detected. Verify the sender and destination links before acting.';}
  else if(messageType==='Sweepstakes / Promotion'&&trustLevel==='Verified'){category='Verified Sweepstakes / Promotion';recommended_action='Verified sender and sweepstakes or contest context detected. Review the official rules before entering or claiming a prize, and never pay a fee to claim winnings.';}
  else if(messageType==='Sweepstakes / Promotion'){category='Sweepstakes / Promotion';recommended_action='Sweepstakes, contest, or prize promotion detected. Review official rules, sender identity, and destination links before entering or claiming anything.';}
  else if(messageType==='Purchase / Receipt'&&trustLevel==='Verified'){category='Verified Purchase / Receipt';recommended_action='Purchase or delivery message from a verified sender. Confirm the order details match something you actually purchased before following any account links.';}
  else if(messageType==='Account Alert'&&trustLevel==='Verified'){category='Verified Account Alert';recommended_action='Account or billing alert from a verified sender. If action is required, use the company app or a bookmarked official site when possible.';}
  else if(messageType==='Newsletter / Promotion'&&trustLevel==='Verified'){category='Verified Newsletter / Promotion';recommended_action='Low-risk newsletter or promotion from a verified sender. Normal caution applies to purchases and links.';}
  else if(messageType==='Personal'){category='Personal';recommended_action='Appears to be a personal or reply-thread message. Review normally before responding.';}
  else if(messageType==='Opportunity'){category='Opportunity';recommended_action='Potential opportunity. Review the sender, terms, and destination before responding.';}
  else if(messageType==='Newsletter / Promotion'){category='Promotion';recommended_action=risk<=30?'Low-risk promotion based on current evidence.':'Promotion detected. Review before clicking or purchasing.';}
  else if(trustLevel==='Verified'||trustLevel==='Trusted'){category='Verified Business';recommended_action=trustLevel==='Trusted'?'Previously trusted sender with no strong conflicting risk evidence.':'Authentication checks and link alignment support this sender. Normal caution still applies.';}
  else{category='Needs Review';recommended_action='Not enough evidence to label this message verified. Review it before taking action.';}

  const reasons=[...hits,...positive].sort((a,b)=>Math.abs(b.weight)-Math.abs(a.weight)).map(hit=>hit.reason);
  return{category,message_type:messageType,trust_level:trustLevel,risk_score:risk,confidence_score:confidence,reasons:reasons.length?reasons:['No strong positive or negative signals were available, so manual review is recommended.'],matched_rules:[...hits,...positive].map(hit=>({rule_id:hit.id,weight:hit.weight,reason:hit.reason})),recommended_action,used_llm:false};
}
