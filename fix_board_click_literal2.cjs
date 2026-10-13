const fs = require('fs');
let c = fs.readFileSync('src/main.ts', 'utf8');

const t1 = 'planning-phase-card ' + '$' + '{tone(a)}';
const t2 = '$' + '{icon(a)} $' + '{a}';

const target = 'const c=g.createDiv({cls:' + t1 + '});c.createEl("h3",{text:' + t2 + '});';
const replacement = 'const c=g.createDiv({cls:' + t1 + '});const hd=c.createEl("button",{cls:"planning-phase-card-title",text:' + t2 + '});hd.onclick=()=>new AreaModal(this.app,this,a,r).open();';

c = c.replace(target, replacement);

fs.writeFileSync('src/main.ts', c);
console.log('done');
