import { LoginTask } from "../entities";

export interface IQueueService {
  enqueueTask(task: LoginTask): Promise<void>;
  dequeueTask(
    consumerGroup: string,
    consumerId: string,
  ): Promise<LoginTask | null>;
  acknowledgeTask(taskId: string, messageId: string): Promise<void>;
  requeueWithBackoff(task: LoginTask, attempt: number): Promise<void>;
  getQueueSize(streamName: string): Promise<number>;
  getPendingTasks(): Promise<LoginTask[]>;
  clearQueue(): Promise<void>;
  initialize(): Promise<void>;
  processRetryQueue(): Promise<number>;
  getQueueMetrics(): Promise<Record<string, unknown>>;
}
