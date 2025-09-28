// tRPC-specific type definitions and utilities

/**
 * tRPC procedure types
 */
export type ProcedureType = 'query' | 'mutation' | 'subscription';

/**
 * tRPC router metadata that can be extracted during introspection
 */
export interface TrpcRouterMeta {
  version?: string;
  transformer?: string | null;
  middlewares?: string[];
}

/**
 * tRPC procedure metadata from .meta() calls
 */
export interface TrpcProcedureMeta {
  summary?: string;
  description?: string;
  tags?: string[];
  deprecated?: boolean;
  visibility?: import('./router').Visibility;
  authRequired?: boolean;
  examples?: Array<{
    input?: unknown;
    output?: unknown;
    description?: string;
  }>;
  // Additional metadata that might be present
  [key: string]: unknown;
}

/**
 * Raw tRPC procedure definition (before processing)
 */
export interface RawProcedureDefinition {
  type: ProcedureType;
  meta?: TrpcProcedureMeta;
  input?: unknown; // Raw Zod schema
  output?: unknown; // Raw Zod schema
}

/**
 * Raw tRPC router definition (before processing)
 */
export interface RawRouterDefinition {
  procedures: Record<string, RawProcedureDefinition>;
  routers: Record<string, RawRouterDefinition>;
  meta?: TrpcRouterMeta;
}

/**
 * tRPC version information
 */
export interface TrpcVersionInfo {
  major: number;
  minor: number;
  patch: number;
  version: string;
  isSupported: boolean;
}

/**
 * Supported tRPC versions
 */
export const SUPPORTED_TRPC_VERSIONS = {
  MIN_MAJOR: 10,
  MAX_MAJOR: 11,
} as const;

/**
 * Common tRPC transformers
 */
export const KNOWN_TRANSFORMERS = {
  SUPERJSON: 'superjson',
  DEVALUE: 'devalue',
} as const;

/**
 * Type guard for checking if a value is a valid procedure type
 */
export const isProcedureType = (value: unknown): value is ProcedureType => {
  return (
    typeof value === 'string' &&
    ['query', 'mutation', 'subscription'].includes(value)
  );
};

/**
 * Type guard for checking if a value looks like a tRPC router
 */
export const isRouterLike = (
  value: unknown
): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null;
};

/**
 * Utility for extracting tRPC version from package info
 */
export const parseTrpcVersion = (version: string): TrpcVersionInfo => {
  const match = version.match(/^(\d+)\.(\d+)\.(\d+)/);
  if (!match) {
    return {
      major: 0,
      minor: 0,
      patch: 0,
      version,
      isSupported: false,
    };
  }

  const [, majorStr, minorStr, patchStr] = match;
  const major = parseInt(majorStr, 10);
  const minor = parseInt(minorStr, 10);
  const patch = parseInt(patchStr, 10);

  const isSupported =
    major >= SUPPORTED_TRPC_VERSIONS.MIN_MAJOR &&
    major <= SUPPORTED_TRPC_VERSIONS.MAX_MAJOR;

  return {
    major,
    minor,
    patch,
    version,
    isSupported,
  };
};
