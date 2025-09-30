import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { createStudioHandler } from '../app-router/handler';
import { z } from 'zod';
import {
  shouldEnableStudio,
  validateStudioConfiguration,
  getEffectiveToken,
  validateRequestToken,
} from '@trpc-studio/core';

// Mock the core module with actual implementations for integration testing
vi.mock('@trpc-studio/core', async () => {
  const actual = await vi.importActual('@trpc-studio/core');
  return {
    ...actual,
    // Override environment detection for testing
    shouldEnableStudio: vi.fn(() => true),
    validateStudioConfiguration: vi.fn(() => ({
      canEnable: true,
      requiresToken: false,
      errors: [],
    })),
    getEffectiveToken: vi.fn(() => undefined),
    validateRequestToken: vi.fn(() => ({ valid: true })),
  };
});

describe('Next.js Adapter Integration', () => {
  // Create a mock tRPC router similar to what would be used in a real app
  const mockRouter = {
    _def: {
      procedures: {
        hello: {
          _def: {
            type: 'query',
            meta: {
              summary: 'Say hello',
              description: 'Returns a greeting message',
              tags: ['greeting'],
            },
            inputs: [z.object({ text: z.string() })],
            output: z.object({ greeting: z.string() }),
          },
        },
        create: {
          _def: {
            type: 'mutation',
            meta: {
              summary: 'Create item',
              description: 'Creates a new item',
              tags: ['items'],
            },
            inputs: [z.object({ name: z.string().min(1) })],
            output: z.object({ id: z.number(), name: z.string() }),
          },
        },
        internal: {
          _def: {
            type: 'query',
            meta: {
              summary: 'Internal procedure',
              description: 'An internal procedure for testing',
              visibility: 'internal',
            },
            inputs: [z.object({ data: z.string() })],
            output: z.object({ result: z.string() }),
          },
        },
        hidden: {
          _def: {
            type: 'query',
            meta: {
              summary: 'Hidden procedure',
              description: 'A hidden procedure that should not appear in docs',
              visibility: 'hidden',
            },
            inputs: [z.object({ secret: z.string() })],
            output: z.object({ value: z.string() }),
          },
        },
      },
      router: {},
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    // Reset environment
    delete process.env.NODE_ENV;
    delete process.env.TRPC_STUDIO_ENABLED;
    delete process.env.TRPC_STUDIO_TOKEN;
  });

  describe('Introspection Generation', () => {
    it('should generate valid introspection data from a real router', async () => {
      const handler = createStudioHandler({ router: mockRouter });
      const request = new NextRequest(
        'http://localhost:3000/__trpc-studio__/introspection',
        {
          method: 'GET',
        }
      );

      const response = await handler(request);
      expect(response.status).toBe(200);

      const data = await response.json();

      // Verify structure
      expect(data).toHaveProperty('routers');
      expect(data).toHaveProperty('meta');
      expect(data.meta).toHaveProperty('generatedAt');
      expect(data.meta.generatedAt).toMatch(
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/
      );

      // Verify procedures are included
      expect(data.routers).toHaveLength(1);
      const rootRouter = data.routers[0];
      expect(rootRouter.name).toBe('root');
      expect(rootRouter.procedures).toHaveLength(3); // hello, create, internal (hidden should be excluded)

      // Verify procedure details
      const helloProcedure = rootRouter.procedures.find(
        (p: any) => p.name === 'hello'
      );
      expect(helloProcedure).toBeDefined();
      expect(helloProcedure.type).toBe('query');
      expect(helloProcedure.meta.summary).toBe('Say hello');
      expect(helloProcedure.meta.tags).toEqual(['greeting']);

      const createProcedure = rootRouter.procedures.find(
        (p: any) => p.name === 'create'
      );
      expect(createProcedure).toBeDefined();
      expect(createProcedure.type).toBe('mutation');

      const internalProcedure = rootRouter.procedures.find(
        (p: any) => p.name === 'internal'
      );
      expect(internalProcedure).toBeDefined();
      expect(internalProcedure.meta.visibility).toBe('internal');

      // Verify hidden procedure is excluded
      const hiddenProcedure = rootRouter.procedures.find(
        (p: any) => p.name === 'hidden'
      );
      expect(hiddenProcedure).toBeUndefined();
    });

    it('should include cache headers for introspection responses', async () => {
      const handler = createStudioHandler({ router: mockRouter });
      const request = new NextRequest(
        'http://localhost:3000/__trpc-studio__/introspection',
        {
          method: 'GET',
        }
      );

      const response = await handler(request);
      expect(response.status).toBe(200);

      // Verify cache headers
      expect(response.headers.get('Cache-Control')).toBe(
        'no-cache, no-store, must-revalidate'
      );
      expect(response.headers.get('Pragma')).toBe('no-cache');
      expect(response.headers.get('Expires')).toBe('0');
    });

    it('should handle custom configuration options', async () => {
      const handler = createStudioHandler({
        router: mockRouter,
        trpcEndpoint: '/api/custom-trpc',
        studioPath: '/custom-studio',
        introspectionPath: '/custom-introspection',
      });

      const request = new NextRequest(
        'http://localhost:3000/custom-introspection',
        {
          method: 'GET',
        }
      );

      const response = await handler(request);
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data).toHaveProperty('routers');
      expect(data).toHaveProperty('meta');
    });
  });

  describe('Error Handling', () => {
    it('should handle malformed router gracefully', async () => {
      const invalidRouter = { invalid: 'router' };
      const handler = createStudioHandler({ router: invalidRouter });

      const request = new NextRequest(
        'http://localhost:3000/__trpc-studio__/introspection',
        {
          method: 'GET',
        }
      );

      const response = await handler(request);
      expect(response.status).toBe(500);
    });

    it('should return proper error response format', async () => {
      const invalidRouter = null;
      const handler = createStudioHandler({ router: invalidRouter });

      const request = new NextRequest(
        'http://localhost:3000/__trpc-studio__/introspection',
        {
          method: 'GET',
        }
      );

      const response = await handler(request);
      expect(response.status).toBe(500);

      const data = await response.json();
      expect(data).toHaveProperty('error');
      expect(data.error).toBe('Internal server error');
    });
  });

  describe('Security Integration', () => {
    describe('Production Environment', () => {
      beforeEach(() => {
        process.env.NODE_ENV = 'production';
      });

      it('should return 404 when TRPC_STUDIO_ENABLED is not set', async () => {
        vi.mocked(shouldEnableStudio).mockReturnValue(false);

        const handler = createStudioHandler({ router: mockRouter });
        const request = new NextRequest(
          'http://localhost:3000/__trpc-studio__/introspection',
          {
            method: 'GET',
          }
        );

        const response = await handler(request);
        expect(response.status).toBe(404);
      });

      it('should require token when enabled in production', async () => {
        process.env.TRPC_STUDIO_ENABLED = 'true';

        vi.mocked(shouldEnableStudio).mockReturnValue(true);
        vi.mocked(validateStudioConfiguration).mockReturnValue({
          canEnable: true,
          requiresToken: true,
          errors: [],
        });
        vi.mocked(validateRequestToken).mockReturnValue({
          valid: false,
          error: 'No token provided',
        });

        const handler = createStudioHandler({ router: mockRouter });
        const request = new NextRequest(
          'http://localhost:3000/__trpc-studio__/introspection',
          {
            method: 'GET',
          }
        );

        const response = await handler(request);
        expect(response.status).toBe(403);
      });

      it('should work with valid token in production', async () => {
        process.env.TRPC_STUDIO_ENABLED = 'true';
        process.env.TRPC_STUDIO_TOKEN = 'valid-token';

        vi.mocked(shouldEnableStudio).mockReturnValue(true);
        vi.mocked(validateStudioConfiguration).mockReturnValue({
          canEnable: true,
          requiresToken: true,
          errors: [],
        });
        vi.mocked(getEffectiveToken).mockReturnValue('valid-token');
        vi.mocked(validateRequestToken).mockReturnValue({
          valid: true,
          token: 'valid-token',
        });

        const handler = createStudioHandler({ router: mockRouter });
        const request = new NextRequest(
          'http://localhost:3000/__trpc-studio__/introspection',
          {
            method: 'GET',
            headers: {
              Authorization: 'Bearer valid-token',
            },
          }
        );

        const response = await handler(request);
        expect(response.status).toBe(200);
      });
    });

    describe('Development Environment', () => {
      beforeEach(() => {
        process.env.NODE_ENV = 'development';
      });

      it('should work without token in development', async () => {
        vi.mocked(shouldEnableStudio).mockReturnValue(true);
        vi.mocked(validateStudioConfiguration).mockReturnValue({
          canEnable: true,
          requiresToken: false,
          errors: [],
        });

        const handler = createStudioHandler({ router: mockRouter });
        const request = new NextRequest(
          'http://localhost:3000/__trpc-studio__/introspection',
          {
            method: 'GET',
          }
        );

        const response = await handler(request);
        expect(response.status).toBe(200);
      });

      it('should respect explicit disabled option in development', async () => {
        vi.mocked(shouldEnableStudio).mockReturnValue(false);

        const handler = createStudioHandler({
          router: mockRouter,
          enabled: false,
        });
        const request = new NextRequest(
          'http://localhost:3000/__trpc-studio__/introspection',
          {
            method: 'GET',
          }
        );

        const response = await handler(request);
        expect(response.status).toBe(404);
      });
    });

    describe('Token Validation', () => {
      it('should accept Authorization Bearer token', async () => {
        vi.mocked(shouldEnableStudio).mockReturnValue(true);
        vi.mocked(validateStudioConfiguration).mockReturnValue({
          canEnable: true,
          requiresToken: true,
          errors: [],
        });
        vi.mocked(getEffectiveToken).mockReturnValue('test-token');
        vi.mocked(validateRequestToken).mockReturnValue({
          valid: true,
          token: 'test-token',
        });

        const handler = createStudioHandler({
          router: mockRouter,
          token: 'test-token',
        });
        const request = new NextRequest(
          'http://localhost:3000/__trpc-studio__/introspection',
          {
            method: 'GET',
            headers: {
              Authorization: 'Bearer test-token',
            },
          }
        );

        const response = await handler(request);
        expect(response.status).toBe(200);
      });

      it('should accept x-trpc-studio-token header', async () => {
        vi.mocked(shouldEnableStudio).mockReturnValue(true);
        vi.mocked(validateStudioConfiguration).mockReturnValue({
          canEnable: true,
          requiresToken: true,
          errors: [],
        });
        vi.mocked(getEffectiveToken).mockReturnValue('test-token');
        vi.mocked(validateRequestToken).mockReturnValue({
          valid: true,
          token: 'test-token',
        });

        const handler = createStudioHandler({
          router: mockRouter,
          token: 'test-token',
        });
        const request = new NextRequest(
          'http://localhost:3000/__trpc-studio__/introspection',
          {
            method: 'GET',
            headers: {
              'x-trpc-studio-token': 'test-token',
            },
          }
        );

        const response = await handler(request);
        expect(response.status).toBe(200);
      });
    });
  });

  describe('CORS Integration', () => {
    describe('CORS Preflight Handling', () => {
      it('should handle CORS preflight for introspection endpoint', async () => {
        const handler = createStudioHandler({ router: mockRouter });

        const request = new NextRequest(
          'http://localhost:3000/__trpc-studio__/introspection',
          {
            method: 'OPTIONS',
            headers: {
              Origin: 'http://localhost:3001',
              'Access-Control-Request-Method': 'GET',
              'Access-Control-Request-Headers':
                'authorization, x-trpc-studio-token',
            },
          }
        );

        const response = await handler(request);

        expect(response.status).toBe(200);
        expect(response.headers.get('Access-Control-Allow-Origin')).toBe(
          'http://localhost:3001'
        );
        expect(response.headers.get('Access-Control-Allow-Methods')).toContain(
          'GET'
        );
        expect(response.headers.get('Access-Control-Allow-Headers')).toContain(
          'authorization'
        );
        expect(response.headers.get('Access-Control-Allow-Headers')).toContain(
          'x-trpc-studio-token'
        );
        expect(response.headers.get('Vary')).toContain('Origin');
      });

      it('should include credentials in CORS when requested', async () => {
        const handler = createStudioHandler({ router: mockRouter });

        const request = new NextRequest(
          'http://localhost:3000/__trpc-studio__/introspection',
          {
            method: 'OPTIONS',
            headers: {
              Origin: 'http://localhost:3001',
              'Access-Control-Request-Method': 'GET',
              'Access-Control-Request-Headers': 'authorization',
            },
          }
        );

        const response = await handler(request);

        expect(response.headers.get('Access-Control-Allow-Credentials')).toBe(
          'true'
        );
      });
    });

    describe('CORS Headers on Actual Requests', () => {
      it('should include CORS headers on introspection GET requests', async () => {
        const handler = createStudioHandler({ router: mockRouter });

        const request = new NextRequest(
          'http://localhost:3000/__trpc-studio__/introspection',
          {
            method: 'GET',
            headers: {
              Origin: 'http://localhost:3001',
            },
          }
        );

        const response = await handler(request);

        expect(response.status).toBe(200);
        expect(response.headers.get('Access-Control-Allow-Origin')).toBe(
          'http://localhost:3001'
        );
        expect(response.headers.get('Access-Control-Allow-Credentials')).toBe(
          'true'
        );
        expect(response.headers.get('Vary')).toContain('Origin');
      });

      it('should handle requests without Origin header', async () => {
        const handler = createStudioHandler({ router: mockRouter });

        const request = new NextRequest(
          'http://localhost:3000/__trpc-studio__/introspection',
          {
            method: 'GET',
          }
        );

        const response = await handler(request);

        expect(response.status).toBe(200);
        // Should not include CORS headers when no Origin is present
        expect(response.headers.get('Access-Control-Allow-Origin')).toBeNull();
      });
    });

    describe('Custom CORS Configuration', () => {
      it('should allow custom CORS configuration', async () => {
        const handler = createStudioHandler({
          router: mockRouter,
          cors: {
            origin: [
              'https://allowed.example.com',
              'https://another.example.com',
            ],
            credentials: true,
            allowedHeaders: [
              'authorization',
              'x-trpc-studio-token',
              'x-custom-header',
            ],
          },
        });

        // Test allowed origin
        const request1 = new NextRequest(
          'http://localhost:3000/__trpc-studio__/introspection',
          {
            method: 'OPTIONS',
            headers: {
              Origin: 'https://allowed.example.com',
              'Access-Control-Request-Method': 'GET',
              'Access-Control-Request-Headers': 'x-custom-header',
            },
          }
        );

        const response1 = await handler(request1);
        expect(response1.headers.get('Access-Control-Allow-Origin')).toBe(
          'https://allowed.example.com'
        );
        expect(response1.headers.get('Access-Control-Allow-Headers')).toContain(
          'x-custom-header'
        );

        // Test disallowed origin
        const request2 = new NextRequest(
          'http://localhost:3000/__trpc-studio__/introspection',
          {
            method: 'OPTIONS',
            headers: {
              Origin: 'https://disallowed.example.com',
              'Access-Control-Request-Method': 'GET',
            },
          }
        );

        const response2 = await handler(request2);
        expect(response2.headers.get('Access-Control-Allow-Origin')).toBeNull();
      });
    });
  });
});
