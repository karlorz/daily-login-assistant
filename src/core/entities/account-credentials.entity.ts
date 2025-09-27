export class AccountCredentials {
  constructor(
    public username: string,
    public password: string,
    public totpSecret?: string,
    public backupCodes?: string[],
    public securityQuestions?: Record<string, string>,
    public createdAt: Date = new Date(),
    public expiresAt?: Date,
    public lastRotated?: Date,
  ) {}

  isExpired(): boolean {
    return this.expiresAt ? this.expiresAt <= new Date() : false;
  }

  needsRotation(rotationIntervalDays: number = 90): boolean {
    if (!this.lastRotated) return true;
    const rotationDate = new Date(this.lastRotated);
    rotationDate.setDate(rotationDate.getDate() + rotationIntervalDays);
    return rotationDate <= new Date();
  }

  toJSON(): Record<string, string> {
    return {
      username: this.username,
      password: this.password,
      totp_secret: this.totpSecret || "",
      backup_codes: this.backupCodes?.join(",") || "",
      security_questions: JSON.stringify(this.securityQuestions || {}),
      created_at: this.createdAt.toISOString(),
      expires_at: this.expiresAt?.toISOString() || "",
      last_rotated: this.lastRotated?.toISOString() || "",
    };
  }

  static fromJSON(data: Record<string, string>): AccountCredentials {
    return new AccountCredentials(
      data.username,
      data.password,
      data.totp_secret || undefined,
      data.backup_codes ? data.backup_codes.split(",") : undefined,
      data.security_questions ? JSON.parse(data.security_questions) : undefined,
      new Date(data.created_at),
      data.expires_at ? new Date(data.expires_at) : undefined,
      data.last_rotated ? new Date(data.last_rotated) : undefined,
    );
  }
}
