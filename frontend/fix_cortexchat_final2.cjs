const fs = require('fs');

let code = fs.readFileSync('src/pages/CortexChat.tsx', 'utf8');
const lines = code.split('\n');

// Try removing 1695 and 1696
lines.splice(1695, 2);

fs.writeFileSync('src/pages/CortexChat.tsx', lines.join('\n'));
