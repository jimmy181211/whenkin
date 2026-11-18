import {
  describe,
  it,
  expect,
} from 'vitest';
import { createWriteLimiter } from '../App/backend/shared/write-limit';
/** Group the Sites write protection checks. */
describe('Sites write protection', () => {
  /** Limits one caller while allowing another caller. */
  it('limits one caller while allowing another caller', async () => {
    const limiter = createWriteLimiter();
    for (let i = 0; i < 30; i++) {
      expect((await limiter.limit({ key: 'one' })).success).toBe(true);
    }
    expect((await limiter.limit({ key: 'one' })).success).toBe(false);
    expect((await limiter.limit({ key: 'two' })).success).toBe(true);
  });
  /** Allows writes again when the window expires. */
  it('allows writes again when the window expires', async () => {
    let time = 0;
    const limiter = createWriteLimiter(
      /* Expose the mutable clock used to advance the limiter window in this test. */
      () => time,
    );
    for (let i = 0; i < 31; i++) {
      await limiter.limit({ key: 'one' });
    }
    time = 60000;
    expect((await limiter.limit({ key: 'one' })).success).toBe(true);
  });
  /** Bounds new callers under load and recovers after expiry. */
  it('bounds new callers under load and recovers after expiry', async () => {
    let time = 0;
    const limiter = createWriteLimiter(
      /* Expose the same controlled clock for the bounded-client-window test. */
      () => time,
    );
    for (let i = 0; i < 5000; i++) {
      await limiter.limit({ key: String(i) });
    }
    expect((await limiter.limit({ key: 'new' })).success).toBe(false);
    time = 60000;
    expect((await limiter.limit({ key: 'new' })).success).toBe(true);
  });
});
