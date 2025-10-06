/** @type {import('jest').Config} */
export default {
  preset: 'ts-jest/presets/default-esm',
  testEnvironment: 'node',
  extensionsToTreatAsEsm: ['.ts'],
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  transform: {
    '^.+\\.ts$': ['ts-jest', {
      useESM: true,
      tsconfig: {
        module: 'ES2022',
        verbatimModuleSyntax: false,
      }
    }],
  },
  testMatch: ['**/__tests__/**/*.ts', '**/?(*.)+(spec|test).ts'],
  testPathIgnorePatterns: ['\\.d\\.ts$', 'worktrees/'],
  collectCoverageFrom: ['src/**/*.ts'],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  // Increase timeout for CI environment and browser automation
  testTimeout: process.env.CI === 'true' ? 120000 : 60000, // 2 minutes in CI, 1 minute locally
  globalSetup: '<rootDir>/jest.global-setup.mjs',
  globalTeardown: '<rootDir>/jest.global-teardown.mjs',
};