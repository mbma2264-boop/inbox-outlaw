import type { ClassificationResult, EmailInput } from './types';

const FREE_MAIL = new Set(['gmail.com','yahoo.com','outlook.com','hotmail.com','aol.com','icloud.com','proton.me','protonmail.com']);

function senderDomain(email:string){return (email.trim().toLowerCase().split('@')[1]||'').trim();}
function has(content:string,re:RegExp){return re.test(content);}
function addReason(result:ClassificationResult,reason:string,ruleId:string,weight:number){
  if(!result.reasons.includes(reason))result.reasons=[reason,...result.reasons];
  if(!result.matched_rules.some(rule=>rule.rule_id===ruleId))result.matched_rules=[{rule_id:ruleId,weight,reason},...result.matched_rules];
}

export type FraudPatternAssessment={
  advanceFee:boolean;
  highConfidence:boolean;
  signalCount:number;
  signals:string[];
};

export function assessFraudPatterns(email:EmailInput):FraudPatternAssessment{
  const content=String(email.body_text||'').toLowerCase();
  const signals:string[]=[];
  const hugeMoney=has(content,/\$\s?\d[\d,.]*\s*(million|billion)\b|\b\d[\d,.]*\s*(million|billion)\s*(dollars?|usd)\b|\bmillion[- ]?dollar\b/);
  const upfrontFee=has(content,/\b(send|pay|payment of|fee of|only)\b.{0,80}\$\s?\d+|\$\s?\d+.{0,80}\b(delivery|processing|release|clearance|authorization|activation|courier|handling|official)\s+fee\b|\b(delivery|processing|release|clearance|authorization|activation|courier|handling|official)\s+fee\b/i);
  const bankDetails=has(content,/\bbank details?\b|\bbank account (number|information|details)\b|\baccount and routing\b|\brouting number\b|\bsend me your bank\b/);
  const atmCard=has(content,/\batm card\b|\bdebit card\b.{0,60}\b(million|funds?|delivery|prize|compensation)\b/);
  const deliveryStory=has(content,/\b(deliver|delivery|courier|package|consignment)\b.{0,140}\b(card|funds?|money|million|prize|compensation)\b|\b(card|funds?|money|million|prize|compensation)\b.{0,140}\b(deliver|delivery|courier|package|consignment)\b/);
  const moneyTransferPromise=has(content,/\btransfer the money to you\b|\btransfer (the )?(funds?|money)\b|\breceive your .*?(million|funds?|money|card)\b/);
  const urgency=has(content,/\btomorrow morning\b|\bimmediately\b|\bwithout delay\b|\beliminate delays?\b|\bonly thing .*? do now\b|\bact now\b/);
  const isolation=has(content,/\bdo not (tell|contact|send messages? to)\b|\bstop (talking|communicating)\b|\bkeep (this|it) secret\b|\bconfidential\b/);
  const blessingPressure=has(content,/\bgod has remembered you\b|\byou are already blessed\b|\bnothing will go wrong in your life\b/);
  const freeMail=FREE_MAIL.has(senderDomain(email.sender_email));

  if(hugeMoney)signals.push('extraordinary unsolicited money claim');
  if(upfrontFee)signals.push('upfront fee required before receiving money or property');
  if(bankDetails)signals.push('bank details requested');
  if(atmCard)signals.push('ATM/debit card used as the delivery mechanism for claimed funds');
  if(deliveryStory)signals.push('delivery/package story tied to money or a payment card');
  if(moneyTransferPromise)signals.push('promise to transfer or release money');
  if(urgency)signals.push('time pressure or immediate-action language');
  if(isolation)signals.push('secrecy or isolation language');
  if(blessingPressure)signals.push('emotional/religious pressure tied to the promised funds');
  if(freeMail)signals.push('generic consumer email account used for a high-value financial claim');

  const coreAdvanceFee=(hugeMoney||atmCard||deliveryStory||moneyTransferPromise)&&upfrontFee;
  const corroborating=[bankDetails,atmCard,deliveryStory,urgency,isolation,blessingPressure,freeMail].filter(Boolean).length;
  const advanceFee=coreAdvanceFee&&corroborating>=1;
  const highConfidence=advanceFee&&(bankDetails||hugeMoney||atmCard)&&corroborating>=2;
  return{advanceFee,highConfidence,signalCount:signals.length,signals};
}

export function applyFraudPatternProtection(email:EmailInput,result:ClassificationResult){
  const assessment=assessFraudPatterns(email);
  if(!assessment.advanceFee)return result;
  const reason=`Advance-fee fraud pattern detected: ${assessment.signals.join('; ')}.`;
  addReason(result,reason,'advance_fee_fraud_pattern',assessment.highConfidence?55:40);
  result.trust_level='High Risk';
  result.category='Likely Scam';
  result.risk_score=Math.max(result.risk_score,assessment.highConfidence?92:82);
  result.confidence_score=Math.max(result.confidence_score,assessment.highConfidence?96:90);
  result.recommended_action='Likely advance-fee fraud. Do not send money, bank details, account information, gift cards, crypto, or verification codes. Do not rely on sender authentication as proof that the financial claim is legitimate.';
  return result;
}
