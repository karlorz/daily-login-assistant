import { Container } from "inversify";
import { TYPES } from "./types";

// Import implementations
import { YamlConfigService } from "../infrastructure/config/yaml-config.service";
import { SimpleMonitoringService } from "../infrastructure/monitoring/simple-monitoring.service";
import { ShoutrrNotificationService } from "../infrastructure/notifications/shoutrrr-notification.service";
import { InMemoryTaskQueue } from "../infrastructure/queue/in-memory-task-queue.service";

// Import interfaces
import {
  IConfigService,
  IMonitoringService,
  INotificationService,
} from "./interfaces";

const container = new Container();

// Core Services
container.bind<IConfigService>(TYPES.ConfigService).to(YamlConfigService);
container
  .bind<IMonitoringService>(TYPES.MonitoringService)
  .to(SimpleMonitoringService);
container
  .bind<INotificationService>(TYPES.NotificationService)
  .to(ShoutrrNotificationService);
container.bind<InMemoryTaskQueue>(TYPES.TaskQueue).to(InMemoryTaskQueue);

export { container };
