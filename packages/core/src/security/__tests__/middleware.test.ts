import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  createSecurityContext,
  validateRequestMethod,
  validateSecurity,
  validateUIAccess,
  validateIntrospectionAccess,
} from '../middleware';
import type { RequestContext, StudioOptions } from '../../types/security';

describe('Security Middleware', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
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
