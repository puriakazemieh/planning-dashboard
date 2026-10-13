"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key2 of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key2) && key2 !== except)
        __defProp(to, key2, { get: () => from[key2], enumerable: !(desc = __getOwnPropDesc(from, key2)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/main.ts
var main_exports = {};
__export(main_exports, {
  default: () => Planning
});
module.exports = __toCommonJS(main_exports);
var import_obsidian = require("obsidian");
var isRecord = (value) => typeof value === "object" && value !== null;
var D = { tasks: [], migrated: false, routineSchedules: {}, routineBars: {}, areaDescriptions: {}, areaDisplayModes: {}, deletedAreas: [], tick: { enabled: false, token: "", auto: false, minutes: 30 } };
var R = ["\u0632\u0628\u0627\u0646 \u0622\u0644\u0645\u0627\u0646\u06CC", "\u06A9\u0627\u062A\u0644\u06CC\u0646 \u0648 \u0627\u0646\u062F\u0631\u0648\u06CC\u062F", "\u0628\u0647\u0628\u0648\u062F \u0641\u0631\u062F\u06CC"];
var F = "\u0641\u06CC\u0646\u200C\u062A\u0631\u06A9 \u0648 \u0634\u0627\u067E";
var S = [["spring", "\u0628\u0647\u0627\u0631 \u06F1\u06F4\u06F0\u06F5", "2026-03-21", "2026-06-21"], ["summer", "\u062A\u0627\u0628\u0633\u062A\u0627\u0646 \u06F1\u06F4\u06F0\u06F5", "2026-06-22", "2026-09-22"], ["autumn", "\u067E\u0627\u06CC\u06CC\u0632 \u06F1\u06F4\u06F0\u06F5", "2026-09-23", "2026-12-21"], ["winter", "\u0632\u0645\u0633\u062A\u0627\u0646 \u06F1\u06F4\u06F0\u06F5", "2026-12-22", "2027-03-20"]];
var Planning = class extends import_obsidian.Plugin {
  settings = D;
  timer = null;
  async onload() {
    const x = await this.loadData();
    this.settings = { ...D, ...x, routineSchedules: { ...D.routineSchedules, ...x?.routineSchedules }, routineBars: { ...D.routineBars, ...x?.routineBars }, areaDescriptions: { ...D.areaDescriptions, ...x?.areaDescriptions }, areaDisplayModes: { ...D.areaDisplayModes, ...x?.areaDisplayModes }, deletedAreas: Array.isArray(x?.deletedAreas) ? x.deletedAreas : [], tick: { ...D.tick, ...x?.tick } };
    await this.migrateRoutineBars();
    await this.migrate();
    this.addSettingTab(new Tab(this.app, this));
    this.registerMarkdownCodeBlockProcessor("planning-overview", (_, e) => this.overview(e));
    this.registerMarkdownCodeBlockProcessor("planning-season-map", (_, e) => this.season(e));
    this.registerMarkdownCodeBlockProcessor("planning-nearest-phases", (_, e) => this.nearest(e));
    this.addCommand({ id: "sync-ticktick-schedules", name: "Sync selected TickTick schedules", callback: () => void this.sync(true) });
    this.schedule();
  }
  onunload() {
    if (this.timer) window.clearInterval(this.timer);
  }
  async save() {
    await this.saveData(this.settings);
    this.schedule();
  }
  schedule() {
    if (this.timer) window.clearInterval(this.timer);
    if (this.settings.tick.enabled && this.settings.tick.token && this.settings.tick.auto) this.timer = window.setInterval(() => void this.sync(false), Math.max(5, this.settings.tick.minutes) * 6e4);
  }
  async migrate() {
    if (this.settings.migrated) return;
    try {
      const path = `${this.app.vault.configDir}/plugins/ticktick-bridge/data.json`, raw = JSON.parse(await this.app.vault.adapter.read(path));
      if (isRecord(raw) && Array.isArray(raw.projectTaskCatalog)) this.settings.tasks = raw.projectTaskCatalog.filter(isRecord).map((t) => ({ id: String(t.id ?? crypto.randomUUID()), area: String(t.area ?? "\u0628\u062F\u0648\u0646 \u062F\u0633\u062A\u0647"), title: String(t.title ?? "\u0628\u062F\u0648\u0646 \u0639\u0646\u0648\u0627\u0646"), start: String(t.start ?? ""), due: String(t.due ?? ""), status: String(t.status ?? "todo"), description: String(t.description ?? ""), tickId: String(t.id ?? ""), projectId: String(t.ticktickProjectId ?? "") }));
    } catch {
    }
    this.settings.migrated = true;
    await this.saveData(this.settings);
  }
  tasks() {
    return this.settings.tasks.slice().sort((a, b) => (a.start + a.title).localeCompare(b.start + b.title, "fa"));
  }
  async migrateRoutineBars() {
    let changed = false;
    for (const [area, schedule] of Object.entries(this.settings.routineSchedules)) {
      if (this.settings.routineBars[area]?.length) continue;
      this.settings.routineBars[area] = [{ id: crypto.randomUUID(), title: "", start: schedule.start, due: schedule.due }];
      changed = true;
    }
    if (changed) await this.saveData(this.settings);
  }
  areaNames() {
    return areas(this.tasks(), [...Object.keys(this.settings.routineSchedules), ...Object.keys(this.settings.routineBars)]).filter((area) => !this.settings.deletedAreas.includes(area));
  }
  areaDisplayMode(area) {
    return this.settings.areaDisplayModes[area] ?? (area === "\u06A9\u0627\u062A\u0644\u06CC\u0646 \u0648 \u0627\u0646\u062F\u0631\u0648\u06CC\u062F" || area === "\u0628\u0647\u0628\u0648\u062F \u0641\u0631\u062F\u06CC" ? "routine" : "tasks");
  }
  controls(h, refresh, full = false) {
    const t = h.createDiv({ cls: "planning-toolbar" }), actions = t.createDiv({ cls: "planning-toolbar-actions" });
    actions.createEl("button", { text: "+ \u0627\u0641\u0632\u0648\u062F\u0646 \u062A\u0633\u06A9", cls: "mod-cta" }).onclick = () => void this.edit(null, refresh);
    actions.createEl("button", { text: "+ \u0627\u0641\u0632\u0648\u062F\u0646 \u0646\u0648\u0627\u0631" }).onclick = () => void this.editRoutine(null, refresh);
  }
  dragRoutine(line, lane, handle, area, bar, seasonStart, seasonEnd, refresh) {
    handle.addEventListener("touchstart", (e) => e.stopPropagation(), { passive: false });
    handle.addEventListener("touchmove", (e) => e.stopPropagation(), { passive: false });
    handle.addEventListener("pointerdown", (event) => {
      event.preventDefault();
      handle.setPointerCapture(event.pointerId);
      const movingStart = handle.hasClass("planning-line-start"), rect = lane.getBoundingClientRect();
      let nextStart = bar.start, nextDue = bar.due;
      const update = (clientX) => {
        const offset = Math.max(0, Math.min(diff(seasonStart, seasonEnd), Math.round((rect.right - clientX) / rect.width * diff(seasonStart, seasonEnd))));
        const day = shift(seasonStart, offset);
        if (movingStart) nextStart = day <= nextDue ? day : nextDue;
        else nextDue = day >= nextStart ? day : nextStart;
        pos(line, seasonStart, nextStart, nextDue, diff(seasonStart, seasonEnd) + 1);
      };
      const move = (e) => update(e.clientX);
      const end = async (e) => {
        update(e.clientX);
        document.removeEventListener("pointermove", move);
        document.removeEventListener("pointerup", end);
        const bars = this.settings.routineBars[area] ?? [];
        const current = bars.find((item) => item.id === bar.id);
        if (current) {
          current.start = nextStart;
          current.due = nextDue;
        }
        await this.save();
        refresh();
      };
      document.addEventListener("pointermove", move);
      document.addEventListener("pointerup", end);
    });
  }
  dragTask(bar, lane, handle, task, seasonStart, seasonEnd, refresh) {
    handle.addEventListener("click", (event) => event.stopPropagation());
    handle.addEventListener("touchstart", (e) => e.stopPropagation(), { passive: false });
    handle.addEventListener("touchmove", (e) => e.stopPropagation(), { passive: false });
    handle.addEventListener("pointerdown", (event) => {
      event.preventDefault();
      event.stopPropagation();
      handle.setPointerCapture(event.pointerId);
      const movingStart = handle.hasClass("planning-line-start"), rect = lane.getBoundingClientRect();
      let nextStart = task.start, nextDue = task.due;
      const update = (clientX) => {
        const offset = Math.max(0, Math.min(diff(seasonStart, seasonEnd), Math.round((rect.right - clientX) / rect.width * diff(seasonStart, seasonEnd))));
        const day = shift(seasonStart, offset);
        if (movingStart) nextStart = day <= nextDue ? day : nextDue;
        else nextDue = day >= nextStart ? day : nextStart;
        pos(bar, seasonStart, nextStart, nextDue, diff(seasonStart, seasonEnd) + 1);
      };
      const move = (e) => update(e.clientX);
      const end = async (e) => {
        update(e.clientX);
        document.removeEventListener("pointermove", move);
        document.removeEventListener("pointerup", end);
        task.start = nextStart;
        task.due = nextDue;
        await this.save();
        refresh();
      };
      document.addEventListener("pointermove", move);
      document.addEventListener("pointerup", end);
    });
  }
  startTaskBarDrag(event) {
    const bar = event.target.closest(".planning-task-bar");
    if (!bar) return;
    const rect = bar.getBoundingClientRect(), edge = 12, moveStart = event.clientX > rect.right - edge, moveEnd = event.clientX < rect.left + edge;
    if (!moveStart && !moveEnd) return;
    const task = this.settings.tasks.find((item) => item.title === bar.textContent?.trim());
    const lane = bar.closest(".planning-lane");
    if (!task || !lane) return;
    event.preventDefault();
    event.stopPropagation();
    const season = bar.closest(".planning-season"), all = Array.from(document.querySelectorAll(".planning-season")), index = all.indexOf(season);
    const data = S[index];
    if (!data) return;
    const [, , start, end] = data, rectLane = lane.getBoundingClientRect();
    let nextStart = task.start, nextDue = task.due;
    const update = (x) => {
      const offset = Math.max(0, Math.min(diff(start, end), Math.round((rectLane.right - x) / rectLane.width * diff(start, end))));
      const day = shift(start, offset);
      if (moveStart) nextStart = day <= nextDue ? day : nextDue;
      else nextDue = day >= nextStart ? day : nextStart;
      pos(bar, start, nextStart, nextDue, diff(start, end) + 1);
    };
    const move = (e) => update(e.clientX);
    const finish = async (e) => {
      update(e.clientX);
      document.removeEventListener("pointermove", move);
      document.removeEventListener("pointerup", finish);
      task.start = nextStart;
      task.due = nextDue;
      await this.save();
    };
    document.addEventListener("pointermove", move);
    document.addEventListener("pointerup", finish);
  }
  overview(e) {
    e.empty();
    const root = e.createDiv({ cls: "planning-overview" });
    this.controls(root, () => this.overview(e));
    const ts = this.tasks(), allAreas = this.areaNames(), routineBars = (a) => {
      const saved = this.settings.routineBars[a];
      if (saved?.length) return saved;
      if (!R.includes(a)) return [];
      const taskDates = ts.filter((t) => t.area === a && date(t.start) && date(t.due));
      const start = taskDates.map((t) => t.start).sort()[0] || "", due = taskDates.map((t) => t.due).sort().at(-1) || "";
      return start && due ? [{ id: `derived-${a}`, title: "", start, due }] : [];
    };
    for (const [c, l, s, d] of S) {
      const q = root.createDiv({ cls: `planning-season planning-${c}` });
      q.createEl("h3", { text: l });
      const b = q.createDiv({ cls: "planning-season-body" }), labs = b.createDiv({ cls: "planning-labels" });
      labs.createDiv({ cls: "planning-label-spacer" });
      const cal = b.createDiv({ cls: "planning-calendar" }), lanes = cal.createDiv({ cls: "planning-lanes" }), n = diff(s, d) + 1, mo = cal.createDiv({ cls: "planning-months" });
      for (const m of months(s, d)) {
        const z = mo.createDiv({ cls: "planning-month", text: m.l });
        z.setCssProps({ flex: String(m.n) });
      }
      cal.insertBefore(mo, lanes);
      for (const a of allAreas) {
        const lb = labs.createEl("button", { cls: "planning-area", text: a });
        lb.onclick = () => new AreaModal(this.app, this, a, () => this.overview(e)).open();
        const lane = lanes.createDiv({ cls: "planning-lane" }), mode = this.areaDisplayMode(a);
        if (mode !== "tasks") for (const routine of routineBars(a).filter((bar) => bar.start <= d && bar.due >= s)) {
          const line = lane.createDiv({ cls: "planning-routine-line" });
          pos(line, s, routine.start, routine.due, n);
          line.setCssProps({ "--planning-color": color(a) });
          line.setAttribute("title", routine.title || a);
          line.onclick = () => void this.editRoutine(a, () => this.overview(e), routine.id);
          const first = line.createDiv({ cls: "planning-line-handle planning-line-start" }), last = line.createDiv({ cls: "planning-line-handle planning-line-end" });
          this.dragRoutine(line, lane, first, a, routine, s, d, () => this.overview(e));
          this.dragRoutine(line, lane, last, a, routine, s, d, () => this.overview(e));
        }
        if (mode !== "routine") for (const task of ts.filter((t) => t.area === a && t.start <= d && t.due >= s)) {
          const bar = lane.createDiv({ cls: "planning-task-bar" });
          bar.createSpan({ text: task.title });
          pos(bar, s, task.start, task.due, n);
          bar.setCssProps({ "--planning-color": color(task.area) });
          bar.onclick = () => this.edit(task, () => this.overview(e));
          const first = bar.createDiv({ cls: "planning-line-handle planning-line-start" }), last = bar.createDiv({ cls: "planning-line-handle planning-line-end" });
          this.dragTask(bar, lane, first, task, s, d, () => this.overview(e));
          this.dragTask(bar, lane, last, task, s, d, () => this.overview(e));
        }
      }
    }
  }
  season(e) {
    this.board(e, "\u0647\u0645\u0647\u0654 \u0641\u0627\u0632\u0647\u0627", this.tasks(), () => this.season(e));
  }
  nearest(e) {
    this.board(e, "\u0646\u0632\u062F\u06CC\u06A9\u200C\u062A\u0631\u06CC\u0646 \u0641\u0627\u0632\u0647\u0627", this.tasks().filter((t) => !["done", "completed"].includes(t.status)).slice(0, 8), () => this.nearest(e));
  }
  board(e, _, ts, r) {
    e.empty();
    const x = e.createDiv({ cls: "planning-shell" });
    this.controls(x, r);
    const g = x.createDiv({ cls: "planning-phase-grid" });
    for (const a of this.areaNames()) {
      const c = g.createDiv({ cls: `planning-phase-card ${tone(a)}` });
      const hd = c.createEl("button", { cls: "planning-phase-card-title", text: `${icon(a)} ${a}` });
      hd.onclick = () => new AreaModal(this.app, this, a, r).open();
      for (const t of ts.filter((x2) => x2.area === a)) {
        const row = c.createDiv({ cls: "planning-phase-row" });
        const b = row.createEl("button", { cls: "planning-phase-item", text: t.title });
        b.onclick = () => this.edit(t, r);
        const ac = row.createDiv({ cls: "planning-row-actions" });
        ac.createEl("button", { text: "\u0648\u06CC\u0631\u0627\u06CC\u0634" }).onclick = () => void this.edit(t, r);
        ac.createEl("button", { text: "\u062D\u0630\u0641", cls: "mod-warning" }).onclick = () => void this.del(t, r);
      }
    }
  }
  async edit(t, r) {
    const v = await new Editor(this.app, this, t, t ? () => this.del(t, r) : void 0).wait();
    if (!v) return;
    this.settings.deletedAreas = this.settings.deletedAreas.filter((area) => area !== v.area);
    t ? Object.assign(t, v) : this.settings.tasks.push({ ...v, id: crypto.randomUUID() });
    await this.save();
    r();
  }
  async editRoutine(area, r, barId) {
    const v = await new RoutineEditor(this.app, this, area, barId, r).wait();
    if (!v) return;
    this.settings.deletedAreas = this.settings.deletedAreas.filter((area2) => area2 !== v.area);
    const existingArea = Object.keys(this.settings.routineBars).find((key2) => this.settings.routineBars[key2].some((bar) => bar.id === v.id));
    if (existingArea && existingArea !== v.area) this.settings.routineBars[existingArea] = this.settings.routineBars[existingArea].filter((bar) => bar.id !== v.id);
    const bars = this.settings.routineBars[v.area] ??= [];
    const current = bars.find((bar) => bar.id === v.id);
    current ? Object.assign(current, v) : bars.push(v);
    this.settings.routineBars[v.area] = bars;
    await this.save();
    r();
  }
  async del(t, r) {
    if (!confirm(`\xAB${t.title}\xBB \u062D\u0630\u0641 \u0634\u0648\u062F\u061F`)) return;
    this.settings.tasks = this.settings.tasks.filter((x) => x.id !== t.id);
    await this.save();
    r();
  }
  async req(p) {
    if (!this.settings.tick.enabled || !this.settings.tick.token) throw Error("\u0627\u062A\u0635\u0627\u0644 TickTick \u0631\u0627 \u062F\u0631 \u062A\u0646\u0638\u06CC\u0645\u0627\u062A \u0641\u0639\u0627\u0644 \u06A9\u0646.");
    const x = await (0, import_obsidian.requestUrl)({ url: `https://api.ticktick.com/open/v1/${p}`, headers: { Authorization: `Bearer ${this.settings.tick.token}` } });
    if (x.status < 200 || x.status > 299) throw Error("\u062E\u0637\u0627\u06CC \u0627\u062A\u0635\u0627\u0644 TickTick");
    return x.json;
  }
  async pick() {
    const rawProjects = await this.req("project");
    if (!Array.isArray(rawProjects)) return [];
    const projects = rawProjects.filter(isRecord).map((project) => ({ id: String(project.id ?? ""), name: String(project.name ?? "\u0628\u062F\u0648\u0646 \u067E\u0631\u0648\u0698\u0647") })).filter((project) => project.id);
    const rawData = await Promise.all(projects.map((project) => this.req(`project/${project.id}/data`)));
    return rawData.flatMap((data, index) => {
      if (!isRecord(data)) return [];
      const tasks = data.tasks;
      if (!Array.isArray(tasks)) return [];
      return tasks.filter(isRecord).map((task) => {
        const value = task;
        return { id: String(value.id ?? crypto.randomUUID()), projectId: String(value.projectId ?? projects[index].id), projectName: projects[index].name, title: String(value.title ?? "\u0628\u062F\u0648\u0646 \u0639\u0646\u0648\u0627\u0646"), start: key(value.startDate) || key(value.dueDate), due: key(value.dueDate) || key(value.startDate), status: value.status === 2 ? "done" : "todo", description: String(value.desc ?? value.content ?? "") };
      });
    });
  }
  async sync(n) {
    try {
      const all = await this.pick();
      for (const t of this.settings.tasks.filter((x) => x.tickId)) {
        const a = all.find((x) => x.id === t.tickId);
        if (a) Object.assign(t, { ...a, tickId: a.id });
      }
      await this.saveData(this.settings);
      if (n) new import_obsidian.Notice("\u0632\u0645\u0627\u0646\u200C\u0628\u0646\u062F\u06CC\u200C\u0647\u0627\u06CC TickTick \u0628\u0647\u200C\u0631\u0648\u0632 \u0634\u062F.");
    } catch (e) {
      if (n) new import_obsidian.Notice(e instanceof Error ? e.message : "\u062E\u0637\u0627\u06CC \u0647\u0645\u06AF\u0627\u0645\u200C\u0633\u0627\u0632\u06CC");
    }
  }
};
var Tab = class extends import_obsidian.PluginSettingTab {
  constructor(a, p) {
    super(a, p);
    this.p = p;
  }
  display() {
    const c = this.containerEl;
    c.empty();
    new import_obsidian.Setting(c).setName("Planning Dashboard").setHeading();
    new import_obsidian.Setting(c).setName("\u0627\u062A\u0635\u0627\u0644 TickTick").setDesc("\u0628\u0631\u0627\u06CC \u0627\u0646\u062A\u062E\u0627\u0628 \u062A\u0633\u06A9 \u0648 \u0647\u0645\u06AF\u0627\u0645\u200C\u0633\u0627\u0632\u06CC \u0632\u0645\u0627\u0646\u200C\u0628\u0646\u062F\u06CC").addToggle((x) => x.setValue(this.p.settings.tick.enabled).onChange(async (v) => {
      this.p.settings.tick.enabled = v;
      await this.p.save();
      this.display();
    }));
    new import_obsidian.Setting(c).setName("API Token").addText((x) => {
      x.inputEl.type = "password";
      x.setValue(this.p.settings.tick.token).onChange(async (v) => {
        this.p.settings.tick.token = v.trim();
        await this.p.save();
      });
    });
    new import_obsidian.Setting(c).setName("\u0647\u0645\u06AF\u0627\u0645\u200C\u0633\u0627\u0632\u06CC \u062E\u0648\u062F\u06A9\u0627\u0631").addToggle((x) => x.setValue(this.p.settings.tick.auto).onChange(async (v) => {
      this.p.settings.tick.auto = v;
      await this.p.save();
    }));
    new import_obsidian.Setting(c).setName("\u0641\u0627\u0635\u0644\u0647 (\u062F\u0642\u06CC\u0642\u0647)").addText((x) => x.setValue(String(this.p.settings.tick.minutes)).onChange(async (v) => {
      this.p.settings.tick.minutes = Math.max(5, +v || 30);
      await this.p.save();
    }));
    new import_obsidian.Setting(c).setName("\u0647\u0645\u06AF\u0627\u0645\u200C\u0633\u0627\u0632\u06CC \u0627\u0644\u0622\u0646").addButton((b) => b.setButtonText("\u0647\u0645\u06AF\u0627\u0645\u200C\u0633\u0627\u0632\u06CC").onClick(() => void this.p.sync(true)));
  }
};
var AreaModal = class extends import_obsidian.Modal {
  constructor(a, p, area, r) {
    super(a);
    this.p = p;
    this.area = area;
    this.r = r;
  }
  isEditing = false;
  async onOpen() {
    this.renderContent();
  }
  async renderContent() {
    this.contentEl.empty();
    this.contentEl.createEl("h2", { text: this.area });
    if (this.isEditing) {
      const ta = this.contentEl.createEl("textarea", { cls: "planning-description-edit" });
      ta.value = this.p.settings.areaDescriptions[this.area] || "";
      ta.rows = 12;
      const container = this.contentEl.createDiv({ cls: "modal-button-container" });
      container.createEl("button", { text: "\u0627\u0646\u0635\u0631\u0627\u0641" }).onclick = () => {
        this.isEditing = false;
        this.renderContent();
      };
      container.createEl("button", { text: "\u0630\u062E\u06CC\u0631\u0647 \u062A\u0648\u0636\u06CC\u062D\u0627\u062A", cls: "mod-cta" }).onclick = async () => {
        this.p.settings.areaDescriptions[this.area] = ta.value;
        await this.p.save();
        this.r();
        this.isEditing = false;
        this.renderContent();
      };
    } else {
      const x = this.contentEl.createDiv({ cls: "planning-description" });
      await import_obsidian.MarkdownRenderer.render(this.app, this.p.settings.areaDescriptions[this.area] || "\u062A\u0648\u0636\u06CC\u062D\u06CC \u062B\u0628\u062A \u0646\u0634\u062F\u0647 \u0627\u0633\u062A.", x, "", this.p);
      new import_obsidian.Setting(this.contentEl).setName("\u0646\u0645\u0627\u06CC\u0634 \u062F\u0631 \u0646\u0642\u0634\u0647\u0654 \u0641\u0635\u0644\u06CC").setDesc("\u0645\u0634\u062E\u0635 \u0645\u06CC\u200C\u06A9\u0646\u062F \u0646\u0648\u0627\u0631 \u0647\u062F\u0641\u060C \u062A\u0633\u06A9\u200C\u0647\u0627 \u06CC\u0627 \u0647\u0631 \u062F\u0648 \u0628\u0631\u0627\u06CC \u0627\u06CC\u0646 \u062D\u0648\u0632\u0647 \u0646\u0634\u0627\u0646 \u062F\u0627\u062F\u0647 \u0634\u0648\u0646\u062F.").addDropdown((dropdown) => {
        dropdown.addOption("routine", "\u0641\u0642\u0637 \u0646\u0648\u0627\u0631");
        dropdown.addOption("tasks", "\u0641\u0642\u0637 \u062A\u0633\u06A9\u200C\u0647\u0627");
        dropdown.addOption("both", "\u0647\u0631 \u062F\u0648");
        dropdown.setValue(this.p.areaDisplayMode(this.area));
        dropdown.onChange(async (value) => {
          this.p.settings.areaDisplayModes[this.area] = value;
          await this.p.save();
          this.r();
        });
      });
      const container = this.contentEl.createDiv({ cls: "modal-button-container" });
      container.createEl("button", { text: "\u0628\u0633\u062A\u0646" }).onclick = () => this.close();
      container.createEl("button", { text: "\u0648\u06CC\u0631\u0627\u06CC\u0634 \u0645\u062A\u0646" }).onclick = () => {
        this.isEditing = true;
        this.renderContent();
      };
      container.createEl("button", { text: this.p.settings.routineSchedules[this.area] ? "\u0648\u06CC\u0631\u0627\u06CC\u0634 \u0646\u0648\u0627\u0631" : "\u0627\u0641\u0632\u0648\u062F\u0646 \u0646\u0648\u0627\u0631" }).onclick = () => void this.p.editRoutine(this.area, () => {
        this.r();
        this.close();
      });
      container.createEl("button", { text: "\u062D\u0630\u0641 \u067E\u0631\u0648\u0698\u0647", cls: "mod-warning" }).onclick = async () => {
        if (!confirm(`\u0622\u06CC\u0627 \u0627\u0632 \u062D\u0630\u0641 \u06A9\u0627\u0645\u0644 \u067E\u0631\u0648\u0698\u0647 \xAB${this.area}\xBB \u0648 \u062A\u0645\u0627\u0645 \u062A\u0633\u06A9\u200C\u0647\u0627\u06CC \u0622\u0646 \u0645\u0637\u0645\u0626\u0646 \u0647\u0633\u062A\u06CC\u062F\u061F`)) return;
        this.p.settings.tasks = this.p.settings.tasks.filter((t) => t.area !== this.area);
        delete this.p.settings.areaDescriptions[this.area];
        delete this.p.settings.routineSchedules[this.area];
        delete this.p.settings.routineBars[this.area];
        delete this.p.settings.areaDisplayModes[this.area];
        if (!this.p.settings.deletedAreas.includes(this.area)) this.p.settings.deletedAreas.push(this.area);
        await this.p.save();
        this.close();
        this.r();
      };
    }
  }
};
var Editor = class extends import_obsidian.Modal {
  constructor(a, p, init, onDelete) {
    super(a);
    this.p = p;
    this.init = init;
    this.onDelete = onDelete;
  }
  done;
  res = new Promise((r) => this.done = r);
  end = false;
  finish(v) {
    if (!this.end) {
      this.end = true;
      this.done(v);
      this.close();
    }
  }
  onOpen() {
    let z = { area: this.init?.area || F, title: this.init?.title || "", start: this.init?.start || "", due: this.init?.due || "", status: this.init?.status || "todo", description: this.init?.description || "", tickId: this.init?.tickId, projectId: this.init?.projectId }, custom = "";
    this.contentEl.createEl("h2", { text: this.init ? "\u0648\u06CC\u0631\u0627\u06CC\u0634 \u0641\u0627\u0632" : "\u0627\u0641\u0632\u0648\u062F\u0646 \u0641\u0627\u0632" });
    let ti, si, di, ta;
    new import_obsidian.Setting(this.contentEl).setName("\u0639\u0646\u0648\u0627\u0646").addText((i) => {
      ti = i.inputEl;
      i.setValue(z.title).onChange((v) => z.title = v);
    });
    new import_obsidian.Setting(this.contentEl).setName("\u062D\u0648\u0632\u0647").addDropdown((i) => {
      const as = this.p.areaNames();
      as.forEach((a2) => i.addOption(a2, a2));
      i.addOption("__new__", "\uFF0B \u062D\u0648\u0632\u0647\u0654 \u062C\u062F\u06CC\u062F");
      i.setValue(as.includes(z.area) ? z.area : "__new__");
      i.onChange((v) => {
        if (v !== "__new__") z.area = v;
        else z.area = custom;
      });
    });
    new import_obsidian.Setting(this.contentEl).setName("\u0646\u0627\u0645 \u062D\u0648\u0632\u0647\u0654 \u062C\u062F\u06CC\u062F").setDesc("\u0628\u0631\u0627\u06CC \u0633\u0627\u062E\u062A \u062D\u0648\u0632\u0647\u0654 \u062C\u062F\u06CC\u062F\u060C \u0646\u0627\u0645 \u0622\u0646 \u0631\u0627 \u0627\u06CC\u0646\u062C\u0627 \u0648\u0627\u0631\u062F \u06A9\u0646.").addText((i) => i.onChange((v) => {
      custom = v.trim();
      if (custom) z.area = custom;
    }));
    new import_obsidian.Setting(this.contentEl).setName("\u0634\u0631\u0648\u0639").addText((i) => {
      si = i.inputEl;
      i.inputEl.type = "date";
      i.setValue(z.start).onChange((v) => z.start = v);
    });
    new import_obsidian.Setting(this.contentEl).setName("\u067E\u0627\u06CC\u0627\u0646").addText((i) => {
      di = i.inputEl;
      i.inputEl.type = "date";
      i.setValue(z.due).onChange((v) => z.due = v);
    });
    new import_obsidian.Setting(this.contentEl).setName("\u062A\u0648\u0636\u06CC\u062D\u0627\u062A").addTextArea((i) => {
      ta = i.inputEl;
      i.inputEl.rows = 6;
      i.setValue(z.description || "").onChange((v) => z.description = v);
    });
    new import_obsidian.Setting(this.contentEl).setName("\u0627\u0646\u062A\u062E\u0627\u0628 \u0627\u0632 TickTick").addButton((b) => b.setButtonText("\u0627\u0646\u062A\u062E\u0627\u0628 \u062A\u0633\u06A9").onClick(async () => {
      const x = await new Picker(this.app, this.p).wait();
      if (x) {
        z = { ...z, ...x, area: z.area, tickId: x.id };
        ti.value = z.title;
        si.value = z.start;
        di.value = z.due;
        ta.value = z.description || "";
      }
    }));
    const a = this.contentEl.createDiv({ cls: "modal-button-container" });
    a.createEl("button", { text: "\u0627\u0646\u0635\u0631\u0627\u0641" }).onclick = () => this.finish(null);
    if (this.init && this.onDelete) a.createEl("button", { text: "\u062D\u0630\u0641", cls: "mod-warning" }).onclick = () => {
      this.end = true;
      this.done(null);
      this.close();
      this.onDelete?.();
    };
    a.createEl("button", { text: "\u0630\u062E\u06CC\u0631\u0647", cls: "mod-cta" }).onclick = () => {
      if (!z.title || !z.area || !date(z.start) || !date(z.due) || z.due < z.start) return new import_obsidian.Notice("\u0639\u0646\u0648\u0627\u0646\u060C \u062D\u0648\u0632\u0647 \u0648 \u062A\u0627\u0631\u06CC\u062E \u0645\u0639\u062A\u0628\u0631 \u0648\u0627\u0631\u062F \u06A9\u0646.");
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
};
var RoutineEditor = class extends import_obsidian.Modal {
  constructor(a, p, initialArea, barId, refresh) {
    super(a);
    this.p = p;
    this.initialArea = initialArea;
    this.barId = barId;
    this.refresh = refresh;
  }
  done;
  res = new Promise((r) => this.done = r);
  end = false;
  finish(v) {
    if (!this.end) {
      this.end = true;
      this.done(v);
      this.close();
    }
  }
  onOpen() {
    const original = this.initialArea && this.barId ? this.p.settings.routineBars[this.initialArea]?.find((bar) => bar.id === this.barId) : void 0;
    let selected = this.initialArea || R[0], custom = "", title = original?.title || "", start = original?.start || "", due = original?.due || "";
    this.contentEl.createEl("h2", { text: original ? "\u0648\u06CC\u0631\u0627\u06CC\u0634 \u0646\u0648\u0627\u0631 \u062D\u0648\u0632\u0647" : "\u0627\u0641\u0632\u0648\u062F\u0646 \u0646\u0648\u0627\u0631 \u062D\u0648\u0632\u0647" });
    new import_obsidian.Setting(this.contentEl).setName("\u062D\u0648\u0632\u0647").addDropdown((i) => {
      const names = this.p.areaNames();
      names.forEach((name) => i.addOption(name, name));
      i.addOption("__new__", "\uFF0B \u062D\u0648\u0632\u0647\u0654 \u062C\u062F\u06CC\u062F");
      i.setValue(names.includes(selected) ? selected : "__new__");
      i.onChange((value) => {
        selected = value === "__new__" ? custom : value;
      });
    });
    new import_obsidian.Setting(this.contentEl).setName("\u0646\u0627\u0645 \u062D\u0648\u0632\u0647\u0654 \u062C\u062F\u06CC\u062F").setDesc("\u0646\u0648\u0627\u0631 \u0628\u0631\u0627\u06CC \u0627\u06CC\u0646 \u062D\u0648\u0632\u0647 \u0628\u0647 \u0647\u0645\u0647\u0654 \u0641\u0635\u0644\u200C\u0647\u0627 \u0627\u0636\u0627\u0641\u0647 \u0645\u06CC\u200C\u0634\u0648\u062F.").addText((i) => i.onChange((value) => {
      custom = value.trim();
      if (custom) selected = custom;
    }));
    new import_obsidian.Setting(this.contentEl).setName("\u0639\u0646\u0648\u0627\u0646 \u0646\u0648\u0627\u0631").setDesc("\u0627\u062E\u062A\u06CC\u0627\u0631\u06CC\u061B \u0628\u0631\u0627\u06CC \u062A\u0634\u062E\u06CC\u0635 \u0646\u0648\u0627\u0631\u0647\u0627\u06CC \u06CC\u06A9 \u062D\u0648\u0632\u0647 \u0627\u0633\u062A\u0641\u0627\u062F\u0647 \u0645\u06CC\u200C\u0634\u0648\u062F.").addText((i) => i.setValue(title).onChange((value) => title = value.trim()));
    new import_obsidian.Setting(this.contentEl).setName("\u0634\u0631\u0648\u0639 \u0646\u0648\u0627\u0631").addText((i) => {
      i.inputEl.type = "date";
      i.setValue(start).onChange((value) => start = value);
    });
    new import_obsidian.Setting(this.contentEl).setName("\u067E\u0627\u06CC\u0627\u0646 \u0646\u0648\u0627\u0631").addText((i) => {
      i.inputEl.type = "date";
      i.setValue(due).onChange((value) => due = value);
    });
    const actions = this.contentEl.createDiv({ cls: "modal-button-container" });
    actions.createEl("button", { text: "\u0627\u0646\u0635\u0631\u0627\u0641" }).onclick = () => this.finish(null);
    if (original) actions.createEl("button", { text: "\u062D\u0630\u0641 \u0646\u0648\u0627\u0631", cls: "mod-warning" }).onclick = async () => {
      this.p.settings.routineBars[this.initialArea] = this.p.settings.routineBars[this.initialArea].filter((bar) => bar.id !== original.id);
      await this.p.save();
      this.refresh?.();
      this.end = true;
      this.done(null);
      this.close();
    };
    actions.createEl("button", { text: "\u0630\u062E\u06CC\u0631\u0647", cls: "mod-cta" }).onclick = () => {
      if (!selected || !date(start) || !date(due) || due < start) return new import_obsidian.Notice("\u062D\u0648\u0632\u0647 \u0648 \u0628\u0627\u0632\u0647\u0654 \u0632\u0645\u0627\u0646\u06CC \u0645\u0639\u062A\u0628\u0631 \u0648\u0627\u0631\u062F \u06A9\u0646.");
      this.finish({ id: original?.id || crypto.randomUUID(), area: selected, title, start, due });
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
};
var Picker = class extends import_obsidian.Modal {
  constructor(a, p) {
    super(a);
    this.p = p;
  }
  done;
  res = new Promise((r) => this.done = r);
  end = false;
  finish(v) {
    if (!this.end) {
      this.end = true;
      this.done(v);
      this.close();
    }
  }
  async onOpen() {
    this.contentEl.createEl("h2", { text: "\u0627\u0646\u062A\u062E\u0627\u0628 \u062A\u0633\u06A9 TickTick" });
    this.contentEl.addClass("planning-picker-modal");
    try {
      const tasks = await this.p.pick();
      const byProject = tasks.reduce((acc, t) => {
        const pName = t.projectName || "\u0628\u062F\u0648\u0646 \u067E\u0631\u0648\u0698\u0647";
        if (!acc[pName]) acc[pName] = [];
        acc[pName].push(t);
        return acc;
      }, {});
      const container = this.contentEl.createDiv({ cls: "planning-picker-container" });
      for (const [pName, pTasks] of Object.entries(byProject)) {
        const group = container.createDiv({ cls: "planning-picker-group" });
        group.createEl("h3", { text: pName, cls: "planning-picker-group-title" });
        const list = group.createDiv({ cls: "planning-picker-list" });
        for (const t of pTasks) {
          const btn = list.createEl("button", { cls: "planning-picker-item" });
          btn.createDiv({ cls: "planning-picker-item-title", text: t.title });
          if (t.start || t.due) btn.createDiv({ cls: "planning-picker-item-date", text: `${fmt(t.start)} \u2014 ${fmt(t.due)}` });
          btn.onclick = () => this.finish(t);
        }
      }
    } catch (e) {
      this.contentEl.createEl("p", { text: e instanceof Error ? e.message : "\u062E\u0637\u0627" });
    }
  }
  onClose() {
    this.contentEl.empty();
    if (!this.end) this.finish(null);
  }
  wait() {
    this.open();
    return this.res;
  }
};
var date = (x) => /^\d{4}-\d{2}-\d{2}$/.test(x);
var key = (x) => date(String(x).slice(0, 10)) ? String(x).slice(0, 10) : "";
var diff = (a, b) => Math.round((Date.parse(b + "T12:00Z") - Date.parse(a + "T12:00Z")) / 864e5);
var shift = (a, n) => new Date(Date.parse(a + "T12:00Z") + n * 864e5).toISOString().slice(0, 10);
var pos = (e, s, a, b, n) => {
  const o = Math.max(0, diff(s, a)), d = Math.min(n - o, Math.max(1, diff(a, b) + 1));
  e.setCssProps({ right: `${o / n * 100}%`, width: `${Math.max(1.2, d / n * 100)}%` });
};
var fmt = (x) => date(x) ? new Intl.DateTimeFormat("fa-IR-u-ca-persian", { month: "numeric", day: "numeric" }).format(/* @__PURE__ */ new Date(x + "T12:00")) : "\u2014";
var areas = (x, routineAreas = []) => {
  const fixed = [...R, F], custom = [.../* @__PURE__ */ new Set([...x.map((t) => t.area), ...routineAreas])].filter((area) => !fixed.includes(area)).sort((a, b) => a.localeCompare(b, "fa"));
  return [...fixed, ...custom];
};
var months = (s, d) => {
  const f = new Intl.DateTimeFormat("fa-IR-u-ca-persian", { month: "long" }), o = [];
  for (let x = s; x <= d; x = new Date(Date.parse(x + "T12:00Z") + 864e5).toISOString().slice(0, 10)) {
    const l = f.format(/* @__PURE__ */ new Date(x + "T12:00Z")), q = o.at(-1);
    q?.l === l ? q.n++ : o.push({ l, n: 1 });
  }
  return o;
};
var color = (a) => ({ "\u0628\u0647\u0628\u0648\u062F \u0641\u0631\u062F\u06CC": "#10b981", "\u0632\u0628\u0627\u0646 \u0622\u0644\u0645\u0627\u0646\u06CC": "#f59e0b", "\u06A9\u0627\u062A\u0644\u06CC\u0646 \u0648 \u0627\u0646\u062F\u0631\u0648\u06CC\u062F": "#3b82f6" })[a] || "#8b5cf6";
var tone = (a) => ({ "\u0628\u0647\u0628\u0648\u062F \u0641\u0631\u062F\u06CC": "personal", "\u0632\u0628\u0627\u0646 \u0622\u0644\u0645\u0627\u0646\u06CC": "language", "\u06A9\u0627\u062A\u0644\u06CC\u0646 \u0648 \u0627\u0646\u062F\u0631\u0648\u06CC\u062F": "kotlin", "\u0641\u06CC\u0646\u200C\u062A\u0631\u06A9 \u0648 \u0634\u0627\u067E": "fintrack" })[a] || "personal";
var icon = (a) => ({ "\u0628\u0647\u0628\u0648\u062F \u0641\u0631\u062F\u06CC": "\u{1F331}", "\u0632\u0628\u0627\u0646 \u0622\u0644\u0645\u0627\u0646\u06CC": "\u{1F1E9}\u{1F1EA}", "\u06A9\u0627\u062A\u0644\u06CC\u0646 \u0648 \u0627\u0646\u062F\u0631\u0648\u06CC\u062F": "\u{1F9E9}", "\u0641\u06CC\u0646\u200C\u062A\u0631\u06A9 \u0648 \u0634\u0627\u067E": "\u{1F6E0}\uFE0F" })[a] || "\u{1F4C1}";
