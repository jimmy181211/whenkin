export const shortcutDevices = ['ios', 'android', 'chrome', 'windows', 'mac'] as const;
export type ShortcutDevice = typeof shortcutDevices[number];

export function detectShortcutDevice(userAgent: string, maxTouchPoints = 0): ShortcutDevice {
  if (/iPhone|iPad|iPod/i.test(userAgent) || (/Macintosh/i.test(userAgent) && maxTouchPoints > 1)) return 'ios';
  if (/Android/i.test(userAgent)) return 'android';
  if (/Chrome\//i.test(userAgent) && !/Edg|OPR|SamsungBrowser/i.test(userAgent)) return 'chrome';
  if (/Macintosh|Mac OS X/i.test(userAgent)) return 'mac';
  if (/Windows/i.test(userAgent)) return 'windows';
  return 'chrome';
}

// Keep the current event path without preserving legacy edit tokens or fragments.
export function shortcutPageURL(href: string) {
  const url = new URL(href);
  return url.origin + url.pathname;
}

export const shortcutCopy = {
  en: {
    title: 'Add a Shortcut', footer: 'Footer links', close: 'Close shortcut instructions',
    intro: 'Keep this page on your home screen or desktop. It opens in your browser.',
    device: 'Your device / browser', link: 'Current page link', copy: 'Copy link', copied: 'Copied',
    copyFailed: 'Select the link above and copy it manually.',
    devices: { ios: 'iPhone / iPad', android: 'Android · Chrome', chrome: 'Computer · Chrome', windows: 'Windows · other browsers', mac: 'Mac · other browsers' },
    steps: {
      ios: ['Tap your browser’s Share button.', 'Choose “Add to Home Screen”.', 'Turn off “Open as Web App” if shown, then tap “Add”.'],
      android: ['Open this page in Chrome and tap the ⋮ menu.', 'Choose “Install and create shortcut”, then “Create shortcut”.', 'Confirm the name and tap “Add”.'],
      chrome: ['Open Chrome’s ⋮ menu.', 'Choose “Cast, save, and share”, then “Create shortcut”.', 'Confirm the name and click “Create”.'],
      windows: ['Copy the page link below.', 'Right-click your desktop and choose “New” → “Shortcut”.', 'Paste the link, click “Next”, enter a name, then “Finish”.'],
      mac: ['Resize your browser window so you can see your desktop.', 'Select the page URL in the address bar.', 'Drag the URL onto your desktop to create a shortcut.'],
    },
  },
  zh: {
    title: '添加快捷方式', footer: '页脚链接', close: '关闭快捷方式说明',
    intro: '将当前页面放到主屏幕或桌面，点击后用浏览器打开。',
    device: '你的设备 / 浏览器', link: '当前页面链接', copy: '复制链接', copied: '已复制',
    copyFailed: '请选择上方链接，手动复制。',
    devices: { ios: 'iPhone / iPad', android: '安卓 · Chrome', chrome: '电脑 · Chrome', windows: 'Windows · 其他浏览器', mac: 'Mac · 其他浏览器' },
    steps: {
      ios: ['点击浏览器的“分享”按钮。', '选择“添加到主屏幕”。', '若出现“作为网页 App 打开”，请关闭，再点击“添加”。'],
      android: ['在 Chrome 中打开当前页面，点击 ⋮ 菜单。', '选择“安装和创建快捷方式”，再选择“创建快捷方式”。', '确认名称，点击“添加”。'],
      chrome: ['打开 Chrome 右上角的 ⋮ 菜单。', '选择“投放、保存和分享”，再选择“创建快捷方式”。', '确认名称，点击“创建”。'],
      windows: ['复制下方的当前页面链接。', '右键点击桌面，选择“新建” → “快捷方式”。', '粘贴链接，点击“下一步”，输入名称后点击“完成”。'],
      mac: ['缩小浏览器窗口，露出桌面。', '选中地址栏中的页面网址。', '将网址拖到桌面，即可创建快捷方式。'],
    },
  },
  es: {
    title: 'Añadir un acceso directo', footer: 'Enlaces del pie de página', close: 'Cerrar instrucciones del acceso directo',
    intro: 'Guarda esta página en tu pantalla de inicio o escritorio. Se abrirá en tu navegador.',
    device: 'Tu dispositivo / navegador', link: 'Enlace de esta página', copy: 'Copiar enlace', copied: 'Copiado',
    copyFailed: 'Selecciona el enlace de arriba y cópialo manualmente.',
    devices: { ios: 'iPhone / iPad', android: 'Android · Chrome', chrome: 'Ordenador · Chrome', windows: 'Windows · otros navegadores', mac: 'Mac · otros navegadores' },
    steps: {
      ios: ['Toca el botón Compartir de tu navegador.', 'Elige “Añadir a pantalla de inicio”.', 'Desactiva “Abrir como app web” si aparece y toca “Añadir”.'],
      android: ['Abre esta página en Chrome y toca el menú ⋮.', 'Elige “Instalar y crear acceso directo” y luego “Crear acceso directo”.', 'Confirma el nombre y toca “Añadir”.'],
      chrome: ['Abre el menú ⋮ de Chrome.', 'Elige “Enviar, guardar y compartir” y luego “Crear acceso directo”.', 'Confirma el nombre y haz clic en “Crear”.'],
      windows: ['Copia el enlace de esta página que aparece abajo.', 'Haz clic derecho en el escritorio y elige “Nuevo” → “Acceso directo”.', 'Pega el enlace, pulsa “Siguiente”, escribe un nombre y pulsa “Finalizar”.'],
      mac: ['Reduce la ventana del navegador para ver el escritorio.', 'Selecciona la URL de la página en la barra de direcciones.', 'Arrastra la URL al escritorio para crear el acceso directo.'],
    },
  },
} as const;
