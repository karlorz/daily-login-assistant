# Compact Daily Login Assistant Bot - Simplified Architecture

## Executive Summary

This document presents a streamlined architecture for a Daily Login Assistant Bot designed for small-scale operations (< 10 websites). The solution focuses on simplicity, reliability, and ease of maintenance while providing essential automation capabilities.

## Architecture Overview

### Core Principles
- **Simplicity First**: Minimal dependencies and straightforward design
- **File-Based Configuration**: YAML configuration with hot-reloading
- **Local Storage**: File-based persistence for profiles and logs
- **Simple Notifications**: CLI-based notifications via shoutrrr
- **Maintainability**: Clean TypeScript architecture with dependency injection

### Technology Stack
- **Runtime**: Bun JavaScript & TypeScript runtime (Node.js compatible)
- **Browser Automation**: Playwright with stealth capabilities
- **Notifications**: Shoutrrr CLI for alerts (Discord, Slack, email, etc.)
- **Configuration**: YAML files with validation
- **Storage**: File system for profiles and configuration
- **Container**: Simple Docker container
- **Architecture**: Clean architecture with dependency injection

## Simplified System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                Daily Login Assistant Bot                    │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐          │
│  │ Scheduler   │  │Login Engine │  │ Notifier    │          │
│  │ Service     │  │ Service     │  │ Service     │          │
│  └─────────────┘  └─────────────┘  └─────────────┘          │
│         │                 │                 │               │
│         └─────────────────┼─────────────────┘               │
│                           │                                 │
│  ┌─────────────────────────┼───────────────────────────────┐ │
│  │               Task Queue (In-Memory)                   │ │
│  │  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐      │ │
│  │  │Login Tasks  │ │Failed Tasks │ │  Completed  │      │ │
│  │  │   Array     │ │   Array     │ │   Tasks     │      │ │
│  │  └─────────────┘ └─────────────┘ └─────────────┘      │ │
│  └─────────────────────────────────────────────────────────┘ │
│                           │                                 │
│  ┌─────────────────────────┼───────────────────────────────┐ │
│  │                File Storage                           │ │
│  │  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐      │ │
│  │  │Chrome       │ │YAML Config  │ │   Logs      │      │ │
│  │  │Profiles     │ │   Files     │ │  & Status   │      │ │
│  │  └─────────────┘ └─────────────┘ └─────────────┘      │ │
│  └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
         │                           │
┌─────────────┐          ┌─────────────────────────────────────┐
│  Shoutrrr   │          │        Target Websites             │
│ CLI Notif   │          │ (Discord, Email, Slack, etc.)       │
└─────────────┘          └─────────────────────────────────────┘
```

## Project Structure

```
daily-login-assistant/
├── src/
│   ├── core/                      # Core business logic
│   │   ├── interfaces/            # TypeScript interfaces
│   │   ├── entities/              # Business entities
│   │   └── types.ts               # Dependency injection types
│   ├── infrastructure/            # External concerns
│   │   ├── browser/               # Playwright browser service
│   │   ├── config/                # YAML configuration service
│   │   ├── storage/               # File-based storage
│   │   ├── notifications/         # Shoutrrr notification service
│   │   └── logging/               # Simple file logging
│   ├── application/               # Application services
│   │   ├── services/              # Login and scheduler services
│   │   └── handlers/              # Task handlers
│   └── config/                    # Configuration schemas
├── config/                        # Configuration files
│   ├── websites.yaml              # Website configurations
│   └── settings.yaml              # Application settings
├── profiles/                      # Chrome profile storage
├── logs/                          # Application logs
├── tests/                         # Test suites
├── docker/                        # Docker configuration
│   └── Dockerfile                 # Simple container
└── scripts/                       # Utility scripts
```

## Core Components Implementation

### 1. Simplified Container

```typescript
// src/core/container.ts
import { Container } from 'inversify';
import { TYPES } from './types';
import {
  IBrowserService,
  IConfigService,
  INotificationService,
  IStorageService,
  ILoggingService
} from './interfaces';

const container = new Container();

// Infrastructure bindings
container.bind<IBrowserService>(TYPES.BrowserService).to(PlaywrightBrowserService);
container.bind<IConfigService>(TYPES.ConfigService).to(YamlConfigService);
container.bind<INotificationService>(TYPES.NotificationService).to(ShoutrrNotificationService);
container.bind<IStorageService>(TYPES.StorageService).to(FileStorageService);
container.bind<ILoggingService>(TYPES.LoggingService).to(FileLoggingService);

export { container };
```

### 2. In-Memory Task Queue

```typescript
// src/application/services/task-queue.service.ts
import { injectable } from 'inversify';
import { LoginTask, TaskStatus } from '../../core/entities';

@injectable()
export class InMemoryTaskQueue {
  private pendingTasks: LoginTask[] = [];
  private processingTasks: LoginTask[] = [];
  private completedTasks: LoginTask[] = [];
  private failedTasks: LoginTask[] = [];

  enqueue(task: LoginTask): void {
    this.pendingTasks.push(task);
  }

  dequeue(): LoginTask | null {
    const task = this.pendingTasks.shift();
    if (task) {
      task.status = TaskStatus.PROCESSING;
      this.processingTasks.push(task);
    }
    return task || null;
  }

  complete(taskId: string): void {
    const index = this.processingTasks.findIndex(t => t.id === taskId);
    if (index >= 0) {
      const task = this.processingTasks.splice(index, 1)[0];
      task.status = TaskStatus.COMPLETED;
      this.completedTasks.push(task);
    }
  }

  fail(taskId: string, error: string): void {
    const index = this.processingTasks.findIndex(t => t.id === taskId);
    if (index >= 0) {
      const task = this.processingTasks.splice(index, 1)[0];
      task.status = TaskStatus.FAILED;
      task.errorMessage = error;
      this.failedTasks.push(task);
    }
  }

  getQueueSize(): number {
    return this.pendingTasks.length;
  }

  getFailedTasks(): LoginTask[] {
    return [...this.failedTasks];
  }
}
```

### 3. Shoutrrr Notification Service

```typescript
// src/infrastructure/notifications/shoutrrr-notification.service.ts
import { injectable, inject } from 'inversify';
import { spawn } from 'child_process';
import { INotificationService, ILoggingService } from '../../core/interfaces';
import { TYPES } from '../../core/types';

@injectable()
export class ShoutrrNotificationService implements INotificationService {
  constructor(
    @inject(TYPES.LoggingService) private logger: ILoggingService
  ) {}

  async sendNotification(
    title: string,
    message: string,
    severity: 'info' | 'warning' | 'error' = 'info'
  ): Promise<void> {
    const urls = process.env.NOTIFICATION_URLS?.split(',') || [];

    if (urls.length === 0) {
      this.logger.warn('No notification URLs configured');
      return;
    }

    const formattedMessage = `[${severity.toUpperCase()}] ${title}\n${message}`;

    for (const url of urls) {
      try {
        await this.sendToUrl(url.trim(), formattedMessage);
      } catch (error) {
        this.logger.error(`Failed to send notification to ${url}`, error as Error);
      }
    }
  }

  private sendToUrl(url: string, message: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const process = spawn('shoutrrr', ['send', url, message]);

      process.on('close', (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`Shoutrrr process exited with code ${code}`));
        }
      });

      process.on('error', (error) => {
        reject(error);
      });
    });
  }

  async sendLoginSuccess(websiteName: string, accountId: string): Promise<void> {
    await this.sendNotification(
      'Login Success',
      `Successfully logged into ${websiteName} for account ${accountId}`,
      'info'
    );
  }

  async sendLoginFailure(websiteName: string, accountId: string, error: string): Promise<void> {
    await this.sendNotification(
      'Login Failed',
      `Failed to login to ${websiteName} for account ${accountId}\nError: ${error}`,
      'error'
    );
  }

  async sendDailySummary(totalLogins: number, successCount: number, failureCount: number): Promise<void> {
    await this.sendNotification(
      'Daily Login Summary',
      `Completed ${totalLogins} login attempts\n✅ Successful: ${successCount}\n❌ Failed: ${failureCount}`,
      failureCount > 0 ? 'warning' : 'info'
    );
  }
}
```

### 4. Simplified Configuration

```typescript
// src/infrastructure/config/yaml-config.service.ts
import { injectable } from 'inversify';
import { IConfigService } from '../../core/interfaces';
import yaml from 'js-yaml';
import fs from 'fs';
import { promises as fsPromises } from 'fs';
import path from 'path';

@injectable()
export class YamlConfigService implements IConfigService {
  private config: any;
  private watchers: (() => void)[] = [];

  async loadConfig(configPath: string): Promise<void> {
    const content = await fsPromises.readFile(configPath, 'utf8');
    this.config = yaml.load(content);
    this.watchForChanges(configPath);
  }

  getWebsiteConfig(websiteId: string): any {
    return this.config?.websites?.find((w: any) => w.id === websiteId);
  }

  getAllWebsiteConfigs(): any[] {
    return this.config?.websites || [];
  }

  getAppSettings(): any {
    return this.config?.settings || {};
  }

  onConfigChange(callback: () => void): void {
    this.watchers.push(callback);
  }

  private watchForChanges(configPath: string): void {
    fs.watchFile(configPath, { interval: 1000 }, () => {
      this.loadConfig(configPath)
        .then(() => this.notifyWatchers())
        .catch(console.error);
    });
  }

  private notifyWatchers(): void {
    this.watchers.forEach(callback => callback());
  }
}
```

### 5. Main Application

```typescript
// src/index.ts
import 'reflect-metadata';
import { container } from './core/container';
import { LoginService } from './application/services/login.service';
import { SchedulerService } from './application/services/scheduler.service';
import { IConfigService, INotificationService } from './core/interfaces';
import { TYPES } from './core/types';

async function main() {
  try {
    // Initialize configuration
    const configService = container.get<IConfigService>(TYPES.ConfigService);
    await configService.loadConfig('./config/websites.yaml');

    // Initialize services
    const loginService = container.get<LoginService>(TYPES.LoginService);
    const schedulerService = container.get<SchedulerService>(TYPES.SchedulerService);
    const notificationService = container.get<INotificationService>(TYPES.NotificationService);

    // Start scheduler
    await schedulerService.start();

    // Send startup notification
    await notificationService.sendNotification(
      'Bot Started',
      'Daily Login Assistant Bot has started successfully',
      'info'
    );

    console.log('Daily Login Assistant Bot started successfully');

    // Graceful shutdown
    process.on('SIGINT', async () => {
      console.log('Shutting down...');
      await schedulerService.stop();
      await notificationService.sendNotification(
        'Bot Stopped',
        'Daily Login Assistant Bot has been shut down',
        'info'
      );
      process.exit(0);
    });

  } catch (error) {
    console.error('Failed to start application:', error);
    process.exit(1);
  }
}

main().catch(console.error);
```

## Configuration Files

### Website Configuration (config/websites.yaml)

```yaml
websites:
  - id: website1
    name: "Example Site 1"
    url: "https://example1.com/login"
    enabled: true
    schedule:
      time: "09:00"
      timezone: "America/New_York"
    credentials:
      username_env: "SITE1_USERNAME"
      password_env: "SITE1_PASSWORD"
    selectors:
      username: ["#username", "[name='email']", ".login-username"]
      password: ["#password", "[name='password']", ".login-password"]
      loginButton: ["#login", ".login-btn", "[type='submit']"]
      checkinButton: [".checkin", "#daily-checkin", ".attendance"]
      logoutIndicator: [".logout", ".profile-menu", ".user-dropdown"]
    automation:
      waitForNetworkIdle: true
      typingDelay: 100
      navigationTimeout: 30000
      retryAttempts: 3
      retryDelay: 5000
    security:
      useStealth: true
      antiDetection: true
      randomDelays: true

  - id: website2
    name: "Example Site 2"
    url: "https://example2.com/signin"
    enabled: true
    schedule:
      time: "10:30"
      timezone: "America/New_York"
    # ... similar configuration
```

### Application Settings (config/settings.yaml)

```yaml
settings:
  global:
    defaultTimeout: 30000
    maxConcurrentTasks: 2
    logLevel: "info"
    retryFailedTasksAfter: 3600000  # 1 hour

  notifications:
    sendOnSuccess: true
    sendOnFailure: true
    sendDailySummary: true
    summaryTime: "20:00"

  browser:
    headless: true
    userDataDir: "./profiles"
    args:
      - "--no-sandbox"
      - "--disable-dev-shm-usage"
      - "--disable-gpu"
```

## Docker Configuration

```dockerfile
# Dockerfile
FROM oven-sh/bun:latest

WORKDIR /app

# Install shoutrrr (nicholas-fedor fork)
RUN apt-get update && apt-get install -y wget && \
    wget -O /usr/local/bin/shoutrrr https://github.com/nicholas-fedor/shoutrrr/releases/latest/download/shoutrrr_linux_amd64 && \
    chmod +x /usr/local/bin/shoutrrr

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./

# Install dependencies
RUN bun install

# Copy source code
COPY src/ ./src/
COPY config/ ./config/

# Build application
RUN bun run build

# Create directories
RUN mkdir -p profiles logs

# Start application
CMD ["bun", "run", "start"]
```

## Environment Variables

```bash
# Notification URLs (comma-separated)
NOTIFICATION_URLS="discord://token@channel,slack://token@channel,smtp://user:pass@host:587/?from=bot@example.com&to=admin@example.com"

# Website credentials
SITE1_USERNAME="your_username"
SITE1_PASSWORD="your_password"
SITE2_USERNAME="your_username"
SITE2_PASSWORD="your_password"

# Application settings
NODE_ENV="production"
LOG_LEVEL="info"
```

## Shoutrrr Integration

### Supported Notification Services

- **Discord**: `discord://token@channel`
- **Slack**: `slack://token@channel`
- **Email**: `smtp://user:pass@host:587/?from=bot@example.com&to=admin@example.com`
- **Telegram**: `telegram://token@chat_id`
- **Teams**: `teams://webhook_url`
- **And many more...**

### Installation

```bash
# Install shoutrrr CLI (Linux/macOS) - Using nicholas-fedor fork
wget -O shoutrrr https://github.com/nicholas-fedor/shoutrrr/releases/latest/download/shoutrrr_linux_amd64
chmod +x shoutrrr
sudo mv shoutrrr /usr/local/bin/

# Or via Go (nicholas-fedor fork)
go install github.com/nicholas-fedor/shoutrrr@latest
```

## Development Commands

```bash
# Install dependencies
bun install

# Start development
bun run dev

# Run tests
bun run test

# Build for production
bun run build

# Start production
bun run start

# Build Docker image
docker build -t daily-login-assistant .

# Run with Docker
docker run -d \
  --name daily-login-bot \
  -v $(pwd)/config:/app/config \
  -v $(pwd)/profiles:/app/profiles \
  -v $(pwd)/logs:/app/logs \
  -e NOTIFICATION_URLS="your_notification_urls" \
  -e SITE1_USERNAME="username" \
  -e SITE1_PASSWORD="password" \
  daily-login-assistant
```

## Key Simplifications

1. **No Redis Queue**: Simple in-memory task queue for < 10 websites
2. **No Prometheus/Grafana**: Replaced with shoutrrr notifications
3. **No Vault**: Environment variables for credentials
4. **File-based Storage**: Local file system instead of databases
5. **Single Process**: No need for multiple workers
6. **Simplified Architecture**: Clean but minimal dependency injection

## Success Metrics

- **Reliability**: >95% successful login rate
- **Performance**: <60 seconds per login attempt
- **Simplicity**: <500 lines of core application code
- **Maintainability**: Clear separation of concerns
- **Notifications**: Real-time alerts for failures and daily summaries

This simplified architecture provides all essential functionality while being much easier to deploy, maintain, and understand for small-scale operations.