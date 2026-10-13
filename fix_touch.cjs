const fs = require('fs');
let c = fs.readFileSync('src/main.ts', 'utf8');

c = c.replace(/handle\.addEventListener\("pointerdown",event=>\{/g, 'handle.addEventListener("touchstart",e=>e.stopPropagation(),{passive:false});handle.addEventListener("touchmove",e=>e.stopPropagation(),{passive:false});handle.addEventListener("pointerdown",event=>{');

fs.writeFileSync('src/main.ts', c);
console.log('Added touch event stopPropagation');
