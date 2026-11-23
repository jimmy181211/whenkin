/**
 * Allow up to 30 writes per client in a one-minute window within this process.
 * Keep at most 5,000 client windows; multiple server instances do not share them.
 * @param now - Clock returning milliseconds, replaceable for deterministic tests.
 * @returns A limiter whose limit action reports whether a client's write is allowed.
 */
export function createWriteLimiter(now: () => number = Date.now) {
  // Each client key stores its write count and an absolute expiration timestamp.
  const windows = new Map<string, { count: number;
    ends: number }>();
  return {
    /**
     * Count this write against the client's current window.
     * @returns A success flag; false means the write or client-tracking limit was reached.
     */
    async limit({ key }: { key: string }) {
      const time = now();
      let current = windows.get(key);
      if (!current || current.ends <= time) {
        if (windows.size >= 5000) {
          for (const [id, value] of windows) {
            if (value.ends <= time) {
              windows.delete(id);
            }
          }
        }
        if (windows.size >= 5000 && !windows.has(key)) {
          return { success: false };
        }
        current = {
          count: 0,
          ends: time + 60000,
        };
        windows.set(key, current);
      }
      current.count++;
      return { success: current.count <= 30 };
    },
  };
}
