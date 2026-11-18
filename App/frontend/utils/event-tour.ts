export const EVENT_TOUR_KEY = 'whenkin:event-tour:v1';
/** Guide outcome retained to avoid repeatedly showing the welcome prompt. */
export type TourOutcome = 'completed' | 'skipped';
/** The optional storage operations needed to remember guide dismissal. */
type TourStorage = Pick<Storage, 'getItem' | 'setItem'>;
let dismissedThisSession = false;

/**
 * Offer the guide unless it was dismissed in this session or a previous
 * visit.
 * @returns True when the welcome should be offered; unavailable storage does not block it.
 */
export function shouldOfferTour(storage?: TourStorage | null) {
  if (dismissedThisSession) {
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
export function finishTour(outcome: TourOutcome, storage?: TourStorage | null) {
  dismissedThisSession = true;
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
export function browserTourStorage() {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export const tourSteps = [
  {
    target: '.availability-view-switch button:first-child',
    key: 'personal',
  },
  {
    target: '.availability-view-switch button:last-child',
    key: 'group',
  },
  {
    target: '[data-tour-responders]',
    key: 'responders',
  },
  {
    target: '[data-tour-shared-times]',
    key: 'sharedTimes',
  },
  {
    target: '[data-tour-share]',
    key: 'share',
  },
  {
    target: '[data-tour-shortcut]',
    key: 'shortcut',
  },
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
    personal: [
      'Your Availability',
      'View or edit your current response.',
    ],
    group: [
      'Group Availability',
      'Hover over a time block to see who’s free.',
    ],
    responders: [
      'Responders',
      'Click a name to view a response. Click your name to edit yours.',
    ],
    sharedTimes: [
      'When Everyone Is Free',
      'Click to highlight all shared free time.',
    ],
    share: [
      'Share the event',
      'Share the event using this icon or copy the URL.',
    ],
    shortcut: [
      'Add a Shortcut',
      'Click to add a shortcut or see your device’s steps.',
    ],
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
    personal: [
      '你的空闲时间',
      '查看或修改你正在填写的空闲时间。',
    ],
    group: [
      '群组空闲时间',
      '悬停时间块，查看谁有空。',
    ],
    responders: [
      '回复者',
      '点击姓名查看回复，点击自己的姓名修改。',
    ],
    sharedTimes: [
      '大家都有空的时段',
      '点击高亮所有共同空闲时段。',
    ],
    share: [
      '分享活动',
      '点击此图标分享活动，或复制网址。',
    ],
    shortcut: [
      '添加快捷方式',
      '点击添加，或查看对应设备的操作步骤。',
    ],
  },
  es: {
    guide: 'Guía Rápida',
    welcome: 'Para empezar',
    intro: 'Puedes omitir toda la guía en cualquier momento.',
    start: 'Iniciar Guía',
    skip: 'Omitir Guía',
    back: 'Atrás',
    next: 'Siguiente',
    done: 'Terminar',
    progress: 'Paso {step} de {total}',
    unavailable: 'Esta sección está oculta. Continúa al siguiente paso.',
    personal: [
      'Tu Disponibilidad',
      'Consulta o edita tu respuesta actual.',
    ],
    group: [
      'Disponibilidad del Grupo',
      'Pasa el cursor sobre un bloque para ver quién está libre.',
    ],
    responders: [
      'Participantes que Respondieron',
      'Haz clic en un nombre para ver su respuesta y en el tuyo para editarla.',
    ],
    sharedTimes: [
      'Cuando Todos Están Libres',
      'Haz clic para resaltar todos los horarios comunes.',
    ],
    share: [
      'Comparte el evento',
      'Comparte el evento con este icono o copia la URL.',
    ],
    shortcut: [
      'Añadir un acceso directo',
      'Haz clic para añadirlo o ver los pasos para tu dispositivo.',
    ],
  },
  pt: {
    guide: 'Guia rápido',
    welcome: 'Primeiros passos',
    intro: 'Você pode pular o guia a qualquer momento.',
    start: 'Iniciar guia',
    skip: 'Pular guia',
    back: 'Voltar',
    next: 'Próximo',
    done: 'Concluir',
    progress: 'Etapa {step} de {total}',
    unavailable: 'Esta área está oculta. Continue para a próxima etapa.',
    personal: [
      'Sua disponibilidade',
      'Veja ou edite sua resposta atual.',
    ],
    group: [
      'Disponibilidade do grupo',
      'Passe o cursor sobre um bloco para ver quem está livre.',
    ],
    responders: [
      'Quem respondeu',
      'Clique em um nome para ver a resposta. Clique no seu para editar.',
    ],
    sharedTimes: [
      'Quando todos estão livres',
      'Clique para destacar todos os horários em comum.',
    ],
    share: [
      'Compartilhar evento',
      'Compartilhe o evento por este ícone ou copie o link.',
    ],
    shortcut: [
      'Adicionar atalho',
      'Clique para adicionar ou ver os passos para seu dispositivo.',
    ],
  },
  de: {
    guide: 'Kurzanleitung',
    welcome: 'Erste Schritte',
    intro: 'Du kannst die Anleitung jederzeit überspringen.',
    start: 'Anleitung starten',
    skip: 'Überspringen',
    back: 'Zurück',
    next: 'Weiter',
    done: 'Fertig',
    progress: 'Schritt {step} von {total}',
    unavailable:
      'Dieser Bereich ist ausgeblendet. Fahre mit dem nächsten Schritt fort.',
    personal: [
      'Deine Verfügbarkeit',
      'Sieh dir deine aktuelle Antwort an oder bearbeite sie.',
    ],
    group: [
      'Verfügbarkeit der Gruppe',
      'Bewege den Zeiger über einen Zeitblock, um zu sehen, wer Zeit hat.',
    ],
    responders: [
      'Antwortende',
      'Klicke auf einen Namen, um die Antwort zu sehen. Klicke auf deinen, um sie zu bearbeiten.',
    ],
    sharedTimes: [
      'Wenn alle Zeit haben',
      'Klicke hier, um alle gemeinsamen freien Zeiten zu markieren.',
    ],
    share: [
      'Termin teilen',
      'Teile den Termin über dieses Symbol oder kopiere den Link.',
    ],
    shortcut: [
      'Verknüpfung hinzufügen',
      'Klicke hier, um sie hinzuzufügen oder die Schritte für dein Gerät zu sehen.',
    ],
  },
} as const;
