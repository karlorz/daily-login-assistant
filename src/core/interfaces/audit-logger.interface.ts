export interface AuditQueryFilters {
  principal?: string;
  action?: string;
  resource?: string;
  status?: "success" | "failure";
  startDate?: string;
  endDate?: string;
}

export interface AuditLog {
  principal: string;
  action: string;
  resource: string;
  status: "success" | "failure";
  timestamp: string;
  error?: string;
  metadata?: Record<string, unknown>;
}

export interface IAuditLogger {
  log(auditLog: AuditLog): Promise<void>;
  query(filters: AuditQueryFilters): Promise<AuditLog[]>;
}
