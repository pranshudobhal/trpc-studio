#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const FORBIDDEN_CSS_IN_JS_DEPS = [
  'styled-components',
  '@emotion/react',
  '@emotion/styled',
  '@emotion/core',
  'glamor',
  'aphrodite',
  'jss',
  'react-jss',
  'linaria',
  '@stitches/react',
  'goober',
  'theme-ui',
];

function checkDependencies() {
  const packageJsonPath = path.join(__dirname, '../package.json');
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

  const allDeps = {
    ...packageJson.dependencies,
    ...packageJson.devDependencies,
    ...packageJson.peerDependencies,
  };

  const foundForbiddenDeps = FORBIDDEN_CSS_IN_JS_DEPS.filter(dep =>
    Object.keys(allDeps).some(
      installedDep => installedDep === dep || installedDep.startsWith(`${dep}/`)
    )
  );

  if (foundForbiddenDeps.length > 0) {
    console.error('❌ Forbidden CSS-in-JS dependencies detected:');
    foundForbiddenDeps.forEach(dep => {
      console.error(`  - ${dep}`);
    });
    console.error(
      '\nUse Tailwind CSS and CSS variables instead of runtime CSS-in-JS.'
    );
    process.exit(1);
  }

  console.log('✅ No forbidden CSS-in-JS dependencies found');
}

checkDependencies();
