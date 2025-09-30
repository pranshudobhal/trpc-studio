// Shared utility types for framework adapters

/**
 * HTTP methods supported by studio endpoints
 */
export type HttpMethod =
  | 'GET'
  | 'POST'
  | 'PUT'
  | 'DELETE'
  | 'PATCH'
  | 'HEAD'
  | 'OPTIONS';

/**
 * HTTP status codes used by studio
 */
export const HTTP_STATUS = {
  OK: 200,
  NOT_FOUND: 404,
  FORBIDDEN: 403,
  METHOD_NOT_ALLOWED: 405,
  INTERNAL_SERVER_ERROR: 500,
} as const;

export type HttpStatus = (typeof HTTP_STATUS)[keyof typeof HTTP_STATUS];

/**
 * Standard HTTP headers used by studio
 */
export const STUDIO_HEADERS = {
  AUTHORIZATION: 'authorization',
  STUDIO_TOKEN: 'x-trpc-studio-token',
  CONTENT_TYPE: 'content-type',
  CACHE_CONTROL: 'cache-control',
} as const;

/**
 * Environment variables used by studio
 */
export const ENV_VARS = {
  STUDIO_ENABLED: 'TRPC_STUDIO_ENABLED',
  STUDIO_TOKEN: 'TRPC_STUDIO_TOKEN',
  NODE_ENV: 'NODE_ENV',
} as const;

/**
 * Default configuration values
 */
export const DEFAULTS = {
  TRPC_ENDPOINT: '/api/trpc',
  STUDIO_PATH: '/trpc-studio',
  INTROSPECTION_PATH: '/__trpc-studio__/introspection',
} as const;

/**
 * Generic response type for adapter handlers
 */
export interface StudioResponse<T = unknown> {
  status: HttpStatus;
  headers?: Record<string, string>;
  body?: T;
}

/**
 * Error response structure
 */
export interface StudioError {
  error: string;
  message: string;
  statusCode: HttpStatus;
}

/**
 * Success response for introspection endpoint
 */
export interface IntrospectionResponse {
  success: true;
  data: import('./router').RouterIntrospection;
}

/**
 * Type guard utilities
 */
export const isStudioError = (value: unknown): value is StudioError => {
  return (
    typeof value === 'object' &&
    value !== null &&
    'error' in value &&
    'message' in value &&
    'statusCode' in value
  );
};

/**
 * Utility type for making properties required
 */
export type RequiredKeys<T, K extends keyof T> = T & Required<Pick<T, K>>;

/**
 * Utility type for framework-specific request objects
 */
export interface GenericRequest {
  method: string;
  url: string;
  headers: Record<string, string | string[] | undefined>;
}

/**
 * Utility type for framework-specific response objects
 */
export interface GenericResponse {
  status(code: number): GenericResponse;
  json(data: unknown): GenericResponse;
  send(data: unknown): GenericResponse;
  setHeader(name: string, value: string): GenericResponse;
}
