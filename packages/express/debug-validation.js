// Debug script to test validation logic
process.env.NODE_ENV = 'production';
process.env.TRPC_STUDIO_ENABLED = 'true';
delete process.env.TRPC_STUDIO_TOKEN;

// Mock the core functions
const mockOptions = {
  router: {},
  enabled: undefined,
  token: undefined,
  getToken: undefined,
};

console.log('Environment:', {
  NODE_ENV: process.env.NODE_ENV,
  TRPC_STUDIO_ENABLED: process.env.TRPC_STUDIO_ENABLED,
  TRPC_STUDIO_TOKEN: process.env.TRPC_STUDIO_TOKEN,
});

console.log('Options:', mockOptions);

// Try to import the validation functions
try {
  const core = require('../core/src/security/environment');

  console.log('Environment info:', core.getEnvironmentInfo(mockOptions));
  console.log('Should enable studio:', core.shouldEnableStudio(mockOptions));
  console.log('Effective token:', core.getEffectiveToken(mockOptions));
  console.log(
    'Validation result:',
    core.validateStudioConfiguration(mockOptions)
  );
} catch (error) {
  console.error('Error importing core functions:', error);
}
