/** ES terms and privacy text. */
import type {
  LegalDocument,
  LegalKind,
} from './legal';

export const esLegalDocuments: Record<LegalKind, LegalDocument> = {
  terms: {
    title: 'Condiciones de Uso',
    summary:
      'Whenkin ayuda a compartir disponibilidad y encontrar un momento para reunirse. Estas condiciones explican las responsabilidades de usar el servicio.',
    sections: [
      {
        title: 'Acerca de Whenkin',
        paragraphs: [
          'UCSD CSSA, en Estados Unidos, opera Whenkin. Al crear un evento o enviar tu disponibilidad, aceptas estas condiciones. Si no estás de acuerdo, no crees eventos ni envíes respuestas. Para consultas, escribe a j4ouyang@ucsd.edu.',
        ],
      },
      {
        title: 'Quién Puede Usar Whenkin',
        paragraphs: [
          'Debes tener al menos 13 años y cumplir cualquier edad mínima superior exigida donde vivas. Si no has alcanzado la mayoría de edad legal, usa Whenkin con permiso de tu padre, madre o tutor. Whenkin no está dirigido a menores de 13 años.',
        ],
      },
      {
        title: 'Tus Eventos y Respuestas',
        paragraphs: [
          'Comparte solo información que tengas derecho a facilitar. Usa un nombre que tu organizador reconozca; no se exige tu nombre legal. No suplantes a otras personas ni incluyas datos sensibles, como historiales médicos, datos financieros, contraseñas o identificadores oficiales, en títulos o notas.',
          'Conservas tus derechos sobre tu contenido. Nos autorizas, junto con nuestros proveedores, a almacenarlo, mostrarlo y tratarlo en la medida necesaria para operar Whenkin, calcular sugerencias, prestar asistencia o cumplir obligaciones legales.',
        ],
      },
      {
        title: 'Enlaces Compartidos y Edición',
        paragraphs: [
          'Todos los que tengan el enlace del evento pueden ver los detalles, las respuestas guardadas, los nombres, las zonas horarias, la disponibilidad y los horarios comunes. También pueden editar cualquier respuesta seleccionando a una persona en Participantes que Respondieron. Esto se aplica también a los eventos existentes. Comparte el enlace con las personas con quienes quieras colaborar.',
        ],
      },
      {
        title: 'Uso Aceptable',
        paragraphs: [
          'No uses Whenkin para actividades ilegales, acoso, spam o recopilación no autorizada de información. Usa la edición compartida de forma responsable. No falsifiques respuestas, eludas protecciones ni sobrecargues el servicio. Podemos restringir usos abusivos o retirar contenido ilícito conforme a la ley.',
        ],
      },
      {
        title: 'Sugerencias y Disponibilidad del Servicio',
        paragraphs: [
          'Los horarios comunes muestran solo periodos en los que todos los que respondieron están libres de principio a fin. Las sugerencias reflejan las respuestas guardadas y no garantizan asistencia. Comprueba fechas, zonas horarias y el acuerdo final con el grupo. El organizador comunica la hora elegida fuera de Whenkin.',
          'Whenkin es gratuito actualmente. Las funciones y la disponibilidad pueden cambiar, y pueden producirse interrupciones o pérdidas de datos. Guarda tu propia copia de los acuerdos importantes. En la medida permitida por la ley, el servicio se ofrece según disponibilidad, sin garantía de funcionamiento continuo ni libre de errores. No está destinado a emergencias ni a usos que exijan disponibilidad garantizada.',
        ],
      },
      {
        title: 'Tus Derechos Legales',
        paragraphs: [
          'Nada en estas condiciones excluye responsabilidades o derechos que la ley aplicable no permita excluir. Cuando la ley lo permita, UCSD CSSA no responde de pérdidas indirectas o consecuentes derivadas del uso de Whenkin. Estas condiciones no imponen arbitraje obligatorio ni renuncias a derechos legales del consumidor.',
        ],
      },
      {
        title: 'Privacidad, Cambios y Contacto',
        paragraphs: [
          'Nuestra Política de Privacidad explica el tratamiento de la información. Puedes dejar de usar Whenkin en cualquier momento y escribir a j4ouyang@ucsd.edu sobre tus datos o estas condiciones.',
          'Publicaremos las condiciones revisadas con una nueva fecha de entrada en vigor. Los cambios se aplican hacia el futuro; cuando lo exija la ley, daremos aviso adicional o solicitaremos aceptación.',
        ],
      },
    ],
  },
  privacy: {
    title: 'Política de Privacidad',
    summary:
      'Tu disponibilidad ayuda a organizar al grupo. Aquí explicamos qué recopila Whenkin, quién puede verlo y cómo solicitar cambios o eliminación.',
    sections: [
      {
        title: 'Quién Es Responsable',
        paragraphs: [
          'UCSD CSSA, en Estados Unidos, opera Whenkin y es responsable de la información descrita aquí. Escribe a j4ouyang@ucsd.edu para consultas o solicitudes de privacidad. Esta política cubre Whenkin, no otros sitios a los que accedas desde él.',
        ],
      },
      {
        title: 'Información que Tratamos',
        paragraphs: [
          'Los eventos incluyen título, notas opcionales, fechas y horarios posibles, y zona horaria. Los eventos anteriores también pueden incluir un nombre opcional del creador. Las respuestas incluyen nombre visible, zona horaria, disponibilidad seleccionada e información de actualización. También guardamos identificadores de eventos y respuestas. Los hashes históricos de credenciales, que ya no se usan, pueden permanecer hasta eliminar el evento. No se exige nombre legal, cuenta, correo electrónico ni datos de pago para planificar.',
          'El navegador proporciona su zona horaria para mostrar las horas locales; puedes elegir otra. No solicitamos ubicación GPS precisa. Las solicitudes también facilitan a la infraestructura de alojamiento información técnica como dirección IP, cabeceras del navegador, URL solicitada y hora. Las IP se usan para limitar abusos; los proveedores pueden mantener registros operativos y de seguridad. Si nos escribes, recibimos tu dirección de correo y mensaje.',
        ],
      },
      {
        title: 'Cómo Usamos la Información',
        paragraphs: [
          'Usamos la información para guardar y actualizar eventos y respuestas, encontrar periodos en los que todos estén disponibles, mostrar horas locales, proteger el servicio y atender solicitudes. Las sugerencias se calculan con la disponibilidad guardada, sin enviarla a un modelo de IA.',
          'Cuando se requiera una base jurídica, tratamos datos para prestar el servicio solicitado, por intereses legítimos en operarlo y protegerlo, o para cumplir obligaciones legales, según corresponda. No vendemos ni alquilamos información personal ni la compartimos para publicidad conductual entre contextos.',
        ],
      },
      {
        title: 'Quién Puede Ver y Editar Tus Datos',
        paragraphs: [
          'Todos los que tengan el enlace pueden ver los nombres, zonas horarias, disponibilidad y horarios comunes guardados, y editar cualquier respuesta. No hay enlaces privados de edición. Esto incluye los eventos existentes. Los administradores y proveedores autorizados pueden acceder a datos según sea necesario para operaciones, seguridad, soporte u obligaciones legales.',
        ],
      },
      {
        title: 'Proveedores y Tratamiento Internacional',
        paragraphs: [
          'ChatGPT Sites aloja el sitio y el servidor; Neon PostgreSQL guarda eventos y respuestas. Estos proveedores y su infraestructura tratan datos para prestar y proteger el servicio. El tratamiento puede realizarse en Estados Unidos u otros países donde operen, cuyas normas de privacidad pueden diferir de las tuyas.',
        ],
      },
      {
        title: 'Almacenamiento del Navegador y Seguimiento',
        paragraphs: [
          'Whenkin usa almacenamiento local para el idioma y para recordar si completaste u omitiste la guía. No restaura respuestas ni borradores desde el navegador. El evento abre un formulario en blanco; selecciona a una persona en Participantes que Respondieron para cargar su respuesta guardada desde cualquier navegador. Los cambios pendientes de guardar permanecen solo mientras la página está abierta.',
          'Borrar el almacenamiento del navegador no elimina datos del servidor. Whenkin no añade publicidad ni rastreadores de análisis de terceros. Los proveedores pueden usar tecnologías de seguridad necesarias.',
        ],
      },
      {
        title: 'Conservación y Seguridad',
        paragraphs: [
          'Los eventos y todos sus enlaces caducan {retention} después de crearse. No hay límite de participantes. Los administradores ejecutan la limpieza manualmente para eliminar eventos de al menos {retention}, sus respuestas y su disponibilidad. Los datos caducados pueden permanecer guardados hasta esa operación manual. Contáctanos si deseas eliminarlos antes. Conservamos mensajes de soporte y registros de seguridad según sea necesario para atender solicitudes, proteger el servicio y cumplir obligaciones legales; las copias y registros de proveedores siguen sus propios procesos de conservación.',
          'Usamos HTTPS, validación de datos, caducidad, límites de escritura y control de versiones. Todos los que tengan el enlace del evento pueden editar sus respuestas; el enlace es el punto de acceso compartido.',
        ],
      },
      {
        title: 'Tus Opciones y Solicitudes',
        paragraphs: [
          'Abre el enlace del evento y selecciona tu nombre en Participantes que Respondieron para ver o editar tu respuesta. La disponibilidad se guarda automáticamente. Usa el icono de papelera junto a un nombre y confirma para eliminar esa respuesta. Para eliminar un evento, solicitar acceso a los datos o hacer otras solicitudes de privacidad, escribe a j4ouyang@ucsd.edu con el enlace normal del evento y describe tu solicitud.',
          'Podemos necesitar verificar que controlas el evento o respuesta antes de actuar. Según la ley aplicable, puedes tener derechos de acceso, rectificación, eliminación, copia, limitación u oposición, y de reclamación ante una autoridad de privacidad. Atendemos solicitudes conforme a la ley aplicable.',
        ],
      },
      {
        title: 'Menores y Cambios de la Política',
        paragraphs: [
          'Whenkin no está dirigido a menores de 13 años y no deben enviar información personal. Si crees que un menor lo ha hecho, contáctanos para solicitar su eliminación.',
          'Actualizaremos la fecha de entrada en vigor cuando cambie la política y daremos aviso adicional de cambios importantes cuando sea obligatorio. Los cambios no autorizan retroactivamente usos incompatibles de información ya recopilada.',
        ],
      },
    ],
  },
};
