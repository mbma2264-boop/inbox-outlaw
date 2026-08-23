import { classifyEmailEvidence } from './classification-engine';
import type { EmailInput } from './types';

type Expected = 'Likely Scam' | 'Needs Review' | 'Verified Business' | 'Promotion' | 'Opportunity';
type VerificationCase = { name: string; expected: Expected; email: EmailInput };

const base = (overrides: Partial<EmailInput>): EmailInput => ({
  sender_email: 'sender@example.com',
  sender_name: 'Example Sender',
  subject: 'Hello',
  body_text: 'Hello there.',
  links: [],
  known_contact: false,
  in_reply_thread: false,
  starred: false,
  ...overrides,
});

export const classificationVerificationCases: VerificationCase[] = [
  { name: 'Government impersonation from free email', expected: 'Likely Scam', email: base({ sender_email:'justice.notice@gmail.com', subject:'Federal compensation final notice', body_text:'Department of Justice federal compensation. Act now and send a gift card immediately.' }) },
  { name: 'Credential phishing with mismatched link', expected: 'Needs Review', email: base({ sender_email:'security@bank-example.com', subject:'Verify your account immediately', body_text:'Your account is suspended. Login now to verify your account.', links:['https://account-check.example.net/login'] }) },
  { name: 'Crypto payment pressure', expected: 'Needs Review', email: base({ sender_email:'billing@vendor-example.com', subject:'Urgent payment required', body_text:'Pay the balance by bitcoin to this crypto wallet within 24 hours.' }) },
  { name: 'Authenticated aligned business', expected: 'Verified Business', email: base({ sender_email:'billing@acme-example.com', subject:'Your monthly receipt', body_text:'Your receipt is ready.', links:['https://acme-example.com/receipt/123'], authentication_results:'spf=pass dkim=pass dmarc=pass', reply_to:'billing@acme-example.com', return_path:'bounce@acme-example.com' }) },
  { name: 'Authenticated sender with suspicious credential request', expected: 'Needs Review', email: base({ sender_email:'security@acme-example.com', subject:'Urgent verification', body_text:'Immediately verify your account and provide your verification code.', links:['https://acme-example.com/login'], authentication_results:'spf=pass dkim=pass dmarc=pass' }) },
  { name: 'Two auth checks only is not enough to verify', expected: 'Needs Review', email: base({ sender_email:'hello@acme-example.com', subject:'Account update', body_text:'A normal account update.', authentication_results:'spf=pass dkim=pass' }) },
  { name: 'Previously blocked sender remains suspicious', expected: 'Likely Scam', email: base({ sender_email:'repeat@bad-example.com', subject:'Hello again', body_text:'Checking in.', sender_history_decision:'blocked' }) },
  { name: 'Previously safe sender without conflicts', expected: 'Verified Business', email: base({ sender_email:'friend@trusted-example.com', subject:'Normal update', body_text:'Here is the update you requested.', sender_history_decision:'safe' }) },
  { name: 'Previously safe sender with high-risk conflict is not verified', expected: 'Needs Review', email: base({ sender_email:'friend@trusted-example.com', subject:'Urgent payment', body_text:'Send bitcoin immediately to this wallet address.', sender_history_decision:'safe' }) },
  { name: 'Normal newsletter', expected: 'Promotion', email: base({ sender_email:'news@shop-example.com', subject:'Weekly newsletter sale', body_text:'This week’s sale and special offer. Unsubscribe anytime.', authentication_results:'spf=pass dkim=pass dmarc=pass' }) },
  { name: 'Legitimate-looking affiliate opportunity', expected: 'Opportunity', email: base({ sender_email:'partners@brand-example.com', subject:'Partnership opportunity', body_text:'We would like to discuss an affiliate collaboration and commission structure.', authentication_results:'spf=pass dkim=pass dmarc=pass' }) },
  { name: 'Unknown ordinary email stays unverified', expected: 'Needs Review', email: base({ sender_email:'person@unknown-example.com', subject:'Question', body_text:'Can you call me tomorrow?' }) },
  { name: 'Scam words in subject alone do not classify message', expected: 'Needs Review', email: base({ subject:'URGENT FINAL NOTICE - SEND BITCOIN NOW', body_text:'Hello. Here is the ordinary update you requested.' }) },
  { name: 'Opportunity words in subject alone do not classify message', expected: 'Needs Review', email: base({ subject:'Commission payment opportunity', body_text:'Hello. Please see the general information below.' }) },
  { name: 'Harmless subject cannot hide dangerous body', expected: 'Likely Scam', email: base({ sender_email:'notice@gmail.com', subject:'Hello', body_text:'Department of Justice federal compensation. Act now immediately. Send a gift card and provide your verification code to claim compensation.' }) },
];

export function runClassificationVerification() {
  const results = classificationVerificationCases.map((test) => {
    const result = classifyEmailEvidence(test.email);
    return { name:test.name, expected:test.expected, actual:result.category, risk:result.risk_score, confidence:result.confidence_score, passed:result.category===test.expected, reasons:result.reasons };
  });
  const passed = results.filter((result) => result.passed).length;
  return { total:results.length, passed, failed:results.length-passed, passRate:Math.round((passed/results.length)*100), results };
}
