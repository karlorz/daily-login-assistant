import { CircuitBreaker } from '../../../src/infrastructure/reliability/circuit-breaker.service';

describe('CircuitBreaker', () => {
  let circuitBreaker: CircuitBreaker;

  beforeEach(() => {
    circuitBreaker = new CircuitBreaker(5, 300000); // 5 failures, 5 min reset
  });

  describe('Failure Recording', () => {
    it('should record failures correctly', () => {
      circuitBreaker.recordFailure('website1');
      expect(circuitBreaker.getFailureCount('website1')).toBe(1);

      circuitBreaker.recordFailure('website1');
      expect(circuitBreaker.getFailureCount('website1')).toBe(2);
    });

    it('should track failures for multiple websites independently', () => {
      circuitBreaker.recordFailure('website1');
      circuitBreaker.recordFailure('website2');
      circuitBreaker.recordFailure('website1');

      expect(circuitBreaker.getFailureCount('website1')).toBe(2);
      expect(circuitBreaker.getFailureCount('website2')).toBe(1);
    });

    it('should return 0 for websites with no failures', () => {
      expect(circuitBreaker.getFailureCount('unknown-website')).toBe(0);
    });
  });

  describe('Circuit Opening', () => {
    it('should open circuit after reaching failure threshold', () => {
      expect(circuitBreaker.isCircuitOpen('website1')).toBe(false);

      for (let i = 0; i < 4; i++) {
        circuitBreaker.recordFailure('website1');
        expect(circuitBreaker.isCircuitOpen('website1')).toBe(false);
      }

      // 5th failure should open the circuit
      circuitBreaker.recordFailure('website1');
      expect(circuitBreaker.isCircuitOpen('website1')).toBe(true);
    });

    it('should keep circuit closed if failures are below threshold', () => {
      circuitBreaker.recordFailure('website1');
      circuitBreaker.recordFailure('website1');
      circuitBreaker.recordFailure('website1');

      expect(circuitBreaker.isCircuitOpen('website1')).toBe(false);
    });

    it('should log warning when circuit opens', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      for (let i = 0; i < 5; i++) {
        circuitBreaker.recordFailure('website1');
      }

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Circuit breaker OPENED for website1')
      );

      consoleSpy.mockRestore();
    });
  });

  describe('Success Recording', () => {
    it('should reset failure count on success', () => {
      circuitBreaker.recordFailure('website1');
      circuitBreaker.recordFailure('website1');
      expect(circuitBreaker.getFailureCount('website1')).toBe(2);

      circuitBreaker.recordSuccess('website1');
      expect(circuitBreaker.getFailureCount('website1')).toBe(0);
    });

    it('should close open circuit on success', () => {
      for (let i = 0; i < 5; i++) {
        circuitBreaker.recordFailure('website1');
      }

      expect(circuitBreaker.isCircuitOpen('website1')).toBe(true);

      circuitBreaker.recordSuccess('website1');
      expect(circuitBreaker.isCircuitOpen('website1')).toBe(false);
      expect(circuitBreaker.getFailureCount('website1')).toBe(0);
    });

    it('should log message when closing circuit on success', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      for (let i = 0; i < 5; i++) {
        circuitBreaker.recordFailure('website1');
      }

      circuitBreaker.recordSuccess('website1');

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Circuit breaker CLOSED for website1')
      );

      consoleSpy.mockRestore();
    });
  });

  describe('Circuit Reset After Time', () => {
    it('should automatically close circuit after reset time', (done) => {
      const shortResetTime = 100; // 100ms for testing
      const breaker = new CircuitBreaker(3, shortResetTime);

      // Open the circuit
      for (let i = 0; i < 3; i++) {
        breaker.recordFailure('website1');
      }

      expect(breaker.isCircuitOpen('website1')).toBe(true);

      // Wait for reset time to pass
      setTimeout(() => {
        expect(breaker.isCircuitOpen('website1')).toBe(false);
        done();
      }, shortResetTime + 50);
    });

    it('should reset failure count when circuit auto-closes', (done) => {
      const shortResetTime = 100;
      const breaker = new CircuitBreaker(3, shortResetTime);

      for (let i = 0; i < 3; i++) {
        breaker.recordFailure('website1');
      }

      setTimeout(() => {
        breaker.isCircuitOpen('website1'); // Trigger auto-close check
        expect(breaker.getFailureCount('website1')).toBe(0);
        done();
      }, shortResetTime + 50);
    });

    it('should log message when circuit auto-closes', (done) => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      const shortResetTime = 100;
      const breaker = new CircuitBreaker(3, shortResetTime);

      for (let i = 0; i < 3; i++) {
        breaker.recordFailure('website1');
      }

      setTimeout(() => {
        breaker.isCircuitOpen('website1');
        expect(consoleSpy).toHaveBeenCalledWith(
          expect.stringContaining('Circuit breaker CLOSED for website1')
        );
        consoleSpy.mockRestore();
        done();
      }, shortResetTime + 50);
    });
  });

  describe('Statistics', () => {
    it('should return correct stats for a website', () => {
      circuitBreaker.recordFailure('website1');
      circuitBreaker.recordFailure('website1');

      const stats = circuitBreaker.getStats('website1');

      expect(stats.websiteId).toBe('website1');
      expect(stats.failureCount).toBe(2);
      expect(stats.isOpen).toBe(false);
      expect(stats.openedAt).toBeUndefined();
      expect(stats.willResetAt).toBeUndefined();
    });

    it('should include open time in stats when circuit is open', () => {
      for (let i = 0; i < 5; i++) {
        circuitBreaker.recordFailure('website1');
      }

      const stats = circuitBreaker.getStats('website1');

      expect(stats.isOpen).toBe(true);
      expect(stats.openedAt).toBeDefined();
      expect(stats.willResetAt).toBeDefined();
      expect(stats.willResetAt).toBeGreaterThan(Date.now());
    });

    it('should return stats for all websites', () => {
      circuitBreaker.recordFailure('website1');
      circuitBreaker.recordFailure('website2');
      for (let i = 0; i < 5; i++) {
        circuitBreaker.recordFailure('website3');
      }

      const allStats = circuitBreaker.getAllStats();

      expect(allStats.length).toBe(3);
      expect(allStats.map(s => s.websiteId)).toContain('website1');
      expect(allStats.map(s => s.websiteId)).toContain('website2');
      expect(allStats.map(s => s.websiteId)).toContain('website3');

      const website3Stats = allStats.find(s => s.websiteId === 'website3');
      expect(website3Stats?.isOpen).toBe(true);
    });
  });

  describe('Manual Reset', () => {
    it('should reset failures for a specific website', () => {
      circuitBreaker.recordFailure('website1');
      circuitBreaker.recordFailure('website1');
      circuitBreaker.recordFailure('website1');

      expect(circuitBreaker.getFailureCount('website1')).toBe(3);

      circuitBreaker.reset('website1');

      expect(circuitBreaker.getFailureCount('website1')).toBe(0);
      expect(circuitBreaker.isCircuitOpen('website1')).toBe(false);
    });

    it('should close open circuit on manual reset', () => {
      for (let i = 0; i < 5; i++) {
        circuitBreaker.recordFailure('website1');
      }

      expect(circuitBreaker.isCircuitOpen('website1')).toBe(true);

      circuitBreaker.reset('website1');

      expect(circuitBreaker.isCircuitOpen('website1')).toBe(false);
      expect(circuitBreaker.getFailureCount('website1')).toBe(0);
    });

    it('should reset all circuits', () => {
      for (let i = 0; i < 5; i++) {
        circuitBreaker.recordFailure('website1');
        circuitBreaker.recordFailure('website2');
      }

      expect(circuitBreaker.isCircuitOpen('website1')).toBe(true);
      expect(circuitBreaker.isCircuitOpen('website2')).toBe(true);

      circuitBreaker.resetAll();

      expect(circuitBreaker.isCircuitOpen('website1')).toBe(false);
      expect(circuitBreaker.isCircuitOpen('website2')).toBe(false);
      expect(circuitBreaker.getFailureCount('website1')).toBe(0);
      expect(circuitBreaker.getFailureCount('website2')).toBe(0);
    });
  });

  describe('Custom Configuration', () => {
    it('should respect custom failure threshold', () => {
      const customBreaker = new CircuitBreaker(3, 300000);

      customBreaker.recordFailure('website1');
      customBreaker.recordFailure('website1');
      expect(customBreaker.isCircuitOpen('website1')).toBe(false);

      customBreaker.recordFailure('website1');
      expect(customBreaker.isCircuitOpen('website1')).toBe(true);
    });

    it('should respect custom reset time', (done) => {
      const customBreaker = new CircuitBreaker(2, 50);

      customBreaker.recordFailure('website1');
      customBreaker.recordFailure('website1');
      expect(customBreaker.isCircuitOpen('website1')).toBe(true);

      setTimeout(() => {
        expect(customBreaker.isCircuitOpen('website1')).toBe(false);
        done();
      }, 100);
    });
  });

  describe('Edge Cases', () => {
    it('should handle no failures gracefully', () => {
      expect(circuitBreaker.isCircuitOpen('website1')).toBe(false);
      expect(circuitBreaker.getFailureCount('website1')).toBe(0);

      const stats = circuitBreaker.getStats('website1');
      expect(stats.failureCount).toBe(0);
      expect(stats.isOpen).toBe(false);
    });

    it('should handle multiple resets', () => {
      circuitBreaker.recordFailure('website1');
      circuitBreaker.reset('website1');
      circuitBreaker.reset('website1');
      circuitBreaker.reset('website1');

      expect(circuitBreaker.getFailureCount('website1')).toBe(0);
      expect(circuitBreaker.isCircuitOpen('website1')).toBe(false);
    });

    it('should handle alternating failures and successes', () => {
      circuitBreaker.recordFailure('website1');
      circuitBreaker.recordSuccess('website1');
      circuitBreaker.recordFailure('website1');
      circuitBreaker.recordSuccess('website1');

      expect(circuitBreaker.getFailureCount('website1')).toBe(0);
      expect(circuitBreaker.isCircuitOpen('website1')).toBe(false);
    });
  });
});
