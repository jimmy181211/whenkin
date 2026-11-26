export const EVENT_TOUR_KEY = 'whenkin:event-tour:v1';
/** Guide outcome retained to avoid repeatedly showing the welcome prompt. */
export type TourOutcome = 'completed' | 'skipped';
/** The optional storage operations needed to remember guide dismissal. */
type TourStorage = Pick<Storage, 'getItem' | 'setItem'>;

/** Own guide-dismissal state shared across event pages in the current session. */
export class EventTourService {
  private dismissedThisSession = false;

  /**
   * Offer the guide unless it was dismissed in this session or a previous
   * visit.
   * @returns True when the welcome should be offered; unavailable storage does not block it.
   */
  shouldOffer(storage?: TourStorage | null) {
    if (this.dismissedThisSession) {
      return false;
    }
    try {
      const value = storage?.getItem(EVENT_TOUR_KEY);
      return value !== 'completed' && value !== 'skipped';
    } catch {
      return true;
    }
  }

  /**
   * Remember that the guide was completed or skipped, even without browser
   * storage.
   */
  finish(outcome: TourOutcome, storage?: TourStorage | null) {
    this.dismissedThisSession = true;
    try {
      storage?.setItem(EVENT_TOUR_KEY, outcome);
    } catch {
      /* Storage is optional. */
    }
  }

  /**
   * Read optional browser storage without failing when access is blocked.
   * @returns The browser's local storage, or null when access is unavailable.
   */
  browserStorage() {
    try {
      return window.localStorage;
    } catch {
      return null;
    }
  }
}

// All event pages share dismissal state, including when browser storage is blocked.
export const tourService = new EventTourService();

export const tourSteps = [
  { target: '.availability-view-switch button:first-child', key: 'personal' },
  { target: '.availability-view-switch button:last-child', key: 'group' },
  { target: '[data-tour-responders]', key: 'responders' },
  { target: '[data-tour-shared-times]', key: 'sharedTimes' },
  { target: '[data-tour-share]', key: 'share' },
  { target: '[data-tour-shortcut]', key: 'shortcut' },
] as const;

export const tourCopy = {
  en: {
    guide: 'Quick Guide',
    welcome: 'Get started',
    intro: 'You can skip the whole guide at any time.',
    start: 'Start Guide',
    skip: 'Skip Guide',
    back: 'Back',
    next: 'Next',
    done: 'Done',
    progress: 'Step {step} of {total}',
    unavailable: 'This area is hidden. Continue to the next step.',
    personal: ['Your Availability', 'View or edit your response, then click Save Availability.'],
    group: ['Group Availability', 'Hover over a time block to see who’s free.'],
    responders: ['Responders', 'Click a name to view a response. Click your name to edit yours.'],
    sharedTimes: ['When Everyone Is Free', 'Click to highlight all shared free time.'],
    share: ['Share the event', 'Share the event using this icon or copy the URL.'],
    shortcut: ['Add a Shortcut', 'Click to add a shortcut or see your device’s steps.'],
  },
  zh: {
    guide: '使用指引',
    welcome: '快速上手',
    intro: '随时可以跳过整个引导。',
    start: '开始引导',
    skip: '跳过引导',
    back: '上一步',
    next: '下一步',
    done: '完成',
    progress: '第 {step} 步，共 {total} 步',
    unavailable: '这个区域暂不可见，请继续下一步。',
    personal: ['你的空闲时间', '查看或修改空闲时间，然后点击“保存空闲时间”。'],
    group: ['群组空闲时间', '悬停时间块，查看谁有空。'],
    responders: ['回复者', '点击姓名查看回复，点击自己的姓名修改。'],
    sharedTimes: ['大家都有空的时段', '点击高亮所有共同空闲时段。'],
    share: ['分享活动', '点击此图标分享活动，或复制网址。'],
    shortcut: ['添加快捷方式', '点击添加，或查看对应设备的操作步骤。'],
  },
} as const;
