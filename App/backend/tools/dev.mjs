import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

// Run both development tools without requiring globally installed Node packages.
const root = fileURLToPath(new URL('../../../', import.meta.url));
const children = [
  spawn(process.execPath, ['--import', 'tsx', '--watch', 'App/backend/server.ts'], { cwd: root, env: process.env, stdio: 'inherit' }),
  spawn(process.execPath, ['node_modules/vite/bin/vite.js'], { cwd: root, env: process.env, stdio: 'inherit' }),
];
let stopping = false;
function stop(code = 0) {
  if (stopping) return;
  stopping = true;
  for (const child of children) child.kill('SIGTERM');
  process.exitCode = code;
}
for (const child of children) {
  child.on('error', () => stop(1));
  child.on('exit', code => stop(code ?? 0));
}
process.on('SIGINT', () => stop());
process.on('SIGTERM', () => stop());
