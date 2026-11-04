// Wiggle check (thin strips): same scene at two yaws 0.1 degree apart, full frame plus 3x crops of the strips.
import { chromium } from "playwright";
const base = process.argv[2], tag = process.argv[3] || "vX", errs = [];
const b = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const p = await b.newPage({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
p.on("pageerror", (e) => errs.push(String(e)));
await p.goto(`${base}/index.html`); await p.waitForSelector(".card");
for (const [route, name, crop] of [["tracking/high-ground", "highground", { x: 720, y: 450, width: 300, height: 160 }], ["tracking/high-ground", "stripes", { x: 400, y: 100, width: 480, height: 300 }]]) {
  await p.evaluate((r) => (location.hash = "#/" + r), route); await p.waitForFunction(() => window.aimlab?.drill?.start, null, { timeout: 90000 }); await p.waitForTimeout(1500); await p.evaluate(() => window.aimlab.drill.start()); await p.waitForTimeout(4000);
  for (const [i, dx] of [[0, 0], [1, 3]]) { if (dx) await p.evaluate((d) => window.aimlab.drill.input.inject(d, 0), dx); await p.waitForTimeout(1200);
    await p.screenshot({ path: `proof/wiggle_${name}_${i ? "b" : "a"}_${tag}.png` }); await p.screenshot({ path: `proof/wiggle_${name}_${i ? "b" : "a"}_crop_${tag}.png`, clip: crop }); }
}
console.log(JSON.stringify({ errs })); await b.close();
