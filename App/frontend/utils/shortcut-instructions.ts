/** Provides official installation tutorials and localized shortcut-help labels. */
export const shortcutDevices = [
  'ios',
  'android',
  'edge',
  'chrome',
  'windows',
  'mac',
] as const;
/** Supported device/browser categories for manual shortcut instructions. */
export type ShortcutDevice = (typeof shortcutDevices)[number];

/** Official help pages; unknown Windows browsers use the existing Edge fallback. */
const edgeTutorial =
  'https://support.microsoft.com/en-us/edge/' +
  'install-manage-or-uninstall-apps-in-microsoft-edge';

export const shortcutTutorials: Record<ShortcutDevice, string> = {
  ios: 'https://support.apple.com/guide/iphone/bookmark-a-website-iph42ab2f3a7/ios',
  android: 'https://support.google.com/chrome/answer/9658361?co=GENIE.Platform%3DAndroid',
  edge: edgeTutorial,
  chrome: 'https://support.google.com/chrome/answer/9658361?co=GENIE.Platform%3DDesktop',
  windows: edgeTutorial,
  mac: 'https://support.apple.com/guide/safari/ibrw9e991864/mac',
};

/**
 * Choose browser-specific shortcut instructions, including touch-enabled
 * iPads.
 * @returns The matching instruction category, falling back to Chrome for unknown agents.
 */
export function detectShortcutDevice(userAgent: string, maxTouchPoints = 0): ShortcutDevice {
  if (/iPhone|iPad|iPod/i.test(userAgent) || (/Macintosh/i.test(userAgent) && maxTouchPoints > 1)) {
    return 'ios';
  }
  if (/Android/i.test(userAgent)) {
    return 'android';
  }
  if (/Edg\//i.test(userAgent)) {
    return 'edge';
  }
  if (/Chrome\//i.test(userAgent) && !/Edg|OPR|SamsungBrowser/i.test(userAgent)) {
    return 'chrome';
  }
  if (/Macintosh|Mac OS X/i.test(userAgent)) {
    return 'mac';
  }
  if (/Windows/i.test(userAgent)) {
    return 'windows';
  }
  return 'chrome';
}

/**
 * Keep a page's origin and path without preserving query parameters or fragments.
 * @returns An absolute URL suitable for sharing or creating the page's shortcut.
 */
export function shortcutPageURL(href: string) {
  const url = new URL(href);
  return url.origin + url.pathname;
}

export const shortcutCopy = {
  en: {
    title: 'Add a Shortcut',
    footer: 'Footer links',
    close: 'Close shortcut instructions',
    device: 'Your device / browser',
    link: 'Current page link',
    copy: 'Copy link',
    copied: 'Copied',
    copyFailed: 'Select the link above and copy it manually.',
    devices: {
      ios: 'iPhone / iPad',
      android: 'Android · Chrome',
      edge: 'Computer · Edge',
      chrome: 'Computer · Chrome',
      windows: 'Windows · other browsers',
      mac: 'Mac · Safari',
    },
    tutorial: 'Open official tutorial (new tab)',
  },
  zh: {
    title: '添加快捷方式',
    footer: '页脚链接',
    close: '关闭快捷方式说明',
    device: '你的设备 / 浏览器',
    link: '当前页面链接',
    copy: '复制链接',
    copied: '已复制',
    copyFailed: '请选择上方链接，手动复制。',
    devices: {
      ios: 'iPhone / iPad',
      android: '安卓 · Chrome',
      edge: '电脑 · Edge',
      chrome: '电脑 · Chrome',
      windows: 'Windows · 其他浏览器',
      mac: 'Mac · Safari',
    },
    tutorial: '查看官方教程（新标签页）',
  },
} as const;
