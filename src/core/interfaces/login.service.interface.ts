import { LoginTask } from "../entities/index.js";

export interface ILoginService {
  processLoginTask(task: LoginTask): Promise<boolean>;
  processCheckinTask(task: LoginTask): Promise<boolean>;
  validateCredentials(accountId: string, websiteId: string): Promise<boolean>;
  getMetrics(): Record<string, unknown>;
}
