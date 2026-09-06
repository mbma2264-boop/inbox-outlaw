import { describe, expect, it } from 'vitest';
import { assessFraudPatterns } from './fraud-patterns';
import { classifyEmailReliably } from './reliable-classification';
import type { EmailInput } from './types';

function email(body_text:string,overrides:Partial<EmailInput>={}):EmailInput{
  return{
    sender_email:'yesog584@gmail.com',
    sender_name:'Og Yes',
    subject:'Hello',
    body_text,
    links:[],
    known_contact:false,
    in_reply_thread:true,
    starred:false,
    authentication_results:'spf=pass dkim=pass dmarc=pass',
    reply_to:'yesog584@gmail.com',
    return_path:'yesog584@gmail.com',
    ...overrides,
  };
}

describe('advance-fee fraud protection',()=>{
  it('detects the $48.8 million ATM card delivery fee pattern',()=>{
    const input=email('I will deliver your $48.8 million ATM card tomorrow morning. The only thing you have to do now is send $20 for an official delivery fee.');
    const assessment=assessFraudPatterns(input);
    expect(assessment.advanceFee).toBe(true);
    expect(assessment.highConfidence).toBe(true);
  });

  it('does not let successful Gmail authentication verify a fraudulent opportunity',()=>{
    const input=email('Send me your bank details and I will transfer the money to your bank account. I will deliver your $48.8 million ATM card tomorrow morning. Send $20 for the official delivery fee. You must eliminate delays and send the amount now.');
    const result=classifyEmailReliably(input);
    expect(result.trust_level).toBe('High Risk');
    expect(result.category).toBe('Likely Scam');
    expect(result.risk_score).toBeGreaterThanOrEqual(90);
    expect(result.confidence_score).toBeGreaterThanOrEqual(90);
    expect(result.category).not.toContain('Verified Opportunity');
    expect(result.reasons.some(reason=>reason.includes('Advance-fee fraud pattern detected'))).toBe(true);
  });

  it('does not flag a normal low-value delivery notice as advance-fee fraud',()=>{
    const input=email('Your order is out for delivery tomorrow. Track your package in the store app.',{sender_email:'shipping@example.com',authentication_results:'spf=pass dkim=pass dmarc=pass'});
    expect(assessFraudPatterns(input).advanceFee).toBe(false);
  });
});
