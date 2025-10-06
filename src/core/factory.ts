/**
 * Simple Dependency Injection Factory
 * Manually wires all dependencies without heavyweight DI container
 */

import { YamlConfigService } from '../infrastructure/config/yaml-config.service';
import { ShoutrrNotificationService } from '../infrastructure/notifications/shoutrrr-notification.service';
import { InMemoryTaskQueue } from '../infrastructure/queue/in-memory-task-queue.service';
import { PlaywrightBrowserService } from '../infrastructure/browser/playwright-browser.service';
import { LoginEngine } from '../infrastructure/browser/login-engine.service';
import { CookieWebApiService } from '../infrastructure/web/cookie-web-api.service';

import type { IConfigService, INotificationService, IBrowserService, ILoginService } from './interfaces';

export class ServiceFactory {
  private static configService: IConfigService;
  private static notificationService: INotificationService;
  private static browserService: IBrowserService;
  private static loginService: ILoginService;
  private static taskQueue: InMemoryTaskQueue;
  private static cookieWebApi: CookieWebApiService;

  static getConfigService(): IConfigService {
    if (!this.configService) {
      this.configService = new YamlConfigService();
    }
    return this.configService;
  }

  static getNotificationService(): INotificationService {
    if (!this.notificationService) {
      this.notificationService = new ShoutrrNotificationService();
    }
    return this.notificationService;
  }

  static getBrowserService(): IBrowserService {
    if (!this.browserService) {
      this.browserService = new PlaywrightBrowserService();
    }
    return this.browserService;
  }

  static getLoginService(): ILoginService {
    if (!this.loginService) {
      this.loginService = new LoginEngine(
        this.getBrowserService(),
        this.getConfigService(),
        this.getNotificationService()
      );
    }
    return this.loginService;
  }

  static getTaskQueue(): InMemoryTaskQueue {
    if (!this.taskQueue) {
      this.taskQueue = new InMemoryTaskQueue();
    }
    return this.taskQueue;
  }

  static getCookieWebApi(): CookieWebApiService {
    if (!this.cookieWebApi) {
      this.cookieWebApi = new CookieWebApiService();
    }
    return this.cookieWebApi;
  }

  // Reset for testing
  static reset(): void {
    this.configService = undefined as any;
    this.notificationService = undefined as any;
    this.browserService = undefined as any;
    this.loginService = undefined as any;
    this.taskQueue = undefined as any;
    this.cookieWebApi = undefined as any;
  }
}
