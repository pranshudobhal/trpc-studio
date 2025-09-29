import '@testing-library/jest-dom';
import { vi } from 'vitest';

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
} as any;

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
  const React = require('react');
  return {
    JsonView: ({ data, ...props }: any) => {
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
