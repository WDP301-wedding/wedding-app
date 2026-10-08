/** @type {import('jest').Config} */
module.exports = {
  preset: 'jest-expo',
  testMatch: ['<rootDir>/src/**/*.test.{ts,tsx}'],
  collectCoverageFrom: [
    'src/screens/**/*.{ts,tsx}',
    'src/lib/api/client.ts',
    'src/features/booking-lifecycle/**/*.{ts,tsx}',
    '!src/**/*.test.{ts,tsx}',
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'json-summary', 'html'],
  coverageThreshold: {
    global: {
      branches: 80,
      lines: 80,
    },
  },
};
