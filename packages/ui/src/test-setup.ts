import '@testing-library/jest-dom';
import { vi } from 'vitest';
import React from 'react';

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

// Mock IntersectionObserver
global.IntersectionObserver = class IntersectionObserver {
  root = null;
  rootMargin = '';
  thresholds = [];

  constructor() {}
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords() {
    return [];
  }
} as unknown as typeof globalThis.IntersectionObserver;

// Mock matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => {},
  }),
});

// Mock react-json-view-lite
vi.mock('react-json-view-lite', () => {
  type JsonViewProps = { data: unknown } & Record<string, unknown>;
  return {
    JsonView: ({ data, ...props }: JsonViewProps) => {
      return React.createElement(
        'div',
        {
          'data-testid': 'json-viewer',
          ...props,
        },
        JSON.stringify(data)
      );
    },
    allExpanded: () => true,
    defaultStyles: {},
    darkStyles: {},
  };
});
