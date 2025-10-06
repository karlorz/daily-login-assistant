import { LoginTask, TaskStatus } from '../../core/entities';

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

  retry(taskId: string): void {
    const index = this.failedTasks.findIndex(t => t.id === taskId);
    if (index >= 0) {
      const task = this.failedTasks.splice(index, 1)[0];
      task.status = TaskStatus.PENDING;
      task.attempt = (task.attempt || 0) + 1;
      this.pendingTasks.push(task);
    }
  }

  getQueueSize(): number {
    return this.pendingTasks.length;
  }

  getProcessingCount(): number {
    return this.processingTasks.length;
  }

  getCompletedTasks(): LoginTask[] {
    return [...this.completedTasks];
  }

  getFailedTasks(): LoginTask[] {
    return [...this.failedTasks];
  }

  getAllTasks(): {
    pending: LoginTask[];
    processing: LoginTask[];
    completed: LoginTask[];
    failed: LoginTask[];
  } {
    return {
      pending: [...this.pendingTasks],
      processing: [...this.processingTasks],
      completed: [...this.completedTasks],
      failed: [...this.failedTasks]
    };
  }

  clearCompleted(): void {
    this.completedTasks = [];
  }

  clearFailed(): void {
    this.failedTasks = [];
  }
}