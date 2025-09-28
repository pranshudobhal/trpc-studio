#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { gzipSync } = require('zlib');

const BUNDLE_SIZE_LIMIT = 300 * 1024; // 300KB in bytes

function getFileSize(filePath) {
  if (!fs.existsSync(filePath)) {
    return 0;
  }

  const content = fs.readFileSync(filePath);
  const gzipped = gzipSync(content);
  return gzipped.length;
}

function formatBytes(bytes) {
  return (bytes / 1024).toFixed(2) + ' KB';
}

function checkBundleSize() {
  const distPath = path.join(__dirname, '../dist');

  if (!fs.existsSync(distPath)) {
    console.error('❌ Dist directory not found. Run build first.');
    process.exit(1);
  }

  // Check main bundle file
  const mainBundle = path.join(distPath, 'index.js');
  const bundleSize = getFileSize(mainBundle);

  console.log('📦 Bundle Size Analysis');
  console.log('========================');
  console.log(`Main bundle: ${formatBytes(bundleSize)}`);
  console.log(`Limit: ${formatBytes(BUNDLE_SIZE_LIMIT)}`);

  if (bundleSize > BUNDLE_SIZE_LIMIT) {
    console.error(
      `❌ Bundle size exceeds limit by ${formatBytes(bundleSize - BUNDLE_SIZE_LIMIT)}`
    );
    console.error('Consider:');
    console.error('- Code splitting heavy dependencies');
    console.error('- Lazy loading non-critical components');
    console.error('- Tree shaking unused exports');
    console.error('- Removing unnecessary dependencies');
    process.exit(1);
  }

  const remaining = BUNDLE_SIZE_LIMIT - bundleSize;
  console.log(`✅ Bundle size OK (${formatBytes(remaining)} remaining)`);

  // Check for potential Monaco editor inclusion (should not be in v1)
  const bundleContent = fs.readFileSync(mainBundle, 'utf8');
  if (bundleContent.includes('monaco') || bundleContent.includes('Monaco')) {
    console.warn(
      '⚠️  Warning: Monaco editor detected in bundle. This should be lazy-loaded in v1.1'
    );
  }

  // Check for CSS-in-JS libraries (should not be present)
  const cssInJsLibraries = [
    'styled-components',
    '@emotion',
    'glamor',
    'aphrodite',
  ];
  const foundCssInJs = cssInJsLibraries.filter(lib =>
    bundleContent.includes(lib)
  );

  if (foundCssInJs.length > 0) {
    console.error(
      `❌ CSS-in-JS libraries detected: ${foundCssInJs.join(', ')}`
    );
    console.error('Use Tailwind CSS and CSS variables instead.');
    process.exit(1);
  }

  console.log('✅ No CSS-in-JS libraries detected');
  console.log('✅ Bundle size check passed');
}

checkBundleSize();
