import { access, copyFile, mkdir, stat } from "node:fs/promises";
import path from "node:path";

const vaultPath = process.argv[2];
if (!vaultPath) throw new Error("Usage: npm run deploy -- <path-to-Obsidian-vault>");
const vault = path.resolve(vaultPath);
const obsidianDirectory = path.join(vault, ".obsidian");
if (!(await stat(obsidianDirectory)).isDirectory()) throw new Error(`Obsidian vault was not found at: ${vault}`);

const pluginDirectory = path.join(obsidianDirectory, "plugins", "planning-dashboard");
await mkdir(pluginDirectory, { recursive: true });
for (const file of ["main.js", "manifest.json", "styles.css"]) {
  await access(path.join(process.cwd(), file));
  await copyFile(path.join(process.cwd(), file), path.join(pluginDirectory, file));
}
console.log(`Planning Dashboard installed in ${pluginDirectory}`);
