// Copies ONLY the files the browser needs into ./public for deployment.
// Never deploy the repo root: it contains .env.local (secrets), convex/ sources, QA scripts and notes.
import { cpSync, rmSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const out = join(root, 'public');
const FILES = ['index.html', 'styles.css', 'app.js', 'cloud.js', 'quote-math.js', 'vendor'];

rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });
for (const f of FILES) {
  const src = join(root, f);
  if (!existsSync(src)) { console.error('missing: ' + f); process.exit(1); }
  cpSync(src, join(out, f), { recursive: true });
}
console.log('staged ' + FILES.join(', ') + ' -> public/');
