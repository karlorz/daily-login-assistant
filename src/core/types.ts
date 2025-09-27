export const TYPES = {
  // Core Services
  TaskQueue: Symbol.for("TaskQueue"),
  ConfigService: Symbol.for("ConfigService"),
  MonitoringService: Symbol.for("MonitoringService"),
  NotificationService: Symbol.for("NotificationService"),
  BrowserService: Symbol.for("BrowserService"),
  LoginService: Symbol.for("LoginService"),

  // Development Services
  DevWebhookListener: Symbol.for("DevWebhookListener"),
} as const;
