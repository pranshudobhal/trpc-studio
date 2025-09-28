/**
 * Enhanced tests for ResponsePanel component covering all requirements
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { ResponsePanel } from '../response-panel';
import type { RequestResult } from '../../lib/trpc-client';

// Mock the JsonViewer component
vi.mock('../json-viewer', () => ({
  JsonViewer: ({ data, showTypes }: { data: unknown; showTypes?: boolean }) => (
    <div data-testid="json-viewer" data-show-types={showTypes}>
      {JSON.stringify(data)}
    </div>
  ),
}));

describe('ResponsePanel Enhanced Tests', () => {
  const baseResult: RequestResult = {
    id: 'test-1',
    request: {
      id: 'test-1',
      jsonrpc: '2.0',
      method: 'query',
      params: {
        path: 'user.getById',
        input: { id: '123' },
      },
    },
    response: {
      id: 'test-1',
      jsonrpc: '2.0',
      result: {
        data: { id: '123', name: 'John Doe', email: 'john@example.com' },
      },
    },
    status: 200,
    statusText: 'OK',
    duration: 150,
    headers: {
      'content-type': 'application/json',
      'x-custom-header': 'test-value',
      'cache-control': 'no-cache',
    },
    timestamp: new Date('2023-01-01T12:00:00Z'),
  };

  const mockHistory: RequestResult[] = [
    baseResult,
    {
      ...baseResult,
      id: 'test-2',
      request: {
        ...baseResult.request,
        id: 'test-2',
        params: { path: 'user.getAll', input: undefined },
      },
      response: {
        id: 'test-2',
        jsonrpc: '2.0',
        result: {
          data: [
            { id: '1', name: 'Alice' },
            { id: '2', name: 'Bob' },
          ],
        },
      },
      duration: 89,
      timestamp: new Date('2023-01-01T11:30:00Z'),
    },
    {
      ...baseResult,
      id: 'test-3',
      request: {
        ...baseResult.request,
        id: 'test-3',
        params: {
          path: 'user.create',
          input: { name: 'Jane', email: 'jane@example.com' },
        },
      },
      response: {
        id: 'test-3',
        jsonrpc: '2.0',
        result: {
          data: { id: '456', name: 'Jane', email: 'jane@example.com' },
        },
      },
      duration: 234,
      timestamp: new Date('2023-01-01T11:00:00Z'),
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Status, Duration, and Headers Display', () => {
    it('should display status code and text', () => {
      render(<ResponsePanel result={baseResult} history={mockHistory} />);

      expect(screen.getByText('200 OK')).toBeInTheDocument();
    });

    it('should display request duration', () => {
      render(<ResponsePanel result={baseResult} history={mockHistory} />);

      expect(screen.getByText('150ms')).toBeInTheDocument();
    });

    it('should display procedure path', () => {
      render(<ResponsePanel result={baseResult} history={mockHistory} />);

      expect(screen.getByText('user.getById')).toBeInTheDocument();
    });

    it('should display all response headers', () => {
      render(<ResponsePanel result={baseResult} history={mockHistory} />);

      // Click headers tab
      fireEvent.click(screen.getByText('Headers'));

      expect(screen.getByText('content-type')).toBeInTheDocument();
      expect(screen.getByText('application/json')).toBeInTheDocument();
      expect(screen.getByText('x-custom-header')).toBeInTheDocument();
      expect(screen.getByText('test-value')).toBeInTheDocument();
      expect(screen.getByText('cache-control')).toBeInTheDocument();
      expect(screen.getByText('no-cache')).toBeInTheDocument();
    });

    it('should handle missing headers gracefully', () => {
      const resultWithoutHeaders = {
        ...baseResult,
        headers: {},
      };

      render(<ResponsePanel result={resultWithoutHeaders} history={[]} />);

      fireEvent.click(screen.getByText('Headers'));
      expect(screen.getByText(/no headers/i)).toBeInTheDocument();
    });

    it('should format duration correctly for different ranges', () => {
      const fastResult = { ...baseResult, duration: 5 };
      const { rerender } = render(
        <ResponsePanel result={fastResult} history={[]} />
      );
      expect(screen.getByText('5ms')).toBeInTheDocument();

      const slowResult = { ...baseResult, duration: 1500 };
      rerender(<ResponsePanel result={slowResult} history={[]} />);
      expect(screen.getByText('1.5s')).toBeInTheDocument();

      const verySlowResult = { ...baseResult, duration: 65000 };
      rerender(<ResponsePanel result={verySlowResult} history={[]} />);
      expect(screen.getByText('1m 5s')).toBeInTheDocument();
    });
  });

  describe('Request History', () => {
    it('should display history count in tab', () => {
      render(<ResponsePanel result={baseResult} history={mockHistory} />);

      expect(screen.getByText(/History \(3\)/)).toBeInTheDocument();
    });

    it('should display all history items with details', () => {
      render(<ResponsePanel result={baseResult} history={mockHistory} />);

      fireEvent.click(screen.getByText(/History \(3\)/));

      // Should show all history items
      expect(screen.getByText('user.getById')).toBeInTheDocument();
      expect(screen.getByText('user.getAll')).toBeInTheDocument();
      expect(screen.getByText('user.create')).toBeInTheDocument();

      // Should show timestamps
      expect(screen.getByText('12:00:00')).toBeInTheDocument();
      expect(screen.getByText('11:30:00')).toBeInTheDocument();
      expect(screen.getByText('11:00:00')).toBeInTheDocument();

      // Should show durations
      expect(screen.getByText('150ms')).toBeInTheDocument();
      expect(screen.getByText('89ms')).toBeInTheDocument();
      expect(screen.getByText('234ms')).toBeInTheDocument();
    });

    it('should call onSelectHistoryItem when history item is clicked', () => {
      const onSelectHistoryItem = vi.fn();
      render(
        <ResponsePanel
          result={baseResult}
          history={mockHistory}
          onSelectHistoryItem={onSelectHistoryItem}
        />
      );

      fireEvent.click(screen.getByText(/History \(3\)/));

      // Click on a specific history item
      const historyItems = screen.getAllByRole('button');
      const getUserAllItem = historyItems.find(item =>
        item.textContent?.includes('user.getAll')
      );

      if (getUserAllItem) {
        fireEvent.click(getUserAllItem);
        expect(onSelectHistoryItem).toHaveBeenCalledWith(mockHistory[1]);
      }
    });

    it('should highlight current request in history', () => {
      render(<ResponsePanel result={baseResult} history={mockHistory} />);

      fireEvent.click(screen.getByText(/History \(3\)/));

      // Current request should be highlighted
      const currentItem = screen.getByRole('button', { pressed: true });
      expect(currentItem).toHaveTextContent('user.getById');
    });

    it('should show empty state for no history', () => {
      render(<ResponsePanel result={baseResult} history={[]} />);

      expect(screen.getByText(/History \(0\)/)).toBeInTheDocument();

      fireEvent.click(screen.getByText(/History \(0\)/));
      expect(screen.getByText(/no previous requests/i)).toBeInTheDocument();
    });
  });

  describe('Pretty/Raw JSON Toggle', () => {
    it('should toggle between pretty and raw JSON view', () => {
      render(<ResponsePanel result={baseResult} history={mockHistory} />);

      // Should start in pretty mode
      expect(screen.getByText('Raw')).toBeInTheDocument();
      expect(screen.getByTestId('json-viewer')).toBeInTheDocument();

      // Toggle to raw mode
      fireEvent.click(screen.getByText('Raw'));

      expect(screen.getByText('Pretty')).toBeInTheDocument();
      expect(screen.getByRole('textbox')).toBeInTheDocument();
      expect(screen.getByRole('textbox')).toHaveValue(
        JSON.stringify(baseResult.response?.result?.data, null, 2)
      );
    });

    it('should maintain toggle state when switching tabs', () => {
      render(<ResponsePanel result={baseResult} history={mockHistory} />);

      // Switch to raw mode
      fireEvent.click(screen.getByText('Raw'));
      expect(screen.getByText('Pretty')).toBeInTheDocument();

      // Switch to headers tab and back
      fireEvent.click(screen.getByText('Headers'));
      fireEvent.click(screen.getByText('Response'));

      // Should still be in raw mode
      expect(screen.getByText('Pretty')).toBeInTheDocument();
      expect(screen.getByRole('textbox')).toBeInTheDocument();
    });

    it('should handle raw JSON for error responses', () => {
      const errorResult: RequestResult = {
        ...baseResult,
        status: 400,
        statusText: 'Bad Request',
        response: {
          id: 'test-1',
          jsonrpc: '2.0',
          error: {
            code: -32600,
            message: 'Invalid request',
            data: {
              code: 'BAD_REQUEST',
              httpStatus: 400,
              path: 'user.getById',
            },
          },
        },
      };

      render(<ResponsePanel result={errorResult} history={[]} />);

      fireEvent.click(screen.getByText('Raw'));

      const rawTextarea = screen.getByRole('textbox');
      expect(rawTextarea).toHaveValue(
        JSON.stringify(errorResult.response?.error, null, 2)
      );
    });
  });

  describe('SuperJSON Awareness', () => {
    it('should detect and label SuperJSON responses', () => {
      const superJsonResult: RequestResult = {
        ...baseResult,
        response: {
          id: 'test-1',
          jsonrpc: '2.0',
          result: {
            data: {
              json: {
                user: { name: 'John', createdAt: '2023-01-01T00:00:00.000Z' },
                count: 42,
              },
              meta: {
                values: {
                  'user.createdAt': ['Date'],
                },
              },
            },
          },
        },
      };

      render(<ResponsePanel result={superJsonResult} history={[]} />);

      expect(screen.getByText('SuperJSON Detected')).toBeInTheDocument();
      expect(screen.getByTestId('json-viewer')).toHaveAttribute(
        'data-show-types',
        'true'
      );
    });

    it('should label special types in SuperJSON responses', () => {
      const superJsonWithTypesResult: RequestResult = {
        ...baseResult,
        response: {
          id: 'test-1',
          jsonrpc: '2.0',
          result: {
            data: {
              user: {
                createdAt: { $type: 'Date', value: '2023-01-01T00:00:00.000Z' },
                balance: { $type: 'BigInt', value: '123456789' },
                tags: { $type: 'Set', value: ['admin', 'user'] },
                metadata: {
                  $type: 'Map',
                  value: [
                    ['key1', 'value1'],
                    ['key2', 'value2'],
                  ],
                },
              },
            },
          },
        },
      };

      render(<ResponsePanel result={superJsonWithTypesResult} history={[]} />);

      expect(screen.getByText('SuperJSON Detected')).toBeInTheDocument();

      // Should show type labels
      expect(screen.getByText('Date')).toBeInTheDocument();
      expect(screen.getByText('BigInt')).toBeInTheDocument();
      expect(screen.getByText('Set')).toBeInTheDocument();
      expect(screen.getByText('Map')).toBeInTheDocument();
    });

    it('should not show SuperJSON detection for regular JSON', () => {
      render(<ResponsePanel result={baseResult} history={mockHistory} />);

      expect(screen.queryByText('SuperJSON Detected')).not.toBeInTheDocument();
      expect(screen.getByTestId('json-viewer')).toHaveAttribute(
        'data-show-types',
        'false'
      );
    });

    it('should handle mixed SuperJSON and regular data', () => {
      const mixedResult: RequestResult = {
        ...baseResult,
        response: {
          id: 'test-1',
          jsonrpc: '2.0',
          result: {
            data: {
              regularData: { name: 'John', age: 30 },
              superJsonData: {
                createdAt: { $type: 'Date', value: '2023-01-01T00:00:00.000Z' },
              },
            },
          },
        },
      };

      render(<ResponsePanel result={mixedResult} history={[]} />);

      expect(screen.getByText('SuperJSON Detected')).toBeInTheDocument();
      expect(screen.getByText('Date')).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('should display tRPC errors properly', () => {
      const errorResult: RequestResult = {
        ...baseResult,
        status: 400,
        statusText: 'Bad Request',
        response: {
          id: 'test-1',
          jsonrpc: '2.0',
          error: {
            code: -32600,
            message: 'Invalid request',
            data: {
              code: 'BAD_REQUEST',
              httpStatus: 400,
              path: 'user.getById',
              stack: 'Error: Invalid request\n    at handler.ts:123',
            },
          },
        },
      };

      render(<ResponsePanel result={errorResult} history={[]} />);

      expect(screen.getByText('400 Bad Request')).toBeInTheDocument();
      expect(screen.getByText('tRPC Error')).toBeInTheDocument();
      expect(screen.getByText('Invalid request')).toBeInTheDocument();
      expect(screen.getByText('BAD_REQUEST')).toBeInTheDocument();
    });

    it('should display network errors', () => {
      const networkErrorResult: RequestResult = {
        ...baseResult,
        status: 0,
        statusText: 'Network Error',
        response: undefined,
        error: 'Failed to fetch: Connection refused',
      };

      render(<ResponsePanel result={networkErrorResult} history={[]} />);

      expect(screen.getByText('0 Network Error')).toBeInTheDocument();
      expect(screen.getByText('Network Error')).toBeInTheDocument();
      expect(
        screen.getByText('Failed to fetch: Connection refused')
      ).toBeInTheDocument();
    });

    it('should display HTTP errors with response body', () => {
      const httpErrorResult: RequestResult = {
        ...baseResult,
        status: 500,
        statusText: 'Internal Server Error',
        response: undefined,
        error: 'Internal server error occurred',
      };

      render(<ResponsePanel result={httpErrorResult} history={[]} />);

      expect(screen.getByText('500 Internal Server Error')).toBeInTheDocument();
      expect(screen.getByText('HTTP Error')).toBeInTheDocument();
      expect(
        screen.getByText('Internal server error occurred')
      ).toBeInTheDocument();
    });

    it('should handle malformed response data', () => {
      const malformedResult: RequestResult = {
        ...baseResult,
        response: {
          id: 'test-1',
          jsonrpc: '2.0',
          result: 'invalid-json-structure',
        } as any,
      };

      render(<ResponsePanel result={malformedResult} history={[]} />);

      // Should still render without crashing
      expect(screen.getByText('200 OK')).toBeInTheDocument();
      expect(screen.getByTestId('json-viewer')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels and roles', () => {
      render(<ResponsePanel result={baseResult} history={mockHistory} />);

      expect(screen.getByRole('tablist')).toBeInTheDocument();
      expect(
        screen.getByRole('tab', { name: /response/i })
      ).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /headers/i })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /history/i })).toBeInTheDocument();
      expect(screen.getByRole('tabpanel')).toBeInTheDocument();
    });

    it('should support keyboard navigation between tabs', async () => {
      render(<ResponsePanel result={baseResult} history={mockHistory} />);

      const responseTab = screen.getByRole('tab', { name: /response/i });
      responseTab.focus();

      // Arrow right to headers tab
      await userEvent.keyboard('{ArrowRight}');
      expect(screen.getByRole('tab', { name: /headers/i })).toHaveFocus();

      // Arrow right to history tab
      await userEvent.keyboard('{ArrowRight}');
      expect(screen.getByRole('tab', { name: /history/i })).toHaveFocus();

      // Arrow left back to headers
      await userEvent.keyboard('{ArrowLeft}');
      expect(screen.getByRole('tab', { name: /headers/i })).toHaveFocus();
    });

    it('should announce tab changes to screen readers', async () => {
      render(<ResponsePanel result={baseResult} history={mockHistory} />);

      const headersTab = screen.getByRole('tab', { name: /headers/i });
      await userEvent.click(headersTab);

      // Should have aria-selected
      expect(headersTab).toHaveAttribute('aria-selected', 'true');
      expect(screen.getByRole('tab', { name: /response/i })).toHaveAttribute(
        'aria-selected',
        'false'
      );
    });

    it('should have accessible labels for toggle buttons', () => {
      render(<ResponsePanel result={baseResult} history={mockHistory} />);

      const rawToggle = screen.getByRole('button', { name: /raw/i });
      expect(rawToggle).toHaveAttribute(
        'aria-label',
        'Switch to raw JSON view'
      );

      fireEvent.click(rawToggle);

      const prettyToggle = screen.getByRole('button', { name: /pretty/i });
      expect(prettyToggle).toHaveAttribute(
        'aria-label',
        'Switch to pretty JSON view'
      );
    });
  });

  describe('Performance', () => {
    it('should handle large response data efficiently', () => {
      const largeData = Array.from({ length: 1000 }, (_, i) => ({
        id: i,
        name: `User ${i}`,
        email: `user${i}@example.com`,
        metadata: {
          tags: Array.from({ length: 10 }, (_, j) => `tag${j}`),
          settings: { theme: 'dark', notifications: true },
        },
      }));

      const largeResult: RequestResult = {
        ...baseResult,
        response: {
          id: 'test-1',
          jsonrpc: '2.0',
          result: { data: largeData },
        },
      };

      const startTime = performance.now();
      render(<ResponsePanel result={largeResult} history={[]} />);
      const endTime = performance.now();

      // Should render within reasonable time
      expect(endTime - startTime).toBeLessThan(100);
      expect(screen.getByTestId('json-viewer')).toBeInTheDocument();
    });

    it('should handle large history efficiently', () => {
      const largeHistory = Array.from({ length: 100 }, (_, i) => ({
        ...baseResult,
        id: `test-${i}`,
        request: {
          ...baseResult.request,
          id: `test-${i}`,
          params: { path: `procedure${i}`, input: { id: i } },
        },
        timestamp: new Date(Date.now() - i * 1000),
      }));

      const startTime = performance.now();
      render(<ResponsePanel result={baseResult} history={largeHistory} />);
      const endTime = performance.now();

      expect(endTime - startTime).toBeLessThan(100);
      expect(screen.getByText(/History \(100\)/)).toBeInTheDocument();
    });
  });
});
