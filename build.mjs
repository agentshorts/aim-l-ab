import { build } from "esbuild";
for (const d of ["deadlock-souls", "deadlock-tracking"]) await build({ entryPoints: [`drills/${d}/main.ts`], bundle: true, outfile: `dist/${d}.js`, target: "es2020", minify: true });
await build({ entryPoints: ["tests/unit.ts"], bundle: true, platform: "node", outfile: "dist/unit.cjs", format: "cjs" });
