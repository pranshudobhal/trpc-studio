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

describe('App Router Handler', () => {
  const mockRouter = { _def: { procedures: {}, router: {} } };

  beforeEach(async () => {
    vi.clearAllMocks();
    // Reset environment
    delete process.env.NODE_ENV;
    delete process.env.TRPC_STUDIO_ENABLED;
    delete process.env.TRPC_STUDIO_TOKEN;

    // Set default mocks
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

  describe('createStudioHandler', () => {
    it('should create a handler function', async () => {
      const { createStudioHandler } = await import('../app-router/handler');
      const handler = createStudioHandler({ router: mockRouter });
      expect(typeof handler).toBe('function');
    });

    it('should handle GET requests successfully', async () => {
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

      const data = await response.json();
      expect(data).toHaveProperty('routers');
      expect(data).toHaveProperty('meta');
    });

    it('should reject non-GET requests with 405', async () => {
      const { createStudioHandler } = await import('../app-router/handler');
      const handler = createStudioHandler({ router: mockRouter });
      const request = new NextRequest(
        'http://localhost:3000/__trpc-studio__/introspection',
        {
          method: 'POST',
        }
      );

      const response = await handler(request);
      expect(response.status).toBe(405);
      expect(response.headers.get('Allow')).toBe('GET');
    });

    it('should return 404 when studio is disabled', async () => {
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

    it('should return 403 when token validation fails', async () => {
      const {
        validateStudioConfiguration,
        validateRequestToken,
        getEffectiveToken,
      } = await import('@trpc-studio/core');
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
      const handler = createStudioHandler({
        router: mockRouter,
        token: 'test-token',
      });
      const request = new NextRequest(
        'http://localhost:3000/__trpc-studio__/introspection',
        {
          method: 'GET',
        }
      );

      const response = await handler(request);
      expect(response.status).toBe(403);
    });
  });

  describe('createStudioUIHandler', () => {
    it('should create a UI handler function', async () => {
      const { createStudioUIHandler } = await import('../app-router/ui');
      const handler = createStudioUIHandler({ router: mockRouter });
      expect(typeof handler).toBe('function');
    });

    it('should return HTML for GET requests', async () => {
      const { createStudioUIHandler } = await import('../app-router/ui');
      const handler = createStudioUIHandler({ router: mockRouter });
      const request = new NextRequest('http://localhost:3000/trpc-studio', {
        method: 'GET',
      });

      const response = await handler(request);
      expect(response.status).toBe(200);
      expect(response.headers.get('Content-Type')).toBe('text/html');

      const html = await response.text();
      expect(html).toContain('<!DOCTYPE html>');
      expect(html).toContain('tRPC Studio');
    });

    it('should reject non-GET requests with 405', async () => {
      const { createStudioUIHandler } = await import('../app-router/ui');
      const handler = createStudioUIHandler({ router: mockRouter });
      const request = new NextRequest('http://localhost:3000/trpc-studio', {
        method: 'POST',
      });

      const response = await handler(request);
      expect(response.status).toBe(405);
    });
  });
});
