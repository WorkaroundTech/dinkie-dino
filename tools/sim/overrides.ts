import type { Tuning } from '../../src/core';
import { DEFAULT_TUNING } from '../../src/core';

/**
 * A copy of the default tuning with overrides applied. Each override is `path=number`, for
 * example `temperature.moveChance=0.06` or `needs.checksPerPoint.hunger=8`. An unknown path or a
 * value that is not a number is an error, so a typo cannot silently run the wrong experiment.
 */
export function tuningWithOverrides(overrides: readonly string[]): Tuning {
  const tuning = structuredClone(DEFAULT_TUNING);
  for (const override of overrides) applyOverride(tuning, override);
  return tuning;
}

function applyOverride(tuning: Tuning, override: string): void {
  const eq = override.indexOf('=');
  if (eq <= 0) throw new Error(`Override "${override}" must look like path=number`);
  const path = override.slice(0, eq).split('.');
  const value = Number(override.slice(eq + 1));
  if (!Number.isFinite(value)) throw new Error(`Override "${override}": the value is not a number`);

  let node: Record<string, unknown> = tuning as unknown as Record<string, unknown>;
  for (const key of path.slice(0, -1)) {
    const next = node[key];
    if (typeof next !== 'object' || next === null)
      throw new Error(`Override "${override}": no such setting "${key}"`);
    node = next as Record<string, unknown>;
  }
  const last = path[path.length - 1] ?? '';
  if (typeof node[last] !== 'number')
    throw new Error(`Override "${override}": "${path.join('.')}" is not a number setting`);
  node[last] = value;
}
