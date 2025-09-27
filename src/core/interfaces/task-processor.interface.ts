import { LoginTask } from "../entities";

export interface ITaskProcessor {
  processTask(task: LoginTask): Promise<boolean>;
  getQueueMetrics(): Promise<Record<string, unknown>>;
  getWorkerMetrics(): Promise<Record<string, unknown>>;
}
