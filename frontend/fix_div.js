const fs = require('fs');
const parser = require('@babel/parser');

let code = fs.readFileSync('src/pages/CortexChat.tsx', 'utf8');

// Try removing a </div> at 1671
const lines = code.split('\n');
lines.splice(1670, 1); // remove line 1671 (index 1670)

try {
  parser.parse(lines.join('\n'), {
    sourceType: 'module',
    plugins: ['jsx', 'typescript']
  });
  console.log("Success! Removing line 1671 fixed it!");
} catch (e) {
  console.log(`Failed: ${e.message}`);
}
