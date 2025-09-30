/**
 * Test compatibility between tRPC v10 and v11 router structures
 */

import { describe, it, expect } from 'vitest';
import { buildIntrospection } from '../builder';

describe('tRPC v10/v11 compatibility', () => {
  it('should handle v10 router structure with procedures in _def.procedures', () => {
    // Simulate v10 router structure
    const v10Router = {
      _def: {
        procedures: {
          hello: {
            _def: {
              type: 'query',
              meta: { summary: 'Say hello' },
              inputs: [{ type: 'string' }],
              output: { type: 'string' },
            },
          },
          'users.list': {
            _def: {
              type: 'query',
              meta: { summary: 'List users' },
              inputs: [],
              output: { type: 'array' },
            },
          },
          'users.create': {
            _def: {
              type: 'mutation',
              meta: { summary: 'Create user' },
              inputs: [{ type: 'object' }],
              output: { type: 'object' },
            },
          },
        },
        router: {}, // v10 nested router structure
        _config: { transformer: null },
      },
    };

    const result = buildIntrospection(v10Router);

    expect(result.routers).toHaveLength(1);
    expect(result.routers[0].name).toBe('root');

    // Should have 1 direct procedure (hello)
    expect(result.routers[0].procedures).toHaveLength(1);
    expect(result.routers[0].procedures[0].name).toBe('hello');

    // Should have 1 child router (users) with 2 procedures
    expect(result.routers[0].children).toHaveLength(1);
    expect(result.routers[0].children[0].name).toBe('users');
    expect(result.routers[0].children[0].procedures).toHaveLength(2);

    const usersProcedures = result.routers[0].children[0].procedures;
    expect(usersProcedures.find(p => p.name === 'list')).toBeDefined();
    expect(usersProcedures.find(p => p.name === 'create')).toBeDefined();
  });

  it('should handle v11 router structure with procedures in queries/mutations', () => {
    // Simulate v11 router structure
    const v11Router = {
      _def: {
        procedures: {}, // Empty in v11
        queries: {
          hello: {
            // Objects with _def in v11 (not functions)
            _def: {
              type: 'query',
              meta: { summary: 'Say hello' },
              inputs: [{ type: 'string' }],
              output: { type: 'string' },
            },
          },
          'users.list': {
            _def: {
              type: 'query',
              meta: { summary: 'List users' },
              inputs: [],
              output: { type: 'array' },
            },
          },
        },
        mutations: {
          'users.create': {
            _def: {
              type: 'mutation',
              meta: { summary: 'Create user' },
              inputs: [{ type: 'object' }],
              output: { type: 'object' },
            },
          },
        },
        router: {}, // Empty in v11 for flat structure
        _config: { transformer: null },
      },
    };

    const result = buildIntrospection(v11Router);

    expect(result.routers).toHaveLength(1);
    expect(result.routers[0].name).toBe('root');

    // Should have 1 direct procedure (hello)
    expect(result.routers[0].procedures).toHaveLength(1);
    expect(result.routers[0].procedures[0].name).toBe('hello');

    // Should have 1 child router (users) with 2 procedures
    expect(result.routers[0].children).toHaveLength(1);
    expect(result.routers[0].children[0].name).toBe('users');
    expect(result.routers[0].children[0].procedures).toHaveLength(2);

    const usersProcedures = result.routers[0].children[0].procedures;
    expect(usersProcedures.find(p => p.name === 'list')).toBeDefined();
    expect(usersProcedures.find(p => p.name === 'create')).toBeDefined();
  });

  it('should handle mixed v10/v11 structure with both procedures and queries/mutations', () => {
    // Mixed structure that might occur during migration
    const mixedRouter = {
      _def: {
        procedures: {
          legacy: {
            _def: {
              type: 'query',
              meta: { summary: 'Legacy procedure' },
              inputs: [],
              output: { type: 'string' },
            },
          },
        },
        queries: {
          hello: {
            _def: {
              type: 'query',
              meta: { summary: 'Say hello' },
              inputs: [{ type: 'string' }],
              output: { type: 'string' },
            },
          },
        },
        mutations: {
          create: {
            _def: {
              type: 'mutation',
              meta: { summary: 'Create something' },
              inputs: [{ type: 'object' }],
              output: { type: 'object' },
            },
          },
        },
        router: {},
        _config: { transformer: null },
      },
    };

    const result = buildIntrospection(mixedRouter);

    expect(result.routers).toHaveLength(1);
    expect(result.routers[0].name).toBe('root');

    // Should have all 3 procedures at root level
    expect(result.routers[0].procedures).toHaveLength(3);

    const procedureNames = result.routers[0].procedures.map(p => p.name);
    expect(procedureNames).toContain('legacy');
    expect(procedureNames).toContain('hello');
    expect(procedureNames).toContain('create');
  });
});
