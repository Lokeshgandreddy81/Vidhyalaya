const fs = require('fs');
const parser = require('@babel/parser');

let code = fs.readFileSync('src/pages/CortexChat.tsx', 'utf8');
const lines = code.split('\n');

for (let i = 1600; i < 1740; i++) {
  if (lines[i].includes('</div>')) {
    let testLines = [...lines];
    testLines.splice(i, 1);
    try {
      parser.parse(testLines.join('\n'), {
        sourceType: 'module',
        plugins: ['jsx', 'typescript']
      });
      console.log(`Success! Removing </div> at line ${i+1} fixed it!`);
      break;
    } catch (e) {
      // ignore
    }
  }
}
