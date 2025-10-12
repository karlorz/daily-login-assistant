// Global setup for Jest tests
export default async () => {
  console.log('🚀 Setting up Jest environment for browser automation tests...');

  // Set test environment variables
  process.env.NODE_ENV = 'test';

  // Detect CI environment
  const isCI = process.env.CI === 'true';

  // Force headless mode in tests unless explicitly overridden
  // Users can override with: HEADLESS=false bun test
  if (!process.env.HEADLESS) {
    process.env.HEADLESS = 'true';
  }

  // Set CI-friendly log level
  process.env.LOG_LEVEL = isCI ? 'error' : 'error'; // Reduce log noise in tests

  // Set CI timeout multiplier if not already set
  if (isCI && !process.env.CI_TIMEOUT_MULTIPLIER) {
    process.env.CI_TIMEOUT_MULTIPLIER = '3';
  }

  console.log(`✅ Jest global setup complete (headless: ${process.env.HEADLESS}, CI: ${isCI}, timeout multiplier: ${process.env.CI_TIMEOUT_MULTIPLIER || 1})`);
};