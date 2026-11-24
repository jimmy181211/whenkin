import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

// Run both development tools without requiring globally installed Node packages.
const root = fileURLToPath(new URL('../../../', import.meta.url));
const children = [
  spawn(process.execPath, [
    '--import',
    'tsx',
    '--watch',
    'App/backend/server.ts',
  ], {
    cwd: root,
    env: process.env,
    stdio: 'inherit',
  }),
  spawn(process.execPath, ['node_modules/vite/bin/vite.js'], {
    cwd: root,
    env: process.env,
    stdio: 'inherit',
  }),
];
let stopping = false;

/**
 * Stop both development processes once and preserve the requested exit
 * code.
 */
function stop(code = 0) {
  if (stopping) {
    return;
  }
  stopping = true;
  for (const child of children) {
    child.kill('SIGTERM');
  }
  process.exitCode = code;
}

for (const child of children) {
  child.on(
    'error',
    /* Stop development if a child process cannot start. */
    () => stop(1),
  );
  child.on(
    'exit',
    /* Stop the other development process when this one exits. */
    (code) => stop(code ?? 0),
  );
}
process.on(
  'SIGINT',
  /* Stop development when the terminal receives an interrupt. */
  () => stop(),
);
process.on(
  'SIGTERM',
  /* Stop development when the process receives a termination request. */
  () => stop(),
);
