const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

test('package.json exposes the install-generate-test workflow', () => {
  const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'package.json'), 'utf8'));
  assert.equal(typeof pkg.scripts.test, 'string');
  assert.equal(pkg.scripts.test, 'node --test');
  assert.equal(pkg.dependencies.prisma, 'file:./tools/prisma-cli');
});

test('dashboard starter files are present', () => {
  const root = path.join(__dirname, '..');
  const files = [
    path.join(root, 'app', 'page.tsx'),
    path.join(root, 'app', 'dashboard', 'page.tsx'),
    path.join(root, 'components', 'ClassifierForm.tsx'),
  ];

  for (const file of files) {
    assert.equal(fs.existsSync(file), true, `${path.relative(root, file)} should exist`);
  }
});
