export interface IHealthCheckService {
  performHealthCheck(): Promise<HealthCheckResult>;
  performComponentHealthCheck(component: string): Promise<ComponentHealth>;
}

export interface HealthCheckResult {
  healthy: boolean;
  components: Record<string, ComponentHealth>;
  timestamp: string;
  uptime: number;
}

export interface ComponentHealth {
  healthy: boolean;
  responseTime?: number;
  error?: string;
  details?: Record<string, unknown>;
}
