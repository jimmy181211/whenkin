import {
  rmSync,
  lstatSync,
  existsSync,
  mkdirSync,
  copyFileSync,
  readFileSync,
  writeFileSync,
} from 'node:fs';
import { fileURLToPath } from 'node:url';
import {
  join,
  resolve,
} from 'node:path';
import { spawnSync } from 'node:child_process';

const root = fileURLToPath(new URL('../', import.meta.url));
const mode = process.argv[2] || 'all';
if (![
  'all',
  'server',
  'sites',
].includes(mode)) {
  throw new Error('Choose server, sites or all.');
}
const serverOutput = resolve(root, 'dist/node');
if (serverOutput !== join(resolve(root), 'dist', 'node')) {
  throw new Error('Invalid build output.');
}
if (
  existsSync(join(root, 'dist')) &&
  lstatSync(join(root, 'dist')).isSymbolicLink()
) {
  throw new Error('Build output must stay inside the checkout.');
}
// Remove only generated backend output, so deleted source modules cannot remain in a build.
if (mode !== 'sites') {
  rmSync(serverOutput, {
    recursive: true,
    force: true,
  });
}
if (mode !== 'server') {
  rmSync(join(resolve(root), 'dist', 'server'), {
    recursive: true,
    force: true,
  });
}
const commands = [[
  'node_modules/vite/bin/vite.js',
  'build',
]];
if (mode !== 'sites') {
  commands.push([
    'node_modules/typescript/bin/tsc',
    '-p',
    'App/backend/tsconfig.json',
  ]);
}
if (mode !== 'server') {
  commands.push([
    'node_modules/wrangler/bin/wrangler.js',
    'deploy',
    '--dry-run',
    '--config',
    'wrangler.json',
    '--outdir',
    'dist/server',
  ]);
}
for (const args of commands) {
  const result = spawnSync(process.execPath, args, {
    cwd: root,
    stdio: 'inherit',
  });
  if (result.error || result.status !== 0) {
    process.exit(result.status || 1);
  }
}
if (mode !== 'server') {
  mkdirSync(join(root, 'dist/.openai'), { recursive: true });
  copyFileSync(
    join(root, '.openai/hosting.json'),
    join(root, 'dist/.openai/hosting.json'),
  );
  const worker = JSON.parse(readFileSync(join(root, 'wrangler.json'), 'utf8'));
  worker.main = './index.js';
  worker.assets.directory = '../client';
  writeFileSync(
    join(root, 'dist/server/wrangler.json'),
    JSON.stringify(worker, null, 2) + '\n',
  );
}
