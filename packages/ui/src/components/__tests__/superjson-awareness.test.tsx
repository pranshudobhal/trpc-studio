/**
 * Tests for SuperJSON awareness and type labeling
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { vi, describe, it, expect } from 'vitest';
import { JsonViewer } from '../json-viewer';
import { detectSuperJson, extractSuperJsonTypes } from '../../lib/trpc-client';

// Mock the actual JSON viewer implementation
vi.mock('react-json-view-lite', () => ({
  default: ({ data, shouldExpandNode, style }: any) => (
    <div data-testid="json-view-lite" style={style}>
      <pre>{JSON.stringify(data, null, 2)}</pre>
      {shouldExpandNode && <div data-testid="expand-function">expandable</div>}
    </div>
  ),
}));

describe('SuperJSON Awareness', () => {
  describe('detectSuperJson', () => {
    it('should detect SuperJSON structure with json and meta properties', () => {
      const data = {
        json: { name: 'John', date: '2023-01-01T00:00:00.000Z' },
        meta: { values: { date: ['Date'] } },
      };

      expect(detectSuperJson(data)).toBe(true);
    });

    it('should detect SuperJSON type markers', () => {
      const data = {
        user: {
          createdAt: { $type: 'Date', value: '2023-01-01T00:00:00.000Z' },
          balance: { $type: 'BigInt', value: '123456789' },
        },
      };

      expect(detectSuperJson(data)).toBe(true);
    });

    it('should detect nested SuperJSON markers', () => {
      const data = {
        users: [
          {
            id: 1,
            createdAt: { $type: 'Date', value: '2023-01-01T00:00:00.000Z' },
          },
          {
            id: 2,
            updatedAt: { $type: 'Date', value: '2023-01-02T00:00:00.000Z' },
          },
        ],
      };

      expect(detectSuperJson(data)).toBe(true);
    });

    it('should return false for regular JSON', () => {
      const data = { name: 'John', age: 30, active: true };
      expect(detectSuperJson(data)).toBe(false);
    });

    it('should return false for non-objects', () => {
      expect(detectSuperJson('string')).toBe(false);
      expect(detectSuperJson(123)).toBe(false);
      expect(detectSuperJson(null)).toBe(false);
      expect(detectSuperJson(undefined)).toBe(false);
      expect(detectSuperJson([])).toBe(false);
    });

    it('should handle complex nested structures', () => {
      const data = {
        level1: {
          level2: {
            level3: {
              timestamp: { $type: 'Date', value: '2023-01-01T00:00:00.000Z' },
            },
          },
        },
      };

      expect(detectSuperJson(data)).toBe(true);
    });
  });

  describe('extractSuperJsonTypes', () => {
    it('should extract Date types', () => {
      const data = {
        user: {
          createdAt: { $type: 'Date', value: '2023-01-01T00:00:00.000Z' },
          updatedAt: { $type: 'Date', value: '2023-01-02T00:00:00.000Z' },
        },
      };

      const types = extractSuperJsonTypes(data);

      expect(types).toHaveLength(2);
      expect(types[0]).toEqual({
        path: 'user.createdAt',
        type: 'Date',
        value: '2023-01-01T00:00:00.000Z',
      });
      expect(types[1]).toEqual({
        path: 'user.updatedAt',
        type: 'Date',
        value: '2023-01-02T00:00:00.000Z',
      });
    });

    it('should extract BigInt types', () => {
      const data = {
        account: {
          balance: { $type: 'BigInt', value: '123456789012345678901234567890' },
          limit: { $type: 'BigInt', value: '999999999999999999999999999999' },
        },
      };

      const types = extractSuperJsonTypes(data);

      expect(types).toHaveLength(2);
      expect(types[0]).toEqual({
        path: 'account.balance',
        type: 'BigInt',
        value: '123456789012345678901234567890',
      });
      expect(types[1]).toEqual({
        path: 'account.limit',
        type: 'BigInt',
        value: '999999999999999999999999999999',
      });
    });

    it('should extract Set types', () => {
      const data = {
        user: {
          roles: { $type: 'Set', value: ['admin', 'user', 'moderator'] },
          permissions: { $type: 'Set', value: ['read', 'write', 'delete'] },
        },
      };

      const types = extractSuperJsonTypes(data);

      expect(types).toHaveLength(2);
      expect(types[0]).toEqual({
        path: 'user.roles',
        type: 'Set',
        value: ['admin', 'user', 'moderator'],
      });
      expect(types[1]).toEqual({
        path: 'user.permissions',
        type: 'Set',
        value: ['read', 'write', 'delete'],
      });
    });

    it('should extract Map types', () => {
      const data = {
        config: {
          settings: {
            $type: 'Map',
            value: [
              ['theme', 'dark'],
              ['language', 'en'],
              ['notifications', true],
            ],
          },
        },
      };

      const types = extractSuperJsonTypes(data);

      expect(types).toHaveLength(1);
      expect(types[0]).toEqual({
        path: 'config.settings',
        type: 'Map',
        value: [
          ['theme', 'dark'],
          ['language', 'en'],
          ['notifications', true],
        ],
      });
    });

    it('should extract mixed types', () => {
      const data = {
        user: {
          id: { $type: 'BigInt', value: '123456789' },
          createdAt: { $type: 'Date', value: '2023-01-01T00:00:00.000Z' },
          tags: { $type: 'Set', value: ['admin', 'user'] },
          metadata: {
            $type: 'Map',
            value: [
              ['lastLogin', '2023-01-01T12:00:00.000Z'],
              ['loginCount', 42],
            ],
          },
        },
      };

      const types = extractSuperJsonTypes(data);

      expect(types).toHaveLength(4);
      expect(types.map(t => t.type)).toEqual(['BigInt', 'Date', 'Set', 'Map']);
    });

    it('should handle arrays with SuperJSON types', () => {
      const data = {
        events: [
          {
            id: 1,
            timestamp: { $type: 'Date', value: '2023-01-01T00:00:00.000Z' },
          },
          {
            id: 2,
            timestamp: { $type: 'Date', value: '2023-01-02T00:00:00.000Z' },
          },
        ],
      };

      const types = extractSuperJsonTypes(data);

      expect(types).toHaveLength(2);
      expect(types[0]).toEqual({
        path: 'events.0.timestamp',
        type: 'Date',
        value: '2023-01-01T00:00:00.000Z',
      });
      expect(types[1]).toEqual({
        path: 'events.1.timestamp',
        type: 'Date',
        value: '2023-01-02T00:00:00.000Z',
      });
    });

    it('should return empty array for regular data', () => {
      const data = { name: 'John', age: 30, active: true };
      const types = extractSuperJsonTypes(data);

      expect(types).toHaveLength(0);
    });

    it('should handle deeply nested structures', () => {
      const data = {
        level1: {
          level2: {
            level3: {
              level4: {
                timestamp: { $type: 'Date', value: '2023-01-01T00:00:00.000Z' },
              },
            },
          },
        },
      };

      const types = extractSuperJsonTypes(data);

      expect(types).toHaveLength(1);
      expect(types[0]).toEqual({
        path: 'level1.level2.level3.level4.timestamp',
        type: 'Date',
        value: '2023-01-01T00:00:00.000Z',
      });
    });
  });

  describe('JsonViewer SuperJSON Integration', () => {
    it('should render with SuperJSON type detection enabled', () => {
      const data = {
        user: {
          createdAt: { $type: 'Date', value: '2023-01-01T00:00:00.000Z' },
          balance: { $type: 'BigInt', value: '123456789' },
        },
      };

      render(<JsonViewer data={data} showTypes={true} />);

      expect(screen.getByTestId('json-view-lite')).toBeInTheDocument();
      expect(screen.getByText('SuperJSON Types Detected:')).toBeInTheDocument();
      expect(screen.getByText('Date')).toBeInTheDocument();
      expect(screen.getByText('BigInt')).toBeInTheDocument();
    });

    it('should display type labels with paths', () => {
      const data = {
        user: {
          profile: {
            createdAt: { $type: 'Date', value: '2023-01-01T00:00:00.000Z' },
          },
          settings: {
            tags: { $type: 'Set', value: ['admin', 'user'] },
          },
        },
      };

      render(<JsonViewer data={data} showTypes={true} />);

      expect(screen.getByText('user.profile.createdAt')).toBeInTheDocument();
      expect(screen.getByText('user.settings.tags')).toBeInTheDocument();
      expect(screen.getByText('Date')).toBeInTheDocument();
      expect(screen.getByText('Set')).toBeInTheDocument();
    });

    it('should not show type labels when showTypes is false', () => {
      const data = {
        user: {
          createdAt: { $type: 'Date', value: '2023-01-01T00:00:00.000Z' },
        },
      };

      render(<JsonViewer data={data} showTypes={false} />);

      expect(
        screen.queryByText('SuperJSON Types Detected:')
      ).not.toBeInTheDocument();
      expect(screen.queryByText('Date')).not.toBeInTheDocument();
    });

    it('should handle regular JSON without SuperJSON detection', () => {
      const data = { name: 'John', age: 30 };

      render(<JsonViewer data={data} showTypes={true} />);

      expect(
        screen.queryByText('SuperJSON Types Detected:')
      ).not.toBeInTheDocument();
      expect(screen.getByTestId('json-view-lite')).toBeInTheDocument();
    });

    it('should display type values in a readable format', () => {
      const data = {
        timestamp: { $type: 'Date', value: '2023-01-01T00:00:00.000Z' },
        balance: { $type: 'BigInt', value: '123456789012345678901234567890' },
        tags: { $type: 'Set', value: ['admin', 'user', 'moderator'] },
        config: {
          $type: 'Map',
          value: [
            ['theme', 'dark'],
            ['language', 'en'],
          ],
        },
      };

      render(<JsonViewer data={data} showTypes={true} />);

      // Should show formatted values
      expect(screen.getByText('2023-01-01T00:00:00.000Z')).toBeInTheDocument();
      expect(
        screen.getByText('123456789012345678901234567890')
      ).toBeInTheDocument();
      expect(
        screen.getByText('["admin","user","moderator"]')
      ).toBeInTheDocument();
      expect(
        screen.getByText('[["theme","dark"],["language","en"]]')
      ).toBeInTheDocument();
    });

    it('should handle empty SuperJSON structures', () => {
      const data = {
        emptySet: { $type: 'Set', value: [] },
        emptyMap: { $type: 'Map', value: [] },
      };

      render(<JsonViewer data={data} showTypes={true} />);

      expect(screen.getByText('SuperJSON Types Detected:')).toBeInTheDocument();
      expect(screen.getByText('Set')).toBeInTheDocument();
      expect(screen.getByText('Map')).toBeInTheDocument();
      expect(screen.getByText('[]')).toBeInTheDocument();
    });

    it('should provide copy functionality for SuperJSON values', () => {
      // Mock clipboard API
      const mockWriteText = vi.fn();
      Object.defineProperty(navigator, 'clipboard', {
        value: { writeText: mockWriteText },
        writable: true,
      });

      const data = {
        timestamp: { $type: 'Date', value: '2023-01-01T00:00:00.000Z' },
      };

      render(<JsonViewer data={data} showTypes={true} />);

      const copyButton = screen.getByRole('button', {
        name: /copy.*timestamp/i,
      });
      copyButton.click();

      expect(mockWriteText).toHaveBeenCalledWith('2023-01-01T00:00:00.000Z');
    });

    it('should handle malformed SuperJSON gracefully', () => {
      const data = {
        malformed1: { $type: 'Date' }, // Missing value
        malformed2: { value: '2023-01-01T00:00:00.000Z' }, // Missing $type
        valid: { $type: 'Date', value: '2023-01-01T00:00:00.000Z' },
      };

      render(<JsonViewer data={data} showTypes={true} />);

      // Should only detect the valid SuperJSON type
      const types = extractSuperJsonTypes(data);
      expect(types).toHaveLength(1);
      expect(types[0].path).toBe('valid');
    });
  });

  describe('Performance with SuperJSON', () => {
    it('should handle large SuperJSON structures efficiently', () => {
      const largeData = {
        users: Array.from({ length: 1000 }, (_, i) => ({
          id: { $type: 'BigInt', value: String(i) },
          createdAt: { $type: 'Date', value: '2023-01-01T00:00:00.000Z' },
          tags: { $type: 'Set', value: [`tag${i}`, `role${i % 10}`] },
        })),
      };

      const startTime = performance.now();
      const types = extractSuperJsonTypes(largeData);
      const endTime = performance.now();

      expect(types).toHaveLength(3000); // 3 types per user * 1000 users
      expect(endTime - startTime).toBeLessThan(100); // Should complete within 100ms
    });

    it('should memoize SuperJSON detection results', () => {
      const data = {
        timestamp: { $type: 'Date', value: '2023-01-01T00:00:00.000Z' },
      };

      // First call
      const startTime1 = performance.now();
      const result1 = detectSuperJson(data);
      const endTime1 = performance.now();

      // Second call with same data
      const startTime2 = performance.now();
      const result2 = detectSuperJson(data);
      const endTime2 = performance.now();

      expect(result1).toBe(result2);
      expect(result1).toBe(true);

      // Second call should be faster (memoized)
      expect(endTime2 - startTime2).toBeLessThan(endTime1 - startTime1);
    });
  });
});
