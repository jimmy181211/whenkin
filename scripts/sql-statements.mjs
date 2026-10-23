// Split migration files without breaking function bodies, quoted strings, or
// comments. PostgreSQL's HTTP transport accepts one prepared statement at a time.
export function sqlStatements(source) {
  const statements = [];
  let start = 0, quote = '', dollar = '', lineComment = false, blockDepth = 0;
  for (let i = 0; i < source.length; i++) {
    const ch = source[i], next = source[i + 1];
    if (lineComment) {
      if (ch === '\n') lineComment = false;
      continue;
    }
    if (blockDepth) {
      if (ch === '/' && next === '*') { blockDepth++; i++; }
      else if (ch === '*' && next === '/') { blockDepth--; i++; }
      continue;
    }
    if (dollar) {
      if (source.startsWith(dollar, i)) { i += dollar.length - 1; dollar = ''; }
      continue;
    }
    if (quote) {
      if (ch === quote) {
        if (next === quote) i++;
        else quote = '';
      }
      continue;
    }
    if (ch === '-' && next === '-') { lineComment = true; i++; }
    else if (ch === '/' && next === '*') { blockDepth = 1; i++; }
    else if (ch === "'" || ch === '"') quote = ch;
    else if (ch === '$') {
      const delimiter = source.slice(i).match(/^\$(?:[A-Za-z_][A-Za-z_0-9]*)?\$/)?.[0];
      if (delimiter) { dollar = delimiter; i += delimiter.length - 1; }
    }
    else if (ch === ';') {
      const statement = source.slice(start, i).trim();
      if (statement) statements.push(statement);
      start = i + 1;
    }
  }
  if (quote || dollar || blockDepth) throw new Error('Unterminated SQL quote or comment.');
  const rest = source.slice(start).trim();
  if (rest && !/^--[^\n]*(?:\n\s*--[^\n]*)*$/.test(rest)) statements.push(rest);
  return statements;
}
