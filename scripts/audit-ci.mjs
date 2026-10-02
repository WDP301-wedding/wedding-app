import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const reviewedAdvisory = '1240912|node-forge|https://github.com/advisories/GHSA-86w9-cpqp-85rv';
const reviewedNodeForgeVersion = '1.4.0';
const reviewedNodeForgeDependents = new Map([
  ['@expo/cli', '^1.3.3'],
  ['@expo/code-signing-certificates', '^1.3.3'],
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

function findDependencyReferences(lockEntry) {
  const references = [];

  for (const section of dependencySections) {
    const dependencies = lockEntry?.[section];
    if (dependencies && Object.hasOwn(dependencies, 'node-forge')) {
      references.push({ section, range: dependencies['node-forge'] });
    }
  }

  return references;
}

function validateReviewedLockScope(lockfile) {
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
    if (roots.length === 0 || roots.some((root) => root !== reviewedAdvisory)) {
      blocking.push(`Unreviewed high vulnerability: ${packageName} (${roots.join(', ')}).`);
      continue;
    }

    allowed.push(packageName);
  }

  allowed.sort();
  if (allowed.length > 0 && now >= reviewExpiresAt) {
    blocking.push(`The node-forge allowlist expired at ${reviewExpiresAt.toISOString()}.`);
  }
  if (allowed.length > 0) {
    blocking.push(...validateReviewedLockScope(lockfile));
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
      `Temporarily allowed GHSA-86w9-cpqp-85rv through 2026-10-15 across ` +
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
