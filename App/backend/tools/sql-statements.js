/**
 * Split SQL at semicolons outside strings, function bodies, and comments.
 * Track nested block comments and PostgreSQL dollar quotes instead of splitting
 * function bodies into invalid fragments. Throw if a quote/comment is unfinished.
 * @returns Statements in source order, without their final separating semicolons.
 */
export function sqlStatements(source) {
  const statements = [];
  let start = 0;
  let quote = '';
  // Active dollar-quote delimiter, such as $$ or $function$; empty outside a body.
  let dollar = '';
  let lineComment = false;
  // PostgreSQL allows nested block comments, so a boolean would not be enough.
  let blockDepth = 0;
  for (let i = 0; i < source.length; i++) {
    const ch = source[i];
    const next = source[i + 1];
    if (lineComment) {
      if (ch === '\n') {
        lineComment = false;
      }
      continue;
    }
    if (blockDepth) {
      if (ch === '/' && next === '*') {
        blockDepth++;
        i++;
      } else if (ch === '*' && next === '/') {
        blockDepth--;
        i++;
      }
      continue;
    }
    if (dollar) {
      if (source.startsWith(dollar, i)) {
        i += dollar.length - 1;
        dollar = '';
      }
      continue;
    }
    if (quote) {
      if (ch === quote) {
        if (next === quote) {
          i++;
        } else {
          quote = '';
        }
      }
      continue;
    }
    if (ch === '-' && next === '-') {
      lineComment = true;
      i++;
    } else if (ch === '/' && next === '*') {
      blockDepth = 1;
      i++;
    } else if (ch === "'" || ch === '"') {
      quote = ch;
    } else if (ch === '$') {
      const delimiter = source.slice(i).match(/^\$(?:[A-Za-z_][A-Za-z_0-9]*)?\$/)?.[0];
      if (delimiter) {
        dollar = delimiter;
        i += delimiter.length - 1;
      }
    } else if (ch === ';') {
      const statement = source.slice(start, i).trim();
      if (statement) {
        statements.push(statement);
      }
      start = i + 1;
    }
  }
  if (quote || dollar || blockDepth) {
    throw new Error('Unterminated SQL quote or comment.');
  }
  const rest = source.slice(start).trim();
  if (rest && !/^--[^\n]*(?:\n\s*--[^\n]*)*$/.test(rest)) {
    statements.push(rest);
  }
  return statements;
}
