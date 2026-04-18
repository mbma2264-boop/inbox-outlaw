const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

test('email records route supports GET and POST persistence flow', () => {
  const route = read('app/api/email-records/route.ts');
  assert.match(route, /export async function GET\(/);
  assert.match(route, /export async function POST\(/);
  assert.match(route, /createEmailRecord/);
  assert.match(route, /listEmailRecords/);
  assert.match(route, /addActivityLog/);
  assert.match(route, /fetch\(`\$\{BACKEND_API_BASE_URL\}\/api\/classify`/);
});

test('sqlite storage bootstraps user, session, email, and activity tables', () => {
  const db = read('lib/db.ts');
  const store = read('lib/email-records.ts');
  assert.match(db, /DatabaseSync/);
  assert.match(db, /CREATE TABLE IF NOT EXISTS UserAccount/);
  assert.match(db, /CREATE TABLE IF NOT EXISTS UserSession/);
  assert.match(db, /CREATE TABLE IF NOT EXISTS EmailRecord/);
  assert.match(db, /CREATE TABLE IF NOT EXISTS ActivityLog/);
  assert.match(db, /CREATE UNIQUE INDEX IF NOT EXISTS EmailRecord_owner_gmailMessageId_idx/);
  assert.match(store, /INSERT INTO EmailRecord/);
  assert.match(store, /ON CONFLICT\(ownerEmail, gmailMessageId\) DO UPDATE SET/);
  assert.match(store, /SELECT COUNT\(\*\) as total FROM EmailRecord/);
});

test('gmail sync and activity routes are present', () => {
  const connectRoute = read('app/api/gmail/connect/route.ts');
  const statusRoute = read('app/api/gmail/status/route.ts');
  const syncRoute = read('app/api/gmail/sync/route.ts');
  const activityRoute = read('app/api/activity/route.ts');
  assert.match(connectRoute, /authorizationUrl/);
  assert.match(statusRoute, /\/api\/gmail\/status/);
  assert.match(syncRoute, /upsertSyncedEmailRecords/);
  assert.match(syncRoute, /\/api\/gmail\/sync/);
  assert.match(activityRoute, /listActivityLogs/);
  assert.match(activityRoute, /addActivityLog/);
});
