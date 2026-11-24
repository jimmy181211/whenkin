/** Selects localized installation instructions for each supported browser. */
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
    intro: 'Follow these steps to add this page. It may open in its own window.',
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
    steps: {
      ios: [
        'Tap your browser’s Share button.',
        'Choose “Add to Home Screen”.',
        'Keep “Open as Web App” on if shown, then tap “Add”.',
      ],
      android: [
        'Open this page in Chrome and tap the ⋮ menu.',
        'Choose “Add to Home screen” or “Install app”.',
        'Choose “Install” if offered, then confirm.',
      ],
      edge: [
        'Open Edge’s … menu.',
        'Choose “More tools” → “Apps” → “Install this site as an app” (or “Apps” directly).',
        'Confirm “Install”, then choose a desktop shortcut if offered.',
      ],
      chrome: [
        'Open Chrome’s ⋮ menu.',
        'Choose “Cast, save, and share”, then “Install page as app”.',
        'Confirm the name and click “Install”.',
      ],
      windows: [
        'Copy the link below and open it in Edge.',
        'Open … → “More tools” → “Apps” → “Install this site as an app”.',
        'Confirm “Install”, then choose a desktop shortcut if offered.',
      ],
      mac: [
        'Open this page in Safari.',
        'Choose “File” → “Add to Dock” (on supported macOS versions).',
        'Confirm the name and click “Add”.',
      ],
    },
  },
  zh: {
    title: '添加快捷方式',
    footer: '页脚链接',
    close: '关闭快捷方式说明',
    intro: '按以下步骤添加当前页面，之后可能在独立窗口打开。',
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
    steps: {
      ios: [
        '点击浏览器的“分享”按钮。',
        '选择“添加到主屏幕”。',
        '若出现“作为网页 App 打开”，请保持开启，再点击“添加”。',
      ],
      android: [
        '在 Chrome 中打开当前页面，点击 ⋮ 菜单。',
        '选择“添加到主屏幕”或“安装应用”。',
        '若提供“安装”选项，请选择并确认。',
      ],
      edge: [
        '打开 Edge 右上角的 … 菜单。',
        '选择“更多工具” → “应用” → “将此站点安装为应用”（部分版本直接显示“应用”）。',
        '确认“安装”，若提供桌面快捷方式选项，可一并勾选。',
      ],
      chrome: [
        '打开 Chrome 右上角的 ⋮ 菜单。',
        '选择“投放、保存和分享”，再选择“将网页作为应用安装”。',
        '确认名称，点击“安装”。',
      ],
      windows: [
        '复制下方链接，在 Edge 中打开。',
        '打开 … →“更多工具”→“应用”→“将此站点安装为应用”。',
        '确认“安装”，若提供桌面快捷方式选项，可一并勾选。',
      ],
      mac: [
        '在 Safari 中打开当前页面。',
        '选择“文件” → “添加到程序坞”（需 macOS 版本支持）。',
        '确认名称，点击“添加”。',
      ],
    },
  },
} as const;
