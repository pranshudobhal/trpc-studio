import express from 'express';
import request from 'supertest';
import { z } from 'zod';
import { initTRPC } from '@trpc/server';
import { studioExpress } from '../middleware/studio';
import type { ExpressStudioOptions } from '../types';

// Mock tRPC router for testing
const t = initTRPC.create();

const mockRouter = t.router({
  test: t.procedure
    .input(z.object({ value: z.string() }))
    .output(z.object({ result: z.string() }))
    .query(({ input }) => ({ result: input.value })),
});

describe('Express Studio Security', () => {
  let app: express.Application;

  beforeEach(() => {
    app = express();
    app.use(express.json());
  });

  afterEach(() => {
    // Reset environment variables
    delete process.env.NODE_ENV;
    delete process.env.TRPC_STUDIO_ENABLED;
    delete process.env.TRPC_STUDIO_TOKEN;
  });

  describe('Production Security', () => {
    it('should be disabled by default in production', async () => {
      process.env.NODE_ENV = 'production';

      const options: ExpressStudioOptions = {
        router: mockRouter,
      };

      app.use(studioExpress(options));

      // All studio routes should return 404
      await request(app).get('/trpc-studio').expect(404);
      await request(app).get('/__trpc-studio__/introspection').expect(404);
      await request(app).get('/trpc-studio/assets/app.js').expect(404);
    });

    it('should require TRPC_STUDIO_ENABLED=true in production', async () => {
      process.env.NODE_ENV = 'production';
      process.env.TRPC_STUDIO_TOKEN = 'test-token';

      const options: ExpressStudioOptions = {
        router: mockRouter,
        enabled: true, // This should be ignored in production
      };

      app.use(studioExpress(options));

      // Should still be disabled despite options.enabled = true
      await request(app).get('/trpc-studio').expect(404);
      await request(app).get('/__trpc-studio__/introspection').expect(404);
    });

    it('should require token when enabled in production', async () => {
      process.env.NODE_ENV = 'production';
      process.env.TRPC_STUDIO_ENABLED = 'true';
      delete process.env.TRPC_STUDIO_TOKEN; // Explicitly ensure no token

      const options: ExpressStudioOptions = {
        router: mockRouter,
      };

      // Debug: Check what the validation logic returns
      app.use(studioExpress(options));

      // Should return 404 because no token is configured
      await request(app).get('/trpc-studio').expect(404);
      await request(app).get('/__trpc-studio__/introspection').expect(404);
    });

    it('should work with both env flag and token in production', async () => {
      process.env.NODE_ENV = 'production';
      process.env.TRPC_STUDIO_ENABLED = 'true';
      process.env.TRPC_STUDIO_TOKEN = 'secure-token-123';

      const options: ExpressStudioOptions = {
        router: mockRouter,
      };

      app.use(studioExpress(options));

      // Should work with valid token
      await request(app)
        .get('/__trpc-studio__/introspection')
        .set('Authorization', 'Bearer secure-token-123')
        .expect(200);

      await request(app)
        .get('/trpc-studio')
        .set('Authorization', 'Bearer secure-token-123')
        .expect(200);

      // Should fail without token
      await request(app).get('/__trpc-studio__/introspection').expect(403);
      await request(app).get('/trpc-studio').expect(403);

      // Should fail with wrong token
      await request(app)
        .get('/__trpc-studio__/introspection')
        .set('Authorization', 'Bearer wrong-token')
        .expect(403);
    });
  });

  describe('Token Validation', () => {
    beforeEach(() => {
      process.env.NODE_ENV = 'production';
      process.env.TRPC_STUDIO_ENABLED = 'true';
      process.env.TRPC_STUDIO_TOKEN = 'test-token-123';
    });

    it('should accept Authorization Bearer token', async () => {
      const options: ExpressStudioOptions = {
        router: mockRouter,
      };

      app.use(studioExpress(options));

      await request(app)
        .get('/__trpc-studio__/introspection')
        .set('Authorization', 'Bearer test-token-123')
        .expect(200);
    });

    it('should accept x-trpc-studio-token header', async () => {
      const options: ExpressStudioOptions = {
        router: mockRouter,
      };

      app.use(studioExpress(options));

      await request(app)
        .get('/__trpc-studio__/introspection')
        .set('x-trpc-studio-token', 'test-token-123')
        .expect(200);
    });

    it('should prioritize Authorization header over x-trpc-studio-token', async () => {
      const options: ExpressStudioOptions = {
        router: mockRouter,
      };

      app.use(studioExpress(options));

      // Authorization header has correct token, x-trpc-studio-token has wrong token
      await request(app)
        .get('/__trpc-studio__/introspection')
        .set('Authorization', 'Bearer test-token-123')
        .set('x-trpc-studio-token', 'wrong-token')
        .expect(200);
    });

    it('should use custom token extraction function', async () => {
      const options: ExpressStudioOptions = {
        router: mockRouter,
        getToken: (req: any) => {
          // Extract token from custom header
          return req.headers['x-custom-token'] || null;
        },
      };

      app.use(studioExpress(options));

      await request(app)
        .get('/__trpc-studio__/introspection')
        .set('x-custom-token', 'test-token-123')
        .expect(200);

      // Standard headers should not work with custom extraction
      await request(app)
        .get('/__trpc-studio__/introspection')
        .set('Authorization', 'Bearer test-token-123')
        .expect(403);
    });

    it('should handle malformed Authorization header', async () => {
      const options: ExpressStudioOptions = {
        router: mockRouter,
      };

      app.use(studioExpress(options));

      // Malformed Authorization header
      await request(app)
        .get('/__trpc-studio__/introspection')
        .set('Authorization', 'InvalidFormat test-token-123')
        .expect(403);

      await request(app)
        .get('/__trpc-studio__/introspection')
        .set('Authorization', 'Bearer')
        .expect(403);
    });

    it('should prefer options.token over environment token', async () => {
      process.env.TRPC_STUDIO_TOKEN = 'env-token';

      const options: ExpressStudioOptions = {
        router: mockRouter,
        token: 'options-token',
      };

      app.use(studioExpress(options));

      // Environment token should not work
      await request(app)
        .get('/__trpc-studio__/introspection')
        .set('Authorization', 'Bearer env-token')
        .expect(403);

      // Options token should work
      await request(app)
        .get('/__trpc-studio__/introspection')
        .set('Authorization', 'Bearer options-token')
        .expect(200);
    });
  });

  describe('Development Security', () => {
    beforeEach(() => {
      process.env.NODE_ENV = 'development';
    });

    it('should be enabled by default in development', async () => {
      const options: ExpressStudioOptions = {
        router: mockRouter,
      };

      app.use(studioExpress(options));

      // Should work without token in development
      await request(app).get('/__trpc-studio__/introspection').expect(200);
      await request(app).get('/trpc-studio').expect(200);
    });

    it('should respect explicit disabled option in development', async () => {
      const options: ExpressStudioOptions = {
        router: mockRouter,
        enabled: false,
      };

      app.use(studioExpress(options));

      // Should be disabled when explicitly set
      await request(app).get('/__trpc-studio__/introspection').expect(404);
      await request(app).get('/trpc-studio').expect(404);
    });

    it('should still validate token if provided in development', async () => {
      const options: ExpressStudioOptions = {
        router: mockRouter,
        token: 'dev-token',
      };

      app.use(studioExpress(options));

      // Should work with correct token
      await request(app)
        .get('/__trpc-studio__/introspection')
        .set('Authorization', 'Bearer dev-token')
        .expect(200);

      // Should fail with wrong token
      await request(app)
        .get('/__trpc-studio__/introspection')
        .set('Authorization', 'Bearer wrong-token')
        .expect(403);

      // Should work without token (development default)
      await request(app).get('/__trpc-studio__/introspection').expect(200);
    });
  });

  describe('HTTP Method Security', () => {
    beforeEach(() => {
      process.env.NODE_ENV = 'development';
    });

    it('should only allow GET requests to introspection endpoint', async () => {
      const options: ExpressStudioOptions = {
        router: mockRouter,
      };

      app.use(studioExpress(options));

      // GET should work
      await request(app).get('/__trpc-studio__/introspection').expect(200);

      // Other methods should return 405
      const response = await request(app)
        .post('/__trpc-studio__/introspection')
        .expect(405);
      expect(response.headers.allow).toBe('GET');

      await request(app).put('/__trpc-studio__/introspection').expect(405);
      await request(app).delete('/__trpc-studio__/introspection').expect(405);
      await request(app).patch('/__trpc-studio__/introspection').expect(405);
    });

    it('should return 405 for non-GET methods even when disabled', async () => {
      process.env.NODE_ENV = 'production';
      process.env.TRPC_STUDIO_ENABLED = 'true';
      process.env.TRPC_STUDIO_TOKEN = 'test-token';

      const options: ExpressStudioOptions = {
        router: mockRouter,
        enabled: false, // Explicitly disabled
      };

      app.use(studioExpress(options));

      // Should return 404 for GET when disabled
      await request(app).get('/__trpc-studio__/introspection').expect(404);

      // Should still return 405 for non-GET methods (not 404)
      await request(app).post('/__trpc-studio__/introspection').expect(405);
    });
  });
});
