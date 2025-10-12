/**
 * Unit tests for CDPCookieExtractorService
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { CDPCookieExtractorService } from '../../../src/infrastructure/browser/cdp-cookie-extractor.service.js';

// Mock WebSocket
class MockWebSocket {
  public static OPEN = 1;
  public static CLOSED = 3;

  public onopen: (() => void) | null = null;
  public onmessage: ((event: { data: string }) => void) | null = null;
  public onerror: ((error: Error) => void) | null = null;
  public readyState = 0;
  private eventListeners: Map<string, ((event: any) => void)[]> = new Map();

  constructor(public url: string) {
    // Simulate async connection
    setTimeout(() => {
      this.readyState = MockWebSocket.OPEN;
      if (this.onopen) this.onopen();
    }, 10);
  }

  send(data: string): void {
    // Mock successful response
    setTimeout(() => {
      const message = JSON.parse(data);
      const eventData = { data: '' };

      if (message.id === 1) {
        // Network.getAllCookies response
        const response = {
          id: 1,
          result: {
            cookies: [
              {
                name: 'session',
                value: 'abc123',
                domain: '.example.com',
                path: '/',
                expires: -1,
                size: 10,
                httpOnly: true,
                secure: true,
                sameSite: 'Lax' as const,
              },
            ],
          },
        };
        eventData.data = JSON.stringify(response);
      } else if (message.id === 2) {
        // DOMStorage.getDOMStorageItems response
        const response = {
          id: 2,
          result: {
            entries: [
              ['user', '{"id":123,"name":"testuser"}'],
              ['token', 'abc123']
            ]
          }
        };
        eventData.data = JSON.stringify(response);
      }

      // Trigger onmessage
      if (this.onmessage) {
        this.onmessage(eventData);
      }

      // Trigger addEventListener callbacks
      const listeners = this.eventListeners.get('message') || [];
      listeners.forEach(listener => listener(eventData));
    }, 20);
  }

  close(): void {
    this.readyState = MockWebSocket.CLOSED;
  }

  addEventListener(event: string, callback: (event: any) => void): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event)!.push(callback);
  }

  removeEventListener(event: string, callback: (event: any) => void): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      const index = listeners.indexOf(callback);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }
}

// Mock fetch
const mockFetch = jest.fn() as jest.MockedFunction<typeof fetch>;
global.fetch = mockFetch;

// Mock WebSocket
(global as any).WebSocket = MockWebSocket;

describe('CDPCookieExtractorService', () => {
  let service: CDPCookieExtractorService;

  beforeEach(() => {
    service = new CDPCookieExtractorService();
    mockFetch.mockClear();
  });

  describe('extractCookiesFromDebugPort', () => {
    it('should successfully extract cookies from debug port', async () => {
      const mockTabs = [
        {
          id: '1',
          type: 'page',
          title: 'Example',
          url: 'https://example.com/',
          webSocketDebuggerUrl: 'ws://localhost:9222/devtools/page/1',
        },
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockTabs,
      } as Response);

      const storageState = await service.extractCookiesFromDebugPort(
        'localhost:9222',
        'https://example.com'
      );

      expect(storageState).toBeDefined();
      expect(storageState.cookies).toBeDefined();
      expect(storageState.cookies.length).toBe(1);
      expect(storageState.cookies[0].name).toBe('session');
      expect(storageState.cookies[0].value).toBe('abc123');
      expect(storageState.origins).toBeDefined();
      expect(storageState.origins.length).toBe(1);
      expect(storageState.origins[0].origin).toBe('https://example.com');
      expect(storageState.origins[0].localStorage.length).toBe(2);
    });

    it('should throw error if Chrome debug port is unreachable', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
      } as Response);

      await expect(
        service.extractCookiesFromDebugPort('localhost:9222', 'https://example.com')
      ).rejects.toThrow('Failed to connect to Chrome debug port');
    });

    it('should throw error if target tab not found', async () => {
      const mockTabs = [
        {
          id: '1',
          type: 'page',
          title: 'Other Site',
          url: 'https://other.com/',
          webSocketDebuggerUrl: 'ws://localhost:9222/devtools/page/1',
        },
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockTabs,
      } as Response);

      await expect(
        service.extractCookiesFromDebugPort('localhost:9222', 'https://example.com')
      ).rejects.toThrow('Could not find an open tab for URL');
    });

    it('should match tab with URL prefix', async () => {
      const mockTabs = [
        {
          id: '1',
          type: 'page',
          title: 'Example Dashboard',
          url: 'https://example.com/dashboard',
          webSocketDebuggerUrl: 'ws://localhost:9222/devtools/page/1',
        },
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockTabs,
      } as Response);

      const storageState = await service.extractCookiesFromDebugPort(
        'localhost:9222',
        'https://example.com'
      );

      expect(storageState).toBeDefined();
      expect(storageState.cookies.length).toBe(1);
    });

    it('should handle CDP errors gracefully', async () => {
      const mockTabs = [
        {
          id: '1',
          type: 'page',
          title: 'Example',
          url: 'https://example.com/',
          webSocketDebuggerUrl: 'ws://localhost:9222/devtools/page/1',
        },
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockTabs,
      } as Response);

      // Mock WebSocket with error
      class ErrorWebSocket extends MockWebSocket {
        send(_data: string): void {
          setTimeout(() => {
            if (this.onmessage) {
              const response = {
                id: 1,
                error: {
                  message: 'CDP command failed',
                },
              };
              this.onmessage({ data: JSON.stringify(response) });
            }
          }, 20);
        }
      }

      (global as any).WebSocket = ErrorWebSocket;

      await expect(
        service.extractCookiesFromDebugPort('localhost:9222', 'https://example.com')
      ).rejects.toThrow('CDP command failed');

      // Restore mock
      (global as any).WebSocket = MockWebSocket;
    });

    it('should timeout if CDP command takes too long', async () => {
      const mockTabs = [
        {
          id: '1',
          type: 'page',
          title: 'Example',
          url: 'https://example.com/',
          webSocketDebuggerUrl: 'ws://localhost:9222/devtools/page/1',
        },
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockTabs,
      } as Response);

      // Mock WebSocket that never responds
      class TimeoutWebSocket extends MockWebSocket {
        send(_data: string): void {
          // Never send response
        }
      }

      (global as any).WebSocket = TimeoutWebSocket;

      await expect(
        service.extractCookiesFromDebugPort('localhost:9222', 'https://example.com')
      ).rejects.toThrow('CDP command timeout');

      // Restore mock
      (global as any).WebSocket = MockWebSocket;
    }, 15000); // Increase timeout for this test

    it('should use ssh-tunnel hostname for Docker deployment', async () => {
      const mockTabs = [
        {
          id: '1',
          type: 'page',
          title: 'Example',
          url: 'https://example.com/',
          webSocketDebuggerUrl: 'ws://ssh-tunnel:9222/devtools/page/1',
        },
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockTabs,
      } as Response);

      const storageState = await service.extractCookiesFromDebugPort(
        'ssh-tunnel:9222',
        'https://example.com'
      );

      expect(storageState).toBeDefined();
      expect(mockFetch).toHaveBeenCalledWith('http://ssh-tunnel:9222/json', {
        headers: {
          'Host': 'localhost:9222'
        }
      });
    });
  });

  describe('error handling', () => {
    it('should provide helpful error messages', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      await expect(
        service.extractCookiesFromDebugPort('localhost:9222', 'https://example.com')
      ).rejects.toThrow('Cookie extraction failed');
    });
  });
});
