/**
 * Allow up to 30 writes per client in a one-minute window within this process.
 * Keep at most 5,000 client windows; multiple server instances do not share them.
 */
export class WriteLimiter {
  // Each client key stores its write count and an absolute expiration timestamp.
  private readonly windows = new Map<
    string,
    {
      count: number;
      ends: number;
    }
  >();

  /** Keep an independent counter set and an injectable millisecond clock. */
  constructor(private readonly now: () => number = Date.now) {}

  /**
   * Count this write against the client's current window.
   * @returns A success flag; false means the write or client-tracking limit was reached.
   */
  async limit({ key }: { key: string }) {
    const time = this.now();
    let current = this.windows.get(key);
    if (!current || current.ends <= time) {
      if (this.windows.size >= 5000) {
        for (const [id, value] of this.windows) {
          if (value.ends <= time) {
            this.windows.delete(id);
          }
        }
      }
      if (this.windows.size >= 5000 && !this.windows.has(key)) {
        return { success: false };
      }
      current = {
        count: 0,
        ends: time + 60000,
      };
      this.windows.set(key, current);
    }
    current.count++;
    return { success: current.count <= 30 };
  }
}
