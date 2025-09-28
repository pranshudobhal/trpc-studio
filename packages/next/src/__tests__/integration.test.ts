import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { createStudioHandler } from '../app-router/handler';
import { z } from 'zod';

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
});
