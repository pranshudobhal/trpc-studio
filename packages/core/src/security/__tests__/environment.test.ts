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
import type { StudioOptions } from '../../types/security';

describe('Environment Detection', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    // Reset environment before each test
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    // Restore original environment
    process.env = originalEnv;
  });

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

    it('should handle multiple errors', () => {
      process.env.NODE_ENV = 'production';
      delete process.env.TRPC_STUDIO_ENABLED;
      delete process.env.TRPC_STUDIO_TOKEN;

      const options: StudioOptions = { router: {} };
      const result = validateStudioConfiguration(options);

      expect(result.canEnable).toBe(false);
      expect(result.errors).toHaveLength(1); // Only the env flag error since studio is disabled
    });
  });
});
