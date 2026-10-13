const fs = require('fs');
let c = fs.readFileSync('src/main.ts', 'utf8');

c = c.replace(/if\(\!confirm\(آیا از حذف کامل پروژه «\$\{this\.area\}» و تمام تسک‌های آن مطمئن هستید؟\)\)/, 'if(!confirm(آیا از حذف کامل پروژه «$'+'{this.area}» و تمام تسک‌های آن مطمئن هستید؟))');

fs.writeFileSync('src/main.ts', c);
console.log('Fixed confirm');
