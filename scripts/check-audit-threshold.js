import { spawnSync } from 'node:child_process';

function toNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function extractJson(raw) {
  if (!raw) return null;
  const start = raw.indexOf('{');
  const end = raw.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) return null;

  const candidate = raw.slice(start, end + 1);
  try {
    return JSON.parse(candidate);
  } catch {
    return null;
  }
}

function getVulnerabilityCounts(payload) {
  const metaCounts = payload?.metadata?.vulnerabilities;
  if (metaCounts && typeof metaCounts === 'object') {
    return {
      low: toNumber(metaCounts.low),
      moderate: toNumber(metaCounts.moderate),
      high: toNumber(metaCounts.high),
      critical: toNumber(metaCounts.critical),
    };
  }

  const vulnerabilities = payload?.vulnerabilities;
  if (vulnerabilities && typeof vulnerabilities === 'object') {
    let low = 0;
    let moderate = 0;
    let high = 0;
    let critical = 0;

    Object.values(vulnerabilities).forEach((item) => {
      const severity = item?.severity;
      if (severity === 'low') low += 1;
      if (severity === 'moderate') moderate += 1;
      if (severity === 'high') high += 1;
      if (severity === 'critical') critical += 1;
    });

    return { low, moderate, high, critical };
  }

  return { low: 0, moderate: 0, high: 0, critical: 0 };
}

const allowedHigh = toNumber(process.env.AUDIT_ALLOWED_HIGH, 12);
const allowedCritical = toNumber(process.env.AUDIT_ALLOWED_CRITICAL, 1);

const result = spawnSync('npm', ['audit', '--json'], {
  encoding: 'utf8',
  shell: process.platform === 'win32',
});

const mergedOutput = [result.stdout, result.stderr].filter(Boolean).join('\n');
const payload = extractJson(mergedOutput);

if (!payload) {
  console.error('Could not parse npm audit JSON output.');
  if (mergedOutput) {
    console.error(mergedOutput);
  }
  process.exit(1);
}

const counts = getVulnerabilityCounts(payload);
const summary = `npm audit counts -> low:${counts.low} moderate:${counts.moderate} high:${counts.high} critical:${counts.critical}`;
console.log(summary);

if (counts.critical > allowedCritical || counts.high > allowedHigh) {
  console.error(
    `Audit threshold exceeded. Allowed high<=${allowedHigh}, critical<=${allowedCritical}; found high=${counts.high}, critical=${counts.critical}.`,
  );
  process.exit(1);
}

console.log(`Audit threshold passed. Allowed high<=${allowedHigh}, critical<=${allowedCritical}.`);
process.exit(0);
