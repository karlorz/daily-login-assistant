import { injectable } from 'inversify';

@injectable()
export class DevWebhookListener {
  private server: any = null;
  private port: number;

  constructor() {
    // Use configurable port from environment, default to 3001
    this.port = parseInt(process.env.WEBHOOK_PORT || '3001', 10);
  }

  async start(): Promise<void> {
    if (this.server) {
      console.log('Webhook listener already running');
      return;
    }

    try {
      // Use Bun's built-in server
      this.server = Bun.serve({
        port: this.port,
        fetch: this.handleRequest.bind(this),
      });

      console.log(`🔗 Dev webhook listener started on http://localhost:${this.port}`);
      console.log(`📧 Use: NOTIFICATION_URLS=generic://localhost:${this.port}`);
      console.log(`📁 Notifications logged to console and /tmp/daily-login-notifications.log`);
    } catch (error) {
      console.error(`Failed to start webhook listener on port ${this.port}:`, error);
      throw error;
    }
  }

  async stop(): Promise<void> {
    if (this.server) {
      this.server.stop();
      this.server = null;
      console.log('🔗 Dev webhook listener stopped');
    }
  }

  private async handleRequest(request: Request): Promise<Response> {
    const url = new URL(request.url);

    // Only handle POST requests to root path
    if (request.method === 'POST' && url.pathname === '/') {
      try {
        const body = await request.text();
        const timestamp = new Date().toISOString();

        let logMessage: string;

        try {
          // Try to parse as JSON
          const data = JSON.parse(body);
          const title = data.title || 'Notification';
          const message = data.message || body;
          logMessage = `[${timestamp}] ${title}: ${message}`;

          console.log(`📧 Webhook received: ${title} - ${message}`);
        } catch {
          // Handle as plain text
          logMessage = `[${timestamp}] ${body}`;
          console.log(`📧 Webhook received: ${body}`);
        }

        // Log to file
        await Bun.write('/tmp/daily-login-notifications.log', logMessage + '\n', { createPath: true });

        return new Response('OK', { status: 200 });
      } catch (error) {
        console.error('Error handling webhook:', error);
        return new Response('Error', { status: 500 });
      }
    }

    // Return 404 for other requests
    return new Response('Not Found', { status: 404 });
  }

  isRunning(): boolean {
    return this.server !== null;
  }

  getUrl(): string {
    return `http://localhost:${this.port}`;
  }

  getPort(): number {
    return this.port;
  }
}