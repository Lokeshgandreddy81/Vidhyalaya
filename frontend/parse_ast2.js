import fs from 'fs';
import parser from '@babel/parser';

try {
  const code = fs.readFileSync('CortexChat_test2.tsx', 'utf8');
  parser.parse(code, {
    sourceType: 'module',
    plugins: ['jsx', 'typescript']
  });
  console.log("Success!");
} catch (e) {
  console.error(`Error at line ${e.loc.line}, col ${e.loc.column}: ${e.message}`);
}
