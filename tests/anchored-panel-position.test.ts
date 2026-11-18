import {
  describe,
  expect,
  it,
} from 'vitest';
import { anchoredPanelPosition } from '../App/frontend/utils/anchored-panel-position';

/**
 * Build a rectangle fixture with consistent edges and dimensions.
 * @returns Viewport edges and dimensions describing the same rectangle.
 */
const rect = (left: number, top: number, width: number, height: number) => ({
  left,
  top,
  width,
  height,
  right: left + width,
  bottom: top + height,
});

/** Group the contextual panel placement checks. */
describe('contextual panel placement', () => {
  /**
   * Keeps panels inside phone and desktop viewports for blocks near every
   * edge.
   */
  it('keeps panels inside phone and desktop viewports for blocks near every edge', () => {
    for (const width of [
      320,
      390,
      1280,
    ]) {
      for (const top of [
        12,
        380,
        750,
      ]) {
        for (const left of [
          12,
          width - 110,
        ]) {
          const p = anchoredPanelPosition(
            rect(left, top, 98, 30),
            {
              width: Math.min(320, width - 24),
              height: 300,
            },
            {
              left: 0,
              top: 0,
              width,
              height: 844,
            },
          );
          expect(p.left).toBeGreaterThanOrEqual(12);
          expect(p.top).toBeGreaterThanOrEqual(12);
          expect(p.left + Math.min(320, width - 24)).toBeLessThanOrEqual(
            width - 12,
          );
          expect(p.top + 300).toBeLessThanOrEqual(832);
        }
      }
    }
  });
  /** Opens above a bottom-of-page slot rather than beyond the bottom edge. */
  it('opens above a bottom-of-page slot rather than beyond the bottom edge', () => {
    const p = anchoredPanelPosition(
      rect(36, 770, 100, 26),
      {
        width: 296,
        height: 280,
      },
      {
        left: 0,
        top: 0,
        width: 320,
        height: 844,
      },
    );
    expect(p.top + 280).toBeLessThan(770);
  });
  /** Accounts for the visible viewport when a phone keyboard is open. */
  it('accounts for the visible viewport when a phone keyboard is open', () => {
    const p = anchoredPanelPosition(
      rect(40, 430, 100, 30),
      {
        width: 296,
        height: 260,
      },
      {
        left: 0,
        top: 120,
        width: 320,
        height: 400,
      },
    );
    expect(p.top).toBeGreaterThanOrEqual(132);
    expect(p.top + 260).toBeLessThanOrEqual(508);
  });
});
