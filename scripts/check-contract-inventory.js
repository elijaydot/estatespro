import { execSync } from 'node:child_process';
import { requiresInventoryUpdate } from './contract-inventory-check-core.js';

function run(command) {
  return execSync(command, { encoding: 'utf-8' }).trim();
}

function getChangedFiles() {
  const eventName = process.env.GITHUB_EVENT_NAME;
  const baseRef = process.env.GITHUB_BASE_REF;

  try {
    if (eventName === 'pull_request' && baseRef) {
      run(`git fetch --no-tags --depth=1 origin ${baseRef}`);
      const diff = run(`git diff --name-only origin/${baseRef}...HEAD`);
      return diff ? diff.split('\n').filter(Boolean) : [];
    }

    let hasPreviousCommit = false;
    try {
      execSync('git rev-parse --verify HEAD~1', { stdio: 'ignore' });
      hasPreviousCommit = true;
    } catch {
      hasPreviousCommit = false;
    }

    if (hasPreviousCommit) {
      const diff = run('git diff --name-only HEAD~1...HEAD');
      return diff ? diff.split('\n').filter(Boolean) : [];
    }

    const allFiles = run('git ls-files');
    return allFiles ? allFiles.split('\n').filter(Boolean) : [];
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('[contract-inventory-check] Failed to determine changed files:', message);
    process.exit(1);
  }
}

const changedFiles = getChangedFiles();
const result = requiresInventoryUpdate(changedFiles);

if (result.shouldFail) {
  console.error('[contract-inventory-check] Contract-sensitive endpoint changed without updating docs/parity/API_CONTRACT_INVENTORY.md');
  console.error('[contract-inventory-check] Changed files:');
  for (const file of changedFiles) {
    console.error(` - ${file}`);
  }
  process.exit(1);
}

if (result.shouldFailPolicy) {
  console.error('[contract-inventory-check] Webhook-capable endpoint changed without updating docs/parity/API_VERSIONING_POLICY.md');
  console.error('[contract-inventory-check] Changed files:');
  for (const file of changedFiles) {
    console.error(` - ${file}`);
  }
  process.exit(1);
}

console.log('[contract-inventory-check] OK');
