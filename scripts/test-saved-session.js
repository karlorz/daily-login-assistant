#!/usr/bin/env node

/**
 * Quick test script to verify saved session
 */

import { UserGuidedLoginService } from '../dist/infrastructure/browser/user-guided-login.service.js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.development' });

const ANYROUTER_URL = process.env.ANYROUTER_URL || 'https://anyrouter.top/login';
const PROFILE_ID = process.env.USER_PROFILE_ID || 'anyrouter-main';

async function testSession() {
  const service = new UserGuidedLoginService();

  console.log('🧪 Testing saved anyrouter.top session...');
  console.log(`🎯 Profile: ${PROFILE_ID}`);
  console.log(`🌐 Will test: https://anyrouter.top/console`);
  console.log('');

  try {
    // Test the saved session
    const isValid = await service.testSavedSession(ANYROUTER_URL, PROFILE_ID);

    if (isValid) {
      console.log('✅ Session is valid! Testing daily check-in...');

      // Try daily check-in
      const checkinResult = await service.performDailyCheckin(
        ANYROUTER_URL,
        PROFILE_ID
      );

      if (checkinResult) {
        console.log('🎉 Daily check-in completed successfully!');
      } else {
        console.log('ℹ️  Daily check-in completed (no specific check-in button found)');
      }
    } else {
      console.log('❌ Session expired or invalid');
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  } finally {
    await service.cleanup();
  }
}

testSession();