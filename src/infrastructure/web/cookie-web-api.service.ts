/**
 * Lightweight Web API for Cookie-Based Profile Management
 *
 * Accepts cookie uploads from user's local browser
 * No VNC/Xvfb required - minimal resource usage
 */

import { injectable } from 'inversify';
import type { Server } from 'bun';
import { CookieProfileService } from '../browser/cookie-profile.service.js';
import type { Cookie } from 'playwright';
import path from 'path';

@injectable()
export class CookieWebApiService {
  private server: Server | null = null;
  private cookieService: CookieProfileService;
  private publicDir: string;
  private port: number;

  constructor() {
    this.cookieService = new CookieProfileService();
    this.publicDir = path.join(process.cwd(), 'public');
    this.port = parseInt(process.env.WEB_API_PORT || '3001', 10);
  }

  /**
   * Start the web API server
   */
  async start(): Promise<void> {
    const self = this;
    this.server = Bun.serve({
      port: this.port,
      async fetch(req) {
        const url = new URL(req.url);
        const method = req.method;

        // CORS headers
        const corsHeaders = {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
        };

        if (method === 'OPTIONS') {
          return new Response(null, { headers: corsHeaders });
        }

        // Serve static files
        if (method === 'GET' && !url.pathname.startsWith('/api/')) {
          return await self.serveStaticFile(url.pathname, corsHeaders);
        }

        // API routes
        try {
          const response = await self.handleApiRequest(url.pathname, method, req);
          Object.entries(corsHeaders).forEach(([key, value]) => {
            response.headers.set(key, value);
          });
          return response;
        } catch (error) {
          console.error('API Error:', error);
          return new Response(
            JSON.stringify({ error: error instanceof Error ? error.message : 'Internal Server Error' }),
            {
              status: 500,
              headers: { 'Content-Type': 'application/json', ...corsHeaders }
            }
          );
        }
      },
    });

    console.log(`🌐 Cookie Upload Web API started on http://0.0.0.0:${this.port}`);
    console.log(`📋 Web UI: http://localhost:${this.port}/`);
    console.log(`📋 API Endpoints:`);
    console.log(`   GET  /api/profiles              - List all profiles`);
    console.log(`   POST /api/profiles/upload       - Upload cookies to create profile`);
    console.log(`   POST /api/profiles/:id/test     - Test profile check-in`);
    console.log(`   DELETE /api/profiles/:id        - Delete profile`);
    console.log(`   GET  /health                    - Health check`);
  }

  /**
   * Stop the web API server
   */
  async stop(): Promise<void> {
    if (this.server) {
      this.server.stop();
      this.server = null;
      console.log('🛑 Cookie Upload Web API stopped');
    }
  }

  /**
   * Handle API requests
   */
  private async handleApiRequest(pathname: string, method: string, req: Request): Promise<Response> {
    // Health check
    if (pathname === '/health' && method === 'GET') {
      return new Response(
        JSON.stringify({
          status: 'ok',
          timestamp: new Date().toISOString(),
          service: 'cookie-web-api'
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // List profiles
    if (pathname === '/api/profiles' && method === 'GET') {
      const profiles = await this.cookieService.getAllProfiles();
      return new Response(
        JSON.stringify({ profiles }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Upload cookies to create profile
    if (pathname === '/api/profiles/upload' && method === 'POST') {
      const body = await req.json() as {
        site: string;
        user: string;
        loginUrl: string;
        cookies: Cookie[];
      };

      const { site, user, loginUrl, cookies } = body;

      if (!site || !user || !loginUrl || !cookies || !Array.isArray(cookies)) {
        return new Response(
          JSON.stringify({ error: 'Missing required fields: site, user, loginUrl, cookies' }),
          {
            status: 400,
            headers: { 'Content-Type': 'application/json' }
          }
        );
      }

      const result = await this.cookieService.createProfileFromCookies(site, user, loginUrl, cookies);

      return new Response(
        JSON.stringify(result),
        {
          status: result.success ? 201 : 500,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Test profile
    const testMatch = pathname.match(/^\/api\/profiles\/([^/]+)\/test$/);
    if (testMatch && method === 'POST') {
      const profileId = testMatch[1];
      const profiles = await this.cookieService.getAllProfiles();
      const profile = profiles.find(p => p.id === profileId);

      if (!profile) {
        return new Response(
          JSON.stringify({ error: 'Profile not found' }),
          {
            status: 404,
            headers: { 'Content-Type': 'application/json' }
          }
        );
      }

      const result = await this.cookieService.testProfile(profileId, profile.metadata.loginUrl);

      return new Response(
        JSON.stringify({
          success: result.success,
          profileId,
          cookies: result.cookies?.length || 0,
          error: result.error,
          message: result.success ? 'Check-in successful' : 'Check-in failed'
        }),
        {
          status: result.success ? 200 : 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Delete profile
    const deleteMatch = pathname.match(/^\/api\/profiles\/([^/]+)$/);
    if (deleteMatch && method === 'DELETE') {
      const profileId = deleteMatch[1];

      await this.cookieService.deleteProfile(profileId);

      return new Response(
        JSON.stringify({
          success: true,
          profileId,
          message: 'Profile deleted successfully'
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    return new Response('Not Found', { status: 404 });
  }

  /**
   * Serve static files from public directory
   */
  private async serveStaticFile(pathname: string, corsHeaders: Record<string, string>): Promise<Response> {
    try {
      // Default to index.html for root path
      if (pathname === '/') {
        pathname = '/index.html';
      }

      const filePath = path.join(this.publicDir, pathname);

      // Security: prevent directory traversal
      const normalizedPath = path.normalize(filePath);
      if (!normalizedPath.startsWith(this.publicDir)) {
        return new Response('Forbidden', { status: 403 });
      }

      const file = await Bun.file(filePath);

      if (!await file.exists()) {
        return new Response('Not Found', { status: 404 });
      }

      // Determine content type
      const contentType = this.getContentType(filePath);

      return new Response(file, {
        headers: {
          'Content-Type': contentType,
          ...corsHeaders
        }
      });
    } catch {
      return new Response('Not Found', { status: 404 });
    }
  }

  /**
   * Get content type based on file extension
   */
  private getContentType(filePath: string): string {
    const ext = path.extname(filePath).toLowerCase();
    const contentTypes: Record<string, string> = {
      '.html': 'text/html',
      '.css': 'text/css',
      '.js': 'application/javascript',
      '.json': 'application/json',
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.gif': 'image/gif',
      '.svg': 'image/svg+xml',
    };
    return contentTypes[ext] || 'application/octet-stream';
  }
}
