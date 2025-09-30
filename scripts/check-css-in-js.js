#!/usr/bin/env node

import fs from 'fs';
import { glob } from 'glob';

const FORBIDDEN = ['styled-components', '@emotion/react', '@emotion/styled'];

async function checkCssInJs() {
  const packageFiles = [
    'package.json',
    ...(await glob('packages/*/package.json')),
  ];

  for (const file of packageFiles) {
    const pkg = JSON.parse(fs.readFileSync(file, 'utf8'));
    const allDeps = { ...pkg.dependencies, ...pkg.devDependencies };

    const forbidden = FORBIDDEN.filter(dep => allDeps[dep]);
    if (forbidden.length > 0) {
      console.error(
        `❌ Forbidden CSS-in-JS deps in ${file}: ${forbidden.join(', ')}`
      );
      process.exit(1);
    }
  }

  console.log('✅ No CSS-in-JS dependencies found');
}

checkCssInJs().catch(console.error);
