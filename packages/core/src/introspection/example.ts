/**
 * Example usage of the router introspection engine
 * This file demonstrates how to use buildIntrospection with various router structures
 */

import { buildIntrospection } from './builder';
import type { RouterIntrospection } from '../types/router';

// Example: Simple router with basic procedures
export function exampleSimpleRouter() {
  const simpleRouter = {
    _def: {
      procedures: {
        hello: {
          _def: {
            type: 'query',
            meta: {
              summary: 'Hello world',
              description: 'Returns a greeting message',
              tags: ['example'],
            },
            inputs: [],
            output: { type: 'string' },
          },
        },
        createPost: {
          _def: {
            type: 'mutation',
            meta: {
              summary: 'Create post',
              description: 'Create a new blog post',
              tags: ['posts'],
              authRequired: true,
            },
            inputs: [{ type: 'object' }],
            output: { type: 'object' },
          },
        },
      },
      router: {},
    },
  };

  const introspection = buildIntrospection(simpleRouter);
  console.log(
    'Simple Router Introspection:',
    JSON.stringify(introspection, null, 2)
  );
  return introspection;
}

// Example: Nested router structure
export function exampleNestedRouter() {
  const nestedRouter = {
    _def: {
      procedures: {
        health: {
          _def: {
            type: 'query',
            meta: { summary: 'Health check' },
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
                    tags: ['auth'],
                    examples: [
                      {
                        input: {
                          email: 'user@example.com',
                          password: 'password',
                        },
                        output: { token: 'jwt-token' },
                      },
                    ],
                  },
                  inputs: [{ type: 'object' }],
                  output: { type: 'object' },
                },
              },
            },
            router: {},
          },
        },
        posts: {
          _def: {
            procedures: {
              list: {
                _def: {
                  type: 'query',
                  meta: { summary: 'List posts', tags: ['posts'] },
                  inputs: [],
                  output: { type: 'array' },
                },
              },
            },
            router: {
              comments: {
                _def: {
                  procedures: {
                    create: {
                      _def: {
                        type: 'mutation',
                        meta: {
                          summary: 'Create comment',
                          tags: ['comments'],
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
    },
  };

  const introspection = buildIntrospection(nestedRouter);
  console.log(
    'Nested Router Introspection:',
    JSON.stringify(introspection, null, 2)
  );
  return introspection;
}

// Example: Router with visibility and deprecated procedures
export function exampleVisibilityRouter() {
  const visibilityRouter = {
    _def: {
      procedures: {
        publicApi: {
          _def: {
            type: 'query',
            meta: {
              summary: 'Public API',
              visibility: 'public',
              tags: ['public'],
            },
            inputs: [],
            output: { type: 'object' },
          },
        },
        internalApi: {
          _def: {
            type: 'query',
            meta: {
              summary: 'Internal API',
              visibility: 'internal',
              tags: ['internal'],
            },
            inputs: [],
            output: { type: 'object' },
          },
        },
        hiddenApi: {
          _def: {
            type: 'query',
            meta: {
              summary: 'Hidden API',
              visibility: 'hidden',
              tags: ['hidden'],
            },
            inputs: [],
            output: { type: 'object' },
          },
        },
        deprecatedApi: {
          _def: {
            type: 'mutation',
            meta: {
              summary: 'Deprecated API',
              deprecated: true,
              tags: ['deprecated'],
            },
            inputs: [],
            output: { type: 'object' },
          },
        },
      },
      router: {},
    },
  };

  // Default behavior (includes internal and deprecated)
  const fullIntrospection = buildIntrospection(visibilityRouter);
  console.log('Full Introspection (includes internal/deprecated):');
  console.log(JSON.stringify(fullIntrospection, null, 2));

  // Filtered behavior (excludes internal and deprecated)
  const filteredIntrospection = buildIntrospection(visibilityRouter, {
    includeInternal: false,
    includeDeprecated: false,
  });
  console.log('Filtered Introspection (public only):');
  console.log(JSON.stringify(filteredIntrospection, null, 2));

  return { full: fullIntrospection, filtered: filteredIntrospection };
}

// Example: Router with SuperJSON transformer
export function exampleTransformerRouter() {
  const transformerRouter = {
    _def: {
      procedures: {
        getDate: {
          _def: {
            type: 'query',
            meta: { summary: 'Get current date' },
            inputs: [],
            output: { type: 'object' },
          },
        },
      },
      router: {},
      _config: {
        transformer: {
          serialize: (data: unknown) => data,
          deserialize: (data: unknown) => data,
        },
      },
    },
  };

  const introspection = buildIntrospection(transformerRouter);
  console.log('Transformer Router Introspection:');
  console.log(`Detected transformer: ${introspection.meta.transformer}`);
  console.log(JSON.stringify(introspection, null, 2));
  return introspection;
}

// Utility function to print router structure
export function printRouterStructure(introspection: RouterIntrospection) {
  console.log('\n=== Router Structure ===');
  console.log(`Generated at: ${introspection.meta.generatedAt}`);
  console.log(`tRPC Version: ${introspection.meta.trpcVersion || 'unknown'}`);
  console.log(`Transformer: ${introspection.meta.transformer || 'none'}`);
  console.log('\nRouters:');

  function printRouter(router: any, indent = 0) {
    const prefix = '  '.repeat(indent);
    console.log(`${prefix}📁 ${router.name}`);

    if (router.procedures.length > 0) {
      console.log(`${prefix}  Procedures:`);
      router.procedures.forEach((proc: any) => {
        const typeIcon = proc.type === 'query' ? '🔍' : '✏️';
        const deprecated = proc.meta?.deprecated ? ' (deprecated)' : '';
        const visibility = proc.meta?.visibility
          ? ` [${proc.meta.visibility}]`
          : '';
        console.log(
          `${prefix}    ${typeIcon} ${proc.name}${deprecated}${visibility}`
        );
        if (proc.meta?.summary) {
          console.log(`${prefix}      ${proc.meta.summary}`);
        }
      });
    }

    if (router.children.length > 0) {
      console.log(`${prefix}  Children:`);
      router.children.forEach((child: any) => printRouter(child, indent + 2));
    }
  }

  introspection.routers.forEach(router => printRouter(router));
}

// Run examples if this file is executed directly
if (require.main === module) {
  console.log('🔍 tRPC Studio - Router Introspection Examples\n');

  console.log('1. Simple Router:');
  const simple = exampleSimpleRouter();
  printRouterStructure(simple);

  console.log('\n2. Nested Router:');
  const nested = exampleNestedRouter();
  printRouterStructure(nested);

  console.log('\n3. Visibility Router:');
  const visibility = exampleVisibilityRouter();
  printRouterStructure(visibility.full);

  console.log('\n4. Transformer Router:');
  const transformer = exampleTransformerRouter();
  printRouterStructure(transformer);
}
