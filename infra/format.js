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
const layout = new ESLint({
  overrideConfigFile: true,
  fix: true,
  overrideConfig: [
    {
      ...parserConfig,
      plugins: { '@stylistic': stylistic },
      rules: {
        curly: [
          'error',
          'all',
        ],
        'one-var': [
          'error',
          'never',
        ],
        '@stylistic/member-delimiter-style': [
          'error',
          {
            multiline: {
              delimiter: 'semi',
              requireLast: true,
            },
            singleline: {
              delimiter: 'semi',
              requireLast: false,
            },
            multilineDetection: 'brackets',
          },
        ],
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

/**
 * Recognize declarations that should have blank lines around them.
 * @returns Whether this statement declares a function or a useCallback-backed handler.
 */
const definesFunction = (statement, syntax) =>
  ts.isFunctionDeclaration(statement) ||
  (ts.isVariableStatement(statement) &&
    statement.declarationList.declarations.some(
      /* Check whether a variable initializes a function or useCallback handler. */
      (declaration) => {
        const value = declaration.initializer;
        return (
          value &&
          (ts.isArrowFunction(value) ||
            ts.isFunctionExpression(value) ||
            (ts.isCallExpression(value) && value.expression.getText(syntax) === 'useCallback'))
        );
      },
    ));

/** Put multi-item declarations and lists on separate lines without changing tokens. */
function planListSpacing(node, syntax, source, add) {
  let names = null;
  if (ts.isTypeLiteralNode(node)) {
    names = node.members;
  } else if (
    ts.isNamedImports(node) ||
    ts.isNamedExports(node) ||
    ts.isObjectBindingPattern(node) ||
    ts.isArrayLiteralExpression(node)
  ) {
    names = node.elements;
  }
  if (names?.length > 1) {
    for (const name of names) {
      const position = name.getStart(syntax);
      const lineStart = source.lastIndexOf('\n', position - 1) + 1;
      if (source.slice(lineStart, position).trim()) {
        add(position, '\n');
      }
    }
  }
  if ((ts.isArrayLiteralExpression(node) || ts.isTypeLiteralNode(node)) && names.length > 1) {
    const end = node.end - 1;
    const lineStart = source.lastIndexOf('\n', end - 1) + 1;
    if (source.slice(lineStart, end).trim()) {
      add(end, '\n');
    }
  }
}

/** Separate function declarations from their neighboring statements. */
function planFunctionSpacing(node, syntax, source, add) {
  if (node.statements) {
    node.statements.forEach(
      /* Separate neighboring function declarations from surrounding statements. */
      (statement, index) => {
        if (
          index &&
          (definesFunction(statement, syntax) ||
            definesFunction(node.statements[index - 1], syntax))
        ) {
          const start = statement.getFullStart();
          if (!/^\s*\n\s*\n/.test(source.slice(start, statement.getStart(syntax)))) {
            add(start, '\n');
          }
        }
      },
    );
  }
}

/**
 * Add only whitespace around functions and between imported/destructured names.
 * @returns Source text with the planned layout insertions applied.
 */
function expandLayout(source, file) {
  const syntax = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true);
  const additions = new Map();

  /** Record a whitespace insertion at its original source offset. */
  const add = (offset, text) => additions.set(offset, text);

  /**
   * Walk syntax nodes and plan whitespace changes without changing
   * expressions.
   */
  const visit = (node) => {
    planListSpacing(node, syntax, source, add);
    planFunctionSpacing(node, syntax, source, add);
    ts.forEachChild(node, visit);
  };

  visit(syntax);
  for (const [offset, text] of [...additions].sort(
    /* Apply later insertions first so earlier source offsets stay valid. */
    (a, b) => b[0] - a[0],
  )) {
    source = source.slice(0, offset) + text + source.slice(offset);
  }
  return source;
}

/**
 * Print source once, then apply the project's block and multiline-list rules together.
 * @returns Formatted source text, or rejects when the formatter reports a blocking error.
 */
async function formatSource(source, file) {
  const isCode = /\.(js|ts|tsx)$/.test(file);
  const pretty = await prettier.format(source, {
    ...config,
    filepath: file,
  });
  if (!isCode) {
    return pretty;
  }
  const separated = expandLayout(pretty, file);
  const [result] = await layout.lintText(separated, { filePath: file });
  if (
    result.messages.some(
      /* Detect formatting errors that cannot safely be accepted as output. */
      (message) => message.severity === 2,
    )
  ) {
    throw Error(
      file +
        ': ' +
        result.messages
          .map(
            /* Include each formatter diagnostic in the failure message. */
            (message) => message.message,
          )
          .join('; '),
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
  /**
   * Select authored source and configuration files, excluding generated
   * compiler metadata.
   */
  (file) =>
    (/^(App|infra|tests|docs)\//.test(file) || !file.includes('/')) &&
    /\.(js|ts|tsx|css|json|md)$/.test(file) &&
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
  console.log(checkOnly ? 'Source formatting passed.' : 'Formatted ' + changed.length + ' files.');
}
