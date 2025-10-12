import { ServiceFactory } from './core/factory.js';
import type { IConfigService, INotificationService, ILoginService } from './core/interfaces/index.js';
import { InMemoryTaskQueue } from './infrastructure/queue/in-memory-task-queue.service.js';
import { DevWebhookListener } from './infrastructure/dev/webhook-listener.service.js';
import type { CookieWebApiService } from './infrastructure/web/cookie-web-api.service.js';
import { LoginTask, TaskPriority } from './core/entities/login-task.entity.js';
import path from 'path';

async function main() {
  try {
    console.log('🚀 Starting Daily Login Assistant Bot...');

    // Initialize services using factory
    const configService: IConfigService = ServiceFactory.getConfigService();
    const notificationService: INotificationService = ServiceFactory.getNotificationService();
    const loginService: ILoginService = ServiceFactory.getLoginService();
    const _taskQueue: InMemoryTaskQueue = ServiceFactory.getTaskQueue();

    // Start Cookie Web API for profile management (takes port 3001)
    console.log('🌐 Starting Cookie Upload Web API...');
    const cookieWebApi: CookieWebApiService = ServiceFactory.getCookieWebApi();
    await cookieWebApi.start();
    console.log('');

    // Start webhook listener in development (only if cookie web API is not using port 3001)
    let webhookListener: DevWebhookListener | null = null;
    if (process.env.NODE_ENV === 'development' && process.env.ENABLE_WEBHOOK_LISTENER === 'true') {
      try {
        webhookListener = new DevWebhookListener();
        await webhookListener.start();
      } catch {
        console.log('💡 Webhook listener not available (optional for development)');
      }
    }

    // Load configuration
    const configPath = path.join(process.cwd(), 'config', 'websites.yaml');
    await configService.loadConfig(configPath);

    console.log('Configuration loaded successfully');

    // Get website configurations
    const websiteConfigs = await configService.getAllWebsiteConfigs();

    // Check for PWA profiles
    const fs = await import('fs');
    const profileDir = path.join(process.cwd(), 'profiles', 'user-guided');
    let pwaProfileCount = 0;
    try {
      const files = fs.readdirSync(profileDir);
      pwaProfileCount = files.filter(f => f.endsWith('.json')).length;
    } catch {
      // Profile directory doesn't exist yet
    }

    // Display authentication method information
    console.log('');
    console.log('==================================================');
    console.log('  Authentication Methods Status');
    console.log('==================================================');

    if (pwaProfileCount > 0) {
      console.log(`✅ PWA Method (PRIMARY): ${pwaProfileCount} profile(s) found`);
      console.log(`   └─ Manage profiles: bun run profiles`);
    } else {
      console.log(`⚠️  PWA Method (PRIMARY): No profiles found`);
      console.log(`   └─ Create profiles at: http://localhost:${process.env.PWA_PORT || 8001}`);
      console.log(`   └─ Or run: bun run profiles setup <site> <user> <url>`);
    }

    console.log('');

    if (websiteConfigs.length > 0) {
      console.log(`📋 Legacy Auto-Fill Method: ${websiteConfigs.length} site(s) enabled`);
      console.log(`   └─ Configure in: config/websites.yaml`);
      console.log(`   ⚠️  Note: PWA method is recommended over auto-fill`);
    } else {
      console.log(`⏸️  Legacy Auto-Fill Method: Disabled (recommended)`);
      console.log(`   └─ Enable sites in config/websites.yaml if needed`);
    }

    console.log('==================================================');
    console.log('');

    if (websiteConfigs.length === 0 && pwaProfileCount === 0) {
      console.warn('⚠️  No authentication methods configured!');
      console.warn('   Please create PWA profiles or enable sites in config/websites.yaml');
      await notificationService.sendNotification(
        'Configuration Warning',
        'No authentication methods configured. Create PWA profiles or enable sites in config/websites.yaml',
        'warning'
      );
    }

    // Send startup notification
    await notificationService.sendStartupNotification();
    console.log('Startup notification sent');

    // Enhanced scheduling logic with actual login tasks
    const runScheduledTasks = async () => {
      const now = new Date();
      const currentTime = now.toTimeString().substring(0, 5); // HH:MM format

      console.log(`Checking scheduled tasks at ${currentTime}`);

      for (const config of websiteConfigs) {
        // Simple time-based scheduling
        if (config.schedule && config.schedule.time === currentTime) {
          console.log(`Creating login task for ${config.name}`);

          // Create and process login task
          const loginTask = new LoginTask(
            `task_${config.id}_${Date.now()}`,
            'default_account', // You can make this configurable
            config.id,
            TaskPriority.NORMAL,
            new Date(),
            config.automation?.retryAttempts || 3
          );

          try {
            const success = await loginService.processLoginTask(loginTask);

            if (success) {
              console.log(`✅ Login task completed successfully for ${config.name}`);
            } else {
              console.log(`❌ Login task failed for ${config.name}`);
            }
          } catch (error) {
            console.error(`Error processing login task for ${config.name}:`, error);
          }
        }
      }
    };

    // Set up scheduling interval (check every minute)
    const scheduleInterval = setInterval(runScheduledTasks, 60000);

    // Initial check
    await runScheduledTasks();

    console.log('Daily Login Assistant Bot started successfully');

    // Graceful shutdown handling
    const shutdown = async (signal: string) => {
      console.log(`Received ${signal}, shutting down gracefully...`);

      clearInterval(scheduleInterval);

      // Stop webhook listener if running
      if (webhookListener?.isRunning()) {
        await webhookListener.stop();
      }

      // Send shutdown notification
      await notificationService.sendShutdownNotification();

      // Get final stats
      const loginStats = loginService.getMetrics();
      console.log('Final statistics:', loginStats);

      const totalAttempts = Number(loginStats.totalAttempts) || 0;
      const successfulLogins = Number(loginStats.successfulLogins) || 0;
      const failedLogins = Number(loginStats.failedLogins) || 0;

      if (totalAttempts > 0) {
        await notificationService.sendDailySummary(
          totalAttempts,
          successfulLogins,
          failedLogins
        );
      }

      console.log('Shutdown complete');
      process.exit(0);
    };

    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));

    // Keep the process running
    process.on('uncaughtException', async (error) => {
      console.error('Uncaught exception:', error);
      await notificationService.sendErrorNotification('Application', error.message);
    });

    process.on('unhandledRejection', async (reason, promise) => {
      console.error(`Unhandled rejection at: ${promise}, reason: ${reason}`);
      await notificationService.sendErrorNotification('Application', `Unhandled rejection: ${reason}`);
    });

  } catch (error) {
    console.error('Failed to start application:', error);

    try {
      const notificationService = ServiceFactory.getNotificationService();
      await notificationService.sendErrorNotification('Startup', (error as Error).message);
    } catch (notificationError) {
      console.error('Failed to send startup error notification:', notificationError);
    }

    process.exit(1);
  }
}

// Export for testing
const DailyLoginAssistant = {
  start: main,
  main,
};

export default DailyLoginAssistant;

// Start the application if this is the main module
if (import.meta.main) {
  main().catch(console.error);
}
