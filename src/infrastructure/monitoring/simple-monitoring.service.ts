import { injectable } from 'inversify';
import { IMonitoringService } from '../../core/interfaces';

@injectable()
export class SimpleMonitoringService implements IMonitoringService {
  private stats = {
    totalLogins: 0,
    successfulLogins: 0,
    failedLogins: 0,
    totalLatency: 0,
    errorCounts: new Map<string, number>(),
  };

  recordLoginAttempt(
    websiteId: string,
    accountId: string,
    status: "failed" | "success",
  ): void {
    this.stats.totalLogins++;

    if (status === "success") {
      this.stats.successfulLogins++;
    } else {
      this.stats.failedLogins++;
    }

    console.log(`Login attempt: ${websiteId}/${accountId} - ${status}`);
  }

  recordError(
    type: string,
    component: string,
    severity: "low" | "medium" | "high" | "critical",
  ): void {
    const errorKey = `${component}:${type}:${severity}`;
    const count = this.stats.errorCounts.get(errorKey) || 0;
    this.stats.errorCounts.set(errorKey, count + 1);

    console.log(`Error recorded: ${errorKey}`);
  }

  recordLatency(operation: string, durationMs: number): void {
    this.stats.totalLatency += durationMs;
    console.log(`Operation ${operation} took ${durationMs}ms`);
  }

  getStats(): {
    totalLogins: number;
    successfulLogins: number;
    failedLogins: number;
    averageLatency: number;
  } {
    return {
      totalLogins: this.stats.totalLogins,
      successfulLogins: this.stats.successfulLogins,
      failedLogins: this.stats.failedLogins,
      averageLatency: this.stats.totalLogins > 0
        ? this.stats.totalLatency / this.stats.totalLogins
        : 0,
    };
  }

  getErrorStats(): Map<string, number> {
    return new Map(this.stats.errorCounts);
  }

  reset(): void {
    this.stats = {
      totalLogins: 0,
      successfulLogins: 0,
      failedLogins: 0,
      totalLatency: 0,
      errorCounts: new Map<string, number>(),
    };
  }
}