const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

test('prisma schema scaffold exists for local persistence work', () => {
  const schemaPath = path.join(__dirname, '..', 'prisma', 'schema.prisma');
  assert.equal(fs.existsSync(schemaPath), true, 'schema.prisma should exist');

  const schema = fs.readFileSync(schemaPath, 'utf8');
  assert.match(schema, /generator client/);
  assert.match(schema, /datasource db/);
  assert.match(schema, /provider\s*=\s*"sqlite"/);
  assert.match(schema, /model EmailRecord/);
});
