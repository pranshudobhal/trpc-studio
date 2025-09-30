/**
 * Consolidated tests for UI library utilities including environment manager and tRPC client
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  EnvironmentManager,
  DEFAULT_ENVIRONMENTS,
} from '../environment-manager';
import {
  buildTrpcRequest,
  buildTrpcBatchRequest,
  executeTrpcRequest,
  executeTrpcBatchRequest,
  detectSuperJson,
  extractSuperJsonTypes,
} from '../trpc-client';
import type { Environment } from '../../components/environment-selector';

// Mock localStorage
const mockLocalStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};

Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
});

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('UI Library Utilities', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockClear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Environment Manager', () => {
    const mockEnvironments: Environment[] = [
      {
        id: 'test1',
        name: 'Test Environment 1',
        baseUrl: 'https://test1.example.com',
        headers: { 'x-api-key': 'key1' },
        withCredentials: true,
      },
      {
        id: 'test2',
        name: 'Test Environment 2',
        baseUrl: 'https://test2.example.com',
        headers: {},
        withCredentials: false,
      },
    ];

    describe('loadEnvironments', () => {
      it('loads environments from localStorage', () => {
        mockLocalStorage.getItem.mockReturnValue(
          JSON.stringify(mockEnvironments)
        );

        const result = EnvironmentManager.loadEnvironments();

        expect(mockLocalStorage.getItem).toHaveBeenCalledWith(
          'trpc-studio-environments'
        );
        expect(result).toEqual(mockEnvironments);
      });

      it('returns default environments when localStorage is empty', () => {
        mockLocalStorage.getItem.mockReturnValue(null);

        const result = EnvironmentManager.loadEnvironments();

        expect(result).toEqual(DEFAULT_ENVIRONMENTS);
      });

      it('returns default environments when localStorage contains invalid JSON', () => {
        mockLocalStorage.getItem.mockReturnValue('invalid-json');
        const consoleSpy = vi
          .spyOn(console, 'error')
          .mockImplementation(() => {});

        const result = EnvironmentManager.loadEnvironments();

        expect(result).toEqual(DEFAULT_ENVIRONMENTS);
        expect(consoleSpy).toHaveBeenCalledWith(
          'Failed to load environments from localStorage:',
          expect.any(Error)
        );

        consoleSpy.mockRestore();
      });
    });

    describe('saveEnvironments', () => {
      it('saves environments to localStorage', () => {
        EnvironmentManager.saveEnvironments(mockEnvironments);

        expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
          'trpc-studio-environments',
          JSON.stringify(mockEnvironments)
        );
      });

      it('handles localStorage errors gracefully', () => {
        mockLocalStorage.setItem.mockImplementation(() => {
          throw new Error('Storage quota exceeded');
        });
        const consoleSpy = vi
          .spyOn(console, 'error')
          .mockImplementation(() => {});

        EnvironmentManager.saveEnvironments(mockEnvironments);

        expect(consoleSpy).toHaveBeenCalledWith(
          'Failed to save environments to localStorage:',
          expect.any(Error)
        );

        consoleSpy.mockRestore();
      });
    });

    describe('createEnvironment', () => {
      it('creates a new environment with generated ID', () => {
        const newEnv = {
          name: 'New Environment',
          baseUrl: 'https://new.example.com',
          headers: { authorization: 'Bearer token' },
          withCredentials: true,
        };

        const result = EnvironmentManager.createEnvironment(
          mockEnvironments,
          newEnv
        );

        expect(result).toHaveLength(3);
        expect(result[2]).toMatchObject(newEnv);
        expect(result[2].id).toMatch(/^env_\d+_[a-z0-9]+$/);
        expect(mockLocalStorage.setItem).toHaveBeenCalled();
      });
    });

    describe('updateEnvironment', () => {
      it('updates an existing environment', () => {
        const updates = {
          name: 'Updated Name',
          baseUrl: 'https://updated.example.com',
        };

        const result = EnvironmentManager.updateEnvironment(
          mockEnvironments,
          'test1',
          updates
        );

        expect(result[0]).toMatchObject({
          id: 'test1',
          name: 'Updated Name',
          baseUrl: 'https://updated.example.com',
          headers: { 'x-api-key': 'key1' }, // Should preserve existing headers
          withCredentials: true,
        });
        expect(result[1]).toEqual(mockEnvironments[1]); // Should not affect other environments
        expect(mockLocalStorage.setItem).toHaveBeenCalled();
      });
    });

    describe('deleteEnvironment', () => {
      it('deletes an environment by ID', () => {
        const result = EnvironmentManager.deleteEnvironment(
          mockEnvironments,
          'test1'
        );

        expect(result).toHaveLength(1);
        expect(result[0]).toEqual(mockEnvironments[1]);
        expect(mockLocalStorage.setItem).toHaveBeenCalled();
      });
    });

    describe('generateCurlCommand', () => {
      const testEnv: Environment = {
        id: 'test',
        name: 'Test',
        baseUrl: 'https://api.example.com',
        headers: {
          authorization: 'Bearer token123',
          'x-api-key': 'key456',
        },
        withCredentials: true,
      };

      it('generates basic cURL command', () => {
        const result = EnvironmentManager.generateCurlCommand(testEnv);

        expect(result).toContain('curl -X POST');
        expect(result).toContain(
          'https://api.example.com/api/trpc/procedureName'
        );
        expect(result).toContain('-H "Content-Type: application/json"');
        expect(result).toContain('-H "Authorization: Bearer token123"');
        expect(result).toContain('-H "X-Api-Key: key456"');
        expect(result).toContain('--include');
        expect(result).toContain('-d \'{"input":{}}\'');
      });

      it('generates cURL command with custom options', () => {
        const options = {
          endpoint: '/api/custom',
          method: 'GET',
          body: { custom: 'data' },
          procedureName: 'customProcedure',
        };

        const result = EnvironmentManager.generateCurlCommand(testEnv, options);

        expect(result).toContain('curl -X GET');
        expect(result).toContain(
          'https://api.example.com/api/custom/customProcedure'
        );
        // GET request should encode input as query param instead of -d body
        expect(result).toMatch(/customProcedure\?input=/);
        expect(result).not.toContain('-d \'{"custom":"data"}\'');
      });
    });

    describe('validateEnvironment', () => {
      it('returns no errors for valid environment', () => {
        const validEnv = {
          name: 'Valid Environment',
          baseUrl: 'https://valid.example.com',
          headers: { 'x-api-key': 'valid-key' },
          withCredentials: true,
        };

        const errors = EnvironmentManager.validateEnvironment(validEnv);

        expect(errors).toEqual([]);
      });

      it('returns error for missing name', () => {
        const invalidEnv = {
          baseUrl: 'https://valid.example.com',
        };

        const errors = EnvironmentManager.validateEnvironment(invalidEnv);

        expect(errors).toContain('Name is required');
      });

      it('returns error for invalid baseUrl', () => {
        const invalidEnv = {
          name: 'Valid Name',
          baseUrl: 'not-a-valid-url',
        };

        const errors = EnvironmentManager.validateEnvironment(invalidEnv);

        expect(errors).toContain('Base URL must be a valid URL');
      });

      it('returns multiple errors for multiple issues', () => {
        const invalidEnv = {
          name: '',
          baseUrl: 'invalid-url',
          headers: { '': 'value', 'valid-key': 123 as any },
        };

        const errors = EnvironmentManager.validateEnvironment(invalidEnv);

        expect(errors.length).toBeGreaterThan(1);
        expect(errors).toContain('Name is required');
        expect(errors).toContain('Base URL must be a valid URL');
      });
    });

    describe('importEnvironments', () => {
      it('imports valid environments JSON', () => {
        const jsonString = JSON.stringify(mockEnvironments);

        const result = EnvironmentManager.importEnvironments(jsonString);

        expect(result).toEqual(mockEnvironments);
      });

      it('throws error for invalid JSON', () => {
        expect(() => {
          EnvironmentManager.importEnvironments('invalid-json');
        }).toThrow('Failed to import environments');
      });

      it('throws error for non-array JSON', () => {
        expect(() => {
          EnvironmentManager.importEnvironments('{"not": "array"}');
        }).toThrow('Invalid format: expected array of environments');
      });
    });
  });

  describe('tRPC Client', () => {
    describe('buildTrpcRequest', () => {
      it('should build a valid tRPC request', () => {
        const request = buildTrpcRequest('user.getById', 'query', {
          id: '123',
        });

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

        const request = buildTrpcRequest('user.getById', 'query', {
          id: '123',
        });
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

        const request = buildTrpcRequest('user.getById', 'query', {
          id: '123',
        });
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

        const request = buildTrpcRequest('user.getById', 'query', {
          id: '999',
        });
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

        const request = buildTrpcRequest('user.getById', 'query', {
          id: '123',
        });
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

    describe('SuperJSON Detection', () => {
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
  });
});
