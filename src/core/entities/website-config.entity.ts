export class WebsiteConfig {
  constructor(
    public id: string,
    public name: string,
    public url: string,
    public selectors: WebsiteSelectors,
    public automation: AutomationConfig = new AutomationConfig(),
    public security: SecurityConfig = new SecurityConfig(),
    public schedule?: ScheduleConfig,
  ) {}
}

export class WebsiteSelectors {
  constructor(
    public username: string[],
    public password: string[],
    public loginButton: string[],
    public checkinButton: string[],
    public logoutIndicator: string[],
  ) {}
}

export class AutomationConfig {
  constructor(
    public waitForNetworkIdle: boolean = true,
    public typingDelay: number = 100,
    public navigationTimeout: number = 30000,
    public retryAttempts: number = 3,
    public retryDelay: number = 5000,
  ) {}
}

export class SecurityConfig {
  constructor(
    public requireTwoFactor: boolean = false,
    public captchaService?: string,
    public userAgentRotation: boolean = true,
    public proxyRequired: boolean = false,
  ) {}
}

export class ScheduleConfig {
  constructor(
    public time: string,
    public timezone: string = 'UTC',
  ) {}
}
