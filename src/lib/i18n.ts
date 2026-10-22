// English is the default. Chinese uses Simplified Chinese.
export type Language = 'en' | 'zh' | 'es';
export const languageOptions: { value: Language; label: string }[] = [
  { value: 'en', label: 'English' }, { value: 'zh', label: '简体中文' }, { value: 'es', label: 'Español' },
];
export const messages: Record<string, [string, string]> = {
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
  "New event": [
    "新建活动",
    "Nuevo evento"
  ],
  "Made for people, wherever they are.": [
    "无论身在何处，都能轻松相聚。",
    "Para personas, estén donde estén."
  ],
  "That page is a little off-grid.": [
    "找不到这个页面。",
    "No encontramos esta página."
  ],
  "Create an event": [
    "创建活动",
    "Crear un evento"
  ],
  "The organizer creates an event": [
    "组织者创建活动",
    "La persona que organiza crea un evento"
  ],
  "Choose possible dates and hours, then share the link.": [
    "选择可能合适的日期和时段，然后分享链接。",
    "Elige posibles fechas y horas y comparte el enlace."
  ],
  "Participants mark when they’re free": [
    "参与者标记空闲时间",
    "Los participantes marcan cuándo están libres"
  ],
  "Open the link and drag across the time grid. No account needed.": [
    "打开链接，在时间表上拖动选择。无需注册。",
    "Abre el enlace y arrastra por la cuadrícula. No necesitas una cuenta."
  ],
  "Whenkin suggests the best times": [
    "Whenkin 推荐合适的时间",
    "Whenkin sugiere las mejores horas"
  ],
  "We compare everyone’s availability. The organizer confirms a time.": [
    "我们对比所有人的空闲时间，由组织者确认最终时间。",
    "Comparamos la disponibilidad de todos. Quien organiza confirma una hora."
  ],
  "Midnight (next day)": [
    "午夜（次日）",
    "Medianoche (día siguiente)"
  ],
  "LESS BACK-AND-FORTH. MORE TOGETHER.": [
    "少些来回沟通，多些相聚时光。",
    "MENOS MENSAJES. MÁS ENCUENTROS."
  ],
  "Find a time.": [
    "找到时间。",
    "Encuentra una hora."
  ],
  "Make it happen.": [
    "让相聚成行。",
    "Haz que suceda."
  ],
  "No sign-up needed": [
    "无需注册",
    "Sin registro"
  ],
  "Every time zone welcome": [
    "跨时区也轻松",
    "Para cualquier zona horaria"
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
  "LET’S GET SOMETHING ON THE CALENDAR": [
    "把相聚提上日程",
    "HAGAMOS HUECO EN EL CALENDARIO"
  ],
  "Create your event": [
    "创建你的活动",
    "Crea tu evento"
  ],
  "What are you planning?": [
    "你想安排什么活动？",
    "¿Qué estás organizando?"
  ],
  "e.g. Friday dinner, team catch-up…": [
    "例如：周五聚餐、团队交流……",
    "Por ejemplo: cena del viernes, reunión del equipo…"
  ],
  "Your name": [
    "你的姓名",
    "Tu nombre"
  ],
  "So everyone knows who’s organizing": [
    "让大家知道是谁发起的",
    "Para que sepan quién lo organiza"
  ],
  "A little more detail": [
    "补充一些细节",
    "Un poco más de detalle"
  ],
  "optional": [
    "选填",
    "opcional"
  ],
  "Where, what, or anything people should know": [
    "地点、内容，或其他需要说明的信息",
    "Lugar, detalles o algo que deban saber"
  ],
  "Add a note": [
    "添加备注",
    "Añadir una nota"
  ],
  "Which dates could work?": [
    "哪些日期可能合适？",
    "¿Qué fechas podrían servir?"
  ],
  "Pick one or more": [
    "可多选",
    "Elige una o varias"
  ],
  "From": [
    "开始",
    "Desde"
  ],
  "Until": [
    "结束",
    "Hasta"
  ],
  "To": [
    "结束",
    "Hasta"
  ],
  "Meeting length": [
    "活动时长",
    "Duración"
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
  "Dates and hours above use this time zone. Your guests will see their own local times.": [
    "以上日期和时段使用此时区。参与者会看到各自的当地时间。",
    "Estas fechas y horas usan esta zona horaria. Los participantes verán su hora local."
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
  "Retry connection": [
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
  "Create event & get a link": [
    "创建活动并获取链接",
    "Crear evento y obtener enlace"
  ],
  "Anyone with your event link can view the group’s availability.": [
    "任何持有活动链接的人都可以查看大家的空闲时间。",
    "Cualquier persona con el enlace puede ver la disponibilidad del grupo."
  ],
  "YOUR EVENT": [
    "你的活动",
    "TU EVENTO"
  ],
  "ORGANIZED BY {name}": [
    "组织者：{name}",
    "ORGANIZADO POR {name}"
  ],
  "{count} minutes": [
    "{count} 分钟",
    "{count} minutos"
  ],
  "{count} response": [
    "{count} 人已回复",
    "{count} respuesta"
  ],
  "{count} responses": [
    "{count} 人已回复",
    "{count} respuestas"
  ],
  "Share event": [
    "分享活动",
    "Compartir evento"
  ],
  "It’s a date.": [
    "时间定好了。",
    "Ya tenemos fecha."
  ],
  "Add to calendar": [
    "添加到日历",
    "Añadir al calendario"
  ],
  "Reopen scheduling": [
    "重新选择时间",
    "Volver a elegir hora"
  ],
  "Your availability": [
    "你的空闲时间",
    "Tu disponibilidad"
  ],
  "Group availability": [
    "大家的空闲时间",
    "Disponibilidad del grupo"
  ],
  "Saved": [
    "已保存",
    "Guardado"
  ],
  "Not submitted yet": [
    "尚未提交",
    "Sin enviar"
  ],
  "Saving…": [
    "正在保存……",
    "Guardando…"
  ],
  "Unsaved changes": [
    "有未保存的更改",
    "Cambios sin guardar"
  ],
  "Not saved": [
    "未保存",
    "Sin guardar"
  ],
  "You have an unsaved draft on this device.": [
    "此设备上有一份未保存的草稿。",
    "Tienes un borrador sin guardar en este dispositivo."
  ],
  "Restore draft": [
    "恢复草稿",
    "Recuperar borrador"
  ],
  "Dismiss draft": [
    "关闭草稿提示",
    "Cerrar aviso del borrador"
  ],
  "Enter your name": [
    "输入你的姓名",
    "Escribe tu nombre"
  ],
  "{count} hours selected": [
    "已选择 {count} 小时",
    "{count} horas seleccionadas"
  ],
  "Your edit link keeps your response yours.": [
    "只有持有你的编辑链接才能修改你的回复。",
    "Tu enlace privado te permite editar tu respuesta."
  ],
  "No account needed. Your response is editable on this device.": [
    "无需注册。你可以在此设备上修改回复。",
    "No necesitas una cuenta. Puedes editar tu respuesta en este dispositivo."
  ],
  "Save availability": [
    "保存空闲时间",
    "Guardar disponibilidad"
  ],
  "Copied private edit link": [
    "已复制私人编辑链接",
    "Enlace privado copiado"
  ],
  "Copy my private edit link": [
    "复制我的私人编辑链接",
    "Copiar mi enlace privado"
  ],
  "Save this link to edit from another device.": [
    "保留此链接，以便在其他设备上编辑。",
    "Guarda este enlace para editar desde otro dispositivo."
  ],
  "Your common ground": [
    "大家的共同时间",
    "Sus horas en común"
  ],
  "Best {count}-minute times, based on everyone who has responded.": [
    "根据已回复的人，推荐适合 {count} 分钟活动的时段。",
    "Las mejores opciones de {count} minutos según las respuestas recibidas."
  ],
  "Times shown in {zone}": [
    "时间显示为：{zone}",
    "Horas en {zone}"
  ],
  "Use organizer’s zone": [
    "使用组织者时区",
    "Usar la zona de quien organiza"
  ],
  "No shared times yet": [
    "暂时没有共同时间",
    "Aún no hay horas en común"
  ],
  "The possibilities start with you.": [
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
  "Best fit": [
    "最合适",
    "Mejor opción"
  ],
  "Everyone available": [
    "所有人都有空",
    "Todos disponibles"
  ],
  "{count} of {total} available": [
    "{total} 人中有 {count} 人有空",
    "{count} de {total} disponibles"
  ],
  "Show more times": [
    "显示更多时段",
    "Ver más horas"
  ],
  "Who can make it?": [
    "谁能参加？",
    "¿Quién puede asistir?"
  ],
  "Available": [
    "有空",
    "Disponible"
  ],
  "Unavailable": [
    "没空",
    "No disponible"
  ],
  "Confirming…": [
    "正在确认……",
    "Confirmando…"
  ],
  "Confirm this time": [
    "确认此时间",
    "Confirmar esta hora"
  ],
  "The group": [
    "参与者",
    "El grupo"
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
  "Responded · people without a response aren’t counted": [
    "已回复 · 未回复的人不参与统计",
    "Respuestas recibidas · no se cuenta a quienes aún no responden"
  ],
  "Close sharing": [
    "关闭分享窗口",
    "Cerrar ventana para compartir"
  ],
  "Good plans are shared.": [
    "好计划，一起分享。",
    "Los buenos planes se comparten."
  ],
  "Send this link to your group. Everyone can add their availability without an account.": [
    "把此链接发给大家。每个人都能填写空闲时间，无需注册。",
    "Envía este enlace al grupo. Todos pueden indicar cuándo están libres sin crear una cuenta."
  ],
  "Participant link": [
    "参与者链接",
    "Enlace para participantes"
  ],
  "Link copied": [
    "链接已复制",
    "Enlace copiado"
  ],
  "Copy event link": [
    "复制活动链接",
    "Copiar enlace del evento"
  ],
  "Just for you": [
    "仅限你使用",
    "Solo para ti"
  ],
  "Keep your organizer link private. It lets you confirm the final time.": [
    "请妥善保管组织者链接。持有此链接即可确认最终时间。",
    "No compartas tu enlace de organización. Permite confirmar la hora final."
  ],
  "Private organizer link": [
    "私人组织者链接",
    "Enlace privado de organización"
  ],
  "Copied": [
    "已复制",
    "Copiado"
  ],
  "Copy organizer link": [
    "复制组织者链接",
    "Copiar enlace de organización"
  ],
  "We couldn’t open that event.": [
    "无法打开此活动。",
    "No pudimos abrir este evento."
  ],
  "Back to home": [
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
  "Enter your name so the group knows whose availability this is.": [
    "请输入姓名，让大家知道这是谁的空闲时间。",
    "Escribe tu nombre para que el grupo sepa de quién es esta disponibilidad."
  ],
  "Could not save. Your draft stays on this device.": [
    "无法保存。草稿仍保留在此设备上。",
    "No se pudo guardar. Tu borrador sigue en este dispositivo."
  ],
  "Could not confirm this time.": [
    "无法确认此时间。",
    "No se pudo confirmar esta hora."
  ],
  "Copy did not work. Select the link in the sharing panel and copy it manually.": [
    "复制失败。请在分享窗口中选中链接并手动复制。",
    "No se pudo copiar. Selecciona el enlace en la ventana y cópialo manualmente."
  ],
  "Your availability grid": [
    "你的空闲时间表",
    "Tu cuadrícula de disponibilidad"
  ],
  "Group availability grid": [
    "大家的空闲时间表",
    "Cuadrícula de disponibilidad del grupo"
  ],
  "Mark": [
    "标记",
    "Marcar"
  ],
  "Clear": [
    "清除",
    "Borrar"
  ],
  "Scroll": [
    "滚动",
    "Desplazar"
  ],
  "More people available": [
    "更多人有空",
    "Más personas disponibles"
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
  "Each number shows how many respondents are free for that 15-minute slot.": [
    "每个数字表示在该 15 分钟时段内有多少位已回复者有空。",
    "Cada número indica cuántas personas están libres en ese intervalo de 15 minutos."
  ],
  "Scroll mode is on. Choose Mark to paint your free time.": [
    "已启用滚动模式。选择“标记”以涂选空闲时间。",
    "El modo Desplazar está activado. Elige Marcar para indicar tus horas libres."
  ],
  "Drag across the grid to mark 15-minute slots. Use + for more room, or Scroll to move around.": [
    "拖动选择每个 15 分钟时段。点击 + 放大，或选择“滚动”移动时间表。",
    "Arrastra para marcar intervalos de 15 minutos. Usa + para ampliarlos o Desplazar para moverte."
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
  "Fine-tune your last selection": [
    "微调刚才选择的时段",
    "Ajusta tu última selección"
  ],
  "Adjust selection start": [
    "调整开始时间",
    "Ajustar el inicio de la selección"
  ],
  "Adjust selection end": [
    "调整结束时间",
    "Ajustar el fin de la selección"
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
  "Select the dates that could work": [
    "选择可能合适的日期",
    "Elige las fechas que podrían servir"
  ],
  "Your time zone · detected": [
    "你的时区 · 自动检测",
    "Tu zona horaria · detectada"
  ],
  "Your time zone · selected": [
    "你的时区 · 手动选择",
    "Tu zona horaria · seleccionada"
  ],
  "Choose your time zone": [
    "选择你的时区",
    "Elige tu zona horaria"
  ],
  "Search by city or time zone": [
    "搜索城市或时区",
    "Buscar por ciudad o zona horaria"
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
  "Use device time zone": [
    "使用设备时区",
    "Usar zona del dispositivo"
  ],
  "This device reports: {zone}. No location access needed.": [
    "设备设置的时区：{zone}。无需获取位置信息。",
    "Zona del dispositivo: {zone}. No necesitamos acceder a tu ubicación."
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
  "Choose a meeting length between 15 minutes and 4 hours.": [
    "请选择 15 分钟至 4 小时之间的活动时长。",
    "Elige una duración entre 15 minutos y 4 horas."
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
  "Choose dates between today and one year from now.": [
    "请选择从今天起一年内的日期。",
    "Elige fechas entre hoy y dentro de un año."
  ],
  "The time window must be at least as long as the meeting.": [
    "所选时段不能短于活动时长。",
    "El intervalo debe durar al menos lo mismo que la reunión."
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
  "Use your private edit link to change this response.": [
    "请使用你的私人编辑链接修改回复。",
    "Usa tu enlace privado para editar esta respuesta."
  ],
  "Please reload this response and choose a valid time zone.": [
    "请刷新回复并选择有效的时区。",
    "Recarga esta respuesta y elige una zona horaria válida."
  ],
  "This response changed in another tab. Your draft is kept here. Reload before saving again.": [
    "此回复已在另一个标签页中更改。草稿仍保存在这里，请刷新后再保存。",
    "Esta respuesta cambió en otra pestaña. Tu borrador sigue aquí. Recarga antes de guardar de nuevo."
  ],
  "Only the organizer can confirm the final time. Use the organizer link.": [
    "只有组织者可以确认最终时间。请使用组织者链接。",
    "Solo quien organiza puede confirmar la hora final. Usa el enlace de organización."
  ],
  "Choose a meeting time within the event dates.": [
    "请选择活动日期范围内的时间。",
    "Elige una hora dentro de las fechas del evento."
  ],
  "The organizer has not confirmed a time yet.": [
    "组织者尚未确认最终时间。",
    "Aún no se ha confirmado una hora."
  ],
  "This action could not be found.": [
    "找不到此操作。",
    "No encontramos esta acción."
  ],
  "Your change could not be saved. Please try again in a moment.": [
    "无法保存更改。请稍后重试。",
    "No se pudo guardar el cambio. Inténtalo de nuevo en un momento."
  ],
  "Enter your name to save your availability.": [
    "请输入姓名以保存你的空闲时间。",
    "Escribe tu nombre para guardar tu disponibilidad."
  ],
  "Please enter your name.": [
    "请输入你的姓名。",
    "Escribe tu nombre."
  ],
  "Let participants see group availability": [
    "允许参与者查看大家的空闲时间",
    "Permitir que los participantes vean la disponibilidad del grupo"
  ],
  "Participants can see everyone’s availability and common ground.": [
    "参与者可以查看所有人的空闲时间和共同空闲时段。",
    "Los participantes pueden ver la disponibilidad de todos y los horarios en común."
  ],
  "Participants can see only their own availability and the response count.": [
    "参与者只能查看自己的空闲时间和回复人数。",
    "Los participantes solo pueden ver su propia disponibilidad y el número de respuestas."
  ],
  "Participants see only their own availability unless you enable group sharing.": [
    "默认仅组织者可查看大家的空闲时间，可手动开启共享。",
    "Solo tú ves la disponibilidad del grupo, salvo que actives el uso compartido."
  ],
  "Keep your organizer link private. It lets you view all responses and manage group sharing.": [
    "请妥善保管组织者链接，用于查看全部回复并管理共享设置。",
    "Mantén privado tu enlace de organizador. Permite ver todas las respuestas y gestionar el uso compartido."
  ],
  "Use your private organizer link to manage this event.": [
    "请使用你的组织者私密链接管理此活动。",
    "Usa tu enlace privado de organizador para gestionar este evento."
  ],
  "Choose whether participants can see group availability.": [
    "请选择是否允许参与者查看大家的空闲时间。",
    "Elige si los participantes pueden ver la disponibilidad del grupo."
  ],
  "Leave without saving your changes?": [
    "要放弃保存这些更改并离开吗？",
    "¿Quieres salir sin guardar tus cambios?"
  ],
  "Keep editing": [
    "继续编辑",
    "Seguir editando"
  ],
  "Leave without saving": [
    "不保存并离开",
    "Salir sin guardar"
  ],
  "Partly available": [
    "部分时段有空",
    "Disponibilidad parcial"
  ],
  "Each number shows how many respondents are free for the whole 30-minute block.": [
    "每个数字表示在整个30分钟时段内都有空的回复人数。",
    "Cada número indica cuántas personas están libres durante todo el bloque de 30 minutos."
  ],
  "Mark 30-minute blocks. Fine-tune your selection in 15-minute steps, or use Scroll to move around.": [
    "选择30分钟时段，再以15分钟为单位微调。使用“滚动”浏览时间表。",
    "Marca bloques de 30 minutos. Ajusta la selección en pasos de 15 minutos o usa Desplazar para moverte."
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
  "Your Availability": [
    "你的空闲时间",
    "Tu Disponibilidad"
  ],
  "Group Availability": [
    "大家的空闲时间",
    "Disponibilidad del Grupo"
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
  "Good Plans Are Shared.": [
    "好计划，一起分享。",
    "Los Buenos Planes Se Comparten."
  ],
  "Fine-Tune Your Last Selection": [
    "微调刚才选择的时段",
    "Ajusta tu Última Selección"
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
