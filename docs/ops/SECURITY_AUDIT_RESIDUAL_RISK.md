# Security Audit Residual Risk (Week 3)

## Date
2026-07-21

## Post-remediation status
- npm audit high: 1
- npm audit moderate: 1
- npm audit critical: 0

## Remaining advisories
1. esbuild dev-server request exposure (GHSA-67mh-4wv8-2f99)
   - surfaced via current Vite major line
   - npm fix path requires a breaking Vite major upgrade

## Why this is accepted temporarily
1. Exposure is in development tooling path, not runtime production bundle execution.
2. Production build is generated and hosted outside Vite dev server.
3. Current branch priority is release stabilization with low-regression patch updates.

## Mitigations in place
1. Keep dev server restricted to trusted local/staging network usage.
2. Do not expose Vite dev server directly to public internet.
3. Continue running check:audit in CI to block new critical spikes.

## Follow-up action
1. Execute controlled Vite major upgrade spike in Week 4 hardening.
2. Re-run full lint/test/build and npm audit after upgrade.
3. Remove this exception once advisory is cleared.
