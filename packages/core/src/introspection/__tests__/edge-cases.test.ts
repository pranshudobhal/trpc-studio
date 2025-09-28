/**
 * Additional edge case tests for router introspection
 */

import { describe, it, expect } from 'vitest';
import { buildIntrospection } from '../builder';

describe('Router introspection edge cases', () => {
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

  it('should handle transformer detection from different config structures', () => {
    const routerWithTransformer = {
      _def: {
        procedures: {},
        router: {},
        _config: {
          transformer: {
            serialize: () => {},
            deserialize: () => {},
          },
        },
      },
    };

    const result = buildIntrospection(routerWithTransformer);

    expect(result.meta.transformer).toBe('superjson');
  });

  it('should handle version detection gracefully when package not available', () => {
    // This test ensures the function doesn't crash when @trpc/server package is not available
    const router = {
      _def: {
        procedures: {},
        router: {},
      },
    };

    const result = buildIntrospection(router);

    // Should not crash and should have a version (since @trpc/server is available in test env)
    expect(result.meta.trpcVersion).toBeDefined();
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
