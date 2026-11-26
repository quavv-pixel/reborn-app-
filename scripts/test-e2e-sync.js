import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const env = {
  ...process.env,
  VITE_SUPABASE_URL: 'http://127.0.0.1:54329',
  VITE_SUPABASE_ANON_KEY: 'fake-anon-key',
  VITE_STRIPE_PAYMENT_LINK: 'https://buy.stripe.com/test_fake',
};
const steps = [
  ['node_modules/vite/bin/vite.js', ['build', '--outDir', '.e2e-build', '--emptyOutDir']],
  ['scripts/build-sw.js', ['.e2e-build']],
  ['test/e2e/sync.e2e.mjs', []],
];

for (const [script, args] of steps) {
  const result = spawnSync(process.execPath, [resolve(root, script), ...args], {
    cwd: root,
    env,
    stdio: 'inherit',
  });
  if (result.error) {
    console.error(`Could not start ${script}: ${result.error.message}`);
    process.exit(1);
  }
  if (result.status !== 0) process.exit(result.status ?? 1);
}
