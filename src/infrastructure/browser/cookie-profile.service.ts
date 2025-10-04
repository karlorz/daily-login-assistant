/**
 * Cookie-Based Profile Service
 *
 * Lightweight solution for remote profile creation via cookie upload
 * No VNC/Xvfb required - user exports cookies from local browser
 */

import { injectable } from 'inversify';
import { chromium, Browser, BrowserContext, Cookie } from 'playwright';
import fs from 'fs/promises';
import path from 'path';

interface ProfileMetadata {
  site: string;
  user: string;
  loginUrl: string;
  setupDate: string;
  lastCheckin?: string;
  cookies: number;
}

@injectable()
export class CookieProfileService {
  private profilesDir: string;

  constructor() {
    this.profilesDir = path.join(process.cwd(), 'profiles', 'user-guided');
  }

  /**
   * Create profile from uploaded cookies
   */
  async createProfileFromCookies(
    site: string,
    user: string,
    loginUrl: string,
    cookies: Cookie[]
  ): Promise<{ success: boolean; profileId: string; error?: string }> {
    const profileId = `${site}-${user}`;
    const profilePath = path.join(this.profilesDir, profileId);

    try {
      // Create profile directory
      await fs.mkdir(profilePath, { recursive: true });

      // Save cookies to Chrome profile format
      await this.saveCookiesToProfile(profilePath, cookies);

      // Save metadata
      const metadata: ProfileMetadata = {
        site,
        user,
        loginUrl,
        setupDate: new Date().toISOString(),
        cookies: cookies.length
      };
      await this.saveMetadata(profileId, metadata);

      return {
        success: true,
        profileId
      };
    } catch (error) {
      return {
        success: false,
        profileId,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Test profile with existing cookies
   */
  async testProfile(profileId: string, loginUrl: string): Promise<{
    success: boolean;
    cookies?: Cookie[];
    error?: string;
  }> {
    const profilePath = path.join(this.profilesDir, profileId);

    let browser: Browser | null = null;
    let context: BrowserContext | null = null;

    try {
      // Launch browser with profile
      browser = await chromium.launch({
        headless: true
      });

      context = await browser.newContext({
        storageState: path.join(profilePath, 'storage-state.json')
      });

      const page = await context.newPage();

      // Navigate to login URL to test session
      await page.goto(loginUrl, {
        waitUntil: 'networkidle',
        timeout: 30000
      });

      // Wait a bit to ensure page is loaded
      await page.waitForTimeout(2000);

      // Get current cookies
      const cookies = await context.cookies();

      // Update metadata with last check-in
      const metadata = await this.getMetadata(profileId);
      if (metadata) {
        metadata.lastCheckin = new Date().toISOString();
        metadata.cookies = cookies.length;
        await this.saveMetadata(profileId, metadata);
      }

      return {
        success: true,
        cookies
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    } finally {
      if (context) await context.close();
      if (browser) await browser.close();
    }
  }

  /**
   * Get all profiles
   */
  async getAllProfiles(): Promise<Array<{ id: string; metadata: ProfileMetadata }>> {
    try {
      await fs.mkdir(this.profilesDir, { recursive: true });
      const entries = await fs.readdir(this.profilesDir, { withFileTypes: true });

      const profiles = await Promise.all(
        entries
          .filter(entry => entry.isDirectory())
          .map(async (entry) => {
            const metadata = await this.getMetadata(entry.name);
            return {
              id: entry.name,
              metadata: metadata || {
                site: 'unknown',
                user: 'unknown',
                loginUrl: '',
                setupDate: new Date().toISOString(),
                cookies: 0
              }
            };
          })
      );

      return profiles;
    } catch (error) {
      console.error('Failed to get profiles:', error);
      return [];
    }
  }

  /**
   * Delete profile
   */
  async deleteProfile(profileId: string): Promise<void> {
    const profilePath = path.join(this.profilesDir, profileId);
    await fs.rm(profilePath, { recursive: true, force: true });
  }

  /**
   * Save cookies to Chrome profile storage state format
   */
  private async saveCookiesToProfile(profilePath: string, cookies: Cookie[]): Promise<void> {
    const storageState = {
      cookies,
      origins: []
    };

    await fs.writeFile(
      path.join(profilePath, 'storage-state.json'),
      JSON.stringify(storageState, null, 2)
    );
  }

  /**
   * Get profile metadata
   */
  private async getMetadata(profileId: string): Promise<ProfileMetadata | null> {
    try {
      const metadataPath = path.join(this.profilesDir, profileId, 'metadata.json');
      const content = await fs.readFile(metadataPath, 'utf-8');
      return JSON.parse(content);
    } catch {
      return null;
    }
  }

  /**
   * Save profile metadata
   */
  private async saveMetadata(profileId: string, metadata: ProfileMetadata): Promise<void> {
    const profilePath = path.join(this.profilesDir, profileId);
    await fs.mkdir(profilePath, { recursive: true });

    const metadataPath = path.join(profilePath, 'metadata.json');
    await fs.writeFile(metadataPath, JSON.stringify(metadata, null, 2));
  }
}
