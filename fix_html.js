const fs = require('fs');
const f = 'c:/Users/MSI/Desktop/ООО Чалама/backend/public/index.html';
const lines = fs.readFileSync(f, 'utf8').split('\n');
console.log('Before:', lines.length, 'lines');
// Remove orphaned old hotel code (lines 2085-2261, 0-indexed 2084-2260)
const keep = [...lines.slice(0, 2084), ...lines.slice(2261)];
fs.writeFileSync(f, keep.join('\n'), 'utf8');
console.log('After:', keep.length, 'lines');
console.log('Done!');
