const fs = require('fs');
let c = fs.readFileSync('src/main.ts', 'utf8');

// 1. Remove Desc class completely
c = c.replace(/class Desc extends Modal\{[\s\S]*?\}\}\}\}/, '');

// 2. Change Editor constructor
c = c.replace(/constructor\(a:App,private p:Planning,private init:Task\|null\)/, 'constructor(a:App,private p:Planning,private init:Task|null,private onDelete?:()=>void)');

// 3. Add Delete button in Editor if init
c = c.replace(/a\.createEl\("button",\{text:"انصراف"\}\)\.onclick=\(\)=>this\.finish\(null\);/, 'a.createEl("button",{text:"انصراف"}).onclick=()=>this.finish(null);if(this.init&&this.onDelete)a.createEl("button",{text:"حذف",cls:"mod-warning"}).onclick=()=>{this.end=true;this.done(null);this.close();this.onDelete()};');

// 4. Update edit()
c = c.replace(/async edit\(t:Task\|null,r:\(\)=>void\)\{const v=await new Editor\(this\.app,this,t\)\.wait\(\);/, 'async edit(t:Task|null,r:()=>void){const v=await new Editor(this.app,this,t,t?()=>this.del(t,r):undefined).wait();');

// 5. Replace Desc usages with edit
c = c.replace(/new Desc\(this\.app,t,this,\(\)=>this\.overview\(e\)\)\.open\(\)/g, 'this.edit(t,()=>this.overview(e))');
c = c.replace(/new Desc\(this\.app,t,this,r\)\.open\(\)/g, 'this.edit(t,r)');

fs.writeFileSync('src/main.ts', c);
console.log('Done refactoring');
