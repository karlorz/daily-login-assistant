export interface IMonitoringService {
  recordLoginAttempt(
    websiteId: string,
    accountId: string,
    status: "failed" | "success",
  ): void;
  recordError(
    type: string,
    component: string,
    severity: "low" | "medium" | "high" | "critical",
  ): void;
  recordLatency(operation: string, durationMs: number): void;
  getStats(): {
    totalLogins: number;
    successfulLogins: number;
    failedLogins: number;
    averageLatency: number;
  };
}
