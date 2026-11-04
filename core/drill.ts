import type { Weapon } from "./heroes";
import { Settings } from "./settings";
import { Input } from "./input";
import { RunResult } from "./storage";
import { Fx } from "./fx";
import { AudioCore } from "./audio";
export interface DrillCtx { canvas: HTMLCanvasElement; settings: Settings; input: Input; fx: Fx; sfx: AudioCore; weapon: Weapon | null; }
export interface Drill {
  id: string; title: string; howTo: string; primary: string; // label of primary score
  hudLabels: string[];
  init(ctx: DrillCtx): void; reset(): void; setSettings(s: Settings): void;
  update(dt: number, clicks: number[], now: number): void; render(): void; hud(): string[];
  result(): { score: number; metrics: Record<string, number> }; resize(): void; hooks?: Record<string, any>;
  /** true when the drill simulates a held trigger itself (tracking) instead of using clicks */ holdsFire?: boolean;
  /** true when the drill ended the round itself (cover fire: an enemy reached you); the shell then goes to results */ ended?(): boolean;
}
export type { RunResult };
