export enum TaskStatus {
  PENDING = "pending",
  PROCESSING = "processing",
  COMPLETED = "completed",
  FAILED = "failed",
  RETRYING = "retrying",
}

export enum TaskPriority {
  LOW = 1,
  NORMAL = 2,
  HIGH = 3,
  CRITICAL = 4,
}

export class LoginTask {
  constructor(
    public id: string,
    public accountId: string,
    public websiteId: string,
    public priority: TaskPriority = TaskPriority.NORMAL,
    public scheduledAt: Date = new Date(),
    public maxAttempts: number = 3,
    public status: TaskStatus = TaskStatus.PENDING,
    public attempt: number = 1,
    public createdAt: Date = new Date(),
    public lastAttempt?: Date,
    public errorMessage?: string,
    public messageId?: string,
  ) {}

  markAsProcessing(): void {
    this.status = TaskStatus.PROCESSING;
    this.lastAttempt = new Date();
  }

  markAsCompleted(): void {
    this.status = TaskStatus.COMPLETED;
    this.lastAttempt = new Date();
  }

  markAsFailed(error: string): void {
    this.status = TaskStatus.FAILED;
    this.errorMessage = error;
    this.lastAttempt = new Date();
  }

  markForRetry(): void {
    this.status = TaskStatus.RETRYING;
    this.attempt++;
    this.lastAttempt = new Date();
  }

  canRetry(): boolean {
    return this.attempt < this.maxAttempts;
  }

  isReady(): boolean {
    return this.scheduledAt <= new Date();
  }
}
