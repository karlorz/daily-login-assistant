import { spawn } from 'child_process';
import { INotificationService } from '../../core/interfaces/index.js';

export class ShoutrrNotificationService implements INotificationService {
  private failedUrls: Set<string> = new Set();
  private silenceErrors: boolean = false;

  constructor() {
    // Silence errors if using logger:// only (common in development)
    const urls = process.env.NOTIFICATION_URLS?.split(',').map(u => u.trim()) || [];
    this.silenceErrors = urls.length === 1 && urls[0] === 'logger://';
  }

  async sendNotification(
    title: string,
    message: string,
    severity: 'info' | 'warning' | 'error' = 'info'
  ): Promise<void> {
    const urls = process.env.NOTIFICATION_URLS?.split(',') || [];

    if (urls.length === 0) {
      if (!this.silenceErrors) {
        console.warn('⚠️  No notification URLs configured (set NOTIFICATION_URLS environment variable)');
      }
      return;
    }

    const emoji = severity === 'error' ? '❌' : severity === 'warning' ? '⚠️' : '✅';
    const formattedMessage = `${emoji} **${title}**\n${message}`;

    for (const url of urls) {
      const trimmedUrl = url.trim();
      
      // Skip if this URL has failed before (avoid spamming errors)
      if (this.failedUrls.has(trimmedUrl)) {
        continue;
      }

      try {
        await this.sendToUrl(trimmedUrl, formattedMessage);
        console.log(`Notification sent successfully to ${trimmedUrl.split('://')[0]}`);
      } catch (error) {
        // Mark as failed to prevent repeated errors
        this.failedUrls.add(trimmedUrl);
        
        // Show user-friendly error message
        this.handleNotificationError(trimmedUrl, error);
      }
    }
  }

  private handleNotificationError(url: string, error: any): void {
    const protocol = url.split('://')[0];
    const errorMsg = error instanceof Error ? error.message : String(error);

    // Parse common error scenarios
    if (errorMsg.includes('404 Not Found') || errorMsg.includes('ECONNREFUSED')) {
      console.warn(`⚠️  Notification service unreachable: ${protocol}:// (${url.split('://')[1]?.split('?')[0] || 'unknown'})`);
      console.warn(`   💡 Tip: Check if the service is running or use NOTIFICATION_URLS=logger:// for console-only notifications`);
    } else if (errorMsg.includes('Failed to spawn shoutrrr')) {
      console.warn(`⚠️  Shoutrrr CLI not found. Install with: go install github.com/nicholas-fedor/shoutrrr@latest`);
      console.warn(`   💡 Or use NOTIFICATION_URLS=logger:// for console-only notifications`);
    } else if (errorMsg.includes('timed out')) {
      console.warn(`⚠️  Notification timeout for ${protocol}:// - service may be slow or unreachable`);
    } else {
      // Only show detailed error in development or if not silenced
      if (process.env.NODE_ENV === 'development' && !this.silenceErrors) {
        console.warn(`⚠️  Notification failed for ${protocol}://:`, errorMsg.split('\n')[0]);
      }
    }

    // Show one-time suggestion to fix configuration
    if (this.failedUrls.size === 1) {
      console.log('');
      console.log('═══════════════════════════════════════════════════════════');
      console.log('  Notification Configuration Help');
      console.log('═══════════════════════════════════════════════════════════');
      console.log('  To fix notification errors, update NOTIFICATION_URLS:');
      console.log('');
      console.log('  Option 1: Console-only (no external services)');
      console.log('    export NOTIFICATION_URLS="logger://"');
      console.log('');
      console.log('  Option 2: Discord');
      console.log('    export NOTIFICATION_URLS="discord://token@channel"');
      console.log('');
      console.log('  Option 3: Multiple services');
      console.log('    export NOTIFICATION_URLS="logger://,discord://token@channel"');
      console.log('');
      console.log('  Option 4: Development webhook (requires webhook listener)');
      console.log('    export NOTIFICATION_URLS="logger://,generic://localhost:3001"');
      console.log('    NODE_ENV=development ENABLE_WEBHOOK_LISTENER=true bun run dev');
      console.log('═══════════════════════════════════════════════════════════');
      console.log('');
    }
  }

  private sendToUrl(url: string, message: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const process = spawn('shoutrrr', ['send', url, message]);

      let stderr = '';

      process.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      process.on('close', (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`Shoutrrr process exited with code ${code}: ${stderr}`));
        }
      });

      process.on('error', (error) => {
        reject(new Error(`Failed to spawn shoutrrr process: ${error.message}`));
      });

      // Set timeout for the process
      setTimeout(() => {
        process.kill();
        reject(new Error('Shoutrrr process timed out'));
      }, 10000); // 10 second timeout
    });
  }

  async sendLoginSuccess(websiteName: string, accountId: string): Promise<void> {
    await this.sendNotification(
      'Login Success',
      `Successfully logged into **${websiteName}** for account \`${accountId}\``,
      'info'
    );
  }

  async sendLoginFailure(websiteName: string, accountId: string, error: string): Promise<void> {
    await this.sendNotification(
      'Login Failed',
      `Failed to login to **${websiteName}** for account \`${accountId}\`\n\n**Error:** ${error}`,
      'error'
    );
  }

  async sendDailySummary(totalLogins: number, successCount: number, failureCount: number): Promise<void> {
    const successRate = totalLogins > 0 ? Math.round((successCount / totalLogins) * 100) : 0;

    await this.sendNotification(
      'Daily Login Summary',
      `**Total Attempts:** ${totalLogins}\n` +
      `✅ **Successful:** ${successCount}\n` +
      `❌ **Failed:** ${failureCount}\n` +
      `📊 **Success Rate:** ${successRate}%`,
      failureCount > 0 ? 'warning' : 'info'
    );
  }

  async sendStartupNotification(): Promise<void> {
    await this.sendNotification(
      'Bot Started',
      'Daily Login Assistant Bot has started successfully 🚀',
      'info'
    );
  }

  async sendShutdownNotification(): Promise<void> {
    await this.sendNotification(
      'Bot Stopped',
      'Daily Login Assistant Bot has been shut down 🛑',
      'info'
    );
  }

  async sendErrorNotification(component: string, error: string): Promise<void> {
    await this.sendNotification(
      `Error in ${component}`,
      `**Component:** ${component}\n**Error:** ${error}`,
      'error'
    );
  }
}