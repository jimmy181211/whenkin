/** Formats authored source; --check reports differences without writing. */
import {
  readFile,
  writeFile,
} from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { ESLint } from 'eslint';
import stylistic from '@stylistic/eslint-plugin';
import * as prettier from 'prettier';
import ts from 'typescript';
import tseslint from 'typescript-eslint';

const checkOnly = process.argv.includes('--check');
const config = JSON.parse(await readFile('.prettierrc.json', 'utf8'));
const parserConfig = {
  files: ['**/*.{js,ts,tsx}'],
  languageOptions: { parser: tseslint.parser },
};
const blocks = new ESLint({
  overrideConfigFile: true,
  fix: true,
  overrideConfig: [
    {
      ...parserConfig,
      rules: {
        curly: [
          'error',
          'all',
        ],
        'one-var': [
          'error',
          'never',
        ],
      },
    },
  ],
});
const layout = new ESLint({
  overrideConfigFile: true,
  fix: true,
  overrideConfig: [
    {
      ...parserConfig,
      plugins: { '@stylistic': stylistic },
      rules: {
        '@stylistic/indent': [
          'error',
          2,
          { SwitchCase: 1 },
        ],
        '@stylistic/object-curly-newline': [
          'error',
          {
            ObjectExpression: {
              minProperties: 2,
              consistent: true,
            },
            ObjectPattern: {
              minProperties: 2,
              consistent: true,
            },
            ImportDeclaration: {
              multiline: true,
              consistent: true,
            },
            ExportDeclaration: {
              multiline: true,
              consistent: true,
            },
          },
        ],
        '@stylistic/object-property-newline': [
          'error',
          { allowAllPropertiesOnSameLine: false },
        ],
        '@stylistic/array-element-newline': [
          'error',
          {
            ArrayExpression: { minItems: 2 },
            ArrayPattern: 'never',
          },
        ],
        '@stylistic/comma-dangle': [
          'error',
          {
            arrays: 'always-multiline',
            objects: 'always-multiline',
            imports: 'always-multiline',
            exports: 'always-multiline',
            functions: 'always-multiline',
            enums: 'always-multiline',
            generics: 'ignore',
            tuples: 'always-multiline',
          },
        ],
        '@stylistic/no-trailing-spaces': 'error',
        '@stylistic/lines-between-class-members': [
          'error',
          'always',
          { exceptAfterSingleLine: true },
        ],
      },
    },
  ],
});

/** Add only whitespace around functions and between imported/destructured names. */
function expandLayout(source, file) {
  const syntax = ts.createSourceFile(
    file,
    source,
    ts.ScriptTarget.Latest,
    true,
  );
  const additions = new Map();

  const add = (offset, text) => additions.set(offset, text);

  const definesFunction = (statement) =>
    ts.isFunctionDeclaration(statement) ||
    (ts.isVariableStatement(statement) &&
      statement.declarationList.declarations.some((declaration) => {
        const value = declaration.initializer;
        return (
          value &&
          (ts.isArrowFunction(value) ||
            ts.isFunctionExpression(value) ||
            (ts.isCallExpression(value) &&
              value.expression.getText(syntax) === 'useCallback'))
        );
      }));

  const visit = (node) => {
    const names =
      ts.isNamedImports(node) ||
      ts.isNamedExports(node) ||
      ts.isObjectBindingPattern(node) ||
      ts.isArrayLiteralExpression(node)
        ? node.elements
        : null;
    if (names?.length > 1) {
      for (const name of names) {
        const position = name.getStart(syntax);
        const lineStart = source.lastIndexOf('\n', position - 1) + 1;
        if (source.slice(lineStart, position).trim()) {
          add(position, '\n');
        }
      }
    }
    if (ts.isArrayLiteralExpression(node) && names.length > 1) {
      const end = node.end - 1;
      const lineStart = source.lastIndexOf('\n', end - 1) + 1;
      if (source.slice(lineStart, end).trim()) {
        add(end, '\n');
      }
    }
    if (node.statements) {
      node.statements.forEach((statement, index) => {
        if (
          index &&
          (definesFunction(statement) ||
            definesFunction(node.statements[index - 1]))
        ) {
          const start = statement.getFullStart();
          if (
            !/^\s*\n\s*\n/.test(source.slice(start, statement.getStart(syntax)))
          ) {
            add(start, '\n');
          }
        }
      });
    }
    ts.forEachChild(node, visit);
  };

  visit(syntax);
  for (const [offset, text] of [...additions].sort((a, b) => b[0] - a[0])) {
    source = source.slice(0, offset) + text + source.slice(offset);
  }
  return source;
}

/** Apply block expansion before printing, then the project's multiline-list layout. */
async function formatSource(source, file) {
  const isCode = /\.(js|ts|tsx)$/.test(file);
  if (isCode) {
    const [result] = await blocks.lintText(source, { filePath: file });
    source = result.output ?? source;
  }
  const pretty = await prettier.format(source, {
    ...config,
    filepath: file,
  });
  if (!isCode) {
    return pretty;
  }
  const separated = expandLayout(pretty, file);
  const [result] = await layout.lintText(separated, { filePath: file });
  if (result.messages.some((message) => message.severity === 2)) {
    throw Error(
      file +
        ': ' +
        result.messages.map((message) => message.message).join('; '),
    );
  }
  return result.output ?? separated;
}

const files = [
  ...new Set(
    execFileSync('git', [
      'ls-files',
      '--cached',
      '--others',
      '--exclude-standard',
    ])
      .toString()
      .trim()
      .split('\n'),
  ),
].filter(
  (file) =>
    (/^(App|infra|tests)\//.test(file) || !file.includes('/')) &&
    /\.(js|ts|tsx|css|json)$/.test(file) &&
    !file.endsWith('tsbuildinfo'),
);
const changed = [];
for (const file of files) {
  let source;
  try {
    source = await readFile(file, 'utf8');
  } catch (error) {
    if (error.code === 'ENOENT') {
      continue;
    }
    throw error;
  }
  const formatted = await formatSource(source, file);
  if (source === formatted) {
    continue;
  }
  changed.push(file);
  if (!checkOnly) {
    await writeFile(file, formatted);
  }
}
if (checkOnly && changed.length) {
  console.error('Run pnpm format for:\n' + changed.join('\n'));
  process.exitCode = 1;
} else {
  console.log(
    checkOnly
      ? 'Source formatting passed.'
      : 'Formatted ' + changed.length + ' files.',
  );
}
