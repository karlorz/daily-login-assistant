#!/usr/bin/env node

/**
 * Profile Cleanup Script
 *
 * Helps clean up saved profiles when cookies become invalid
 */

import fs from 'fs';
import path from 'path';

const profilesDir = path.join(process.cwd(), 'profiles', 'user-guided');

function listProfiles() {
  if (!fs.existsSync(profilesDir)) {
    console.log('📁 No profiles directory found');
    return [];
  }

  const profiles = fs.readdirSync(profilesDir)
    .filter(dir => fs.statSync(path.join(profilesDir, dir)).isDirectory());

  return profiles;
}

function cleanupProfile(profileId) {
  const profilePath = path.join(profilesDir, profileId);

  if (!fs.existsSync(profilePath)) {
    console.log(`❌ Profile '${profileId}' not found`);
    return false;
  }

  try {
    // Remove storage state file
    const storageStatePath = path.join(profilePath, 'storage-state.json');
    if (fs.existsSync(storageStatePath)) {
      fs.unlinkSync(storageStatePath);
      console.log(`🗑️  Removed storage state: ${storageStatePath}`);
    }

    // Remove entire profile directory for fresh start
    fs.rmSync(profilePath, { recursive: true, force: true });
    console.log(`✅ Profile '${profileId}' cleaned up successfully`);
    return true;

  } catch (error) {
    console.error(`❌ Failed to cleanup profile '${profileId}':`, error.message);
    return false;
  }
}

function main() {
  const args = process.argv.slice(2);

  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
🧹 Profile Cleanup Script

Usage:
  node scripts/cleanup-profiles.js [options] [profile-id]

Commands:
  list                     List all saved profiles
  cleanup <profile-id>     Clean up specific profile
  cleanup-all             Clean up all profiles

Options:
  --help, -h              Show this help message

Examples:
  # List all profiles
  node scripts/cleanup-profiles.js list

  # Clean up specific profile
  node scripts/cleanup-profiles.js cleanup anyrouter-main

  # Clean up all profiles
  node scripts/cleanup-profiles.js cleanup-all
`);
    return;
  }

  const command = args[0];
  const profileId = args[1];

  switch (command) {
    case 'list':
      const profiles = listProfiles();
      console.log('📁 Saved Profiles:');
      if (profiles.length === 0) {
        console.log('   (none)');
      } else {
        profiles.forEach(profile => {
          const profilePath = path.join(profilesDir, profile);
          const storageStatePath = path.join(profilePath, 'storage-state.json');
          const hasStorageState = fs.existsSync(storageStatePath);
          console.log(`   • ${profile} ${hasStorageState ? '✅' : '❌'}`);
        });
      }
      break;

    case 'cleanup':
      if (!profileId) {
        console.log('❌ Please specify a profile ID to cleanup');
        console.log('Usage: node scripts/cleanup-profiles.js cleanup <profile-id>');
        return;
      }
      cleanupProfile(profileId);
      break;

    case 'cleanup-all':
      const allProfiles = listProfiles();
      console.log(`🧹 Cleaning up ${allProfiles.length} profiles...`);
      allProfiles.forEach(profile => {
        cleanupProfile(profile);
      });
      console.log('✅ All profiles cleaned up');
      break;

    default:
      console.log('❌ Unknown command. Use --help for usage information.');
      break;
  }
}

main();