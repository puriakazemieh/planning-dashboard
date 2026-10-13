const fs = require('fs');
let c = fs.readFileSync('src/main.ts', 'utf8');

c = c.replace(/const c=g\.createDiv\(\{cls:\planning-phase-card \\\$\{tone\(a\)\}\\}\);c\.createEl\("h3",\{text:\\\\$\{icon\(a\)\} \\\$\{a\}\\}\);/, 'const c=g.createDiv({cls:planning-phase-card \});const hd=c.createEl("button",{cls:"planning-phase-card-title",text:\ \});hd.onclick=()=>new AreaModal(this.app,this,a,r).open();');

fs.writeFileSync('src/main.ts', c);
console.log('board updated');
