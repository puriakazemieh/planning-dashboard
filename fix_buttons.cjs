const fs = require('fs');
let css = fs.readFileSync('styles.css', 'utf8');

css = css.replace('.planning-area:hover { color: var(--text-normal); }', '.planning-area:hover { color: var(--text-normal); background-color: transparent !important; box-shadow: none !important; transform: translateX(-2px); }');

css = css.replace('.planning-area { appearance:none; background:transparent; border:none; cursor:pointer; width:100%; text-align:right; font:inherit;', '.planning-area { appearance:none; background-color:transparent !important; border-top:none !important; border-left:none !important; border-right:none !important; box-shadow:none !important; border-radius:0 !important; padding:0 !important; cursor:pointer; width:100%; text-align:right; font:inherit; transition: transform 150ms ease, color 150ms ease;');

css = css.replace('.planning-phase-card-title:hover { color: var(--text-normal); }', '.planning-phase-card-title:hover { color: var(--text-normal); background-color: transparent !important; box-shadow: none !important; transform: translateY(-1px); }');

css = css.replace('.planning-phase-card-title { appearance:none; background:transparent; border:none; cursor:pointer; width:100%; text-align:right; font:inherit;', '.planning-phase-card-title { appearance:none; background-color:transparent !important; border:none !important; box-shadow:none !important; padding:0 !important; border-radius:0 !important; cursor:pointer; width:100%; text-align:right; font:inherit; transition: transform 150ms ease, color 150ms ease;');

fs.writeFileSync('styles.css', css);
console.log('Fixed button styles');
