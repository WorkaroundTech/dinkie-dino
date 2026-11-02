import type { Needs } from '../state';
import { METER_MAX } from '../state';

type Meter = keyof typeof METER_MAX;

/** Raises a meter by `amount`, never past `cap` (and never past its maximum). */
export function raise(
  needs: Needs,
  meter: Meter,
  amount: number,
  cap: number = METER_MAX[meter],
): void {
  const limit = Math.min(cap, METER_MAX[meter]);
  needs[meter] = Math.max(needs[meter], Math.min(limit, needs[meter] + amount));
}

/** Lowers a meter by `amount`, never below empty. */
export function lower(needs: Needs, meter: Meter, amount: number): void {
  needs[meter] = Math.max(0, needs[meter] - amount);
}
