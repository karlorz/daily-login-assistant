export interface IProfileService {
  createProfile(accountId: string): Promise<string>;
  getProfilePath(accountId: string): Promise<string>;
  deleteProfile(accountId: string): Promise<void>;
  cleanupProfiles(): Promise<void>;
  getProfileSize(accountId: string): Promise<number>;
  listProfiles(): Promise<string[]>;
  initialize(): Promise<void>;
}
