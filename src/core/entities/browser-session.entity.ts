import { BrowserContext, Page } from "playwright";

export class BrowserSession {
  constructor(
    public id: string,
    public context: BrowserContext,
    public page: Page,
    public accountId: string,
    public websiteId: string,
    public createdAt: Date = new Date(),
    public lastActivity?: Date,
    public isActive: boolean = true,
  ) {}

  updateActivity(): void {
    this.lastActivity = new Date();
  }

  async close(): Promise<void> {
    this.isActive = false;
    await this.context.close();
  }

  isStale(timeoutMinutes: number = 30): boolean {
    if (!this.lastActivity) return false;
    const staleTime = new Date(this.lastActivity);
    staleTime.setMinutes(staleTime.getMinutes() + timeoutMinutes);
    return staleTime <= new Date();
  }
}
