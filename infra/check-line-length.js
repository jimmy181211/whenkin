/** Enforce the authored-source line limit, including SQL and embedded templates. */
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const MAX_LINE_CHARACTERS = 100;
const CONFIG_FILES = new Set([
  '.editorconfig',
  '.gitignore',
  '.dockerignore',
  '.gitattributes',
  '.npmrc',
  '.env.example',
]);
const GENERATED_FILES = new Set(['pnpm-lock.yaml']);
const SOURCE_EXTENSIONS = /\.(?:[cm]?js|tsx?|css|sql|json|ya?ml|html|svg|sh|ps1|md)$/;

/**
 * Select maintained code/configuration, excluding dependencies, outputs, and frozen migrations.
 * @returns Whether the tracked or untracked file is part of this source check.
 */
function isAuthoredSource(file) {
  if (GENERATED_FILES.has(file) || file.startsWith('App/backend/db/migrations/')) {
    return false;
  }
  if (/^(?:node_modules|dist|outputs|\.qa-cache|\.git)\//.test(file)) {
    return false;
  }
  if (CONFIG_FILES.has(file.slice(file.lastIndexOf('/') + 1))) {
    return true;
  }
  return SOURCE_EXTENSIONS.test(file) || /(?:^|\/)(?:Dockerfile|Caddyfile)$/.test(file);
}

const files = execFileSync('git', [
  'ls-files',
  '--cached',
  '--others',
  '--exclude-standard',
  '-z',
])
  .toString()
  .split('\0')
  .filter(isAuthoredSource);
let checked = 0;
let violations = 0;
for (const file of new Set([
  ...files,
  ...process.argv.slice(2),
])) {
  let source;
  try {
    source = readFileSync(file, 'utf8');
  } catch (error) {
    // Deleted tracked files have no current source to check.
    if (error.code === 'ENOENT') {
      continue;
    }
    throw error;
  }
  checked++;
  const lines = source.split(/\r?\n/);
  for (let index = 0; index < lines.length; index++) {
    // Count Unicode characters rather than UTF-8 bytes; expand tabs as four spaces.
    const length = [...lines[index].replaceAll('\t', '    ')].length;
    if (length > MAX_LINE_CHARACTERS) {
      console.error(file + ':' + (index + 1) + ': ' + length + ' characters (maximum 100)');
      violations++;
    }
  }
}
if (violations) {
  process.exitCode = 1;
} else {
  console.log('Line length passed: ' + checked + ' authored files; maximum 100 characters.');
  console.log('Excluded: dependencies, generated output/lockfile, and immutable SQL migrations.');
}
