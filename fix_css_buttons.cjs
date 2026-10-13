const fs = require('fs');
let c = fs.readFileSync('styles.css', 'utf8');

c = c.replace(/\.planning-phase-card h3 \{/, '.planning-phase-card-title { appearance:none; background:transparent; border:none; cursor:pointer; width:100%; text-align:right; font:inherit;');

c = c.replace(/\.planning-area \{/, '.planning-area { appearance:none; background:transparent; border:none; cursor:pointer; width:100%; text-align:right; font:inherit;');

c = c.replace(/\.planning-area \{/, '.planning-area:hover { color: var(--text-normal); }\n.planning-area {');

c = c.replace(/\.planning-phase-card-title \{/, '.planning-phase-card-title:hover { color: var(--text-normal); }\n.planning-phase-card-title {');

fs.writeFileSync('styles.css', c);
console.log('styles updated');
