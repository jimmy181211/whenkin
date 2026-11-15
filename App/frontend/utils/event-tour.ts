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
  { target: '.availability-view-switch button:first-child', key: 'personal' },
  { target: '.availability-view-switch button:last-child', key: 'group' },
  { target: '[data-tour-responders]', key: 'responders' },
  { target: '[data-tour-shared-times]', key: 'sharedTimes' },
  { target: '[data-tour-share]', key: 'share' },
] as const;

export const tourCopy = {
  en: {
    guide: 'Quick Guide', welcome: 'Get started',
    intro: 'You can skip the whole guide at any time.',
    start: 'Start Guide', skip: 'Skip Guide', back: 'Back', next: 'Next', done: 'Done',
    progress: 'Step {step} of {total}', unavailable: 'This area is hidden. Continue to the next step.',
    personal: ['Your Availability', 'View or edit your current response.'],
    group: ['Group Availability', 'See everyone’s availability. Hover over or tap a time block to see who’s free.'],
    responders: ['Responders', 'Click any name to view a response. Return via this link and click your name to edit yours. Use the trash icon to delete, after confirmation.'],
    sharedTimes: ['When Everyone Is Free', 'Click “Highlight Everyone’s Free Times” to highlight all shared free times in Group Availability. Click “Cancel Highlight” to clear them.'],
    share: ['Share the event', 'Copy the link through Share Event, or copy the URL from your browser’s address bar. Both open the same event.'],
  },
  zh: {
    guide: '使用指引', welcome: '快速上手',
    intro: '随时可以跳过整个引导。',
    start: '开始引导', skip: '跳过引导', back: '上一步', next: '下一步', done: '完成',
    progress: '第 {step} 步，共 {total} 步', unavailable: '这个区域暂不可见，请继续下一步。',
    personal: ['你的空闲时间', '查看或修改你正在填写的空闲时间。'],
    group: ['群组空闲时间', '查看大家的空闲情况。悬停或点击时间块，查看谁有空。'],
    responders: ['回复者', '点击姓名查看相应回复。以后重新打开活动链接，点击自己的姓名即可修改自己的回复。点击垃圾桶图标可删除回复，删除前会请你确认。'],
    sharedTimes: ['大家都有空的时段', '点击“高亮全部共同空闲时间”，即可在群组空闲时间中高亮所有人都有空的时段；再次点击“取消高亮”即可清除高亮。'],
    share: ['分享活动', '在“分享活动”中复制链接，或直接复制浏览器地址栏的网址，效果一样。'],
  },
  es: {
    guide: 'Guía Rápida', welcome: 'Para empezar',
    intro: 'Puedes omitir toda la guía en cualquier momento.',
    start: 'Iniciar Guía', skip: 'Omitir Guía', back: 'Atrás', next: 'Siguiente', done: 'Terminar',
    progress: 'Paso {step} de {total}', unavailable: 'Esta sección está oculta. Continúa al siguiente paso.',
    personal: ['Tu Disponibilidad', 'Consulta o edita tu respuesta actual.'],
    group: ['Disponibilidad del Grupo', 'Consulta la disponibilidad de todos. Pasa el cursor o toca un bloque para ver quién está libre.'],
    responders: ['Participantes que Respondieron', 'Selecciona un nombre para ver su respuesta. Vuelve con este enlace y elige tu nombre para editar la tuya. Usa la papelera para eliminar una respuesta, con confirmación.'],
    sharedTimes: ['Cuando Todos Están Libres', 'Pulsa “Resaltar todos los horarios comunes” para marcarlos en Disponibilidad del Grupo. Pulsa “Cancelar resaltado” para quitar las marcas.'],
    share: ['Comparte el evento', 'Copia el enlace desde Compartir Evento o la URL de la barra de direcciones. Ambos abren el mismo evento.'],
  },
} as const;
