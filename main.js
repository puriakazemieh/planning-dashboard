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
  async onOpen() {
    this.modalEl.addClass("planning-modal", "planning-area-modal");
    this.contentEl.empty();
    this.contentEl.addClass("planning-modal-inner");
    let currentText = this.p.settings.areaDescriptions[this.area] || "";
    let isEditing = false;
    const header = this.contentEl.createDiv({ cls: "planning-modal-header" });
    const titleWrap = header.createDiv({ cls: "planning-modal-title-wrap" });
    const iconEl = titleWrap.createSpan({ cls: "planning-area-icon" });
    iconEl.setText(icon(this.area));
    iconEl.style.setProperty("--area-color", color(this.area));
    titleWrap.createEl("h2", { text: this.area, cls: "planning-modal-title" });
    const modeWrap = header.createDiv({ cls: "planning-area-mode-wrap" });
    modeWrap.createEl("span", { text: "\u0646\u0645\u0627\u06CC\u0634 \u062F\u0631 \u0646\u0642\u0634\u0647:", cls: "planning-mode-label" });
    const modeDropdown = new import_obsidian.DropdownComponent(modeWrap);
    modeDropdown.addOption("routine", "\u0641\u0642\u0637 \u0646\u0648\u0627\u0631 \u0647\u062F\u0641");
    modeDropdown.addOption("tasks", "\u0641\u0642\u0637 \u062A\u0633\u06A9\u200C\u0647\u0627");
    modeDropdown.addOption("both", "\u0647\u0631 \u062F\u0648 (\u0646\u0648\u0627\u0631 + \u062A\u0633\u06A9)");
    modeDropdown.setValue(this.p.areaDisplayMode(this.area));
    modeDropdown.selectEl.addClass("planning-select", "planning-select-sm");
    modeDropdown.onChange(async (value) => {
      this.p.settings.areaDisplayModes[this.area] = value;
      await this.p.save();
      this.r();
    });
    const body = this.contentEl.createDiv({ cls: "planning-modal-body" });
    const descSection = body.createDiv({ cls: "planning-desc-section" });
    const descHeader = descSection.createDiv({ cls: "planning-desc-header" });
    descHeader.createEl("span", { text: "\u06CC\u0627\u062F\u062F\u0627\u0634\u062A\u200C\u0647\u0627 \u0648 \u0631\u0627\u0647\u0646\u0645\u0627\u06CC \u062D\u0648\u0632\u0647 (Markdown)", cls: "planning-form-label" });
    const tabsWrap = descHeader.createDiv({ cls: "planning-desc-tabs" });
    const previewTabBtn = tabsWrap.createEl("button", {
      cls: "planning-tab-btn is-active",
      text: "\u{1F441}\uFE0F \u0645\u0634\u0627\u0647\u062F\u0647 \u0645\u062A\u0646"
    });
    const editTabBtn = tabsWrap.createEl("button", {
      cls: "planning-tab-btn",
      text: "\u270F\uFE0F \u0648\u06CC\u0631\u0627\u06CC\u0634 \u0645\u062A\u0646"
    });
    const descContainer = descSection.createDiv({ cls: "planning-desc-container" });
    const previewEl = descContainer.createDiv({ cls: "planning-desc-preview planning-area-view-card" });
    const textareaEl = descContainer.createEl("textarea", {
      cls: "planning-desc-textarea planning-area-textarea is-hidden",
      placeholder: "\u06CC\u0627\u062F\u062F\u0627\u0634\u062A\u200C\u0647\u0627 \u0648 \u0631\u0627\u0647\u0646\u0645\u0627\u06CC \u0627\u06CC\u0646 \u062D\u0648\u0632\u0647 \u0631\u0627 \u0628\u0647 \u0632\u0628\u0627\u0646 \u0645\u0627\u0631\u06A9\u200C\u062F\u0627\u0648\u0646 \u0648\u0627\u0631\u062F \u06A9\u0646\u06CC\u062F..."
    });
    textareaEl.value = currentText;
    const renderPreview = async () => {
      previewEl.empty();
      const textToRender = currentText.trim() || "*\u0647\u0646\u0648\u0632 \u062A\u0648\u0636\u06CC\u062D\u06CC \u0628\u0631\u0627\u06CC \u0627\u06CC\u0646 \u062D\u0648\u0632\u0647 \u062B\u0628\u062A \u0646\u0634\u062F\u0647 \u0627\u0633\u062A. \u0628\u0631\u0627\u06CC \u0627\u0641\u0632\u0648\u062F\u0646 \u0631\u0627\u0647\u0646\u0645\u0627 \u0648 \u06CC\u0627\u062F\u062F\u0627\u0634\u062A\u200C\u0647\u0627\u060C \u0631\u0648\u06CC \xAB\u0648\u06CC\u0631\u0627\u06CC\u0634 \u0645\u062A\u0646\xBB \u062F\u0631 \u0628\u0627\u0644\u0627 \u06A9\u0644\u06CC\u06A9 \u06A9\u0646\u06CC\u062F.*";
      await import_obsidian.MarkdownRenderer.render(this.app, textToRender, previewEl, "", this.p);
    };
    void renderPreview();
    const footer = this.contentEl.createDiv({ cls: "planning-modal-footer" });
    const footerLeft = footer.createDiv({ cls: "planning-footer-left" });
    const delBtn = footerLeft.createEl("button", { cls: "planning-btn-danger", text: "\u{1F5D1}\uFE0F \u062D\u0630\u0641 \u067E\u0631\u0648\u0698\u0647" });
    delBtn.onclick = async () => {
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
    const footerRight = footer.createDiv({ cls: "planning-footer-right" });
    const hasBars = (this.p.settings.routineBars[this.area]?.length ?? 0) > 0 || !!this.p.settings.routineSchedules[this.area];
    const routineBtn = footerRight.createEl("button", {
      cls: "planning-btn-secondary",
      text: hasBars ? "\u{1F4C5} \u0648\u06CC\u0631\u0627\u06CC\u0634 \u0646\u0648\u0627\u0631 \u062D\u0648\u0632\u0647" : "+ \u0627\u0641\u0632\u0648\u062F\u0646 \u0646\u0648\u0627\u0631 \u062D\u0648\u0632\u0647"
    });
    routineBtn.onclick = () => {
      this.close();
      void this.p.editRoutine(this.area, () => this.r());
    };
    const toggleEditBtn = footerRight.createEl("button", { cls: "planning-btn-secondary", text: "\u270F\uFE0F \u0648\u06CC\u0631\u0627\u06CC\u0634 \u0645\u062A\u0646" });
    const cancelEditBtn = footerRight.createEl("button", { cls: "planning-btn-secondary is-hidden", text: "\u0627\u0646\u0635\u0631\u0627\u0641" });
    const saveDescBtn = footerRight.createEl("button", { cls: "planning-btn-primary mod-cta is-hidden", text: "\u{1F4BE} \u0630\u062E\u06CC\u0631\u0647 \u062A\u0648\u0636\u06CC\u062D\u0627\u062A" });
    const closeBtn = footerRight.createEl("button", { cls: "planning-btn-primary mod-cta", text: "\u0628\u0633\u062A\u0646" });
    closeBtn.onclick = () => this.close();
    const updateViewMode = (editing) => {
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
      new import_obsidian.Notice("\u062A\u0648\u0636\u06CC\u062D\u0627\u062A \u0628\u0627 \u0645\u0648\u0641\u0642\u06CC\u062A \u0630\u062E\u06CC\u0631\u0647 \u0634\u062F.");
      updateViewMode(false);
    };
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
    this.modalEl.addClass("planning-modal", "planning-editor-modal");
    this.contentEl.empty();
    this.contentEl.addClass("planning-modal-inner");
    let z = {
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
    const header = this.contentEl.createDiv({ cls: "planning-modal-header" });
    const headerTitleWrap = header.createDiv({ cls: "planning-modal-title-wrap" });
    headerTitleWrap.createEl("h2", {
      text: this.init ? "\u0648\u06CC\u0631\u0627\u06CC\u0634 \u0641\u0627\u0632" : "\u0627\u0641\u0632\u0648\u062F\u0646 \u0641\u0627\u0632 \u062C\u062F\u06CC\u062F",
      cls: "planning-modal-title"
    });
    if (this.init) {
      const badge = headerTitleWrap.createSpan({ cls: "planning-modal-badge" });
      badge.setText(`${icon(z.area)} ${z.area}`);
      badge.style.setProperty("--badge-color", color(z.area));
    }
    const tickBtn = header.createEl("button", {
      cls: "planning-btn-secondary planning-tick-btn",
      text: "\u{1F504} \u0627\u0646\u062A\u062E\u0627\u0628 \u0627\u0632 TickTick"
    });
    const body = this.contentEl.createDiv({ cls: "planning-modal-body" });
    const form = body.createDiv({ cls: "planning-form" });
    const titleGroup = form.createDiv({ cls: "planning-form-group" });
    titleGroup.createEl("label", { text: "\u0639\u0646\u0648\u0627\u0646 \u0641\u0627\u0632 \u06CC\u0627 \u062A\u0633\u06A9", cls: "planning-form-label" });
    const titleInput = titleGroup.createEl("input", {
      type: "text",
      cls: "planning-input planning-input-lg",
      placeholder: "\u0645\u062B\u0627\u0644: \u0633\u0637\u062D \u06F7: \u0632\u0646\u062F\u06AF\u06CC \u0628\u0647 \u0632\u0628\u0627\u0646 \u0622\u0644\u0645\u0627\u0646\u06CC"
    });
    titleInput.value = z.title;
    titleInput.oninput = () => {
      z.title = titleInput.value;
    };
    const areaRow = form.createDiv({ cls: "planning-form-row" });
    const areaGroup = areaRow.createDiv({ cls: "planning-form-group" });
    areaGroup.createEl("label", { text: "\u062D\u0648\u0632\u0647\u0654 \u067E\u0631\u0648\u0698\u0647", cls: "planning-form-label" });
    const areaDropdown = new import_obsidian.DropdownComponent(areaGroup);
    const as = this.p.areaNames();
    as.forEach((a) => areaDropdown.addOption(a, a));
    areaDropdown.addOption("__new__", "\uFF0B \u0633\u0627\u062E\u062A \u062D\u0648\u0632\u0647\u0654 \u062C\u062F\u06CC\u062F");
    areaDropdown.setValue(as.includes(z.area) ? z.area : "__new__");
    areaDropdown.selectEl.addClass("planning-select");
    const newAreaGroup = areaRow.createDiv({ cls: "planning-form-group planning-new-area-group" });
    newAreaGroup.createEl("label", { text: "\u0646\u0627\u0645 \u062D\u0648\u0632\u0647\u0654 \u062C\u062F\u06CC\u062F", cls: "planning-form-label" });
    const newAreaInput = newAreaGroup.createEl("input", {
      type: "text",
      cls: "planning-input",
      placeholder: "\u0646\u0627\u0645 \u062D\u0648\u0632\u0647\u0654 \u062C\u062F\u06CC\u062F \u0631\u0627 \u0648\u0627\u0631\u062F \u06A9\u0646\u06CC\u062F..."
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
    areaDropdown.onChange((val) => {
      updateNewAreaVisibility();
      if (val !== "__new__") {
        z.area = val;
      } else {
        if (customArea) z.area = customArea;
      }
    });
    const datesRow = form.createDiv({ cls: "planning-form-row planning-form-row-2" });
    const startGroup = datesRow.createDiv({ cls: "planning-form-group" });
    startGroup.createEl("label", { text: "\u062A\u0627\u0631\u06CC\u062E \u0634\u0631\u0648\u0639", cls: "planning-form-label" });
    const startInput = startGroup.createEl("input", {
      type: "date",
      cls: "planning-input planning-date-input"
    });
    startInput.value = z.start;
    startInput.onchange = () => {
      z.start = startInput.value;
    };
    const dueGroup = datesRow.createDiv({ cls: "planning-form-group" });
    dueGroup.createEl("label", { text: "\u062A\u0627\u0631\u06CC\u062E \u067E\u0627\u06CC\u0627\u0646", cls: "planning-form-label" });
    const dueInput = dueGroup.createEl("input", {
      type: "date",
      cls: "planning-input planning-date-input"
    });
    dueInput.value = z.due;
    dueInput.onchange = () => {
      z.due = dueInput.value;
    };
    const descSection = form.createDiv({ cls: "planning-form-group planning-desc-section" });
    const descHeader = descSection.createDiv({ cls: "planning-desc-header" });
    const descHeaderLeft = descHeader.createDiv({ cls: "planning-desc-header-info" });
    descHeaderLeft.createEl("label", {
      text: "\u062A\u0648\u0636\u06CC\u062D\u0627\u062A \u0648 \u0645\u0633\u062A\u0646\u062F\u0627\u062A (\u067E\u0634\u062A\u06CC\u0628\u0627\u0646\u06CC \u06A9\u0627\u0645\u0644 \u0627\u0632 Markdown)",
      cls: "planning-form-label"
    });
    const tabsWrap = descHeader.createDiv({ cls: "planning-desc-tabs" });
    const previewTabBtn = tabsWrap.createEl("button", {
      cls: "planning-tab-btn",
      text: "\u{1F441}\uFE0F \u067E\u06CC\u0634\u200C\u0646\u0645\u0627\u06CC\u0634"
    });
    const editTabBtn = tabsWrap.createEl("button", {
      cls: "planning-tab-btn",
      text: "\u270F\uFE0F \u0648\u06CC\u0631\u0627\u06CC\u0634 \u0645\u062A\u0646"
    });
    const descBody = descSection.createDiv({ cls: "planning-desc-container" });
    const previewEl = descBody.createDiv({ cls: "planning-desc-preview" });
    const descTextarea = descBody.createEl("textarea", {
      cls: "planning-desc-textarea",
      placeholder: "\u062A\u0648\u0636\u06CC\u062D\u0627\u062A \u0648 \u0627\u0647\u062F\u0627\u0641 \u0627\u06CC\u0646 \u0641\u0627\u0632 \u0631\u0627 \u0628\u0647 \u0632\u0628\u0627\u0646 \u0645\u0627\u0631\u06A9\u200C\u062F\u0627\u0648\u0646 \u0628\u0646\u0648\u06CC\u0633\u06CC\u062F...\n\u0645\u062B\u0627\u0644:\n## \u0647\u062F\u0641\n\u062A\u0648\u0636\u06CC\u062D \u0647\u062F\u0641...\n## \u0645\u0639\u06CC\u0627\u0631\u0647\u0627\u06CC \u0627\u0635\u0644\u06CC\n- [ ] \u0686\u06A9\u200C\u0644\u06CC\u0633\u062A \u06F1\n- [ ] \u0686\u06A9\u200C\u0644\u06CC\u0633\u062A \u06F2"
    });
    descTextarea.value = z.description || "";
    descTextarea.oninput = () => {
      z.description = descTextarea.value;
    };
    const renderPreview = async () => {
      previewEl.empty();
      const content = z.description?.trim() || "*\u0647\u0646\u0648\u0632 \u062A\u0648\u0636\u06CC\u062D\u06CC \u0628\u0631\u0627\u06CC \u0627\u06CC\u0646 \u0641\u0627\u0632 \u062B\u0628\u062A \u0646\u0634\u062F\u0647 \u0627\u0633\u062A. \u0628\u0631\u0627\u06CC \u0646\u0648\u0634\u062A\u0646\u060C \u0631\u0648\u06CC \u062F\u06A9\u0645\u0647 \xAB\u0648\u06CC\u0631\u0627\u06CC\u0634 \u0645\u062A\u0646\xBB \u062F\u0631 \u0628\u0627\u0644\u0627 \u06A9\u0644\u06CC\u06A9 \u06A9\u0646\u06CC\u062F.*";
      await import_obsidian.MarkdownRenderer.render(this.app, content, previewEl, "", this.p);
    };
    const setTab = (tab) => {
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
    previewTabBtn.onclick = (e) => {
      e.preventDefault();
      setTab("preview");
    };
    editTabBtn.onclick = (e) => {
      e.preventDefault();
      setTab("edit");
    };
    const initialTab = z.description?.trim() ? "preview" : "edit";
    setTab(initialTab);
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
    const footer = this.contentEl.createDiv({ cls: "planning-modal-footer" });
    const footerLeft = footer.createDiv({ cls: "planning-footer-left" });
    if (this.init && this.onDelete) {
      const delBtn = footerLeft.createEl("button", {
        cls: "planning-btn-danger",
        text: "\u{1F5D1}\uFE0F \u062D\u0630\u0641 \u0641\u0627\u0632"
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
      text: "\u0627\u0646\u0635\u0631\u0627\u0641"
    });
    cancelBtn.onclick = () => this.finish(null);
    const saveBtn = footerRight.createEl("button", {
      cls: "planning-btn-primary mod-cta",
      text: "\u0630\u062E\u06CC\u0631\u0647 \u0641\u0627\u0632"
    });
    saveBtn.onclick = () => {
      z.description = descTextarea.value;
      if (!z.title.trim()) return new import_obsidian.Notice("\u0639\u0646\u0648\u0627\u0646 \u0641\u0627\u0632 \u0631\u0627 \u0648\u0627\u0631\u062F \u06A9\u0646.");
      if (!z.area.trim()) return new import_obsidian.Notice("\u062D\u0648\u0632\u0647 \u0641\u0627\u0632 \u0631\u0627 \u0627\u0646\u062A\u062E\u0627\u0628 \u06A9\u0646.");
      if (!date(z.start) || !date(z.due) || z.due < z.start) {
        return new import_obsidian.Notice("\u062A\u0627\u0631\u06CC\u062E\u200C\u0647\u0627\u06CC \u0645\u0639\u062A\u0628\u0631 \u0648\u0627\u0631\u062F \u06A9\u0646 (\u067E\u0627\u06CC\u0627\u0646 \u0646\u0628\u0627\u06CC\u062F \u0642\u0628\u0644 \u0627\u0632 \u0634\u0631\u0648\u0639 \u0628\u0627\u0634\u062F).");
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
    this.modalEl.addClass("planning-modal", "planning-routine-modal");
    this.contentEl.empty();
    this.contentEl.addClass("planning-modal-inner");
    const original = this.initialArea && this.barId ? this.p.settings.routineBars[this.initialArea]?.find((bar) => bar.id === this.barId) : void 0;
    let selected = this.initialArea || R[0];
    let customArea = "";
    let title = original?.title || "";
    let start = original?.start || "";
    let due = original?.due || "";
    const header = this.contentEl.createDiv({ cls: "planning-modal-header" });
    header.createDiv({ cls: "planning-modal-title-wrap" }).createEl("h2", {
      text: original ? "\u0648\u06CC\u0631\u0627\u06CC\u0634 \u0646\u0648\u0627\u0631 \u062D\u0648\u0632\u0647" : "\u0627\u0641\u0632\u0648\u062F\u0646 \u0646\u0648\u0627\u0631 \u062D\u0648\u0632\u0647",
      cls: "planning-modal-title"
    });
    const body = this.contentEl.createDiv({ cls: "planning-modal-body" });
    const form = body.createDiv({ cls: "planning-form" });
    const areaRow = form.createDiv({ cls: "planning-form-row" });
    const areaGroup = areaRow.createDiv({ cls: "planning-form-group" });
    areaGroup.createEl("label", { text: "\u062D\u0648\u0632\u0647\u0654 \u067E\u0631\u0648\u0698\u0647", cls: "planning-form-label" });
    const areaDropdown = new import_obsidian.DropdownComponent(areaGroup);
    const names = this.p.areaNames();
    names.forEach((name) => areaDropdown.addOption(name, name));
    areaDropdown.addOption("__new__", "\uFF0B \u0633\u0627\u062E\u062A \u062D\u0648\u0632\u0647\u0654 \u062C\u062F\u06CC\u062F");
    areaDropdown.setValue(names.includes(selected) ? selected : "__new__");
    areaDropdown.selectEl.addClass("planning-select");
    const newAreaGroup = areaRow.createDiv({ cls: "planning-form-group planning-new-area-group" });
    newAreaGroup.createEl("label", { text: "\u0646\u0627\u0645 \u062D\u0648\u0632\u0647\u0654 \u062C\u062F\u06CC\u062F", cls: "planning-form-label" });
    const newAreaInput = newAreaGroup.createEl("input", {
      type: "text",
      cls: "planning-input",
      placeholder: "\u0646\u0627\u0645 \u062D\u0648\u0632\u0647\u0654 \u062C\u062F\u06CC\u062F..."
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
    areaDropdown.onChange((val) => {
      updateVisibility();
      selected = val === "__new__" ? customArea : val;
    });
    const titleGroup = form.createDiv({ cls: "planning-form-group" });
    titleGroup.createEl("label", { text: "\u0639\u0646\u0648\u0627\u0646 \u0646\u0648\u0627\u0631 (\u0627\u062E\u062A\u06CC\u0627\u0631\u06CC)", cls: "planning-form-label" });
    const titleInput = titleGroup.createEl("input", {
      type: "text",
      cls: "planning-input",
      placeholder: "\u0627\u062E\u062A\u06CC\u0627\u0631\u06CC\u061B \u0628\u0631\u0627\u06CC \u062A\u0634\u062E\u06CC\u0635 \u0646\u0648\u0627\u0631\u0647\u0627\u06CC \u06CC\u06A9 \u062D\u0648\u0632\u0647 \u0627\u0633\u062A\u0641\u0627\u062F\u0647 \u0645\u06CC\u200C\u0634\u0648\u062F."
    });
    titleInput.value = title;
    titleInput.oninput = () => {
      title = titleInput.value.trim();
    };
    const datesRow = form.createDiv({ cls: "planning-form-row planning-form-row-2" });
    const startGroup = datesRow.createDiv({ cls: "planning-form-group" });
    startGroup.createEl("label", { text: "\u0634\u0631\u0648\u0639 \u0646\u0648\u0627\u0631", cls: "planning-form-label" });
    const startInput = startGroup.createEl("input", {
      type: "date",
      cls: "planning-input planning-date-input"
    });
    startInput.value = start;
    startInput.onchange = () => {
      start = startInput.value;
    };
    const dueGroup = datesRow.createDiv({ cls: "planning-form-group" });
    dueGroup.createEl("label", { text: "\u067E\u0627\u06CC\u0627\u0646 \u0646\u0648\u0627\u0631", cls: "planning-form-label" });
    const dueInput = dueGroup.createEl("input", {
      type: "date",
      cls: "planning-input planning-date-input"
    });
    dueInput.value = due;
    dueInput.onchange = () => {
      due = dueInput.value;
    };
    const footer = this.contentEl.createDiv({ cls: "planning-modal-footer" });
    const footerLeft = footer.createDiv({ cls: "planning-footer-left" });
    if (original) {
      const delBtn = footerLeft.createEl("button", {
        cls: "planning-btn-danger",
        text: "\u{1F5D1}\uFE0F \u062D\u0630\u0641 \u0646\u0648\u0627\u0631"
      });
      delBtn.onclick = async () => {
        if (!confirm("\u0622\u06CC\u0627 \u0627\u0632 \u062D\u0630\u0641 \u0627\u06CC\u0646 \u0646\u0648\u0627\u0631 \u0627\u0637\u0645\u06CC\u0646\u0627\u0646 \u062F\u0627\u0631\u06CC\u062F\u061F")) return;
        this.p.settings.routineBars[this.initialArea] = this.p.settings.routineBars[this.initialArea].filter((bar) => bar.id !== original.id);
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
      text: "\u0627\u0646\u0635\u0631\u0627\u0641"
    });
    cancelBtn.onclick = () => this.finish(null);
    const saveBtn = footerRight.createEl("button", {
      cls: "planning-btn-primary mod-cta",
      text: "\u0630\u062E\u06CC\u0631\u0647 \u0646\u0648\u0627\u0631"
    });
    saveBtn.onclick = () => {
      if (!selected || !date(start) || !date(due) || due < start) {
        return new import_obsidian.Notice("\u062D\u0648\u0632\u0647 \u0648 \u0628\u0627\u0632\u0647\u0654 \u0632\u0645\u0627\u0646\u06CC \u0645\u0639\u062A\u0628\u0631 \u0648\u0627\u0631\u062F \u06A9\u0646.");
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
    this.modalEl.addClass("planning-modal", "planning-picker-modal");
    this.contentEl.empty();
    this.contentEl.addClass("planning-modal-inner");
    const header = this.contentEl.createDiv({ cls: "planning-modal-header" });
    header.createDiv({ cls: "planning-modal-title-wrap" }).createEl("h2", {
      text: "\u0627\u0646\u062A\u062E\u0627\u0628 \u062A\u0633\u06A9 \u0627\u0632 TickTick",
      cls: "planning-modal-title"
    });
    const body = this.contentEl.createDiv({ cls: "planning-modal-body planning-picker-body" });
    try {
      const tasks = await this.p.pick();
      const byProject = tasks.reduce((acc, t) => {
        const pName = t.projectName || "\u0628\u062F\u0648\u0646 \u067E\u0631\u0648\u0698\u0647";
        if (!acc[pName]) acc[pName] = [];
        acc[pName].push(t);
        return acc;
      }, {});
      const container = body.createDiv({ cls: "planning-picker-container" });
      for (const [pName, pTasks] of Object.entries(byProject)) {
        const group = container.createDiv({ cls: "planning-picker-group" });
        group.createEl("h3", { text: pName, cls: "planning-picker-group-title" });
        const list = group.createDiv({ cls: "planning-picker-list" });
        for (const t of pTasks) {
          const btn = list.createEl("button", { cls: "planning-picker-item" });
          btn.createDiv({ cls: "planning-picker-item-title", text: t.title });
          if (t.start || t.due) {
            btn.createDiv({ cls: "planning-picker-item-date", text: `${fmt(t.start)} \u2014 ${fmt(t.due)}` });
          }
          btn.onclick = () => this.finish(t);
        }
      }
    } catch (e) {
      body.createEl("p", {
        cls: "planning-error-text",
        text: e instanceof Error ? e.message : "\u062E\u0637\u0627 \u062F\u0631 \u0627\u062A\u0635\u0627\u0644 \u0628\u0647 TickTick"
      });
    }
    const footer = this.contentEl.createDiv({ cls: "planning-modal-footer" });
    const footerRight = footer.createDiv({ cls: "planning-footer-right" });
    const closeBtn = footerRight.createEl("button", {
      cls: "planning-btn-secondary",
      text: "\u0628\u0633\u062A\u0646"
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
