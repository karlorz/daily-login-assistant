import { spawn } from 'child_process';
import { INotificationService } from '../../core/interfaces';

export class ShoutrrNotificationService implements INotificationService {
  async sendNotification(
    title: string,
    message: string,
    severity: 'info' | 'warning' | 'error' = 'info'
  ): Promise<void> {
    const urls = process.env.NOTIFICATION_URLS?.split(',') || [];

    if (urls.length === 0) {
      console.warn('No notification URLs configured');
      return;
    }

    const emoji = severity === 'error' ? '❌' : severity === 'warning' ? '⚠️' : '✅';
    const formattedMessage = `${emoji} **${title}**\n${message}`;

    for (const url of urls) {
      try {
        await this.sendToUrl(url.trim(), formattedMessage);
        console.log(`Notification sent successfully to ${url.split('://')[0]}`);
      } catch (error) {
        console.error(`Failed to send notification to ${url}`, error);
      }
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