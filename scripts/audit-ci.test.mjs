import assert from 'node:assert/strict';
import test from 'node:test';

import { evaluateAuditReport } from './audit-ci.mjs';

const beforeReview = new Date('2026-10-15T23:59:59.000Z');

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

test('allows only the reviewed Expo node-forge advisory before its review date', () => {
  const result = evaluateAuditReport(knownExpoAuditReport(), beforeReview);

  assert.equal(result.ok, true);
  assert.deepEqual(result.blocking, []);
  assert.deepEqual(result.allowed.sort(), [
    '@expo/cli',
    '@expo/code-signing-certificates',
    'expo',
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

  const result = evaluateAuditReport(report, beforeReview);

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

  const result = evaluateAuditReport(report, beforeReview);

  assert.equal(result.ok, false);
  assert.match(result.blocking.join('\n'), /expo/);
});

test('always blocks critical vulnerabilities', () => {
  const report = knownExpoAuditReport();
  report.vulnerabilities.example = {
    severity: 'critical',
    via: [],
  };

  const result = evaluateAuditReport(report, beforeReview);

  assert.equal(result.ok, false);
  assert.match(result.blocking.join('\n'), /critical.*example/i);
});

test('blocks the reviewed advisory when its review date arrives', () => {
  const result = evaluateAuditReport(knownExpoAuditReport(), new Date('2026-10-16T00:00:00.000Z'));

  assert.equal(result.ok, false);
  assert.match(result.blocking.join('\n'), /expired/i);
});

test('passes after the review date when no high or critical findings remain', () => {
  const report = knownExpoAuditReport();
  report.vulnerabilities = {
    'decode-uri-component': report.vulnerabilities['decode-uri-component'],
  };

  const result = evaluateAuditReport(report, new Date('2026-10-16T00:00:00.000Z'));

  assert.equal(result.ok, true);
  assert.deepEqual(result.allowed, []);
});
