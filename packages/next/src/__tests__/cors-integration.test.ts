/**
 * CORS integration tests for Next.js adapter
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// Mock the core module
vi.mock('@trpc-studio/core', () => ({
  buildIntrospection: vi.fn(),
  validateStudioConfiguration: vi.fn(),
  shouldEnableStudio: vi.fn(),
  getEffectiveToken: vi.fn(),
  validateRequestToken: vi.fn(),
}));

describe('Next.js Studio CORS Integration', () => {
  const mockRouter = { _def: { procedures: {}, router: {} } };

  beforeEach(async () => {
    vi.clearAllMocks();
    delete process.env.NODE_ENV;
    delete process.env.TRPC_STUDIO_ENABLED;
    delete process.env.TRPC_STUDIO_TOKEN;

    const {
      buildIntrospection,
      validateStudioConfiguration,
      shouldEnableStudio,
      getEffectiveToken,
      validateRequestToken,
    } = await import('@trpc-studio/core');

    vi.mocked(buildIntrospection).mockReturnValue({
      routers: [],
      meta: {
        generatedAt: '2023-01-01T00:00:00.000Z',
        trpcVersion: '11.0.0',
        transformer: null,
      },
    });
    vi.mocked(validateStudioConfiguration).mockReturnValue({
      canEnable: true,
      requiresToken: false,
      errors: [],
    });
    vi.mocked(shouldEnableStudio).mockReturnValue(true);
    vi.mocked(getEffectiveToken).mockReturnValue(undefined);
    vi.mocked(validateRequestToken).mockReturnValue({ valid: true });
  });

  describe('CORS Preflight Handling', () => {
    it('should handle CORS preflight for introspection endpoint', async () => {
      const { createStudioHandler } = await import('../app-router/handler');
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
      expect(response.headers.get('Access-Control-Allow-Headers')).toContain(
        'content-type'
      );
      expect(response.headers.get('Vary')).toContain('Origin');
    });

    it('should handle CORS preflight for UI endpoint', async () => {
      const { createStudioUIHandler } = await import('../app-router/ui');
      const handler = createStudioUIHandler({ router: mockRouter });

      const request = new NextRequest('http://localhost:3000/trpc-studio', {
        method: 'OPTIONS',
        headers: {
          Origin: 'http://localhost:3001',
          'Access-Control-Request-Method': 'GET',
        },
      });

      const response = await handler(request);

      expect(response.status).toBe(200);
      expect(response.headers.get('Access-Control-Allow-Origin')).toBe(
        'http://localhost:3001'
      );
      expect(response.headers.get('Access-Control-Allow-Methods')).toContain(
        'GET'
      );
      expect(response.headers.get('Vary')).toContain('Origin');
    });

    it('should include credentials in CORS when requested', async () => {
      const { createStudioHandler } = await import('../app-router/handler');
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

    it('should handle multiple origins correctly', async () => {
      const { createStudioHandler } = await import('../app-router/handler');
      const handler = createStudioHandler({ router: mockRouter });

      // Test first origin
      const request1 = new NextRequest(
        'http://localhost:3000/__trpc-studio__/introspection',
        {
          method: 'OPTIONS',
          headers: {
            Origin: 'http://localhost:3000',
            'Access-Control-Request-Method': 'GET',
          },
        }
      );

      const response1 = await handler(request1);
      expect(response1.headers.get('Access-Control-Allow-Origin')).toBe(
        'http://localhost:3000'
      );

      // Test second origin
      const request2 = new NextRequest(
        'http://localhost:3000/__trpc-studio__/introspection',
        {
          method: 'OPTIONS',
          headers: {
            Origin: 'https://studio.example.com',
            'Access-Control-Request-Method': 'GET',
          },
        }
      );

      const response2 = await handler(request2);
      expect(response2.headers.get('Access-Control-Allow-Origin')).toBe(
        'https://studio.example.com'
      );
    });
  });

  describe('CORS Headers on Actual Requests', () => {
    it('should include CORS headers on introspection GET requests', async () => {
      const { createStudioHandler } = await import('../app-router/handler');
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

    it('should include CORS headers on UI GET requests', async () => {
      const { createStudioUIHandler } = await import('../app-router/ui');
      const handler = createStudioUIHandler({ router: mockRouter });

      const request = new NextRequest('http://localhost:3000/trpc-studio', {
        method: 'GET',
        headers: {
          Origin: 'http://localhost:3001',
        },
      });

      const response = await handler(request);

      expect(response.status).toBe(200);
      expect(response.headers.get('Access-Control-Allow-Origin')).toBe(
        'http://localhost:3001'
      );
      expect(response.headers.get('Vary')).toContain('Origin');
    });

    it('should handle requests without Origin header', async () => {
      const { createStudioHandler } = await import('../app-router/handler');
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

  describe('CORS with Authentication', () => {
    it('should handle CORS preflight with authentication headers in production', async () => {
      process.env.NODE_ENV = 'production';
      process.env.TRPC_STUDIO_ENABLED = 'true';
      process.env.TRPC_STUDIO_TOKEN = 'test-token';

      const {
        shouldEnableStudio,
        validateStudioConfiguration,
        getEffectiveToken,
      } = await import('@trpc-studio/core');
      vi.mocked(shouldEnableStudio).mockReturnValue(true);
      vi.mocked(validateStudioConfiguration).mockReturnValue({
        canEnable: true,
        requiresToken: true,
        errors: [],
      });
      vi.mocked(getEffectiveToken).mockReturnValue('test-token');

      const { createStudioHandler } = await import('../app-router/handler');
      const handler = createStudioHandler({ router: mockRouter });

      const request = new NextRequest(
        'http://localhost:3000/__trpc-studio__/introspection',
        {
          method: 'OPTIONS',
          headers: {
            Origin: 'https://studio.example.com',
            'Access-Control-Request-Method': 'GET',
            'Access-Control-Request-Headers':
              'authorization, x-trpc-studio-token',
          },
        }
      );

      const response = await handler(request);

      expect(response.status).toBe(200);
      expect(response.headers.get('Access-Control-Allow-Origin')).toBe(
        'https://studio.example.com'
      );
      expect(response.headers.get('Access-Control-Allow-Headers')).toContain(
        'authorization'
      );
      expect(response.headers.get('Access-Control-Allow-Headers')).toContain(
        'x-trpc-studio-token'
      );
      expect(response.headers.get('Access-Control-Allow-Credentials')).toBe(
        'true'
      );
    });

    it('should include CORS headers on authenticated requests', async () => {
      process.env.NODE_ENV = 'production';
      process.env.TRPC_STUDIO_ENABLED = 'true';
      process.env.TRPC_STUDIO_TOKEN = 'test-token';

      const {
        shouldEnableStudio,
        validateStudioConfiguration,
        getEffectiveToken,
        validateRequestToken,
      } = await import('@trpc-studio/core');
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

      const { createStudioHandler } = await import('../app-router/handler');
      const handler = createStudioHandler({ router: mockRouter });

      const request = new NextRequest(
        'http://localhost:3000/__trpc-studio__/introspection',
        {
          method: 'GET',
          headers: {
            Origin: 'https://studio.example.com',
            Authorization: 'Bearer test-token',
          },
        }
      );

      const response = await handler(request);

      expect(response.status).toBe(200);
      expect(response.headers.get('Access-Control-Allow-Origin')).toBe(
        'https://studio.example.com'
      );
      expect(response.headers.get('Access-Control-Allow-Credentials')).toBe(
        'true'
      );
    });

    it('should include CORS headers on 403 responses', async () => {
      process.env.NODE_ENV = 'production';
      process.env.TRPC_STUDIO_ENABLED = 'true';
      process.env.TRPC_STUDIO_TOKEN = 'test-token';

      const {
        shouldEnableStudio,
        validateStudioConfiguration,
        getEffectiveToken,
        validateRequestToken,
      } = await import('@trpc-studio/core');
      vi.mocked(shouldEnableStudio).mockReturnValue(true);
      vi.mocked(validateStudioConfiguration).mockReturnValue({
        canEnable: true,
        requiresToken: true,
        errors: [],
      });
      vi.mocked(getEffectiveToken).mockReturnValue('test-token');
      vi.mocked(validateRequestToken).mockReturnValue({
        valid: false,
        error: 'Invalid token',
      });

      const { createStudioHandler } = await import('../app-router/handler');
      const handler = createStudioHandler({ router: mockRouter });

      const request = new NextRequest(
        'http://localhost:3000/__trpc-studio__/introspection',
        {
          method: 'GET',
          headers: {
            Origin: 'https://studio.example.com',
            Authorization: 'Bearer wrong-token',
          },
        }
      );

      const response = await handler(request);

      expect(response.status).toBe(403);
      expect(response.headers.get('Access-Control-Allow-Origin')).toBe(
        'https://studio.example.com'
      );
      expect(response.headers.get('Access-Control-Allow-Credentials')).toBe(
        'true'
      );
    });
  });

  describe('Custom CORS Configuration', () => {
    it('should allow custom CORS configuration', async () => {
      const { createStudioHandler } = await import('../app-router/handler');
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

    it('should handle wildcard origin configuration', async () => {
      const { createStudioHandler } = await import('../app-router/handler');
      const handler = createStudioHandler({
        router: mockRouter,
        cors: {
          origin: '*',
          credentials: false,
        },
      });

      const request = new NextRequest(
        'http://localhost:3000/__trpc-studio__/introspection',
        {
          method: 'OPTIONS',
          headers: {
            Origin: 'https://any.example.com',
            'Access-Control-Request-Method': 'GET',
          },
        }
      );

      const response = await handler(request);
      expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
      expect(
        response.headers.get('Access-Control-Allow-Credentials')
      ).toBeNull();
    });

    it('should handle function-based origin configuration', async () => {
      const { createStudioHandler } = await import('../app-router/handler');
      const handler = createStudioHandler({
        router: mockRouter,
        cors: {
          origin: (origin: string) => origin?.includes('trusted'),
          credentials: true,
        },
      });

      // Test trusted origin
      const request1 = new NextRequest(
        'http://localhost:3000/__trpc-studio__/introspection',
        {
          method: 'OPTIONS',
          headers: {
            Origin: 'https://trusted.example.com',
            'Access-Control-Request-Method': 'GET',
          },
        }
      );

      const response1 = await handler(request1);
      expect(response1.headers.get('Access-Control-Allow-Origin')).toBe(
        'https://trusted.example.com'
      );

      // Test untrusted origin
      const request2 = new NextRequest(
        'http://localhost:3000/__trpc-studio__/introspection',
        {
          method: 'OPTIONS',
          headers: {
            Origin: 'https://untrusted.example.com',
            'Access-Control-Request-Method': 'GET',
          },
        }
      );

      const response2 = await handler(request2);
      expect(response2.headers.get('Access-Control-Allow-Origin')).toBeNull();
    });
  });

  describe('Pages Router CORS', () => {
    it('should handle CORS in Pages Router', async () => {
      const { createStudioHandler } = await import('../pages-router/handler');
      const handler = createStudioHandler({ router: mockRouter });

      const mockReq = {
        method: 'OPTIONS',
        headers: {
          origin: 'http://localhost:3001',
          'access-control-request-method': 'GET',
          'access-control-request-headers': 'authorization',
        },
        url: '/__trpc-studio__/introspection',
      };

      const mockRes = {
        status: vi.fn().mockReturnThis(),
        setHeader: vi.fn().mockReturnThis(),
        end: vi.fn(),
      };

      await handler(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.setHeader).toHaveBeenCalledWith(
        'Access-Control-Allow-Origin',
        'http://localhost:3001'
      );
      expect(mockRes.setHeader).toHaveBeenCalledWith(
        'Access-Control-Allow-Methods',
        'GET, OPTIONS'
      );
      expect(mockRes.setHeader).toHaveBeenCalledWith(
        'Access-Control-Allow-Headers',
        expect.stringContaining('authorization')
      );
      expect(mockRes.setHeader).toHaveBeenCalledWith(
        'Access-Control-Allow-Credentials',
        'true'
      );
      expect(mockRes.setHeader).toHaveBeenCalledWith('Vary', 'Origin');
    });

    it('should include CORS headers on actual Pages Router requests', async () => {
      const { createStudioHandler } = await import('../pages-router/handler');
      const handler = createStudioHandler({ router: mockRouter });

      const mockReq = {
        method: 'GET',
        headers: {
          origin: 'http://localhost:3001',
        },
        url: '/__trpc-studio__/introspection',
      };

      const mockRes = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn().mockReturnThis(),
        setHeader: vi.fn().mockReturnThis(),
      };

      await handler(mockReq, mockRes);

      expect(mockRes.setHeader).toHaveBeenCalledWith(
        'Access-Control-Allow-Origin',
        'http://localhost:3001'
      );
      expect(mockRes.setHeader).toHaveBeenCalledWith(
        'Access-Control-Allow-Credentials',
        'true'
      );
      expect(mockRes.setHeader).toHaveBeenCalledWith('Vary', 'Origin');
    });
  });

  describe('CORS Error Handling', () => {
    it('should handle CORS errors gracefully', async () => {
      const { createStudioHandler } = await import('../app-router/handler');
      const handler = createStudioHandler({
        router: mockRouter,
        cors: {
          origin: () => {
            throw new Error('CORS configuration error');
          },
        },
      });

      const request = new NextRequest(
        'http://localhost:3000/__trpc-studio__/introspection',
        {
          method: 'OPTIONS',
          headers: {
            Origin: 'https://example.com',
            'Access-Control-Request-Method': 'GET',
          },
        }
      );

      const response = await handler(request);
      expect(response.status).toBe(500);

      const errorData = await response.json();
      expect(errorData.error).toContain('CORS configuration error');
    });

    it('should handle missing CORS configuration gracefully', async () => {
      const { createStudioHandler } = await import('../app-router/handler');
      const handler = createStudioHandler({
        router: mockRouter,
        // No CORS configuration provided
      });

      const request = new NextRequest(
        'http://localhost:3000/__trpc-studio__/introspection',
        {
          method: 'OPTIONS',
          headers: {
            Origin: 'https://example.com',
            'Access-Control-Request-Method': 'GET',
          },
        }
      );

      const response = await handler(request);
      expect(response.status).toBe(200);
      expect(response.headers.get('Access-Control-Allow-Origin')).toBe(
        'https://example.com'
      );
    });
  });
});
