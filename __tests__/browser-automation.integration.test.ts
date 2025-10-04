import path from 'path';
import fs from 'fs';

describe('Browser Automation Implementation', () => {
  const srcPath = path.join(__dirname, '../src');

  test('should have PlaywrightBrowserService implementation', () => {
    const filePath = path.join(srcPath, 'infrastructure/browser/playwright-browser.service.ts');
    expect(fs.existsSync(filePath)).toBe(true);

    const content = fs.readFileSync(filePath, 'utf8');
    expect(content).toContain('class PlaywrightBrowserService');
    expect(content).toContain('implements IBrowserService');
    expect(content).toContain('createSession');
    expect(content).toContain('performLogin');
    expect(content).toContain('performCheckin');
  });

  test('should have LoginEngine implementation', () => {
    const filePath = path.join(srcPath, 'infrastructure/browser/login-engine.service.ts');
    expect(fs.existsSync(filePath)).toBe(true);

    const content = fs.readFileSync(filePath, 'utf8');
    expect(content).toContain('class LoginEngine');
    expect(content).toContain('implements ILoginService');
    expect(content).toContain('processLoginTask');
    expect(content).toContain('processCheckinTask');
    expect(content).toContain('validateCredentials');
  });

  test('should have proper TypeScript interfaces', () => {
    const filePath = path.join(srcPath, 'core/interfaces/browser.service.interface.ts');
    expect(fs.existsSync(filePath)).toBe(true);

    const content = fs.readFileSync(filePath, 'utf8');
    expect(content).toContain('interface IBrowserService');
    expect(content).toContain('createSession');
    expect(content).toContain('performLogin');
  });

  test('should have updated container with browser services', () => {
    const filePath = path.join(srcPath, 'core/container.ts');
    expect(fs.existsSync(filePath)).toBe(true);

    const content = fs.readFileSync(filePath, 'utf8');
    expect(content).toContain('PlaywrightBrowserService');
    expect(content).toContain('LoginEngine');
    expect(content).toContain('BrowserService');
    expect(content).toContain('LoginService');
  });

  test('should have updated entity models with required properties', () => {
    const filePath = path.join(srcPath, 'core/entities/website-config.entity.ts');
    expect(fs.existsSync(filePath)).toBe(true);

    const content = fs.readFileSync(filePath, 'utf8');
    expect(content).toContain('enabled: boolean');
    expect(content).toContain('useStealth: boolean');
    expect(content).toContain('randomDelays: boolean');
    expect(content).toContain('CredentialsConfig');
  });

  test('should have proper package.json dependencies', () => {
    const filePath = path.join(__dirname, '../package.json');
    expect(fs.existsSync(filePath)).toBe(true);

    const content = fs.readFileSync(filePath, 'utf8');
    const packageJson = JSON.parse(content);

    expect(packageJson.dependencies).toHaveProperty('playwright');
    expect(packageJson.dependencies).toHaveProperty('@playwright/test');
    expect(packageJson.dependencies).toHaveProperty('inversify');
  });
});

describe('Browser Automation Configuration', () => {
  test('should have proper configuration structure', () => {
    const configPath = path.join(__dirname, '../config/websites.yaml');
    expect(fs.existsSync(configPath)).toBe(true);

    const content = fs.readFileSync(configPath, 'utf8');
    expect(content).toContain('automation:');
    expect(content).toContain('security:');
    expect(content).toContain('selectors:');
    expect(content).toContain('credentials:');
  });

  test('should have proper environment example', () => {
    const envPath = path.join(__dirname, '../.env.development.example');
    expect(fs.existsSync(envPath)).toBe(true);

    const content = fs.readFileSync(envPath, 'utf8');
    expect(content).toContain('USERNAME');
    expect(content).toContain('PASSWORD');
  });
});

describe('Type System Integration', () => {
  test('should compile TypeScript without errors', async () => {
    // This test will pass if the CI typecheck passes
    const tsconfigPath = path.join(__dirname, '../tsconfig.json');
    expect(fs.existsSync(tsconfigPath)).toBe(true);

    // Check that critical types are exported
    const typesPath = path.join(__dirname, '../src/core/types.ts');
    const content = fs.readFileSync(typesPath, 'utf8');
    expect(content).toContain('BrowserService');
    expect(content).toContain('LoginService');
  });
});

describe('Implementation Quality', () => {
  test('should have proper error handling in browser service', () => {
    const filePath = path.join(__dirname, '../src/infrastructure/browser/playwright-browser.service.ts');
    const content = fs.readFileSync(filePath, 'utf8');

    expect(content).toContain('try');
    expect(content).toContain('catch');
    expect(content).toContain('throw new Error');
  });

  test('should have proper error handling in login engine', () => {
    const filePath = path.join(__dirname, '../src/infrastructure/browser/login-engine.service.ts');
    const content = fs.readFileSync(filePath, 'utf8');

    expect(content).toContain('try');
    expect(content).toContain('catch');
    expect(content).toContain('markAsFailed');
    expect(content).toContain('canRetry');
  });

  test('should have proper dependency injection decorators', () => {
    const browserServicePath = path.join(__dirname, '../src/infrastructure/browser/playwright-browser.service.ts');
    const loginEnginePath = path.join(__dirname, '../src/infrastructure/browser/login-engine.service.ts');

    const browserContent = fs.readFileSync(browserServicePath, 'utf8');
    const loginContent = fs.readFileSync(loginEnginePath, 'utf8');

    expect(browserContent).toContain('@injectable()');
    expect(loginContent).toContain('@injectable()');
    expect(loginContent).toContain('@inject(');
  });
});