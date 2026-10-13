const fs = require('fs');
let c = fs.readFileSync('src/main.ts', 'utf8');

const dragRoutine = 'dragRoutine(line:HTMLElement,lane:HTMLElement,handle:HTMLElement,area:string,seasonStart:string,seasonEnd:string,start:string,due:string,refresh:()=>void){handle.addEventListener("pointerdown",event=>{event.preventDefault();handle.setPointerCapture(event.pointerId);const movingStart=handle.hasClass("planning-line-start"),rect=lane.getBoundingClientRect();let nextStart=start,nextDue=due;const update=(clientX:number)=>{const offset=Math.max(0,Math.min(diff(seasonStart,seasonEnd),Math.round(((rect.right-clientX)/rect.width)*diff(seasonStart,seasonEnd))));const day=shift(seasonStart,offset);if(movingStart)nextStart=day<=nextDue?day:nextDue;else nextDue=day>=nextStart?day:nextStart;pos(line,seasonStart,nextStart,nextDue,diff(seasonStart,seasonEnd)+1)};const move=(e:PointerEvent)=>update(e.clientX);const end=async(e:PointerEvent)=>{update(e.clientX);document.removeEventListener("pointermove",move);document.removeEventListener("pointerup",end);this.settings.routineSchedules[area]={start:nextStart,due:nextDue};await this.save();refresh()};document.addEventListener("pointermove",move);document.addEventListener("pointerup",end)})}';

const dragTask = 'dragTask(line:HTMLElement,lane:HTMLElement,handle:HTMLElement,t:Task,seasonStart:string,seasonEnd:string,refresh:()=>void){handle.addEventListener("pointerdown",event=>{event.preventDefault();event.stopPropagation();handle.setPointerCapture(event.pointerId);const movingStart=handle.hasClass("planning-line-start"),rect=lane.getBoundingClientRect();let nextStart=t.start,nextDue=t.due;const update=(clientX:number)=>{const offset=Math.max(0,Math.min(diff(seasonStart,seasonEnd),Math.round(((rect.right-clientX)/rect.width)*diff(seasonStart,seasonEnd))));const day=shift(seasonStart,offset);if(movingStart)nextStart=day<=nextDue?day:nextDue;else nextDue=day>=nextStart?day:nextStart;pos(line,seasonStart,nextStart,nextDue,diff(seasonStart,seasonEnd)+1)};const move=(e:PointerEvent)=>update(e.clientX);const end=async(e:PointerEvent)=>{update(e.clientX);document.removeEventListener("pointermove",move);document.removeEventListener("pointerup",end);t.start=nextStart;t.due=nextDue;await this.save();refresh()};document.addEventListener("pointermove",move);document.addEventListener("pointerup",end)});handle.addEventListener("click", e=>e.stopPropagation());}';

c = c.replace(dragRoutine, dragRoutine + '\n ' + dragTask);

const overviewRegex = /for\(const t of ft\)\{const v=lane\.createEl\("button",\{cls:"planning-task-bar",text:t\.title\}\);pos\(v,s,t\.start,t\.due,n\);v\.onclick=\(\)=>new Desc\(this\.app,t,this,\(\)=>this\.overview\(e\)\)\.open\(\)\}/;

const overviewReplacement = 'for(const t of ft){const v=lane.createDiv({cls:"planning-task-bar"});v.createSpan({text:t.title});pos(v,s,t.start,t.due,n);v.style.setProperty("--planning-color",color(t.area));v.onclick=()=>new Desc(this.app,t,this,()=>this.overview(e)).open();const first=v.createDiv({cls:"planning-line-handle planning-line-start"});const last=v.createDiv({cls:"planning-line-handle planning-line-end"});this.dragTask(v,lane,first,t,s,d,()=>this.overview(e));this.dragTask(v,lane,last,t,s,d,()=>this.overview(e))}';

c = c.replace(overviewRegex, overviewReplacement);

fs.writeFileSync('src/main.ts', c);
console.log('Done');
