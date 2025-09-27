import { injectable, inject } from 'inversify';
import type { ILoginService } from '../../core/interfaces/login.service.interface';
import type { IBrowserService } from '../../core/interfaces/browser.service.interface';
import type { IConfigService } from '../../core/interfaces/config.service.interface';
import type { INotificationService } from '../../core/interfaces/notification.service.interface';
import { LoginTask } from '../../core/entities/login-task.entity';
import { AccountCredentials } from '../../core/entities/account-credentials.entity';
import { TYPES } from '../../core/types';

@injectable()
export class LoginEngine implements ILoginService {
  private metrics = {
    totalAttempts: 0,
    successfulLogins: 0,
    failedLogins: 0,
    totalCheckins: 0,
    successfulCheckins: 0,
    avgLoginTime: 0,
  };

  constructor(
    @inject(TYPES.BrowserService) private browserService: IBrowserService,
    @inject(TYPES.ConfigService) private configService: IConfigService,
    @inject(TYPES.NotificationService) private notificationService: INotificationService
  ) {}

  async processLoginTask(task: LoginTask): Promise<boolean> {
    const startTime = Date.now();
    this.metrics.totalAttempts++;

    console.log(`Processing login task ${task.id} for website ${task.websiteId}`);

    try {
      task.markAsProcessing();

      // Get website configuration
      const websiteConfig = await this.configService.getWebsiteConfig(task.websiteId);
      if (!websiteConfig) {
        throw new Error(`Website configuration not found for ${task.websiteId}`);
      }

      if (!websiteConfig.enabled) {
        console.log(`Website ${task.websiteId} is disabled, skipping task`);
        task.markAsCompleted();
        return true;
      }

      // Get credentials
      const credentials = await this.getCredentials(task.accountId, websiteConfig);
      if (!credentials) {
        throw new Error(`Credentials not found for account ${task.accountId}`);
      }

      // Create browser session
      const session = await this.browserService.createSession(task.accountId, websiteConfig);

      try {
        // Navigate to login page
        await this.browserService.navigateToLogin(session.page, websiteConfig);

        // Check if already logged in
        const alreadyLoggedIn = await this.browserService.isAlreadyLoggedIn(session.page, websiteConfig);
        if (alreadyLoggedIn) {
          console.log(`Already logged in for ${websiteConfig.name}`);

          // Still perform check-in if available
          await this.performCheckin(session, websiteConfig);

          task.markAsCompleted();
          this.metrics.successfulLogins++;

          await this.notificationService.sendLoginSuccess(websiteConfig.name, task.accountId);
          return true;
        }

        // Perform login
        await this.browserService.enterCredentials(session.page, credentials, websiteConfig);
        const loginSuccess = await this.browserService.performLogin(session.page, websiteConfig);

        if (!loginSuccess) {
          throw new Error('Login failed - authentication rejected');
        }

        console.log(`Login successful for ${websiteConfig.name}`);

        // Perform check-in after successful login
        await this.performCheckin(session, websiteConfig);

        // Take screenshot for success verification
        const _screenshotPath = await this.browserService.takeScreenshot(
          session.page,
          `login_success_${websiteConfig.id}`
        );

        task.markAsCompleted();
        this.metrics.successfulLogins++;

        // Calculate and update average login time
        const loginTime = Date.now() - startTime;
        this.updateAverageLoginTime(loginTime);

        await this.notificationService.sendLoginSuccess(websiteConfig.name, task.accountId);

        return true;

      } finally {
        // Clean up browser session
        await this.browserService.closeSession(session.id);
      }

    } catch (error) {
      console.error(`Login task ${task.id} failed:`, error);

      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      task.markAsFailed(errorMessage);
      this.metrics.failedLogins++;

      // Take screenshot for debugging
      try {
        const session = await this.browserService.createSession(task.accountId,
          await this.configService.getWebsiteConfig(task.websiteId)!);
        const _screenshotPath = await this.browserService.takeScreenshot(
          session.page,
          `login_failed_${task.websiteId}`
        );
        await this.browserService.closeSession(session.id);

        await this.notificationService.sendLoginFailure(
          task.websiteId,
          task.accountId,
          errorMessage
        );
      } catch (screenshotError) {
        console.error('Failed to take failure screenshot:', screenshotError);
        await this.notificationService.sendLoginFailure(task.websiteId, task.accountId, errorMessage);
      }

      // Check if we should retry
      if (task.canRetry()) {
        task.markForRetry();
        console.log(`Will retry task ${task.id}, attempt ${task.attempt}/${task.maxAttempts}`);

        // Add exponential backoff delay
        const delay = Math.min(1000 * Math.pow(2, task.attempt - 1), 60000);
        setTimeout(() => {
          this.processLoginTask(task);
        }, delay);

        return false;
      }

      return false;
    }
  }

  async processCheckinTask(task: LoginTask): Promise<boolean> {
    console.log(`Processing check-in task ${task.id} for website ${task.websiteId}`);

    try {
      task.markAsProcessing();

      // Get website configuration
      const websiteConfig = await this.configService.getWebsiteConfig(task.websiteId);
      if (!websiteConfig) {
        throw new Error(`Website configuration not found for ${task.websiteId}`);
      }

      // Create browser session
      const session = await this.browserService.createSession(task.accountId, websiteConfig);

      try {
        // Navigate to the website
        await this.browserService.navigateToLogin(session.page, websiteConfig);

        // Check if logged in first
        const isLoggedIn = await this.browserService.isAlreadyLoggedIn(session.page, websiteConfig);
        if (!isLoggedIn) {
          console.log('Not logged in, cannot perform check-in');
          task.markAsFailed('Not logged in');
          return false;
        }

        // Perform check-in
        const checkinSuccess = await this.browserService.performCheckin(session.page, websiteConfig);

        if (checkinSuccess) {
          task.markAsCompleted();
          this.metrics.totalCheckins++;
          this.metrics.successfulCheckins++;

          await this.notificationService.sendNotification(
            'Check-in Success',
            `Daily check-in completed for ${websiteConfig.name}`,
            'info'
          );
          return true;
        } else {
          task.markAsFailed('Check-in not available or failed');
          return false;
        }

      } finally {
        await this.browserService.closeSession(session.id);
      }

    } catch (error) {
      console.error(`Check-in task ${task.id} failed:`, error);

      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      task.markAsFailed(errorMessage);

      return false;
    }
  }

  async validateCredentials(accountId: string, websiteId: string): Promise<boolean> {
    try {
      const websiteConfig = await this.configService.getWebsiteConfig(websiteId);
      if (!websiteConfig) {
        return false;
      }

      const credentials = await this.getCredentials(accountId, websiteConfig);
      return credentials !== null;
    } catch (error) {
      console.error('Error validating credentials:', error);
      return false;
    }
  }

  getMetrics(): Record<string, unknown> {
    return {
      ...this.metrics,
      successRate: this.metrics.totalAttempts > 0
        ? (this.metrics.successfulLogins / this.metrics.totalAttempts) * 100
        : 0,
      checkinSuccessRate: this.metrics.totalCheckins > 0
        ? (this.metrics.successfulCheckins / this.metrics.totalCheckins) * 100
        : 0,
    };
  }

  private async getCredentials(accountId: string, websiteConfig: any): Promise<AccountCredentials | null> {
    try {
      const username = process.env[websiteConfig.credentials.username_env];
      const password = process.env[websiteConfig.credentials.password_env];

      if (!username || !password) {
        console.error(`Missing credentials for ${websiteConfig.id}. Environment variables: ${websiteConfig.credentials.username_env}, ${websiteConfig.credentials.password_env}`);
        return null;
      }

      return new AccountCredentials(accountId, username, password);
    } catch (error) {
      console.error('Error loading credentials:', error);
      return null;
    }
  }

  private async performCheckin(session: any, websiteConfig: any): Promise<void> {
    try {
      console.log(`Attempting check-in for ${websiteConfig.name}`);
      const checkinSuccess = await this.browserService.performCheckin(session.page, websiteConfig);

      if (checkinSuccess) {
        this.metrics.totalCheckins++;
        this.metrics.successfulCheckins++;
        await this.notificationService.sendNotification(
          'Check-in Success',
          `Daily check-in completed for ${websiteConfig.name}`,
          'info'
        );
      } else {
        console.log(`No check-in available for ${websiteConfig.name}`);
      }
    } catch (error) {
      console.error(`Check-in failed for ${websiteConfig.name}:`, error);
    }
  }

  private updateAverageLoginTime(loginTime: number): void {
    if (this.metrics.successfulLogins === 1) {
      this.metrics.avgLoginTime = loginTime;
    } else {
      this.metrics.avgLoginTime = (
        (this.metrics.avgLoginTime * (this.metrics.successfulLogins - 1)) + loginTime
      ) / this.metrics.successfulLogins;
    }
  }
}