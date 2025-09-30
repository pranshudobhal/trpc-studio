/**
 * Consolidated security tests for environment detection, middleware, and token validation
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  isProductionEnvironment,
  isStudioEnabledInEnv,
  getTokenFromEnv,
  getEnvironmentInfo,
  shouldEnableStudio,
  getEffectiveToken,
  validateStudioConfiguration,
} from '../environment';
import {
  createSecurityContext,
  validateRequestMethod,
  validateSecurity,
  validateUIAccess,
  validateIntrospectionAccess,
} from '../middleware';
import {
  extractBearerToken,
  extractStudioToken,
  extractToken,
  validateToken,
  validateRequestToken,
} from '../token-validation';
import type { RequestContext, StudioOptions } from '../../types/security';

describe('Security', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    // Reset environment before each test
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    // Restore original environment
    process.env = originalEnv;
  });

  const mockRequest: RequestContext = {
    headers: {},
    method: 'GET',
    url: '/test',
  };

  const mockOptions: StudioOptions = {
    router: {},
  };

  describe('Environment Detection', () => {
    describe('isProductionEnvironment', () => {
      it('should detect production environment', () => {
        process.env.NODE_ENV = 'production';
        expect(isProductionEnvironment()).toBe(true);
      });

      it('should detect non-production environment', () => {
        process.env.NODE_ENV = 'development';
        expect(isProductionEnvironment()).toBe(false);

        process.env.NODE_ENV = 'test';
        expect(isProductionEnvironment()).toBe(false);

        delete process.env.NODE_ENV;
        expect(isProductionEnvironment()).toBe(false);
      });
    });

    describe('isStudioEnabledInEnv', () => {
      it('should detect when studio is enabled', () => {
        process.env.TRPC_STUDIO_ENABLED = 'true';
        expect(isStudioEnabledInEnv()).toBe(true);
      });

      it('should detect when studio is not enabled', () => {
        process.env.TRPC_STUDIO_ENABLED = 'false';
        expect(isStudioEnabledInEnv()).toBe(false);

        delete process.env.TRPC_STUDIO_ENABLED;
        expect(isStudioEnabledInEnv()).toBe(false);

        process.env.TRPC_STUDIO_ENABLED = '1';
        expect(isStudioEnabledInEnv()).toBe(false);
      });
    });

    describe('getTokenFromEnv', () => {
      it('should get token from environment', () => {
        process.env.TRPC_STUDIO_TOKEN = 'env-token';
        expect(getTokenFromEnv()).toBe('env-token');
      });

      it('should return undefined when no token in environment', () => {
        delete process.env.TRPC_STUDIO_TOKEN;
        expect(getTokenFromEnv()).toBeUndefined();
      });
    });

    describe('getEnvironmentInfo', () => {
      it('should return complete environment info in production', () => {
        process.env.NODE_ENV = 'production';
        process.env.TRPC_STUDIO_ENABLED = 'true';
        process.env.TRPC_STUDIO_TOKEN = 'env-token';

        const options: StudioOptions = { router: {} };
        const info = getEnvironmentInfo(options);

        expect(info).toEqual({
          isProduction: true,
          nodeEnv: 'production',
          studioEnabled: true,
          hasToken: true,
        });
      });

      it('should return complete environment info in development', () => {
        process.env.NODE_ENV = 'development';
        delete process.env.TRPC_STUDIO_ENABLED;
        delete process.env.TRPC_STUDIO_TOKEN;

        const options: StudioOptions = { router: {}, token: 'options-token' };
        const info = getEnvironmentInfo(options);

        expect(info).toEqual({
          isProduction: false,
          nodeEnv: 'development',
          studioEnabled: false,
          hasToken: true,
        });
      });

      it('should handle missing NODE_ENV', () => {
        delete process.env.NODE_ENV;
        const info = getEnvironmentInfo();

        expect(info.nodeEnv).toBe('development');
        expect(info.isProduction).toBe(false);
      });
    });

    describe('shouldEnableStudio', () => {
      it('should require env flag in production', () => {
        process.env.NODE_ENV = 'production';
        process.env.TRPC_STUDIO_ENABLED = 'true';

        const options: StudioOptions = { router: {}, enabled: true };
        expect(shouldEnableStudio(options)).toBe(true);
      });

      it('should not enable in production without env flag', () => {
        process.env.NODE_ENV = 'production';
        delete process.env.TRPC_STUDIO_ENABLED;

        const options: StudioOptions = { router: {}, enabled: true };
        expect(shouldEnableStudio(options)).toBe(false);
      });

      it('should enable by default in development', () => {
        process.env.NODE_ENV = 'development';

        const options: StudioOptions = { router: {} };
        expect(shouldEnableStudio(options)).toBe(true);
      });

      it('should respect explicit disable in development', () => {
        process.env.NODE_ENV = 'development';

        const options: StudioOptions = { router: {}, enabled: false };
        expect(shouldEnableStudio(options)).toBe(false);
      });
    });

    describe('getEffectiveToken', () => {
      it('should prioritize environment token', () => {
        process.env.TRPC_STUDIO_TOKEN = 'env-token';

        const options: StudioOptions = { router: {}, token: 'options-token' };
        expect(getEffectiveToken(options)).toBe('env-token');
      });

      it('should fall back to options token', () => {
        delete process.env.TRPC_STUDIO_TOKEN;

        const options: StudioOptions = { router: {}, token: 'options-token' };
        expect(getEffectiveToken(options)).toBe('options-token');
      });

      it('should return undefined when no token available', () => {
        delete process.env.TRPC_STUDIO_TOKEN;

        const options: StudioOptions = { router: {} };
        expect(getEffectiveToken(options)).toBeUndefined();
      });
    });

    describe('validateStudioConfiguration', () => {
      it('should validate correct production configuration', () => {
        process.env.NODE_ENV = 'production';
        process.env.TRPC_STUDIO_ENABLED = 'true';
        process.env.TRPC_STUDIO_TOKEN = 'env-token';

        const options: StudioOptions = { router: {} };
        const result = validateStudioConfiguration(options);

        expect(result.canEnable).toBe(true);
        expect(result.requiresToken).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should reject production without env flag', () => {
        process.env.NODE_ENV = 'production';
        delete process.env.TRPC_STUDIO_ENABLED;

        const options: StudioOptions = { router: {}, token: 'token' };
        const result = validateStudioConfiguration(options);

        expect(result.canEnable).toBe(false);
        expect(result.requiresToken).toBe(false);
        expect(result.errors).toContain(
          'Studio is disabled in production. Set TRPC_STUDIO_ENABLED=true to enable.'
        );
      });

      it('should reject production without token', () => {
        process.env.NODE_ENV = 'production';
        process.env.TRPC_STUDIO_ENABLED = 'true';
        delete process.env.TRPC_STUDIO_TOKEN;

        const options: StudioOptions = { router: {} };
        const result = validateStudioConfiguration(options);

        expect(result.canEnable).toBe(false);
        expect(result.requiresToken).toBe(true);
        expect(result.errors).toContain(
          'Token is required in production. Set TRPC_STUDIO_TOKEN or provide options.token.'
        );
      });

      it('should validate development configuration', () => {
        process.env.NODE_ENV = 'development';

        const options: StudioOptions = { router: {} };
        const result = validateStudioConfiguration(options);

        expect(result.canEnable).toBe(true);
        expect(result.requiresToken).toBe(false);
        expect(result.errors).toHaveLength(0);
      });
    });
  });

  describe('Security Middleware', () => {
    describe('createSecurityContext', () => {
      it('should create security context with environment info', () => {
        process.env.NODE_ENV = 'development';

        const context = createSecurityContext(mockRequest, mockOptions);

        expect(context.request).toBe(mockRequest);
        expect(context.options).toBe(mockOptions);
        expect(context.environment.isProduction).toBe(false);
        expect(context.environment.nodeEnv).toBe('development');
      });
    });

    describe('validateRequestMethod', () => {
      it('should allow GET for UI routes', () => {
        expect(validateRequestMethod('GET', false)).toBe(true);
      });

      it('should allow GET for introspection routes', () => {
        expect(validateRequestMethod('GET', true)).toBe(true);
      });

      it('should reject non-GET for introspection routes', () => {
        expect(validateRequestMethod('POST', true)).toBe(false);
        expect(validateRequestMethod('PUT', true)).toBe(false);
        expect(validateRequestMethod('DELETE', true)).toBe(false);
      });

      it('should reject non-GET for UI routes', () => {
        expect(validateRequestMethod('POST', false)).toBe(false);
        expect(validateRequestMethod('PUT', false)).toBe(false);
        expect(validateRequestMethod('DELETE', false)).toBe(false);
      });

      it('should be case insensitive', () => {
        expect(validateRequestMethod('get', true)).toBe(true);
        expect(validateRequestMethod('Get', false)).toBe(true);
        expect(validateRequestMethod('post', true)).toBe(false);
      });
    });

    describe('validateSecurity', () => {
      it('should reject invalid HTTP methods', () => {
        const request: RequestContext = { ...mockRequest, method: 'POST' };
        const result = validateSecurity(request, mockOptions, true);

        expect(result.allowed).toBe(false);
        expect(result.status).toBe(405);
        expect(result.error).toBe('Method POST not allowed');
      });

      it('should allow access in development without token', () => {
        process.env.NODE_ENV = 'development';

        const result = validateSecurity(mockRequest, mockOptions);

        expect(result.allowed).toBe(true);
        expect(result.status).toBe(200);
      });

      it('should reject when studio is disabled in production', () => {
        process.env.NODE_ENV = 'production';
        delete process.env.TRPC_STUDIO_ENABLED;

        const result = validateSecurity(mockRequest, mockOptions);

        expect(result.allowed).toBe(false);
        expect(result.status).toBe(404);
        expect(result.error).toBe('Studio not found');
      });

      it('should reject when enabled in production but no token provided', () => {
        process.env.NODE_ENV = 'production';
        process.env.TRPC_STUDIO_ENABLED = 'true';
        delete process.env.TRPC_STUDIO_TOKEN;

        const options: StudioOptions = { router: {} };
        const result = validateSecurity(mockRequest, options);

        expect(result.allowed).toBe(false);
        expect(result.status).toBe(404);
        expect(result.error).toBe('Studio not available');
      });

      it('should reject invalid token in production', () => {
        process.env.NODE_ENV = 'production';
        process.env.TRPC_STUDIO_ENABLED = 'true';
        process.env.TRPC_STUDIO_TOKEN = 'correct-token';

        const request: RequestContext = {
          ...mockRequest,
          headers: { authorization: 'Bearer wrong-token' },
        };
        const result = validateSecurity(request, mockOptions);

        expect(result.allowed).toBe(false);
        expect(result.status).toBe(403);
        expect(result.error).toBe('Invalid token');
      });

      it('should allow valid token in production', () => {
        process.env.NODE_ENV = 'production';
        process.env.TRPC_STUDIO_ENABLED = 'true';
        process.env.TRPC_STUDIO_TOKEN = 'correct-token';

        const request: RequestContext = {
          ...mockRequest,
          headers: { authorization: 'Bearer correct-token' },
        };
        const result = validateSecurity(request, mockOptions);

        expect(result.allowed).toBe(true);
        expect(result.status).toBe(200);
      });

      it('should use options token when env token not available', () => {
        process.env.NODE_ENV = 'production';
        process.env.TRPC_STUDIO_ENABLED = 'true';
        delete process.env.TRPC_STUDIO_TOKEN;

        const options: StudioOptions = { router: {}, token: 'options-token' };
        const request: RequestContext = {
          ...mockRequest,
          headers: { authorization: 'Bearer options-token' },
        };
        const result = validateSecurity(request, options);

        expect(result.allowed).toBe(true);
        expect(result.status).toBe(200);
      });

      it('should use custom token extraction', () => {
        process.env.NODE_ENV = 'production';
        process.env.TRPC_STUDIO_ENABLED = 'true';
        process.env.TRPC_STUDIO_TOKEN = 'correct-token';

        const options: StudioOptions = {
          router: {},
          getToken: () => 'correct-token',
        };
        const requestObject = {};
        const result = validateSecurity(
          mockRequest,
          options,
          false,
          requestObject
        );

        expect(result.allowed).toBe(true);
        expect(result.status).toBe(200);
      });

      it('should respect explicit disable in development', () => {
        process.env.NODE_ENV = 'development';

        const options: StudioOptions = { router: {}, enabled: false };
        const result = validateSecurity(mockRequest, options);

        expect(result.allowed).toBe(false);
        expect(result.status).toBe(404);
      });
    });

    describe('validateUIAccess', () => {
      it('should validate UI access correctly', () => {
        process.env.NODE_ENV = 'development';

        const result = validateUIAccess(mockRequest, mockOptions);

        expect(result.allowed).toBe(true);
        expect(result.status).toBe(200);
      });

      it('should reject POST requests to UI', () => {
        const request: RequestContext = { ...mockRequest, method: 'POST' };
        const result = validateUIAccess(request, mockOptions);

        expect(result.allowed).toBe(false);
        expect(result.status).toBe(405);
      });
    });

    describe('validateIntrospectionAccess', () => {
      it('should validate introspection access correctly', () => {
        process.env.NODE_ENV = 'development';

        const result = validateIntrospectionAccess(mockRequest, mockOptions);

        expect(result.allowed).toBe(true);
        expect(result.status).toBe(200);
      });

      it('should reject POST requests to introspection', () => {
        const request: RequestContext = { ...mockRequest, method: 'POST' };
        const result = validateIntrospectionAccess(request, mockOptions);

        expect(result.allowed).toBe(false);
        expect(result.status).toBe(405);
      });
    });

    describe('Integration scenarios', () => {
      it('should handle complete production workflow', () => {
        process.env.NODE_ENV = 'production';
        process.env.TRPC_STUDIO_ENABLED = 'true';
        process.env.TRPC_STUDIO_TOKEN = 'prod-token';

        // Valid request
        const validRequest: RequestContext = {
          headers: { 'x-trpc-studio-token': 'prod-token' },
          method: 'GET',
          url: '/__trpc-studio__/introspection',
        };
        const validResult = validateIntrospectionAccess(
          validRequest,
          mockOptions
        );
        expect(validResult.allowed).toBe(true);
        expect(validResult.status).toBe(200);

        // Invalid method
        const invalidMethodRequest: RequestContext = {
          ...validRequest,
          method: 'POST',
        };
        const methodResult = validateIntrospectionAccess(
          invalidMethodRequest,
          mockOptions
        );
        expect(methodResult.allowed).toBe(false);
        expect(methodResult.status).toBe(405);

        // Invalid token
        const invalidTokenRequest: RequestContext = {
          ...validRequest,
          headers: { 'x-trpc-studio-token': 'wrong-token' },
        };
        const tokenResult = validateIntrospectionAccess(
          invalidTokenRequest,
          mockOptions
        );
        expect(tokenResult.allowed).toBe(false);
        expect(tokenResult.status).toBe(403);
      });

      it('should handle development workflow', () => {
        process.env.NODE_ENV = 'development';

        // No token required in development
        const request: RequestContext = {
          headers: {},
          method: 'GET',
          url: '/trpc-studio',
        };
        const result = validateUIAccess(request, mockOptions);
        expect(result.allowed).toBe(true);
        expect(result.status).toBe(200);
      });
    });
  });

  describe('Token Validation', () => {
    describe('extractBearerToken', () => {
      it('should extract token from valid Bearer header', () => {
        expect(extractBearerToken('Bearer abc123')).toBe('abc123');
        expect(extractBearerToken('bearer xyz789')).toBe('xyz789');
        expect(extractBearerToken('BEARER token-with-dashes')).toBe(
          'token-with-dashes'
        );
      });

      it('should handle array headers', () => {
        expect(extractBearerToken(['Bearer abc123'])).toBe('abc123');
        expect(extractBearerToken(['Bearer abc123', 'Bearer xyz789'])).toBe(
          'abc123'
        );
      });

      it('should return null for invalid headers', () => {
        expect(extractBearerToken(undefined)).toBeNull();
        expect(extractBearerToken('')).toBeNull();
        expect(extractBearerToken('Basic abc123')).toBeNull();
        expect(extractBearerToken('Bearer')).toBeNull();
        expect(extractBearerToken('Bearer ')).toBeNull();
        expect(extractBearerToken([])).toBeNull();
        expect(extractBearerToken([undefined])).toBeNull();
      });
    });

    describe('extractStudioToken', () => {
      it('should extract token from studio header', () => {
        expect(extractStudioToken('abc123')).toBe('abc123');
        expect(extractStudioToken('token-with-dashes')).toBe(
          'token-with-dashes'
        );
      });

      it('should handle array headers', () => {
        expect(extractStudioToken(['abc123'])).toBe('abc123');
        expect(extractStudioToken(['abc123', 'xyz789'])).toBe('abc123');
      });

      it('should return null for invalid headers', () => {
        expect(extractStudioToken(undefined)).toBeNull();
        expect(extractStudioToken('')).toBeNull();
        expect(extractStudioToken([])).toBeNull();
        expect(extractStudioToken([undefined])).toBeNull();
      });
    });

    describe('extractToken', () => {
      it('should prioritize custom token extraction', () => {
        const headers = {
          authorization: 'Bearer header-token',
          'x-trpc-studio-token': 'studio-token',
        };
        const getToken = () => 'custom-token';
        const request = {};

        const result = extractToken(headers, getToken, request);
        expect(result.token).toBe('custom-token');
        expect(result.source).toBe('custom');
      });

      it('should fall back to Authorization header when custom extraction fails', () => {
        const headers = {
          authorization: 'Bearer header-token',
          'x-trpc-studio-token': 'studio-token',
        };
        const getToken = () => {
          throw new Error('Custom extraction failed');
        };
        const request = {};

        const result = extractToken(headers, getToken, request);
        expect(result.token).toBe('header-token');
        expect(result.source).toBe('authorization');
      });

      it('should use Authorization Bearer token when available', () => {
        const headers = {
          authorization: 'Bearer auth-token',
          'x-trpc-studio-token': 'studio-token',
        };

        const result = extractToken(headers);
        expect(result.token).toBe('auth-token');
        expect(result.source).toBe('authorization');
      });

      it('should fall back to studio token when Authorization is not available', () => {
        const headers = {
          'x-trpc-studio-token': 'studio-token',
        };

        const result = extractToken(headers);
        expect(result.token).toBe('studio-token');
        expect(result.source).toBe('x-trpc-studio-token');
      });

      it('should return null when no tokens are available', () => {
        const headers = {};

        const result = extractToken(headers);
        expect(result.token).toBeNull();
        expect(result.source).toBe('authorization');
      });

      it('should ignore custom extraction when no request is provided', () => {
        const headers = {
          authorization: 'Bearer header-token',
        };
        const getToken = () => 'custom-token';

        const result = extractToken(headers, getToken);
        expect(result.token).toBe('header-token');
        expect(result.source).toBe('authorization');
      });
    });

    describe('validateToken', () => {
      it('should validate correct token', () => {
        const result = validateToken('correct-token', 'correct-token');
        expect(result.valid).toBe(true);
        expect(result.token).toBe('correct-token');
        expect(result.error).toBeUndefined();
      });

      it('should reject incorrect token', () => {
        const result = validateToken('wrong-token', 'correct-token');
        expect(result.valid).toBe(false);
        expect(result.error).toBe('Invalid token');
      });

      it('should reject missing token', () => {
        const result = validateToken(null, 'correct-token');
        expect(result.valid).toBe(false);
        expect(result.error).toBe('No token provided');
      });

      it('should reject when no expected token is configured', () => {
        const result = validateToken('some-token', undefined);
        expect(result.valid).toBe(false);
        expect(result.error).toBe('No token configured for validation');
      });
    });

    describe('validateRequestToken', () => {
      const mockContext: RequestContext = {
        headers: {},
        method: 'GET',
        url: '/test',
      };

      it('should validate token from Authorization header', () => {
        const context: RequestContext = {
          ...mockContext,
          headers: { authorization: 'Bearer test-token' },
        };
        const options: StudioOptions = {
          router: {},
          token: 'test-token',
        };

        const result = validateRequestToken(context, options);
        expect(result.valid).toBe(true);
        expect(result.token).toBe('test-token');
      });

      it('should validate token from studio header', () => {
        const context: RequestContext = {
          ...mockContext,
          headers: { 'x-trpc-studio-token': 'test-token' },
        };
        const options: StudioOptions = {
          router: {},
          token: 'test-token',
        };

        const result = validateRequestToken(context, options);
        expect(result.valid).toBe(true);
        expect(result.token).toBe('test-token');
      });

      it('should use custom token extraction', () => {
        const context: RequestContext = {
          ...mockContext,
          headers: {},
        };
        const options: StudioOptions = {
          router: {},
          token: 'test-token',
          getToken: () => 'test-token',
        };
        const request = {};

        const result = validateRequestToken(context, options, request);
        expect(result.valid).toBe(true);
        expect(result.token).toBe('test-token');
      });

      it('should reject invalid token', () => {
        const context: RequestContext = {
          ...mockContext,
          headers: { authorization: 'Bearer wrong-token' },
        };
        const options: StudioOptions = {
          router: {},
          token: 'correct-token',
        };

        const result = validateRequestToken(context, options);
        expect(result.valid).toBe(false);
        expect(result.error).toBe('Invalid token');
      });
    });
  });
});
