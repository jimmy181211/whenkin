/** The user's decision after a browser-native installation prompt. */
type InstallChoice = { outcome: 'accepted' | 'dismissed' };
/** Browser event that can open a one-use native installation dialog. */
interface InstallPromptEvent extends Event {
  prompt(): Promise<unknown>;
  userChoice: Promise<InstallChoice>;
}
/**
 * Installation outcome used to show feedback or fall back to manual
 * instructions.
 */
export type InstallResult =
  | 'accepted'
  | 'dismissed'
  | 'unavailable'
  | 'pending';

/** Keep a browser's one-use install prompt until the user clicks the shortcut button. */
export class BrowserInstall {
  // Null when unsupported, already installed, or the prompt has already been consumed.
  private deferred: InstallPromptEvent | null = null;

  private pending = false;

  /**
   * Capture browser install events for a later user-triggered prompt.
   * @returns Cleanup that removes both listeners and releases the stored prompt.
   */
  listen(target: EventTarget) {
    /** Keep the browser's install prompt until the user requests it. */
    const capture = (event: Event) => {
      if (!('prompt' in event) || typeof event.prompt !== 'function') {
        return;
      }
      event.preventDefault();
      this.deferred = event as InstallPromptEvent;
    };

    /** Discard a saved prompt after installation completes. */
    const installed = () => {
      this.deferred = null;
    };

    target.addEventListener('beforeinstallprompt', capture);
    target.addEventListener('appinstalled', installed);
    // Remove install listeners and release the stored one-use prompt.
    return () => {
      target.removeEventListener('beforeinstallprompt', capture);
      target.removeEventListener('appinstalled', installed);
      this.deferred = null;
    };
  }

  /**
   * Show the native install dialog from a user click, consuming the stored prompt.
   * @returns The user's choice, pending for a duplicate click, or unavailable
   * when manual browser instructions are needed.
   */
  async prompt(): Promise<InstallResult> {
    if (this.pending) {
      return 'pending';
    }
    const event = this.deferred;
    if (!event) {
      return 'unavailable';
    }
    this.deferred = null;
    this.pending = true;
    try {
      await event.prompt();
      return (await event.userChoice).outcome;
    } catch {
      return 'unavailable';
    } finally {
      this.pending = false;
    }
  }
}

export const browserInstall = new BrowserInstall();
