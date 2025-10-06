#!/usr/bin/env node

/**
 * User-Guided Login Test Script
 *
 * This script demonstrates the new flexible login flow:
 * 1. Opens a browser session for manual login
 * 2. Saves the session with persistent Chrome profile
 * 3. Tests automated daily check-in with saved session
 */

import { UserGuidedLoginService } from '../dist/infrastructure/browser/user-guided-login.service.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.development' });

const ANYROUTER_URL = process.env.ANYROUTER_URL || 'https://anyrouter.top/login';
const PROFILE_ID = process.env.USER_PROFILE_ID || 'anyrouter-main';

async function main() {
  const userGuidedService = new UserGuidedLoginService();

  console.log('🚀 Daily Login Assistant - User-Guided Login Demo');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`🎯 Target: ${ANYROUTER_URL}`);
  console.log(`👤 Profile: ${PROFILE_ID}`);
  console.log('');

  try {
    // Check if we have a saved profile
    const savedProfiles = await userGuidedService.listSavedProfiles();
    console.log(`📁 Found ${savedProfiles.length} saved profiles:`, savedProfiles);

    if (savedProfiles.includes(PROFILE_ID)) {
      console.log('✅ Found existing profile - testing session...');

      // Test if the saved session is still valid
      const isValid = await userGuidedService.testSavedSession(ANYROUTER_URL, PROFILE_ID);

      if (isValid) {
        console.log('🎉 Saved session is valid! Performing daily check-in...');

        // Perform automated daily check-in
        const checkinResult = await userGuidedService.performDailyCheckin(
          ANYROUTER_URL,
          PROFILE_ID
        );

        if (checkinResult) {
          console.log('✅ Daily check-in completed successfully!');
        } else {
          console.log('❌ Daily check-in failed');
        }
      } else {
        console.log('❌ Saved session expired - starting guided login...');
        await performGuidedLogin(userGuidedService);
      }
    } else {
      console.log('🆕 No saved profile found - starting guided login...');
      await performGuidedLogin(userGuidedService);
    }

  } catch (error) {
    console.error('❌ Script failed:', error);
  } finally {
    await userGuidedService.cleanup();
    console.log('🧹 Cleanup completed');
  }
}

async function performGuidedLogin(userGuidedService) {
  console.log('');
  console.log('🎯 Starting User-Guided Login Process');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  const result = await userGuidedService.openGuidedLoginSession(ANYROUTER_URL, PROFILE_ID);

  if (result.success) {
    console.log('🎉 Login session saved successfully!');
    console.log(`📁 Profile path: ${result.profilePath}`);
    console.log(`🍪 Cookies saved: ${result.cookies?.length || 0}`);

    // Test the newly saved session
    console.log('');
    console.log('🧪 Testing newly saved session...');
    const isValid = await userGuidedService.testSavedSession(ANYROUTER_URL, PROFILE_ID);

    if (isValid) {
      console.log('✅ Session test passed! You can now use automated daily check-in.');

      // Optionally perform immediate check-in
      console.log('');
      console.log('🎯 Performing test daily check-in...');
      const checkinResult = await userGuidedService.performDailyCheckin(
        ANYROUTER_URL,
        PROFILE_ID
      );

      if (checkinResult) {
        console.log('✅ Test daily check-in completed!');
      }
    } else {
      console.log('❌ Session test failed - please try the guided login again');
    }
  } else {
    console.log('❌ Guided login failed:', result.message);
  }
}

// Handle script arguments
const args = process.argv.slice(2);
if (args.includes('--help') || args.includes('-h')) {
  console.log(`
🚀 User-Guided Login Test Script

Usage:
  node scripts/test-user-guided-login.js [options]

Environment Variables:
  ANYROUTER_URL     Target website URL (default: https://anyrouter.top/login)
  USER_PROFILE_ID   Profile identifier (default: anyrouter-main)
  HEADLESS          Run in headless mode for testing (default: false for guided login)

Examples:
  # Basic usage
  node scripts/test-user-guided-login.js

  # With custom profile
  USER_PROFILE_ID=my-profile node scripts/test-user-guided-login.js

  # Test existing session only
  HEADLESS=true node scripts/test-user-guided-login.js

Features:
  ✅ User-guided manual login (OAuth, email, any method)
  ✅ Persistent Chrome profile storage
  ✅ Automatic session validation
  ✅ Daily check-in automation
  ✅ Cookie-based session persistence
  ✅ Support for any authentication method
`);
  process.exit(0);
}

// Run the script
main().catch(console.error);