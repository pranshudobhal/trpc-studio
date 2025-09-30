/**
 * Router introspection builder for tRPC Studio
 * Walks tRPC router trees and extracts procedure definitions with metadata
 */

import type {
  RouterIntrospection,
  RouterNode,
  ProcedureNode,
  ProcedureMeta,
} from '../types/router';
import type {
  TrpcProcedureMeta,
  RawRouterDefinition,
  RawProcedureDefinition,
  TrpcVersionInfo,
} from '../types/trpc';
import { parseTrpcVersion, KNOWN_TRANSFORMERS } from '../types/trpc';

/**
 * Options for building router introspection
 */
export interface BuildIntrospectionOptions {
  /**
   * Whether to include procedures marked as internal
   * @default true
   */
  includeInternal?: boolean;

  /**
   * Whether to include deprecated procedures
   * @default true
   */
  includeDeprecated?: boolean;

  /**
   * Custom transformer name to include in metadata
   */
  transformer?: string | null;

  /**
   * tRPC version override (auto-detected if not provided)
   */
  trpcVersion?: string;
}

/**
 * Build introspection data from a tRPC router
 */
export function buildIntrospection(
  router: unknown,
  options: BuildIntrospectionOptions = {}
): RouterIntrospection {
  const {
    includeInternal = true,
    includeDeprecated = true,
    transformer = null,
  } = options;

  // Extract router definition from tRPC router
  const routerDef = extractRouterDefinition(router);

  // Walk the router tree and build nodes
  const routers = walkRouterDefinition(routerDef, '', {
    includeInternal,
    includeDeprecated,
  });

  // Detect tRPC version
  const trpcVersion = options.trpcVersion || detectTrpcVersion();

  // Attempt to detect transformer if not provided
  const detectedTransformer = transformer || detectTransformer(router);

  return {
    routers,
    meta: {
      generatedAt: new Date().toISOString(),
      trpcVersion,
      transformer: detectedTransformer,
    },
  };
}

/**
 * Extract router definition from a tRPC router instance
 */
function extractRouterDefinition(router: unknown): RawRouterDefinition {
  if (!router || typeof router !== 'object') {
    throw new Error('Invalid router: expected object');
  }

  // tRPC routers have a _def property containing the definition
  const routerWithDef = router as { _def?: unknown };

  if (!routerWithDef._def || typeof routerWithDef._def !== 'object') {
    throw new Error('Invalid router: missing _def property');
  }

  const def = routerWithDef._def as {
    procedures?: Record<string, unknown>;
    queries?: Record<string, unknown>;
    mutations?: Record<string, unknown>;
    subscriptions?: Record<string, unknown>;
    router?: Record<string, unknown>;
    record?: Record<string, unknown>;
    _config?: { transformer?: unknown };
  };

  // Extract procedures and nested routers
  const procedures: Record<string, RawProcedureDefinition> = {};
  const routers: Record<string, RawRouterDefinition> = {};

  // Handle procedures - try multiple sources for different tRPC versions
  const procedureSources = [
    def.procedures, // Legacy format
    def.queries, // v11 queries
    def.mutations, // v11 mutations
    def.subscriptions, // v11 subscriptions
  ];

  procedureSources.forEach(source => {
    if (source && typeof source === 'object') {
      Object.entries(source).forEach(([name, proc]) => {
        const procedureDef = extractProcedureDefinition(proc);
        if (procedureDef) {
          procedures[name] = procedureDef;
        }
      });
    }
  });

  // Handle nested routers (router record pattern)
  if (def.router || def.record) {
    const routerRecord = def.router || def.record;

    if (routerRecord && typeof routerRecord === 'object') {
      Object.entries(routerRecord).forEach(([name, nestedRouter]) => {
        try {
          routers[name] = extractRouterDefinition(nestedRouter);
        } catch (error) {
          // Skip invalid nested routers
          console.warn(`Failed to extract nested router "${name}":`, error);
        }
      });
    }
  }

  const result = {
    procedures,
    routers,
    meta: {
      transformer: extractTransformerFromConfig(def._config),
    },
  };

  return result;
}

/**
 * Extract procedure definition from a tRPC procedure
 */
function extractProcedureDefinition(
  procedure: unknown
): RawProcedureDefinition | null {
  // tRPC procedures can be functions with _def property
  if (
    !procedure ||
    (typeof procedure !== 'object' && typeof procedure !== 'function')
  ) {
    return null;
  }

  const proc = procedure as {
    _def?: {
      type?: string;
      meta?: unknown;
      inputs?: unknown[];
      output?: unknown;
    };
  };

  if (!proc._def) {
    return null;
  }

  const { type, meta, inputs, output } = proc._def;

  // Determine procedure type
  let procedureType: 'query' | 'mutation' | 'subscription';
  if (type === 'query') {
    procedureType = 'query';
  } else if (type === 'mutation') {
    procedureType = 'mutation';
  } else if (type === 'subscription') {
    procedureType = 'subscription';
  } else {
    // Default to query if type is unclear
    procedureType = 'query';
  }

  // Extract input schema (usually the last input in the chain)
  const inputSchema =
    inputs && inputs.length > 0 ? inputs[inputs.length - 1] : undefined;

  return {
    type: procedureType,
    meta: extractProcedureMeta(meta),
    input: inputSchema,
    output,
  };
}

/**
 * Extract and normalize procedure metadata
 */
function extractProcedureMeta(meta: unknown): TrpcProcedureMeta | undefined {
  if (!meta || typeof meta !== 'object') {
    return undefined;
  }

  const rawMeta = meta as Record<string, unknown>;

  return {
    summary: typeof rawMeta.summary === 'string' ? rawMeta.summary : undefined,
    description:
      typeof rawMeta.description === 'string' ? rawMeta.description : undefined,
    tags: Array.isArray(rawMeta.tags)
      ? rawMeta.tags.filter((tag): tag is string => typeof tag === 'string')
      : undefined,
    deprecated:
      typeof rawMeta.deprecated === 'boolean' ? rawMeta.deprecated : undefined,
    visibility:
      typeof rawMeta.visibility === 'string'
        ? (rawMeta.visibility as 'public' | 'internal' | 'hidden')
        : undefined,
    authRequired:
      typeof rawMeta.authRequired === 'boolean'
        ? rawMeta.authRequired
        : undefined,
    examples: Array.isArray(rawMeta.examples) ? rawMeta.examples : undefined,
  };
}

/**
 * Walk router definition and build router nodes
 */
function walkRouterDefinition(
  routerDef: RawRouterDefinition,
  basePath: string,
  options: { includeInternal: boolean; includeDeprecated: boolean }
): RouterNode[] {
  const nodes: RouterNode[] = [];

  // Group procedures by router path (handles tRPC v11 flattened structure)
  const proceduresByRouter: Record<string, ProcedureNode[]> = {};
  const directProcedures: ProcedureNode[] = [];

  Object.entries(routerDef.procedures).forEach(([name, procDef]) => {
    // Skip subscriptions in v1 (out of scope)
    if (procDef.type === 'subscription') {
      return;
    }

    // Check visibility filters
    const visibility = procDef.meta?.visibility || 'public';

    // Always skip hidden procedures
    if (visibility === 'hidden') {
      return;
    }

    // Skip internal if not included
    if (visibility === 'internal' && !options.includeInternal) {
      return;
    }

    // Skip deprecated if not included
    if (procDef.meta?.deprecated && !options.includeDeprecated) {
      return;
    }

    // Check if this is a nested procedure (contains dots)
    const parts = name.split('.');
    if (parts.length > 1) {
      // This is a nested procedure like "users.list"
      const routerName = parts[0];
      const procedureName = parts.slice(1).join('.');

      if (!proceduresByRouter[routerName]) {
        proceduresByRouter[routerName] = [];
      }

      const procedureNode: ProcedureNode = {
        name: procedureName,
        type: procDef.type as 'query' | 'mutation',
        meta: procDef.meta ? convertProcedureMeta(procDef.meta) : undefined,
        input: undefined,
        output: undefined,
      };

      proceduresByRouter[routerName].push(procedureNode);
    } else {
      // This is a direct procedure on the root router
      const procedureNode: ProcedureNode = {
        name,
        type: procDef.type as 'query' | 'mutation',
        meta: procDef.meta ? convertProcedureMeta(procDef.meta) : undefined,
        input: undefined,
        output: undefined,
      };

      directProcedures.push(procedureNode);
    }
  });

  // Create child routers from grouped procedures
  const children: RouterNode[] = [];
  Object.entries(proceduresByRouter).forEach(([routerName, procedures]) => {
    const childRouter: RouterNode = {
      name: routerName,
      procedures,
      children: [], // TODO: Handle nested nested routers if needed
    };
    children.push(childRouter);
  });

  // Process explicitly defined nested routers (for compatibility with older tRPC versions)
  Object.entries(routerDef.routers).forEach(([name, nestedDef]) => {
    // Create a child router node for each nested router
    const childProcedures: ProcedureNode[] = [];

    // Process procedures in the nested router
    Object.entries(nestedDef.procedures).forEach(([procName, procDef]) => {
      // Skip subscriptions in v1 (out of scope)
      if (procDef.type === 'subscription') {
        return;
      }

      // Check visibility filters
      const visibility = procDef.meta?.visibility || 'public';

      // Always skip hidden procedures
      if (visibility === 'hidden') {
        return;
      }

      // Skip internal if not included
      if (visibility === 'internal' && !options.includeInternal) {
        return;
      }

      // Skip deprecated if not included
      if (procDef.meta?.deprecated && !options.includeDeprecated) {
        return;
      }

      // Convert to ProcedureNode (schema conversion will be handled separately)
      const procedureNode: ProcedureNode = {
        name: procName, // Use just the procedure name, not the full path
        type: procDef.type as 'query' | 'mutation',
        meta: procDef.meta ? convertProcedureMeta(procDef.meta) : undefined,
        // Note: input/output schemas will be converted by the schema converter
        input: undefined, // TODO: Convert in schema task
        output: undefined, // TODO: Convert in schema task
      };

      childProcedures.push(procedureNode);
    });

    // Recursively process nested routers within this router
    const grandChildren: RouterNode[] = [];
    Object.entries(nestedDef.routers).forEach(
      ([nestedName, nestedNestedDef]) => {
        const grandChildPath = `${name}.${nestedName}`;
        const grandChildNodes = walkRouterDefinition(
          nestedNestedDef,
          grandChildPath,
          options
        );
        grandChildren.push(...grandChildNodes);
      }
    );

    // Create the child router node (only if not already created from procedure grouping)
    if (!proceduresByRouter[name]) {
      // Include the router if it has procedures, nested routers, or nested router definitions
      const hasNestedDefinitions = Object.keys(nestedDef.routers).length > 0;
      if (
        childProcedures.length > 0 ||
        grandChildren.length > 0 ||
        hasNestedDefinitions
      ) {
        const childRouter: RouterNode = {
          name,
          procedures: childProcedures,
          children: grandChildren,
        };

        children.push(childRouter);
      }
    }
  });

  // Create the main router node
  if (directProcedures.length > 0 || children.length > 0) {
    const routerName = basePath || 'root';

    const routerNode = {
      name: routerName,
      procedures: directProcedures,
      children,
    };

    nodes.push(routerNode);
  }

  return nodes;
}

/**
 * Convert tRPC procedure meta to studio format
 */
function convertProcedureMeta(meta: TrpcProcedureMeta): ProcedureMeta {
  return {
    summary: meta.summary,
    description: meta.description,
    tags: meta.tags,
    deprecated: meta.deprecated,
    visibility: meta.visibility,
    authRequired: meta.authRequired,
    examples: meta.examples,
  };
}

/**
 * Detect tRPC version from the environment
 */
function detectTrpcVersion(): string | undefined {
  try {
    // Try to detect from package.json or runtime
    // This is a best-effort detection
    const trpcServer = require('@trpc/server/package.json');
    return trpcServer.version;
  } catch {
    // Fallback: try to detect from runtime features
    return undefined;
  }
}

/**
 * Attempt to detect transformer from router configuration
 */
function detectTransformer(router: unknown): string | null {
  try {
    const routerWithDef = router as {
      _def?: { _config?: { transformer?: unknown } };
    };
    const transformer = routerWithDef._def?._config?.transformer;

    if (transformer && typeof transformer === 'object') {
      // Check for known transformers
      const transformerObj = transformer as {
        serialize?: unknown;
        deserialize?: unknown;
      };

      // SuperJSON detection
      if (transformerObj.serialize && transformerObj.deserialize) {
        // This is a heuristic - in v11 we might not be able to detect reliably
        return KNOWN_TRANSFORMERS.SUPERJSON;
      }
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Extract transformer from router config
 */
function extractTransformerFromConfig(config: unknown): string | null {
  if (!config || typeof config !== 'object') {
    return null;
  }

  const configObj = config as { transformer?: unknown };
  const transformer = configObj.transformer;

  if (transformer && typeof transformer === 'object') {
    // Try to identify the transformer type
    const transformerObj = transformer as {
      serialize?: unknown;
      deserialize?: unknown;
    };

    if (transformerObj.serialize && transformerObj.deserialize) {
      return KNOWN_TRANSFORMERS.SUPERJSON;
    }
  }

  return null;
}

/**
 * Validate tRPC version compatibility
 */
export function validateTrpcVersion(version: string): TrpcVersionInfo {
  return parseTrpcVersion(version);
}

/**
 * Get supported tRPC version range
 */
export function getSupportedVersionRange(): string {
  return '>=10.0.0 <12.0.0';
}
