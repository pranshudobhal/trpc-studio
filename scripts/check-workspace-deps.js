#!/usr/bin/env node

import fs from 'fs';
import { glob } from 'glob';

async function checkWorkspaceDependencies() {
  console.log('Checking workspace dependencies...');

  const packageFiles = await glob('packages/*/package.json');
  let hasErrors = false;

  for (const file of packageFiles) {
    const pkg = JSON.parse(fs.readFileSync(file, 'utf8'));
    const allDeps = { ...pkg.dependencies, ...pkg.devDependencies };

    for (const [name, version] of Object.entries(allDeps)) {
      if (name.startsWith('@trpc-studio/') && version !== 'workspace:*') {
        console.error(`❌ ${pkg.name}: ${name} should use "workspace:*"`);
        hasErrors = true;
      }
    }
  }

  if (hasErrors) {
    process.exit(1);
  }
  console.log('✅ Workspace dependencies OK');
}

checkWorkspaceDependencies().catch(console.error);
