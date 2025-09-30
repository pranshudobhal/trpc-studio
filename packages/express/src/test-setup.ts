// Test setup for Express adapter
// This file is run before each test file

import { vi, beforeEach, afterEach } from 'vitest';

// Global test configuration
beforeEach(() => {
  // Reset console methods to avoid noise in tests
  vi.spyOn(console, 'error').mockImplementation(() => {});
  vi.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => {
  // Restore console methods
  vi.restoreAllMocks();
});
