import 'reflect-metadata';
import { container } from './core/container';
import { IConfigService, INotificationService, IMonitoringService } from './core/interfaces';
import { TYPES } from './core/types';
import { InMemoryTaskQueue } from './infrastructure/queue/in-memory-task-queue.service';
import path from 'path';

async function main() {
  try {
    console.log('🚀 Starting Daily Login Assistant Bot...');

    // Initialize services
    const configService = container.get<IConfigService>(TYPES.ConfigService);
    const notificationService = container.get<INotificationService>(TYPES.NotificationService);
    const monitoringService = container.get<IMonitoringService>(TYPES.MonitoringService);
    const _taskQueue = container.get<InMemoryTaskQueue>(TYPES.TaskQueue);

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

    // Simple scheduling logic - runs every minute
    const runScheduledTasks = async () => {
      const now = new Date();
      const currentTime = now.toTimeString().substring(0, 5); // HH:MM format

      console.log(`Checking scheduled tasks at ${currentTime}`);

      for (const config of websiteConfigs) {
        // Simple time-based scheduling (you can enhance this)
        if (config.schedule && config.schedule.time === currentTime) {
          console.log(`Scheduling login task for ${config.name}`);

          // Create a simple login task (you'll need to implement the LoginTask entity)
          // For now, just log the action
          console.log(`Would execute login for ${config.name} (${config.url})`);

          monitoringService.recordLoginAttempt(config.id, 'system', 'success');

          await notificationService.sendLoginSuccess(config.name, 'scheduled');
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

      // Send shutdown notification
      await notificationService.sendShutdownNotification();

      // Get final stats
      const stats = monitoringService.getStats();
      console.log('Final statistics:', stats);

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
