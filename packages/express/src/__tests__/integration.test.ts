import express from 'express';
import request from 'supertest';
import { z } from 'zod';
import { initTRPC } from '@trpc/server';
import { studioExpress, createStudioRouter } from '../middleware/studio';
import type { ExpressStudioOptions } from '../types';

// Mock tRPC router for testing
const t = initTRPC.create();

const mockRouter = t.router({
  hello: t.procedure
    .input(z.object({ name: z.string() }))
    .output(z.object({ message: z.string() }))
    .meta({
      summary: 'Say hello',
      description: 'Returns a greeting message',
      tags: ['greeting'],
    })
    .query(({ input }) => ({
      message: `Hello, ${input.name}!`,
    })),

  users: t.router({
    list: t.procedure
      .output(z.array(z.object({ id: z.number(), name: z.string() })))
      .meta({
        summary: 'List users',
        description: 'Get all users',
        tags: ['users'],
      })
      .query(() => [
        { id: 1, name: 'Alice' },
        { id: 2, name: 'Bob' },
      ]),

    create: t.procedure
      .input(z.object({ name: z.string() }))
      .output(z.object({ id: z.number(), name: z.string() }))
      .meta({
        summary: 'Create user',
        description: 'Create a new user',
        tags: ['users'],
      })
      .mutation(({ input }) => ({
        id: Math.floor(Math.random() * 1000),
        name: input.name,
      })),
  }),
});

describe('Express Studio Integration', () => {
  describe('studioExpress middleware', () => {
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

    it('should mount studio routes in development', async () => {
      process.env.NODE_ENV = 'development';

      const options: ExpressStudioOptions = {
        router: mockRouter,
      };

      app.use(studioExpress(options));

      // Test introspection endpoint
      const introspectionResponse = await request(app)
        .get('/__trpc-studio__/introspection')
        .expect(200);

      expect(introspectionResponse.body).toHaveProperty('routers');
      expect(introspectionResponse.body).toHaveProperty('meta');

      // Test studio UI endpoint
      const studioResponse = await request(app).get('/trpc-studio').expect(200);

      expect(studioResponse.text).toContain('tRPC Studio');
    });

    it('should return 404 when disabled in production', async () => {
      process.env.NODE_ENV = 'production';

      const options: ExpressStudioOptions = {
        router: mockRouter,
      };

      app.use(studioExpress(options));

      // Test introspection endpoint returns 404
      await request(app).get('/__trpc-studio__/introspection').expect(404);

      // Test studio UI endpoint returns 404
      await request(app).get('/trpc-studio').expect(404);
    });

    it('should enable in production with env flag and token', async () => {
      process.env.NODE_ENV = 'production';
      process.env.TRPC_STUDIO_ENABLED = 'true';
      process.env.TRPC_STUDIO_TOKEN = 'test-token-123';

      const options: ExpressStudioOptions = {
        router: mockRouter,
      };

      app.use(studioExpress(options));

      // Test introspection endpoint with valid token
      const introspectionResponse = await request(app)
        .get('/__trpc-studio__/introspection')
        .set('Authorization', 'Bearer test-token-123')
        .expect(200);

      expect(introspectionResponse.body).toHaveProperty('routers');

      // Test studio UI endpoint with valid token
      await request(app)
        .get('/trpc-studio')
        .set('Authorization', 'Bearer test-token-123')
        .expect(200);
    });

    it('should return 403 for invalid token in production', async () => {
      process.env.NODE_ENV = 'production';
      process.env.TRPC_STUDIO_ENABLED = 'true';
      process.env.TRPC_STUDIO_TOKEN = 'test-token-123';

      const options: ExpressStudioOptions = {
        router: mockRouter,
      };

      app.use(studioExpress(options));

      // Test introspection endpoint with invalid token
      await request(app)
        .get('/__trpc-studio__/introspection')
        .set('Authorization', 'Bearer wrong-token')
        .expect(403);

      // Test introspection endpoint with no token
      await request(app).get('/__trpc-studio__/introspection').expect(403);
    });

    it('should accept token via x-trpc-studio-token header', async () => {
      process.env.NODE_ENV = 'production';
      process.env.TRPC_STUDIO_ENABLED = 'true';
      process.env.TRPC_STUDIO_TOKEN = 'test-token-123';

      const options: ExpressStudioOptions = {
        router: mockRouter,
      };

      app.use(studioExpress(options));

      // Test introspection endpoint with x-trpc-studio-token header
      const introspectionResponse = await request(app)
        .get('/__trpc-studio__/introspection')
        .set('x-trpc-studio-token', 'test-token-123')
        .expect(200);

      expect(introspectionResponse.body).toHaveProperty('routers');
    });

    it('should return 405 for non-GET requests to introspection', async () => {
      process.env.NODE_ENV = 'development';

      const options: ExpressStudioOptions = {
        router: mockRouter,
      };

      app.use(studioExpress(options));

      // Test POST request returns 405
      const postResponse = await request(app)
        .post('/__trpc-studio__/introspection')
        .expect(405);

      expect(postResponse.headers.allow).toBe('GET');

      // Test PUT request returns 405
      await request(app).put('/__trpc-studio__/introspection').expect(405);
    });

    it('should use custom paths when configured', async () => {
      process.env.NODE_ENV = 'development';

      const options: ExpressStudioOptions = {
        router: mockRouter,
        studioPath: '/custom-studio',
        introspectionPath: '/custom-introspection',
      };

      app.use(studioExpress(options));

      // Test custom introspection path
      await request(app).get('/custom-introspection').expect(200);

      // Test custom studio path
      await request(app).get('/custom-studio').expect(200);

      // Test default paths return 404
      await request(app).get('/__trpc-studio__/introspection').expect(404);

      await request(app).get('/trpc-studio').expect(404);
    });

    it('should not interfere with other routes', async () => {
      process.env.NODE_ENV = 'development';

      const options: ExpressStudioOptions = {
        router: mockRouter,
      };

      // Add a regular route
      app.get('/api/health', (req, res) => {
        res.json({ status: 'ok' });
      });

      app.use(studioExpress(options));

      // Add another regular route after studio
      app.get('/api/version', (req, res) => {
        res.json({ version: '1.0.0' });
      });

      // Test that regular routes still work
      await request(app)
        .get('/api/health')
        .expect(200)
        .expect({ status: 'ok' });

      await request(app)
        .get('/api/version')
        .expect(200)
        .expect({ version: '1.0.0' });

      // Test that studio routes work
      await request(app).get('/__trpc-studio__/introspection').expect(200);
    });
  });

  describe('createStudioRouter', () => {
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

    it('should create a standalone router', async () => {
      process.env.NODE_ENV = 'development';

      const options: ExpressStudioOptions = {
        router: mockRouter,
      };

      const studioRouter = createStudioRouter(options);
      app.use(studioRouter);

      // Test introspection endpoint
      await request(app).get('/__trpc-studio__/introspection').expect(200);

      // Test studio UI endpoint
      await request(app).get('/trpc-studio').expect(200);
    });

    it('should work when mounted at a custom path', async () => {
      process.env.NODE_ENV = 'development';

      const options: ExpressStudioOptions = {
        router: mockRouter,
        studioPath: '/studio',
        introspectionPath: '/studio/api',
      };

      const studioRouter = createStudioRouter(options);
      app.use('/admin', studioRouter);

      // Test introspection endpoint at mounted path
      await request(app).get('/admin/studio/api').expect(200);

      // Test studio UI endpoint at mounted path
      await request(app).get('/admin/studio').expect(200);
    });
  });

  describe('Router introspection', () => {
    let app: express.Application;

    beforeEach(() => {
      app = express();
      app.use(express.json());
      process.env.NODE_ENV = 'development';
    });

    afterEach(() => {
      delete process.env.NODE_ENV;
    });

    it('should return correct router structure', async () => {
      const options: ExpressStudioOptions = {
        router: mockRouter,
      };

      app.use(studioExpress(options));

      const response = await request(app)
        .get('/__trpc-studio__/introspection')
        .expect(200);

      const { routers, meta } = response.body;

      // Check meta information
      expect(meta).toHaveProperty('generatedAt');
      expect(meta).toHaveProperty('trpcVersion');

      // Check router structure
      expect(routers).toHaveLength(1);
      const rootRouter = routers[0];

      // Check procedures
      const helloProcedure = rootRouter.procedures.find(
        (p: any) => p.name === 'hello'
      );
      expect(helloProcedure).toBeDefined();
      expect(helloProcedure.type).toBe('query');
      expect(helloProcedure.meta).toMatchObject({
        summary: 'Say hello',
        description: 'Returns a greeting message',
        tags: ['greeting'],
      });

      // Check nested router
      const usersRouter = rootRouter.children.find(
        (r: any) => r.name === 'users'
      );
      expect(usersRouter).toBeDefined();
      expect(usersRouter.procedures).toHaveLength(2);

      const listProcedure = usersRouter.procedures.find(
        (p: any) => p.name === 'list'
      );
      expect(listProcedure).toBeDefined();
      expect(listProcedure.type).toBe('query');

      const createProcedure = usersRouter.procedures.find(
        (p: any) => p.name === 'create'
      );
      expect(createProcedure).toBeDefined();
      expect(createProcedure.type).toBe('mutation');
    });
  });
});
