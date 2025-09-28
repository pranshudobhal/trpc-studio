/**
 * Tests for Copy as cURL functionality
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EnvironmentManager } from '../environment-manager';
import type { Environment } from '../../components/environment-selector';

describe('Copy as cURL Functionality', () => {
  const testEnvironment: Environment = {
    id: 'test-env',
    name: 'Test Environment',
    baseUrl: 'https://api.example.com',
    headers: {
      authorization: 'Bearer token123',
      'x-api-key': 'key456',
      'content-type': 'application/json',
      'user-agent': 'tRPC Studio/1.0',
    },
    withCredentials: true,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Basic cURL Generation', () => {
    it('should generate basic cURL command with default options', () => {
      const curl = EnvironmentManager.generateCurlCommand(testEnvironment);

      expect(curl).toContain('curl -X POST');
      expect(curl).toContain('https://api.example.com/api/trpc/procedureName');
      expect(curl).toContain('-H "Content-Type: application/json"');
      expect(curl).toContain('-H "authorization: Bearer token123"');
      expect(curl).toContain('-H "x-api-key: key456"');
      expect(curl).toContain('-H "user-agent: tRPC Studio/1.0"');
      expect(curl).toContain('--include');
      expect(curl).toContain('-d \'{"input":{}}\'');
    });

    it('should generate cURL for GET requests (queries)', () => {
      const curl = EnvironmentManager.generateCurlCommand(testEnvironment, {
        method: 'GET',
        procedureName: 'user.getById',
        body: { id: '123' },
      });

      expect(curl).toContain('curl -X GET');
      expect(curl).toContain('https://api.example.com/api/trpc/user.getById');
      expect(curl).toContain('input=%7B%22id%22%3A%22123%22%7D'); // URL encoded JSON
      expect(curl).not.toContain('-d '); // No body for GET
    });

    it('should generate cURL for POST requests (mutations)', () => {
      const curl = EnvironmentManager.generateCurlCommand(testEnvironment, {
        method: 'POST',
        procedureName: 'user.create',
        body: { name: 'John Doe', email: 'john@example.com' },
      });

      expect(curl).toContain('curl -X POST');
      expect(curl).toContain('https://api.example.com/api/trpc/user.create');
      expect(curl).toContain(
        '-d \'{"name":"John Doe","email":"john@example.com"}\''
      );
    });
  });

  describe('Header Handling', () => {
    it('should include all custom headers', () => {
      const envWithManyHeaders: Environment = {
        ...testEnvironment,
        headers: {
          authorization: 'Bearer secret-token',
          'x-api-key': 'api-key-123',
          'x-client-version': '1.2.3',
          'x-request-id': 'req-456',
          accept: 'application/json',
          'cache-control': 'no-cache',
        },
      };

      const curl = EnvironmentManager.generateCurlCommand(envWithManyHeaders);

      expect(curl).toContain('-H "authorization: Bearer secret-token"');
      expect(curl).toContain('-H "x-api-key: api-key-123"');
      expect(curl).toContain('-H "x-client-version: 1.2.3"');
      expect(curl).toContain('-H "x-request-id: req-456"');
      expect(curl).toContain('-H "accept: application/json"');
      expect(curl).toContain('-H "cache-control: no-cache"');
    });

    it('should handle headers with special characters', () => {
      const envWithSpecialHeaders: Environment = {
        ...testEnvironment,
        headers: {
          'x-custom': 'value with spaces',
          'x-quotes': 'value "with" quotes',
          'x-backslash': 'value\\with\\backslashes',
          'x-newline': 'value\nwith\nnewlines',
        },
      };

      const curl = EnvironmentManager.generateCurlCommand(
        envWithSpecialHeaders
      );

      expect(curl).toContain('-H "x-custom: value with spaces"');
      expect(curl).toContain('-H "x-quotes: value \\"with\\" quotes"');
      expect(curl).toContain('-H "x-backslash: value\\\\with\\\\backslashes"');
      expect(curl).toContain('-H "x-newline: value\\nwith\\nnewlines"');
    });

    it('should handle empty headers object', () => {
      const envWithoutHeaders: Environment = {
        ...testEnvironment,
        headers: {},
      };

      const curl = EnvironmentManager.generateCurlCommand(envWithoutHeaders);

      expect(curl).toContain('-H "Content-Type: application/json"');
      expect(curl).not.toContain('authorization');
      expect(curl).not.toContain('x-api-key');
    });

    it('should not duplicate Content-Type header', () => {
      const envWithContentType: Environment = {
        ...testEnvironment,
        headers: {
          'content-type': 'application/json; charset=utf-8',
          authorization: 'Bearer token',
        },
      };

      const curl = EnvironmentManager.generateCurlCommand(envWithContentType);

      // Should only appear once
      const contentTypeMatches = curl.match(/Content-Type/gi);
      expect(contentTypeMatches).toHaveLength(1);
      expect(curl).toContain(
        '-H "content-type: application/json; charset=utf-8"'
      );
    });
  });

  describe('Credentials and Cookies', () => {
    it('should include credentials flag when withCredentials is true', () => {
      const curl = EnvironmentManager.generateCurlCommand({
        ...testEnvironment,
        withCredentials: true,
      });

      expect(curl).toContain('--include');
      expect(curl).toContain('--cookie-jar cookies.txt');
      expect(curl).toContain('--cookie cookies.txt');
    });

    it('should omit credentials flag when withCredentials is false', () => {
      const curl = EnvironmentManager.generateCurlCommand({
        ...testEnvironment,
        withCredentials: false,
      });

      expect(curl).not.toContain('--include');
      expect(curl).not.toContain('--cookie-jar');
      expect(curl).not.toContain('--cookie');
    });

    it('should handle cookie headers when withCredentials is true', () => {
      const envWithCookies: Environment = {
        ...testEnvironment,
        headers: {
          cookie: 'sessionId=abc123; userId=456',
          authorization: 'Bearer token',
        },
        withCredentials: true,
      };

      const curl = EnvironmentManager.generateCurlCommand(envWithCookies);

      expect(curl).toContain('-H "cookie: sessionId=abc123; userId=456"');
      expect(curl).toContain('--cookie-jar cookies.txt');
    });
  });

  describe('URL and Endpoint Handling', () => {
    it('should handle custom endpoints', () => {
      const curl = EnvironmentManager.generateCurlCommand(testEnvironment, {
        endpoint: '/api/custom-trpc',
        procedureName: 'test.procedure',
      });

      expect(curl).toContain(
        'https://api.example.com/api/custom-trpc/test.procedure'
      );
    });

    it('should handle base URLs with trailing slashes', () => {
      const envWithTrailingSlash: Environment = {
        ...testEnvironment,
        baseUrl: 'https://api.example.com/',
      };

      const curl = EnvironmentManager.generateCurlCommand(envWithTrailingSlash);

      expect(curl).toContain('https://api.example.com/api/trpc/procedureName');
      expect(curl).not.toContain('//api/trpc'); // No double slashes
    });

    it('should handle base URLs without protocol', () => {
      const envWithoutProtocol: Environment = {
        ...testEnvironment,
        baseUrl: 'api.example.com',
      };

      const curl = EnvironmentManager.generateCurlCommand(envWithoutProtocol);

      expect(curl).toContain('https://api.example.com/api/trpc/procedureName');
    });

    it('should handle localhost URLs', () => {
      const localhostEnv: Environment = {
        ...testEnvironment,
        baseUrl: 'http://localhost:3000',
      };

      const curl = EnvironmentManager.generateCurlCommand(localhostEnv);

      expect(curl).toContain('http://localhost:3000/api/trpc/procedureName');
    });

    it('should handle URLs with ports', () => {
      const envWithPort: Environment = {
        ...testEnvironment,
        baseUrl: 'https://api.example.com:8443',
      };

      const curl = EnvironmentManager.generateCurlCommand(envWithPort);

      expect(curl).toContain(
        'https://api.example.com:8443/api/trpc/procedureName'
      );
    });
  });

  describe('Request Body Handling', () => {
    it('should handle complex nested objects', () => {
      const complexBody = {
        user: {
          name: 'John Doe',
          email: 'john@example.com',
          profile: {
            age: 30,
            preferences: {
              theme: 'dark',
              notifications: true,
            },
          },
        },
        metadata: {
          source: 'api',
          timestamp: '2023-01-01T00:00:00.000Z',
        },
      };

      const curl = EnvironmentManager.generateCurlCommand(testEnvironment, {
        body: complexBody,
      });

      expect(curl).toContain("-d '");
      expect(curl).toContain(JSON.stringify(complexBody));
    });

    it('should handle arrays in request body', () => {
      const arrayBody = {
        users: [
          { id: 1, name: 'Alice' },
          { id: 2, name: 'Bob' },
          { id: 3, name: 'Charlie' },
        ],
        tags: ['admin', 'user', 'guest'],
      };

      const curl = EnvironmentManager.generateCurlCommand(testEnvironment, {
        body: arrayBody,
      });

      expect(curl).toContain(JSON.stringify(arrayBody));
    });

    it('should handle null and undefined values', () => {
      const bodyWithNulls = {
        name: 'John',
        middleName: null,
        nickname: undefined,
        age: 30,
      };

      const curl = EnvironmentManager.generateCurlCommand(testEnvironment, {
        body: bodyWithNulls,
      });

      // undefined should be omitted, null should be preserved
      const expectedBody = JSON.stringify({
        name: 'John',
        middleName: null,
        age: 30,
      });
      expect(curl).toContain(expectedBody);
    });

    it('should handle empty request body', () => {
      const curl = EnvironmentManager.generateCurlCommand(testEnvironment, {
        body: {},
      });

      expect(curl).toContain("-d '{}'");
    });

    it('should handle string request body', () => {
      const curl = EnvironmentManager.generateCurlCommand(testEnvironment, {
        body: 'simple string body',
      });

      expect(curl).toContain('-d \'"simple string body"\'');
    });

    it('should escape special characters in JSON body', () => {
      const bodyWithSpecialChars = {
        message: 'Hello "world" with \'quotes\' and \n newlines',
        path: 'C:\\Users\\test\\file.txt',
      };

      const curl = EnvironmentManager.generateCurlCommand(testEnvironment, {
        body: bodyWithSpecialChars,
      });

      expect(curl).toContain(JSON.stringify(bodyWithSpecialChars));
    });
  });

  describe('Query Parameters for GET Requests', () => {
    it('should encode query parameters properly', () => {
      const curl = EnvironmentManager.generateCurlCommand(testEnvironment, {
        method: 'GET',
        procedureName: 'user.search',
        body: {
          query: 'john doe',
          filters: {
            active: true,
            role: 'admin',
          },
          limit: 10,
        },
      });

      expect(curl).toContain('user.search');
      expect(curl).toContain('input=');

      // Should be URL encoded
      const encodedInput = encodeURIComponent(
        JSON.stringify({
          query: 'john doe',
          filters: { active: true, role: 'admin' },
          limit: 10,
        })
      );
      expect(curl).toContain(encodedInput);
    });

    it('should handle special characters in query parameters', () => {
      const curl = EnvironmentManager.generateCurlCommand(testEnvironment, {
        method: 'GET',
        procedureName: 'search',
        body: {
          query: 'test & special chars',
          filter: 'name="John Doe"',
        },
      });

      const encodedInput = encodeURIComponent(
        JSON.stringify({
          query: 'test & special chars',
          filter: 'name="John Doe"',
        })
      );
      expect(curl).toContain(encodedInput);
    });

    it('should handle empty query parameters', () => {
      const curl = EnvironmentManager.generateCurlCommand(testEnvironment, {
        method: 'GET',
        procedureName: 'user.getAll',
        body: {},
      });

      expect(curl).toContain('input=%7B%7D'); // URL encoded '{}'
    });
  });

  describe('cURL Command Formatting', () => {
    it('should format command with proper line breaks for readability', () => {
      const curl = EnvironmentManager.generateCurlCommand(testEnvironment);

      // Should have line breaks for readability
      expect(curl).toContain(' \\\n');

      // Each header should be on its own line
      const lines = curl.split('\n');
      expect(lines.length).toBeGreaterThan(1);
    });

    it('should order headers consistently', () => {
      const curl = EnvironmentManager.generateCurlCommand(testEnvironment);

      const lines = curl.split('\n');
      const headerLines = lines.filter(line => line.trim().startsWith('-H'));

      // Content-Type should come first
      expect(headerLines[0]).toContain('Content-Type');

      // Other headers should be in alphabetical order
      const otherHeaders = headerLines.slice(1);
      const headerNames = otherHeaders.map(line => {
        const match = line.match(/-H "([^:]+):/);
        return match ? match[1] : '';
      });

      const sortedHeaders = [...headerNames].sort();
      expect(headerNames).toEqual(sortedHeaders);
    });

    it('should handle very long URLs gracefully', () => {
      const longProcedureName =
        'very.long.procedure.name.with.many.segments.that.creates.a.very.long.url';
      const curl = EnvironmentManager.generateCurlCommand(testEnvironment, {
        procedureName: longProcedureName,
      });

      expect(curl).toContain(longProcedureName);
      expect(curl.length).toBeLessThan(10000); // Reasonable length limit
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle environment with minimal configuration', () => {
      const minimalEnv: Environment = {
        id: 'minimal',
        name: 'Minimal',
        baseUrl: 'https://api.example.com',
        headers: {},
        withCredentials: false,
      };

      const curl = EnvironmentManager.generateCurlCommand(minimalEnv);

      expect(curl).toContain('curl -X POST');
      expect(curl).toContain('https://api.example.com/api/trpc/procedureName');
      expect(curl).toContain('-H "Content-Type: application/json"');
      expect(curl).not.toContain('--include');
    });

    it('should handle invalid JSON in body gracefully', () => {
      const curl = EnvironmentManager.generateCurlCommand(testEnvironment, {
        body: { circular: {} } as any,
      });

      // Should handle circular references or other JSON issues
      expect(curl).toContain('curl -X POST');
      expect(curl).toContain('-d ');
    });

    it('should handle very large request bodies', () => {
      const largeBody = {
        data: Array.from({ length: 1000 }, (_, i) => ({
          id: i,
          name: `Item ${i}`,
          description: `Description for item ${i}`.repeat(10),
        })),
      };

      const curl = EnvironmentManager.generateCurlCommand(testEnvironment, {
        body: largeBody,
      });

      expect(curl).toContain('curl -X POST');
      expect(curl).toContain("-d '");
      // Should not crash or produce invalid cURL
    });

    it('should handle environment with invalid base URL', () => {
      const invalidEnv: Environment = {
        ...testEnvironment,
        baseUrl: 'not-a-valid-url',
      };

      const curl = EnvironmentManager.generateCurlCommand(invalidEnv);

      // Should still generate a command, possibly with https:// prefix
      expect(curl).toContain('curl -X POST');
      expect(curl).toContain('not-a-valid-url');
    });
  });

  describe('Integration with Environment Manager', () => {
    it('should work with real environment data from localStorage', () => {
      const environments = [testEnvironment];
      const curl = EnvironmentManager.generateCurlCommand(environments[0]);

      expect(curl).toContain('curl -X POST');
      expect(curl).toContain(testEnvironment.baseUrl);
      expect(curl).toContain(testEnvironment.headers.authorization);
    });

    it('should reflect current environment state', () => {
      const updatedEnv: Environment = {
        ...testEnvironment,
        headers: {
          ...testEnvironment.headers,
          'x-updated': 'true',
        },
      };

      const curl = EnvironmentManager.generateCurlCommand(updatedEnv);

      expect(curl).toContain('-H "x-updated: true"');
    });
  });
});
