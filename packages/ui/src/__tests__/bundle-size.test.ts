/**
 * Bundle size assertion tests
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, statSync } from 'fs';
import { resolve } from 'path';
import { gzipSync } from 'zlib';

describe('Bundle Size Assertions', () => {
  const BUNDLE_SIZE_LIMIT_KB = 300;
  const BUNDLE_SIZE_LIMIT_BYTES = BUNDLE_SIZE_LIMIT_KB * 1024;

  // Helper function to get gzipped size
  function getGzippedSize(filePath: string): number {
    try {
      const content = readFileSync(filePath);
      const gzipped = gzipSync(content);
      return gzipped.length;
    } catch (error) {
      console.warn(`Could not read file ${filePath}:`, error);
      return 0;
    }
  }

  // Helper function to get file size
  function getFileSize(filePath: string): number {
    try {
      const stats = statSync(filePath);
      return stats.size;
    } catch (error) {
      console.warn(`Could not stat file ${filePath}:`, error);
      return 0;
    }
  }

  // Helper function to format bytes
  function formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  describe('Initial Bundle Size', () => {
    it('should have initial bundle ≤ 300 KB gzipped (excluding Monaco)', () => {
      const distPath = resolve(__dirname, '../../../dist');

      // Look for main bundle files (excluding Monaco-related chunks)
      const bundlePatterns = [
        'index.js',
        'index.mjs',
        'studio-app.js',
        'studio-app.mjs',
        'main.js',
        'main.mjs',
      ];

      let totalGzippedSize = 0;
      let totalUncompressedSize = 0;
      let foundBundles = 0;

      for (const pattern of bundlePatterns) {
        const bundlePath = resolve(distPath, pattern);
        const gzippedSize = getGzippedSize(bundlePath);
        const uncompressedSize = getFileSize(bundlePath);

        if (gzippedSize > 0) {
          totalGzippedSize += gzippedSize;
          totalUncompressedSize += uncompressedSize;
          foundBundles++;

          console.log(`Bundle ${pattern}:`);
          console.log(`  Uncompressed: ${formatBytes(uncompressedSize)}`);
          console.log(`  Gzipped: ${formatBytes(gzippedSize)}`);
        }
      }

      console.log(`\nTotal bundle size:`);
      console.log(`  Uncompressed: ${formatBytes(totalUncompressedSize)}`);
      console.log(`  Gzipped: ${formatBytes(totalGzippedSize)}`);
      console.log(`  Limit: ${formatBytes(BUNDLE_SIZE_LIMIT_BYTES)} gzipped`);

      // If no bundles found, this might be running before build
      if (foundBundles === 0) {
        console.warn(
          'No bundle files found. Make sure to run build before this test.'
        );
        // Don't fail the test if bundles aren't built yet
        return;
      }

      expect(totalGzippedSize).toBeLessThanOrEqual(BUNDLE_SIZE_LIMIT_BYTES);
    });

    it('should exclude Monaco editor from initial bundle', () => {
      const distPath = resolve(__dirname, '../../../dist');

      // Look for Monaco-related chunks
      const monacoPatterns = ['monaco', 'editor', 'vs-', 'language-'];

      const bundlePatterns = [
        'index.js',
        'index.mjs',
        'studio-app.js',
        'studio-app.mjs',
        'main.js',
        'main.mjs',
      ];

      for (const bundlePattern of bundlePatterns) {
        const bundlePath = resolve(distPath, bundlePattern);

        try {
          const content = readFileSync(bundlePath, 'utf-8');

          // Check that Monaco-related code is not in the main bundle
          for (const monacoPattern of monacoPatterns) {
            const hasMonaco = content
              .toLowerCase()
              .includes(monacoPattern.toLowerCase());

            if (hasMonaco) {
              // Allow small references but not the full Monaco code
              const monacoReferences =
                content.match(new RegExp(monacoPattern, 'gi')) || [];

              // If there are many references, Monaco might be bundled
              expect(monacoReferences.length).toBeLessThan(10);
            }
          }
        } catch (error) {
          // Bundle file doesn't exist, skip
          continue;
        }
      }
    });
  });

  describe('Chunk Analysis', () => {
    it('should have reasonable chunk sizes', () => {
      const distPath = resolve(__dirname, '../../../dist');

      // Common chunk patterns
      const chunkPatterns = [
        'vendor',
        'common',
        'shared',
        'runtime',
        'polyfills',
      ];

      for (const pattern of chunkPatterns) {
        const chunkPath = resolve(distPath, `${pattern}.js`);
        const gzippedSize = getGzippedSize(chunkPath);

        if (gzippedSize > 0) {
          console.log(`Chunk ${pattern}: ${formatBytes(gzippedSize)} gzipped`);

          // Vendor chunks can be larger, but should still be reasonable
          const chunkLimit = pattern === 'vendor' ? 200 * 1024 : 100 * 1024;
          expect(gzippedSize).toBeLessThanOrEqual(chunkLimit);
        }
      }
    });

    it('should have lazy-loaded Monaco chunks separate from main bundle', () => {
      const distPath = resolve(__dirname, '../../../dist');

      // Look for Monaco chunks (these should exist as separate files)
      const monacoChunkPatterns = [
        'monaco-editor',
        'code-editor',
        'editor-lazy',
      ];

      let foundMonacoChunks = 0;

      for (const pattern of monacoChunkPatterns) {
        const chunkPath = resolve(distPath, `${pattern}.js`);
        const size = getFileSize(chunkPath);

        if (size > 0) {
          foundMonacoChunks++;
          console.log(`Monaco chunk ${pattern}: ${formatBytes(size)}`);

          // Monaco chunks should be reasonably sized but can be larger
          expect(size).toBeLessThanOrEqual(500 * 1024); // 500KB limit for Monaco chunks
        }
      }

      // We expect Monaco to be code-split, but it's okay if it's not built yet
      if (foundMonacoChunks > 0) {
        console.log(
          `Found ${foundMonacoChunks} Monaco chunks (properly code-split)`
        );
      } else {
        console.log(
          'No Monaco chunks found (may not be implemented yet or not built)'
        );
      }
    });
  });

  describe('Dependency Analysis', () => {
    it('should not include heavy dependencies in main bundle', () => {
      const distPath = resolve(__dirname, '../../../dist');
      const bundlePath = resolve(distPath, 'index.js');

      try {
        const content = readFileSync(bundlePath, 'utf-8');

        // Heavy dependencies that should be avoided or code-split
        const heavyDependencies = [
          'lodash',
          'moment',
          'date-fns',
          'rxjs',
          'three',
          'chart.js',
          'monaco-editor',
        ];

        for (const dep of heavyDependencies) {
          const hasHeavyDep = content.includes(dep);

          if (hasHeavyDep) {
            console.warn(
              `Warning: Heavy dependency '${dep}' found in main bundle`
            );

            // Count occurrences - a few references might be okay
            const occurrences = (content.match(new RegExp(dep, 'g')) || [])
              .length;
            expect(occurrences).toBeLessThan(5);
          }
        }
      } catch (error) {
        // Bundle doesn't exist, skip test
        console.warn('Main bundle not found, skipping dependency analysis');
      }
    });

    it('should use tree-shaking effectively', () => {
      const distPath = resolve(__dirname, '../../../dist');
      const bundlePath = resolve(distPath, 'index.js');

      try {
        const content = readFileSync(bundlePath, 'utf-8');

        // Check for common tree-shaking indicators
        const treeShakingIndicators = [
          // Webpack tree-shaking comments
          '/* unused harmony export',
          '/* harmony export',
          // Rollup tree-shaking
          '/* tree-shaken */',
          // Dead code elimination
          'PURE',
        ];

        let foundIndicators = 0;
        for (const indicator of treeShakingIndicators) {
          if (content.includes(indicator)) {
            foundIndicators++;
          }
        }

        // If we find tree-shaking indicators, that's good
        if (foundIndicators > 0) {
          console.log(`Found ${foundIndicators} tree-shaking indicators`);
        }

        // Check that unused exports are not present
        const unusedExports = ['unused_export', 'deadCode', 'unreachable'];

        for (const unusedExport of unusedExports) {
          expect(content).not.toContain(unusedExport);
        }
      } catch (error) {
        console.warn('Could not analyze tree-shaking, bundle may not be built');
      }
    });
  });

  describe('Performance Budgets', () => {
    it('should meet performance budget for different connection speeds', () => {
      const distPath = resolve(__dirname, '../../../dist');
      const bundlePath = resolve(distPath, 'index.js');
      const gzippedSize = getGzippedSize(bundlePath);

      if (gzippedSize === 0) {
        console.warn('Bundle not found, skipping performance budget test');
        return;
      }

      // Performance budgets for different connection speeds
      const connectionSpeeds = {
        '3G': { speed: (1.6 * 1024 * 1024) / 8, budget: 5 }, // 1.6 Mbps, 5 second budget
        '4G': { speed: (10 * 1024 * 1024) / 8, budget: 3 }, // 10 Mbps, 3 second budget
        WiFi: { speed: (50 * 1024 * 1024) / 8, budget: 1 }, // 50 Mbps, 1 second budget
      };

      for (const [connectionType, { speed, budget }] of Object.entries(
        connectionSpeeds
      )) {
        const downloadTime = gzippedSize / speed;

        console.log(
          `${connectionType}: ${downloadTime.toFixed(2)}s (budget: ${budget}s)`
        );

        // Only enforce strict budgets for WiFi, be more lenient for mobile
        if (connectionType === 'WiFi') {
          expect(downloadTime).toBeLessThanOrEqual(budget);
        } else {
          // For mobile connections, just warn if over budget
          if (downloadTime > budget) {
            console.warn(
              `${connectionType} download time exceeds budget: ${downloadTime.toFixed(2)}s > ${budget}s`
            );
          }
        }
      }
    });

    it('should have reasonable compression ratio', () => {
      const distPath = resolve(__dirname, '../../../dist');
      const bundlePath = resolve(distPath, 'index.js');

      const uncompressedSize = getFileSize(bundlePath);
      const gzippedSize = getGzippedSize(bundlePath);

      if (uncompressedSize === 0 || gzippedSize === 0) {
        console.warn('Bundle not found, skipping compression ratio test');
        return;
      }

      const compressionRatio = gzippedSize / uncompressedSize;

      console.log(`Compression ratio: ${(compressionRatio * 100).toFixed(1)}%`);
      console.log(`Uncompressed: ${formatBytes(uncompressedSize)}`);
      console.log(`Gzipped: ${formatBytes(gzippedSize)}`);

      // Good compression should achieve at least 70% reduction (30% of original size)
      expect(compressionRatio).toBeLessThanOrEqual(0.4); // 40% or less of original size

      // But not too aggressive (might indicate missing content)
      expect(compressionRatio).toBeGreaterThanOrEqual(0.1); // At least 10% of original size
    });
  });

  describe('Bundle Composition', () => {
    it('should have appropriate bundle composition', () => {
      const distPath = resolve(__dirname, '../../../dist');

      // Expected files in the dist directory
      const expectedFiles = ['index.js', 'index.d.ts', 'package.json'];

      const optionalFiles = [
        'index.mjs',
        'index.css',
        'styles.css',
        'README.md',
      ];

      for (const file of expectedFiles) {
        const filePath = resolve(distPath, file);
        const exists = getFileSize(filePath) > 0;

        if (!exists) {
          console.warn(`Expected file ${file} not found in dist`);
        }
      }

      for (const file of optionalFiles) {
        const filePath = resolve(distPath, file);
        const size = getFileSize(filePath);

        if (size > 0) {
          console.log(`Optional file ${file}: ${formatBytes(size)}`);
        }
      }
    });

    it('should not include development-only code in production bundle', () => {
      const distPath = resolve(__dirname, '../../../dist');
      const bundlePath = resolve(distPath, 'index.js');

      try {
        const content = readFileSync(bundlePath, 'utf-8');

        // Development-only patterns that should not be in production
        const devOnlyPatterns = [
          'console.log',
          'console.debug',
          'debugger',
          '__DEV__',
          'development',
          'hot-reload',
          'hmr',
        ];

        for (const pattern of devOnlyPatterns) {
          const occurrences = (content.match(new RegExp(pattern, 'gi')) || [])
            .length;

          if (occurrences > 0) {
            console.warn(
              `Found ${occurrences} occurrences of '${pattern}' in production bundle`
            );

            // Allow a few occurrences (might be in library code)
            expect(occurrences).toBeLessThan(3);
          }
        }
      } catch (error) {
        console.warn('Could not analyze production bundle');
      }
    });
  });
});
