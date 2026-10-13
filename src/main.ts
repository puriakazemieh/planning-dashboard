import { App, DropdownComponent, MarkdownRenderer, Modal, Notice, Plugin, PluginSettingTab, Setting, requestUrl } from "obsidian";
type Task={id:string;area:string;title:string;start:string;due:string;status:string;description?:string;tickId?:string;projectId?:string};
type AreaDisplayMode="routine"|"tasks"|"both";
type RoutineBar={id:string;title:string;start:string;due:string};
type Settings={tasks:Task[];migrated:boolean;routineSchedules:Record<string,{start:string;due:string}>;routineBars:Record<string,RoutineBar[]>;areaDescriptions:Record<string,string>;areaDisplayModes:Record<string,AreaDisplayMode>;deletedAreas:string[];tick:{enabled:boolean;token:string;auto:boolean;minutes:number}};
type TickTickProject={id:string;name:string};
type TickTickTask={id:string;projectId?:string;title?:string;startDate?:string;dueDate?:string;status?:number;desc?:string;content?:string};
type TickTickProjectData={tasks?:unknown};
type TickTickTaskSelection=Omit<Task,"area">&{projectName:string};
const isRecord=(value:unknown):value is Record<string,unknown>=>typeof value==="object"&&value!==null;
const D:Settings={tasks:[],migrated:false,routineSchedules:{},routineBars:{},areaDescriptions:{},areaDisplayModes:{},deletedAreas:[],tick:{enabled:false,token:"",auto:false,minutes:30}}; const R=["زبان آلمانی","کاتلین و اندروید","بهبود فردی"], F="فین‌ترک و شاپ"; const S:[string,string,string,string][]=[["spring","بهار ۱۴۰۵","2026-03-21","2026-06-21"],["summer","تابستان ۱۴۰۵","2026-06-22","2026-09-22"],["autumn","پاییز ۱۴۰۵","2026-09-23","2026-12-21"],["winter","زمستان ۱۴۰۵","2026-12-22","2027-03-20"]];
export default class Planning extends Plugin { settings:Settings=D; timer:number|null=null;
 async onload(){const x=await this.loadData() as Partial<Settings>|null;this.settings={...D,...x,routineSchedules:{...D.routineSchedules,...x?.routineSchedules},routineBars:{...D.routineBars,...x?.routineBars},areaDescriptions:{...D.areaDescriptions,...x?.areaDescriptions},areaDisplayModes:{...D.areaDisplayModes,...x?.areaDisplayModes},deletedAreas:Array.isArray(x?.deletedAreas)?x.deletedAreas:[],tick:{...D.tick,...x?.tick}};await this.migrateRoutineBars();await this.migrate();this.addSettingTab(new Tab(this.app,this));this.registerMarkdownCodeBlockProcessor("planning-overview",(_,e)=>this.overview(e));this.registerMarkdownCodeBlockProcessor("planning-season-map",(_,e)=>this.season(e));this.registerMarkdownCodeBlockProcessor("planning-nearest-phases",(_,e)=>this.nearest(e));this.addCommand({id:"sync-ticktick-schedules",name:"Sync selected TickTick schedules",callback:()=>void this.sync(true)});this.schedule()}
 onunload(){if(this.timer)window.clearInterval(this.timer)} async save(){await this.saveData(this.settings);this.schedule()} schedule(){if(this.timer)window.clearInterval(this.timer);if(this.settings.tick.enabled&&this.settings.tick.token&&this.settings.tick.auto)this.timer=window.setInterval(()=>void this.sync(false),Math.max(5,this.settings.tick.minutes)*60000)}
 async migrate(){if(this.settings.migrated)return;try{const path=`${this.app.vault.configDir}/plugins/ticktick-bridge/data.json`,raw:unknown=JSON.parse(await this.app.vault.adapter.read(path));if(isRecord(raw)&&Array.isArray(raw.projectTaskCatalog))this.settings.tasks=raw.projectTaskCatalog.filter(isRecord).map(t=>({id:String(t.id??crypto.randomUUID()),area:String(t.area??"بدون دسته"),title:String(t.title??"بدون عنوان"),start:String(t.start??""),due:String(t.due??""),status:String(t.status??"todo"),description:String(t.description??""),tickId:String(t.id??""),projectId:String(t.ticktickProjectId??"")}))}catch{ /* The companion plugin or its saved data is unavailable. */ }this.settings.migrated=true;await this.saveData(this.settings)} tasks(){return this.settings.tasks.slice().sort((a,b)=>(a.start+a.title).localeCompare(b.start+b.title,"fa"))}
 async migrateRoutineBars(){let changed=false;for(const [area,schedule] of Object.entries(this.settings.routineSchedules)){if(this.settings.routineBars[area]?.length)continue;this.settings.routineBars[area]=[{id:crypto.randomUUID(),title:"",start:schedule.start,due:schedule.due}];changed=true}if(changed)await this.saveData(this.settings)}
 areaNames(){return areas(this.tasks(),[...Object.keys(this.settings.routineSchedules),...Object.keys(this.settings.routineBars)]).filter(area=>!this.settings.deletedAreas.includes(area))}
 areaDisplayMode(area:string):AreaDisplayMode{return this.settings.areaDisplayModes[area]??((area==="کاتلین و اندروید"||area==="بهبود فردی")?"routine":"tasks")}
 controls(h:HTMLElement,refresh:()=>void,full:boolean=false){const t=h.createDiv({cls:"planning-toolbar"}),actions=t.createDiv({cls:"planning-toolbar-actions"});actions.createEl("button",{text:"+ افزودن تسک",cls:"mod-cta"}).onclick=()=>void this.edit(null,refresh);actions.createEl("button",{text:"+ افزودن نوار"}).onclick=()=>void this.editRoutine(null,refresh);}
 dragRoutine(line:HTMLElement,lane:HTMLElement,handle:HTMLElement,area:string,bar:RoutineBar,seasonStart:string,seasonEnd:string,refresh:()=>void){handle.addEventListener("touchstart",e=>e.stopPropagation(),{passive:false});handle.addEventListener("touchmove",e=>e.stopPropagation(),{passive:false});handle.addEventListener("pointerdown",event=>{event.preventDefault();handle.setPointerCapture(event.pointerId);const movingStart=handle.hasClass("planning-line-start"),rect=lane.getBoundingClientRect();let nextStart=bar.start,nextDue=bar.due;const update=(clientX:number)=>{const offset=Math.max(0,Math.min(diff(seasonStart,seasonEnd),Math.round(((rect.right-clientX)/rect.width)*diff(seasonStart,seasonEnd))));const day=shift(seasonStart,offset);if(movingStart)nextStart=day<=nextDue?day:nextDue;else nextDue=day>=nextStart?day:nextStart;pos(line,seasonStart,nextStart,nextDue,diff(seasonStart,seasonEnd)+1)};const move=(e:PointerEvent)=>update(e.clientX);const end=async(e:PointerEvent)=>{update(e.clientX);document.removeEventListener("pointermove",move);document.removeEventListener("pointerup",end);const bars=this.settings.routineBars[area]??[];const current=bars.find(item=>item.id===bar.id);if(current){current.start=nextStart;current.due=nextDue}await this.save();refresh()};document.addEventListener("pointermove",move);document.addEventListener("pointerup",end)})}
 dragTask(bar:HTMLElement,lane:HTMLElement,handle:HTMLElement,task:Task,seasonStart:string,seasonEnd:string,refresh:()=>void){handle.addEventListener("click",event=>event.stopPropagation());handle.addEventListener("touchstart",e=>e.stopPropagation(),{passive:false});handle.addEventListener("touchmove",e=>e.stopPropagation(),{passive:false});handle.addEventListener("pointerdown",event=>{event.preventDefault();event.stopPropagation();handle.setPointerCapture(event.pointerId);const movingStart=handle.hasClass("planning-line-start"),rect=lane.getBoundingClientRect();let nextStart=task.start,nextDue=task.due;const update=(clientX:number)=>{const offset=Math.max(0,Math.min(diff(seasonStart,seasonEnd),Math.round(((rect.right-clientX)/rect.width)*diff(seasonStart,seasonEnd))));const day=shift(seasonStart,offset);if(movingStart)nextStart=day<=nextDue?day:nextDue;else nextDue=day>=nextStart?day:nextStart;pos(bar,seasonStart,nextStart,nextDue,diff(seasonStart,seasonEnd)+1)};const move=(e:PointerEvent)=>update(e.clientX);const end=async(e:PointerEvent)=>{update(e.clientX);document.removeEventListener("pointermove",move);document.removeEventListener("pointerup",end);task.start=nextStart;task.due=nextDue;await this.save();refresh()};document.addEventListener("pointermove",move);document.addEventListener("pointerup",end)})}
 startTaskBarDrag(event:PointerEvent){const bar=(event.target as HTMLElement).closest<HTMLElement>(".planning-task-bar");if(!bar)return;const rect=bar.getBoundingClientRect(),edge=12,moveStart=event.clientX>rect.right-edge,moveEnd=event.clientX<rect.left+edge;if(!moveStart&&!moveEnd)return;const task=this.settings.tasks.find(item=>item.title===bar.textContent?.trim());const lane=bar.closest<HTMLElement>(".planning-lane");if(!task||!lane)return;event.preventDefault();event.stopPropagation();const season=bar.closest<HTMLElement>(".planning-season"),all=Array.from(document.querySelectorAll<HTMLElement>(".planning-season")),index=all.indexOf(season!);const data=S[index];if(!data)return;const [,,start,end]=data,rectLane=lane.getBoundingClientRect();let nextStart=task.start,nextDue=task.due;const update=(x:number)=>{const offset=Math.max(0,Math.min(diff(start,end),Math.round(((rectLane.right-x)/rectLane.width)*diff(start,end))));const day=shift(start,offset);if(moveStart)nextStart=day<=nextDue?day:nextDue;else nextDue=day>=nextStart?day:nextStart;pos(bar,start,nextStart,nextDue,diff(start,end)+1)};const move=(e:PointerEvent)=>update(e.clientX);const finish=async(e:PointerEvent)=>{update(e.clientX);document.removeEventListener("pointermove",move);document.removeEventListener("pointerup",finish);task.start=nextStart;task.due=nextDue;await this.save()};document.addEventListener("pointermove",move);document.addEventListener("pointerup",finish)}
 overview(e:HTMLElement){e.empty();const root=e.createDiv({cls:"planning-overview"});this.controls(root,()=>this.overview(e));const ts=this.tasks(),allAreas=this.areaNames(),routineBars=(a:string)=>{const saved=this.settings.routineBars[a];if(saved?.length)return saved;if(!R.includes(a))return[];const taskDates=ts.filter(t=>t.area===a&&date(t.start)&&date(t.due));const start=taskDates.map(t=>t.start).sort()[0]||"",due=taskDates.map(t=>t.due).sort().at(-1)||"";return start&&due?[{id:`derived-${a}`,title:"",start,due}]:[]};for(const [c,l,s,d]of S){const q=root.createDiv({cls:`planning-season planning-${c}`});q.createEl("h3",{text:l});const b=q.createDiv({cls:"planning-season-body"}),labs=b.createDiv({cls:"planning-labels"});labs.createDiv({cls:"planning-label-spacer"});const cal=b.createDiv({cls:"planning-calendar"}),lanes=cal.createDiv({cls:"planning-lanes"}),n=diff(s,d)+1,mo=cal.createDiv({cls:"planning-months"});for(const m of months(s,d)){const z=mo.createDiv({cls:"planning-month",text:m.l});z.setCssProps({flex:String(m.n)})}cal.insertBefore(mo,lanes);for(const a of allAreas){const lb=labs.createEl("button",{cls:"planning-area",text:a});lb.onclick=()=>new AreaModal(this.app,this,a,()=>this.overview(e)).open();const lane=lanes.createDiv({cls:"planning-lane"}),mode=this.areaDisplayMode(a);if(mode!=="tasks")for(const routine of routineBars(a).filter(bar=>bar.start<=d&&bar.due>=s)){const line=lane.createDiv({cls:"planning-routine-line"});pos(line,s,routine.start,routine.due,n);line.setCssProps({"--planning-color":color(a)});line.setAttribute("title",routine.title||a);line.onclick=()=>void this.editRoutine(a,()=>this.overview(e),routine.id);const first=line.createDiv({cls:"planning-line-handle planning-line-start"}),last=line.createDiv({cls:"planning-line-handle planning-line-end"});this.dragRoutine(line,lane,first,a,routine,s,d,()=>this.overview(e));this.dragRoutine(line,lane,last,a,routine,s,d,()=>this.overview(e))}if(mode!=="routine")for(const task of ts.filter(t=>t.area===a&&t.start<=d&&t.due>=s)){const bar=lane.createDiv({cls:"planning-task-bar"});bar.createSpan({text:task.title});pos(bar,s,task.start,task.due,n);bar.setCssProps({"--planning-color":color(task.area)});bar.onclick=()=>this.edit(task,()=>this.overview(e));const first=bar.createDiv({cls:"planning-line-handle planning-line-start"}),last=bar.createDiv({cls:"planning-line-handle planning-line-end"});this.dragTask(bar,lane,first,task,s,d,()=>this.overview(e));this.dragTask(bar,lane,last,task,s,d,()=>this.overview(e))}}}}
 season(e:HTMLElement){this.board(e,"همهٔ فازها",this.tasks(),()=>this.season(e))} nearest(e:HTMLElement){this.board(e,"نزدیک‌ترین فازها",this.tasks().filter(t=>!['done','completed'].includes(t.status)).slice(0,8),()=>this.nearest(e))} board(e:HTMLElement,_:string,ts:Task[],r:()=>void){e.empty();const x=e.createDiv({cls:"planning-shell"});this.controls(x,r);const g=x.createDiv({cls:"planning-phase-grid"});for(const a of this.areaNames()){const c=g.createDiv({cls:`planning-phase-card ${tone(a)}`});const hd=c.createEl("button",{cls:"planning-phase-card-title",text:`${icon(a)} ${a}`});hd.onclick=()=>new AreaModal(this.app,this,a,r).open();for(const t of ts.filter(x=>x.area===a)){const row=c.createDiv({cls:"planning-phase-row"});const b=row.createEl("button",{cls:"planning-phase-item",text:t.title});b.onclick=()=>this.edit(t,r);const ac=row.createDiv({cls:"planning-row-actions"});ac.createEl("button",{text:"ویرایش"}).onclick=()=>void this.edit(t,r);ac.createEl("button",{text:"حذف",cls:"mod-warning"}).onclick=()=>void this.del(t,r)}}}
 async edit(t:Task|null,r:()=>void){const v=await new Editor(this.app,this,t,t?()=>this.del(t,r):undefined).wait();if(!v)return;this.settings.deletedAreas=this.settings.deletedAreas.filter(area=>area!==v.area);t?Object.assign(t,v):this.settings.tasks.push({...v,id:crypto.randomUUID()});await this.save();r()} async editRoutine(area:string|null,r:()=>void,barId?:string){const v=await new RoutineEditor(this.app,this,area,barId,r).wait();if(!v)return;this.settings.deletedAreas=this.settings.deletedAreas.filter(area=>area!==v.area);const existingArea=Object.keys(this.settings.routineBars).find(key=>this.settings.routineBars[key].some(bar=>bar.id===v.id));if(existingArea&&existingArea!==v.area)this.settings.routineBars[existingArea]=this.settings.routineBars[existingArea].filter(bar=>bar.id!==v.id);const bars=this.settings.routineBars[v.area]??=[];const current=bars.find(bar=>bar.id===v.id);current?Object.assign(current,v):bars.push(v);this.settings.routineBars[v.area]=bars;await this.save();r()} async del(t:Task,r:()=>void){if(!confirm(`«${t.title}» حذف شود؟`))return;this.settings.tasks=this.settings.tasks.filter(x=>x.id!==t.id);await this.save();r()}
 async req(p:string):Promise<unknown>{if(!this.settings.tick.enabled||!this.settings.tick.token)throw Error("اتصال TickTick را در تنظیمات فعال کن.");const x=await requestUrl({url:`https://api.ticktick.com/open/v1/${p}`,headers:{Authorization:`Bearer ${this.settings.tick.token}`}});if(x.status<200||x.status>299)throw Error("خطای اتصال TickTick");return x.json as unknown} async pick():Promise<TickTickTaskSelection[]>{const rawProjects=await this.req("project");if(!Array.isArray(rawProjects))return[];const projects:TickTickProject[]=rawProjects.filter(isRecord).map(project=>({id:String(project.id??""),name:String(project.name??"بدون پروژه")})).filter(project=>project.id);const rawData=await Promise.all(projects.map(project=>this.req(`project/${project.id}/data`)));return rawData.flatMap((data,index)=>{if(!isRecord(data))return[];const tasks=(data as TickTickProjectData).tasks;if(!Array.isArray(tasks))return[];return tasks.filter(isRecord).map(task=>{const value=task as TickTickTask;return{id:String(value.id??crypto.randomUUID()),projectId:String(value.projectId??projects[index].id),projectName:projects[index].name,title:String(value.title??"بدون عنوان"),start:key(value.startDate)||key(value.dueDate),due:key(value.dueDate)||key(value.startDate),status:value.status===2?"done":"todo",description:String(value.desc??value.content??"")}})})} async sync(n:boolean){try{const all=await this.pick();for(const t of this.settings.tasks.filter(x=>x.tickId)){const a=all.find(x=>x.id===t.tickId);if(a)Object.assign(t,{...a,tickId:a.id})}await this.saveData(this.settings);if(n)new Notice("زمان‌بندی‌های TickTick به‌روز شد.")}catch(e){if(n)new Notice(e instanceof Error?e.message:"خطای همگام‌سازی")}}
}
class Tab extends PluginSettingTab{constructor(a:App,private p:Planning){super(a,p)}display(){const c=this.containerEl;c.empty();new Setting(c).setName("Planning Dashboard").setHeading();new Setting(c).setName("اتصال TickTick").setDesc("برای انتخاب تسک و همگام‌سازی زمان‌بندی").addToggle(x=>x.setValue(this.p.settings.tick.enabled).onChange(async v=>{this.p.settings.tick.enabled=v;await this.p.save();this.display()}));new Setting(c).setName("API Token").addText(x=>{x.inputEl.type="password";x.setValue(this.p.settings.tick.token).onChange(async v=>{this.p.settings.tick.token=v.trim();await this.p.save()})});new Setting(c).setName("همگام‌سازی خودکار").addToggle(x=>x.setValue(this.p.settings.tick.auto).onChange(async v=>{this.p.settings.tick.auto=v;await this.p.save()}));new Setting(c).setName("فاصله (دقیقه)").addText(x=>x.setValue(String(this.p.settings.tick.minutes)).onChange(async v=>{this.p.settings.tick.minutes=Math.max(5,+v||30);await this.p.save()}));new Setting(c).setName("همگام‌سازی الآن").addButton(b=>b.setButtonText("همگام‌سازی").onClick(()=>void this.p.sync(true)))}}

class AreaModal extends Modal {
  constructor(a: App, private p: Planning, private area: string, private r: () => void) {
    super(a);
  }
  async onOpen() {
    this.modalEl.addClass("planning-modal", "planning-area-modal");
    this.contentEl.empty();
    this.contentEl.addClass("planning-modal-inner");

    let currentText = this.p.settings.areaDescriptions[this.area] || "";
    let isEditing = false;

    // Header
    const header = this.contentEl.createDiv({ cls: "planning-modal-header" });
    const titleWrap = header.createDiv({ cls: "planning-modal-title-wrap" });

    const iconEl = titleWrap.createSpan({ cls: "planning-area-icon" });
    iconEl.setText(icon(this.area));
    iconEl.style.setProperty("--area-color", color(this.area));

    titleWrap.createEl("h2", { text: this.area, cls: "planning-modal-title" });

    const modeWrap = header.createDiv({ cls: "planning-area-mode-wrap" });
    modeWrap.createEl("span", { text: "نمایش در نقشه:", cls: "planning-mode-label" });
    const modeDropdown = new DropdownComponent(modeWrap);
    modeDropdown.addOption("routine", "فقط نوار هدف");
    modeDropdown.addOption("tasks", "فقط تسک‌ها");
    modeDropdown.addOption("both", "هر دو (نوار + تسک)");
    modeDropdown.setValue(this.p.areaDisplayMode(this.area));
    modeDropdown.selectEl.addClass("planning-select", "planning-select-sm");
    modeDropdown.onChange(async value => {
      this.p.settings.areaDisplayModes[this.area] = value as AreaDisplayMode;
      await this.p.save();
      this.r();
    });

    // Body
    const body = this.contentEl.createDiv({ cls: "planning-modal-body" });
    const descSection = body.createDiv({ cls: "planning-desc-section" });
    const descHeader = descSection.createDiv({ cls: "planning-desc-header" });
    descHeader.createEl("span", { text: "یادداشت‌ها و راهنمای حوزه (Markdown)", cls: "planning-form-label" });

    const tabsWrap = descHeader.createDiv({ cls: "planning-desc-tabs" });
    const previewTabBtn = tabsWrap.createEl("button", {
      cls: "planning-tab-btn is-active",
      text: "👁️ مشاهده متن"
    });
    const editTabBtn = tabsWrap.createEl("button", {
      cls: "planning-tab-btn",
      text: "✏️ ویرایش متن"
    });

    const descContainer = descSection.createDiv({ cls: "planning-desc-container" });
    const previewEl = descContainer.createDiv({ cls: "planning-desc-preview planning-area-view-card" });
    const textareaEl = descContainer.createEl("textarea", {
      cls: "planning-desc-textarea planning-area-textarea is-hidden",
      placeholder: "یادداشت‌ها و راهنمای این حوزه را به زبان مارک‌داون وارد کنید..."
    });
    textareaEl.value = currentText;

    const renderPreview = async () => {
      previewEl.empty();
      const textToRender = currentText.trim() || "*هنوز توضیحی برای این حوزه ثبت نشده است. برای افزودن راهنما و یادداشت‌ها، روی «ویرایش متن» در بالا کلیک کنید.*";
      await MarkdownRenderer.render(this.app, textToRender, previewEl, "", this.p);
    };
    void renderPreview();

    // Footer
    const footer = this.contentEl.createDiv({ cls: "planning-modal-footer" });
    const footerLeft = footer.createDiv({ cls: "planning-footer-left" });
    const delBtn = footerLeft.createEl("button", { cls: "planning-btn-danger", text: "🗑️ حذف پروژه" });
    delBtn.onclick = async () => {
      if (!confirm(`آیا از حذف کامل پروژه «${this.area}» و تمام تسک‌های آن مطمئن هستید؟`)) return;
      this.p.settings.tasks = this.p.settings.tasks.filter(t => t.area !== this.area);
      delete this.p.settings.areaDescriptions[this.area];
      delete this.p.settings.routineSchedules[this.area];
      delete this.p.settings.routineBars[this.area];
      delete this.p.settings.areaDisplayModes[this.area];
      if (!this.p.settings.deletedAreas.includes(this.area)) this.p.settings.deletedAreas.push(this.area);
      await this.p.save();
      this.close();
      this.r();
    };

    const footerRight = footer.createDiv({ cls: "planning-footer-right" });
    const hasBars = (this.p.settings.routineBars[this.area]?.length ?? 0) > 0 || !!this.p.settings.routineSchedules[this.area];
    const routineBtn = footerRight.createEl("button", {
      cls: "planning-btn-secondary",
      text: hasBars ? "📅 ویرایش نوار حوزه" : "+ افزودن نوار حوزه"
    });
    routineBtn.onclick = () => {
      this.close();
      void this.p.editRoutine(this.area, () => this.r());
    };

    const toggleEditBtn = footerRight.createEl("button", { cls: "planning-btn-secondary", text: "✏️ ویرایش متن" });
    const cancelEditBtn = footerRight.createEl("button", { cls: "planning-btn-secondary is-hidden", text: "انصراف" });
    const saveDescBtn = footerRight.createEl("button", { cls: "planning-btn-primary mod-cta is-hidden", text: "💾 ذخیره توضیحات" });
    const closeBtn = footerRight.createEl("button", { cls: "planning-btn-primary mod-cta", text: "بستن" });
    closeBtn.onclick = () => this.close();

    const updateViewMode = (editing: boolean) => {
      isEditing = editing;
      if (editing) {
        previewTabBtn.removeClass("is-active");
        editTabBtn.addClass("is-active");
        previewEl.addClass("is-hidden");
        textareaEl.removeClass("is-hidden");
        textareaEl.focus();

        routineBtn.addClass("is-hidden");
        toggleEditBtn.addClass("is-hidden");
        closeBtn.addClass("is-hidden");
        cancelEditBtn.removeClass("is-hidden");
        saveDescBtn.removeClass("is-hidden");
      } else {
        editTabBtn.removeClass("is-active");
        previewTabBtn.addClass("is-active");
        textareaEl.addClass("is-hidden");
        previewEl.removeClass("is-hidden");
        void renderPreview();

        routineBtn.removeClass("is-hidden");
        toggleEditBtn.removeClass("is-hidden");
        closeBtn.removeClass("is-hidden");
        cancelEditBtn.addClass("is-hidden");
        saveDescBtn.addClass("is-hidden");
      }
    };

    previewTabBtn.onclick = (e) => {
      e.preventDefault();
      currentText = textareaEl.value;
      updateViewMode(false);
    };
    editTabBtn.onclick = (e) => {
      e.preventDefault();
      updateViewMode(true);
    };
    toggleEditBtn.onclick = () => updateViewMode(true);
    cancelEditBtn.onclick = () => {
      textareaEl.value = this.p.settings.areaDescriptions[this.area] || "";
      currentText = textareaEl.value;
      updateViewMode(false);
    };
    saveDescBtn.onclick = async () => {
      currentText = textareaEl.value;
      this.p.settings.areaDescriptions[this.area] = currentText;
      await this.p.save();
      this.r();
      new Notice("توضیحات با موفقیت ذخیره شد.");
      updateViewMode(false);
    };
  }
}

class Editor extends Modal {
  done!: (v: Omit<Task, "id"> | null) => void;
  res = new Promise<Omit<Task, "id"> | null>(r => this.done = r);
  end = false;

  constructor(a: App, private p: Planning, private init: Task | null, private onDelete?: () => void) {
    super(a);
  }

  finish(v: Omit<Task, "id"> | null) {
    if (!this.end) {
      this.end = true;
      this.done(v);
      this.close();
    }
  }

  onOpen() {
    this.modalEl.addClass("planning-modal", "planning-editor-modal");
    this.contentEl.empty();
    this.contentEl.addClass("planning-modal-inner");

    let z: Omit<Task, "id"> = {
      area: this.init?.area || F,
      title: this.init?.title || "",
      start: this.init?.start || "",
      due: this.init?.due || "",
      status: this.init?.status || "todo",
      description: this.init?.description || "",
      tickId: this.init?.tickId,
      projectId: this.init?.projectId
    };
    let customArea = "";

    // Header
    const header = this.contentEl.createDiv({ cls: "planning-modal-header" });
    const headerTitleWrap = header.createDiv({ cls: "planning-modal-title-wrap" });
    headerTitleWrap.createEl("h2", {
      text: this.init ? "ویرایش فاز" : "افزودن فاز جدید",
      cls: "planning-modal-title"
    });
    if (this.init) {
      const badge = headerTitleWrap.createSpan({ cls: "planning-modal-badge" });
      badge.setText(`${icon(z.area)} ${z.area}`);
      badge.style.setProperty("--badge-color", color(z.area));
    }

    const tickBtn = header.createEl("button", {
      cls: "planning-btn-secondary planning-tick-btn",
      text: "🔄 انتخاب از TickTick"
    });

    // Body
    const body = this.contentEl.createDiv({ cls: "planning-modal-body" });
    const form = body.createDiv({ cls: "planning-form" });

    // Title group
    const titleGroup = form.createDiv({ cls: "planning-form-group" });
    titleGroup.createEl("label", { text: "عنوان فاز یا تسک", cls: "planning-form-label" });
    const titleInput = titleGroup.createEl("input", {
      type: "text",
      cls: "planning-input planning-input-lg",
      placeholder: "مثال: سطح ۷: زندگی به زبان آلمانی"
    });
    titleInput.value = z.title;
    titleInput.oninput = () => { z.title = titleInput.value; };

    // Area row
    const areaRow = form.createDiv({ cls: "planning-form-row" });
    const areaGroup = areaRow.createDiv({ cls: "planning-form-group" });
    areaGroup.createEl("label", { text: "حوزهٔ پروژه", cls: "planning-form-label" });
    const areaDropdown = new DropdownComponent(areaGroup);
    const as = this.p.areaNames();
    as.forEach(a => areaDropdown.addOption(a, a));
    areaDropdown.addOption("__new__", "＋ ساخت حوزهٔ جدید");
    areaDropdown.setValue(as.includes(z.area) ? z.area : "__new__");
    areaDropdown.selectEl.addClass("planning-select");

    const newAreaGroup = areaRow.createDiv({ cls: "planning-form-group planning-new-area-group" });
    newAreaGroup.createEl("label", { text: "نام حوزهٔ جدید", cls: "planning-form-label" });
    const newAreaInput = newAreaGroup.createEl("input", {
      type: "text",
      cls: "planning-input",
      placeholder: "نام حوزهٔ جدید را وارد کنید..."
    });
    newAreaInput.oninput = () => {
      customArea = newAreaInput.value.trim();
      if (customArea) z.area = customArea;
    };

    const updateNewAreaVisibility = () => {
      if (areaDropdown.getValue() === "__new__") {
        newAreaGroup.removeClass("is-hidden");
        areaRow.addClass("planning-form-row-2");
      } else {
        newAreaGroup.addClass("is-hidden");
        areaRow.removeClass("planning-form-row-2");
      }
    };
    updateNewAreaVisibility();

    areaDropdown.onChange(val => {
      updateNewAreaVisibility();
      if (val !== "__new__") {
        z.area = val;
      } else {
        if (customArea) z.area = customArea;
      }
    });

    // Dates row
    const datesRow = form.createDiv({ cls: "planning-form-row planning-form-row-2" });
    const startGroup = datesRow.createDiv({ cls: "planning-form-group" });
    startGroup.createEl("label", { text: "تاریخ شروع", cls: "planning-form-label" });
    const startInput = startGroup.createEl("input", {
      type: "date",
      cls: "planning-input planning-date-input"
    });
    startInput.value = z.start;
    startInput.onchange = () => { z.start = startInput.value; };

    const dueGroup = datesRow.createDiv({ cls: "planning-form-group" });
    dueGroup.createEl("label", { text: "تاریخ پایان", cls: "planning-form-label" });
    const dueInput = dueGroup.createEl("input", {
      type: "date",
      cls: "planning-input planning-date-input"
    });
    dueInput.value = z.due;
    dueInput.onchange = () => { z.due = dueInput.value; };

    // Description Section
    const descSection = form.createDiv({ cls: "planning-form-group planning-desc-section" });
    const descHeader = descSection.createDiv({ cls: "planning-desc-header" });
    const descHeaderLeft = descHeader.createDiv({ cls: "planning-desc-header-info" });
    descHeaderLeft.createEl("label", {
      text: "توضیحات و مستندات (پشتیبانی کامل از Markdown)",
      cls: "planning-form-label"
    });

    const tabsWrap = descHeader.createDiv({ cls: "planning-desc-tabs" });
    const previewTabBtn = tabsWrap.createEl("button", {
      cls: "planning-tab-btn",
      text: "👁️ پیش‌نمایش"
    });
    const editTabBtn = tabsWrap.createEl("button", {
      cls: "planning-tab-btn",
      text: "✏️ ویرایش متن"
    });

    const descBody = descSection.createDiv({ cls: "planning-desc-container" });
    const previewEl = descBody.createDiv({ cls: "planning-desc-preview" });
    const descTextarea = descBody.createEl("textarea", {
      cls: "planning-desc-textarea",
      placeholder: "توضیحات و اهداف این فاز را به زبان مارک‌داون بنویسید...\nمثال:\n## هدف\nتوضیح هدف...\n## معیارهای اصلی\n- [ ] چک‌لیست ۱\n- [ ] چک‌لیست ۲"
    });
    descTextarea.value = z.description || "";
    descTextarea.oninput = () => { z.description = descTextarea.value; };

    const renderPreview = async () => {
      previewEl.empty();
      const content = z.description?.trim() || "*هنوز توضیحی برای این فاز ثبت نشده است. برای نوشتن، روی دکمه «ویرایش متن» در بالا کلیک کنید.*";
      await MarkdownRenderer.render(this.app, content, previewEl, "", this.p);
    };

    const setTab = (tab: "preview" | "edit") => {
      if (tab === "preview") {
        previewTabBtn.addClass("is-active");
        editTabBtn.removeClass("is-active");
        previewEl.removeClass("is-hidden");
        descTextarea.addClass("is-hidden");
        z.description = descTextarea.value;
        void renderPreview();
      } else {
        editTabBtn.addClass("is-active");
        previewTabBtn.removeClass("is-active");
        previewEl.addClass("is-hidden");
        descTextarea.removeClass("is-hidden");
        descTextarea.focus();
      }
    };

    previewTabBtn.onclick = (e) => { e.preventDefault(); setTab("preview"); };
    editTabBtn.onclick = (e) => { e.preventDefault(); setTab("edit"); };

    // Default to preview if description has content, otherwise edit
    const initialTab = z.description?.trim() ? "preview" : "edit";
    setTab(initialTab);

    // TickTick click handler
    tickBtn.onclick = async () => {
      const picked = await new Picker(this.app, this.p).wait();
      if (picked) {
        z = { ...z, ...picked, area: z.area, tickId: picked.id };
        titleInput.value = z.title;
        startInput.value = z.start;
        dueInput.value = z.due;
        descTextarea.value = z.description || "";
        areaDropdown.setValue(as.includes(z.area) ? z.area : "__new__");
        updateNewAreaVisibility();
        void renderPreview();
      }
    };

    // Footer
    const footer = this.contentEl.createDiv({ cls: "planning-modal-footer" });
    const footerLeft = footer.createDiv({ cls: "planning-footer-left" });
    if (this.init && this.onDelete) {
      const delBtn = footerLeft.createEl("button", {
        cls: "planning-btn-danger",
        text: "🗑️ حذف فاز"
      });
      delBtn.onclick = () => {
        this.end = true;
        this.done(null);
        this.close();
        this.onDelete?.();
      };
    }

    const footerRight = footer.createDiv({ cls: "planning-footer-right" });
    const cancelBtn = footerRight.createEl("button", {
      cls: "planning-btn-secondary",
      text: "انصراف"
    });
    cancelBtn.onclick = () => this.finish(null);

    const saveBtn = footerRight.createEl("button", {
      cls: "planning-btn-primary mod-cta",
      text: "ذخیره فاز"
    });
    saveBtn.onclick = () => {
      z.description = descTextarea.value;
      if (!z.title.trim()) return new Notice("عنوان فاز را وارد کن.");
      if (!z.area.trim()) return new Notice("حوزه فاز را انتخاب کن.");
      if (!date(z.start) || !date(z.due) || z.due < z.start) {
        return new Notice("تاریخ‌های معتبر وارد کن (پایان نباید قبل از شروع باشد).");
      }
      this.finish(z);
    };
  }

  onClose() {
    this.contentEl.empty();
    if (!this.end) this.finish(null);
  }

  wait() {
    this.open();
    return this.res;
  }
}

class RoutineEditor extends Modal {
  done!: (v: (RoutineBar & { area: string }) | null) => void;
  res = new Promise<(RoutineBar & { area: string }) | null>(r => this.done = r);
  end = false;

  constructor(
    a: App,
    private p: Planning,
    private initialArea: string | null,
    private barId?: string,
    private refresh?: () => void
  ) {
    super(a);
  }

  finish(v: (RoutineBar & { area: string }) | null) {
    if (!this.end) {
      this.end = true;
      this.done(v);
      this.close();
    }
  }

  onOpen() {
    this.modalEl.addClass("planning-modal", "planning-routine-modal");
    this.contentEl.empty();
    this.contentEl.addClass("planning-modal-inner");

    const original = this.initialArea && this.barId
      ? this.p.settings.routineBars[this.initialArea]?.find(bar => bar.id === this.barId)
      : undefined;

    let selected = this.initialArea || R[0];
    let customArea = "";
    let title = original?.title || "";
    let start = original?.start || "";
    let due = original?.due || "";

    // Header
    const header = this.contentEl.createDiv({ cls: "planning-modal-header" });
    header.createDiv({ cls: "planning-modal-title-wrap" }).createEl("h2", {
      text: original ? "ویرایش نوار حوزه" : "افزودن نوار حوزه",
      cls: "planning-modal-title"
    });

    // Body
    const body = this.contentEl.createDiv({ cls: "planning-modal-body" });
    const form = body.createDiv({ cls: "planning-form" });

    // Area row
    const areaRow = form.createDiv({ cls: "planning-form-row" });
    const areaGroup = areaRow.createDiv({ cls: "planning-form-group" });
    areaGroup.createEl("label", { text: "حوزهٔ پروژه", cls: "planning-form-label" });
    const areaDropdown = new DropdownComponent(areaGroup);
    const names = this.p.areaNames();
    names.forEach(name => areaDropdown.addOption(name, name));
    areaDropdown.addOption("__new__", "＋ ساخت حوزهٔ جدید");
    areaDropdown.setValue(names.includes(selected) ? selected : "__new__");
    areaDropdown.selectEl.addClass("planning-select");

    const newAreaGroup = areaRow.createDiv({ cls: "planning-form-group planning-new-area-group" });
    newAreaGroup.createEl("label", { text: "نام حوزهٔ جدید", cls: "planning-form-label" });
    const newAreaInput = newAreaGroup.createEl("input", {
      type: "text",
      cls: "planning-input",
      placeholder: "نام حوزهٔ جدید..."
    });
    newAreaInput.oninput = () => {
      customArea = newAreaInput.value.trim();
      if (customArea) selected = customArea;
    };

    const updateVisibility = () => {
      if (areaDropdown.getValue() === "__new__") {
        newAreaGroup.removeClass("is-hidden");
        areaRow.addClass("planning-form-row-2");
      } else {
        newAreaGroup.addClass("is-hidden");
        areaRow.removeClass("planning-form-row-2");
      }
    };
    updateVisibility();

    areaDropdown.onChange(val => {
      updateVisibility();
      selected = val === "__new__" ? customArea : val;
    });

    // Title group
    const titleGroup = form.createDiv({ cls: "planning-form-group" });
    titleGroup.createEl("label", { text: "عنوان نوار (اختیاری)", cls: "planning-form-label" });
    const titleInput = titleGroup.createEl("input", {
      type: "text",
      cls: "planning-input",
      placeholder: "اختیاری؛ برای تشخیص نوارهای یک حوزه استفاده می‌شود."
    });
    titleInput.value = title;
    titleInput.oninput = () => { title = titleInput.value.trim(); };

    // Dates row
    const datesRow = form.createDiv({ cls: "planning-form-row planning-form-row-2" });
    const startGroup = datesRow.createDiv({ cls: "planning-form-group" });
    startGroup.createEl("label", { text: "شروع نوار", cls: "planning-form-label" });
    const startInput = startGroup.createEl("input", {
      type: "date",
      cls: "planning-input planning-date-input"
    });
    startInput.value = start;
    startInput.onchange = () => { start = startInput.value; };

    const dueGroup = datesRow.createDiv({ cls: "planning-form-group" });
    dueGroup.createEl("label", { text: "پایان نوار", cls: "planning-form-label" });
    const dueInput = dueGroup.createEl("input", {
      type: "date",
      cls: "planning-input planning-date-input"
    });
    dueInput.value = due;
    dueInput.onchange = () => { due = dueInput.value; };

    // Footer
    const footer = this.contentEl.createDiv({ cls: "planning-modal-footer" });
    const footerLeft = footer.createDiv({ cls: "planning-footer-left" });
    if (original) {
      const delBtn = footerLeft.createEl("button", {
        cls: "planning-btn-danger",
        text: "🗑️ حذف نوار"
      });
      delBtn.onclick = async () => {
        if (!confirm("آیا از حذف این نوار اطمینان دارید؟")) return;
        this.p.settings.routineBars[this.initialArea!] = this.p.settings.routineBars[this.initialArea!].filter(bar => bar.id !== original.id);
        await this.p.save();
        this.refresh?.();
        this.end = true;
        this.done(null);
        this.close();
      };
    }

    const footerRight = footer.createDiv({ cls: "planning-footer-right" });
    const cancelBtn = footerRight.createEl("button", {
      cls: "planning-btn-secondary",
      text: "انصراف"
    });
    cancelBtn.onclick = () => this.finish(null);

    const saveBtn = footerRight.createEl("button", {
      cls: "planning-btn-primary mod-cta",
      text: "ذخیره نوار"
    });
    saveBtn.onclick = () => {
      if (!selected || !date(start) || !date(due) || due < start) {
        return new Notice("حوزه و بازهٔ زمانی معتبر وارد کن.");
      }
      this.finish({
        id: original?.id || crypto.randomUUID(),
        area: selected,
        title,
        start,
        due
      });
    };
  }

  onClose() {
    this.contentEl.empty();
    if (!this.end) this.finish(null);
  }

  wait() {
    this.open();
    return this.res;
  }
}

class Picker extends Modal {
  done!: (v: TickTickTaskSelection | null) => void;
  res = new Promise<TickTickTaskSelection | null>(r => this.done = r);
  end = false;

  constructor(a: App, private p: Planning) {
    super(a);
  }

  finish(v: TickTickTaskSelection | null) {
    if (!this.end) {
      this.end = true;
      this.done(v);
      this.close();
    }
  }

  async onOpen() {
    this.modalEl.addClass("planning-modal", "planning-picker-modal");
    this.contentEl.empty();
    this.contentEl.addClass("planning-modal-inner");

    const header = this.contentEl.createDiv({ cls: "planning-modal-header" });
    header.createDiv({ cls: "planning-modal-title-wrap" }).createEl("h2", {
      text: "انتخاب تسک از TickTick",
      cls: "planning-modal-title"
    });

    const body = this.contentEl.createDiv({ cls: "planning-modal-body planning-picker-body" });

    try {
      const tasks = await this.p.pick();
      const byProject = tasks.reduce((acc, t) => {
        const pName = t.projectName || "بدون پروژه";
        if (!acc[pName]) acc[pName] = [];
        acc[pName].push(t);
        return acc;
      }, {} as Record<string, TickTickTaskSelection[]>);

      const container = body.createDiv({ cls: "planning-picker-container" });
      for (const [pName, pTasks] of Object.entries(byProject)) {
        const group = container.createDiv({ cls: "planning-picker-group" });
        group.createEl("h3", { text: pName, cls: "planning-picker-group-title" });
        const list = group.createDiv({ cls: "planning-picker-list" });
        for (const t of pTasks) {
          const btn = list.createEl("button", { cls: "planning-picker-item" });
          btn.createDiv({ cls: "planning-picker-item-title", text: t.title });
          if (t.start || t.due) {
            btn.createDiv({ cls: "planning-picker-item-date", text: `${fmt(t.start)} — ${fmt(t.due)}` });
          }
          btn.onclick = () => this.finish(t);
        }
      }
    } catch (e) {
      body.createEl("p", {
        cls: "planning-error-text",
        text: e instanceof Error ? e.message : "خطا در اتصال به TickTick"
      });
    }

    const footer = this.contentEl.createDiv({ cls: "planning-modal-footer" });
    const footerRight = footer.createDiv({ cls: "planning-footer-right" });
    const closeBtn = footerRight.createEl("button", {
      cls: "planning-btn-secondary",
      text: "بستن"
    });
    closeBtn.onclick = () => this.finish(null);
  }

  onClose() {
    this.contentEl.empty();
    if (!this.end) this.finish(null);
  }

  wait() {
    this.open();
    return this.res;
  }
}

class Manager extends Modal {
  constructor(a: App, private p: Planning, private r: () => void) {
    super(a);
  }

  onOpen() {
    this.modalEl.addClass("planning-modal", "planning-manager-modal");
    this.contentEl.empty();
    this.contentEl.addClass("planning-modal-inner");

    const header = this.contentEl.createDiv({ cls: "planning-modal-header" });
    header.createDiv({ cls: "planning-modal-title-wrap" }).createEl("h2", {
      text: "مدیریت فازها و تسک‌ها",
      cls: "planning-modal-title"
    });

    const body = this.contentEl.createDiv({ cls: "planning-modal-body" });
    for (const t of this.p.tasks()) {
      const x = body.createDiv({ cls: "planning-manager-row" });
      x.createSpan({ text: `${t.area} — ${t.title}` });
      const actions = x.createDiv({ cls: "planning-row-actions" });
      actions.createEl("button", { text: "ویرایش" }).onclick = () => void this.p.edit(t, this.r);
      actions.createEl("button", { text: "حذف", cls: "planning-btn-danger mod-warning" }).onclick = () => void this.p.del(t, this.r);
    }

    const footer = this.contentEl.createDiv({ cls: "planning-modal-footer" });
    const footerRight = footer.createDiv({ cls: "planning-footer-right" });
    const closeBtn = footerRight.createEl("button", {
      cls: "planning-btn-primary mod-cta",
      text: "بستن"
    });
    closeBtn.onclick = () => this.close();
  }
}

const date=(x:string)=>/^\d{4}-\d{2}-\d{2}$/.test(x),key=(x:unknown)=>date(String(x).slice(0,10))?String(x).slice(0,10):"",diff=(a:string,b:string)=>Math.round((Date.parse(b+"T12:00Z")-Date.parse(a+"T12:00Z"))/864e5),shift=(a:string,n:number)=>new Date(Date.parse(a+"T12:00Z")+n*864e5).toISOString().slice(0,10),pos=(e:HTMLElement,s:string,a:string,b:string,n:number)=>{const o=Math.max(0,diff(s,a)),d=Math.min(n-o,Math.max(1,diff(a,b)+1));e.setCssProps({right:`${o/n*100}%`,width:`${Math.max(1.2,d/n*100)}%`})},fmt=(x:string)=>date(x)?new Intl.DateTimeFormat("fa-IR-u-ca-persian",{month:"numeric",day:"numeric"}).format(new Date(x+"T12:00")):"—",areas=(x:Task[],routineAreas:string[]=[])=>{const fixed=[...R,F],custom=[...new Set([...x.map(t=>t.area),...routineAreas])].filter(area=>!fixed.includes(area)).sort((a,b)=>a.localeCompare(b,"fa"));return[...fixed,...custom]},months=(s:string,d:string)=>{const f=new Intl.DateTimeFormat("fa-IR-u-ca-persian",{month:"long"}),o:{l:string;n:number}[]=[];for(let x=s;x<=d;x=new Date(Date.parse(x+"T12:00Z")+864e5).toISOString().slice(0,10)){const l=f.format(new Date(x+"T12:00Z")),q=o.at(-1);q?.l===l?q.n++:o.push({l,n:1})}return o},color=(a:string)=>({"بهبود فردی":"#10b981","زبان آلمانی":"#f59e0b","کاتلین و اندروید":"#3b82f6"}as Record<string,string>)[a]||"#8b5cf6",tone=(a:string)=>({"بهبود فردی":"personal","زبان آلمانی":"language","کاتلین و اندروید":"kotlin","فین‌ترک و شاپ":"fintrack"}as Record<string,string>)[a]||"personal",icon=(a:string)=>({"بهبود فردی":"🌱","زبان آلمانی":"🇩🇪","کاتلین و اندروید":"🧩","فین‌ترک و شاپ":"🛠️"}as Record<string,string>)[a]||"📁";
