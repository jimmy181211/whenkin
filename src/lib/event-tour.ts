export const EVENT_TOUR_KEY = 'whenkin:event-tour:v1';
export type TourOutcome = 'completed' | 'skipped';
type TourStorage = Pick<Storage, 'getItem' | 'setItem'>;
let dismissedThisSession = false;

export function shouldOfferTour(storage?: TourStorage | null) {
  if (dismissedThisSession) return false;
  try {
    const value = storage?.getItem(EVENT_TOUR_KEY);
    return value !== 'completed' && value !== 'skipped';
  } catch { return true; }
}
export function finishTour(outcome: TourOutcome, storage?: TourStorage | null) {
  dismissedThisSession = true;
  try { storage?.setItem(EVENT_TOUR_KEY, outcome); } catch { /* Storage is optional. */ }
}
export function browserTourStorage() {
  try { return window.localStorage; } catch { return null; }
}

export const tourSteps = [
  { target: '#participant-name', key: 'name' },
  { target: '.availability-section .time-grid-wrap', key: 'grid' },
  { target: '.availability-view-switch button:first-child', key: 'personal' },
  { target: '.availability-view-switch button:last-child', key: 'group' },
  { target: '.suggestions-card', key: 'everyone' },
  { target: '.people-card', key: 'responders' },
  { target: '[data-tour-share]', key: 'share' },
] as const;

export const tourCopy = {
  en: {
    guide: 'Quick Guide', welcome: 'Get started',
    intro: 'You can skip the whole guide at any time.',
    start: 'Start Guide', skip: 'Skip Guide', back: 'Back', next: 'Next', done: 'Done',
    progress: 'Step {step} of {total}', unavailable: 'This area is hidden. Continue to the next step.',
    name: ['Your name', 'Enter your name so others recognize your response.'],
    grid: ['Mark when you’re free', 'Drag to mark free times; drag again to clear. Changes save automatically.'],
    personal: ['Your Availability', 'View or edit your current response.'],
    group: ['Group Availability', 'See everyone’s availability. Hover over or tap a time block to see who’s free.'],
    everyone: ['Everyone Available', 'These periods work for every responder.'],
    responders: ['Responders', 'Click a name to view or edit a response; use + to add one.'],
    share: ['Share the event', 'Copy the link through Share Event, or copy the URL from your browser’s address bar. Both open the same event.'],
  },
  zh: {
    guide: '使用指引', welcome: '快速上手',
    intro: '随时可以跳过整个引导。',
    start: '开始引导', skip: '跳过引导', back: '上一步', next: '下一步', done: '完成',
    progress: '第 {step} 步，共 {total} 步', unavailable: '这个区域暂不可见，请继续下一步。',
    name: ['填写你的名字', '输入名字，让大家认出你的回复。'],
    grid: ['标记你有空的时间', '拖动标记空闲时间，再次拖动可取消；修改自动保存。'],
    personal: ['你的空闲时间', '查看或修改你正在填写的空闲时间。'],
    group: ['群组空闲时间', '查看大家的空闲情况。悬停或点击时间块，查看谁有空。'],
    everyone: ['所有人都有空', '这里只显示所有回复者都有空的时段。'],
    responders: ['回复者', '点名字查看或修改回复；点加号添加回复。'],
    share: ['分享活动', '在“分享活动”中复制链接，或直接复制浏览器地址栏的网址，效果一样。'],
  },
  es: {
    guide: 'Guía Rápida', welcome: 'Para empezar',
    intro: 'Puedes omitir toda la guía en cualquier momento.',
    start: 'Iniciar Guía', skip: 'Omitir Guía', back: 'Atrás', next: 'Siguiente', done: 'Terminar',
    progress: 'Paso {step} de {total}', unavailable: 'Esta sección está oculta. Continúa al siguiente paso.',
    name: ['Tu nombre', 'Escribe tu nombre para identificar tu respuesta.'],
    grid: ['Marca cuándo estás libre', 'Arrastra para marcar horas libres; repite para borrarlas. Los cambios se guardan automáticamente.'],
    personal: ['Tu Disponibilidad', 'Consulta o edita tu respuesta actual.'],
    group: ['Disponibilidad del Grupo', 'Consulta la disponibilidad de todos. Pasa el cursor o toca un bloque para ver quién está libre.'],
    everyone: ['Todos Disponibles', 'Estos periodos les vienen bien a todos los que respondieron.'],
    responders: ['Participantes que Respondieron', 'Pulsa un nombre para ver o editar su respuesta; usa + para añadir otra.'],
    share: ['Comparte el evento', 'Copia el enlace desde Compartir Evento o la URL de la barra de direcciones. Ambos abren el mismo evento.'],
  },
} as const;
