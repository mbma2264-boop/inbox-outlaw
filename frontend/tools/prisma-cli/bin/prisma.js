#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

function exitWithError(message) {
  console.error(message);
  process.exit(1);
}

function writeFileIfChanged(filePath, content) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  if (fs.existsSync(filePath) && fs.readFileSync(filePath, 'utf8') === content) {
    return;
  }
  fs.writeFileSync(filePath, content, 'utf8');
}

function generateClient(projectRoot) {
  const schemaPath = path.join(projectRoot, 'prisma', 'schema.prisma');
  if (!fs.existsSync(schemaPath)) {
    exitWithError(`Prisma schema not found at ${schemaPath}`);
  }

  const outputDir = path.join(projectRoot, 'generated', 'prisma');
  const generatedAt = new Date().toISOString();

  writeFileIfChanged(
    path.join(outputDir, 'index.js'),
`class PrismaClient {
  constructor() {
    this.emailRecord = {
      async findMany() { return []; },
      async create({ data }) { return { id: 'local-stub', ...data }; },
    };
  }
}

module.exports = { PrismaClient };
`
  );

  writeFileIfChanged(
    path.join(outputDir, 'index.d.ts'),
`export declare class PrismaClient {
  emailRecord: {
    findMany: () => Promise<unknown[]>;
    create: (args: { data: Record<string, unknown> }) => Promise<Record<string, unknown>>;
  };
}
`
  );

  writeFileIfChanged(
    path.join(outputDir, 'README.md'),
`# Generated Prisma client\n\nGenerated locally by the inbox-guardian starter prisma stub on ${generatedAt}.\n`
  );

  console.log(`Prisma schema loaded from ${path.relative(projectRoot, schemaPath)}`);
  console.log(`Generated client written to ${path.relative(projectRoot, outputDir)}`);
}

const [, , command] = process.argv;
const projectRoot = process.cwd();

if (!command || command === '--help' || command === '-h') {
  console.log('Local prisma stub commands: generate');
  process.exit(0);
}

if (command === 'generate') {
  generateClient(projectRoot);
  process.exit(0);
}

exitWithError(`Unsupported prisma command: ${command}`);
