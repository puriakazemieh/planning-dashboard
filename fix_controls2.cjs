const fs = require('fs');
let c = fs.readFileSync('src/main.ts', 'utf8');

const target = 'if(full){t.createEl("button",{text:"مدیریت فازها"}).onclick=()=>new Manager(this.app,this,refresh).open();if(this.settings.tick.enabled&&this.settings.tick.token)t.createSpan({text:"TickTick متصل است",cls:"planning-connected"})}}';
const replacement = '}';

c = c.replace(target, replacement);

fs.writeFileSync('src/main.ts', c);
console.log('Done');
