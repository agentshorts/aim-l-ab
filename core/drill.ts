import { Settings } from "./settings";
import { Input } from "./input";
import { RunResult } from "./storage";
import { Fx } from "./fx";
import { AudioCore } from "./audio";
export interface DrillCtx { canvas: HTMLCanvasElement; settings: Settings; input: Input; fx: Fx; sfx: AudioCore; }
export interface Drill {
  id: string; title: string; howTo: string; primary: string; // label of primary score
  hudLabels: string[];
  init(ctx: DrillCtx): void; reset(): void; setSettings(s: Settings): void;
  update(dt: number, clicks: number[], now: number): void; render(): void; hud(): string[];
  result(): { score: number; metrics: Record<string, number> }; resize(): void; hooks?: Record<string, any>;
}
export type { RunResult };
