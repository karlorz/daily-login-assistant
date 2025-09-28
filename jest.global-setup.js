// Global setup for Jest tests
export default async () => {
  console.log('🚀 Setting up Jest environment for browser automation tests...');

  // Set test environment variables
  process.env.NODE_ENV = 'test';

  // Force headless mode in tests unless explicitly overridden
  // Users can override with: HEADLESS=false bun test
  if (!process.env.HEADLESS) {
    process.env.HEADLESS = 'true';
  }

  process.env.LOG_LEVEL = 'error'; // Reduce log noise in tests

  console.log(`✅ Jest global setup complete (headless: ${process.env.HEADLESS})`);
};