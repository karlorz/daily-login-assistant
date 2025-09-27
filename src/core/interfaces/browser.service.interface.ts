import { Page } from "playwright";
import { AccountCredentials, WebsiteConfig, BrowserSession } from "../entities";

export interface IBrowserService {
  createSession(
    accountId: string,
    websiteConfig: WebsiteConfig,
  ): Promise<BrowserSession>;
  closeSession(sessionId: string): Promise<void>;
  navigateToLogin(page: Page, websiteConfig: WebsiteConfig): Promise<void>;
  enterCredentials(
    page: Page,
    credentials: AccountCredentials,
    websiteConfig: WebsiteConfig,
  ): Promise<void>;
  performLogin(page: Page, websiteConfig: WebsiteConfig): Promise<boolean>;
  performCheckin(page: Page, websiteConfig: WebsiteConfig): Promise<boolean>;
  isAlreadyLoggedIn(page: Page, websiteConfig: WebsiteConfig): Promise<boolean>;
  findElementWithFallback(page: Page, selectors: string[]): Promise<unknown>;
  takeScreenshot(page: Page, name: string): Promise<string>;
}
