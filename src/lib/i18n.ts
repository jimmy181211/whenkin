// English is the default. Chinese uses Simplified Chinese.
export type Language = 'en' | 'zh' | 'es';
export const languageOptions: { value: Language; label: string }[] = [
  { value: 'en', label: 'English' }, { value: 'zh', label: '简体中文' }, { value: 'es', label: 'Español' },
];
export const messages: Record<string, [string, string]> = {
  'Who Is Available?': ['谁有空？', '¿Quién Está Disponible?'],
  'Hover over or tap a block in Group Availability to see who is free.': ['在群组空闲时间中悬停或点击一个时间块，查看谁有空。', 'Pasa el cursor o toca un bloque en Disponibilidad del Grupo para ver quién está libre.'],
  'Everyone Available': ['所有人都有空', 'Todos Disponibles'],
  'Responders': ['回复者', 'Participantes que Respondieron'],
  'Availability at This Time': ['此时段的空闲情况', 'Disponibilidad en este Horario'],
  'No responders available.': ['没有回复者全程有空。', 'Nadie está disponible durante todo el bloque.'],
  'No unavailable responders.': ['所有回复者都有空。', 'Todos están disponibles.'],
  'Availability is for the entire selected block.': ['按整个所选时间块统计。', 'Se considera el bloque seleccionado completo.'],
  'Retry': ['重试', 'Reintentar'],
  'Add Response': ['添加回复', 'Añadir Respuesta'],
  'Edit {name}': ['编辑 {name}', 'Editar a {name}'],
  'Everyone with the link can view and edit all responses.': ['持有链接的所有人都能查看和编辑全部回复。', 'Todos los que tengan el enlace pueden ver y editar todas las respuestas.'],
  'This response could not be found. Refresh the group and try again.': ['找不到这份回复，请刷新参与者列表后重试。', 'No se encontró esta respuesta. Actualiza el grupo e inténtalo de nuevo.'],
  'This response changed. Select the person again to load the latest version before saving.': ['这份回复已被修改。请再次点击该成员，载入最新版本后再保存。', 'Esta respuesta cambió. Selecciona de nuevo a la persona para cargar la versión más reciente antes de guardar.'],
  'Dismiss notification': ['关闭提示', 'Cerrar aviso'],
  'Your Availability': ['你的空闲时间', 'Tu Disponibilidad'],
  'Group Availability': ['群组空闲时间', 'Disponibilidad del Grupo'],
  'Availability View': ['空闲时间视图', 'Vista de disponibilidad'],
  'People Available': ['空闲人数', 'Personas disponibles'],
  'Could not save. Please keep this page open and try again.': ['无法保存，请保持此页面打开并重试。', 'No se pudo guardar. Mantén esta página abierta e inténtalo de nuevo.'],
  'Links expire in 1 year': ['链接将在 1 年后失效', 'Los enlaces caducan en 1 año'],
  'Event Link': ['活动链接', 'Enlace del evento'],
  'Primary Selection': ['首选时间', 'Selección principal'],
  'Everyone': ['所有人', 'Todos'],
  'Use Event’s Zone': ['使用活动时区', 'Usar la zona del evento'],



  'This event has expired.': ['此活动已过期。', 'Este evento ha caducado.'],
  'This event could not be found. It may have expired.': ['找不到此活动，可能已过期。', 'No se encontró este evento. Puede que haya caducado.'],

  'Month': ['月份', 'Mes'],
  'Year': ['年份', 'Año'],
  'Saved': ['已保存', 'Guardado'],
  'Unsaved': ['未保存', 'Sin guardar'],
  'Not Started': ['尚未开始', 'Sin empezar'],
  'Enter your name before editing availability.': ['请先输入姓名，再编辑空闲时间。', 'Escribe tu nombre antes de editar tu disponibilidad.'],
  'Event Name': ['活动名称', 'Nombre del evento'],
  'Calendar mode': ['日历模式', 'Modo de calendario'],
  'Specific Dates': ['具体日期', 'Fechas específicas'],
  'Days of the Week': ['星期几', 'Días de la semana'],
  'Choose days of the week': ['选择星期几', 'Elige días de la semana'],
  '{count} day selected': ['已选 {count} 天', '{count} día seleccionado'],
  '{count} days selected': ['已选 {count} 天', '{count} días seleccionados'],
  'Choose at least one day of the week.': ['请至少选择一周中的一天。', 'Elige al menos un día de la semana.'],
  'Choose specific dates or days of the week.': ['请选择具体日期或星期模式。', 'Elige fechas específicas o días de la semana.'],
  'Week': ['每周', 'Semana'],


  "Find your shared time.": [
    "找到大家的共同时间。",
    "Encuentra un momento para todos."
  ],
  "Language": [
    "语言",
    "Idioma"
  ],
  "Main navigation": [
    "主导航",
    "Navegación principal"
  ],
  "Whenkin home": [
    "Whenkin 首页",
    "Inicio de Whenkin"
  ],
  "New Event": [
    "新建活动",
    "Nuevo evento"
  ],
  "Create an Event": [
    "创建活动",
    "Crear un evento"
  ],
  "Choose possible dates and hours, then share the link.": [
    "选择可能合适的日期和时段，然后分享链接。",
    "Elige posibles fechas y horas y comparte el enlace."
  ],
  "Open the link and drag across the time grid. No account needed.": [
    "打开链接，在时间表上拖动选择。无需注册。",
    "Abre el enlace y arrastra por la cuadrícula. No necesitas una cuenta."
  ],
  "Midnight (next day)": [
    "午夜（次日）",
    "Medianoche (día siguiente)"
  ],
  "LESS BACK-AND-FORTH. MORE TOGETHER.": [
    "少些来回沟通，多些相聚时光。",
    "MENOS MENSAJES. MÁS ENCUENTROS."
  ],
  "your time": [
    "你的时间",
    "tu tiempo"
  ],
  "their time": [
    "大家的时间",
    "su tiempo"
  ],
  "a little common ground": [
    "一点共同时间",
    "un momento en común"
  ],
  "THREE SMALL STEPS": [
    "三个简单步骤",
    "TRES PASOS SENCILLOS"
  ],
  "What are you planning?": [
    "你想安排什么活动？",
    "¿Qué estás organizando?"
  ],
  "How It Works": ["使用方法", "Cómo funciona"],
  "Your Name": [
    "你的姓名",
    "Tu nombre"
  ],
  "Note": [
    "备注",
    "Nota"
  ],
  "optional": [
    "选填",
    "opcional"
  ],
  "Add a Note": [
    "添加备注",
    "Añadir una nota"
  ],
  "Event dates": [
    "活动日期",
    "Fechas del evento"
  ],
  "From": [
    "开始",
    "Desde"
  ],
  "Until": [
    "结束",
    "Hasta"
  ],

  "{count} min": [
    "{count} 分钟",
    "{count} min"
  ],
  "{count} hour": [
    "{count} 小时",
    "{count} hora"
  ],
  "{count} hours": [
    "{count} 小时",
    "{count} horas"
  ],
  "Your guests will see their own local time": [
    "参与者会看到各自的当地时间",
    "Los participantes verán su hora local"
  ],
  "Event creation is still being set up.": [
    "活动创建功能正在配置中。",
    "Estamos terminando de configurar la creación de eventos."
  ],
  "We can’t reach event saving right now.": [
    "暂时无法连接活动保存服务。",
    "No podemos conectar con el servicio de guardado."
  ],
  "Shareable links will be available when setup is complete.": [
    "配置完成后即可创建并分享活动链接。",
    "Podrás compartir enlaces cuando termine la configuración."
  ],
  "Your form is still here. Please retry the connection.": [
    "你填写的内容还在。请重试连接。",
    "Tu formulario sigue aquí. Vuelve a intentar la conexión."
  ],
  "Retry Connection": [
    "重试连接",
    "Reintentar conexión"
  ],
  "Creating your event…": [
    "正在创建活动……",
    "Creando tu evento…"
  ],
  "Checking connection…": [
    "正在检查连接……",
    "Comprobando conexión…"
  ],
  "Create Event & Get a Link": [
    "创建活动并获取链接",
    "Crear evento y obtener enlace"
  ],
  "ORGANIZED BY {name}": [
    "组织者：{name}",
    "ORGANIZADO POR {name}"
  ],
  "{count} response": [
    "{count} 人已回复",
    "{count} respuesta"
  ],
  "{count} responses": [
    "{count} 人已回复",
    "{count} respuestas"
  ],
  "Saving…": [
    "正在保存……",
    "Guardando…"
  ],
  "Enter your name": [
    "输入你的姓名",
    "Escribe tu nombre"
  ],
  "Save Availability": [
    "保存空闲时间",
    "Guardar disponibilidad"
  ],
  "Times shown in {zone}": [
    "时间显示为：{zone}",
    "Horas en {zone}"
  ],

  "No Shared Times Yet": [
    "暂时没有共同时间",
    "Aún no hay horas en común"
  ],
  "The Possibilities Start With You.": [
    "从你的空闲时间开始。",
    "Todo empieza contigo."
  ],
  "Add more availability to find a time that works.": [
    "多选一些空闲时间，帮助找到合适的时段。",
    "Añade más disponibilidad para encontrar una hora adecuada."
  ],
  "Mark your availability, then share the event with your group.": [
    "先标记空闲时间，再把活动分享给大家。",
    "Marca cuándo estás libre y comparte el evento con el grupo."
  ],

  "Everyone available": [
    "所有人都有空",
    "Todos disponibles"
  ],
  "{count} of {total} available": [
    "{total} 人中有 {count} 人有空",
    "{count} de {total} disponibles"
  ],
  "Available": [
    "有空",
    "Disponible"
  ],
  "Unavailable": [
    "没空",
    "No disponible"
  ],
  "Refresh responses": [
    "刷新回复",
    "Actualizar respuestas"
  ],
  "(you)": [
    "（你）",
    "(tú)"
  ],
  "Responses will appear here. Anyone who hasn’t responded is not counted as unavailable.": [
    "回复会显示在这里。未回复的人不会被算作没空。",
    "Las respuestas aparecerán aquí. Quienes aún no responden no se cuentan como no disponibles."
  ],
  "Close sharing": [
    "关闭分享窗口",
    "Cerrar ventana para compartir"
  ],

  "Link Copied": [
    "链接已复制",
    "Enlace copiado"
  ],
  "Copy Event Link": [
    "复制活动链接",
    "Copiar enlace del evento"
  ],


  "Copied": [
    "已复制",
    "Copiado"
  ],

  "Back to Home": [
    "返回首页",
    "Volver al inicio"
  ],
  "Finding your shared time…": [
    "正在查找共同时间……",
    "Buscando sus horas en común…"
  ],
  "Choose at least one date on the calendar.": [
    "请在日历上至少选择一个日期。",
    "Elige al menos una fecha en el calendario."
  ],
  "Choose an end time after the start time.": [
    "结束时间必须晚于开始时间。",
    "Elige una hora de fin posterior al inicio."
  ],
  "Could not create your event. Please try again.": [
    "无法创建活动，请重试。",
    "No se pudo crear el evento. Inténtalo de nuevo."
  ],
  "Could not load this event.": [
    "无法加载此活动。",
    "No se pudo cargar este evento."
  ],
  "Copy did not work. Select the link in the sharing panel and copy it manually.": [
    "复制失败。请在分享窗口中选中链接并手动复制。",
    "No se pudo copiar. Selecciona el enlace en la ventana y cópialo manualmente."
  ],
  "Your availability grid": [
    "你的空闲时间表",
    "Tu cuadrícula de disponibilidad"
  ],
  "Clear": [
    "清除",
    "Borrar"
  ],
  "Undo selection": [
    "撤销选择",
    "Deshacer selección"
  ],
  "Smaller time slots": [
    "缩小时间格",
    "Reducir casillas"
  ],
  "Larger time slots": [
    "放大时间格",
    "Ampliar casillas"
  ],
  "Previous days": [
    "前几天",
    "Días anteriores"
  ],
  "Next days": [
    "后几天",
    "Días siguientes"
  ],
  "again": [
    "再次",
    "repetida"
  ],
  "not selected": [
    "未选择",
    "sin seleccionar"
  ],
  "Previous month": [
    "上个月",
    "Mes anterior"
  ],
  "Next month": [
    "下个月",
    "Mes siguiente"
  ],
  "{count} date selected": [
    "已选择 {count} 个日期",
    "{count} fecha seleccionada"
  ],
  "{count} dates selected": [
    "已选择 {count} 个日期",
    "{count} fechas seleccionadas"
  ],
  "Your Time Zone · Detected": [
    "你的时区 · 自动检测",
    "Tu zona horaria · detectada"
  ],
  "Your Time Zone · Selected": [
    "你的时区 · 手动选择",
    "Tu zona horaria · seleccionada"
  ],
  "Choose your time zone": [
    "选择你的时区",
    "Elige tu zona horaria"
  ],
  "Search time zones": [
    "搜索时区",
    "Buscar zonas horarias"
  ],
  "Search a city or time zone": [
    "搜索城市或时区",
    "Busca una ciudad o zona horaria"
  ],
  "Close time zones": [
    "关闭时区选择",
    "Cerrar selector de zonas"
  ],
  "Use Device Time Zone": [
    "使用设备时区",
    "Usar zona del dispositivo"
  ],
  "No time zones found. Try a nearby major city.": [
    "未找到时区。请试试附近的大城市。",
    "No encontramos esa zona. Prueba con una ciudad grande cercana."
  ],
  "Los Angeles": [
    "洛杉矶",
    "Los Ángeles"
  ],
  "New York": [
    "纽约",
    "Nueva York"
  ],
  "Chicago": [
    "芝加哥",
    "Chicago"
  ],
  "Denver": [
    "丹佛",
    "Denver"
  ],
  "London": [
    "伦敦",
    "Londres"
  ],
  "Paris": [
    "巴黎",
    "París"
  ],
  "Shanghai": [
    "上海",
    "Shanghái"
  ],
  "Tokyo": [
    "东京",
    "Tokio"
  ],
  "Kolkata": [
    "加尔各答",
    "Calcuta"
  ],
  "Sydney": [
    "悉尼",
    "Sídney"
  ],
  "We couldn’t reach Whenkin. Please check your connection and try again.": [
    "无法连接 Whenkin。请检查网络连接后重试。",
    "No pudimos conectar con Whenkin. Comprueba tu conexión e inténtalo de nuevo."
  ],
  "Event saving is not available at this address yet. Please try again once setup is complete.": [
    "此地址尚未启用活动保存。请在配置完成后重试。",
    "Aún no se pueden guardar eventos en esta dirección. Inténtalo cuando termine la configuración."
  ],
  "Something went wrong. Please try again.": [
    "出了点问题，请重试。",
    "Algo salió mal. Inténtalo de nuevo."
  ],
  "This event or response could not be found.": [
    "找不到此活动或回复。",
    "No se encontró este evento o respuesta."
  ],
  "Please enter an event name (100 characters or fewer).": [
    "请输入活动名称（不超过 100 个字符）。",
    "Escribe un nombre para el evento (hasta 100 caracteres)."
  ],
  "Please enter your name (60 characters or fewer).": [
    "请输入姓名（不超过 60 个字符）。",
    "Escribe tu nombre (hasta 60 caracteres)."
  ],
  "Please enter a description (1000 characters or fewer).": [
    "请输入活动说明（不超过 1000 个字符）。",
    "Escribe una descripción (hasta 1000 caracteres)."
  ],
  "Please include your event information.": [
    "请填写活动信息。",
    "Incluye la información del evento."
  ],
  "This request is too large. Please choose fewer dates.": [
    "提交内容过多。请减少所选日期。",
    "La solicitud es demasiado grande. Elige menos fechas."
  ],
  "The information could not be read. Please try again.": [
    "无法读取提交的信息，请重试。",
    "No pudimos leer la información. Inténtalo de nuevo."
  ],
  "Please choose a valid time zone.": [
    "请选择有效的时区。",
    "Elige una zona horaria válida."
  ],

  "Choose between 1 and 31 different dates.": [
    "请选择 1 至 31 个不同的日期。",
    "Elige entre 1 y 31 fechas diferentes."
  ],
  "The end time must be after the start time on the same day.": [
    "结束时间必须晚于同一天的开始时间。",
    "La hora de fin debe ser posterior al inicio en el mismo día."
  ],
  "Please choose valid dates.": [
    "请选择有效的日期。",
    "Elige fechas válidas."
  ],
  "Choose dates from today through December 31, 2050.": [
    "请选择今天至 2050 年 12 月 31 日之间的日期。",
    "Elige fechas desde hoy hasta el 31 de diciembre de 2050."
  ],

  "A chosen time is invalid or repeats during a daylight saving change. Choose a different start or end time.": [
    "所选时间在夏令时切换时无效或重复。请选择其他开始或结束时间。",
    "Una hora elegida no existe o se repite por el cambio de horario. Elige otra hora de inicio o fin."
  ],
  "Please choose valid availability.": [
    "请选择有效的空闲时间。",
    "Elige una disponibilidad válida."
  ],
  "Availability needs a date, time, and time-zone offset.": [
    "空闲时间需要包含日期、时间和时区偏移。",
    "La disponibilidad debe incluir fecha, hora y diferencia de zona horaria."
  ],
  "Please select complete 15-minute intervals.": [
    "请选择完整的 15 分钟时段。",
    "Selecciona intervalos completos de 15 minutos."
  ],
  "Too many overlapping selections. Please reload and try again.": [
    "重叠选择过多。请刷新后重试。",
    "Hay demasiadas selecciones superpuestas. Recarga e inténtalo de nuevo."
  ],
  "Some selected times are outside this event. Reload the event and try again.": [
    "部分所选时段超出了活动范围。请刷新活动后重试。",
    "Algunas horas están fuera del evento. Recarga e inténtalo de nuevo."
  ],
  "Whenkin is not connected to its database yet. Please try again once setup is complete.": [
    "Whenkin 尚未连接数据库。请在配置完成后重试。",
    "Whenkin aún no está conectado a la base de datos. Inténtalo cuando termine la configuración."
  ],
  "Please make changes from the Whenkin website.": [
    "请通过 Whenkin 网站进行修改。",
    "Haz los cambios desde el sitio web de Whenkin."
  ],
  "Too many changes at once. Please wait a minute and try again.": [
    "操作过于频繁。请稍等一分钟后重试。",
    "Hay demasiados cambios a la vez. Espera un minuto e inténtalo de nuevo."
  ],
  "This event could not be found. Check the link with its organizer.": [
    "找不到此活动。请向组织者确认链接。",
    "No encontramos este evento. Comprueba el enlace con quien lo organiza."
  ],
  "Please reload this response and choose a valid time zone.": [
    "请刷新回复并选择有效的时区。",
    "Recarga esta respuesta y elige una zona horaria válida."
  ],

  "Choose a meeting time within the event dates.": [
    "请选择活动日期范围内的时间。",
    "Elige una hora dentro de las fechas del evento."
  ],

  "This action could not be found.": [
    "找不到此操作。",
    "No encontramos esta acción."
  ],
  "Your change could not be saved. Please try again in a moment.": [
    "无法保存更改。请稍后重试。",
    "No se pudo guardar el cambio. Inténtalo de nuevo en un momento."
  ],

  "Leave without saving your changes?": [
    "要放弃保存这些更改并离开吗？",
    "¿Quieres salir sin guardar tus cambios?"
  ],
  "Keep Editing": [
    "继续编辑",
    "Seguir editando"
  ],
  "Leave Without Saving": [
    "不保存并离开",
    "Salir sin guardar"
  ],
  "Partly available": [
    "部分时段有空",
    "Disponibilidad parcial"
  ],
  "We compare availability. The organizer shares the chosen time.": [
    "我们对比空闲时间，由组织者在群聊等渠道通知最终时间。",
    "Comparamos la disponibilidad. El organizador comunica el horario elegido."
  ],
  "Find a Time.": [
    "找到时间。",
    "Encuentra un Momento."
  ],
  "Make It Happen.": [
    "让相聚成行。",
    "Hazlo Realidad."
  ],
  "Create Your Event": [
    "创建你的活动",
    "Crea tu Evento"
  ],
  "Your Common Ground": [
    "大家的共同时间",
    "Tus Horarios en Común"
  ],
  "The Group": [
    "参与者",
    "El Grupo"
  ],
  "Who Can Make It?": [
    "谁能参加？",
    "¿Quién Puede Asistir?"
  ],
  "That Page Is a Little Off-Grid.": [
    "找不到这个页面。",
    "Esta Página No Está Disponible."
  ],
  "We Couldn’t Open That Event.": [
    "无法打开此活动。",
    "No Pudimos Abrir Ese Evento."
  ],
  "Your Availability Hasn't Been Saved.": [
    "你的空闲时间尚未保存。",
    "Tu Disponibilidad No Se Ha Guardado."
  ],
  "Your Event Has Not Been Saved.": [
    "你的活动尚未保存。",
    "Tu Evento No Se Ha Guardado."
  ],
  "Find Your Shared Time.": [
    "找到大家的共同时间。",
    "Encuentra un Momento para Todos."
  ],
  "The Organizer Creates an Event": [
    "组织者创建活动",
    "El Organizador Crea un Evento"
  ],
  "Participants Mark When They’re Free": [
    "参与者标记空闲时间",
    "Los Participantes Marcan Cuándo Están Libres"
  ],
  "Whenkin Suggests the Best Times": [
    "Whenkin 推荐合适的时间",
    "Whenkin Sugiere los Mejores Horarios"
  ]
,"Share Event":["分享活动","Compartir Evento"]
,"The event schedule changed. Reload before saving your changes.":["活动安排已更改。请重新加载后再保存。","El horario del evento cambió. Vuelve a cargar la página antes de guardar."]
,"Terms of Use":["使用条款","Condiciones de Uso"]
,"Privacy Policy":["隐私政策","Política de Privacidad"]
,"Legal Information":["法律信息","Información Legal"]
,"Back to Whenkin":["返回 Whenkin","Volver a Whenkin"]
,"Effective Date":["生效日期","Fecha de Entrada en Vigor"]
,"On This Page":["本页内容","En Esta Página"]
,"Provider Information":["服务提供商信息","Información de Proveedores"]
,"Contact Us":["联系我们","Contáctanos"]
};
const locales = { en: 'en-US', zh: 'zh-CN', es: 'es-ES' } as const;
export const isLanguage = (value: unknown): value is Language => value === 'en' || value === 'zh' || value === 'es';
function readLanguage(): Language {
  try { const value = localStorage.getItem('whenkin:language'); return isLanguage(value) ? value : 'en'; } catch { return 'en'; }
}
let language: Language = readLanguage();
const listeners = new Set<() => void>();
export function getLanguage() { return language; }
export function getLocale() { return locales[language]; }
export function setLanguage(next: Language) {
  if (!isLanguage(next) || next === language) return;
  language = next;
  try { localStorage.setItem('whenkin:language', next); } catch { /* Language switching also works without storage. */ }
  listeners.forEach(listener => listener());
}
export function subscribeLanguage(listener: () => void) {
  listeners.add(listener);
  const sync = (event: StorageEvent) => { if (event.key === 'whenkin:language') { language = readLanguage(); listeners.forEach(fn => fn()); } };
  if (typeof window !== 'undefined') window.addEventListener('storage', sync);
  return () => { listeners.delete(listener); if (typeof window !== 'undefined') window.removeEventListener('storage', sync); };
}
export function t(message: string, values: Record<string, string | number> = {}) {
  const translated = language === 'en' ? message : messages[message]?.[language === 'zh' ? 0 : 1] ?? message;
  return translated.replace(/\{(\w+)\}/g, (placeholder, key: string) => typeof values[key] === 'number' ? new Intl.NumberFormat(getLocale()).format(values[key]) : String(values[key] ?? placeholder));
}
