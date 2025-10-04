/**
 * CDP Cookie Extractor Service
 * Extracts cookies and localStorage from Chrome DevTools Protocol debug port
 */

import { injectable } from 'inversify';
import type { Cookie } from 'playwright';

interface CDPTab {
  id: string;
  type: string;
  title: string;
  url: string;
  webSocketDebuggerUrl: string;
}

interface CDPResponse {
  id: number;
  result?: any;
  error?: {
    message: string;
  };
}

interface StorageState {
  cookies: Cookie[];
  origins: Array<{
    origin: string;
    localStorage: Array<{ name: string; value: string }>;
  }>;
}

@injectable()
export class CDPCookieExtractorService {
  /**
   * Extract cookies and localStorage from Chrome with remote debugging enabled
   */
  async extractCookiesFromDebugPort(
    debugPort: string,
    targetUrl: string
  ): Promise<StorageState> {
    try {
      // 1. Fetch available tabs from Chrome
      // Chrome DevTools requires Host header to be localhost or IP, not a hostname
      const response = await fetch(`http://${debugPort}/json`, {
        headers: {
          'Host': 'localhost:9222'
        }
      });
      if (!response.ok) {
        throw new Error(
          `Failed to connect to Chrome debug port at ${debugPort}. ` +
          `Is Chrome running with --remote-debugging-port=9222?`
        );
      }

      const tabs = (await response.json()) as CDPTab[];

      // 2. Find the tab matching target URL
      const targetTab = tabs.find((tab) =>
        tab.url.startsWith(targetUrl)
      );

      if (!targetTab) {
        throw new Error(
          `Could not find an open tab for URL: ${targetUrl}. ` +
          `Please ensure you've logged in to this website in Chrome.`
        );
      }

      // 3. Connect to WebSocket
      // Replace localhost:9222 in WebSocket URL with actual debugPort
      // Chrome returns ws://localhost:9222/devtools/... but we need ws://ssh-tunnel:9222/devtools/...
      const wsUrl = targetTab.webSocketDebuggerUrl.replace(
        'localhost:9222',
        debugPort
      );
      const ws = new WebSocket(wsUrl);

      // 4. Get cookies via CDP first
      const cookies = await this.getCookiesViaCDP(ws);

      // 5. Get localStorage via CDP
      const localStorageData = await this.getLocalStorageViaCDP(ws, targetUrl);

      // 6. Close WebSocket
      ws.close();

      // 7. Build storage state with origin
      const origin = new URL(targetUrl).origin;
      const storageState: StorageState = {
        cookies,
        origins: localStorageData.length > 0 ? [{
          origin,
          localStorage: localStorageData
        }] : []
      };

      return storageState;
    } catch (error) {
      throw new Error(
        `Cookie extraction failed: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Get cookies via CDP WebSocket
   */
  private async getCookiesViaCDP(ws: WebSocket): Promise<Cookie[]> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        ws.close();
        reject(new Error('CDP command timeout'));
      }, 10000);

      ws.onopen = () => {
        ws.send(
          JSON.stringify({
            id: 1,
            method: 'Network.getAllCookies',
            params: {},
          })
        );
      };

      ws.onmessage = (event) => {
        clearTimeout(timeout);
        const response = JSON.parse(event.data.toString()) as CDPResponse;

        if (response.id === 1) {
          if (response.error) {
            reject(new Error(response.error.message));
          } else if (response.result) {
            resolve(response.result.cookies);
          } else {
            reject(new Error('Invalid CDP response'));
          }
        }
      };

      ws.onerror = (error) => {
        clearTimeout(timeout);
        reject(new Error(
          `WebSocket connection failed. ` +
          `Error: ${error instanceof ErrorEvent ? error.message : String(error)}`
        ));
      };
    });
  }

  /**
   * Get localStorage via CDP WebSocket
   */
  private async getLocalStorageViaCDP(
    ws: WebSocket,
    targetUrl: string
  ): Promise<Array<{ name: string; value: string }>> {
    const origin = new URL(targetUrl).origin;

    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        resolve([]); // Return empty array on timeout instead of failing
      }, 5000);

      // If WebSocket is already open, send immediately
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(
          JSON.stringify({
            id: 2,
            method: 'DOMStorage.getDOMStorageItems',
            params: {
              storageId: {
                securityOrigin: origin,
                isLocalStorage: true
              }
            },
          })
        );
      }

      const messageHandler = (event: MessageEvent) => {
        const response = JSON.parse(event.data.toString()) as CDPResponse;

        if (response.id === 2) {
          clearTimeout(timeout);
          ws.removeEventListener('message', messageHandler);

          if (response.error) {
            // If localStorage is not available, return empty array
            resolve([]);
          } else if (response.result && response.result.entries) {
            // Convert CDP format [[key, value], ...] to [{name, value}, ...]
            const entries = response.result.entries.map((entry: string[]) => ({
              name: entry[0],
              value: entry[1]
            }));
            resolve(entries);
          } else {
            resolve([]);
          }
        }
      };

      ws.addEventListener('message', messageHandler);
    });
  }
}
