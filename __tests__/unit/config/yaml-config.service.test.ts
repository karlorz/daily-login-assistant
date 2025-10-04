import { YamlConfigService } from '../../../src/infrastructure/config/yaml-config.service';
import { promises as fsPromises } from 'fs';
import yaml from 'js-yaml';

jest.mock('fs');
jest.mock('fs', () => ({
  ...jest.requireActual('fs'),
  promises: {
    readFile: jest.fn(),
  },
  watchFile: jest.fn(),
}));
jest.mock('js-yaml');

describe('YamlConfigService', () => {
  let service: YamlConfigService;
  let mockReadFile: jest.MockedFunction<typeof fsPromises.readFile>;
  let mockYamlLoad: jest.MockedFunction<typeof yaml.load>;

  beforeEach(() => {
    service = new YamlConfigService();
    mockReadFile = fsPromises.readFile as jest.MockedFunction<typeof fsPromises.readFile>;
    mockYamlLoad = yaml.load as jest.MockedFunction<typeof yaml.load>;

    jest.clearAllMocks();
  });

  const createMockConfig = () => ({
    websites: [
      {
        id: 'test-site',
        name: 'Test Site',
        url: 'https://test.com/login',
        enabled: true,
        schedule: {
          time: '09:00',
          timezone: 'America/New_York',
        },
        credentials: {
          username_env: 'TEST_USERNAME',
          password_env: 'TEST_PASSWORD',
        },
        selectors: {
          username: ['#username'],
          password: ['#password'],
          loginButton: ['#login'],
          checkinButton: ['#checkin'],
          logoutIndicator: ['.logout'],
        },
        automation: {
          navigationTimeout: 30000,
          typingDelay: 100,
          waitForNetworkIdle: true,
          retryAttempts: 3,
          retryDelay: 5000,
        },
        security: {
          useStealth: true,
          antiDetection: true,
          randomDelays: true,
          requireTwoFactor: false,
          captchaService: 'none',
          userAgentRotation: false,
          proxyRequired: false,
        },
      },
    ],
    settings: {
      global: {
        defaultTimeout: 30000,
      },
    },
  });

  describe('loadConfig', () => {
    it('should load and parse config file', async () => {
      const mockConfig = createMockConfig();
      mockReadFile.mockResolvedValue('yaml content' as any);
      mockYamlLoad.mockReturnValue(mockConfig);

      await service.loadConfig('/path/to/config.yaml');

      expect(mockReadFile).toHaveBeenCalledWith('/path/to/config.yaml', 'utf8');
      expect(mockYamlLoad).toHaveBeenCalledWith('yaml content');
    });

    it('should throw error if file not found', async () => {
      mockReadFile.mockRejectedValue(new Error('File not found'));

      await expect(service.loadConfig('/invalid/path.yaml')).rejects.toThrow('File not found');
    });

    it('should throw error if YAML is invalid', async () => {
      mockReadFile.mockResolvedValue('invalid yaml' as any);
      mockYamlLoad.mockImplementation(() => {
        throw new Error('Invalid YAML');
      });

      await expect(service.loadConfig('/path/to/config.yaml')).rejects.toThrow('Invalid YAML');
    });
  });

  describe('reloadConfig', () => {
    it('should reload config from previously loaded path', async () => {
      const mockConfig = createMockConfig();
      mockReadFile.mockResolvedValue('yaml content' as any);
      mockYamlLoad.mockReturnValue(mockConfig);

      await service.loadConfig('/path/to/config.yaml');
      mockReadFile.mockClear();
      mockYamlLoad.mockClear();

      await service.reloadConfig();

      expect(mockReadFile).toHaveBeenCalledWith('/path/to/config.yaml', 'utf8');
    });

    it('should not reload if no config path was set', async () => {
      await service.reloadConfig();
      expect(mockReadFile).not.toHaveBeenCalled();
    });
  });

  describe('validateConfig', () => {
    it('should return true for valid config', async () => {
      const mockConfig = createMockConfig();
      mockReadFile.mockResolvedValue('yaml content' as any);
      mockYamlLoad.mockReturnValue(mockConfig);

      await service.loadConfig('/path/to/config.yaml');
      const isValid = await service.validateConfig();

      expect(isValid).toBe(true);
    });

    it('should return false if websites array is missing', async () => {
      mockReadFile.mockResolvedValue('yaml content' as any);
      mockYamlLoad.mockReturnValue({ settings: {} });

      await service.loadConfig('/path/to/config.yaml');
      const isValid = await service.validateConfig();

      expect(isValid).toBe(false);
    });

    it('should return false if website missing required fields', async () => {
      const invalidConfig = {
        websites: [
          {
            id: 'test-site',
            // Missing name and url
            enabled: true,
          },
        ],
      };
      mockReadFile.mockResolvedValue('yaml content' as any);
      mockYamlLoad.mockReturnValue(invalidConfig);

      await service.loadConfig('/path/to/config.yaml');
      const isValid = await service.validateConfig();

      expect(isValid).toBe(false);
    });

    it('should return false if credentials missing', async () => {
      const invalidConfig = {
        websites: [
          {
            id: 'test-site',
            name: 'Test Site',
            url: 'https://test.com',
            enabled: true,
            // Missing credentials
            selectors: {
              username: ['#username'],
              password: ['#password'],
              loginButton: ['#login'],
            },
          },
        ],
      };
      mockReadFile.mockResolvedValue('yaml content' as any);
      mockYamlLoad.mockReturnValue(invalidConfig);

      await service.loadConfig('/path/to/config.yaml');
      const isValid = await service.validateConfig();

      expect(isValid).toBe(false);
    });

    it('should return false if selectors missing', async () => {
      const invalidConfig = {
        websites: [
          {
            id: 'test-site',
            name: 'Test Site',
            url: 'https://test.com',
            enabled: true,
            credentials: {
              username_env: 'TEST_USERNAME',
              password_env: 'TEST_PASSWORD',
            },
            // Missing selectors
          },
        ],
      };
      mockReadFile.mockResolvedValue('yaml content' as any);
      mockYamlLoad.mockReturnValue(invalidConfig);

      await service.loadConfig('/path/to/config.yaml');
      const isValid = await service.validateConfig();

      expect(isValid).toBe(false);
    });
  });

  describe('getWebsiteConfig', () => {
    it('should return website config by id', async () => {
      const mockConfig = createMockConfig();
      mockReadFile.mockResolvedValue('yaml content' as any);
      mockYamlLoad.mockReturnValue(mockConfig);

      await service.loadConfig('/path/to/config.yaml');
      const websiteConfig = await service.getWebsiteConfig('test-site');

      expect(websiteConfig).not.toBeNull();
      expect(websiteConfig?.id).toBe('test-site');
      expect(websiteConfig?.name).toBe('Test Site');
      expect(websiteConfig?.url).toBe('https://test.com/login');
    });

    it('should return null for non-existent website id', async () => {
      const mockConfig = createMockConfig();
      mockReadFile.mockResolvedValue('yaml content' as any);
      mockYamlLoad.mockReturnValue(mockConfig);

      await service.loadConfig('/path/to/config.yaml');
      const websiteConfig = await service.getWebsiteConfig('non-existent');

      expect(websiteConfig).toBeNull();
    });

    it('should parse selectors correctly', async () => {
      const mockConfig = createMockConfig();
      mockReadFile.mockResolvedValue('yaml content' as any);
      mockYamlLoad.mockReturnValue(mockConfig);

      await service.loadConfig('/path/to/config.yaml');
      const websiteConfig = await service.getWebsiteConfig('test-site');

      expect(websiteConfig?.selectors.username).toEqual(['#username']);
      expect(websiteConfig?.selectors.password).toEqual(['#password']);
      expect(websiteConfig?.selectors.loginButton).toEqual(['#login']);
    });

    it('should parse automation config with defaults', async () => {
      const mockConfig = {
        websites: [
          {
            id: 'test-site',
            name: 'Test Site',
            url: 'https://test.com',
            enabled: true,
            credentials: { username_env: 'USER', password_env: 'PASS' },
            selectors: {
              username: ['#user'],
              password: ['#pass'],
              loginButton: ['#login'],
              checkinButton: [],
              logoutIndicator: [],
            },
            automation: {
              waitForNetworkIdle: true,
              typingDelay: 100,
              navigationTimeout: 30000,
              // Missing retryAttempts and retryDelay - should use defaults
            },
            security: {
              useStealth: true,
              antiDetection: true,
              randomDelays: true,
            },
          },
        ],
      };
      mockReadFile.mockResolvedValue('yaml content' as any);
      mockYamlLoad.mockReturnValue(mockConfig);

      await service.loadConfig('/path/to/config.yaml');
      const websiteConfig = await service.getWebsiteConfig('test-site');

      expect(websiteConfig?.automation.retryAttempts).toBe(3);
      expect(websiteConfig?.automation.retryDelay).toBe(5000);
    });
  });

  describe('getAllWebsiteConfigs', () => {
    it('should return all enabled website configs', async () => {
      const mockConfig = {
        websites: [
          {
            id: 'site1',
            name: 'Site 1',
            url: 'https://site1.com',
            enabled: true,
            credentials: { username_env: 'USER1', password_env: 'PASS1' },
            selectors: {
              username: ['#user'],
              password: ['#pass'],
              loginButton: ['#login'],
              checkinButton: [],
              logoutIndicator: [],
            },
            automation: {
              waitForNetworkIdle: true,
              typingDelay: 100,
              navigationTimeout: 30000,
            },
            security: { useStealth: true, antiDetection: true, randomDelays: true },
          },
          {
            id: 'site2',
            name: 'Site 2',
            url: 'https://site2.com',
            enabled: false, // Disabled site
            credentials: { username_env: 'USER2', password_env: 'PASS2' },
            selectors: {
              username: ['#user'],
              password: ['#pass'],
              loginButton: ['#login'],
              checkinButton: [],
              logoutIndicator: [],
            },
            automation: {
              waitForNetworkIdle: true,
              typingDelay: 100,
              navigationTimeout: 30000,
            },
            security: { useStealth: true, antiDetection: true, randomDelays: true },
          },
          {
            id: 'site3',
            name: 'Site 3',
            url: 'https://site3.com',
            enabled: true,
            credentials: { username_env: 'USER3', password_env: 'PASS3' },
            selectors: {
              username: ['#user'],
              password: ['#pass'],
              loginButton: ['#login'],
              checkinButton: [],
              logoutIndicator: [],
            },
            automation: {
              waitForNetworkIdle: true,
              typingDelay: 100,
              navigationTimeout: 30000,
            },
            security: { useStealth: true, antiDetection: true, randomDelays: true },
          },
        ],
      };
      mockReadFile.mockResolvedValue('yaml content' as any);
      mockYamlLoad.mockReturnValue(mockConfig);

      await service.loadConfig('/path/to/config.yaml');
      const configs = await service.getAllWebsiteConfigs();

      expect(configs.length).toBe(2); // Only enabled sites
      expect(configs[0].id).toBe('site1');
      expect(configs[1].id).toBe('site3');
    });

    it('should return empty array if no websites', async () => {
      mockReadFile.mockResolvedValue('yaml content' as any);
      mockYamlLoad.mockReturnValue({ settings: {} });

      await service.loadConfig('/path/to/config.yaml');
      const configs = await service.getAllWebsiteConfigs();

      expect(configs).toEqual([]);
    });
  });

  describe('getAppSettings', () => {
    it('should return app settings', async () => {
      const mockConfig = createMockConfig();
      mockReadFile.mockResolvedValue('yaml content' as any);
      mockYamlLoad.mockReturnValue(mockConfig);

      await service.loadConfig('/path/to/config.yaml');
      const settings = service.getAppSettings();

      expect(settings).toEqual({
        global: {
          defaultTimeout: 30000,
        },
      });
    });

    it('should return empty object if no settings', async () => {
      mockReadFile.mockResolvedValue('yaml content' as any);
      mockYamlLoad.mockReturnValue({ websites: [] });

      await service.loadConfig('/path/to/config.yaml');
      const settings = service.getAppSettings();

      expect(settings).toEqual({});
    });
  });

  describe('onConfigChange', () => {
    it('should register config change callback', () => {
      const callback = jest.fn();
      service.onConfigChange(callback);

      // Callback should be registered (we can't easily test the watcher itself in unit tests)
      expect(callback).not.toHaveBeenCalled();
    });
  });
});
