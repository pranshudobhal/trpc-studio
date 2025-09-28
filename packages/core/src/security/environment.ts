import type { EnvironmentInfo, StudioOptions } from '../types/security';

/**
 * Detects if the current environment is production
 */
export function isProductionEnvironment(): boolean {
  return process.env.NODE_ENV === 'production';
}

/**
 * Checks if studio is enabled via environment variable
 */
export function isStudioEnabledInEnv(): boolean {
  return process.env.TRPC_STUDIO_ENABLED === 'true';
}

/**
 * Gets token from environment variable
 */
export function getTokenFromEnv(): string | undefined {
  return process.env.TRPC_STUDIO_TOKEN;
}

/**
 * Gets comprehensive environment information
 */
export function getEnvironmentInfo(options?: StudioOptions): EnvironmentInfo {
  const isProduction = isProductionEnvironment();
  const studioEnabled = isStudioEnabledInEnv();
  const envToken = getTokenFromEnv();
  const hasToken = !!(envToken || options?.token);

  return {
    isProduction,
    nodeEnv: process.env.NODE_ENV || 'development',
    studioEnabled,
    hasToken,
  };
}

/**
 * Determines if studio should be enabled based on environment and options
 * In production: requires TRPC_STUDIO_ENABLED=true, options.enabled cannot override
 * In development: defaults to enabled unless explicitly disabled
 */
export function shouldEnableStudio(options: StudioOptions): boolean {
  const env = getEnvironmentInfo(options);

  if (env.isProduction) {
    // In production, must have env flag enabled regardless of options.enabled
    return env.studioEnabled;
  }

  // In development, default to enabled unless explicitly disabled
  return options.enabled !== false;
}

/**
 * Gets the effective token (environment takes precedence over options)
 */
export function getEffectiveToken(options: StudioOptions): string | undefined {
  return getTokenFromEnv() || options.token;
}

/**
 * Validates that studio can be enabled with current configuration
 */
export function validateStudioConfiguration(options: StudioOptions): {
  canEnable: boolean;
  requiresToken: boolean;
  errors: string[];
} {
  const env = getEnvironmentInfo(options);
  const errors: string[] = [];
  const effectiveToken = getEffectiveToken(options);

  let canEnable = shouldEnableStudio(options);
  const requiresToken = env.isProduction && canEnable;

  if (env.isProduction && !env.studioEnabled) {
    errors.push(
      'Studio is disabled in production. Set TRPC_STUDIO_ENABLED=true to enable.'
    );
    canEnable = false;
  }

  if (requiresToken && !effectiveToken) {
    errors.push(
      'Token is required in production. Set TRPC_STUDIO_TOKEN or provide options.token.'
    );
    canEnable = false;
  }

  return {
    canEnable,
    requiresToken,
    errors,
  };
}
