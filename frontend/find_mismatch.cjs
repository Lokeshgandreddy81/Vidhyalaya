const fs = require('fs');
const parser = require('@babel/parser');

let code = fs.readFileSync('src/pages/CortexChat.tsx', 'utf8');
const lines = code.split('\n');

for (let i = 1600; i < 1740; i++) {
  for (let j = i; j < 1740; j++) {
    if (lines[i].includes('</div>') && lines[j].includes('</div>')) {
      let testLines = [...lines];
      testLines.splice(j, 1);
      if (i !== j) testLines.splice(i, 1);
      
      try {
        parser.parse(testLines.join('\n'), {
          sourceType: 'module',
          plugins: ['jsx', 'typescript']
        });
        console.log(`Success! Removing </div> at ${i+1} and ${j+1} fixed it!`);
        process.exit(0);
      } catch (e) {
      }
    }
  }
}
