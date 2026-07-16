const fs = require('fs');
let code = fs.readFileSync('src/pages/CortexChat.tsx', 'utf8');
const lines = code.split('\n');

if (lines[1644].includes('</div>') && lines[1690].includes('</div>')) {
  lines.splice(1690, 1);
  lines.splice(1644, 1);
  fs.writeFileSync('src/pages/CortexChat.tsx', lines.join('\n'));
} else {
  console.log("Lines didn't match:", lines[1644], lines[1690]);
}
