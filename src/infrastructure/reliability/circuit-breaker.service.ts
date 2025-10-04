import { injectable } from 'inversify';

export interface CircuitBreakerStats {
  websiteId: string;
  failureCount: number;
  isOpen: boolean;
  openedAt?: number;
  willResetAt?: number;
}

@injectable()
export class CircuitBreaker {
  private failures = new Map<string, number>();
  private openCircuits = new Map<string, number>();
  private readonly threshold: number;
  private readonly resetTime: number;

  constructor(threshold: number = 5, resetTimeMs: number = 300000) {
    this.threshold = threshold;
    this.resetTime = resetTimeMs;
  }

  /**
   * Record a failure for a website
   * Opens the circuit if failure threshold is reached
   */
  recordFailure(websiteId: string): void {
    const count = (this.failures.get(websiteId) || 0) + 1;
    this.failures.set(websiteId, count);

    if (count >= this.threshold) {
      this.openCircuit(websiteId);
    }
  }

  /**
   * Record a successful operation
   * Resets the failure count for the website
   */
  recordSuccess(websiteId: string): void {
    this.failures.set(websiteId, 0);

    // If circuit was open, close it
    if (this.openCircuits.has(websiteId)) {
      this.closeCircuit(websiteId);
    }
  }

  /**
   * Check if the circuit is open for a website
   * Automatically closes the circuit if reset time has passed
   */
  isCircuitOpen(websiteId: string): boolean {
    const openTime = this.openCircuits.get(websiteId);
    if (!openTime) return false;

    // Check if reset time has passed
    if (Date.now() - openTime > this.resetTime) {
      this.closeCircuit(websiteId);
      return false;
    }

    return true;
  }

  /**
   * Get the current failure count for a website
   */
  getFailureCount(websiteId: string): number {
    return this.failures.get(websiteId) || 0;
  }

  /**
   * Get statistics for a specific website
   */
  getStats(websiteId: string): CircuitBreakerStats {
    const failureCount = this.getFailureCount(websiteId);
    const openTime = this.openCircuits.get(websiteId);
    const isOpen = this.isCircuitOpen(websiteId);

    return {
      websiteId,
      failureCount,
      isOpen,
      openedAt: openTime,
      willResetAt: openTime ? openTime + this.resetTime : undefined,
    };
  }

  /**
   * Get statistics for all websites
   */
  getAllStats(): CircuitBreakerStats[] {
    const allWebsites = new Set([
      ...this.failures.keys(),
      ...this.openCircuits.keys(),
    ]);

    return Array.from(allWebsites).map(websiteId => this.getStats(websiteId));
  }

  /**
   * Manually reset the circuit for a website
   */
  reset(websiteId: string): void {
    this.failures.set(websiteId, 0);
    this.openCircuits.delete(websiteId);
  }

  /**
   * Reset all circuits
   */
  resetAll(): void {
    this.failures.clear();
    this.openCircuits.clear();
  }

  private openCircuit(websiteId: string): void {
    this.openCircuits.set(websiteId, Date.now());
    console.warn(`⚠️  Circuit breaker OPENED for ${websiteId} (${this.threshold} failures)`);
  }

  private closeCircuit(websiteId: string): void {
    this.openCircuits.delete(websiteId);
    this.failures.set(websiteId, 0);
    console.log(`✅ Circuit breaker CLOSED for ${websiteId} (reset time passed)`);
  }
}
