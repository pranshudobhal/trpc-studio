/**
 * CORS integration tests for Express adapter
 */

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

describe('Express Studio CORS Integration', () => {
  let app: express.Application;

  beforeEach(() => {
    app = express();
    app.use(express.json());
  });

  afterEach(() => {
    delete process.env.NODE_ENV;
    delete process.env.TRPC_STUDIO_ENABLED;
    delete process.env.TRPC_STUDIO_TOKEN;
  });

  describe('CORS Preflight Handling', () => {
    it('should handle CORS preflight for introspection endpoint', async () => {
      process.env.NODE_ENV = 'development';

      const options: ExpressStudioOptions = {
        router: mockRouter,
      };

      app.use(studioExpress(options));

      const response = await request(app)
        .options('/__trpc-studio__/introspection')
        .set('Origin', 'http://localhost:3001')
        .set('Access-Control-Request-Method', 'GET')
        .set(
          'Access-Control-Request-Headers',
          'authorization, x-trpc-studio-token'
        )
        .expect(200);

      expect(response.headers['access-control-allow-origin']).toBe(
        'http://localhost:3001'
      );
      expect(response.headers['access-control-allow-methods']).toContain('GET');
      expect(response.headers['access-control-allow-headers']).toContain(
        'authorization'
      );
      expect(response.headers['access-control-allow-headers']).toContain(
        'x-trpc-studio-token'
      );
      expect(response.headers['access-control-allow-headers']).toContain(
        'content-type'
      );
      expect(response.headers['vary']).toContain('Origin');
    });

    it('should handle CORS preflight for UI endpoint', async () => {
      process.env.NODE_ENV = 'development';

      const options: ExpressStudioOptions = {
        router: mockRouter,
      };

      app.use(studioExpress(options));

      const response = await request(app)
        .options('/trpc-studio')
        .set('Origin', 'http://localhost:3001')
        .set('Access-Control-Request-Method', 'GET')
        .expect(200);

      expect(response.headers['access-control-allow-origin']).toBe(
        'http://localhost:3001'
      );
      expect(response.headers['access-control-allow-methods']).toContain('GET');
      expect(response.headers['vary']).toContain('Origin');
    });

    it('should include credentials in CORS when requested', async () => {
      process.env.NODE_ENV = 'development';

      const options: ExpressStudioOptions = {
        router: mockRouter,
      };

      app.use(studioExpress(options));

      const response = await request(app)
        .options('/__trpc-studio__/introspection')
        .set('Origin', 'http://localhost:3001')
        .set('Access-Control-Request-Method', 'GET')
        .set('Access-Control-Request-Headers', 'authorization')
        .expect(200);

      expect(response.headers['access-control-allow-credentials']).toBe('true');
    });

    it('should handle multiple origins correctly', async () => {
      process.env.NODE_ENV = 'development';

      const options: ExpressStudioOptions = {
        router: mockRouter,
      };

      app.use(studioExpress(options));

      // Test first origin
      const response1 = await request(app)
        .options('/__trpc-studio__/introspection')
        .set('Origin', 'http://localhost:3000')
        .set('Access-Control-Request-Method', 'GET')
        .expect(200);

      expect(response1.headers['access-control-allow-origin']).toBe(
        'http://localhost:3000'
      );

      // Test second origin
      const response2 = await request(app)
        .options('/__trpc-studio__/introspection')
        .set('Origin', 'https://studio.example.com')
        .set('Access-Control-Request-Method', 'GET')
        .expect(200);

      expect(response2.headers['access-control-allow-origin']).toBe(
        'https://studio.example.com'
      );
    });
  });

  describe('CORS Headers on Actual Requests', () => {
    it('should include CORS headers on introspection GET requests', async () => {
      process.env.NODE_ENV = 'development';

      const options: ExpressStudioOptions = {
        router: mockRouter,
      };

      app.use(studioExpress(options));

      const response = await request(app)
        .get('/__trpc-studio__/introspection')
        .set('Origin', 'http://localhost:3001')
        .expect(200);

      expect(response.headers['access-control-allow-origin']).toBe(
        'http://localhost:3001'
      );
      expect(response.headers['access-control-allow-credentials']).toBe('true');
      expect(response.headers['vary']).toContain('Origin');
    });

    it('should include CORS headers on UI GET requests', async () => {
      process.env.NODE_ENV = 'development';

      const options: ExpressStudioOptions = {
        router: mockRouter,
      };

      app.use(studioExpress(options));

      const response = await request(app)
        .get('/trpc-studio')
        .set('Origin', 'http://localhost:3001')
        .expect(200);

      expect(response.headers['access-control-allow-origin']).toBe(
        'http://localhost:3001'
      );
      expect(response.headers['vary']).toContain('Origin');
    });

    it('should handle requests without Origin header', async () => {
      process.env.NODE_ENV = 'development';

      const options: ExpressStudioOptions = {
        router: mockRouter,
      };

      app.use(studioExpress(options));

      const response = await request(app)
        .get('/__trpc-studio__/introspection')
        .expect(200);

      // Should not include CORS headers when no Origin is present
      expect(response.headers['access-control-allow-origin']).toBeUndefined();
    });
  });

  describe('CORS with Authentication', () => {
    it('should handle CORS preflight with authentication headers in production', async () => {
      process.env.NODE_ENV = 'production';
      process.env.TRPC_STUDIO_ENABLED = 'true';
      process.env.TRPC_STUDIO_TOKEN = 'test-token';

      const options: ExpressStudioOptions = {
        router: mockRouter,
      };

      app.use(studioExpress(options));

      const response = await request(app)
        .options('/__trpc-studio__/introspection')
        .set('Origin', 'https://studio.example.com')
        .set('Access-Control-Request-Method', 'GET')
        .set(
          'Access-Control-Request-Headers',
          'authorization, x-trpc-studio-token'
        )
        .expect(200);

      expect(response.headers['access-control-allow-origin']).toBe(
        'https://studio.example.com'
      );
      expect(response.headers['access-control-allow-headers']).toContain(
        'authorization'
      );
      expect(response.headers['access-control-allow-headers']).toContain(
        'x-trpc-studio-token'
      );
      expect(response.headers['access-control-allow-credentials']).toBe('true');
    });

    it('should include CORS headers on authenticated requests', async () => {
      process.env.NODE_ENV = 'production';
      process.env.TRPC_STUDIO_ENABLED = 'true';
      process.env.TRPC_STUDIO_TOKEN = 'test-token';

      const options: ExpressStudioOptions = {
        router: mockRouter,
      };

      app.use(studioExpress(options));

      const response = await request(app)
        .get('/__trpc-studio__/introspection')
        .set('Origin', 'https://studio.example.com')
        .set('Authorization', 'Bearer test-token')
        .expect(200);

      expect(response.headers['access-control-allow-origin']).toBe(
        'https://studio.example.com'
      );
      expect(response.headers['access-control-allow-credentials']).toBe('true');
    });

    it('should include CORS headers on 403 responses', async () => {
      process.env.NODE_ENV = 'production';
      process.env.TRPC_STUDIO_ENABLED = 'true';
      process.env.TRPC_STUDIO_TOKEN = 'test-token';

      const options: ExpressStudioOptions = {
        router: mockRouter,
      };

      app.use(studioExpress(options));

      const response = await request(app)
        .get('/__trpc-studio__/introspection')
        .set('Origin', 'https://studio.example.com')
        .set('Authorization', 'Bearer wrong-token')
        .expect(403);

      expect(response.headers['access-control-allow-origin']).toBe(
        'https://studio.example.com'
      );
      expect(response.headers['access-control-allow-credentials']).toBe('true');
    });
  });

  describe('Custom CORS Configuration', () => {
    it('should allow custom CORS configuration', async () => {
      process.env.NODE_ENV = 'development';

      const options: ExpressStudioOptions = {
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
      };

      app.use(studioExpress(options));

      // Test allowed origin
      const response1 = await request(app)
        .options('/__trpc-studio__/introspection')
        .set('Origin', 'https://allowed.example.com')
        .set('Access-Control-Request-Method', 'GET')
        .set('Access-Control-Request-Headers', 'x-custom-header')
        .expect(200);

      expect(response1.headers['access-control-allow-origin']).toBe(
        'https://allowed.example.com'
      );
      expect(response1.headers['access-control-allow-headers']).toContain(
        'x-custom-header'
      );

      // Test disallowed origin
      const response2 = await request(app)
        .options('/__trpc-studio__/introspection')
        .set('Origin', 'https://disallowed.example.com')
        .set('Access-Control-Request-Method', 'GET')
        .expect(200);

      expect(response2.headers['access-control-allow-origin']).toBeUndefined();
    });

    it('should handle wildcard origin configuration', async () => {
      process.env.NODE_ENV = 'development';

      const options: ExpressStudioOptions = {
        router: mockRouter,
        cors: {
          origin: '*',
          credentials: false,
        },
      };

      app.use(studioExpress(options));

      const response = await request(app)
        .options('/__trpc-studio__/introspection')
        .set('Origin', 'https://any.example.com')
        .set('Access-Control-Request-Method', 'GET')
        .expect(200);

      expect(response.headers['access-control-allow-origin']).toBe('*');
      expect(
        response.headers['access-control-allow-credentials']
      ).toBeUndefined();
    });

    it('should handle function-based origin configuration', async () => {
      process.env.NODE_ENV = 'development';

      const options: ExpressStudioOptions = {
        router: mockRouter,
        cors: {
          origin: (origin: string) => origin?.includes('trusted'),
          credentials: true,
        },
      };

      app.use(studioExpress(options));

      // Test trusted origin
      const response1 = await request(app)
        .options('/__trpc-studio__/introspection')
        .set('Origin', 'https://trusted.example.com')
        .set('Access-Control-Request-Method', 'GET')
        .expect(200);

      expect(response1.headers['access-control-allow-origin']).toBe(
        'https://trusted.example.com'
      );

      // Test untrusted origin
      const response2 = await request(app)
        .options('/__trpc-studio__/introspection')
        .set('Origin', 'https://untrusted.example.com')
        .set('Access-Control-Request-Method', 'GET')
        .expect(200);

      expect(response2.headers['access-control-allow-origin']).toBeUndefined();
    });
  });

  describe('CORS Error Handling', () => {
    it('should handle CORS errors gracefully', async () => {
      process.env.NODE_ENV = 'development';

      const options: ExpressStudioOptions = {
        router: mockRouter,
        cors: {
          origin: () => {
            throw new Error('CORS configuration error');
          },
        },
      };

      app.use(studioExpress(options));

      // Should not crash the server
      const response = await request(app)
        .options('/__trpc-studio__/introspection')
        .set('Origin', 'https://example.com')
        .set('Access-Control-Request-Method', 'GET')
        .expect(500);

      expect(response.body.error).toContain('CORS configuration error');
    });

    it('should handle missing CORS configuration gracefully', async () => {
      process.env.NODE_ENV = 'development';

      const options: ExpressStudioOptions = {
        router: mockRouter,
        // No CORS configuration provided
      };

      app.use(studioExpress(options));

      // Should use default CORS behavior
      const response = await request(app)
        .options('/__trpc-studio__/introspection')
        .set('Origin', 'https://example.com')
        .set('Access-Control-Request-Method', 'GET')
        .expect(200);

      expect(response.headers['access-control-allow-origin']).toBe(
        'https://example.com'
      );
    });
  });

  describe('CORS with Custom Paths', () => {
    it('should handle CORS for custom studio paths', async () => {
      process.env.NODE_ENV = 'development';

      const options: ExpressStudioOptions = {
        router: mockRouter,
        studioPath: '/custom-studio',
        introspectionPath: '/custom-introspection',
      };

      app.use(studioExpress(options));

      // Test custom introspection path
      const response1 = await request(app)
        .options('/custom-introspection')
        .set('Origin', 'http://localhost:3001')
        .set('Access-Control-Request-Method', 'GET')
        .expect(200);

      expect(response1.headers['access-control-allow-origin']).toBe(
        'http://localhost:3001'
      );

      // Test custom studio path
      const response2 = await request(app)
        .options('/custom-studio')
        .set('Origin', 'http://localhost:3001')
        .set('Access-Control-Request-Method', 'GET')
        .expect(200);

      expect(response2.headers['access-control-allow-origin']).toBe(
        'http://localhost:3001'
      );
    });
  });
});
