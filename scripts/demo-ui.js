/**
 * Playwright Demo Script
 * Opens the cookie upload UI for demonstration
 */

import { chromium } from 'playwright';

async function main() {
  console.log('🚀 Launching browser...');

  const browser = await chromium.launch({
    headless: false,  // Show the browser
    slowMo: 500,      // Slow down for demonstration
  });

  const context = await browser.newContext({
    viewport: { width: 1400, height: 900 }
  });

  const page = await context.newPage();

  console.log('📱 Opening Cookie Upload UI...');
  await page.goto('http://localhost:3001/');

  console.log('✅ UI loaded! You can now:');
  console.log('   1. See the cookie export instructions');
  console.log('   2. Install EditThisCookie extension');
  console.log('   3. Login to anyrouter.top');
  console.log('   4. Export and upload cookies');
  console.log('');
  console.log('⏰ Browser will stay open for 5 minutes for testing...');
  console.log('   Press Ctrl+C to close earlier');

  // Keep browser open for testing
  await page.waitForTimeout(300000); // 5 minutes

  await browser.close();
  console.log('👋 Demo complete!');
}

main().catch(console.error);
