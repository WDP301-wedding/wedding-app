import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const nodeForgeAdvisory = '1240912|node-forge|https://github.com/advisories/GHSA-86w9-cpqp-85rv';
const bracesAdvisory = '1240992|braces|https://github.com/advisories/GHSA-vfj7-8cjw-p6xm';
const reviewedAdvisories = new Set([nodeForgeAdvisory, bracesAdvisory]);
const reviewedNodeForgeVersion = '1.4.0';
const reviewedNodeForgeDependents = new Map([
  ['@expo/cli', '^1.3.3'],
  ['@expo/code-signing-certificates', '^1.3.3'],
]);
// @expo/metro-file-map@57.0.4 no longer depends on micromatch. Keep it out of
// this exception so a future reintroduction must receive a new scope review.
const reviewedBracesPackages = new Map([
  ['braces', '3.0.3'],
  ['micromatch', '4.0.8'],
  ['@jest/core', '29.7.0'],
  ['@jest/transform', '29.7.0'],
  ['jest-config', '29.7.0'],
  ['jest-haste-map', '29.7.0'],
  ['jest-message-util', '29.7.0'],
  ['metro-file-map', '0.84.5'],
]);
const reviewedMicromatchDependents = new Set([
  '@jest/core',
  '@jest/transform',
  'jest-config',
  'jest-haste-map',
  'jest-message-util',
  'metro-file-map',
]);
const reviewExpiresAt = new Date('2026-10-16T00:00:00.000Z');
const dependencySections = [
  'dependencies',
  'devDependencies',
  'optionalDependencies',
  'peerDependencies',
];
const knownSeverities = new Set(['info', 'low', 'moderate', 'high', 'critical']);

function advisoryIdentity(advisory) {
  return `${advisory?.source}|${advisory?.name}|${advisory?.url}`;
}

function isHighOrCritical(vulnerability) {
  return vulnerability?.severity === 'high' || vulnerability?.severity === 'critical';
}

function findRootAdvisories(packageName, vulnerabilities) {
  const roots = new Set();
  const unresolved = new Set();
  const visiting = new Set();
  const visited = new Set();

  function visit(currentPackage) {
    if (visiting.has(currentPackage) || visited.has(currentPackage)) {
      return;
    }

    const vulnerability = vulnerabilities[currentPackage];
    if (!vulnerability || !Array.isArray(vulnerability.via)) {
      unresolved.add(`unresolved:${currentPackage}`);
      return;
    }

    visiting.add(currentPackage);
    for (const cause of vulnerability.via) {
      if (typeof cause === 'string') {
        const dependency = vulnerabilities[cause];
        if (!dependency) {
          unresolved.add(`unresolved:${cause}`);
        } else if (isHighOrCritical(dependency)) {
          visit(cause);
        } else if (!knownSeverities.has(dependency.severity)) {
          unresolved.add(`unresolved:${cause}`);
        }
      } else if (cause && typeof cause === 'object') {
        if (isHighOrCritical(cause)) {
          roots.add(advisoryIdentity(cause));
        } else if (!knownSeverities.has(cause.severity)) {
          unresolved.add(`unresolved:${currentPackage}`);
        }
      } else {
        unresolved.add(`unresolved:${currentPackage}`);
      }
    }

    visiting.delete(currentPackage);
    visited.add(currentPackage);
  }

  visit(packageName);
  if (roots.size === 0 && unresolved.size === 0) {
    unresolved.add(`unresolved:${packageName}`);
  }

  return new Set([...roots, ...unresolved]);
}

function packageNameFromLockPath(lockPath) {
  const marker = 'node_modules/';
  const markerIndex = lockPath.lastIndexOf(marker);
  return markerIndex === -1 ? lockPath : lockPath.slice(markerIndex + marker.length);
}

function findDependencyReferences(lockEntry, dependencyName = 'node-forge') {
  const references = [];

  for (const section of dependencySections) {
    const dependencies = lockEntry?.[section];
    if (dependencies && Object.hasOwn(dependencies, dependencyName)) {
      references.push({ section, range: dependencies[dependencyName] });
    }
  }

  return references;
}

function validateNodeForgeLockScope(lockfile) {
  const blocking = [];
  if (
    !lockfile ||
    typeof lockfile !== 'object' ||
    lockfile.lockfileVersion !== 3 ||
    !lockfile.packages ||
    typeof lockfile.packages !== 'object'
  ) {
    return ['Cannot verify the node-forge exception against an npm v3 lockfile.'];
  }

  const entries = Object.entries(lockfile.packages);
  const nodeForgeEntries = entries.filter(
    ([lockPath]) => packageNameFromLockPath(lockPath) === 'node-forge',
  );
  if (
    nodeForgeEntries.length !== 1 ||
    nodeForgeEntries[0]?.[1]?.version !== reviewedNodeForgeVersion
  ) {
    const versions = nodeForgeEntries.map(([, entry]) => entry?.version ?? 'unknown').join(', ');
    blocking.push(
      `Expected exactly one node-forge@${reviewedNodeForgeVersion} lockfile entry; found ` +
        `${nodeForgeEntries.length}${versions ? ` (${versions})` : ''}.`,
    );
  }

  const rootReferences = findDependencyReferences(lockfile.packages['']);
  if (rootReferences.length > 0) {
    blocking.push('node-forge must not be a direct app dependency.');
  }

  const dependentReferences = [];
  for (const [lockPath, entry] of entries) {
    if (!lockPath || packageNameFromLockPath(lockPath) === 'node-forge') {
      continue;
    }

    for (const reference of findDependencyReferences(entry)) {
      dependentReferences.push({
        packageName: packageNameFromLockPath(lockPath),
        lockPath,
        ...reference,
      });
    }
  }

  for (const [packageName, expectedRange] of reviewedNodeForgeDependents) {
    const matches = dependentReferences.filter(
      (reference) => reference.packageName === packageName,
    );
    if (matches.length === 0) {
      blocking.push(`Missing reviewed node-forge dependent: ${packageName}.`);
      continue;
    }
    if (matches.length > 1) {
      blocking.push(
        `Expected one node-forge reference from ${packageName}; found ${matches.length}.`,
      );
    }
    for (const match of matches) {
      if (match.section !== 'dependencies' || match.range !== expectedRange) {
        blocking.push(
          `Unexpected node-forge range for ${packageName}: ` +
            `${match.section}:${String(match.range)} (expected dependencies:${expectedRange}).`,
        );
      }
    }
  }

  for (const reference of dependentReferences) {
    if (!reviewedNodeForgeDependents.has(reference.packageName)) {
      blocking.push(
        `Unexpected node-forge dependent: ${reference.packageName} at ${reference.lockPath}.`,
      );
    }
  }

  return blocking;
}

function validateBracesLockScope(lockfile) {
  const blocking = [];
  if (
    !lockfile ||
    typeof lockfile !== 'object' ||
    lockfile.lockfileVersion !== 3 ||
    !lockfile.packages ||
    typeof lockfile.packages !== 'object'
  ) {
    return ['Cannot verify the braces exception against an npm v3 lockfile.'];
  }

  const entries = Object.entries(lockfile.packages);
  for (const [packageName, expectedVersion] of reviewedBracesPackages) {
    const matches = entries.filter(
      ([lockPath]) => packageNameFromLockPath(lockPath) === packageName,
    );
    if (matches.length !== 1 || matches[0]?.[1]?.version !== expectedVersion) {
      blocking.push(`Expected exactly one ${packageName}@${expectedVersion} lockfile entry.`);
    }
  }

  const rootBraces = findDependencyReferences(lockfile.packages[''], 'braces');
  const rootMicromatch = findDependencyReferences(lockfile.packages[''], 'micromatch');
  if (rootBraces.length > 0 || rootMicromatch.length > 0) {
    blocking.push('braces and micromatch must not be direct app dependencies.');
  }

  const bracesReferences = [];
  const micromatchReferences = [];
  for (const [lockPath, entry] of entries) {
    if (!lockPath) continue;
    const packageName = packageNameFromLockPath(lockPath);
    for (const reference of findDependencyReferences(entry, 'braces')) {
      bracesReferences.push({ packageName, ...reference });
    }
    for (const reference of findDependencyReferences(entry, 'micromatch')) {
      micromatchReferences.push({ packageName, ...reference });
    }
  }

  if (
    bracesReferences.length !== 1 ||
    bracesReferences[0]?.packageName !== 'micromatch' ||
    bracesReferences[0]?.section !== 'dependencies' ||
    bracesReferences[0]?.range !== '^3.0.3'
  ) {
    blocking.push('Unexpected braces dependency scope.');
  }

  const actualMicromatchDependents = new Set();
  for (const reference of micromatchReferences) {
    actualMicromatchDependents.add(reference.packageName);
    if (reference.section !== 'dependencies' || reference.range !== '^4.0.4') {
      blocking.push(
        `Unexpected micromatch range for ${reference.packageName}: ` +
          `${reference.section}:${String(reference.range)}.`,
      );
    }
  }
  if (
    actualMicromatchDependents.size !== reviewedMicromatchDependents.size ||
    [...actualMicromatchDependents].some(
      (packageName) => !reviewedMicromatchDependents.has(packageName),
    )
  ) {
    blocking.push(
      `Unexpected micromatch dependents: ${[...actualMicromatchDependents].sort().join(', ')}.`,
    );
  }

  return blocking;
}

export function evaluateAuditReport(report, lockfile, now = new Date()) {
  if (
    !report ||
    typeof report !== 'object' ||
    !report.vulnerabilities ||
    typeof report.vulnerabilities !== 'object' ||
    typeof now?.getTime !== 'function' ||
    Number.isNaN(now.getTime())
  ) {
    throw new Error('npm audit returned an invalid report.');
  }

  const allowed = [];
  const blocking = [];
  const observedReviewedAdvisories = new Set();

  for (const [packageName, vulnerability] of Object.entries(report.vulnerabilities)) {
    if (
      !vulnerability ||
      typeof vulnerability !== 'object' ||
      !knownSeverities.has(vulnerability.severity) ||
      !Array.isArray(vulnerability.via)
    ) {
      blocking.push(`Invalid vulnerability data: ${packageName}.`);
      continue;
    }

    if (vulnerability?.severity === 'critical') {
      blocking.push(`Critical vulnerability: ${packageName}.`);
      continue;
    }

    if (vulnerability?.severity !== 'high') {
      continue;
    }

    const roots = [...findRootAdvisories(packageName, report.vulnerabilities)];
    if (roots.length === 0 || roots.some((root) => !reviewedAdvisories.has(root))) {
      blocking.push(`Unreviewed high vulnerability: ${packageName} (${roots.join(', ')}).`);
      continue;
    }

    for (const root of roots) observedReviewedAdvisories.add(root);
    allowed.push(packageName);
  }

  allowed.sort();
  if (allowed.length > 0 && now >= reviewExpiresAt) {
    blocking.push(`The dependency audit allowlist expired at ${reviewExpiresAt.toISOString()}.`);
  }
  if (observedReviewedAdvisories.has(nodeForgeAdvisory)) {
    blocking.push(...validateNodeForgeLockScope(lockfile));
  }
  if (observedReviewedAdvisories.has(bracesAdvisory)) {
    blocking.push(...validateBracesLockScope(lockfile));
  }

  return { ok: blocking.length === 0, allowed, blocking };
}

function runNpmAudit() {
  const npmExecutable = process.env.npm_execpath;
  const useWindowsShell = !npmExecutable && process.platform === 'win32';
  const command = npmExecutable ? process.execPath : useWindowsShell ? process.env.ComSpec : 'npm';
  const arguments_ = npmExecutable
    ? [npmExecutable, 'audit', '--json']
    : useWindowsShell
      ? ['/d', '/s', '/c', 'npm audit --json']
      : ['audit', '--json'];
  const audit = spawnSync(command, arguments_, {
    encoding: 'utf8',
    windowsHide: true,
  });

  if (audit.error) {
    throw audit.error;
  }

  if (!audit.stdout.trim()) {
    throw new Error(`npm audit produced no JSON output. ${audit.stderr.trim()}`);
  }

  const report = JSON.parse(audit.stdout);
  if (report.error) {
    throw new Error(`npm audit failed: ${report.error.summary ?? 'unknown registry error'}`);
  }

  return report;
}

function main() {
  const report = runNpmAudit();
  const lockfile = JSON.parse(
    readFileSync(new URL('../package-lock.json', import.meta.url), { encoding: 'utf8' }),
  );
  const result = evaluateAuditReport(report, lockfile);
  const counts = report.metadata?.vulnerabilities;

  if (counts) {
    console.log(
      `Audit findings: ${counts.critical ?? 0} critical, ${counts.high ?? 0} high, ` +
        `${counts.moderate ?? 0} moderate, ${counts.low ?? 0} low.`,
    );
  }

  if (result.allowed.length > 0 && result.ok) {
    console.warn(
      `Temporarily allowed the reviewed node-forge/braces advisories through 2026-10-15 across ` +
        `${result.allowed.length} audit package(s); lockfile scope verified.`,
    );
  }

  if (!result.ok) {
    for (const reason of result.blocking) {
      console.error(reason);
    }
    process.exitCode = 1;
  }
}

const isMain = process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url;
if (isMain) {
  main();
}
