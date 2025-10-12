/**
 * Session Management Service
 * Handles session tokens for script launcher authentication
 */


export interface SessionData {
  token: string;
  status: 'pending' | 'connected' | 'extracting' | 'completed' | 'failed';
  createdAt: Date;
  connectedAt?: Date;
  debugPort?: string;
  expiresAt: Date;
  timeoutId?: NodeJS.Timeout;
}

export class SessionManagerService {
  private sessions: Map<string, SessionData> = new Map();
  private readonly SESSION_TIMEOUT_MS = 3600000; // 1 hour
  private readonly TUNNEL_TIMEOUT_MS = 300000; // 5 minutes for active tunnels

  /**
   * Create a new session
   */
  createSession(): SessionData {
    const token = this.generateToken();
    const session: SessionData = {
      token,
      status: 'pending',
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + this.SESSION_TIMEOUT_MS),
    };

    this.sessions.set(token, session);
    return session;
  }

  /**
   * Get session by token
   */
  getSession(token: string): SessionData | undefined {
    const session = this.sessions.get(token);

    if (session && new Date() > session.expiresAt) {
      this.sessions.delete(token);
      return undefined;
    }

    return session;
  }

  /**
   * Update session status
   */
  updateSession(token: string, updates: Partial<SessionData>): SessionData | undefined {
    const session = this.sessions.get(token);

    if (!session) {
      return undefined;
    }

    Object.assign(session, updates);
    this.sessions.set(token, session);

    // Start tunnel timeout when status becomes 'connected'
    if (updates.status === 'connected' && !session.timeoutId) {
      this.startTunnelTimeout(token);
    }

    // Clear timeout when extraction starts or completes
    if ((updates.status === 'extracting' || updates.status === 'completed' || updates.status === 'failed') && session.timeoutId) {
      clearTimeout(session.timeoutId);
      session.timeoutId = undefined;
    }

    return session;
  }

  /**
   * Start tunnel timeout for a connected session
   */
  private startTunnelTimeout(token: string): void {
    const timeoutId = setTimeout(async () => {
      const session = this.sessions.get(token);
      if (session && session.status === 'connected') {
        console.log(`⏱️  Session ${token} tunnel timeout - cleaning up remote SSH tunnel`);
        await this.closeTunnel(token);
        this.updateSession(token, { status: 'failed' });
      }
    }, this.TUNNEL_TIMEOUT_MS);

    const session = this.sessions.get(token);
    if (session) {
      session.timeoutId = timeoutId;
    }
  }

  /**
   * Close SSH tunnel for a session
   */
  async closeTunnel(token: string): Promise<boolean> {
    const session = this.sessions.get(token);
    if (!session) {
      return false;
    }

    try {
      // Kill remote SSH tunnel via SSH command
      const sshHost = process.env.REMOTE_SSH_HOST || 'localhost';
      const sshPort = process.env.REMOTE_SSH_PORT || '22';
      const sshUser = process.env.REMOTE_SSH_USER || 'tunnel';

      const command = `ssh -o BatchMode=yes -o ConnectTimeout=3 -p ${sshPort} ${sshUser}@${sshHost} "pkill -u ${sshUser} sshd" 2>/dev/null`;

      // Use Bun's shell
      const proc = Bun.spawn(['sh', '-c', command], {
        stdout: 'pipe',
        stderr: 'pipe',
      });

      await proc.exited;
      console.log(`🔌 Closed tunnel for session ${token}`);
      return true;
    } catch (error) {
      console.error(`❌ Failed to close tunnel for session ${token}:`, error);
      return false;
    }
  }

  /**
   * Delete session
   */
  deleteSession(token: string): boolean {
    return this.sessions.delete(token);
  }

  /**
   * Clean up expired sessions
   */
  cleanupExpiredSessions(): number {
    const now = new Date();
    let count = 0;

    for (const [token, session] of this.sessions.entries()) {
      if (now > session.expiresAt) {
        this.sessions.delete(token);
        count++;
      }
    }

    return count;
  }

  /**
   * Generate unique session token (UUID v4)
   */
  private generateToken(): string {
    return crypto.randomUUID();
  }
}
