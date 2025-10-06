import { IConfigService } from "../../core/interfaces";
import {
  WebsiteConfig,
  WebsiteSelectors,
  AutomationConfig,
  SecurityConfig,
  ScheduleConfig,
} from "../../core/entities";
import yaml from "js-yaml";
import fs from "fs";
import { promises as fsPromises } from "fs";

interface ConfigData {
  websites?: WebsiteConfigData[];
  settings?: any;
}

interface WebsiteConfigData {
  id: string;
  url: string;
  name: string;
  enabled: boolean;
  schedule: {
    time: string;
    timezone: string;
  };
  credentials: {
    username_env: string;
    password_env: string;
  };
  selectors: {
    username: string[];
    password: string[];
    loginButton: string[];
    checkinButton: string[];
    logoutIndicator: string[];
  };
  automation: {
    navigationTimeout: number;
    typingDelay: number;
    waitForNetworkIdle: boolean;
    retryAttempts?: number;
    retryDelay?: number;
  };
  security: {
    useStealth: boolean;
    antiDetection: boolean;
    randomDelays: boolean;
    requireTwoFactor?: boolean;
    captchaService?: string;
    userAgentRotation?: boolean;
    proxyRequired?: boolean;
  };
}

export class YamlConfigService implements IConfigService {
  private config: ConfigData = {};
  private watchers: (() => void)[] = [];
  private configPath: string = "";

  async loadConfig(configPath: string): Promise<void> {
    try {
      this.configPath = configPath;
      const content = await fsPromises.readFile(configPath, "utf8");
      this.config = yaml.load(content) as ConfigData;
      this.watchForChanges(configPath);
      console.log(`Configuration loaded from ${configPath}`);
    } catch (error) {
      console.error(`Failed to load configuration from ${configPath}:`, error);
      throw error;
    }
  }

  async reloadConfig(): Promise<void> {
    if (this.configPath) {
      await this.loadConfig(this.configPath);
    }
  }

  async validateConfig(): Promise<boolean> {
    try {
      if (!this.config || !this.config.websites) {
        return false;
      }

      for (const website of this.config.websites) {
        if (!website.id || !website.name || !website.url) {
          return false;
        }

        if (!website.credentials?.username_env || !website.credentials?.password_env) {
          return false;
        }

        if (!website.selectors?.username || !website.selectors?.password || !website.selectors?.loginButton) {
          return false;
        }
      }

      return true;
    } catch (error) {
      console.error('Config validation failed:', error);
      return false;
    }
  }

  async getWebsiteConfig(websiteId: string): Promise<WebsiteConfig | null> {
    const websiteData = this.config?.websites?.find((w) => w.id === websiteId);
    if (!websiteData) {
      return null;
    }
    return this.parseWebsiteConfig(websiteData);
  }

  async getAllWebsiteConfigs(): Promise<WebsiteConfig[]> {
    if (!this.config?.websites) {
      return [];
    }
    return this.config.websites
      .filter(w => w.enabled)
      .map((websiteData) => this.parseWebsiteConfig(websiteData));
  }

  getAppSettings(): any {
    return this.config?.settings || {};
  }

  onConfigChange(callback: () => void): void {
    this.watchers.push(callback);
  }

  private parseWebsiteConfig(data: WebsiteConfigData): WebsiteConfig {
    const selectors = new WebsiteSelectors(
      data.selectors.username,
      data.selectors.password,
      data.selectors.loginButton,
      data.selectors.checkinButton,
      data.selectors.logoutIndicator,
    );

    const automation = new AutomationConfig(
      data.automation.waitForNetworkIdle,
      data.automation.typingDelay,
      data.automation.navigationTimeout,
      data.automation.retryAttempts || 3,
      data.automation.retryDelay || 5000,
    );

    const security = new SecurityConfig(
      data.security.requireTwoFactor || false,
      data.security.captchaService || 'none',
      data.security.userAgentRotation || false,
      data.security.proxyRequired || false,
    );

    const schedule = data.schedule ? new ScheduleConfig(
      data.schedule.time,
      data.schedule.timezone
    ) : undefined;

    return new WebsiteConfig(
      data.id,
      data.name,
      data.url,
      selectors,
      automation,
      security,
      schedule,
    );
  }

  private watchForChanges(configPath: string): void {
    try {
      fs.watchFile(configPath, { interval: 1000 }, () => {
        this.loadConfig(configPath)
          .then(() => this.notifyWatchers())
          .catch((error) => console.error("Failed to reload config:", error));
      });
    } catch (error) {
      console.error("Failed to setup config watcher:", error);
    }
  }

  private notifyWatchers(): void {
    this.watchers.forEach(callback => callback());
  }
}
