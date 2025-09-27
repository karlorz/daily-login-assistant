import Joi from "joi";

export const websiteSelectorsSchema = Joi.object({
  username: Joi.array().items(Joi.string()).min(1).required(),
  password: Joi.array().items(Joi.string()).min(1).required(),
  loginButton: Joi.array().items(Joi.string()).min(1).required(),
  checkinButton: Joi.array().items(Joi.string()).min(1).required(),
  logoutIndicator: Joi.array().items(Joi.string()).min(1).required(),
});

export const automationConfigSchema = Joi.object({
  waitForNetworkIdle: Joi.boolean().default(true),
  typingDelay: Joi.number().min(50).max(1000).default(100),
  navigationTimeout: Joi.number().min(5000).max(60000).default(30000),
  retryAttempts: Joi.number().min(1).max(5).default(3),
  retryDelay: Joi.number().min(1000).max(30000).default(5000),
}).default();

export const securityConfigSchema = Joi.object({
  requireTwoFactor: Joi.boolean().default(false),
  captchaService: Joi.string().valid("2captcha", "anticaptcha").optional(),
  userAgentRotation: Joi.boolean().default(true),
  proxyRequired: Joi.boolean().default(false),
}).default();

export const websiteConfigSchema = Joi.object({
  id: Joi.string().required(),
  name: Joi.string().required(),
  url: Joi.string().uri().required(),
  selectors: websiteSelectorsSchema.required(),
  automation: automationConfigSchema,
  security: securityConfigSchema,
});

export const configSchema = Joi.object({
  websites: Joi.array().items(websiteConfigSchema).min(1).required(),
  global: Joi.object({
    defaultTimeout: Joi.number().min(5000).max(120000).default(30000),
    maxConcurrentTasks: Joi.number().min(1).max(100).default(10),
    healthCheckInterval: Joi.number().min(1000).max(60000).default(30000),
    logLevel: Joi.string()
      .valid("debug", "info", "warn", "error")
      .default("info"),
  }).default(),
});
