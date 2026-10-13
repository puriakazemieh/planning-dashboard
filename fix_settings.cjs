const fs = require('fs');
let c = fs.readFileSync('src/main.ts', 'utf8');

c = c.replace(/type Settings=\{tasks:Task\[\];migrated:boolean;routineSchedules:Record<string,\{start:string;due:string\}>;tick:\{enabled:boolean;token:string;auto:boolean;minutes:number\}\};/, 'type Settings={tasks:Task[];migrated:boolean;routineSchedules:Record<string,{start:string;due:string}>;areaDescriptions:Record<string,string>;tick:{enabled:boolean;token:string;auto:boolean;minutes:number}};');

c = c.replace(/const D:Settings=\{tasks:\[\],migrated:false,routineSchedules:\{\},tick:\{enabled:false,token:"",auto:false,minutes:30\}\};/, 'const D:Settings={tasks:[],migrated:false,routineSchedules:{},areaDescriptions:{},tick:{enabled:false,token:"",auto:false,minutes:30}};');

c = c.replace(/routineSchedules:\{\.\.\.D\.routineSchedules,\.\.\.x\?\.routineSchedules\},tick:\{\.\.\.D\.tick,\.\.\.x\?\.tick\}/, 'routineSchedules:{...D.routineSchedules,...x?.routineSchedules},areaDescriptions:{...D.areaDescriptions,...x?.areaDescriptions},tick:{...D.tick,...x?.tick}');

fs.writeFileSync('src/main.ts', c);
console.log('Settings updated');
