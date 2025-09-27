export interface IRetryStrategy {
  shouldRetry(error: Error, attempt: number): boolean;
  getDelay(attempt: number): number;
  getMaxAttempts(): number;
}

export class RetryOptions {
  constructor(
    public maxAttempts: number = 3,
    public baseDelay: number = 1000,
    public maxDelay: number = 30000,
    public backoffMultiplier: number = 2,
    public jitter: boolean = true,
  ) {}
}
