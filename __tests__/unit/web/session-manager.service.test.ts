/**
 * Unit tests for SessionManagerService
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import { SessionManagerService } from '../../../src/infrastructure/web/session-manager.service';

describe('SessionManagerService', () => {
  let service: SessionManagerService;

  beforeEach(() => {
    service = new SessionManagerService();
  });

  describe('createSession', () => {
    it('should create a new session with UUID token', () => {
      const session = service.createSession();

      expect(session).toBeDefined();
      expect(session.token).toBeDefined();
      expect(session.status).toBe('pending');
      expect(session.createdAt).toBeInstanceOf(Date);
      expect(session.expiresAt).toBeInstanceOf(Date);
    });

    it('should create unique tokens for each session', () => {
      const session1 = service.createSession();
      const session2 = service.createSession();

      expect(session1.token).not.toBe(session2.token);
    });

    it('should set expiration to 1 hour from creation', () => {
      const session = service.createSession();
      const expectedExpiry = new Date(session.createdAt.getTime() + 3600000);

      expect(session.expiresAt.getTime()).toBe(expectedExpiry.getTime());
    });
  });

  describe('getSession', () => {
    it('should retrieve existing session by token', () => {
      const created = service.createSession();
      const retrieved = service.getSession(created.token);

      expect(retrieved).toBeDefined();
      expect(retrieved?.token).toBe(created.token);
      expect(retrieved?.status).toBe('pending');
    });

    it('should return undefined for non-existent token', () => {
      const result = service.getSession('non-existent-token');

      expect(result).toBeUndefined();
    });

    it('should return undefined for expired session', () => {
      const session = service.createSession();

      // Mock expiration by setting expiresAt to past
      session.expiresAt = new Date(Date.now() - 1000);
      service.updateSession(session.token, { expiresAt: session.expiresAt });

      const retrieved = service.getSession(session.token);

      expect(retrieved).toBeUndefined();
    });
  });

  describe('updateSession', () => {
    it('should update session status', () => {
      const session = service.createSession();
      const updated = service.updateSession(session.token, {
        status: 'connected',
        debugPort: 'ssh-tunnel:9222',
        connectedAt: new Date(),
      });

      expect(updated).toBeDefined();
      expect(updated?.status).toBe('connected');
      expect(updated?.debugPort).toBe('ssh-tunnel:9222');
      expect(updated?.connectedAt).toBeInstanceOf(Date);
    });

    it('should return undefined for non-existent session', () => {
      const result = service.updateSession('non-existent', { status: 'connected' });

      expect(result).toBeUndefined();
    });

    it('should preserve unchanged fields', () => {
      const session = service.createSession();
      const originalToken = session.token;
      const originalCreatedAt = session.createdAt;

      service.updateSession(session.token, { status: 'connected' });
      const updated = service.getSession(session.token);

      expect(updated?.token).toBe(originalToken);
      expect(updated?.createdAt).toBe(originalCreatedAt);
    });
  });

  describe('deleteSession', () => {
    it('should delete existing session', () => {
      const session = service.createSession();
      const deleted = service.deleteSession(session.token);

      expect(deleted).toBe(true);
      expect(service.getSession(session.token)).toBeUndefined();
    });

    it('should return false for non-existent session', () => {
      const deleted = service.deleteSession('non-existent');

      expect(deleted).toBe(false);
    });
  });

  describe('cleanupExpiredSessions', () => {
    it('should remove expired sessions', () => {
      const session1 = service.createSession();
      const session2 = service.createSession();

      // Expire session1
      service.updateSession(session1.token, {
        expiresAt: new Date(Date.now() - 1000),
      });

      const count = service.cleanupExpiredSessions();

      expect(count).toBe(1);
      expect(service.getSession(session1.token)).toBeUndefined();
      expect(service.getSession(session2.token)).toBeDefined();
    });

    it('should return 0 if no sessions expired', () => {
      service.createSession();
      service.createSession();

      const count = service.cleanupExpiredSessions();

      expect(count).toBe(0);
    });

    it('should handle empty session store', () => {
      const count = service.cleanupExpiredSessions();

      expect(count).toBe(0);
    });
  });

  describe('session lifecycle', () => {
    it('should support full session workflow', () => {
      // Create session
      const session = service.createSession();
      expect(session.status).toBe('pending');

      // Update to connected
      service.updateSession(session.token, {
        status: 'connected',
        debugPort: 'ssh-tunnel:9222',
        connectedAt: new Date(),
      });
      let retrieved = service.getSession(session.token);
      expect(retrieved?.status).toBe('connected');

      // Update to extracting
      service.updateSession(session.token, { status: 'extracting' });
      retrieved = service.getSession(session.token);
      expect(retrieved?.status).toBe('extracting');

      // Update to completed
      service.updateSession(session.token, { status: 'completed' });
      retrieved = service.getSession(session.token);
      expect(retrieved?.status).toBe('completed');

      // Delete session
      service.deleteSession(session.token);
      expect(service.getSession(session.token)).toBeUndefined();
    });
  });
});
