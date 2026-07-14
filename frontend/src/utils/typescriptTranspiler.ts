/**
 * Lightweight, regex-based utility to strip TypeScript type annotations,
 * interfaces, type aliases, generic parameters, and type assertions from source code,
 * making it runnable directly as plain JavaScript in the browser sandbox.
 */
export function transpileTypeScriptToJs(code: string): string {
  let result = code;

  // Protect string literals and comments to prevent matching inside them
  const placeholders: { token: string; value: string }[] = [];
  let tokenIndex = 0;
  
  // Protect string literals (double quotes, single quotes, backticks)
  result = result.replace(/(["'`])(?:\\.|[^\\])*?\1/g, (match) => {
    const token = `__STR_LIT_TOKEN_${tokenIndex++}__`;
    placeholders.push({ token, value: match });
    return token;
  });
  
  // Protect comments (line and block)
  result = result.replace(/\/\/.*$/gm, (match) => {
    const token = `__COMMENT_TOKEN_${tokenIndex++}__`;
    placeholders.push({ token, value: match });
    return token;
  });
  result = result.replace(/\/\*[\s\S]*?\*\//g, (match) => {
    const token = `__COMMENT_TOKEN_${tokenIndex++}__`;
    placeholders.push({ token, value: match });
    return token;
  });

  // 1. Remove interface declarations (supports nested curly braces up to 2 levels)
  result = result.replace(/\binterface\s+[A-Za-z0-9_$]+(?:\s+extends\s+[A-Za-z0-9_$]+)?\s*\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}/g, '');

  // 2. Remove type declarations (e.g. `type X = ...`)
  result = result.replace(/\btype\s+[A-Za-z0-9_$]+(?:\s*<[^>]*>)?\s*=[^;\n]*/g, '');

  // 3. Remove type assertions (e.g. `as string` or `as any` or `<string>`)
  result = result.replace(/\s+as\s+[A-Za-z0-9_$]+(?:<[^>]*>)?(?:\[\])?/g, '');

  // 4. Remove return type annotations on functions, e.g. `): string` or `): void` or `): MyType`
  result = result.replace(/\)\s*:\s*(?:[A-Za-z0-9_$<>|[\]{}]+|\s*)+/g, ')');

  // 5. Remove parameter / variable type annotations: `: type`
  // Targets standard type names or user-defined types (including array types like string[])
  result = result.replace(/:\s*(?:string|number|boolean|any|void|unknown|never|object|[A-Z][a-zA-Z0-9_$]*)(?:<[^>]*>)?(?:\[\])?/g, '');

  // 6. Remove generic parameters from classes/functions, e.g. `<T>` or `<string>`
  result = result.replace(/<[A-Za-z0-9_$]+>/g, '');

  // 7. Restore strings and comments
  for (let j = placeholders.length - 1; j >= 0; j--) {
    const { token, value } = placeholders[j];
    result = result.replaceAll(token, value);
  }
  
  return result;
}
