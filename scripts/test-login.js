#!/usr/bin/env node
import 'reflect-metadata';
import { container } from '../src/core/container.js';
import { LoginTask, TaskPriority } from '../src/core/entities/login-task.entity.js';
import { TYPES } from '../src/core/types.js';

async function testLogin() {
  console.log('🎭 Testing Playwright Login Flow...\n');

  try {
    // Override headless mode for interactive testing
    process.env.HEADLESS = 'false';

    // Get services
    const configService = container.get(TYPES.ConfigService);
    const loginService = container.get(TYPES.LoginService);

    // Load config
    await configService.loadConfig('./config/websites.yaml');

    // Get the practice login site config (much faster than herokuapp)
    const websiteConfig = await configService.getWebsiteConfig('practice-login');

    if (!websiteConfig) {
      console.error('❌ Practice login site configuration not found');
      console.log('\n💡 Make sure config/websites.yaml contains "practice-login" configuration');
      console.log('   Run: cp config/websites.example.yaml config/websites.yaml');
      return process.exit(1);
    }

    if (!websiteConfig.enabled) {
      console.error('❌ Practice login site is disabled in config');
      console.log('\n💡 Set enabled: true for "practice-login" in config/websites.yaml');
      return process.exit(1);
    }

    console.log('📋 Configuration loaded:');
    console.log(`   Site: ${websiteConfig.name}`);
    console.log(`   URL: ${websiteConfig.url}`);
    console.log(`   Enabled: ${websiteConfig.enabled}`);
    console.log(`   Headless: ${process.env.HEADLESS}\n`);

    // Create a test login task
    const task = new LoginTask(
      `test-${Date.now()}`,
      'test-user',
      'practice-login',
      TaskPriority.HIGH,
      new Date(),
      3
    );

    console.log('🚀 Starting login process...');
    console.log('   Username: student');
    console.log('   Password: Password123');
    console.log('   Browser: Visible for demonstration (HEADLESS=false)');
    console.log('   Site: Practice Test Automation (Fast & Reliable)');
    console.log('   ⏱️  Expected time: ~10-15 seconds\n');

    const startTime = Date.now();

    // Process the login
    const success = await loginService.processLoginTask(task);

    const duration = Date.now() - startTime;

    if (success) {
      console.log('✅ LOGIN SUCCESSFUL!');
      console.log(`   Duration: ${duration}ms`);
      console.log('   Task Status:', task.status);
      console.log('   Attempt:', task.attempt);
    } else {
      console.log('❌ LOGIN FAILED');
      console.log(`   Duration: ${duration}ms`);
      console.log('   Task Status:', task.status);
      console.log('   Error:', task.errorMessage);
      console.log('   Attempt:', task.attempt);
    }

    // Get metrics
    const metrics = loginService.getMetrics();
    console.log('\n📊 Session Metrics:');
    console.log('   Total Attempts:', metrics.totalAttempts);
    console.log('   Successful Logins:', metrics.successfulLogins);
    console.log('   Success Rate:', metrics.successRate + '%');

    console.log('\n🎯 Other available demo sites:');
    console.log('   1. Edit config/websites.yaml to enable other sites');
    console.log('   2. Change line 40: websiteId to test different configurations');
    console.log('   3. Available: "practice-login", "expand-login", "demo-login"');

    console.log('\n🔧 Testing modes:');
    console.log('   - Headless: HEADLESS=true node scripts/test-login.js');
    console.log('   - Headed: HEADLESS=false node scripts/test-login.js (default)');
    console.log('   - Jest tests: bun run test:headed (see all automation)');

    process.exit(success ? 0 : 1);

  } catch (error) {
    console.error('💥 Test failed:', error.message);
    console.error('\n🔍 Troubleshooting:');
    console.error('   1. Run: bunx playwright install chromium');
    console.error('   2. Check config/websites.yaml exists');
    console.error('   3. Verify dependencies: bun install');
    console.error('   4. Check network connectivity');
    process.exit(1);
  }
}

// Handle command line arguments
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  console.log(`
🎭 Daily Login Assistant - Manual Test Script

Usage: node scripts/test-login.js [options]

Options:
  --help, -h     Show this help message

Environment Variables:
  HEADLESS=true    Run browser in headless mode (invisible)
  HEADLESS=false   Run browser in headed mode (visible) - default

Examples:
  node scripts/test-login.js                    # Visible browser
  HEADLESS=true node scripts/test-login.js      # Headless mode
  HEADLESS=false node scripts/test-login.js     # Visible browser

This script demonstrates the complete login automation flow using the
Practice Test Automation demo site with visible browser interactions.

For automated testing, use: bun run test
For development debugging, use this script with visible browser.
`);
  process.exit(0);
}

// Run the test
testLogin().catch(console.error);