type InstallChoice = { outcome: 'accepted' | 'dismissed' };
interface InstallPromptEvent extends Event {
  prompt(): Promise<unknown>;
  userChoice: Promise<InstallChoice>;
}
export type InstallResult = 'accepted' | 'dismissed' | 'unavailable' | 'pending';

// A browser-owned prompt is single-use and must be invoked inside the user's click.
export class BrowserInstall {
  private deferred: InstallPromptEvent | null = null;
  private pending = false;

  listen(target: EventTarget) {
    const capture = (event: Event) => {
      if (!('prompt' in event) || typeof event.prompt !== 'function') return;
      event.preventDefault();
      this.deferred = event as InstallPromptEvent;
    };
    const installed = () => { this.deferred = null; };
    target.addEventListener('beforeinstallprompt', capture);
    target.addEventListener('appinstalled', installed);
    return () => {
      target.removeEventListener('beforeinstallprompt', capture);
      target.removeEventListener('appinstalled', installed);
      this.deferred = null;
    };
  }

  async prompt(): Promise<InstallResult> {
    if (this.pending) return 'pending';
    const event = this.deferred;
    if (!event) return 'unavailable';
    this.deferred = null;
    this.pending = true;
    try {
      await event.prompt();
      return (await event.userChoice).outcome;
    } catch { return 'unavailable'; }
    finally { this.pending = false; }
  }
}

export const browserInstall = new BrowserInstall();
