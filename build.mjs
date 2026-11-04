import { build } from "esbuild";
import { mkdirSync, copyFileSync, writeFileSync, readdirSync } from "fs";
// Output: dist/aimlab.js (single IIFE bundle, CSS inlined) + dist/assets/fonts. Drop dist/ into assets/js/aim-trainer/.
mkdirSync("dist/assets/fonts", { recursive: true }); mkdirSync("dist/assets/models", { recursive: true });
await build({ entryPoints: ["core/app.ts"], bundle: true, outfile: "dist/aimlab.js", target: "es2020", minify: true, format: "iife", loader: { ".css": "text" }, legalComments: "eof" });
for (const f of ["Oswald-Variable.ttf", "OFL_Oswald.txt"]) copyFileSync(`assets/fonts/${f}`, `dist/assets/fonts/${f}`);
for (const f of readdirSync("assets/models")) copyFileSync(`assets/models/${f}`, `dist/assets/models/${f}`);
writeFileSync("dist/index.html", `<!doctype html><html><head><meta charset=utf-8><meta name=viewport content="width=device-width,initial-scale=1"><title>Aim Lab</title></head><body><div id="aimlab" data-aimlab-mount></div><script src="aimlab.js"></script></body></html>`);
await build({ entryPoints: ["tests/unit.ts"], bundle: true, platform: "node", outfile: "dist/unit.cjs", format: "cjs", loader: { ".css": "text" } });
