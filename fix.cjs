const fs = require('fs');
let content = fs.readFileSync('src/main.ts', 'utf8');
content = content.replace(/text:\?\True\{?this\.t\.area\}?.*?\?\}/, 'text: this.t.area + \" — \" + this.t.title }');
fs.writeFileSync('src/main.ts', content);
