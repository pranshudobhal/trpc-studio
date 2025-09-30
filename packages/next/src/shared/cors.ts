import type { NextRequest } from 'next/server';
import type { CorsOptions } from './config';

/**
 * Check if an origin is allowed by the CORS configuration
 */
function isOriginAllowed(
  origin: string,
  corsOrigin: CorsOptions['origin']
): boolean {
  if (corsOrigin === false) {
    return false;
  }

  if (corsOrigin === true) {
    return true;
  }

  if (typeof corsOrigin === 'string') {
    return origin === corsOrigin;
  }

  if (Array.isArray(corsOrigin)) {
    return corsOrigin.includes(origin);
  }

  if (typeof corsOrigin === 'function') {
    return corsOrigin(origin);
  }

  return false;
}

/**
 * Get CORS headers for a request
 */
export function getCorsHeaders(
  request: NextRequest,
  corsOptions: CorsOptions
): Record<string, string> {
  const headers: Record<string, string> = {};
  const origin = request.headers.get('Origin');

  // If no origin header, don't set CORS headers
  if (!origin) {
    return headers;
  }

  // Check if origin is allowed
  if (isOriginAllowed(origin, corsOptions.origin)) {
    headers['Access-Control-Allow-Origin'] = origin;
    headers['Vary'] = headers['Vary'] ? `${headers['Vary']}, Origin` : 'Origin';
  }

  // Set credentials
  if (corsOptions.credentials) {
    headers['Access-Control-Allow-Credentials'] = 'true';
  }

  return headers;
}

/**
 * Get CORS preflight headers for OPTIONS requests
 */
export function getCorsPreflight(
  request: NextRequest,
  corsOptions: CorsOptions
): Record<string, string> {
  const headers = getCorsHeaders(request, corsOptions);
  const origin = request.headers.get('Origin');

  // Only add preflight headers if origin is allowed
  if (!origin || !isOriginAllowed(origin, corsOptions.origin)) {
    return {};
  }

  // Set allowed methods
  if (corsOptions.methods && corsOptions.methods.length > 0) {
    headers['Access-Control-Allow-Methods'] = corsOptions.methods.join(', ');
  }

  // Set allowed headers
  if (corsOptions.allowedHeaders && corsOptions.allowedHeaders.length > 0) {
    headers['Access-Control-Allow-Headers'] =
      corsOptions.allowedHeaders.join(', ');
  }

  // Set max age
  if (corsOptions.maxAge) {
    headers['Access-Control-Max-Age'] = corsOptions.maxAge.toString();
  }

  return headers;
}

/**
 * Handle CORS preflight request
 */
export function handleCorsPreflight(
  request: NextRequest,
  corsOptions: CorsOptions
): Response {
  const headers = getCorsPreflight(request, corsOptions);
  const origin = request.headers.get('Origin');

  // If origin is not allowed, return without CORS headers
  if (!origin || !isOriginAllowed(origin, corsOptions.origin)) {
    return new Response(null, { status: 200 });
  }

  return new Response(null, {
    status: 200,
    headers,
  });
}
