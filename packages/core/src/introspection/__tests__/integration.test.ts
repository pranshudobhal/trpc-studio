/**
 * Integration tests for router introspection with realistic tRPC structures
 */

import { describe, it, expect } from 'vitest';
import { buildIntrospection } from '../builder';

describe('Router introspection integration', () => {
  it('should handle a realistic tRPC router structure', () => {
    // Simulate a realistic tRPC router structure
    const appRouter = {
      _def: {
        procedures: {
          health: {
            _def: {
              type: 'query',
              meta: {
                summary: 'Health check endpoint',
                description: 'Returns the health status of the API',
                tags: ['system'],
                visibility: 'public',
              },
              inputs: [],
              output: { type: 'object' },
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
                    meta: {
                      summary: 'User login',
                      description: 'Authenticate user with email and password',
                      tags: ['auth'],
                      authRequired: false,
                      examples: [
                        {
                          input: {
                            email: 'user@example.com',
                            password: 'password123',
                          },
                          output: {
                            token: 'jwt-token',
                            user: { id: '1', email: 'user@example.com' },
                          },
                        },
                      ],
                    },
                    inputs: [{ type: 'object' }],
                    output: { type: 'object' },
                  },
                },
                logout: {
                  _def: {
                    type: 'mutation',
                    meta: {
                      summary: 'User logout',
                      description: 'Invalidate user session',
                      tags: ['auth'],
                      authRequired: true,
                    },
                    inputs: [],
                    output: { type: 'object' },
                  },
                },
                refresh: {
                  _def: {
                    type: 'mutation',
                    meta: {
                      summary: 'Refresh token',
                      description: 'Get a new access token using refresh token',
                      tags: ['auth'],
                      authRequired: true,
                      deprecated: true,
                    },
                    inputs: [{ type: 'object' }],
                    output: { type: 'object' },
                  },
                },
              },
              router: {},
            },
          },
          users: {
            _def: {
              procedures: {
                list: {
                  _def: {
                    type: 'query',
                    meta: {
                      summary: 'List users',
                      description: 'Get paginated list of users',
                      tags: ['users', 'admin'],
                      authRequired: true,
                      visibility: 'internal',
                    },
                    inputs: [{ type: 'object' }],
                    output: { type: 'object' },
                  },
                },
                getById: {
                  _def: {
                    type: 'query',
                    meta: {
                      summary: 'Get user by ID',
                      description: 'Retrieve a specific user by their ID',
                      tags: ['users'],
                      authRequired: true,
                    },
                    inputs: [{ type: 'object' }],
                    output: { type: 'object' },
                  },
                },
                create: {
                  _def: {
                    type: 'mutation',
                    meta: {
                      summary: 'Create user',
                      description: 'Create a new user account',
                      tags: ['users', 'admin'],
                      authRequired: true,
                    },
                    inputs: [{ type: 'object' }],
                    output: { type: 'object' },
                  },
                },
                update: {
                  _def: {
                    type: 'mutation',
                    meta: {
                      summary: 'Update user',
                      description: 'Update user information',
                      tags: ['users'],
                      authRequired: true,
                    },
                    inputs: [{ type: 'object' }],
                    output: { type: 'object' },
                  },
                },
                delete: {
                  _def: {
                    type: 'mutation',
                    meta: {
                      summary: 'Delete user',
                      description: 'Soft delete a user account',
                      tags: ['users', 'admin'],
                      authRequired: true,
                      visibility: 'internal',
                    },
                    inputs: [{ type: 'object' }],
                    output: { type: 'object' },
                  },
                },
                adminOnly: {
                  _def: {
                    type: 'query',
                    meta: {
                      summary: 'Admin only endpoint',
                      description: 'Hidden endpoint for admin operations',
                      tags: ['admin'],
                      visibility: 'hidden',
                    },
                    inputs: [],
                    output: { type: 'object' },
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
                          meta: {
                            summary: 'Get user profile',
                            description: 'Get current user profile information',
                            tags: ['profile'],
                            authRequired: true,
                          },
                          inputs: [],
                          output: { type: 'object' },
                        },
                      },
                      update: {
                        _def: {
                          type: 'mutation',
                          meta: {
                            summary: 'Update profile',
                            description: 'Update current user profile',
                            tags: ['profile'],
                            authRequired: true,
                          },
                          inputs: [{ type: 'object' }],
                          output: { type: 'object' },
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
        _config: {
          transformer: {
            serialize: () => {},
            deserialize: () => {},
          },
        },
      },
    };

    const result = buildIntrospection(appRouter);

    // Verify overall structure
    expect(result.routers).toHaveLength(1);
    expect(result.meta.transformer).toBe('superjson');
    expect(result.meta.generatedAt).toBeDefined();

    const rootRouter = result.routers[0];
    expect(rootRouter.name).toBe('root');
    expect(rootRouter.procedures).toHaveLength(1);
    expect(rootRouter.procedures[0].name).toBe('health');
    expect(rootRouter.children).toHaveLength(2);

    // Verify auth router
    const authRouter = rootRouter.children.find(r => r.name === 'auth');
    expect(authRouter).toBeDefined();
    expect(authRouter!.procedures).toHaveLength(3);
    expect(authRouter!.procedures.map(p => p.name)).toEqual([
      'login',
      'logout',
      'refresh',
    ]);
    expect(authRouter!.children).toHaveLength(0);

    // Verify users router
    const usersRouter = rootRouter.children.find(r => r.name === 'users');
    expect(usersRouter).toBeDefined();
    expect(usersRouter!.procedures).toHaveLength(5); // adminOnly is hidden and excluded
    expect(usersRouter!.procedures.map(p => p.name)).toEqual([
      'list',
      'getById',
      'create',
      'update',
      'delete',
    ]);
    expect(usersRouter!.children).toHaveLength(1);

    // Verify profile nested router
    const profileRouter = usersRouter!.children[0];
    expect(profileRouter.name).toBe('users.profile');
    expect(profileRouter.procedures).toHaveLength(2);
    expect(profileRouter.procedures.map(p => p.name)).toEqual([
      'get',
      'update',
    ]);

    // Verify metadata is preserved
    const loginProc = authRouter!.procedures.find(p => p.name === 'login');
    expect(loginProc!.meta).toMatchObject({
      summary: 'User login',
      description: 'Authenticate user with email and password',
      tags: ['auth'],
      authRequired: false,
      examples: [
        {
          input: { email: 'user@example.com', password: 'password123' },
          output: {
            token: 'jwt-token',
            user: { id: '1', email: 'user@example.com' },
          },
        },
      ],
    });

    // Verify deprecated procedure is included
    const refreshProc = authRouter!.procedures.find(p => p.name === 'refresh');
    expect(refreshProc!.meta?.deprecated).toBe(true);

    // Verify internal visibility is preserved
    const listProc = usersRouter!.procedures.find(p => p.name === 'list');
    expect(listProc!.meta?.visibility).toBe('internal');
  });

  it('should handle router with only subscriptions (should be empty in v1)', () => {
    const subscriptionRouter = {
      _def: {
        procedures: {
          onUserUpdate: {
            _def: {
              type: 'subscription',
              meta: { summary: 'User update subscription' },
              inputs: [],
              output: { type: 'object' },
            },
          },
          onMessage: {
            _def: {
              type: 'subscription',
              meta: { summary: 'Message subscription' },
              inputs: [],
              output: { type: 'object' },
            },
          },
        },
        router: {},
      },
    };

    const result = buildIntrospection(subscriptionRouter);

    // Should have no routers since all procedures are subscriptions (excluded in v1)
    expect(result.routers).toHaveLength(0);
  });

  it('should handle mixed procedure types correctly', () => {
    const mixedRouter = {
      _def: {
        procedures: {
          getUsers: {
            _def: {
              type: 'query',
              meta: { summary: 'Get users' },
              inputs: [],
              output: { type: 'array' },
            },
          },
          createUser: {
            _def: {
              type: 'mutation',
              meta: { summary: 'Create user' },
              inputs: [{ type: 'object' }],
              output: { type: 'object' },
            },
          },
          onUserCreated: {
            _def: {
              type: 'subscription',
              meta: { summary: 'User created subscription' },
              inputs: [],
              output: { type: 'object' },
            },
          },
        },
        router: {},
      },
    };

    const result = buildIntrospection(mixedRouter);

    expect(result.routers).toHaveLength(1);
    const procedures = result.routers[0].procedures;
    expect(procedures).toHaveLength(2); // subscription excluded
    expect(procedures.map(p => p.type)).toEqual(['query', 'mutation']);
    expect(procedures.map(p => p.name)).toEqual(['getUsers', 'createUser']);
  });

  it('should handle filtering options correctly', () => {
    const router = {
      _def: {
        procedures: {
          publicProc: {
            _def: {
              type: 'query',
              meta: { visibility: 'public', summary: 'Public' },
              inputs: [],
              output: {},
            },
          },
          internalProc: {
            _def: {
              type: 'query',
              meta: { visibility: 'internal', summary: 'Internal' },
              inputs: [],
              output: {},
            },
          },
          deprecatedProc: {
            _def: {
              type: 'query',
              meta: { deprecated: true, summary: 'Deprecated' },
              inputs: [],
              output: {},
            },
          },
          hiddenProc: {
            _def: {
              type: 'query',
              meta: { visibility: 'hidden', summary: 'Hidden' },
              inputs: [],
              output: {},
            },
          },
        },
        router: {},
      },
    };

    // Test with includeInternal: false
    const resultNoInternal = buildIntrospection(router, {
      includeInternal: false,
    });
    const proceduresNoInternal = resultNoInternal.routers[0].procedures;
    expect(proceduresNoInternal.map(p => p.name)).toEqual([
      'publicProc',
      'deprecatedProc',
    ]);

    // Test with includeDeprecated: false
    const resultNoDeprecated = buildIntrospection(router, {
      includeDeprecated: false,
    });
    const proceduresNoDeprecated = resultNoDeprecated.routers[0].procedures;
    expect(proceduresNoDeprecated.map(p => p.name)).toEqual([
      'publicProc',
      'internalProc',
    ]);

    // Test with both filters
    const resultFiltered = buildIntrospection(router, {
      includeInternal: false,
      includeDeprecated: false,
    });
    const proceduresFiltered = resultFiltered.routers[0].procedures;
    expect(proceduresFiltered.map(p => p.name)).toEqual(['publicProc']);
  });
});
