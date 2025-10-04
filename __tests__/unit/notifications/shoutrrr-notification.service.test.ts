import { ShoutrrNotificationService } from '../../../src/infrastructure/notifications/shoutrrr-notification.service';
import { spawn } from 'child_process';

// Mock child_process.spawn
jest.mock('child_process');

describe('ShoutrrNotificationService', () => {
  let service: ShoutrrNotificationService;
  let mockSpawn: jest.MockedFunction<typeof spawn>;
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    service = new ShoutrrNotificationService();
    mockSpawn = spawn as jest.MockedFunction<typeof spawn>;
    originalEnv = { ...process.env };

    // Reset mock before each test
    mockSpawn.mockClear();
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  const createMockProcess = (exitCode: number = 0, error?: Error) => {
    const mockProcess = {
      stderr: {
        on: jest.fn((event, handler) => {
          if (event === 'data') {
            // Simulate stderr data if needed
          }
          return mockProcess.stderr;
        }),
      },
      on: jest.fn((event, handler) => {
        if (event === 'close') {
          setTimeout(() => handler(exitCode), 10);
        }
        if (event === 'error' && error) {
          setTimeout(() => handler(error), 10);
        }
        return mockProcess;
      }),
      kill: jest.fn(),
    };
    return mockProcess;
  };

  describe('sendNotification', () => {
    it('should send notification with info severity', async () => {
      process.env.NOTIFICATION_URLS = 'discord://token@channel';
      const mockProcess = createMockProcess(0);
      mockSpawn.mockReturnValue(mockProcess as any);

      await service.sendNotification('Test Title', 'Test message', 'info');

      expect(mockSpawn).toHaveBeenCalledWith('shoutrrr', [
        'send',
        'discord://token@channel',
        '✅ **Test Title**\nTest message',
      ]);
    });

    it('should send notification with error severity', async () => {
      process.env.NOTIFICATION_URLS = 'discord://token@channel';
      const mockProcess = createMockProcess(0);
      mockSpawn.mockReturnValue(mockProcess as any);

      await service.sendNotification('Error Title', 'Error message', 'error');

      expect(mockSpawn).toHaveBeenCalledWith('shoutrrr', [
        'send',
        'discord://token@channel',
        '❌ **Error Title**\nError message',
      ]);
    });

    it('should send notification with warning severity', async () => {
      process.env.NOTIFICATION_URLS = 'discord://token@channel';
      const mockProcess = createMockProcess(0);
      mockSpawn.mockReturnValue(mockProcess as any);

      await service.sendNotification('Warning Title', 'Warning message', 'warning');

      expect(mockSpawn).toHaveBeenCalledWith('shoutrrr', [
        'send',
        'discord://token@channel',
        '⚠️ **Warning Title**\nWarning message',
      ]);
    });

    it('should handle multiple notification URLs', async () => {
      process.env.NOTIFICATION_URLS = 'discord://token1@channel1,slack://token2@channel2';
      const mockProcess = createMockProcess(0);
      mockSpawn.mockReturnValue(mockProcess as any);

      await service.sendNotification('Test', 'Message', 'info');

      expect(mockSpawn).toHaveBeenCalledTimes(2);
      expect(mockSpawn).toHaveBeenNthCalledWith(1, 'shoutrrr', [
        'send',
        'discord://token1@channel1',
        '✅ **Test**\nMessage',
      ]);
      expect(mockSpawn).toHaveBeenNthCalledWith(2, 'shoutrrr', [
        'send',
        'slack://token2@channel2',
        '✅ **Test**\nMessage',
      ]);
    });

    it('should handle missing NOTIFICATION_URLS gracefully', async () => {
      delete process.env.NOTIFICATION_URLS;

      await expect(service.sendNotification('Test', 'Message')).resolves.not.toThrow();
      expect(mockSpawn).not.toHaveBeenCalled();
    });

    it('should continue with other URLs if one fails', async () => {
      process.env.NOTIFICATION_URLS = 'discord://token1@channel1,slack://token2@channel2';

      let callCount = 0;
      mockSpawn.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return createMockProcess(1) as any; // First call fails
        }
        return createMockProcess(0) as any; // Second call succeeds
      });

      await service.sendNotification('Test', 'Message');

      expect(mockSpawn).toHaveBeenCalledTimes(2);
    });
  });

  describe('sendLoginSuccess', () => {
    it('should send login success notification', async () => {
      process.env.NOTIFICATION_URLS = 'discord://token@channel';
      const mockProcess = createMockProcess(0);
      mockSpawn.mockReturnValue(mockProcess as any);

      await service.sendLoginSuccess('Example Site', 'user123');

      expect(mockSpawn).toHaveBeenCalledWith('shoutrrr', [
        'send',
        'discord://token@channel',
        expect.stringContaining('Login Success'),
      ]);
      expect(mockSpawn).toHaveBeenCalledWith('shoutrrr', [
        'send',
        'discord://token@channel',
        expect.stringContaining('Example Site'),
      ]);
      expect(mockSpawn).toHaveBeenCalledWith('shoutrrr', [
        'send',
        'discord://token@channel',
        expect.stringContaining('user123'),
      ]);
    });
  });

  describe('sendLoginFailure', () => {
    it('should send login failure notification with error', async () => {
      process.env.NOTIFICATION_URLS = 'discord://token@channel';
      const mockProcess = createMockProcess(0);
      mockSpawn.mockReturnValue(mockProcess as any);

      await service.sendLoginFailure('Example Site', 'user123', 'Connection timeout');

      expect(mockSpawn).toHaveBeenCalledWith('shoutrrr', [
        'send',
        'discord://token@channel',
        expect.stringContaining('Login Failed'),
      ]);
      expect(mockSpawn).toHaveBeenCalledWith('shoutrrr', [
        'send',
        'discord://token@channel',
        expect.stringContaining('Example Site'),
      ]);
      expect(mockSpawn).toHaveBeenCalledWith('shoutrrr', [
        'send',
        'discord://token@channel',
        expect.stringContaining('Connection timeout'),
      ]);
    });
  });

  describe('sendDailySummary', () => {
    it('should send daily summary with success info', async () => {
      process.env.NOTIFICATION_URLS = 'discord://token@channel';
      const mockProcess = createMockProcess(0);
      mockSpawn.mockReturnValue(mockProcess as any);

      await service.sendDailySummary(10, 10, 0);

      expect(mockSpawn).toHaveBeenCalledWith('shoutrrr', [
        'send',
        'discord://token@channel',
        expect.stringContaining('Daily Login Summary'),
      ]);
      expect(mockSpawn).toHaveBeenCalledWith('shoutrrr', [
        'send',
        'discord://token@channel',
        expect.stringContaining('Total Attempts:** 10'),
      ]);
      expect(mockSpawn).toHaveBeenCalledWith('shoutrrr', [
        'send',
        'discord://token@channel',
        expect.stringContaining('Success Rate:** 100%'),
      ]);
    });

    it('should send daily summary with warning when failures exist', async () => {
      process.env.NOTIFICATION_URLS = 'discord://token@channel';
      const mockProcess = createMockProcess(0);
      mockSpawn.mockReturnValue(mockProcess as any);

      await service.sendDailySummary(10, 7, 3);

      expect(mockSpawn).toHaveBeenCalledWith('shoutrrr', [
        'send',
        'discord://token@channel',
        expect.stringContaining('Success Rate:** 70%'),
      ]);
    });

    it('should handle zero logins gracefully', async () => {
      process.env.NOTIFICATION_URLS = 'discord://token@channel';
      const mockProcess = createMockProcess(0);
      mockSpawn.mockReturnValue(mockProcess as any);

      await service.sendDailySummary(0, 0, 0);

      expect(mockSpawn).toHaveBeenCalledWith('shoutrrr', [
        'send',
        'discord://token@channel',
        expect.stringContaining('Success Rate:** 0%'),
      ]);
    });
  });

  describe('sendStartupNotification', () => {
    it('should send startup notification', async () => {
      process.env.NOTIFICATION_URLS = 'discord://token@channel';
      const mockProcess = createMockProcess(0);
      mockSpawn.mockReturnValue(mockProcess as any);

      await service.sendStartupNotification();

      expect(mockSpawn).toHaveBeenCalledWith('shoutrrr', [
        'send',
        'discord://token@channel',
        expect.stringContaining('Bot Started'),
      ]);
    });
  });

  describe('sendShutdownNotification', () => {
    it('should send shutdown notification', async () => {
      process.env.NOTIFICATION_URLS = 'discord://token@channel';
      const mockProcess = createMockProcess(0);
      mockSpawn.mockReturnValue(mockProcess as any);

      await service.sendShutdownNotification();

      expect(mockSpawn).toHaveBeenCalledWith('shoutrrr', [
        'send',
        'discord://token@channel',
        expect.stringContaining('Bot Stopped'),
      ]);
    });
  });

  describe('sendErrorNotification', () => {
    it('should send error notification with component and error message', async () => {
      process.env.NOTIFICATION_URLS = 'discord://token@channel';
      const mockProcess = createMockProcess(0);
      mockSpawn.mockReturnValue(mockProcess as any);

      await service.sendErrorNotification('Browser', 'Page crashed');

      expect(mockSpawn).toHaveBeenCalledWith('shoutrrr', [
        'send',
        'discord://token@channel',
        expect.stringContaining('Error in Browser'),
      ]);
      expect(mockSpawn).toHaveBeenCalledWith('shoutrrr', [
        'send',
        'discord://token@channel',
        expect.stringContaining('Page crashed'),
      ]);
    });
  });
});
