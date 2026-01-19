/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  // Optional: If you have tests outside of src/ or tests/
  // roots: ['<rootDir>/src', '<rootDir>/tests'],
  // Optional: Match test files (adjust if your naming convention differs)
  testMatch: ['**/?(*.)+(spec|test).+(ts|tsx)'],
  // Ignore test files in annotations module
  testPathIgnorePatterns: [
    '/node_modules/',
    '/src/modules/annotations/.*\\.(spec|test)\\.(ts|tsx)$',
  ],
  // Optional: Module file extensions for importing
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  // Map 'src/*' paths to '<rootDir>/src/*'
  moduleNameMapper: {
    '^@semble/types$': '<rootDir>/src/types/src/index.ts',
    '^src/(.*)$': '<rootDir>/src/$1',
  },
  // Increase timeout for tests that use containers
  testTimeout: 60000,
  setupFiles: ['<rootDir>/jest.setup.js'],
};
