import express from 'express';
import { z } from 'zod';
import { initTRPC } from '@trpc/server';
import { studioExpress } from '../src';

// Initialize tRPC
const t = initTRPC.create();

// Define a sample router
const appRouter = t.router({
  hello: t.procedure
    .input(z.object({ name: z.string() }))
    .output(z.object({ message: z.string() }))
    .meta({
      summary: 'Say hello',
      description: 'Returns a personalized greeting message',
      tags: ['greeting', 'example'],
    })
    .query(({ input }) => ({
      message: `Hello, ${input.name}!`,
    })),

  users: t.router({
    list: t.procedure
      .output(
        z.array(
          z.object({ id: z.number(), name: z.string(), email: z.string() })
        )
      )
      .meta({
        summary: 'List users',
        description: 'Get all users from the system',
        tags: ['users'],
      })
      .query(() => [
        { id: 1, name: 'Alice Johnson', email: 'alice@example.com' },
        { id: 2, name: 'Bob Smith', email: 'bob@example.com' },
        { id: 3, name: 'Charlie Brown', email: 'charlie@example.com' },
      ]),

    create: t.procedure
      .input(
        z.object({
          name: z.string().min(2, 'Name must be at least 2 characters'),
          email: z.string().email('Must be a valid email address'),
        })
      )
      .output(z.object({ id: z.number(), name: z.string(), email: z.string() }))
      .meta({
        summary: 'Create user',
        description: 'Create a new user in the system',
        tags: ['users'],
      })
      .mutation(({ input }) => ({
        id: Math.floor(Math.random() * 1000) + 100,
        name: input.name,
        email: input.email,
      })),

    getById: t.procedure
      .input(z.object({ id: z.number() }))
      .output(
        z
          .object({ id: z.number(), name: z.string(), email: z.string() })
          .nullable()
      )
      .meta({
        summary: 'Get user by ID',
        description: 'Retrieve a specific user by their ID',
        tags: ['users'],
      })
      .query(({ input }) => {
        const users = [
          { id: 1, name: 'Alice Johnson', email: 'alice@example.com' },
          { id: 2, name: 'Bob Smith', email: 'bob@example.com' },
          { id: 3, name: 'Charlie Brown', email: 'charlie@example.com' },
        ];
        return users.find(user => user.id === input.id) || null;
      }),
  }),

  posts: t.router({
    list: t.procedure
      .input(
        z.object({
          limit: z.number().min(1).max(100).default(10),
          offset: z.number().min(0).default(0),
        })
      )
      .output(
        z.object({
          posts: z.array(
            z.object({
              id: z.number(),
              title: z.string(),
              content: z.string(),
              authorId: z.number(),
              createdAt: z.date(),
            })
          ),
          total: z.number(),
        })
      )
      .meta({
        summary: 'List posts',
        description: 'Get paginated list of posts',
        tags: ['posts'],
      })
      .query(({ input }) => ({
        posts: [
          {
            id: 1,
            title: 'Getting Started with tRPC',
            content: 'tRPC is a great way to build type-safe APIs...',
            authorId: 1,
            createdAt: new Date('2024-01-15'),
          },
          {
            id: 2,
            title: 'Advanced tRPC Patterns',
            content: 'Learn about middleware, context, and more...',
            authorId: 2,
            createdAt: new Date('2024-01-20'),
          },
        ].slice(input.offset, input.offset + input.limit),
        total: 2,
      })),
  }),
});

export type AppRouter = typeof appRouter;

// Create Express app
const app = express();
const port = process.env.PORT || 3000;

// Add JSON middleware
app.use(express.json());

// Add CORS middleware for development
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header(
    'Access-Control-Allow-Headers',
    'Origin, X-Requested-With, Content-Type, Accept, Authorization, x-trpc-studio-token'
  );
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Vary', 'Origin');

  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});

// Mount tRPC Studio
app.use(
  studioExpress({
    router: appRouter,
    // In development, studio is enabled by default
    // In production, you would need:
    // TRPC_STUDIO_ENABLED=true
    // TRPC_STUDIO_TOKEN=your-secure-token
  })
);

// Add a health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Add a simple API endpoint for testing
app.get('/api/info', (req, res) => {
  res.json({
    name: 'tRPC Studio Express Example',
    version: '1.0.0',
    endpoints: {
      studio: '/trpc-studio',
      introspection: '/__trpc-studio__/introspection',
      health: '/health',
    },
  });
});

// Start server
app.listen(port, () => {
  console.log(`🚀 Server running on http://localhost:${port}`);
  console.log(
    `📚 tRPC Studio available at http://localhost:${port}/trpc-studio`
  );
  console.log(
    `🔍 Introspection API at http://localhost:${port}/__trpc-studio__/introspection`
  );
  console.log(`❤️  Health check at http://localhost:${port}/health`);

  if (process.env.NODE_ENV === 'production') {
    console.log(
      '⚠️  Production mode: Studio requires TRPC_STUDIO_ENABLED=true and TRPC_STUDIO_TOKEN'
    );
  }
});
