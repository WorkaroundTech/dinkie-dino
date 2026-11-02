import type { FinalForm, PetState } from '../state';

/**
 * Angel or Demon, decided by the hidden care score (CARE-01).
 *
 * The score's factors, weights and threshold are deliberately undecided (CARE-02), so this is
 * a stub that always judges the care as good. It is the single place to implement the score.
 */
export function careVerdict(_pet: Readonly<PetState>): FinalForm {
  return 'angel';
}
