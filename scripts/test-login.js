#!/usr/bin/env node
import 'reflect-metadata';
import { container } from '../src/core/container.js';
import { LoginTask, TaskPriority } from '../src/core/entities/login-task.entity.js';
import { TYPES } from '../src/core/types.js';

async function testLogin() {
  console.log('🎭 Testing Playwright Login Flow...\n');

  try {
    // Get services
    const configService = container.get(TYPES.ConfigService);
    const loginService = container.get(TYPES.LoginService);

    // Load config
    await configService.loadConfig('./config/websites.yaml');

    // Get the practice login site config (much faster than herokuapp)
    const websiteConfig = await configService.getWebsiteConfig('practice-login');

    if (!websiteConfig) {
      console.error('❌ Practice login site configuration not found');
      return;
    }

    if (!websiteConfig.enabled) {
      console.error('❌ Practice login site is disabled in config');
      return;
    }

    console.log('📋 Configuration loaded:');
    console.log(`   Site: ${websiteConfig.name}`);
    console.log(`   URL: ${websiteConfig.url}`);
    console.log(`   Enabled: ${websiteConfig.enabled}\n`);

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
    console.log('   Browser will open in NON-HEADLESS mode for demonstration');
    console.log('   Site: Practice Test Automation (Fast & Reliable)\n');

    // Process the login
    const success = await loginService.processLoginTask(task);

    if (success) {
      console.log('✅ LOGIN SUCCESSFUL!');
      console.log('   Task Status:', task.status);
      console.log('   Attempt:', task.attempt);
    } else {
      console.log('❌ LOGIN FAILED');
      console.log('   Task Status:', task.status);
      console.log('   Error:', task.errorMessage);
      console.log('   Attempt:', task.attempt);
    }

    // Get metrics
    const metrics = loginService.getMetrics();
    console.log('\n📊 Metrics:');
    console.log('   Total Attempts:', metrics.totalAttempts);
    console.log('   Successful Logins:', metrics.successfulLogins);
    console.log('   Success Rate:', metrics.successRate + '%');

    console.log('\n🎯 To test other demo sites:');
    console.log('   1. Enable "expand-login" in config/websites.yaml');
    console.log('   2. Change task.websiteId to "expand-login"');
    console.log('   3. Or enable "demo-login" for the original (slower) site');

  } catch (error) {
    console.error('💥 Test failed:', error.message);
  }
}

// Run the test
testLogin().catch(console.error);