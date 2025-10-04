/**
 * Lightweight Web API for Cookie-Based Profile Management
 *
 * Accepts cookie uploads from user's local browser
 * No VNC/Xvfb required - minimal resource usage
 */

import { injectable } from 'inversify';
import type { Server } from 'bun';
import { CookieProfileService } from '../browser/cookie-profile.service.js';
import { CDPCookieExtractorService } from '../browser/cdp-cookie-extractor.service.js';
import { SessionManagerService } from './session-manager.service.js';
import type { Cookie } from 'playwright';
import path from 'path';

@injectable()
export class CookieWebApiService {
  private server: Server | null = null;
  private cookieService: CookieProfileService;
  private cdpExtractor: CDPCookieExtractorService;
  private sessionManager: SessionManagerService;
  private publicDir: string;
  private port: number;

  constructor() {
    this.cookieService = new CookieProfileService();
    this.cdpExtractor = new CDPCookieExtractorService();
    this.sessionManager = new SessionManagerService();
    this.publicDir = path.join(process.cwd(), 'public');
    this.port = parseInt(process.env.WEB_API_PORT || '3001', 10);

    // Cleanup expired sessions every 5 minutes
    setInterval(() => {
      const count = this.sessionManager.cleanupExpiredSessions();
      if (count > 0) {
        console.log(`🧹 Cleaned up ${count} expired session(s)`);
      }
    }, 300000);
  }

  /**
   * Start the web API server
   */
  async start(): Promise<void> {
    this.server = Bun.serve({
      port: this.port,
      fetch: async (req) => {
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
          return await this.serveStaticFile(url.pathname, corsHeaders);
        }

        // API routes
        try {
          const response = await this.handleApiRequest(url.pathname, method, req);
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
    console.log(`   GET  /api/profiles                    - List all profiles`);
    console.log(`   POST /api/profiles/upload             - Upload cookies to create profile`);
    console.log(`   POST /api/profiles/:id/test           - Test profile check-in`);
    console.log(`   DELETE /api/profiles/:id              - Delete profile`);
    console.log(`   POST /api/session/create              - Create new session`);
    console.log(`   GET  /api/session/:token              - Get session status`);
    console.log(`   GET  /api/session/:token/script/:os   - Download launcher script`);
    console.log(`   POST /api/tunnel-ready                - Notify tunnel connected`);
    console.log(`   POST /api/profiles/extract-from-tunnel - Extract cookies via CDP`);
    console.log(`   GET  /health                          - Health check`);
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

    // Create new session
    if (pathname === '/api/session/create' && method === 'POST') {
      const session = this.sessionManager.createSession();
      return new Response(
        JSON.stringify({
          success: true,
          token: session.token,
          expiresAt: session.expiresAt.toISOString()
        }),
        {
          status: 201,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Get session status
    const statusMatch = pathname.match(/^\/api\/session\/([^/]+)$/);
    if (statusMatch && method === 'GET') {
      const [, token] = statusMatch;

      const session = this.sessionManager.getSession(token);
      if (!session) {
        return new Response(
          JSON.stringify({ error: 'Invalid or expired session' }),
          {
            status: 404,
            headers: { 'Content-Type': 'application/json' }
          }
        );
      }

      return new Response(
        JSON.stringify({
          success: true,
          token: session.token,
          status: session.status,
          createdAt: session.createdAt.toISOString(),
          connectedAt: session.connectedAt?.toISOString(),
          expiresAt: session.expiresAt.toISOString()
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Download launcher script
    const scriptMatch = pathname.match(/^\/api\/session\/([^/]+)\/script\/([^/]+)$/);
    if (scriptMatch && method === 'GET') {
      const [, token, os] = scriptMatch;

      const session = this.sessionManager.getSession(token);
      if (!session) {
        return new Response(
          JSON.stringify({ error: 'Invalid or expired session' }),
          {
            status: 401,
            headers: { 'Content-Type': 'application/json' }
          }
        );
      }

      return await this.generateLauncherScript(token, os);
    }

    // Tunnel ready notification
    if (pathname === '/api/tunnel-ready' && method === 'POST') {
      const body = await req.json() as { sessionToken: string; status: string };
      const { sessionToken } = body;

      const session = this.sessionManager.updateSession(sessionToken, {
        status: 'connected',
        debugPort: 'ssh-tunnel:9222',
        connectedAt: new Date(),
      });

      if (!session) {
        return new Response(
          JSON.stringify({ error: 'Invalid session' }),
          {
            status: 404,
            headers: { 'Content-Type': 'application/json' }
          }
        );
      }

      return new Response(
        JSON.stringify({
          success: true,
          message: 'Tunnel connected successfully'
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Extract cookies from debug tunnel
    if (pathname === '/api/profiles/extract-from-tunnel' && method === 'POST') {
      const body = await req.json() as {
        sessionToken: string;
        site: string;
        user: string;
        loginUrl: string;
      };

      const { sessionToken, site, user, loginUrl } = body;

      const session = this.sessionManager.getSession(sessionToken);
      if (!session || session.status !== 'connected') {
        return new Response(
          JSON.stringify({
            error: 'Invalid session or tunnel not connected'
          }),
          {
            status: 400,
            headers: { 'Content-Type': 'application/json' }
          }
        );
      }

      try {
        // Update session status
        this.sessionManager.updateSession(sessionToken, {
          status: 'extracting',
        });

        // Extract cookies and localStorage via CDP
        const debugPort = session.debugPort || 'ssh-tunnel:9222';
        const storageState = await this.cdpExtractor.extractCookiesFromDebugPort(
          debugPort,
          loginUrl
        );

        // Create profile from storage state
        const result = await this.cookieService.createProfileFromCookies(
          site,
          user,
          loginUrl,
          storageState.cookies,
          storageState
        );

        // Update session status
        this.sessionManager.updateSession(sessionToken, {
          status: 'completed',
        });

        return new Response(
          JSON.stringify({
            success: true,
            profileId: result.profileId,
            cookies: storageState.cookies.length,
            message: 'Profile created successfully'
          }),
          {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
          }
        );
      } catch (error) {
        // Update session status
        this.sessionManager.updateSession(sessionToken, {
          status: 'failed',
        });

        return new Response(
          JSON.stringify({
            success: false,
            error: error instanceof Error ? error.message : String(error)
          }),
          {
            status: 400,
            headers: { 'Content-Type': 'application/json' }
          }
        );
      }
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

  /**
   * Generate launcher script for specific OS
   */
  private async generateLauncherScript(token: string, os: string): Promise<Response> {
    // Validate OS
    if (!['macos', 'linux', 'windows'].includes(os)) {
      return new Response(
        JSON.stringify({ error: 'Invalid OS. Must be macos, linux, or windows' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Load template
    const templateFile = os === 'windows' ? 'launcher.ps1' : 'launcher.sh';
    const templatePath = path.join(process.cwd(), 'scripts', 'templates', templateFile);

    try {
      const template = await Bun.file(templatePath).text();

      // Get configuration from environment or use defaults
      const config = {
        SESSION_TOKEN: token,
        REMOTE_SSH_HOST: process.env.REMOTE_SSH_HOST || 'anyrouter.top',
        REMOTE_SSH_PORT: process.env.REMOTE_SSH_PORT || '2222',
        REMOTE_SSH_USER: process.env.REMOTE_SSH_USER || 'tunnel',
        SSH_PASSWORD: process.env.SSH_TUNNEL_PASSWORD || '',
        API_ENDPOINT: process.env.API_ENDPOINT || 'https://anyrouter.top:3001/api/tunnel-ready',
        ALLOWED_ORIGIN: process.env.ALLOWED_ORIGIN || 'https://anyrouter.top',
      };

      // Replace placeholders
      let script = template;
      for (const [key, value] of Object.entries(config)) {
        script = script.replace(new RegExp(`{{${key}}}`, 'g'), value);
      }

      // Determine filename and content type
      const filename = os === 'windows' ? 'anyrouter-launcher.ps1' : 'anyrouter-launcher.sh';
      const contentType = os === 'windows' ? 'text/plain' : 'application/x-sh';

      return new Response(script, {
        headers: {
          'Content-Type': contentType,
          'Content-Disposition': `attachment; filename="${filename}"`,
        },
      });
    } catch (error) {
      return new Response(
        JSON.stringify({
          error: `Failed to generate script: ${error instanceof Error ? error.message : String(error)}`
        }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }
  }
}
