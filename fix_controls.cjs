const fs = require('fs');
let c = fs.readFileSync('src/main.ts', 'utf8');
c = c.replace(/controls\(h:HTMLElement,refresh:\(\)=>void,full:boolean=false\)\{.*?\n? overview/, 'controls(h:HTMLElement,refresh:()=>void){const t=h.createDiv({cls:"planning-toolbar"});t.createEl("button",{text:"+ افزودن",cls:"mod-cta"}).onclick=()=>void this.edit(null,refresh)}\n overview');
c = c.replace(/this\.controls\(root,\(\)=>this\.overview\(e\),true\);/g, 'this.controls(root,()=>this.overview(e));');
fs.writeFileSync('src/main.ts', c);
