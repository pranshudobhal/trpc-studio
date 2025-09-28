import type {
  SecurityContext,
  StudioOptions,
  RequestContext,
  TokenValidationResult,
} from '../types/security';
import {
  getEnvironmentInfo,
  shouldEnableStudio,
  getEffectiveToken,
  validateStudioConfiguration,
} from './environment';
import { validateRequestToken } from './token-validation';

/**
 * Security middleware result
 */
export interface SecurityResult {
  allowed: boolean;
  status: 200 | 403 | 404 | 405;
  error?: string;
  context?: SecurityContext;
}

/**
 * Creates a security context from request and options
 */
export function createSecurityContext(
  request: RequestContext,
  options: StudioOptions
): SecurityContext {
  return {
    environment: getEnvironmentInfo(options),
    request,
    options,
  };
}

/**
 * Validates that the request method is allowed (GET only for introspection)
 */
export function validateRequestMethod(
  method: string,
  isIntrospectionRoute: boolean
): boolean {
  if (isIntrospectionRoute) {
    // Introspection routes are GET-only
    return method.toUpperCase() === 'GET';
  }

  // UI routes allow GET for serving static assets
  return method.toUpperCase() === 'GET';
}

/**
 * Main security middleware that validates all security requirements
 */
export function validateSecurity(
  request: RequestContext,
  options: StudioOptions,
  isIntrospectionRoute: boolean = false,
  requestObject?: unknown
): SecurityResult {
  const context = createSecurityContext(request, options);

  // Check if method is allowed
  if (!validateRequestMethod(request.method, isIntrospectionRoute)) {
    return {
      allowed: false,
      status: 405,
      error: `Method ${request.method} not allowed`,
      context,
    };
  }

  // Check if studio should be enabled
  if (!shouldEnableStudio(options)) {
    return {
      allowed: false,
      status: 404,
      error: 'Studio not found',
      context,
    };
  }

  // Validate configuration
  const configValidation = validateStudioConfiguration(options);
  if (!configValidation.canEnable) {
    return {
      allowed: false,
      status: 404,
      error: 'Studio not available',
      context,
    };
  }

  // If token is required, validate it
  if (configValidation.requiresToken) {
    const effectiveToken = getEffectiveToken(options);
    const tokenValidation = validateRequestToken(
      request,
      { ...options, token: effectiveToken },
      requestObject
    );

    if (!tokenValidation.valid) {
      return {
        allowed: false,
        status: 403,
        error: tokenValidation.error || 'Authentication required',
        context,
      };
    }
  }

  return {
    allowed: true,
    status: 200,
    context,
  };
}

/**
 * Convenience function for UI route validation
 */
export function validateUIAccess(
  request: RequestContext,
  options: StudioOptions,
  requestObject?: unknown
): SecurityResult {
  return validateSecurity(request, options, false, requestObject);
}

/**
 * Convenience function for introspection route validation
 */
export function validateIntrospectionAccess(
  request: RequestContext,
  options: StudioOptions,
  requestObject?: unknown
): SecurityResult {
  return validateSecurity(request, options, true, requestObject);
}
