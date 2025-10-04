import { SimpleMonitoringService } from '../../../src/infrastructure/monitoring/simple-monitoring.service';

describe('SimpleMonitoringService', () => {
  let service: SimpleMonitoringService;

  beforeEach(() => {
    service = new SimpleMonitoringService();
  });

  describe('recordLoginAttempt', () => {
    it('should record successful login attempt', () => {
      service.recordLoginAttempt('website1', 'user1', 'success');

      const stats = service.getStats();
      expect(stats.totalLogins).toBe(1);
      expect(stats.successfulLogins).toBe(1);
      expect(stats.failedLogins).toBe(0);
    });

    it('should record failed login attempt', () => {
      service.recordLoginAttempt('website1', 'user1', 'failed');

      const stats = service.getStats();
      expect(stats.totalLogins).toBe(1);
      expect(stats.successfulLogins).toBe(0);
      expect(stats.failedLogins).toBe(1);
    });

    it('should track multiple login attempts', () => {
      service.recordLoginAttempt('website1', 'user1', 'success');
      service.recordLoginAttempt('website2', 'user2', 'failed');
      service.recordLoginAttempt('website3', 'user3', 'success');

      const stats = service.getStats();
      expect(stats.totalLogins).toBe(3);
      expect(stats.successfulLogins).toBe(2);
      expect(stats.failedLogins).toBe(1);
    });
  });

  describe('recordError', () => {
    it('should record error with component and severity', () => {
      service.recordError('timeout', 'browser', 'high');

      const errorStats = service.getErrorStats();
      expect(errorStats.get('browser:timeout:high')).toBe(1);
    });

    it('should increment error count for same error', () => {
      service.recordError('timeout', 'browser', 'high');
      service.recordError('timeout', 'browser', 'high');
      service.recordError('timeout', 'browser', 'high');

      const errorStats = service.getErrorStats();
      expect(errorStats.get('browser:timeout:high')).toBe(3);
    });

    it('should track different errors separately', () => {
      service.recordError('timeout', 'browser', 'high');
      service.recordError('network', 'api', 'critical');
      service.recordError('validation', 'config', 'low');

      const errorStats = service.getErrorStats();
      expect(errorStats.get('browser:timeout:high')).toBe(1);
      expect(errorStats.get('api:network:critical')).toBe(1);
      expect(errorStats.get('config:validation:low')).toBe(1);
    });
  });

  describe('recordLatency', () => {
    it('should track operation latency', () => {
      service.recordLoginAttempt('website1', 'user1', 'success');
      service.recordLatency('login', 1000);

      const stats = service.getStats();
      expect(stats.averageLatency).toBe(1000);
    });

    it('should calculate average latency across multiple operations', () => {
      service.recordLoginAttempt('website1', 'user1', 'success');
      service.recordLatency('login', 1000);

      service.recordLoginAttempt('website2', 'user2', 'success');
      service.recordLatency('login', 2000);

      service.recordLoginAttempt('website3', 'user3', 'success');
      service.recordLatency('login', 3000);

      const stats = service.getStats();
      expect(stats.averageLatency).toBe(2000); // (1000 + 2000 + 3000) / 3
    });
  });

  describe('getStats', () => {
    it('should return default stats for new service', () => {
      const stats = service.getStats();

      expect(stats.totalLogins).toBe(0);
      expect(stats.successfulLogins).toBe(0);
      expect(stats.failedLogins).toBe(0);
      expect(stats.averageLatency).toBe(0);
    });

    it('should return accurate stats after operations', () => {
      service.recordLoginAttempt('website1', 'user1', 'success');
      service.recordLoginAttempt('website2', 'user2', 'failed');
      service.recordLatency('login', 1500);
      service.recordLatency('login', 2500);

      const stats = service.getStats();
      expect(stats.totalLogins).toBe(2);
      expect(stats.successfulLogins).toBe(1);
      expect(stats.failedLogins).toBe(1);
      expect(stats.averageLatency).toBe(2000); // (1500 + 2500) / 2
    });
  });

  describe('getErrorStats', () => {
    it('should return empty map for new service', () => {
      const errorStats = service.getErrorStats();
      expect(errorStats.size).toBe(0);
    });

    it('should return copy of error stats (not reference)', () => {
      service.recordError('timeout', 'browser', 'high');

      const errorStats1 = service.getErrorStats();
      const errorStats2 = service.getErrorStats();

      expect(errorStats1).not.toBe(errorStats2);
      expect(errorStats1.get('browser:timeout:high')).toBe(1);
      expect(errorStats2.get('browser:timeout:high')).toBe(1);
    });
  });

  describe('reset', () => {
    it('should reset all stats to initial state', () => {
      service.recordLoginAttempt('website1', 'user1', 'success');
      service.recordLoginAttempt('website2', 'user2', 'failed');
      service.recordError('timeout', 'browser', 'high');
      service.recordLatency('login', 1000);

      service.reset();

      const stats = service.getStats();
      const errorStats = service.getErrorStats();

      expect(stats.totalLogins).toBe(0);
      expect(stats.successfulLogins).toBe(0);
      expect(stats.failedLogins).toBe(0);
      expect(stats.averageLatency).toBe(0);
      expect(errorStats.size).toBe(0);
    });
  });
});
