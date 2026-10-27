// One-command smoke check: syntax + bundling for every JS/TS source.
// Runs via `npm test` (no test framework needed for this static+Convex app).
import { execSync } from 'node:child_process';
import { readdirSync, rmSync } from 'node:fs';

const check = (label, cmd) => {
  try { execSync(cmd, { stdio: 'pipe' }); console.log('  ✓ ' + label); }
  catch (e) { console.error('  ✗ ' + label); console.error(String(e.stderr || e.message).split('\n').slice(0, 6).join('\n')); process.exit(1); }
};

console.log('verify:');
check('app.js syntax', 'node --check app.js');
check('quote-math syntax', 'node --check quote-math.js');
check('unit behavior', 'node scripts/unit.mjs');
check('cloud.js bundle', 'npx esbuild cloud.js --bundle --format=esm --outfile=convex_check.out.mjs --log-level=error');
for (const f of readdirSync('convex').filter((f) => f.endsWith('.ts'))) {
  check('convex/' + f, `npx esbuild convex/${f} --bundle --format=esm --outfile=convex_check.out.mjs --log-level=error`);
}
try { rmSync('convex_check.out.mjs', { force: true }); } catch { }
console.log('all checks passed');
