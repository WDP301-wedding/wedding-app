const expoPreset = require('jest-expo/jest-preset');
const scriptPattern = '\\.[jt]sx?$';
const [babelTransformer, babelOptions] = expoPreset.transform[scriptPattern];

/** @type {import('jest').Config} */
module.exports = {
  preset: 'jest-expo',
  roots: ['<rootDir>/src'],
  // Keep lazy native imports mockable in Jest's CommonJS runtime; Metro is unchanged.
  transform: {
    ...expoPreset.transform,
    [scriptPattern]: [
      babelTransformer,
      {
        ...babelOptions,
        plugins: [...(babelOptions.plugins ?? []), '@babel/plugin-transform-dynamic-import'],
      },
    ],
  },
  testMatch: ['<rootDir>/src/**/*.test.{ts,tsx}'],
  collectCoverageFrom: [
    'src/screens/**/*.{ts,tsx}',
    'src/lib/api/client.ts',
    'src/features/booking-lifecycle/**/*.{ts,tsx}',
    'src/features/payments-billing/**/*.{ts,tsx}',
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
