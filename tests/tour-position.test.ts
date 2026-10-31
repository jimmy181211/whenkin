import { describe, expect, it } from 'vitest';
import { tourScrollDelta } from '../src/lib/tour-position';

describe('context-preserving guide scrolling', () => {
  const bounds = { top: 20, bottom: 530 };
  it('keeps visible fields and neighboring tabs in place', () => {
    expect(tourScrollDelta({ top: 230, bottom: 275 }, bounds)).toBe(0);
    expect(tourScrollDelta({ top: 350, bottom: 400 }, bounds)).toBe(0);
  });
  it('reveals offscreen targets with the minimum required movement', () => {
    expect(tourScrollDelta({ top: 500, bottom: 600 }, bounds)).toBe(70);
    expect(tourScrollDelta({ top: -30, bottom: 10 }, bounds)).toBe(-50);
  });
  it('does not recenter a large grid that is already substantially visible', () => {
    expect(tourScrollDelta({ top: 280, bottom: 900 }, bounds)).toBe(0);
    expect(tourScrollDelta({ top: -100, bottom: 900 }, bounds)).toBe(0);
    expect(tourScrollDelta({ top: 300, bottom: 800 }, bounds)).toBe(0);
  });
  it('reveals enough of a tall grid while retaining the field above it', () => {
    expect(tourScrollDelta({ top: 500, bottom: 1040 }, bounds)).toBe(110);
    expect(tourScrollDelta({ top: 700, bottom: 1240 }, bounds)).toBe(310);
  });
  it('handles a short phone viewport without invalid movement', () => {
    expect(tourScrollDelta({ top: 300, bottom: 900 }, { top: 12, bottom: 172 })).toBe(208);
    expect(tourScrollDelta({ top: 30, bottom: 60 }, { top: 100, bottom: 80 })).toBe(0);
  });
});
