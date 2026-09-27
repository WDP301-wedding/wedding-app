const { defineConfig, globalIgnores } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');
const prettierConfig = require('eslint-config-prettier/flat');

module.exports = defineConfig([
  ...expoConfig,
  globalIgnores(['.expo/**', 'coverage/**', 'dist/**', 'expo-env.d.ts']),
  prettierConfig,
]);
