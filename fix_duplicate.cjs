const fs = require('fs');
let c = fs.readFileSync('src/main.ts', 'utf8');

c = c.replace(/dragTask\(line:HTMLElement,lane:HTMLElement,handle:HTMLElement,t:Task,seasonStart:string,seasonEnd:string,refresh:\(\)=>void\)\{.*?\n /, '');

fs.writeFileSync('src/main.ts', c);
console.log('Done');
