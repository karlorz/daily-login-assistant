export const TYPES = {
  // Core Services
  TaskQueue: Symbol.for("TaskQueue"),
  ConfigService: Symbol.for("ConfigService"),
  MonitoringService: Symbol.for("MonitoringService"),
  NotificationService: Symbol.for("NotificationService"),
  BrowserService: Symbol.for("BrowserService"),
  LoginService: Symbol.for("LoginService"),

  // Reliability Services
  CircuitBreaker: Symbol.for("CircuitBreaker"),

  // Development Services
  DevWebhookListener: Symbol.for("DevWebhookListener"),
} as const;
