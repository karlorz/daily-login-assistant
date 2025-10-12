import { WebsiteConfig } from "../entities/index.js";

export interface IConfigService {
  loadConfig(path: string): Promise<void>;
  getWebsiteConfig(websiteId: string): Promise<WebsiteConfig | null>;
  getAllWebsiteConfigs(): Promise<WebsiteConfig[]>;
  reloadConfig(): Promise<void>;
  onConfigChange(callback: () => void): void;
  validateConfig(): Promise<boolean>;
}
