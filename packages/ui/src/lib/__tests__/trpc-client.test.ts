import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  buildTrpcRequest,
  buildTrpcBatchRequest,
  executeTrpcRequest,
  executeTrpcBatchRequest,
  detectSuperJson,
  extractSuperJsonTypes,
} from '../trpc-client';

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('tRPC Client', () => {
  beforeEach(() => {
    mockFetch.mockClear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('buildTrpcRequest', () => {
    it('should build a valid tRPC request', () => {
      const request = buildTrpcRequest('user.getById', 'query', { id: '123' });

      expect(request).toMatchObject({
        jsonrpc: '2.0',
        method: 'query',
        params: {
          path: 'user.getById',
          input: { id: '123' },
        },
      });
      expect(request.id).toBeDefined();
    });

    it('should handle requests without input', () => {
      const request = buildTrpcRequest('user.getAll', 'query');

      expect(request.params.input).toBeUndefined();
    });
  });

  describe('buildTrpcBatchRequest', () => {
    it('should build multiple tRPC requests', () => {
      const requests = buildTrpcBatchRequest([
        { path: 'user.getById', type: 'query', input: { id: '123' } },
        { path: 'user.create', type: 'mutation', input: { name: 'John' } },
      ]);

      expect(requests).toHaveLength(2);
      expect(requests[0].params.path).toBe('user.getById');
      expect(requests[1].params.path).toBe('user.create');
    });
  });

  describe('executeTrpcRequest', () => {
    it('should execute a query request successfully', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: new Map([['content-type', 'application/json']]),
        text: () =>
          Promise.resolve('{"result":{"data":{"id":"123","name":"John"}}}'),
      };
      mockFetch.mockResolvedValue(mockResponse);

      const request = buildTrpcRequest('user.getById', 'query', { id: '123' });
      const result = await executeTrpcRequest(request, {
        baseUrl: 'http://localhost:3000',
        endpoint: '/api/trpc',
      });

      expect(result.status).toBe(200);
      expect(result.response?.result?.data).toEqual({
        id: '123',
        name: 'John',
      });
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3000/api/trpc/user.getById?input=%7B%22id%22%3A%22123%22%7D',
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
          }),
        })
      );
    });

    it('should execute a mutation request successfully', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: new Map([['content-type', 'application/json']]),
        text: () =>
          Promise.resolve('{"result":{"data":{"id":"456","name":"Jane"}}}'),
      };
      mockFetch.mockResolvedValue(mockResponse);

      const request = buildTrpcRequest('user.create', 'mutation', {
        name: 'Jane',
      });
      const result = await executeTrpcRequest(request, {
        baseUrl: 'http://localhost:3000',
        endpoint: '/api/trpc',
      });

      expect(result.status).toBe(200);
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3000/api/trpc/user.create',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ name: 'Jane' }),
        })
      );
    });

    it('should handle network errors', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));

      const request = buildTrpcRequest('user.getById', 'query', { id: '123' });
      const result = await executeTrpcRequest(request, {
        baseUrl: 'http://localhost:3000',
        endpoint: '/api/trpc',
      });

      expect(result.status).toBe(0);
      expect(result.statusText).toBe('Network Error');
      expect(result.error).toBe('Network error');
    });

    it('should handle HTTP errors', async () => {
      const mockResponse = {
        ok: false,
        status: 404,
        statusText: 'Not Found',
        headers: new Map(),
        text: () => Promise.resolve('Not found'),
      };
      mockFetch.mockResolvedValue(mockResponse);

      const request = buildTrpcRequest('user.getById', 'query', { id: '999' });
      const result = await executeTrpcRequest(request, {
        baseUrl: 'http://localhost:3000',
        endpoint: '/api/trpc',
      });

      expect(result.status).toBe(404);
      expect(result.error).toBe('Not found');
    });

    it('should include custom headers and credentials', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: new Map(),
        text: () => Promise.resolve('{"result":{"data":{}}}'),
      };
      mockFetch.mockResolvedValue(mockResponse);

      const request = buildTrpcRequest('user.getById', 'query', { id: '123' });
      await executeTrpcRequest(request, {
        baseUrl: 'http://localhost:3000',
        endpoint: '/api/trpc',
        headers: { Authorization: 'Bearer token123' },
        withCredentials: true,
      });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer token123',
          }),
          credentials: 'include',
        })
      );
    });
  });

  describe('detectSuperJson', () => {
    it('should detect SuperJSON structure', () => {
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
        },
      };

      expect(detectSuperJson(data)).toBe(true);
    });

    it('should return false for regular JSON', () => {
      const data = { name: 'John', age: 30 };

      expect(detectSuperJson(data)).toBe(false);
    });

    it('should return false for non-objects', () => {
      expect(detectSuperJson('string')).toBe(false);
      expect(detectSuperJson(123)).toBe(false);
      expect(detectSuperJson(null)).toBe(false);
    });
  });

  describe('extractSuperJsonTypes', () => {
    it('should extract SuperJSON type information', () => {
      const data = {
        user: {
          createdAt: { $type: 'Date', value: '2023-01-01T00:00:00.000Z' },
          balance: { $type: 'BigInt', value: '123456789' },
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
        path: 'user.balance',
        type: 'BigInt',
        value: '123456789',
      });
    });

    it('should return empty array for regular data', () => {
      const data = { name: 'John', age: 30 };
      const types = extractSuperJsonTypes(data);

      expect(types).toHaveLength(0);
    });
  });
});
