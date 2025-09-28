import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the core module
vi.mock('@trpc-studio/core', () => ({
  buildIntrospection: vi.fn(),
  validateStudioConfiguration: vi.fn(),
  shouldEnableStudio: vi.fn(),
  getEffectiveToken: vi.fn(),
  validateRequestToken: vi.fn(),
}));

describe('Pages Router Handler', () => {
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
      const { createStudioHandler } = await import('../pages-router/handler');
      const handler = createStudioHandler({ router: mockRouter });
      expect(typeof handler).toBe('function');
    });

    it('should handle GET requests successfully', async () => {
      const { createStudioHandler } = await import('../pages-router/handler');
      const handler = createStudioHandler({ router: mockRouter });

      const mockReq = {
        method: 'GET',
        headers: {},
        url: '/__trpc-studio__/introspection',
      };

      const mockRes = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn().mockReturnThis(),
        setHeader: vi.fn().mockReturnThis(),
        end: vi.fn(),
      };

      await handler(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          routers: expect.any(Array),
          meta: expect.any(Object),
        })
      );
    });

    it('should reject non-GET requests with 405', async () => {
      const { createStudioHandler } = await import('../pages-router/handler');
      const handler = createStudioHandler({ router: mockRouter });

      const mockReq = {
        method: 'POST',
        headers: {},
        url: '/__trpc-studio__/introspection',
      };

      const mockRes = {
        status: vi.fn().mockReturnThis(),
        setHeader: vi.fn().mockReturnThis(),
        end: vi.fn(),
      };

      await handler(mockReq, mockRes);

      expect(mockRes.setHeader).toHaveBeenCalledWith('Allow', 'GET');
      expect(mockRes.status).toHaveBeenCalledWith(405);
      expect(mockRes.end).toHaveBeenCalled();
    });

    it('should return 404 when studio is disabled', async () => {
      const { shouldEnableStudio } = await import('@trpc-studio/core');
      vi.mocked(shouldEnableStudio).mockReturnValue(false);

      const { createStudioHandler } = await import('../pages-router/handler');
      const handler = createStudioHandler({ router: mockRouter });

      const mockReq = {
        method: 'GET',
        headers: {},
        url: '/__trpc-studio__/introspection',
      };

      const mockRes = {
        status: vi.fn().mockReturnThis(),
        end: vi.fn(),
      };

      await handler(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.end).toHaveBeenCalled();
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

      const { createStudioHandler } = await import('../pages-router/handler');
      const handler = createStudioHandler({
        router: mockRouter,
        token: 'test-token',
      });

      const mockReq = {
        method: 'GET',
        headers: {},
        url: '/__trpc-studio__/introspection',
      };

      const mockRes = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
      };

      await handler(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Unauthorized' });
    });
  });

  describe('createStudioUIHandler', () => {
    it('should create a UI handler function', async () => {
      const { createStudioUIHandler } = await import('../pages-router/ui');
      const handler = createStudioUIHandler({ router: mockRouter });
      expect(typeof handler).toBe('function');
    });

    it('should return HTML for GET requests', async () => {
      const { createStudioUIHandler } = await import('../pages-router/ui');
      const handler = createStudioUIHandler({ router: mockRouter });

      const mockReq = {
        method: 'GET',
        headers: {},
        url: '/trpc-studio',
      };

      const mockRes = {
        status: vi.fn().mockReturnThis(),
        setHeader: vi.fn().mockReturnThis(),
        send: vi.fn(),
      };

      await handler(mockReq, mockRes);

      expect(mockRes.setHeader).toHaveBeenCalledWith(
        'Content-Type',
        'text/html'
      );
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.send).toHaveBeenCalledWith(
        expect.stringContaining('<!DOCTYPE html>')
      );
    });

    it('should reject non-GET requests with 405', async () => {
      const { createStudioUIHandler } = await import('../pages-router/ui');
      const handler = createStudioUIHandler({ router: mockRouter });

      const mockReq = {
        method: 'POST',
        headers: {},
        url: '/trpc-studio',
      };

      const mockRes = {
        status: vi.fn().mockReturnThis(),
        setHeader: vi.fn().mockReturnThis(),
        end: vi.fn(),
      };

      await handler(mockReq, mockRes);

      expect(mockRes.setHeader).toHaveBeenCalledWith('Allow', 'GET');
      expect(mockRes.status).toHaveBeenCalledWith(405);
      expect(mockRes.end).toHaveBeenCalled();
    });
  });
});
