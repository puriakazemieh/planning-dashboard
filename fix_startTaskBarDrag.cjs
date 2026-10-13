const fs = require('fs');
let c = fs.readFileSync('src/main.ts', 'utf8');

c = c.replace(/this\.registerDomEvent\(document,"pointerdown",event=>this\.startTaskBarDrag\(event as PointerEvent\)\);/, '');
c = c.replace(/startTaskBarDrag\(event:PointerEvent\)\{.*?\n? dragRoutine/, 'dragRoutine');

fs.writeFileSync('src/main.ts', c);
console.log('Removed startTaskBarDrag');
