export const TYPES = {
  // Core Services
  TaskQueue: Symbol.for("TaskQueue"),
  ConfigService: Symbol.for("ConfigService"),
  MonitoringService: Symbol.for("MonitoringService"),
  NotificationService: Symbol.for("NotificationService"),
} as const;
