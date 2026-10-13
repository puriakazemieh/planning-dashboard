# Planning Dashboard

Planning Dashboard is an Obsidian plugin for creating editable project phases,
seasonal timelines, and planning boards directly in a vault. It can optionally
read schedules from TickTick using a user-provided API token stored in Obsidian's
plugin settings.

## Installation

1. Download `main.js`, `manifest.json`, and `styles.css` from the latest GitHub
   release.
2. Create `.obsidian/plugins/planning-dashboard` in your vault.
3. Copy the three downloaded files to that folder.
4. Restart Obsidian, then enable **Planning Dashboard** under Community plugins.

## Usage

Add one of these code blocks to a note:

````markdown
```planning-overview
```
````

Other available blocks are `planning-season-map` and
`planning-nearest-phases`. Use the plugin settings to configure optional
TickTick synchronization.

## Development

Run `npm run check` for TypeScript validation and `npm run build` to generate
the release `main.js` bundle.

## License

MIT. See [LICENSE](LICENSE).
