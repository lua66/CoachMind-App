export interface ScenarioOption {
  id: string;
  letter: 'A' | 'B' | 'C' | 'D';
  text: string;
  recommendationType: 'optimal' | 'conditioned' | 'risky';
  advantage: string;
  risk: string;
  whatYouSaw: string;
  whatYouMissed: string;
  probableRivalReaction: string;
  nextPossessionFocus: string;
  momentumShiftDelta: number; // e.g. -20 (toward rival) or +20 (toward us)
  categoryScores: {
    gameReading: number;
    emotionalManagement: number;
    substitutions: number;
    tactics: number;
    advantageManagement: number;
    anticipation: number;
  };
}

export interface Scenario {
  id: string;
  level: 1 | 2 | 3 | 4;
  levelLabel: 'NIVEL 1 — BÁSICO' | 'NIVEL 2 — INTERMEDIO' | 'NIVEL 3 — AVANZADO' | 'NIVEL 4 — ÉLITE';
  quarter: string;
  timeRemaining: string;
  scoreUs: number;
  scoreRival: number;
  title: string;
  contextPoints: string[];
  question: string;
  initialMomentum: number; // 0 to 100 (50 is neutral, <50 rival advantage, >50 us advantage)
  options: ScenarioOption[];
}

export const MATCH_SCENARIOS: Scenario[] = [
  {
    id: 'sc-1',
    level: 1,
    levelLabel: 'NIVEL 1 — BÁSICO',
    quarter: '2.º Cuarto',
    timeRemaining: '06:42',
    scoreUs: 34,
    scoreRival: 24,
    title: 'Gestión de Faltas del Base y Presión Rival tras Tiempo Muerto',
    initialMomentum: 65,
    contextPoints: [
      'Tu equipo ha conseguido un parcial favorable de 8-0 (+10 en el marcador).',
      'El entrenador rival acaba de pedir un Tiempo Muerto de urgencia.',
      'Tu base titular lleva 3 faltas personales cometidas.',
      'El segundo base ha jugado minutos sólidos y está concentrado en el banquillo.',
      'El rival sale del tiempo muerto apretando a toda la pista en zona 1-2-1-1.',
      'Tu equipo ha encajado canasta fácil en las 2 últimas defensas por relajación en el balance.'
    ],
    question: '¿Qué decisión tomas antes de reanudar el juego?',
    options: [
      {
        id: 'opt-1a',
        letter: 'A',
        text: 'Mantener al quinteto en pista porque están con buena inercia ofensiva (+10).',
        recommendationType: 'risky',
        advantage: 'Mantienes la fluidez anotadora del ataque sin alterar la química que generó el parcial.',
        risk: 'Riesgo altísimo de que el base titular cometa la 4ª falta al salir de la presión o caiga en una trampa del rival.',
        whatYouSaw: 'Viste el parcial de +10 y la efectividad de los tiros recientes.',
        whatYouMissed: 'No leíste la trampa del rival en tiempo muerto: buscan forzar el bote del base cargado de faltas bajo presión a toda pista.',
        probableRivalReaction: 'Atacará de inmediato con 2x1 al base titular para sacarle la 4ª falta antes del descanso.',
        nextPossessionFocus: 'Observa la primera pauta de pase tras la presión rival.',
        momentumShiftDelta: -25,
        categoryScores: {
          gameReading: 40,
          emotionalManagement: 50,
          substitutions: 30,
          tactics: 45,
          advantageManagement: 35,
          anticipation: 30
        }
      },
      {
        id: 'opt-1b',
        letter: 'B',
        text: 'Sustituir inmediatamente al base titular por el 2º base para protegerlo de la 4ª falta y dar frescura frente a la presión.',
        recommendationType: 'optimal',
        advantage: 'Proteges al referente para la 2ª mitad, metes piernas frescas para romper la presión a 94 pies y mantienes el control emocional.',
        risk: 'Ligera adaptación de 1-2 posesiones mientras el 2º base coge el ritmo del partido.',
        whatYouSaw: 'Identificaste el riesgo real de la 3ª falta del base y la intención del rival de elevar la presión defensiva.',
        whatYouMissed: 'Nada crucial. Tomaste una decisión proactiva antes de que el rival causara el problema.',
        probableRivalReaction: 'Tendrá que retirar la presión agresiva si ven que rompes la primera línea con pases limpios.',
        nextPossessionFocus: 'Comprueba el espacio entre receptores tras romper la primera línea de presión.',
        momentumShiftDelta: +15,
        categoryScores: {
          gameReading: 95,
          emotionalManagement: 90,
          substitutions: 100,
          tactics: 90,
          advantageManagement: 95,
          anticipation: 100
        }
      },
      {
        id: 'opt-1c',
        letter: 'C',
        text: 'Pedir tiempo muerto propio inmediatamente después de sacar para corregir la dinámica.',
        recommendationType: 'conditioned',
        advantage: 'Aseguras explicar detalladamente cómo romper la presión a toda pista.',
        risk: 'Gastas un tiempo muerto valioso de manera consecutiva al del rival y muestras inseguridad a tus jugadores.',
        whatYouSaw: 'La amenaza de la presión a toda pista del rival.',
        whatYouMissed: 'Que podías hacer la sustitución e instrucción táctica durante el tiempo muerto pedido por el rival sin malgastar el tuyo.',
        probableRivalReaction: 'El rival se reafirmana al ver que su tiempo muerto os ha desconcertado.',
        nextPossessionFocus: 'Evalúa la ejecución de la salida de presión trazada.',
        momentumShiftDelta: -5,
        categoryScores: {
          gameReading: 65,
          emotionalManagement: 60,
          substitutions: 50,
          tactics: 70,
          advantageManagement: 60,
          anticipation: 55
        }
      },
      {
        id: 'opt-1d',
        letter: 'D',
        text: 'Cambiar la defensa a zona 2-3 para no desgastar a los jugadores y reservar faltas.',
        recommendationType: 'risky',
        advantage: 'Proteges temporalmente la pintura y frenas las penetraciones directas.',
        risk: 'Le regalas al rival el ritmo exterior justo cuando salían de un tiempo muerto buscando buenas sensaciones de tiro.',
        whatYouSaw: 'El deseo de proteger al equipo del desgaste físico.',
        whatYouMissed: 'Que la zona tras encajar un parcial negativo en defensa les dará tiros libres de ritmo desde el triple.',
        probableRivalReaction: 'Moverán el balón a las esquinas para castigar la zona sin oposición.',
        nextPossessionFocus: 'Observa si las rotaciones de la zona llegan al tirador de esquina.',
        momentumShiftDelta: -20,
        categoryScores: {
          gameReading: 45,
          emotionalManagement: 50,
          substitutions: 40,
          tactics: 50,
          advantageManagement: 40,
          anticipation: 40
        }
      }
    ]
  },
  {
    id: 'sc-2',
    level: 2,
    levelLabel: 'NIVEL 2 — INTERMEDIO',
    quarter: '3.er Cuarto',
    timeRemaining: '03:15',
    scoreUs: 52,
    scoreRival: 48,
    title: 'Corte de Parcial Rival y Crisis de Lenguaje Corporal',
    initialMomentum: 35,
    contextPoints: [
      'Llegasteis a ganar por +13, pero el rival encadena un parcial alarmante de 0-9 en solo 2 minutos.',
      'Se han producido 3 pérdidas consecutivas en el pase inicial de creación.',
      'La grada rival está presionando al máximo y la moral de tu equipo se derrumba.',
      'Tus jugadores muestran lenguaje corporal hundido (miradas al suelo, discusiones en pista, mirando al marcador constantemente).',
      'Tu pívot titular muestra fatiga evidente y no llega a cerrar las ayudas en el Pick & Roll central.'
    ],
    question: '¿Cómo intervienes para frenar la hemorragia competitiva?',
    options: [
      {
        id: 'opt-2a',
        letter: 'A',
        text: 'Dejar jugar sin pedir tiempo muerto para que el equipo aprenda a madurar solo en ambientes hostiles.',
        recommendationType: 'risky',
        advantage: 'No consumes tiempo muerto.',
        risk: 'El Síndrome del Falso Ganador destruye la ventaja por completo; el rival consumará la remontada antes del fin del cuarto.',
        whatYouSaw: 'Deseo de que los jugadores reaccionen por carácter propio.',
        whatYouMissed: 'No detectaste la parálisis emocional del equipo ni el agotamiento físico del pívot titular.',
        probableRivalReaction: 'Apretarán aún más el acelerador con 2x1 sabiendo que no frenas su inercia.',
        nextPossessionFocus: 'Observa si el balón llega a sobrepasar el medio campo en 8 segundos.',
        momentumShiftDelta: -30,
        categoryScores: {
          gameReading: 35,
          emotionalManagement: 20,
          substitutions: 25,
          tactics: 30,
          advantageManagement: 20,
          anticipation: 25
        }
      },
      {
        id: 'opt-2b',
        letter: 'B',
        text: 'Pedir Tiempo Muerto de inmediato: sustituir al pívot fatigado, marcar 2 pases de seguridad obligatorios y reactivar la comunicación defensiva.',
        recommendationType: 'optimal',
        advantage: 'Cortas la inercia del rival, das oxígeno a la pintura y estableces un objetivo claro y alcanzable para la siguiente posesión.',
        risk: 'Consumes un tiempo muerto en el 3.er cuarto.',
        whatYouSaw: 'Detectaste que el rival controla el MOMENTO DEL PARTIDO aunque el marcador siga +4 a favor.',
        whatYouMissed: 'Nada. Un diagnóstico impecable de dinamismo y psicología deportiva.',
        probableRivalReaction: 'Verán interrumpido su momento de euforia y deberán reconstruir su ataque en estático.',
        nextPossessionFocus: 'Verifica la recepción limpia tras el tiempo muerto y el contacto de la pantalla.',
        momentumShiftDelta: +30,
        categoryScores: {
          gameReading: 95,
          emotionalManagement: 100,
          substitutions: 95,
          tactics: 95,
          advantageManagement: 90,
          anticipation: 95
        }
      },
      {
        id: 'opt-2c',
        letter: 'C',
        text: 'Cambiar a los 5 jugadores de golpe en pista para castigar la falta de actitud.',
        recommendationType: 'risky',
        advantage: 'Envías un mensaje drástico de exigencia al grupo.',
        risk: 'Generas caos organizativo en pista con 5 jugadores fríos frente a un rival en trance ofensivo.',
        whatYouSaw: 'La rabia por las pérdidas tontas.',
        whatYouMissed: 'Confundiste fatiga y bloqueo táctico con falta de actitud, desarmando la estructura del quinteto.',
        probableRivalReaction: 'Atacarán sin piedad la falta de cohesión de las 5 caras nuevas.',
        nextPossessionFocus: 'Observa los despistes de asignación en transición defensiva.',
        momentumShiftDelta: -25,
        categoryScores: {
          gameReading: 40,
          emotionalManagement: 30,
          substitutions: 20,
          tactics: 35,
          advantageManagement: 30,
          anticipation: 30
        }
      },
      {
        id: 'opt-2d',
        letter: 'D',
        text: 'Gritar desde la banda que tiren triples rápidamente para recuperar la ventaja previa de +13.',
        recommendationType: 'risky',
        advantage: 'Anotar un triple rápido amortiguaría el parcial de inmediato.',
        risk: 'Aumentas la precipitación; si se falla el triple rápido, el balance defensivo quedará roto ofreciendo contraataque al rival.',
        whatYouSaw: 'La prisa por volver a tener +10 en la pantalla del marcador.',
        whatYouMissed: 'Caíste en el "ansiedad del marcador", jugando a lo que el rival desea.',
        probableRivalReaction: 'Cerrarán el rebote defensivo con ventaja y saldrán en estampida al contraataque.',
        nextPossessionFocus: 'Observa la selección de tiro en los primeros 8 segundos.',
        momentumShiftDelta: -20,
        categoryScores: {
          gameReading: 50,
          emotionalManagement: 40,
          substitutions: 50,
          tactics: 40,
          advantageManagement: 35,
          anticipation: 40
        }
      }
    ]
  },
  {
    id: 'sc-3',
    level: 3,
    levelLabel: 'NIVEL 3 — AVANZADO',
    quarter: '4.º Cuarto',
    timeRemaining: '02:30',
    scoreUs: 68,
    scoreRival: 65,
    title: 'Explotación de Bonus de Faltas y Defensa Box-and-One',
    initialMomentum: 50,
    contextPoints: [
      'Tu alero estrella lleva 24 puntos, pero el rival le ha puesto una defensa cara a cara (deny total / Box-and-One).',
      'Lleváis 3 ataques consumiendo casi 24 segundos con tiros muy forzados.',
      'EL RIVAL ESTÁ EN BONUS DE FALTAS (4 faltas de equipo cometidas).',
      'Tu equipo solo lleva 1 falta cometida en este último cuarto.',
      'El marcador está apretado (+3) a falta de 150 segundos para el final.'
    ],
    question: '¿Qué diseño táctico aplicas para resolver el bloqueo del alero?',
    options: [
      {
        id: 'opt-3a',
        letter: 'A',
        text: 'Insistir en sistemas de bloqueos ciegos continuos para que el alero estrella reciba y tire a toda costa.',
        recommendationType: 'risky',
        advantage: 'Si el anotador estrella mete el tiro, la moral del rival decae.',
        risk: 'El rival defenderá el contacto al límite provocando otra pérdida más.',
        whatYouSaw: 'El deseo de que tu mejor jugador resuelva la papeleta.',
        whatYouMissed: 'Ignoraste que el rival ha hipotecado su defensa para frenar a ese jugador y que estáis regalando los espacios libres.',
        probableRivalReaction: 'Mantendrán la doble ayuda y la sobredefensa con agresividad.',
        nextPossessionFocus: 'Observa la pérdida de tiempo en los primeros 14 segundos de posesión.',
        momentumShiftDelta: -15,
        categoryScores: {
          gameReading: 50,
          emotionalManagement: 60,
          substitutions: 60,
          tactics: 45,
          advantageManagement: 50,
          anticipation: 45
        }
      },
      {
        id: 'opt-3b',
        letter: 'B',
        text: 'Usar al alero como señuelo fijado en lado débil y atacar el Pick & Roll central directo contra la peor defensa del rival para forzar penetración y tiros libres en BONUS.',
        recommendationType: 'optimal',
        advantage: 'Aprovechas la sobre-atención sobre el alero para abrir la zona y sacar faltas personales que dan tiros libres automáticos (Bonus).',
        risk: 'Exige que otros secundarios asuman la responsabilidad del último pase o penetración.',
        whatYouSaw: 'Leíste la ventaja estratégica del BONUS rival y el espacio generado por la defensa denegada al alero.',
        whatYouMissed: 'Nada. Lectura superior de la coyuntura del reglamento y táctica espacial.',
        probableRivalReaction: 'Se verán obligados a colapsar la pintura commitiendo falta o liberando un pase extra fácil.',
        nextPossessionFocus: 'Observa la contundencia de las penetraciones hacia la pintura atacando el lado débil.',
        momentumShiftDelta: +25,
        categoryScores: {
          gameReading: 100,
          emotionalManagement: 90,
          substitutions: 85,
          tactics: 100,
          advantageManagement: 95,
          anticipation: 100
        }
      },
      {
        id: 'opt-3c',
        letter: 'C',
        text: 'Ordenas consumir los 24 segundos en cada posesión botando en el perímetro para congelar el reloj.',
        recommendationType: 'conditioned',
        advantage: 'Pasan los segundos sin conceder tiros al rival.',
        risk: 'Atacas con angustia a falta de 3 segundos con tiros forzados sin ritmo, abriendo la puerta a su remontada.',
        whatYouSaw: 'El cronómetro que juega a vuestro favor.',
        whatYouMissed: 'Jugar a no perder en lugar de jugar a atacar espacios claros es la definición del Síndrome del Falso Ganador.',
        probableRivalReaction: 'Subirán líneas de pase a falta de 8 segundos forzando robos de balón.',
        nextPossessionFocus: 'Comprueba los segundos restantes cuando se inicia el movimiento hacia aro.',
        momentumShiftDelta: -10,
        categoryScores: {
          gameReading: 60,
          emotionalManagement: 50,
          substitutions: 60,
          tactics: 55,
          advantageManagement: 40,
          anticipation: 50
        }
      },
      {
        id: 'opt-3d',
        letter: 'D',
        text: 'Hacer falta táctica en la siguiente defensa para cortar su flujo aunque no estén en acción de tiro.',
        recommendationType: 'risky',
        advantage: 'Detienes el ataque rival en seco.',
        risk: 'Regalas faltas sin necesidad cuando tenéis aún 3 faltas de margen para usar estratégicamente antes del bonus.',
        whatYouSaw: 'Las ganas de no encajar canasta fácil.',
        whatYouMissed: 'No utilizaste la "falta inteligente" antes del tiro para cortar un pase clave o una penetración.',
        probableRivalReaction: 'Sacarán de banda con sistema diseñado a balón parado.',
        nextPossessionFocus: 'Observa la asignación en la defensa del saque de banda.',
        momentumShiftDelta: -10,
        categoryScores: {
          gameReading: 55,
          emotionalManagement: 55,
          substitutions: 50,
          tactics: 50,
          advantageManagement: 50,
          anticipation: 40
        }
      }
    ]
  },
  {
    id: 'sc-4',
    level: 4,
    levelLabel: 'NIVEL 4 — ÉLITE',
    quarter: '4.º Cuarto',
    timeRemaining: '00:28',
    scoreUs: 75,
    scoreRival: 74,
    title: 'Gestión de Faltas Tácticas y Cierre del Último Minuto (+1)',
    initialMomentum: 48,
    contextPoints: [
      'Ganas por +1 punto a falta de 28 segundos para la bocina final.',
      'Posesión de balón para el equipo rival tras salir de su tiempo muerto.',
      'Vosotros lleváis 3 FALTAS DE EQUIPO (tenéis 1 falta de margen antes de dar tiros libres de Bonus).',
      'El escolta rival está desatado con 31 puntos y va a recibir el balón para jugarse el partido.',
      'En caso de recuperar el balón tras su ataque, a vosotros OS QUEDAN 0 TIEMPOS MUERTOS.'
    ],
    question: '¿Cuál es la estrategia defensiva previa y durante la posesión rival?',
    options: [
      {
        id: 'opt-4a',
        letter: 'A',
        text: 'Cometer falta táctica intencionada en el bote a los 4-6 segundos de su posesión para gastar la última falta sin tiros libres, consumir tiempo y romper la jugada ensayada por su técnico.',
        recommendationType: 'optimal',
        advantage: 'Destruyes el sistema de tiempo muerto del rival, consumes 5-6 segundos clave y los obligas a sacar de banda a prisa con solo 14 segundos en el reloj.',
        risk: 'Si el jugador es muy listo puede intentar forzar acción de tiro durante el contacto.',
        whatYouSaw: 'Entendiste que la falta de margen es una herramienta defensiva activa para romper la pizarra rival.',
        whatYouMissed: 'Nada. Gestión de élite en situaciones limite de final ajustado.',
        probableRivalReaction: 'Se verán obligados a pedir aclarado rápido sin el sistema preparado.',
        nextPossessionFocus: 'Asegúrate de que la falta se cometa sobre el bote raso, nunca durante la mecánica de tiro.',
        momentumShiftDelta: +20,
        categoryScores: {
          gameReading: 100,
          emotionalManagement: 95,
          substitutions: 90,
          tactics: 100,
          advantageManagement: 95,
          anticipation: 100
        }
      },
      {
        id: 'opt-4b',
        letter: 'B',
        text: 'Defender al límite sin tocar para evitar que piten falta y confiar en defender los 24 segundos completos.',
        recommendationType: 'conditioned',
        advantage: 'No corres el riesgo de que piten falta en tiro.',
        risk: 'Le permites al rival ejecutar al milímetro la jugada que ensayó en su tiempo muerto con su escolta entornando el tiro ganador.',
        whatYouSaw: 'El miedo a regalar un tiro libre.',
        whatYouMissed: 'Desperdiciaste el tesoro de tener una falta "gratis" para arruinar la pizarra del entrenador rival.',
        probableRivalReaction: 'Ejecutarán el sistema de bloqueos para dejar a su anotador lanzado.',
        nextPossessionFocus: 'Observa la comunicación en los cambios de bloqueo defensivo.',
        momentumShiftDelta: -10,
        categoryScores: {
          gameReading: 70,
          emotionalManagement: 65,
          substitutions: 70,
          tactics: 65,
          advantageManagement: 60,
          anticipation: 60
        }
      },
      {
        id: 'opt-4c',
        letter: 'C',
        text: 'Sorprender con una defensa en zona 1-3-1 en el último segundo.',
        recommendationType: 'risky',
        advantage: 'Efecto sorpresa si no lo esperaban.',
        risk: 'Si la zona no está automatizada al 100%, dejarás una esquina libre para triple cómodo del rival sin margen de reacción.',
        whatYouSaw: 'Deseo de inventar algo genial a última hora.',
        whatYouMissed: 'No improvises estructuras complejas en los últimos 28 segundos de un partido apretado.',
        probableRivalReaction: 'Pasarán el balón a la esquina débil o buscarán el rebote ofensivo en desajuste.',
        nextPossessionFocus: 'Observa la posición de los defensores de fondo.',
        momentumShiftDelta: -25,
        categoryScores: {
          gameReading: 45,
          emotionalManagement: 40,
          substitutions: 50,
          tactics: 40,
          advantageManagement: 35,
          anticipation: 35
        }
      },
      {
        id: 'opt-4d',
        letter: 'D',
        text: 'Hacer doble marca (2x1) agresiva al escolta estrella desde la recepción.',
        recommendationType: 'conditioned',
        advantage: 'Quitas el balón de las manos del anotador principal del rival.',
        risk: 'Generas un 4 contra 3 directo donde un pase fácil acabará en bandeja o tiro libre bajo el aro.',
        whatYouSaw: 'Los 31 puntos del anotador rival.',
        whatYouMissed: 'Que un 2x1 mal coordinado deja la pintura desprotegida a 1 punto de diferencia.',
        probableRivalReaction: 'El escolta soltará el pase rápido al pívot liberado.',
        nextPossessionFocus: 'Observa la velocidad de rotación del tercer defensor.',
        momentumShiftDelta: -15,
        categoryScores: {
          gameReading: 65,
          emotionalManagement: 60,
          substitutions: 65,
          tactics: 60,
          advantageManagement: 50,
          anticipation: 55
        }
      }
    ]
  }
];

export const FALSE_WINNER_CONCEPTS = {
  title: 'EL SÍNDROME DEL FALSO GANADOR',
  subtitle: 'Cuando una ventaja en el marcador hace creer al entrenador que el partido está controlado.',
  definition: 'El Síndrome del Falso Ganador aparece cuando un entrenador o equipo interpreta una ventaja parcial en el marcador como una situación de control real del juego. La ventaja provoca una modificación inconsciente del comportamiento colectivo y táctico.',
  behaviorChanges: [
    { title: 'Disminuye la agresividad defensiva', desc: 'Se afloja en el primer pase y en los contactos de primera línea.' },
    { title: 'Se reduce el ritmo de juego', desc: 'Se camina en las transiciones ofensivas creyendo que "consumir reloj" es suficiente.' },
    { title: 'Se juega para conservar más que para ganar', desc: 'Ataques temerosos donde nadie quiere asumir la responsabilidad de tirar.' },
    { title: 'Disminuye la presión sobre el balón', desc: 'El base rival empieza a jugar cómodo, organizar y ver el campo sin agobios.' },
    { title: 'Aparecen decisiones conservadoras', desc: 'Se retira a los jugadores agresivos para poner "perfiles especulativos".' },
    { title: 'El entrenador gestiona el marcador en lugar del partido', desc: 'Miradas continuas al reloj del pabellón olvidando lo que ocurre dentro de la pista.' }
  ],
  rivalDetects: [
    'Pérdida de intensidad en los contactos físicos.',
    'Menor presión defensiva sobre la línea de pase.',
    'Ataques previsibles y sin cortes agresivos.',
    'Menor velocidad de bajada en balance defensivo.',
    'Peor cierre del rebote bajo el aro propio.',
    'Lenguaje corporal de autosatisfacción o pasividad.',
    'Jugadores mirando constantemente el marcador en cada posesión.',
    'Entrenador más preocupado por conservar la renta que por atacar los espacios.'
  ],
  highlightQuote: 'El marcador muestra la ventaja. El comportamiento muestra quién está ganando realmente.'
};

export const SUBSTITUTION_SCIENCE = {
  rule: 'NO CAMBIES PORQUE TOQUE. CAMBIA PORQUE EL PARTIDO LO NECESITA.',
  subtitle: 'La Ciencia de las Sustituciones',
  description: 'Una sustitución nunca debe ejecutarse mecánicamente por seguir un cuadrante rígido de minutos. Debe ser la respuesta directa a una necesidad baloncestística concreta detectada en pista.',
  needs: [
    { id: 'defensa', label: 'Más defensa', icon: 'Shield', description: 'Cerrar penetraciones directas o subir líneas de pase.' },
    { id: 'rebote', label: 'Más rebote', icon: 'Maximize2', description: 'Garantizar el rebote defensivo ante pívots físicos.' },
    { id: 'velocidad', label: 'Más velocidad', icon: 'Zap', description: 'Acelerar el ritmo y castigar en transición rápida.' },
    { id: 'control', label: 'Mejor control del balón', icon: 'Lock', description: 'Evitar pérdidas absurdas y asegurar posesiones ordenadas.' },
    { id: 'generacion', label: 'Mejor generación ofensiva', icon: 'Sparkles', description: 'Desatascar ataques estáticos con jugadores creativos.' },
    { id: 'frenar', label: 'Detener al referente rival', icon: 'UserX', description: 'Poner a un especialista defensivo cara a cara.' },
    { id: 'descanso', label: 'Descanso estratégico', icon: 'HeartPulse', description: 'Dar oxígeno al líder antes de los minutos decisivos.' },
    { id: 'ritmo', label: 'Cambiar el ritmo', icon: 'Sliders', description: 'Adormecer un partido caótico o revolucionar uno apático.' },
    { id: 'equilibrio', label: 'Equilibrio del quinteto', icon: 'Scale', description: 'Ajustar alturas, tiro exterior y solidez interior.' }
  ]
};

export const METHODOLOGY_BANNER = 'NO ENTRENAMOS PARA SABER QUÉ HACER. ENTRENAMOS PARA SABER CUÁNDO HACERLO.';
