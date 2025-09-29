/**
 * Unit tests for router introspection builder
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  buildIntrospection,
  validateTrpcVersion,
  getSupportedVersionRange,
  type BuildIntrospectionOptions,
} from '../builder';
import type { RouterIntrospection } from '../../types/router';

// Mock tRPC router structures for testing
const createMockProcedure = (
  type: 'query' | 'mutation' | 'subscription',
  meta?: Record<string, unknown>
) => ({
  _def: {
    type,
    meta,
    inputs: [{ type: 'string' }], // Mock Zod schema
    output: { type: 'string' }, // Mock Zod schema
  },
});

const createMockRouter = (
  procedures: Record<string, unknown> = {},
  routers: Record<string, unknown> = {},
  config?: Record<string, unknown>
) => ({
  _def: {
    procedures,
    router: routers,
    _config: config,
  },
});

describe('buildIntrospection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should build introspection for a simple router with procedures', () => {
    const router = createMockRouter({
      getUser: createMockProcedure('query', {
        summary: 'Get user by ID',
        description: 'Retrieves a user by their unique identifier',
        tags: ['users'],
      }),
      createUser: createMockProcedure('mutation', {
        summary: 'Create new user',
        deprecated: false,
        authRequired: true,
      }),
    });

    const result = buildIntrospection(router);

    expect(result).toMatchObject({
      routers: [
        {
          name: 'root',
          procedures: [
            {
              name: 'getUser',
              type: 'query',
              meta: {
                summary: 'Get user by ID',
                description: 'Retrieves a user by their unique identifier',
                tags: ['users'],
              },
            },
            {
              name: 'createUser',
              type: 'mutation',
              meta: {
                summary: 'Create new user',
                deprecated: false,
                authRequired: true,
              },
            },
          ],
          children: [],
        },
      ],
      meta: {
        generatedAt: expect.any(String),
        trpcVersion: expect.any(String),
        transformer: null,
      },
    });

    // Verify timestamp is valid ISO string
    expect(new Date(result.meta.generatedAt).toISOString()).toBe(
      result.meta.generatedAt
    );
  });

  it('should handle nested routers', () => {
    const nestedRouter = createMockRouter({
      getProfile: createMockProcedure('query', { summary: 'Get user profile' }),
    });

    const router = createMockRouter(
      {
        getUsers: createMockProcedure('query', { summary: 'List users' }),
      },
      {
        user: nestedRouter,
      }
    );

    const result = buildIntrospection(router);

    expect(result.routers).toHaveLength(1);
    expect(result.routers[0].name).toBe('root');
    expect(result.routers[0].procedures).toHaveLength(1);
    expect(result.routers[0].children).toHaveLength(1);
    expect(result.routers[0].children[0].name).toBe('user');
    expect(result.routers[0].children[0].procedures[0].name).toBe('getProfile');
  });

  it('should filter out hidden procedures', () => {
    const router = createMockRouter({
      publicProc: createMockProcedure('query', { visibility: 'public' }),
      internalProc: createMockProcedure('query', { visibility: 'internal' }),
      hiddenProc: createMockProcedure('query', { visibility: 'hidden' }),
    });

    const result = buildIntrospection(router);

    const procedures = result.routers[0].procedures;
    expect(procedures).toHaveLength(2);
    expect(procedures.map(p => p.name)).toEqual(['publicProc', 'internalProc']);
  });

  it('should respect includeInternal option', () => {
    const router = createMockRouter({
      publicProc: createMockProcedure('query', { visibility: 'public' }),
      internalProc: createMockProcedure('query', { visibility: 'internal' }),
    });

    const result = buildIntrospection(router, { includeInternal: false });

    const procedures = result.routers[0].procedures;
    expect(procedures).toHaveLength(1);
    expect(procedures[0].name).toBe('publicProc');
  });

  it('should respect includeDeprecated option', () => {
    const router = createMockRouter({
      currentProc: createMockProcedure('query', { deprecated: false }),
      deprecatedProc: createMockProcedure('query', { deprecated: true }),
    });

    const result = buildIntrospection(router, { includeDeprecated: false });

    const procedures = result.routers[0].procedures;
    expect(procedures).toHaveLength(1);
    expect(procedures[0].name).toBe('currentProc');
  });

  it('should skip subscription procedures in v1', () => {
    const router = createMockRouter({
      queryProc: createMockProcedure('query'),
      mutationProc: createMockProcedure('mutation'),
      subscriptionProc: createMockProcedure('subscription'),
    });

    const result = buildIntrospection(router);

    const procedures = result.routers[0].procedures;
    expect(procedures).toHaveLength(2);
    expect(procedures.map(p => p.type)).toEqual(['query', 'mutation']);
  });

  it('should handle procedures with examples', () => {
    const router = createMockRouter({
      testProc: createMockProcedure('query', {
        examples: [
          { input: { id: '123' }, output: { name: 'John' } },
          { input: { id: '456' }, output: { name: 'Jane' } },
        ],
      }),
    });

    const result = buildIntrospection(router);

    const procedure = result.routers[0].procedures[0];
    expect(procedure.meta?.examples).toHaveLength(2);
    expect(procedure.meta?.examples?.[0]).toEqual({
      input: { id: '123' },
      output: { name: 'John' },
    });
  });

  it('should handle malformed metadata gracefully', () => {
    const router = createMockRouter({
      procWithBadMeta: createMockProcedure('query', {
        summary: 123, // Invalid type
        tags: 'not-an-array', // Invalid type
        deprecated: 'yes', // Invalid type
      }),
    });

    const result = buildIntrospection(router);

    const procedure = result.routers[0].procedures[0];
    expect(procedure.meta?.summary).toBeUndefined();
    expect(procedure.meta?.tags).toBeUndefined();
    expect(procedure.meta?.deprecated).toBeUndefined();
  });

  it('should detect SuperJSON transformer', () => {
    const mockTransformer = {
      serialize: vi.fn(),
      deserialize: vi.fn(),
    };

    const router = createMockRouter({}, {}, { transformer: mockTransformer });

    const result = buildIntrospection(router);

    expect(result.meta.transformer).toBe('superjson');
  });

  it('should handle custom transformer option', () => {
    const router = createMockRouter();

    const result = buildIntrospection(router, {
      transformer: 'custom-transformer',
    });

    expect(result.meta.transformer).toBe('custom-transformer');
  });

  it('should handle custom tRPC version option', () => {
    const router = createMockRouter();

    const result = buildIntrospection(router, {
      trpcVersion: '11.0.0',
    });

    expect(result.meta.trpcVersion).toBe('11.0.0');
  });

  it('should throw error for invalid router', () => {
    expect(() => buildIntrospection(null)).toThrow(
      'Invalid router: expected object'
    );
    expect(() => buildIntrospection({})).toThrow(
      'Invalid router: missing _def property'
    );
    expect(() => buildIntrospection({ _def: null })).toThrow(
      'Invalid router: missing _def property'
    );
  });

  it('should handle empty router', () => {
    const router = createMockRouter();

    const result = buildIntrospection(router);

    expect(result.routers).toHaveLength(0);
    expect(result.meta.generatedAt).toBeDefined();
  });

  it('should handle deeply nested routers', () => {
    const deeplyNestedRouter = createMockRouter({
      deepProc: createMockProcedure('query', { summary: 'Deep procedure' }),
    });

    const nestedRouter = createMockRouter({}, { deep: deeplyNestedRouter });

    const router = createMockRouter({}, { nested: nestedRouter });

    const result = buildIntrospection(router);

    expect(result.routers).toHaveLength(1);
    expect(result.routers[0].children).toHaveLength(1);
    expect(result.routers[0].children[0].name).toBe('nested');
    expect(result.routers[0].children[0].children).toHaveLength(1);
    expect(result.routers[0].children[0].children[0].name).toBe('nested.deep');
  });

  it('should handle invalid nested routers gracefully', () => {
    const router = createMockRouter(
      {},
      {
        validRouter: createMockRouter({ proc: createMockProcedure('query') }),
        invalidRouter: null,
        anotherInvalidRouter: 'not-a-router',
      }
    );

    // Should not throw and should process valid routers
    const result = buildIntrospection(router);

    expect(result.routers).toHaveLength(1);
    expect(result.routers[0].children).toHaveLength(1);
    expect(result.routers[0].children[0].name).toBe('validRouter');
  });
});

describe('validateTrpcVersion', () => {
  it('should validate supported versions', () => {
    const v10 = validateTrpcVersion('10.45.2');
    expect(v10.isSupported).toBe(true);
    expect(v10.major).toBe(10);
    expect(v10.minor).toBe(45);
    expect(v10.patch).toBe(2);

    const v11 = validateTrpcVersion('11.0.0');
    expect(v11.isSupported).toBe(true);
    expect(v11.major).toBe(11);
  });

  it('should reject unsupported versions', () => {
    const v9 = validateTrpcVersion('9.0.0');
    expect(v9.isSupported).toBe(false);

    const v12 = validateTrpcVersion('12.0.0');
    expect(v12.isSupported).toBe(false);
  });

  it('should handle invalid version strings', () => {
    const invalid = validateTrpcVersion('not-a-version');
    expect(invalid.isSupported).toBe(false);
    expect(invalid.major).toBe(0);
    expect(invalid.version).toBe('not-a-version');
  });
});

describe('getSupportedVersionRange', () => {
  it('should return correct version range', () => {
    expect(getSupportedVersionRange()).toBe('>=10.0.0 <12.0.0');
  });
});

describe('edge cases and error handling', () => {
  it('should handle procedures without _def', () => {
    const router = createMockRouter({
      invalidProc: { notAValidProcedure: true },
    });

    const result = buildIntrospection(router);

    // When there are no valid procedures, no router node is created
    expect(result.routers).toHaveLength(0);
  });

  it('should handle procedures with missing type', () => {
    const router = createMockRouter({
      noTypeProc: {
        _def: {
          // missing type
          inputs: [],
          output: {},
        },
      },
    });

    const result = buildIntrospection(router);

    // Should default to query type
    expect(result.routers[0].procedures).toHaveLength(1);
    expect(result.routers[0].procedures[0].type).toBe('query');
  });

  it('should handle procedures with no inputs', () => {
    const router = createMockRouter({
      noInputProc: {
        _def: {
          type: 'query',
          inputs: [],
          output: {},
        },
      },
    });

    const result = buildIntrospection(router);

    expect(result.routers[0].procedures).toHaveLength(1);
    expect(result.routers[0].procedures[0].input).toBeUndefined();
  });

  it('should handle complex metadata filtering', () => {
    const router = createMockRouter({
      proc1: createMockProcedure('query', {
        tags: ['valid', 123, 'another-valid', null, 'last-valid'],
      }),
    });

    const result = buildIntrospection(router);

    const procedure = result.routers[0].procedures[0];
    expect(procedure.meta?.tags).toEqual([
      'valid',
      'another-valid',
      'last-valid',
    ]);
  });

  it('should handle router with record property instead of router property', () => {
    const router = {
      _def: {
        procedures: {},
        record: {
          user: {
            _def: {
              procedures: {
                getProfile: {
                  _def: {
                    type: 'query',
                    meta: { summary: 'Get user profile' },
                    inputs: [],
                    output: {},
                  },
                },
              },
              router: {},
            },
          },
        },
      },
    };

    const result = buildIntrospection(router);

    expect(result.routers).toHaveLength(1);
    expect(result.routers[0].children).toHaveLength(1);
    expect(result.routers[0].children[0].name).toBe('user');
    expect(result.routers[0].children[0].procedures[0].name).toBe('getProfile');
  });

  it('should handle mixed visibility settings correctly', () => {
    const router = {
      _def: {
        procedures: {
          publicQuery: {
            _def: {
              type: 'query',
              meta: { visibility: 'public', summary: 'Public query' },
              inputs: [],
              output: {},
            },
          },
          internalQuery: {
            _def: {
              type: 'query',
              meta: { visibility: 'internal', summary: 'Internal query' },
              inputs: [],
              output: {},
            },
          },
          hiddenQuery: {
            _def: {
              type: 'query',
              meta: { visibility: 'hidden', summary: 'Hidden query' },
              inputs: [],
              output: {},
            },
          },
          defaultQuery: {
            _def: {
              type: 'query',
              meta: { summary: 'Default visibility query' },
              inputs: [],
              output: {},
            },
          },
        },
        router: {},
      },
    };

    const result = buildIntrospection(router);

    const procedures = result.routers[0].procedures;
    expect(procedures).toHaveLength(3); // hidden should be excluded
    expect(procedures.map(p => p.name)).toEqual([
      'publicQuery',
      'internalQuery',
      'defaultQuery',
    ]);
  });

  it('should handle complex nested router structures', () => {
    const router = {
      _def: {
        procedures: {
          rootQuery: {
            _def: {
              type: 'query',
              meta: { summary: 'Root level query' },
              inputs: [],
              output: {},
            },
          },
        },
        router: {
          auth: {
            _def: {
              procedures: {
                login: {
                  _def: {
                    type: 'mutation',
                    meta: { summary: 'User login' },
                    inputs: [],
                    output: {},
                  },
                },
              },
              router: {
                profile: {
                  _def: {
                    procedures: {
                      get: {
                        _def: {
                          type: 'query',
                          meta: { summary: 'Get profile' },
                          inputs: [],
                          output: {},
                        },
                      },
                      update: {
                        _def: {
                          type: 'mutation',
                          meta: { summary: 'Update profile' },
                          inputs: [],
                          output: {},
                        },
                      },
                    },
                    router: {},
                  },
                },
              },
            },
          },
        },
      },
    };

    const result = buildIntrospection(router);

    expect(result.routers).toHaveLength(1);

    const rootRouter = result.routers[0];
    expect(rootRouter.name).toBe('root');
    expect(rootRouter.procedures).toHaveLength(1);
    expect(rootRouter.procedures[0].name).toBe('rootQuery');
    expect(rootRouter.children).toHaveLength(1);

    const authRouter = rootRouter.children[0];
    expect(authRouter.name).toBe('auth');
    expect(authRouter.procedures).toHaveLength(1);
    expect(authRouter.procedures[0].name).toBe('login');
    expect(authRouter.children).toHaveLength(1);

    const profileRouter = authRouter.children[0];
    expect(profileRouter.name).toBe('auth.profile');
    expect(profileRouter.procedures).toHaveLength(2);
    expect(profileRouter.procedures.map(p => p.name)).toEqual([
      'get',
      'update',
    ]);
  });

  it('should handle routers with only nested routers (no procedures)', () => {
    const router = {
      _def: {
        procedures: {},
        router: {
          api: {
            _def: {
              procedures: {
                health: {
                  _def: {
                    type: 'query',
                    meta: { summary: 'Health check' },
                    inputs: [],
                    output: {},
                  },
                },
              },
              router: {},
            },
          },
        },
      },
    };

    const result = buildIntrospection(router);

    expect(result.routers).toHaveLength(1);
    expect(result.routers[0].name).toBe('root');
    expect(result.routers[0].procedures).toHaveLength(0);
    expect(result.routers[0].children).toHaveLength(1);
    expect(result.routers[0].children[0].name).toBe('api');
    expect(result.routers[0].children[0].procedures).toHaveLength(1);
  });

  it('should handle procedures with complex metadata', () => {
    const router = {
      _def: {
        procedures: {
          complexProc: {
            _def: {
              type: 'mutation',
              meta: {
                summary: 'Complex procedure',
                description: 'A procedure with all metadata fields',
                tags: ['users', 'admin'],
                deprecated: true,
                visibility: 'internal',
                authRequired: true,
                examples: [
                  {
                    input: { userId: '123', data: { name: 'John' } },
                    output: {
                      success: true,
                      user: { id: '123', name: 'John' },
                    },
                    description: 'Update user name',
                  },
                ],
                customField: 'should be preserved',
              },
              inputs: [{ type: 'object' }],
              output: { type: 'object' },
            },
          },
        },
        router: {},
      },
    };

    const result = buildIntrospection(router);

    const procedure = result.routers[0].procedures[0];
    expect(procedure.meta).toEqual({
      summary: 'Complex procedure',
      description: 'A procedure with all metadata fields',
      tags: ['users', 'admin'],
      deprecated: true,
      visibility: 'internal',
      authRequired: true,
      examples: [
        {
          input: { userId: '123', data: { name: 'John' } },
          output: { success: true, user: { id: '123', name: 'John' } },
          description: 'Update user name',
        },
      ],
    });
  });

  it('should preserve procedure order', () => {
    const router = {
      _def: {
        procedures: {
          zQuery: {
            _def: {
              type: 'query',
              meta: { summary: 'Z query' },
              inputs: [],
              output: {},
            },
          },
          aQuery: {
            _def: {
              type: 'query',
              meta: { summary: 'A query' },
              inputs: [],
              output: {},
            },
          },
          mQuery: {
            _def: {
              type: 'query',
              meta: { summary: 'M query' },
              inputs: [],
              output: {},
            },
          },
        },
        router: {},
      },
    };

    const result = buildIntrospection(router);

    const procedureNames = result.routers[0].procedures.map(p => p.name);
    expect(procedureNames).toEqual(['zQuery', 'aQuery', 'mQuery']);
  });

  it('should handle empty nested routers', () => {
    const router = {
      _def: {
        procedures: {},
        router: {
          empty1: {
            _def: {
              procedures: {},
              router: {},
            },
          },
          empty2: {
            _def: {
              procedures: {},
              router: {
                nested: {
                  _def: {
                    procedures: {},
                    router: {},
                  },
                },
              },
            },
          },
        },
      },
    };

    const result = buildIntrospection(router);

    // A root router is created even if it has no procedures, as long as it has nested routers
    expect(result.routers).toHaveLength(1);
    expect(result.routers[0].name).toBe('root');
    expect(result.routers[0].procedures).toHaveLength(0);
    // empty2 has nested routers, so it gets included even though they're empty
    expect(result.routers[0].children).toHaveLength(1);
    expect(result.routers[0].children[0].name).toBe('empty2');
  });

  it('should handle procedures with multiple input schemas', () => {
    const router = {
      _def: {
        procedures: {
          multiInputProc: {
            _def: {
              type: 'mutation',
              meta: { summary: 'Procedure with multiple inputs' },
              inputs: [
                { type: 'string' }, // middleware input
                { type: 'number' }, // another middleware input
                { type: 'object' }, // final procedure input
              ],
              output: { type: 'boolean' },
            },
          },
        },
        router: {},
      },
    };

    const result = buildIntrospection(router);

    const procedure = result.routers[0].procedures[0];
    expect(procedure.name).toBe('multiInputProc');
    // Should use the last input in the chain
    expect(procedure.input).toBeUndefined(); // Will be converted by schema converter
  });
});
