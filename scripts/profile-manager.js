#!/usr/bin/env node

/**
 * Multi-Profile Manager
 *
 * Unified system for managing multiple site + user combinations
 * Profile format: {site}-{user} (e.g., anyrouter-user1, discord-user2)
 */

import { UserGuidedLoginService } from '../dist/infrastructure/browser/user-guided-login.service.js';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.development' });

class ProfileManager {
  constructor() {
    this.service = new UserGuidedLoginService();
    this.profilesDir = path.join(process.cwd(), 'profiles', 'user-guided');
  }

  /**
   * Create a new profile for site + user combination
   */
  async setupProfile(site, user, loginUrl) {
    const profileId = this.getProfileId(site, user);

    console.log('🚀 Setting up new profile...');
    console.log(`🌐 Site: ${site}`);
    console.log(`👤 User: ${user}`);
    console.log(`🔗 URL: ${loginUrl}`);
    console.log(`📋 Profile ID: ${profileId}`);
    console.log('');

    try {
      const result = await this.service.openGuidedLoginSession(loginUrl, profileId);

      if (result.success) {
        // Save profile metadata
        await this.saveProfileMetadata(profileId, {
          site,
          user,
          loginUrl,
          setupDate: new Date().toISOString(),
          cookies: result.cookies?.length || 0
        });

        console.log('✅ Profile setup completed successfully!');
        return true;
      } else {
        console.log('❌ Profile setup failed:', result.message);
        return false;
      }
    } catch (error) {
      console.error('❌ Profile setup error:', error.message);
      return false;
    }
  }

  /**
   * Test a specific profile
   */
  async testProfile(site, user, loginUrl) {
    const profileId = this.getProfileId(site, user);

    console.log(`🧪 Testing profile: ${profileId}`);

    try {
      const isValid = await this.service.testSavedSession(loginUrl, profileId);

      if (isValid) {
        console.log(`✅ Profile ${profileId} is valid`);
        return true;
      } else {
        console.log(`❌ Profile ${profileId} is expired/invalid`);
        return false;
      }
    } catch (error) {
      console.error(`❌ Profile ${profileId} test failed:`, error.message);
      return false;
    }
  }

  /**
   * Run daily check-in for a specific profile
   */
  async runDailyCheckin(site, user, loginUrl) {
    const profileId = this.getProfileId(site, user);

    console.log(`🎯 Running daily check-in: ${profileId}`);

    try {
      const success = await this.service.performDailyCheckin(loginUrl, profileId);

      if (success) {
        console.log(`✅ Daily check-in completed: ${profileId}`);
        await this.updateLastCheckin(profileId);
        return true;
      } else {
        console.log(`❌ Daily check-in failed: ${profileId}`);
        return false;
      }
    } catch (error) {
      console.error(`❌ Daily check-in error for ${profileId}:`, error.message);
      return false;
    }
  }

  /**
   * List all profiles with their status
   */
  async listProfiles() {
    const profiles = await this.service.listSavedProfiles();

    console.log('📋 All Profiles:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    if (profiles.length === 0) {
      console.log('   (no profiles found)');
      return [];
    }

    const profileData = [];

    for (const profileId of profiles) {
      const metadata = await this.getProfileMetadata(profileId);
      const hasStorage = this.hasStorageState(profileId);

      console.log(`📁 ${profileId}`);
      if (metadata) {
        console.log(`   🌐 Site: ${metadata.site}`);
        console.log(`   👤 User: ${metadata.user}`);
        console.log(`   🔗 URL: ${metadata.loginUrl}`);
        console.log(`   📅 Setup: ${new Date(metadata.setupDate).toLocaleDateString()}`);
        console.log(`   🍪 Cookies: ${metadata.cookies}`);
        console.log(`   📊 Status: ${hasStorage ? '✅ Active' : '❌ Invalid'}`);
        if (metadata.lastCheckin) {
          console.log(`   🎯 Last Check-in: ${new Date(metadata.lastCheckin).toLocaleDateString()}`);
        }
      } else {
        console.log(`   📊 Status: ${hasStorage ? '✅ Active (no metadata)' : '❌ Invalid'}`);
      }
      console.log('');

      profileData.push({
        profileId,
        metadata,
        hasStorage
      });
    }

    return profileData;
  }

  /**
   * Run daily check-ins for all valid profiles
   */
  async runAllDailyCheckins() {
    const profiles = await this.listProfiles();
    const validProfiles = profiles.filter(p => p.hasStorage && p.metadata);

    console.log(`🎯 Running daily check-ins for ${validProfiles.length} profiles...`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    const results = [];

    for (const profile of validProfiles) {
      const { profileId, metadata } = profile;
      console.log(`\n🔄 Processing: ${profileId}`);

      try {
        const success = await this.runDailyCheckin(metadata.site, metadata.user, metadata.loginUrl);
        results.push({ profileId, success });

        // Small delay between profiles to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 2000));

      } catch (error) {
        console.error(`❌ Error processing ${profileId}:`, error.message);
        results.push({ profileId, success: false, error: error.message });
      }
    }

    // Summary
    console.log('\n📊 Daily Check-in Summary:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;

    console.log(`✅ Successful: ${successful}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`📈 Success Rate: ${Math.round((successful / results.length) * 100)}%`);

    return results;
  }

  /**
   * Clean up a specific profile
   */
  async cleanupProfile(site, user) {
    const profileId = this.getProfileId(site, user);
    const profilePath = path.join(this.profilesDir, profileId);

    console.log(`🗑️  Cleaning up profile: ${profileId}`);

    try {
      if (fs.existsSync(profilePath)) {
        fs.rmSync(profilePath, { recursive: true, force: true });
        console.log(`✅ Profile ${profileId} cleaned up successfully`);
        return true;
      } else {
        console.log(`ℹ️  Profile ${profileId} not found`);
        return false;
      }
    } catch (error) {
      console.error(`❌ Failed to cleanup ${profileId}:`, error.message);
      return false;
    }
  }

  // Utility methods
  getProfileId(site, user) {
    // Clean site name (remove protocol, www, special chars)
    const cleanSite = site
      .replace(/^https?:\/\//, '')
      .replace(/^www\./, '')
      .replace(/[^a-zA-Z0-9]/g, '');

    // Clean user name (remove special chars)
    const cleanUser = user.replace(/[^a-zA-Z0-9]/g, '');

    return `${cleanSite}-${cleanUser}`;
  }

  async saveProfileMetadata(profileId, metadata) {
    const profilePath = path.join(this.profilesDir, profileId);
    const metadataPath = path.join(profilePath, 'metadata.json');

    if (!fs.existsSync(profilePath)) {
      fs.mkdirSync(profilePath, { recursive: true });
    }

    fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));
  }

  async getProfileMetadata(profileId) {
    const metadataPath = path.join(this.profilesDir, profileId, 'metadata.json');

    try {
      if (fs.existsSync(metadataPath)) {
        return JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
      }
    } catch (error) {
      console.warn(`Warning: Could not read metadata for ${profileId}:`, error.message);
    }

    return null;
  }

  hasStorageState(profileId) {
    const storagePath = path.join(this.profilesDir, profileId, 'storage-state.json');
    return fs.existsSync(storagePath);
  }

  async updateLastCheckin(profileId) {
    const metadata = await this.getProfileMetadata(profileId);
    if (metadata) {
      metadata.lastCheckin = new Date().toISOString();
      await this.saveProfileMetadata(profileId, metadata);
    }
  }

  async cleanup() {
    await this.service.cleanup();
  }
}

// CLI Interface
async function main() {
  const args = process.argv.slice(2);
  const manager = new ProfileManager();

  try {
    const command = args[0];

    switch (command) {
      case 'setup':
        if (args.length < 4) {
          console.log('Usage: node profile-manager.js setup <site> <user> <login-url>');
          console.log('Example: node profile-manager.js setup anyrouter.top user1 https://anyrouter.top/login');
          break;
        }
        await manager.setupProfile(args[1], args[2], args[3]);
        break;

      case 'test':
        if (args.length < 4) {
          console.log('Usage: node profile-manager.js test <site> <user> <login-url>');
          break;
        }
        await manager.testProfile(args[1], args[2], args[3]);
        break;

      case 'checkin':
        if (args.length < 4) {
          console.log('Usage: node profile-manager.js checkin <site> <user> <login-url>');
          break;
        }
        await manager.runDailyCheckin(args[1], args[2], args[3]);
        break;

      case 'list':
        await manager.listProfiles();
        break;

      case 'checkin-all':
        await manager.runAllDailyCheckins();
        break;

      case 'cleanup':
        if (args.length < 3) {
          console.log('Usage: node profile-manager.js cleanup <site> <user>');
          break;
        }
        await manager.cleanupProfile(args[1], args[2]);
        break;

      case 'help':
      default:
        console.log(`
🚀 Multi-Profile Manager

Usage:
  node profile-manager.js <command> [options]

Commands:
  setup <site> <user> <url>    Setup new profile (opens browser for login)
  test <site> <user> <url>     Test existing profile session
  checkin <site> <user> <url>  Run daily check-in for profile
  list                         List all profiles with status
  checkin-all                  Run daily check-ins for all profiles
  cleanup <site> <user>        Remove specific profile
  help                         Show this help message

Examples:
  # Setup first anyrouter.top user
  node profile-manager.js setup anyrouter.top user1 https://anyrouter.top/login

  # Setup second anyrouter.top user
  node profile-manager.js setup anyrouter.top user2 https://anyrouter.top/login

  # Setup Discord user
  node profile-manager.js setup discord.com user1 https://discord.com/login

  # List all profiles
  node profile-manager.js list

  # Run daily check-ins for all profiles
  node profile-manager.js checkin-all

Profile Naming:
  - Profiles are named: {site}-{user}
  - anyrouter.top + user1 → anyrouter-user1
  - discord.com + user2 → discord-user2
  - Each profile maintains separate login sessions
`);
        break;
    }

  } catch (error) {
    console.error('❌ Command failed:', error.message);
  } finally {
    await manager.cleanup();
  }
}

// Export for use as module
export { ProfileManager };

// Run CLI if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}