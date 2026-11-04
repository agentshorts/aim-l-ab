import { DEADLOCK_YAW_DEG } from "./spec";
// cm per 360 for counts-per-inch `dpi` and degrees-per-count `degPerCount`
export const cm360FromDegPerCount = (dpi: number, degPerCount: number) => (360 / degPerCount / dpi) * 2.54;
export const radPerCountFromCm360 = (cm360: number, dpi: number) => (2 * Math.PI) / ((cm360 / 2.54) * dpi);
export const deadlockSensToCm360 = (sens: number, dpi: number) => cm360FromDegPerCount(dpi, sens * DEADLOCK_YAW_DEG);
export const cm360ToDeadlockSens = (cm360: number, dpi: number) => 914.4 / (dpi * cm360 * DEADLOCK_YAW_DEG);
