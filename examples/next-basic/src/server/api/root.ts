import { z } from 'zod';
import { createTRPCRouter, publicProcedure, protectedProcedure } from './trpc';

// Complex Zod schemas demonstrating various constraint types
const UserSchema = z.object({
  id: z.number().int().positive(),
  name: z.string().min(2).max(50),
  email: z.string().email(),
  age: z.number().int().min(13).max(120).optional(),
  role: z.enum(['admin', 'user', 'moderator']).default('user'),
  preferences: z.object({
    theme: z.enum(['light', 'dark']).default('light'),
    notifications: z.boolean().default(true),
    language: z
      .string()
      .regex(/^[a-z]{2}$/)
      .default('en'),
  }),
  tags: z.array(z.string().min(1)).max(10).default([]),
  metadata: z.record(z.string(), z.any()).optional(),
  createdAt: z.date(),
  updatedAt: z.date().optional(),
});

const PostSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(1).max(200),
  content: z.string().min(10),
  published: z.boolean().default(false),
  publishedAt: z.date().nullable(),
  authorId: z.number().int().positive(),
  categoryId: z.number().int().positive().optional(),
  tags: z.array(z.string()).default([]),
  viewCount: z.number().int().nonnegative().default(0),
  likes: z.number().int().nonnegative().default(0),
});

// Discriminated union example
const NotificationSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('email'),
    recipient: z.string().email(),
    subject: z.string().min(1),
    body: z.string().min(1),
  }),
  z.object({
    type: z.literal('sms'),
    phoneNumber: z.string().regex(/^\+[1-9]\d{1,14}$/),
    message: z.string().min(1).max(160),
  }),
  z.object({
    type: z.literal('push'),
    deviceId: z.string().uuid(),
    title: z.string().min(1),
    body: z.string().min(1),
    badge: z.number().int().nonnegative().optional(),
  }),
]);

// Create routers for different domains
const userRouter = createTRPCRouter({
  getById: publicProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .output(UserSchema)
    .meta({
      summary: 'Get user by ID',
      description: 'Retrieves a user by their unique identifier',
      tags: ['users', 'read'],
      examples: [
        {
          input: { id: 1 },
          output: {
            id: 1,
            name: 'John Doe',
            email: 'john@example.com',
            age: 30,
            role: 'user',
            preferences: {
              theme: 'dark',
              notifications: true,
              language: 'en',
            },
            tags: ['developer', 'typescript'],
            createdAt: new Date('2024-01-01'),
            updatedAt: new Date('2024-01-15'),
          },
        },
      ],
    })
    .query(({ input }) => {
      return {
        id: input.id,
        name: 'John Doe',
        email: 'john@example.com',
        age: 30,
        role: 'user' as const,
        preferences: {
          theme: 'dark' as const,
          notifications: true,
          language: 'en',
        },
        tags: ['developer', 'typescript'],
        metadata: { lastLogin: '2024-01-15T10:30:00Z' },
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-15'),
      };
    }),

  create: publicProcedure
    .input(
      z.object({
        name: z.string().min(2).max(50),
        email: z.string().email(),
        age: z.number().int().min(13).max(120).optional(),
        role: z.enum(['admin', 'user', 'moderator']).default('user'),
        preferences: z
          .object({
            theme: z.enum(['light', 'dark']).default('light'),
            notifications: z.boolean().default(true),
            language: z
              .string()
              .regex(/^[a-z]{2}$/)
              .default('en'),
          })
          .default({}),
        tags: z.array(z.string().min(1)).max(10).default([]),
      })
    )
    .output(UserSchema)
    .meta({
      summary: 'Create new user',
      description: 'Creates a new user account with the provided information',
      tags: ['users', 'create'],
      authRequired: false,
      examples: [
        {
          input: {
            name: 'Jane Smith',
            email: 'jane@example.com',
            age: 25,
            role: 'user',
            preferences: {
              theme: 'light',
              notifications: false,
              language: 'es',
            },
            tags: ['designer', 'ui-ux'],
          },
        },
      ],
    })
    .mutation(({ input }) => {
      const now = new Date();
      return {
        id: Math.floor(Math.random() * 1000) + 1,
        ...input,
        preferences: {
          theme: input.preferences?.theme || ('light' as const),
          notifications: input.preferences?.notifications ?? true,
          language: input.preferences?.language || 'en',
        },
        createdAt: now,
        updatedAt: now,
      };
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.number().int().positive(),
        data: z
          .object({
            name: z.string().min(2).max(50),
            email: z.string().email(),
            age: z.number().int().min(13).max(120),
            preferences: z.object({
              theme: z.enum(['light', 'dark']),
              notifications: z.boolean(),
              language: z.string().regex(/^[a-z]{2}$/),
            }),
            tags: z.array(z.string().min(1)).max(10),
          })
          .partial(),
      })
    )
    .output(UserSchema)
    .meta({
      summary: 'Update user',
      description: 'Updates an existing user with partial data',
      tags: ['users', 'update'],
      authRequired: true,
      deprecated: false,
    })
    .mutation(({ input }) => {
      const now = new Date();
      return {
        id: input.id,
        name: input.data.name || 'Updated User',
        email: input.data.email || 'updated@example.com',
        age: input.data.age || 25,
        role: 'user' as const,
        preferences: {
          theme: 'light' as const,
          notifications: true,
          language: 'en',
          ...input.data.preferences,
        },
        tags: input.data.tags || [],
        createdAt: new Date('2024-01-01'),
        updatedAt: now,
      };
    }),

  list: publicProcedure
    .input(
      z.object({
        limit: z.number().int().min(1).max(100).default(10),
        offset: z.number().int().nonnegative().default(0),
        search: z.string().min(1).optional(),
        role: z.enum(['admin', 'user', 'moderator']).optional(),
        sortBy: z.enum(['name', 'email', 'createdAt']).default('createdAt'),
        sortOrder: z.enum(['asc', 'desc']).default('desc'),
      })
    )
    .output(
      z.object({
        users: z.array(UserSchema),
        total: z.number().int().nonnegative(),
        hasMore: z.boolean(),
      })
    )
    .meta({
      summary: 'List users',
      description:
        'Retrieves a paginated list of users with optional filtering and sorting',
      tags: ['users', 'list'],
    })
    .query(({ input }) => {
      const mockUsers = Array.from({ length: input.limit }, (_, i) => ({
        id: input.offset + i + 1,
        name: `User ${input.offset + i + 1}`,
        email: `user${input.offset + i + 1}@example.com`,
        age: 20 + (i % 50),
        role: (['user', 'admin', 'moderator'] as const)[i % 3],
        preferences: {
          theme: (['light', 'dark'] as const)[i % 2],
          notifications: i % 2 === 0,
          language: 'en',
        },
        tags: [`tag${i + 1}`],
        createdAt: new Date(Date.now() - i * 86400000),
        updatedAt: new Date(),
      }));

      return {
        users: mockUsers,
        total: 250,
        hasMore: input.offset + input.limit < 250,
      };
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .output(z.object({ success: z.boolean(), deletedId: z.number() }))
    .meta({
      summary: 'Delete user',
      description: 'Permanently deletes a user account',
      tags: ['users', 'delete'],
      authRequired: true,
      deprecated: true, // Mark as deprecated for testing
    })
    .mutation(({ input }) => {
      return {
        success: true,
        deletedId: input.id,
      };
    }),
});

const postRouter = createTRPCRouter({
  getById: publicProcedure
    .input(z.object({ id: z.string().uuid() }))
    .output(PostSchema)
    .meta({
      summary: 'Get post by ID',
      description: 'Retrieves a blog post by its UUID',
      tags: ['posts', 'read'],
    })
    .query(({ input }) => {
      return {
        id: input.id,
        title: 'Sample Blog Post',
        content:
          'This is a comprehensive example of a blog post with rich content.',
        published: true,
        publishedAt: new Date('2024-01-10'),
        authorId: 1,
        categoryId: 1,
        tags: ['typescript', 'trpc', 'nextjs'],
        viewCount: 150,
        likes: 25,
      };
    }),

  create: protectedProcedure
    .input(
      z.object({
        title: z.string().min(1).max(200),
        content: z.string().min(10),
        published: z.boolean().default(false),
        categoryId: z.number().int().positive().optional(),
        tags: z.array(z.string()).default([]),
      })
    )
    .output(PostSchema)
    .meta({
      summary: 'Create new post',
      description: 'Creates a new blog post',
      tags: ['posts', 'create'],
      authRequired: true,
    })
    .mutation(({ input }) => {
      return {
        id: crypto.randomUUID(),
        ...input,
        publishedAt: input.published ? new Date() : null,
        authorId: 1, // Mock current user ID
        viewCount: 0,
        likes: 0,
      };
    }),

  search: publicProcedure
    .input(
      z.object({
        query: z.string().min(1),
        limit: z.number().int().min(1).max(50).default(10),
        published: z.boolean().optional(),
        categoryId: z.number().int().positive().optional(),
        tags: z.array(z.string()).optional(),
      })
    )
    .output(
      z.object({
        posts: z.array(PostSchema),
        total: z.number().int().nonnegative(),
        searchTime: z.number().positive(),
      })
    )
    .meta({
      summary: 'Search posts',
      description: 'Full-text search across blog posts with filtering options',
      tags: ['posts', 'search'],
    })
    .query(({ input }) => {
      const searchTime = Math.random() * 100 + 10; // Mock search time in ms

      return {
        posts: [
          {
            id: crypto.randomUUID(),
            title: `Search result for "${input.query}"`,
            content: `This post matches your search query: ${input.query}`,
            published: true,
            publishedAt: new Date(),
            authorId: 1,
            categoryId: input.categoryId || 1,
            tags: input.tags || ['search', 'result'],
            viewCount: 42,
            likes: 7,
          },
        ],
        total: 1,
        searchTime,
      };
    }),
});

const notificationRouter = createTRPCRouter({
  send: protectedProcedure
    .input(NotificationSchema)
    .output(
      z.object({
        id: z.string().uuid(),
        status: z.enum(['sent', 'failed', 'pending']),
        sentAt: z.date(),
        deliveredAt: z.date().nullable(),
      })
    )
    .meta({
      summary: 'Send notification',
      description: 'Sends a notification via email, SMS, or push notification',
      tags: ['notifications', 'send'],
      authRequired: true,
      examples: [
        {
          input: {
            type: 'email',
            recipient: 'user@example.com',
            subject: 'Welcome!',
            body: 'Welcome to our platform!',
          },
        },
        {
          input: {
            type: 'sms',
            phoneNumber: '+1234567890',
            message: 'Your verification code is 123456',
          },
        },
        {
          input: {
            type: 'push',
            deviceId: '550e8400-e29b-41d4-a716-446655440000',
            title: 'New Message',
            body: 'You have a new message',
            badge: 1,
          },
        },
      ],
    })
    .mutation(({ input }) => {
      const now = new Date();
      return {
        id: crypto.randomUUID(),
        status: 'sent' as const,
        sentAt: now,
        deliveredAt: new Date(now.getTime() + 1000), // Delivered 1 second later
      };
    }),

  getHistory: protectedProcedure
    .input(
      z.object({
        userId: z.number().int().positive().optional(),
        type: z.enum(['email', 'sms', 'push']).optional(),
        limit: z.number().int().min(1).max(100).default(20),
        offset: z.number().int().nonnegative().default(0),
      })
    )
    .output(
      z.object({
        notifications: z.array(
          z.object({
            id: z.string().uuid(),
            type: z.enum(['email', 'sms', 'push']),
            status: z.enum(['sent', 'failed', 'pending']),
            sentAt: z.date(),
            deliveredAt: z.date().nullable(),
            metadata: z.record(z.string(), z.any()),
          })
        ),
        total: z.number().int().nonnegative(),
      })
    )
    .meta({
      summary: 'Get notification history',
      description: 'Retrieves the history of sent notifications',
      tags: ['notifications', 'history'],
      authRequired: true,
    })
    .query(({ input }) => {
      const mockNotifications = Array.from({ length: input.limit }, (_, i) => ({
        id: crypto.randomUUID(),
        type: (['email', 'sms', 'push'] as const)[i % 3],
        status: (['sent', 'failed', 'pending'] as const)[i % 3],
        sentAt: new Date(Date.now() - i * 3600000), // Each notification 1 hour apart
        deliveredAt:
          i % 3 === 0 ? new Date(Date.now() - i * 3600000 + 30000) : null,
        metadata: { attempt: i + 1 },
      }));

      return {
        notifications: mockNotifications,
        total: 150,
      };
    }),
});

// Internal procedures for testing visibility
const internalRouter = createTRPCRouter({
  systemStatus: publicProcedure
    .input(z.object({}))
    .output(
      z.object({
        status: z.enum(['healthy', 'degraded', 'down']),
        uptime: z.number().positive(),
        version: z.string(),
        environment: z.string(),
      })
    )
    .meta({
      summary: 'System status',
      description: 'Internal system status check',
      tags: ['system', 'health'],
      visibility: 'internal' as const,
    })
    .query(() => {
      return {
        status: 'healthy' as const,
        uptime: Date.now() - new Date('2024-01-01').getTime(),
        version: '1.0.0',
        environment: 'development',
      };
    }),

  debugInfo: publicProcedure
    .input(z.object({ includeSecrets: z.boolean().default(false) }))
    .output(
      z.object({
        nodeVersion: z.string(),
        memoryUsage: z.record(z.string(), z.number()),
        environment: z.record(z.string(), z.string()),
      })
    )
    .meta({
      summary: 'Debug information',
      description:
        'Internal debugging information - should not appear in public docs',
      tags: ['debug', 'internal'],
      visibility: 'hidden' as const,
    })
    .query(({ input }) => {
      const memoryUsage = process.memoryUsage();
      const environment = input.includeSecrets
        ? Object.fromEntries(
            Object.entries(process.env).map(([key, value]) => [
              key,
              value || '',
            ])
          )
        : { NODE_ENV: process.env.NODE_ENV || 'development' };

      return {
        nodeVersion: process.version,
        memoryUsage: {
          rss: memoryUsage.rss,
          heapTotal: memoryUsage.heapTotal,
          heapUsed: memoryUsage.heapUsed,
          external: memoryUsage.external,
          arrayBuffers: memoryUsage.arrayBuffers,
        },
        environment,
      };
    }),
});

// Main app router combining all sub-routers
export const appRouter = createTRPCRouter({
  // Simple greeting procedure for quick testing
  hello: publicProcedure
    .input(z.object({ text: z.string().min(1) }))
    .output(z.object({ greeting: z.string(), timestamp: z.date() }))
    .meta({
      summary: 'Say hello',
      description: 'Returns a personalized greeting message with timestamp',
      tags: ['greeting', 'simple'],
      examples: [
        {
          input: { text: 'World' },
          output: {
            greeting: 'Hello World!',
            timestamp: new Date(),
          },
        },
      ],
    })
    .query(({ input }) => {
      return {
        greeting: `Hello ${input.text}!`,
        timestamp: new Date(),
      };
    }),

  // Complex data types demonstration
  complexData: publicProcedure
    .input(z.object({}))
    .output(
      z.object({
        date: z.date(),
        bigint: z.bigint(),
        map: z.map(z.string(), z.number()),
        set: z.set(z.string()),
        nested: z.object({
          array: z.array(z.object({ id: z.number(), name: z.string() })),
          optional: z.string().optional(),
          nullable: z.string().nullable(),
        }),
      })
    )
    .meta({
      summary: 'Complex data types',
      description:
        'Demonstrates SuperJSON serialization of complex JavaScript types',
      tags: ['superjson', 'complex-types'],
    })
    .query(() => {
      return {
        date: new Date(),
        bigint: BigInt('9007199254740991'),
        map: new Map([
          ['key1', 100],
          ['key2', 200],
        ]),
        set: new Set(['value1', 'value2', 'value3']),
        nested: {
          array: [
            { id: 1, name: 'Item 1' },
            { id: 2, name: 'Item 2' },
          ],
          optional: 'present',
          nullable: null,
        },
      };
    }),

  // Sub-routers
  user: userRouter,
  post: postRouter,
  notification: notificationRouter,
  internal: internalRouter,
});

export type AppRouter = typeof appRouter;
