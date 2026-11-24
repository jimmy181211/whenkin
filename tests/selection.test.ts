import {
  describe,
  expect,
  it,
} from 'vitest';
import {
  clearsSelection,
  paintSelection,
} from '../App/frontend/utils/selection';

/** Group the drag action follows its starting cell checks. */
describe('drag action follows its starting cell', () => {
  /**
   * Marks a rectangle that starts blank without clearing already marked
   * cells.
   */
  it('marks a rectangle that starts blank without clearing already marked cells', () => {
    const base = new Set([
      3,
      8,
    ]);
    const clear = clearsSelection([
      1,
      2,
    ], base);
    expect(clear).toBe(false);
    expect([...paintSelection(base, [
      1,
      2,
      3,
      4,
    ], clear)].sort()).toEqual([
      1,
      2,
      3,
      4,
      8,
    ]);
    expect([...base]).toEqual([
      3,
      8,
    ]);
  });
  /** Clears a rectangle that starts marked without filling its blank cells. */
  it('clears a rectangle that starts marked without filling its blank cells', () => {
    const base = new Set([
      1,
      2,
      5,
    ]);
    const clear = clearsSelection([
      1,
      2,
    ], base);
    expect(clear).toBe(true);
    expect([...paintSelection(base, [
      1,
      2,
      3,
      4,
    ], clear)]).toEqual([5]);
  });
  /**
   * Clears a partially marked block and recomputes a shrinking drag from
   * its original selection.
   */
  it(
    'clears a partially marked block and recomputes a shrinking drag ' +
      'from its original selection',
    () => {
      const base = new Set([
        1,
        5,
      ]);
      const clear = clearsSelection([
        1,
        2,
      ], base);
      expect(clear).toBe(true);
      expect([...paintSelection(base, [
        1,
        2,
        3,
        4,
        5,
        6,
      ], clear)]).toEqual([]);
      expect([...paintSelection(base, [
        1,
        2,
      ], clear)]).toEqual([5]);
    },
  );
});
