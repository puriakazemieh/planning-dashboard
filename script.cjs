const fs = require('fs');
let content = fs.readFileSync('src/main.ts', 'utf8');

// Replace Actions with nothing
content = content.replace(/class Actions extends Modal\{.+?\}\}\n?/, '');

// Replace Desc
const old_desc = 'class Desc extends Modal{constructor(a:App,private t:Task,private p:Plugin){super(a)}async onOpen(){this.contentEl.createEl("h2",{text:this.t.title});const x=this.contentEl.createDiv({cls:"planning-description"});await MarkdownRenderer.renderMarkdown(this.t.description||"توضیحی ثبت نشده است.",x,"",this.p);this.contentEl.createEl("button",{text:"بستن"}).onclick=()=>this.close()}}';
const new_desc = 'class Desc extends Modal{isEditing=false;constructor(a:App,private t:Task,private p:Planning,private r:()=>void){super(a)}async onOpen(){this.renderContent()}async renderContent(){this.contentEl.empty();this.contentEl.createEl("h2",{text:${this.t.area} — });if(this.isEditing){const ta=this.contentEl.createEl("textarea",{cls:"planning-description-edit"});ta.value=this.t.description||"";ta.rows=12;ta.style.width="100%";ta.style.resize="vertical";ta.style.fontFamily="inherit";ta.style.padding="10px";const container=this.contentEl.createDiv({cls:"modal-button-container"});container.createEl("button",{text:"انصراف"}).onclick=()=>{this.isEditing=false;this.renderContent()};container.createEl("button",{text:"ذخیره توضیحات",cls:"mod-cta"}).onclick=async()=>{this.t.description=ta.value;await this.p.save();this.r();this.isEditing=false;this.renderContent()}}else{const x=this.contentEl.createDiv({cls:"planning-description"});await MarkdownRenderer.renderMarkdown(this.t.description||"توضیحی ثبت نشده است.",x,"",this.p);const container=this.contentEl.createDiv({cls:"modal-button-container"});container.createEl("button",{text:"بستن"}).onclick=()=>this.close();container.createEl("button",{text:"ویرایش متن"}).onclick=()=>{this.isEditing=true;this.renderContent()};container.createEl("button",{text:"ویرایش فاز"}).onclick=()=>{this.close();this.p.edit(this.t,this.r)};container.createEl("button",{text:"حذف",cls:"mod-warning"}).onclick=()=>{this.close();this.p.del(this.t,this.r)}}}}';

content = content.replace(old_desc, new_desc);

// Update Actions references to Desc in overview
content = content.replace('new Actions(this.app,this,t,()=>this.overview(e)).open()', 'new Desc(this.app,t,this,()=>this.overview(e)).open()');

// Update Desc references in board to pass r
content = content.replace('new Desc(this.app,t,this).open()', 'new Desc(this.app,t,this,r).open()');

fs.writeFileSync('src/main.ts', content);
console.log('Done');
