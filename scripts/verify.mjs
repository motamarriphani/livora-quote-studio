// One-command check (`npm test`): typecheck frontend + backend, run unit
// tests, and guard a few backend invariants. CI runs this before deploying.
import { execSync } from 'node:child_process';
import { readFileSync, readdirSync } from 'node:fs';

const check = (label, cmd) => {
  try { execSync(cmd, { stdio: 'pipe' }); console.log('  ✓ ' + label); }
  catch (e) { console.error('  ✗ ' + label); console.error(String(e.stdout || '') + String(e.stderr || e.message)); process.exit(1); }
};
const assert = (label, ok) => {
  if (!ok) { console.error('  ✗ ' + label); process.exit(1); }
  console.log('  ✓ ' + label);
};

console.log('verify:');
check('frontend types (web/)', 'npx tsc -p web/tsconfig.json');
check('backend types (convex/)', 'npx tsc -p convex/tsconfig.json');
check('unit tests', 'npx vitest run --config web/vite.config.mts');

const convex = readdirSync('convex').filter((f) => f.endsWith('.ts'))
  .map((f) => readFileSync('convex/' + f, 'utf8')).join('\n');
assert('backend stores no untyped values (no v.any)', !convex.includes('v.any('));
assert('every public function checks the signed-in user',
  (convex.match(/export const \w+ = (query|mutation)\(/g) || []).length ===
  (convex.match(/await requireSubject\(ctx\)/g) || []).length);
console.log('all checks passed');
