import 'reflect-metadata';
import { container } from './core/container';
import { IConfigService, INotificationService, IMonitoringService, ILoginService } from './core/interfaces';
import { TYPES } from './core/types';
import { InMemoryTaskQueue } from './infrastructure/queue/in-memory-task-queue.service';
import { DevWebhookListener } from './infrastructure/dev/webhook-listener.service';
import { CookieWebApiService } from './infrastructure/web/cookie-web-api.service';
import { LoginTask, TaskPriority } from './core/entities/login-task.entity';
import path from 'path';

async function main() {
  try {
    console.log('🚀 Starting Daily Login Assistant Bot...');

    // Initialize services
    const configService = container.get<IConfigService>(TYPES.ConfigService);
    const notificationService = container.get<INotificationService>(TYPES.NotificationService);
    const monitoringService = container.get<IMonitoringService>(TYPES.MonitoringService);
    const loginService = container.get<ILoginService>(TYPES.LoginService);
    const _taskQueue = container.get<InMemoryTaskQueue>(TYPES.TaskQueue);

    // Start Cookie Web API for profile management (takes port 3001)
    console.log('🌐 Starting Cookie Upload Web API...');
    const cookieWebApi = container.get<CookieWebApiService>(TYPES.CookieWebApi);
    await cookieWebApi.start();
    console.log('');

    // Start webhook listener in development (only if cookie web API is not using port 3001)
    let webhookListener: DevWebhookListener | null = null;
    if (process.env.NODE_ENV === 'development' && process.env.ENABLE_WEBHOOK_LISTENER === 'true') {
      try {
        webhookListener = container.get<DevWebhookListener>(TYPES.DevWebhookListener);
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
    console.log(`Found ${websiteConfigs.length} enabled website configurations`);

    if (websiteConfigs.length === 0) {
      console.warn('No enabled websites found in configuration');
      await notificationService.sendNotification(
        'Configuration Warning',
        'No enabled websites found in configuration',
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
              monitoringService.recordLoginAttempt(config.id, 'default_account', 'success');
              console.log(`✅ Login task completed successfully for ${config.name}`);
            } else {
              monitoringService.recordLoginAttempt(config.id, 'default_account', 'failed');
              console.log(`❌ Login task failed for ${config.name}`);
            }
          } catch (error) {
            console.error(`Error processing login task for ${config.name}:`, error);
            monitoringService.recordLoginAttempt(config.id, 'default_account', 'failed');
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
      const stats = monitoringService.getStats();
      const loginStats = loginService.getMetrics();
      console.log('Final statistics:', { ...stats, ...loginStats });

      if (stats.totalLogins > 0) {
        await notificationService.sendDailySummary(
          stats.totalLogins,
          stats.successfulLogins,
          stats.failedLogins
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
      const notificationService = container.get<INotificationService>(TYPES.NotificationService);
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
