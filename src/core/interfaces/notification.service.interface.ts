export interface INotificationService {
  sendNotification(
    title: string,
    message: string,
    severity?: 'info' | 'warning' | 'error'
  ): Promise<void>;
  sendLoginSuccess(websiteName: string, accountId: string): Promise<void>;
  sendLoginFailure(websiteName: string, accountId: string, error: string): Promise<void>;
  sendDailySummary(totalLogins: number, successCount: number, failureCount: number): Promise<void>;
  sendStartupNotification(): Promise<void>;
  sendShutdownNotification(): Promise<void>;
  sendErrorNotification(source: string, message: string): Promise<void>;
}