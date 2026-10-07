import assert from 'node:assert/strict';
import test from 'node:test';

import { evaluateAuditReport } from './audit-ci.mjs';

const beforeReview = new Date('2026-10-15T23:59:59.000Z');

function knownExpoLockfile() {
  return {
    lockfileVersion: 3,
    packages: {
      '': {
        name: 'wedding-app',
        dependencies: {
          expo: '~57.0.27',
        },
      },
      'node_modules/@expo/code-signing-certificates': {
        version: '0.0.6',
        dependencies: {
          'node-forge': '^1.3.3',
        },
      },
      'node_modules/expo/node_modules/@expo/cli': {
        version: '57.0.27',
        dependencies: {
          '@expo/code-signing-certificates': '0.0.6',
          'node-forge': '^1.3.3',
        },
      },
      'node_modules/node-forge': {
        version: '1.4.0',
      },
    },
  };
}

function knownExpoAuditReport() {
  return {
    vulnerabilities: {
      'node-forge': {
        severity: 'high',
        via: [
          {
            source: 1240912,
            name: 'node-forge',
            severity: 'high',
            url: 'https://github.com/advisories/GHSA-86w9-cpqp-85rv',
          },
        ],
      },
      '@expo/code-signing-certificates': {
        severity: 'high',
        via: ['node-forge'],
      },
      '@expo/cli': {
        severity: 'high',
        via: ['@expo/code-signing-certificates', 'node-forge'],
      },
      expo: {
        severity: 'high',
        via: ['@expo/cli'],
      },
      'decode-uri-component': {
        severity: 'moderate',
        via: [],
      },
    },
  };
}

function knownExpoAndBracesLockfile() {
  const lockfile = knownExpoLockfile();
  const micromatchDependents = new Map([
    ['@jest/core', '29.7.0'],
    ['@jest/transform', '29.7.0'],
    ['jest-config', '29.7.0'],
    ['jest-haste-map', '29.7.0'],
    ['jest-message-util', '29.7.0'],
    ['metro-file-map', '0.84.5'],
  ]);
  lockfile.packages['node_modules/braces'] = { version: '3.0.3' };
  lockfile.packages['node_modules/micromatch'] = {
    version: '4.0.8',
    dependencies: { braces: '^3.0.3' },
  };
  for (const [packageName, version] of micromatchDependents) {
    lockfile.packages[`node_modules/${packageName}`] = {
      version,
      dependencies: { micromatch: '^4.0.4' },
    };
  }
  return lockfile;
}

function knownExpoAndBracesAuditReport() {
  const report = knownExpoAuditReport();
  report.vulnerabilities.braces = {
    severity: 'high',
    via: [
      {
        source: 1240992,
        name: 'braces',
        severity: 'high',
        url: 'https://github.com/advisories/GHSA-vfj7-8cjw-p6xm',
      },
    ],
  };
  report.vulnerabilities.micromatch = { severity: 'high', via: ['braces'] };
  report.vulnerabilities['metro-file-map'] = {
    severity: 'high',
    via: ['micromatch'],
  };
  return report;
}

test('allows only the reviewed Expo node-forge advisory before its review date', () => {
  const result = evaluateAuditReport(knownExpoAuditReport(), knownExpoLockfile(), beforeReview);

  assert.equal(result.ok, true);
  assert.deepEqual(result.blocking, []);
  assert.deepEqual(result.allowed.sort(), [
    '@expo/cli',
    '@expo/code-signing-certificates',
    'expo',
    'node-forge',
  ]);
});

test('allows the reviewed build-only braces advisory with an exact lockfile scope', () => {
  const result = evaluateAuditReport(
    knownExpoAndBracesAuditReport(),
    knownExpoAndBracesLockfile(),
    beforeReview,
  );

  assert.equal(result.ok, true);
  assert.deepEqual(result.blocking, []);
  assert.deepEqual(result.allowed, [
    '@expo/cli',
    '@expo/code-signing-certificates',
    'braces',
    'expo',
    'metro-file-map',
    'micromatch',
    'node-forge',
  ]);
});

test('blocks the braces exception if Expo reintroduces a micromatch dependency', () => {
  const lockfile = knownExpoAndBracesLockfile();
  lockfile.packages['node_modules/@expo/metro-file-map'] = {
    version: '57.0.4',
    dependencies: { micromatch: '^4.0.4' },
  };

  const result = evaluateAuditReport(knownExpoAndBracesAuditReport(), lockfile, beforeReview);

  assert.equal(result.ok, false);
  assert.match(result.blocking.join('\n'), /micromatch dependents/i);
});

test('blocks the braces exception when its toolchain graph changes', () => {
  const lockfile = knownExpoAndBracesLockfile();
  lockfile.packages['node_modules/example'] = {
    version: '1.0.0',
    dependencies: { micromatch: '^4.0.4' },
  };

  const result = evaluateAuditReport(knownExpoAndBracesAuditReport(), lockfile, beforeReview);

  assert.equal(result.ok, false);
  assert.match(result.blocking.join('\n'), /micromatch dependents/i);
});

test('allows the reviewed advisory through a cyclic propagated Expo audit graph', () => {
  const report = knownExpoAuditReport();
  report.vulnerabilities['expo-router'] = {
    severity: 'high',
    via: ['expo'],
  };
  report.vulnerabilities.expo.via.push('expo-router');
  report.vulnerabilities['eslint-config-expo'] = {
    severity: 'high',
    via: ['expo'],
  };

  const result = evaluateAuditReport(report, knownExpoLockfile(), beforeReview);

  assert.equal(result.ok, true);
  assert.deepEqual(result.blocking, []);
  assert.deepEqual(result.allowed, [
    '@expo/cli',
    '@expo/code-signing-certificates',
    'eslint-config-expo',
    'expo',
    'expo-router',
    'node-forge',
  ]);
});

test('blocks an unrelated high-severity vulnerability', () => {
  const report = knownExpoAuditReport();
  report.vulnerabilities.lodash = {
    severity: 'high',
    via: [
      {
        source: 999999,
        name: 'lodash',
        severity: 'high',
        url: 'https://github.com/advisories/GHSA-example',
      },
    ],
  };

  const result = evaluateAuditReport(report, knownExpoLockfile(), beforeReview);

  assert.equal(result.ok, false);
  assert.match(result.blocking.join('\n'), /lodash/);
});

test('blocks a new direct advisory on an otherwise allowlisted Expo package', () => {
  const report = knownExpoAuditReport();
  report.vulnerabilities.expo.via.push({
    source: 999998,
    name: 'expo',
    severity: 'high',
    url: 'https://github.com/advisories/GHSA-another',
  });

  const result = evaluateAuditReport(report, knownExpoLockfile(), beforeReview);

  assert.equal(result.ok, false);
  assert.match(result.blocking.join('\n'), /expo/);
});

test('blocks a malformed advisory cause even when another reviewed path exists', () => {
  const report = knownExpoAuditReport();
  report.vulnerabilities.expo.via.push({ source: 999997, name: 'expo' });

  const result = evaluateAuditReport(report, knownExpoLockfile(), beforeReview);

  assert.equal(result.ok, false);
  assert.match(result.blocking.join('\n'), /unresolved:expo/i);
});

test('blocks a high-severity graph that contains only a cycle', () => {
  const report = {
    vulnerabilities: {
      alpha: { severity: 'high', via: ['beta'] },
      beta: { severity: 'high', via: ['alpha'] },
    },
  };

  const result = evaluateAuditReport(report, knownExpoLockfile(), beforeReview);

  assert.equal(result.ok, false);
  assert.match(result.blocking.join('\n'), /unresolved:(alpha|beta)/i);
});

test('always blocks critical vulnerabilities', () => {
  const report = knownExpoAuditReport();
  report.vulnerabilities.example = {
    severity: 'critical',
    via: [],
  };

  const result = evaluateAuditReport(report, knownExpoLockfile(), beforeReview);

  assert.equal(result.ok, false);
  assert.match(result.blocking.join('\n'), /critical.*example/i);
});

test('blocks the reviewed advisory when its review date arrives', () => {
  const result = evaluateAuditReport(
    knownExpoAuditReport(),
    knownExpoLockfile(),
    new Date('2026-10-16T00:00:00.000Z'),
  );

  assert.equal(result.ok, false);
  assert.match(result.blocking.join('\n'), /expired/i);
});

test('passes after the review date when no high or critical findings remain', () => {
  const report = knownExpoAuditReport();
  report.vulnerabilities = {
    'decode-uri-component': report.vulnerabilities['decode-uri-component'],
  };

  const result = evaluateAuditReport(
    report,
    knownExpoLockfile(),
    new Date('2026-10-16T00:00:00.000Z'),
  );

  assert.equal(result.ok, true);
  assert.deepEqual(result.allowed, []);
});

test('blocks the exception when node-forge is upgraded or downgraded', () => {
  const lockfile = knownExpoLockfile();
  lockfile.packages['node_modules/node-forge'].version = '1.3.3';

  const result = evaluateAuditReport(knownExpoAuditReport(), lockfile, beforeReview);

  assert.equal(result.ok, false);
  assert.match(result.blocking.join('\n'), /node-forge@1\.4\.0/i);
});

test('blocks the exception when node-forge becomes a direct app dependency', () => {
  const lockfile = knownExpoLockfile();
  lockfile.packages[''].dependencies['node-forge'] = '1.4.0';

  const result = evaluateAuditReport(knownExpoAuditReport(), lockfile, beforeReview);

  assert.equal(result.ok, false);
  assert.match(result.blocking.join('\n'), /direct app dependency/i);
});

test('blocks the exception when a new package depends directly on node-forge', () => {
  const lockfile = knownExpoLockfile();
  lockfile.packages['node_modules/example'] = {
    version: '1.0.0',
    dependencies: {
      'node-forge': '^1.3.3',
    },
  };

  const result = evaluateAuditReport(knownExpoAuditReport(), lockfile, beforeReview);

  assert.equal(result.ok, false);
  assert.match(result.blocking.join('\n'), /unexpected node-forge dependent.*example/i);
});

test('blocks the exception when a reviewed dependency range changes', () => {
  const lockfile = knownExpoLockfile();
  lockfile.packages['node_modules/expo/node_modules/@expo/cli'].dependencies['node-forge'] =
    '^1.4.0';

  const result = evaluateAuditReport(knownExpoAuditReport(), lockfile, beforeReview);

  assert.equal(result.ok, false);
  assert.match(result.blocking.join('\n'), /unexpected node-forge range.*@expo\/cli/i);
});
