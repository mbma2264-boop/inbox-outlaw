const test = require('node:test');
const assert = require('node:assert/strict');
const ts = require('typescript');
const fs = require('node:fs');

// Execute production TypeScript with the project's existing compiler dependency.
require.extensions['.ts'] = (module, filename) => {
  const source = fs.readFileSync(filename, 'utf8');
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    fileName: filename,
  });
  module._compile(outputText, filename);
};

const { classifyEmailReliably } = require('../lib/reliable-classification.ts');
const { getInboxSummary } = require('../lib/email-records.ts');
const { runClassificationVerification } = require('../lib/classification-verification.ts');
const base = {
  sender_email: 'payments@brand-example.com',
  sender_name: 'Example Sender',
  subject: 'September payment summary',
  links: [], known_contact: false, in_reply_thread: false, starred: false,
  authentication_results: 'spf=pass dkim=pass dmarc=pass',
  reply_to: 'payments@brand-example.com',
  return_path: 'bounce@brand-example.com',
};

for (const body_text of [
  '$1,200 paid',
  'September payment summary: $1,200 paid.',
  'Paid $1,200.00',
  'Your commission payment was sent today.',
  'Your payment sent totals $1,200.',
]) {
  test('unconfirmed payment stays unverified: ' + body_text, () => {
    const result = classifyEmailReliably({ ...base, body_text });
    assert.equal(result.message_type, 'Money / Payment');
    assert.equal(result.category, 'Money / Payment');
    assert.equal(result.trust_level, 'Unverified');
    assert.equal(result.sender_verification.level, 'Authenticated Domain');
    assert.ok(result.matched_rules.some(rule => rule.rule_id === 'financial_claim_unverified'));
  });
}

test('safe sender, known contact, and previous payout proof do not confirm this payment', () => {
  const result = classifyEmailReliably({
    ...base, body_text: '$1,200 paid', authentication_results: null,
    sender_history_decision: 'safe', known_contact: true, in_reply_thread: true,
    personal_proof: { count: 1, payouts: 1, purchases: 0, identity: 0 },
  });
  assert.equal(result.sender_verification.level, 'Trusted Sender');
  assert.equal(result.trust_level, 'Unverified');
});

test('resolved aligned links do not confirm a payment', () => {
  const url = 'https://brand-example.com/payments';
  const result = classifyEmailReliably({
    ...base, body_text: '$1,200 paid', links: [url],
    link_verifications: [{
      original_url: url, final_url: url, status: 'resolved', http_status: 200,
      redirect_chain: [], redirect_count: 0, original_host: 'brand-example.com',
      final_host: 'brand-example.com', sender_aligned: true,
      cross_domain_redirect: false, https_final: true, reason: 'Aligned',
    }],
  });
  assert.equal(result.trust_level, 'Unverified');
});

test('sender mismatch and advance-fee protection retain higher risk', () => {
  const mismatch = classifyEmailReliably({
    ...base, body_text: '$1,200 paid', reply_to: 'claim@other-example.net',
  });
  assert.equal(mismatch.trust_level, 'Suspicious');
  assert.equal(mismatch.sender_verification.level, 'Sender Mismatch');
  const scam = classifyEmailReliably({
    ...base, sender_email: 'yesog584@gmail.com', reply_to: 'yesog584@gmail.com',
    return_path: 'yesog584@gmail.com',
    body_text: 'Send me your bank details. I will deliver your $48.8 million ATM card tomorrow. Send $20 for the official delivery fee now.',
  });
  assert.equal(scam.category, 'Likely Scam');
  assert.equal(scam.trust_level, 'High Risk');
  assert.ok(scam.risk_score >= 90);
});

test('subject and ordinary use of paid do not manufacture payment evidence', () => {
  for (const body_text of ['Hello there.', 'Use our paid plan for extra features.']) {
    const result = classifyEmailReliably({ ...base, body_text });
    assert.equal(result.money_signal, null);
    assert.notEqual(result.message_type, 'Money / Payment');
  }
});

test('saved legacy sender trust never counts as confirmed money', async () => {
  const oldFetch = global.fetch;
  const oldUrl = process.env.SUPABASE_URL;
  const oldKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  process.env.SUPABASE_URL = 'https://database.example';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-only';
  global.fetch = async (url) => {
    assert.ok(String(url).includes('user_email=eq.audit%40example.com'));
    return new Response(JSON.stringify([
      { category: 'Money / Payment', message_type: 'Money / Payment', trust_level: 'Verified', review_state: null },
      { category: 'Money / Payment', message_type: 'Money / Payment', trust_level: 'Trusted', review_state: 'safe' },
      { category: 'Money / Payment', message_type: 'Money / Payment', trust_level: 'Unverified', review_state: null },
    ]));
  };
  try {
    const summary = await getInboxSummary('audit@example.com');
    assert.equal(summary.money, 3);
    assert.equal(summary.verifiedMoney, 0);
    assert.equal(summary.handled, 1);
  } finally {
    global.fetch = oldFetch;
    if (oldUrl === undefined) delete process.env.SUPABASE_URL; else process.env.SUPABASE_URL = oldUrl;
    if (oldKey === undefined) delete process.env.SUPABASE_SERVICE_ROLE_KEY; else process.env.SUPABASE_SERVICE_ROLE_KEY = oldKey;
  }
});

test('payment verification cases assert claim trust as well as sender identity', () => {
  const verification = runClassificationVerification();
  const payments = verification.results.filter(result =>
    ['Authenticated commission payment does not verify transaction', 'September summary paid amount is an unverified claim'].includes(result.name));
  assert.equal(payments.length, 2);
  assert.ok(payments.every(result => result.passed));
  assert.ok(payments.every(result => result.actualTrust === 'Unverified'));
});
