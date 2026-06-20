import { execSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';

const projectId = process.env.SUPABASE_PROJECT_ID || 'zuwpvevqijwkkucmpkkr';
const schema = process.env.SUPABASE_SCHEMA || 'public';
const outputPath = process.env.SUPABASE_TYPES_OUTPUT || 'src/integrations/supabase/types.ts';

if (!process.env.SUPABASE_ACCESS_TOKEN) {
  console.error('[supabase-types] Missing SUPABASE_ACCESS_TOKEN.');
  console.error('[supabase-types] Run `supabase login` or set SUPABASE_ACCESS_TOKEN and retry.');
  process.exit(1);
}

try {
  const command = `npx --yes supabase gen types typescript --project-id ${projectId} --schema ${schema}`;
  const stdout = execSync(command, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });

  if (!stdout.trim().startsWith('export type Json')) {
    throw new Error('Unexpected output from supabase type generation. Output not written.');
  }

  writeFileSync(outputPath, stdout, { encoding: 'utf8' });
  console.log(`[supabase-types] Wrote ${outputPath}`);
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.error('[supabase-types] Generation failed:', message);
  process.exit(1);
}
