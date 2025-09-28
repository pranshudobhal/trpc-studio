import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';

// Mock the core module
vi.mock('@trpc-studio/core', () => ({
  buildIntrospection: vi.fn(),
  validateStudioConfiguration: vi.fn(),
  shouldEnableStudio: vi.fn(),
  getEffectiveToken: vi.fn(),
  validateRequestToken: vi.fn(),
}));

describe('Security Integration', () => {
  const mockRouter = { _def: { procedures: {}, router: {} } };

  beforeEach(async () => {
    vi.clearAllMocks();
    // Reset environment
    delete process.env.NODE_ENV;
    delete process.env.TRPC_STUDIO_ENABLED;
    delete process.env.TRPC_STUDIO_TOKEN;

    // Set default mocks
    const { buildIntrospection } = await import('@trpc-studio/core');
    vi.mocked(buildIntrospection).mockReturnValue({
      routers: [],
      meta: {
        generatedAt: '2023-01-01T00:00:00.000Z',
        trpcVersion: '11.0.0',
        transformer: null,
      },
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Production Environment', () => {
    beforeEach(() => {
      process.env.NODE_ENV = 'production';
    });

    it('should return 404 when TRPC_STUDIO_ENABLED is not set', async () => {
      const { shouldEnableStudio } = await import('@trpc-studio/core');
      vi.mocked(shouldEnableStudio).mockReturnValue(false);

      const { createStudioHandler } = await import('../app-router/handler');
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

    it('should return 404 when configuration validation fails', async () => {
      const { shouldEnableStudio, validateStudioConfiguration } = await import(
        '@trpc-studio/core'
      );
      vi.mocked(shouldEnableStudio).mockReturnValue(true);
      vi.mocked(validateStudioConfiguration).mockReturnValue({
        canEnable: false,
        requiresToken: true,
        errors: ['Token is required in production'],
      });

      const { createStudioHandler } = await import('../app-router/handler');
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

      const {
        shouldEnableStudio,
        validateStudioConfiguration,
        validateRequestToken,
      } = await import('@trpc-studio/core');
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

      const { createStudioHandler } = await import('../app-router/handler');
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
      vi.mocked(getEffectiveToken).mockReturnValue('valid-token');
      vi.mocked(validateRequestToken).mockReturnValue({
        valid: true,
        token: 'valid-token',
      });

      const { createStudioHandler } = await import('../app-router/handler');
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
      const { shouldEnableStudio, validateStudioConfiguration } = await import(
        '@trpc-studio/core'
      );
      vi.mocked(shouldEnableStudio).mockReturnValue(true);
      vi.mocked(validateStudioConfiguration).mockReturnValue({
        canEnable: true,
        requiresToken: false,
        errors: [],
      });

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
    });

    it('should respect explicit disabled option in development', async () => {
      const { shouldEnableStudio } = await import('@trpc-studio/core');
      vi.mocked(shouldEnableStudio).mockReturnValue(false);

      const { createStudioHandler } = await import('../app-router/handler');
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
