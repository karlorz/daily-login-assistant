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
}

export class SessionManagerService {
  private sessions: Map<string, SessionData> = new Map();
  private readonly SESSION_TIMEOUT_MS = 3600000; // 1 hour

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
    return session;
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
