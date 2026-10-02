import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const reviewedAdvisory = '1240912|node-forge|https://github.com/advisories/GHSA-86w9-cpqp-85rv';
const reviewedPackages = new Set([
  'node-forge',
  '@expo/code-signing-certificates',
  '@expo/cli',
  'expo',
]);
const reviewExpiresAt = new Date('2026-10-16T00:00:00.000Z');

function advisoryIdentity(advisory) {
  return `${advisory?.source}|${advisory?.name}|${advisory?.url}`;
}

function isHighOrCritical(vulnerability) {
  return vulnerability?.severity === 'high' || vulnerability?.severity === 'critical';
}

function findRootAdvisories(packageName, vulnerabilities, path = []) {
  if (path.includes(packageName)) {
    return new Set([`cycle:${[...path, packageName].join('>')}`]);
  }

  const vulnerability = vulnerabilities[packageName];
  if (!vulnerability || !Array.isArray(vulnerability.via)) {
    return new Set([`unresolved:${packageName}`]);
  }

  const roots = new Set();
  for (const cause of vulnerability.via) {
    if (typeof cause === 'string') {
      const dependency = vulnerabilities[cause];
      if (!dependency) {
        roots.add(`unresolved:${cause}`);
      } else if (isHighOrCritical(dependency)) {
        for (const root of findRootAdvisories(cause, vulnerabilities, [...path, packageName])) {
          roots.add(root);
        }
      }
    } else if (cause && typeof cause === 'object') {
      roots.add(advisoryIdentity(cause));
    } else {
      roots.add(`unresolved:${packageName}`);
    }
  }

  if (roots.size === 0) {
    roots.add(`unresolved:${packageName}`);
  }

  return roots;
}

export function evaluateAuditReport(report, now = new Date()) {
  if (
    !report ||
    typeof report !== 'object' ||
    !report.vulnerabilities ||
    typeof report.vulnerabilities !== 'object' ||
    Number.isNaN(now.getTime())
  ) {
    throw new Error('npm audit returned an invalid report.');
  }

  const allowed = [];
  const blocking = [];

  for (const [packageName, vulnerability] of Object.entries(report.vulnerabilities)) {
    if (vulnerability?.severity === 'critical') {
      blocking.push(`Critical vulnerability: ${packageName}.`);
      continue;
    }

    if (vulnerability?.severity !== 'high') {
      continue;
    }

    const roots = [...findRootAdvisories(packageName, report.vulnerabilities)];
    if (
      !reviewedPackages.has(packageName) ||
      roots.length === 0 ||
      roots.some((root) => root !== reviewedAdvisory)
    ) {
      blocking.push(`Unreviewed high vulnerability: ${packageName} (${roots.join(', ')}).`);
      continue;
    }

    allowed.push(packageName);
  }

  allowed.sort();
  if (allowed.length > 0 && now >= reviewExpiresAt) {
    blocking.push(`The node-forge allowlist expired at ${reviewExpiresAt.toISOString()}.`);
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
  const result = evaluateAuditReport(report);
  const counts = report.metadata?.vulnerabilities;

  if (counts) {
    console.log(
      `Audit findings: ${counts.critical ?? 0} critical, ${counts.high ?? 0} high, ` +
        `${counts.moderate ?? 0} moderate, ${counts.low ?? 0} low.`,
    );
  }

  if (result.allowed.length > 0) {
    console.warn(
      `Temporarily allowed GHSA-86w9-cpqp-85rv through 2026-10-15 for: ` +
        result.allowed.join(', '),
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
