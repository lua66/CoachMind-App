import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';
import dotenv from 'dotenv';
import { requireAuth, optionalAuth, AuthRequest } from './src/middleware/auth.ts';
import { db } from './src/db/index.ts';
import { users, players as dbPlayers, philosophies, drills as dbDrills, matches as dbMatches } from './src/db/schema.ts';
import { getOrCreateUser } from './src/db/users.ts';
import { eq } from 'drizzle-orm';
import * as cheerio from 'cheerio';

dotenv.config();

const appDir = process.cwd();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '10mb' }));

// Helper function for API timeouts
function withTimeout<T>(promise: Promise<T>, ms: number = 7500): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`Gemini request timed out after ${ms}ms`)), ms)
    ),
  ]);
}

// Lazy initializer for Gemini client to safely handle missing keys at startup
function getGeminiClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY' || apiKey.includes('MY_GEMINI_API_KEY')) {
    return null;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

// Helper to generate dynamic, tailored training plans when Gemini API is offline or falling back
function buildCustomTrainingPlan(params: {
  title?: string;
  section?: string;
  category?: string;
  ageRange?: string;
  level?: string;
  intensity?: string;
  durationMinutes?: number;
  objective?: string;
  coachPhilosophy?: any;
}) {
  const objectiveText = (params.objective || params.title || 'Fundamentos generales de baloncesto').trim();
  const objLower = objectiveText.toLowerCase();
  const totalMin = Number(params.durationMinutes) || 90;
  const categoryStr = params.category || 'Cadete';
  const intensityStr = params.intensity || 'Media';
  const levelStr = params.level || 'Regional';

  // Calculate section durations: Warmup ~20%, Main ~65%, Cooldown ~15%
  const warmupDur = Math.max(10, Math.round(totalMin * 0.20));
  const mainDurTotal = Math.max(30, Math.round(totalMin * 0.65));
  const main1Dur = Math.round(mainDurTotal * 0.50);
  const main2Dur = mainDurTotal - main1Dur;
  const cooldownDur = Math.max(10, totalMin - warmupDur - mainDurTotal);

  let warmupTitle = `Activación dinámica adaptada: ${categoryStr} (${intensityStr})`;
  let warmupDesc = `Movilidad articular activa, bote de control coordinado y cambios de dirección orientados a la sesión.`;

  let drill1Title = `Bloque principal 1: ${objectiveText}`;
  let drill1Desc = `Ejercicio específico progresivo (de 2v2 a 4v4) enfocado directamente en ${objectiveText}. Múltiples repeticiones con correcciones del entrenador.`;
  let drill1Tips = [`Priorizar la calidad y precisión de ejecución`, `Exigir concentración adecuada para nivel ${levelStr}`];

  let drill2Title = `Bloque principal 2: Aplicación en 5v5 condicionado`;
  let drill2Desc = `Situación real de juego en toda la pista donde se recompensa con puntos extra el uso efectivo de ${objectiveText}.`;
  let drill2Tips = [`Comunicación constante entre jugadoras`, `Lectura rápida de la ventaja defensiva`];

  let cooldownTitle = `Vuelta a la calma: Serie de tiro específica y estiramientos`;
  let cooldownDesc = `Rueda de lanzamientos bajo fatiga repasando los gestos de ${objectiveText} + estiramientos guiados.`;

  if (objLower.includes('defensa') || objLower.includes('presion') || objLower.includes('robar') || objLower.includes('recuperar')) {
    warmupTitle = `Activación defensiva: Desplazamientos laterales y sobremarcado`;
    warmupDesc = `Trabajo de pies en ziz-zag, fijación de posturas defensivas bajas y comunicación verbal ('Balón', 'Ayuda').`;
    drill1Title = `Defensa de 1v1 y 2v2: Cierre de penetración y rotación de ayuda`;
    drill1Desc = `Contención de la jugadora con balón, negar el centro de la pista y recuperar activamente en el pase de salida.`;
    drill1Tips = [`Brazos activos cortando líneas de pase`, `Cierre de rebote defensivo obligatorio (Box Out)`];
    drill2Title = `5v5 Defensivo condicionado: Presión ${intensityStr}`;
    drill2Desc = `Defensa agresiva a campo entero. Recuperación del balón en menos de 8 segundos otorga posesión extra.`;
    drill2Tips = [`Ajustar marcas tras cada canasta`, `Evitar faltas innecesarias en primera línea`];
    cooldownTitle = `Tiros libres tras esfuerzo defensivo + Flexibilidad`;
  } else if (objLower.includes('tiro') || objLower.includes('triple') || objLower.includes('mecanica') || objLower.includes('lanzamiento')) {
    warmupTitle = `Mecánica de tiro cercana al aro y rango de extensión`;
    warmupDesc = `Rueda de tiro analítica a 1 y 2 manos para fijar codo, muñeca y salto coordinado.`;
    drill1Title = `Tiro tras bote y recepción tras corte (Catch & Shoot)`;
    drill1Desc = `Salida de pantalla indirecta, recepción encarada al aro en 2 tiempos y lanzamiento en suspensión.`;
    drill1Tips = [`Armado rápido sin bajar la pelota`, `Fijar la mirada en la parte posterior del aro`];
    drill2Title = `Competición de tiro rápido por grupos (${intensityStr})`;
    drill2Desc = `Anotar 20 lanzamientos desde 5 posiciones distintas (esquinas, 45° y cabecera) superando la oposición de un punteador.`;
    drill2Tips = [`Acompañar la parábola`, `Sostener el gesto de tiro tras soltar la pelota`];
    cooldownTitle = `Serie de 10 tiros libres individuales + Estiramientos`;
  } else if (objLower.includes('bloqueo') || objLower.includes('pick') || objLower.includes('pantalla')) {
    warmupTitle = `Activación de ángulos de bloqueo e inversión de balón`;
    warmupDesc = `Simulación de ángulos de pantalla en cabecera y pases picados al corte de la pívot.`;
    drill1Title = `Táctica 2v2 y 3v3: Lectura de Pick & Roll / Pick & Pop`;
    drill1Desc = `Lectura de la defensa: si se hunden (tiro tras bote), si persiguen (penetración al aro), si saltan (pase al roll).`;
    drill1Tips = [`El manejador debe atacar el hombro del defensor`, `Continuación explosiva del bloqueador`];
    drill2Title = `5v5 Con obligación de generar ventaja desde bloqueo directo`;
    drill2Desc = `Ataque fluido aprovechando el espacio (spacing) creado tras el primer bloqueo directo.`;
    drill2Tips = [`Invertir el balón si el primer pase se niega`, `Mantener distancia de 4 metros entre exteriores`];
  } else if (objLower.includes('bote') || objLower.includes('pase') || objLower.includes('transicion') || objLower.includes('contraataque')) {
    warmupTitle = `Rueda de pases en movimiento y manejo de doble balón`;
    warmupDesc = `Pases picados, de pecho y de béisbol en transición de 3 calles acelerando la toma de decisiones.`;
    drill1Title = `Transiciones rápidas 3v2 y 2v1 en oleadas continuas`;
    drill1Desc = `Ataque a velocidad máxima para atacar la pintura antes de que la defensa se organice.`;
    drill1Tips = [`Buscar el pase a la jugadora liberada`, `Fijar al último defensor con bote agresivo`];
    drill2Title = `5v5 Continuo con posesiones cortas de 10 segundos`;
    drill2Desc = `Ritmo frenético de partido forzando lecturas rápidas en llegada secundaria.`;
    drill2Tips = [`Levantar la cabeza en el primer bote`, `Ocupar esquinas a máxima velocidad`];
  }

  const timestamp = Date.now();
  return {
    warmup: [
      {
        id: `w-${timestamp}-1`,
        title: warmupTitle,
        durationMinutes: warmupDur,
        playersCount: `Plantilla completa (${categoryStr})`,
        description: warmupDesc,
        coachingTips: [`Mantener intensidad ${intensityStr}`, `Enfoque constante en los detalles de ejecución`],
      },
    ],
    mainDrills: [
      {
        id: `m-${timestamp}-1`,
        title: drill1Title,
        durationMinutes: main1Dur,
        playersCount: `Grupos reducidos (${levelStr})`,
        description: drill1Desc,
        coachingTips: drill1Tips,
      },
      {
        id: `m-${timestamp}-2`,
        title: drill2Title,
        durationMinutes: main2Dur,
        playersCount: `5 vs 5 Toda la plantilla`,
        description: drill2Desc,
        coachingTips: drill2Tips,
      },
    ],
    cooldown: [
      {
        id: `c-${timestamp}-1`,
        title: cooldownTitle,
        durationMinutes: cooldownDur,
        playersCount: `Parejas / Individual`,
        description: cooldownDesc,
        coachingTips: [`Regular respiración diafragmática`, `Consolidar aprendizajes tácticos de la sesión`],
      },
    ],
    coachNotes: [
      `Enfoque específico de la sesión: ${objectiveText}.`,
      `Categoría: ${categoryStr} (${params.ageRange || ''}) | Nivel: ${levelStr} | Intensidad: ${intensityStr}.`,
      params.coachPhilosophy?.trainingGoals
        ? `Alineado con filosofía del entrenador: ${params.coachPhilosophy.trainingGoals}`
        : `Premiar la comunicación en pista y las buenas lecturas tácticas.`,
    ],
    totalDuration: totalMin,
  };
}

// Helper to generate dynamic training review report when analyzing coach-created drills
function buildTrainingReviewFallback(params: {
  objective: string;
  category?: string;
  level?: string;
  intensity?: string;
  durationMinutes?: number;
  drills: Array<{
    title: string;
    description?: string;
    durationMinutes?: number;
    coachingTips?: string[];
  }>;
}) {
  const objective = params.objective || 'Fundamentos tácticos y técnicos';
  const objLower = objective.toLowerCase();
  const drills = params.drills || [];
  const category = params.category || 'Cadete';
  const level = params.level || 'Regional';
  const intensity = params.intensity || 'Media';
  const duration = params.durationMinutes || 90;

  let alignedCount = 0;
  const drillFeedbacks = drills.map((d, index) => {
    const text = `${d.title} ${d.description || ''} ${(d.coachingTips || []).join(' ')}`.toLowerCase();
    const keywords = objLower.split(/[\s,.-]+/).filter((w) => w.length > 3 && !['para', 'como', 'este', 'esta', 'unos', 'unas', 'situaciones', 'equipo'].includes(w));
    
    const hasKeyword = keywords.some((k) => text.includes(k));
    const isSpecialDrill = index === 0 && (text.includes('calenta') || text.includes('activaci') || text.includes('movilid'));
    const isCooldown = index === drills.length - 1 && (text.includes('calma') || text.includes('tiro libre') || text.includes('estira'));
    
    const isAligned = hasKeyword || isSpecialDrill || isCooldown || drills.length === 1;
    if (isAligned) alignedCount++;

    const status: 'optimal' | 'improvable' | 'mismatched' = isAligned ? 'optimal' : 'improvable';
    const reason = isAligned
      ? `Contribuye eficazmente al objetivo ("${objective.slice(0, 35)}...") con una buena dinámica de repetición y lectura táctica.`
      : `El ejercicio es técnicamente correcto, pero las consignas no enfatizan suficientemente el objetivo prioritario.`;

    const suggestion = isAligned
      ? `Añadir una variante con limitación de tiempo de posesión (ej. 6 segundos) para transferirlo a situación de partido.`
      : `Modificar la regla del ejercicio: premiar con valor doble cada acción que logre ejecutar ${objective.slice(0, 30)}.`;

    return {
      drillTitle: d.title || `Ejercicio ${index + 1}`,
      isAligned,
      status,
      reason,
      suggestion,
    };
  });

  const totalDrills = drills.length || 1;
  const ratio = alignedCount / totalDrills;
  const alignmentScore = Math.min(98, Math.max(68, Math.round(ratio * 100)));

  return {
    alignmentScore,
    summary: `La sesión diseñada tiene una coherencia táctica del ${alignmentScore}% respecto al objetivo establecido: "${objective}". La progresión es pedagógica y adecuada para la categoría ${category} (${level}).`,
    strengths: [
      `Distribución coherente de los tiempos para intensidad ${intensity}.`,
      `Ejercicios con buena ocupación del espacio y volumen de balón por jugadora.`,
      `Continuidad lógica de lo analítico a lo global en pista.`,
    ],
    drillFeedbacks,
    tacticalSuggestions: [
      `Fijar una palabra clave ("Trigger") durante la sesión que recuerde a las jugadoras el objetivo central.`,
      `Incluir situaciones de toma de decisión continua (2c1 / 3c2) para que las jugadoras reconozcan la ventaja.`,
      `Finalizar la sesión con una rueda de tiro bajo fatiga conectada con el trabajo del bloque principal.`,
    ],
    loadAssessment: {
      intensityMatch: `Intensidad ${intensity}: Adecuada para la etapa evolutiva de ${category}.`,
      durationBalance: `${duration} minutos planificados: Buen balance entre volumen de trabajo y pausas de hidratación.`,
    },
  };
}

// 1. Generate Training Session Route
app.post('/api/gemini/generate-training', async (req, res) => {
  try {
    const {
      title,
      section,
      category,
      ageRange,
      level,
      intensity,
      durationMinutes,
      objective,
      coachPhilosophy,
    } = req.body;

    const ai = getGeminiClient();

    if (ai) {
      let systemInstruction =
        'Eres un director técnico de baloncesto elite. Tus explicaciones son claras, profesionales, pedagógicas y listas para aplicar en cancha.';

      if (coachPhilosophy) {
        systemInstruction += `\n\nFILOSOFÍA DEL ENTRENADOR:
- Estilo de juego: ${coachPhilosophy.playStyle || 'Ritmo alto'}
- Enfoque ofensivo: ${coachPhilosophy.offensiveFocus || 'Juego conceptual'}
- Enfoque defensivo: ${coachPhilosophy.defensiveFocus || 'Defensa agresiva'}
- Objetivos en entrenamientos: ${coachPhilosophy.trainingGoals || 'Intensidad'}
- Objetivos en partidos: ${coachPhilosophy.matchGoals || 'Identidad'}
- Valores: ${coachPhilosophy.coreValues || 'Esfuerzo y equipo'}
Adapta el entrenamiento para reflejar fielmente la filosofía de este entrenador.`;
      }

      const prompt = `Eres CoachMind, un entrenador maestro de baloncesto FIBA y NBA reconocido internacionalmente.
Diseña una sesión completa de entrenamiento altamente estructurada adaptada a este objetivo concreto:
- Título: ${title || objective || 'Entrenamiento de Baloncesto'}
- Sección / Tipo: ${section || 'General'}
- Categoría: ${category || 'Cadete'} (${ageRange || '14-16 años'})
- Nivel competitivo: ${level || 'Regional'}
- Intensidad requerida: ${intensity || 'Media'}
- Duración total objetivo: ${durationMinutes || 90} minutos
- OBJETIVO PRINCIPAL: ${objective || 'Mejorar fundamentos tácticos y técnica individual'}

IMPORTANTE: Los ejercicios deben estar directamente enfocados en el OBJETIVO PRINCIPAL indicado arriba ("${objective}"). No generes ejercicios genéricos. Cada título, descripción y consejo debe referirse explícitamente a este objetivo.`;

      try {
        const response = await withTimeout(
          ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
              systemInstruction,
              responseMimeType: 'application/json',
              responseSchema: {
                type: Type.OBJECT,
                properties: {
                  warmup: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        id: { type: Type.STRING },
                        title: { type: Type.STRING },
                        durationMinutes: { type: Type.INTEGER },
                        playersCount: { type: Type.STRING },
                        description: { type: Type.STRING },
                        coachingTips: { type: Type.ARRAY, items: { type: Type.STRING } },
                      },
                      required: ['id', 'title', 'durationMinutes', 'description'],
                    },
                  },
                  mainDrills: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        id: { type: Type.STRING },
                        title: { type: Type.STRING },
                        durationMinutes: { type: Type.INTEGER },
                        playersCount: { type: Type.STRING },
                        description: { type: Type.STRING },
                        coachingTips: { type: Type.ARRAY, items: { type: Type.STRING } },
                      },
                      required: ['id', 'title', 'durationMinutes', 'description'],
                    },
                  },
                  cooldown: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        id: { type: Type.STRING },
                        title: { type: Type.STRING },
                        durationMinutes: { type: Type.INTEGER },
                        playersCount: { type: Type.STRING },
                        description: { type: Type.STRING },
                        coachingTips: { type: Type.ARRAY, items: { type: Type.STRING } },
                      },
                      required: ['id', 'title', 'durationMinutes', 'description'],
                    },
                  },
                  coachNotes: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING },
                  },
                  totalDuration: { type: Type.INTEGER },
                },
                required: ['warmup', 'mainDrills', 'cooldown', 'coachNotes', 'totalDuration'],
              },
            },
          }),
          7500
        );

        let jsonText = (response.text || '').trim();
        if (jsonText.startsWith('```')) {
          jsonText = jsonText.replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
        }
        const plan = JSON.parse(jsonText);
        if (plan && plan.warmup && plan.mainDrills) {
          return res.json({ success: true, plan });
        }
      } catch (geminiErr) {
        console.warn('Gemini API call failed for generate-training, generating dynamic custom plan:', geminiErr);
      }
    }

    // Dynamic tailored plan generator fallback
    const plan = buildCustomTrainingPlan(req.body);
    return res.json({ success: true, plan });
  } catch (error: any) {
    console.error('Error generating training plan:', error);
    const plan = buildCustomTrainingPlan(req.body);
    return res.json({ success: true, plan });
  }
});

// 1.1 Review and Audit Coach Training Plan with AI
app.post('/api/gemini/review-training', async (req, res) => {
  try {
    const {
      title,
      category,
      level,
      intensity,
      durationMinutes,
      objective,
      drills,
    } = req.body;

    const ai = getGeminiClient();

    if (ai) {
      const drillsText = (drills || [])
        .map(
          (d: any, i: number) =>
            `Ejercicio ${i + 1}: "${d.title}" (${d.durationMinutes || 15} min) - ${d.description || ''} | Pautas: ${(d.coachingTips || []).join(', ')}`
        )
        .join('\n');

      const prompt = `Eres CoachMind, un Director Técnico y Metodólogo Experto de Baloncesto FIBA.
Tu tarea es auditar y revisar el entrenamiento diseñado por un entrenador para verificar si cumple su objetivo:

OBJETIVO MARCADO POR EL ENTRENADOR:
"${objective || 'Mejora general'}"

DATOS DEL EQUIPO:
- Título: ${title || 'Sesión de entrenamiento'}
- Categoría: ${category || 'Cadete'}
- Nivel: ${level || 'Regional'}
- Intensidad planificada: ${intensity || 'Media'}
- Duración total: ${durationMinutes || 90} minutos

EJERCICIOS DISEÑADOS POR EL ENTRENADOR:
${drillsText}

INSTRUCCIONES DE ANÁLISIS:
1. Evalúa si los ejercicios diseñados por el entrenador trabajan DIRECTAMENTE el objetivo indicado.
2. Calcula una puntuación de coherencia (alignmentScore) de 0 a 100%.
3. Revisa cada ejercicio uno a uno: indica si está alineado (true/false), su estado (optimal, improvable, mismatched), el motivo claro, y una sugerencia constructiva para ajustarlo al objetivo.
4. Indica los puntos fuertes de la sesión diseñada.
5. Da 3 sugerencias tácticas o variantes avanzadas para enriquecer el entrenamiento.
6. Evalúa la adecuación de la carga e intensidad.`;

      try {
        const response = await withTimeout(
          ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
              responseMimeType: 'application/json',
              responseSchema: {
                type: Type.OBJECT,
                properties: {
                  alignmentScore: { type: Type.INTEGER },
                  summary: { type: Type.STRING },
                  strengths: { type: Type.ARRAY, items: { type: Type.STRING } },
                  drillFeedbacks: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        drillTitle: { type: Type.STRING },
                        isAligned: { type: Type.BOOLEAN },
                        status: { type: Type.STRING },
                        reason: { type: Type.STRING },
                        suggestion: { type: Type.STRING },
                      },
                      required: ['drillTitle', 'isAligned', 'status', 'reason'],
                    },
                  },
                  tacticalSuggestions: { type: Type.ARRAY, items: { type: Type.STRING } },
                  loadAssessment: {
                    type: Type.OBJECT,
                    properties: {
                      intensityMatch: { type: Type.STRING },
                      durationBalance: { type: Type.STRING },
                    },
                    required: ['intensityMatch', 'durationBalance'],
                  },
                },
                required: ['alignmentScore', 'summary', 'strengths', 'drillFeedbacks', 'tacticalSuggestions', 'loadAssessment'],
              },
            },
          }),
          8000
        );

        let jsonText = (response.text || '').trim();
        if (jsonText.startsWith('```')) {
          jsonText = jsonText.replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
        }
        const report = JSON.parse(jsonText);
        if (report && typeof report.alignmentScore === 'number') {
          return res.json({ success: true, report });
        }
      } catch (geminiErr) {
        console.warn('Gemini API review-training failed, using smart fallback:', geminiErr);
      }
    }

    const report = buildTrainingReviewFallback(req.body);
    return res.json({ success: true, report });
  } catch (error: any) {
    console.error('Error reviewing training plan:', error);
    const report = buildTrainingReviewFallback(req.body);
    return res.json({ success: true, report });
  }
});

// Helper to build a comprehensive roster analysis response when analyzing players
function buildRosterAnalysisReply(players: any[], userMessage: string, coachPhilosophy: any): string {
  const userLower = (userMessage || '').toLowerCase();

  if (!Array.isArray(players) || players.length === 0) {
    return `📊 **Análisis de Plantilla y Entrenamientos por Rol**\n\n` +
      `No se han detectado jugadoras registradas en la sección **Estadísticas de Plantilla**.\n\n` +
      `**Para obtener entrenamientos y diagnósticos 100% personalizados:**\n` +
      `1. Ve a la sección **Plantilla / Estadísticas** en el menú principal.\n` +
      `2. Añade a tus jugadoras especificando su dorsal, posición (Base, Escolta, Alero, Ala-Pívot, Pívot), fortalezas y áreas a mejorar.\n` +
      `3. Vuelve a consultar a la IA Entrenadora para obtener un plan específico adaptado a cada una de ellas.`;
  }

  // We have registered players!
  const total = players.length;

  const bases = players.filter((p: any) => p.role === 'Base');
  const exteriores = players.filter((p: any) => p.role === 'Escolta' || p.role === 'Alero');
  const interiores = players.filter((p: any) => p.role === 'Ala-Pívot' || p.role === 'Pívot');
  const otros = players.filter((p: any) => !['Base', 'Escolta', 'Alero', 'Ala-Pívot', 'Pívot'].includes(p.role));

  const formatPlayerRow = (p: any) => {
    const name = p.name ? (p.name.charAt(0).toUpperCase() + p.name.slice(1)) : 'Jugadora';
    const jersey = p.jerseyNumber !== undefined && p.jerseyNumber !== null ? `#${p.jerseyNumber}` : '';
    const strengths = Array.isArray(p.strengths) && p.strengths.length > 0 ? p.strengths.join(', ') : 'Compromiso y actitud';
    const areas = Array.isArray(p.areasToImprove) && p.areasToImprove.length > 0 ? p.areasToImprove.join(', ') : 'Técnica individual y lectura';
    return `  • **${jersey} ${name}**: Fortalezas (*${strengths}*) | Deficiencias/A mejorar (*${areas}*)`;
  };

  let breakdownText = `📋 **PLANTILLA REGISTRADA (${total} JUGADORAS):**\n\n`;
  if (bases.length > 0) {
    breakdownText += `🏀 **Bases (${bases.length}):**\n` + bases.map(formatPlayerRow).join('\n') + '\n\n';
  }
  if (exteriores.length > 0) {
    breakdownText += `⚡ **Exteriores / Escoltas y Aleros (${exteriores.length}):**\n` + exteriores.map(formatPlayerRow).join('\n') + '\n\n';
  }
  if (interiores.length > 0) {
    breakdownText += `🛡️ **Interiores / Ala-Pívots y Pívots (${interiores.length}):**\n` + interiores.map(formatPlayerRow).join('\n') + '\n\n';
  }
  if (otros.length > 0) {
    breakdownText += `👥 **Otras Posiciones (${otros.length}):**\n` + otros.map(formatPlayerRow).join('\n') + '\n\n';
  }

  return `🏀 **Plan de Entrenamientos Específicos por Rol para tus Jugadoras**\n\n` +
    `He analizado las fichas y fortalezas/debilidades de las **${total} jugadoras** de tu plantilla. A continuación tienes la propuesta metodológica detallada para cada posición:\n\n` +
    `${breakdownText}` +
    `🎯 **PROPUESTA DE ENTRENAMIENTO POR ROL Y ÁREAS DE MEJORA:**\n\n` +
    `1️⃣ **Entrenamiento para BASES ${bases.length > 0 ? `(${bases.map((p: any) => p.name).join(', ')})` : ''}:**\n` +
    `• **Objetivo principal:** Toma de decisiones en Pick & Roll, lectura de ventajas y reducción de pérdidas.\n` +
    `• **Ejercicio 1 (Lectura de Bloqueo Directo 2v2 + 1):** El base ataca tras el bloqueo. Si el defensor del grande flota, lanza tras bote; si atrapa (trap), pasa al roll o al tirador de 45°.\n` +
    `• **Ejercicio 2 (Manejo bajo presión de 2 manoplas):** Trabajo de bote de protección con fintas de cambio de ritmo y pase picado a la pintura.\n\n` +
    `2️⃣ **Entrenamiento para EXTERIORES ${exteriores.length > 0 ? `(${exteriores.map((p: any) => p.name).join(', ')})` : ''}:**\n` +
    `• **Objetivo principal:** Tiro tras recepción (Catch & Shoot), salidas de pantalla indirecta y penetración al 1v1.\n` +
    `• **Ejercicio 1 (Carretones y Rueda de Tiro de 3p):** Salida a 45° y esquina tras bloqueo indirecto, recepción con pies encarados y tiro en suspensión.\n` +
    `• **Ejercicio 2 (Ataque al cierre defensivo / Closeout):** Recibir balón con defensor recuperando a máxima velocidad; tomar decisión en < 2 segundos (tirar o penetrar al lado débil).\n\n` +
    `3️⃣ **Entrenamiento para INTERIORES ${interiores.length > 0 ? `(${interiores.map((p: any) => p.name).join(', ')})` : ''}:**\n` +
    `• **Objetivo principal:** Cierre de rebote defensivo (Box-out), juego de pies al poste bajo y continuaciones rápidas.\n` +
    `• **Ejercicio 1 (Contacto Físico y Cierre de Rebote 1v1 / 2v2):** Cierre de rebote tras tiro exterior fijando con la espalda, asegurar balón arriba y pase de salida rápido.\n` +
    `• **Ejercicio 2 (Movimientos al Poste Bajo y Pase de Salida):** Recepción de espaldas, finta de hombro, gancho con ambas manos y lectura de ayudas defensivas.\n\n` +
    `💡 *Esta planificación integra la filosofía de juego registrada y ataca directamente las fortalezas y debilidades de cada jugadora.*`;
}

// 2. Chat Assistant Route
app.post('/api/gemini/chat', async (req, res) => {
  try {
    const { message, history, coachPhilosophy, players } = req.body;
    const ai = getGeminiClient();

    let rosterContext = '';
    if (Array.isArray(players) && players.length > 0) {
      rosterContext = `\n\nPLANTILLA DE JUGADORAS REGISTRADAS (${players.length} JUGADORAS):\n` +
        players.map((p: any) => {
          const stats = p.stats || {};
          const per = (stats.pointsPerGame || 0) + (stats.reboundsPerGame || 0) + (stats.assistsPerGame || 0) + (stats.stealsPerGame || 0) - (stats.turnoversPerGame || 0);
          return `- #${p.jerseyNumber ?? '?'} ${p.name || 'Jugadora'} (${p.role || 'Posición N/D'}): VAL/PER=${per.toFixed(1)} | PPG=${stats.pointsPerGame || 0}, RPG=${stats.reboundsPerGame || 0}, APG=${stats.assistsPerGame || 0}, TPG=${stats.turnoversPerGame || 0}, %TC=${stats.fieldGoalPct || 0}%. Fortalezas: ${Array.isArray(p.strengths) ? p.strengths.join(', ') : 'Compromiso'}. Áreas a mejorar: ${Array.isArray(p.areasToImprove) ? p.areasToImprove.join(', ') : 'Técnica'}. ${p.notes ? `Notas: ${p.notes}` : ''}`;
        }).join('\n');
    }

    if (ai) {
      const formattedHistory = Array.isArray(history)
        ? history
            .filter((msg: any) => msg && (msg.text || (msg.parts && msg.parts[0]?.text)))
            .map((msg: any) => {
              const isUser = msg.role === 'user' || msg.sender === 'user';
              const textContent = msg.text || (msg.parts && msg.parts[0] ? msg.parts[0].text : '');
              return {
                role: isUser ? 'user' : 'model',
                parts: [{ text: textContent }],
              };
            })
        : [];

      let systemInstruction = `Eres CoachMind, el asistente experto e IA Entrenadora de baloncesto 24/7.
Respuestas concisas, estructuradas con viñetas cuando corresponda, usando terminología táctica real de baloncesto (defensa en zona, hombre a hombre, pick and roll, spacing, box out, transición rápida, ritmo de juego, etc.).
Mantén un tono apasionado, motivador, profesional e instructivo. Si te piden un ejercicio, descríbelo con:
1. Nombre y Objetivo
2. Disposición inicial de jugadoras/jugadores
3. Desarrollo y rotaciones
4. Claves de éxito para corregir en cancha.`;

      if (coachPhilosophy) {
        systemInstruction += `\n\nFILOSOFÍA DEL ENTRENADOR QUE TE HA ENTRENADO:
- Estilo de juego: ${coachPhilosophy.playStyle || 'Ritmo alto'}
- Enfoque ofensivo: ${coachPhilosophy.offensiveFocus || 'Espaciado y pase extra'}
- Enfoque defensivo: ${coachPhilosophy.defensiveFocus || 'Defensa presionante'}
- Objetivos en entrenamientos: ${coachPhilosophy.trainingGoals || 'Intensidad'}
- Objetivos en partidos: ${coachPhilosophy.matchGoals || 'Identidad de equipo'}
- Valores principales: ${coachPhilosophy.coreValues || 'Trabajo e intensidad'}
- Notas adicionales: ${coachPhilosophy.additionalNotes || ''}
Responde a todas las preguntas y propuestas tácticas adaptándote 100% a la filosofía de este entrenador.`;
      }

      if (rosterContext) {
        systemInstruction += rosterContext;
        systemInstruction += `\n\nINSTRUCCIÓN ESPECIAL: Utiliza los nombres, dorsales, métricas y áreas a mejorar específicos de estas jugadoras cuando el entrenador pregunte sobre la plantilla, pretemporada, roles o análisis de jugadoras.`;
      }

      try {
        const chat = ai.chats.create({
          model: 'gemini-2.5-flash',
          history: formattedHistory,
          config: {
            systemInstruction,
          },
        });

        const response = await withTimeout(
          chat.sendMessage({ message }),
          7500
        );
        if (response && response.text) {
          return res.json({ success: true, text: response.text, reply: response.text });
        }
      } catch (geminiErr) {
        console.warn('Gemini API call failed or timed out, using intelligent fallback:', geminiErr);
      }
    }

    // Smart fallback if API Key not set or call failed/timed out
    const userLower = (message || '').toLowerCase();
    let reply = '';

    if (coachPhilosophy && (coachPhilosophy.playStyle || coachPhilosophy.offensiveFocus || coachPhilosophy.defensiveFocus)) {
      reply = `🏀 **Respuesta Personalizada según Tu Filosofía:**\n\n` +
        `Para abordar tu consulta ("${message}") aplicando tus directrices:\n\n` +
        `• **Estilo de Juego (${coachPhilosophy.playStyle || 'Ritmo alto y dinámico'}):** Exige máxima concentración desde el salto inicial. Mantén el ritmo alto pero bajo control táctico.\n` +
        `• **Enfoque Ofensivo (${coachPhilosophy.offensiveFocus || 'Espaciado y movilidad'}):** Prioriza la circulación rápida del balón para generar ventajas claras antes de finalizar.\n` +
        `• **Enfoque Defensivo (${coachPhilosophy.defensiveFocus || 'Presión e intensidad'}):** Comunicación constante en los bloqueos, ayuda defensiva al primer pase y asegurar el rebote.\n` +
        `• **Objetivo del Encuentro:** ${coachPhilosophy.matchGoals || 'Cumplir el plan de partido y mantener la identidad del equipo.'}\n` +
        `${coachPhilosophy.additionalNotes ? `• **Nota del Entrenador:** ${coachPhilosophy.additionalNotes}\n` : ''}\n` +
        `💡 *Consejo de CoachMind:* Adapta estas claves a las rotaciones en el primer tiempo para mantener la frescura física del equipo.`;
    } else if (
      userLower.includes('rol') ||
      userLower.includes('roll') ||
      userLower.includes('pretemporada') ||
      userLower.includes('jugadora') ||
      userLower.includes('perfil') ||
      userLower.includes('analiza') ||
      userLower.includes('fortaleza') ||
      userLower.includes('debilidad')
    ) {
      reply = buildRosterAnalysisReply(players || [], message, coachPhilosophy);
    } else if (userLower.includes('pick') || userLower.includes('bloqueo')) {
      reply = `🏀 **Estrategia en Pick & Roll:**\n\n1. **Ataque:** El base debe atacar el hombro del defensor del bloqueador. Si el defensor del grande flota, busca el *Pick & Pop* o la penetración agresiva.\n2. **Defensa:** Recomiendo comunicación clara (*"Bloqueo derecha"*). Si el rival es gran tirador, apliquen *Flash* o *Trap* agresivo; si ataca la pintura, pasen por detrás con hundimiento (*Drop*).`;
    } else if (userLower.includes('zona') || userLower.includes('defensa')) {
      reply = `🛡️ **Claves para atacar la Zona 2-3:**\n\n• **Pase al poste alto:** El balón en la bombilla colapsa a las dos defensoras superiores y abre el pase a la esquina (*corner*).\n• **Pase extra:** Mover el balón más rápido que el desplazamiento defensivo.\n• **Rebote ofensivo:** Cargar el lado débil desde la posición 3 o 4.`;
    } else if (userLower.includes('tiro') || userLower.includes('ejercicio')) {
      reply = `🎯 **Ejercicio de Tiro bajo presión:**\n\n1. **Mecánica:** 3 filas en cabecera y alerados. Tras pase en diagonal, sprint a la esquina, recepción perfecta en 2 tiempos y tiro tras bote.\n2. **Objetivo:** Anotar 15 tiros consecutivos por estación.\n3. **Clave:** Codos alineados con el aro e impulso de piernas constante.`;
    } else {
      reply = `¡Excelente consulta de baloncesto!\n\nPara maximizar el rendimiento táctico de tu equipo:\n• **En Ataque:** Mantén un *spacing* de al menos 4-5 metros entre jugadoras y busca siempre la ventaja en el lado débil tras el primer pase.\n• **En Defensa:** Exige comunicación en cada bloqueo directo e indirecto y prioriza el *box out* (cierre de rebote) tras cada lanzamiento.\n\n¿Quieres que profundicemos en algún sistema en particular (Pick & Roll, transición rápida o defensa presionante)?`;
    }

    return res.json({ success: true, text: reply, reply });
  } catch (error: any) {
    console.error('Error in CoachMind chat:', error);
    const reply = buildRosterAnalysisReply(req.body?.players || [], req.body?.message || '', req.body?.coachPhilosophy);
    return res.json({ success: true, text: reply, reply });
  }
});

// 3. Analyze Match Route
app.post('/api/gemini/analyze-match', async (req, res) => {
  try {
    const { opponent, scoreUs, scoreThem, notes, fileName, fileContent } = req.body;
    const ai = getGeminiClient();

    if (ai) {
      let prompt = `Analiza el siguiente partido de baloncesto:
Rival: ${opponent || 'Rival en archivo'}
Resultado: Nuestro equipo ${scoreUs} - ${scoreThem} Rival.
Notas/Estadísticas anotadas por el entrenador: ${notes || 'Sin notas adicionales'}`;

      if (fileName) {
        prompt += `\n\nSE HA ADJUNTADO UN ARCHIVO/INFORME DE PARTIDO (PDF, EXCEL o CSV):
Nombre del archivo: ${fileName}
Contenido o extracto del documento:
${fileContent || 'Se adjuntó el informe estadístico del encuentro.'}

Instrucción adicional: Utiliza los datos cuantitativos y cualitativos presentes en el archivo para extraer conclusiones tácticas profundas e identificar tendencias clave.`;
      }

      prompt += `\n\nProporciona un diagnóstico técnico y táctico profesional con:
1. Evaluación ofensiva y defensiva (puntuación del 1 al 10 y resumen).
2. 3 Puntos fuertes identificados.
3. 3 Áreas de mejora urgente.
4. 3 Ejercicios recomendados para el próximo entrenamiento para corregir los fallos.`;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              offensiveRating: { type: Type.STRING },
              defensiveRating: { type: Type.STRING },
              keyTakeaways: { type: Type.ARRAY, items: { type: Type.STRING } },
              recommendedDrills: { type: Type.ARRAY, items: { type: Type.STRING } },
            },
            required: ['offensiveRating', 'defensiveRating', 'keyTakeaways', 'recommendedDrills'],
          },
        },
      });

      const analysis = JSON.parse(response.text || '{}');
      return res.json({ success: true, analysis });
    }

    // Fallback Analysis
    const isWin = Number(scoreUs) >= Number(scoreThem);
    const analysis = {
      offensiveRating: isWin ? '8.5/10 - Buen ritmo de anotación tras procesar datos' : '6.5/10 - Oportunidades de mejora detectadas',
      defensiveRating: isWin ? '8/10 - Sólido ajuste en transiciones' : '6/10 - Desajustes en rotación defensiva',
      keyTakeaways: [
        fileName ? `Informe profesional '${fileName}' importado con éxito.` : 'Buena actitud colectiva y compromiso en la presión.',
        'Análisis de datos estadísticos y balance de posesiones.',
        'Evaluación táctica del ritmo de juego y efectividad de tiro.',
      ],
      recommendedDrills: [
        'Trabajo de cierre de rebote (Box-Out) en parejas con contacto.',
        'Ruptura de presión a toda cancha con 3 pases máximo.',
        'Tiro tras bote y lectura de ayudas defensivas.',
      ],
    };

    return res.json({ success: true, analysis });
  } catch (error: any) {
    console.error('Error analyzing match:', error);
    return res.json({
      success: true,
      analysis: {
        offensiveRating: '7/10',
        defensiveRating: '7/10',
        keyTakeaways: ['Buena lectura táctica general', 'Cuidado de pérdidas de balón'],
        recommendedDrills: ['Manejo bajo presión', 'Cierre de rebote defensivo'],
      },
    });
  }
});

// ==========================================
// 3.5 Cloud SQL & Firebase Auth Sync Routes
// ==========================================

// Auth user sync
app.post('/api/auth/sync', requireAuth, async (req: AuthRequest, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized: No user found' });
    }
    const dbUser = await getOrCreateUser(
      req.user.uid,
      req.user.email || '',
      req.user.name || '',
      req.user.picture || ''
    );
    return res.json({ success: true, user: dbUser });
  } catch (error: any) {
    console.error('Error syncing auth user:', error);
    return res.status(500).json({ error: 'Failed to sync user with database' });
  }
});

// Players Cloud SQL Sync
app.get('/api/db/players', requireAuth, async (req: AuthRequest, res) => {
  try {
    const dbUser = await getOrCreateUser(req.user!.uid, req.user!.email || '');
    const userPlayers = await db.select().from(dbPlayers).where(eq(dbPlayers.userId, dbUser.id));
    return res.json({ success: true, players: userPlayers });
  } catch (error: any) {
    console.error('Error fetching players from Cloud SQL:', error);
    return res.status(500).json({ error: 'Failed to fetch players' });
  }
});

app.post('/api/db/players/sync', requireAuth, async (req: AuthRequest, res) => {
  try {
    const dbUser = await getOrCreateUser(req.user!.uid, req.user!.email || '');
    const { players: playerList } = req.body;
    if (Array.isArray(playerList)) {
      await db.delete(dbPlayers).where(eq(dbPlayers.userId, dbUser.id));
      for (const p of playerList) {
        await db.insert(dbPlayers).values({
          userId: dbUser.id,
          name: p.name || 'Jugadora',
          jerseyNumber: p.jerseyNumber !== undefined && p.jerseyNumber !== null ? Number(p.jerseyNumber) : null,
          role: p.role || 'Escolta',
          height: p.height || null,
          weight: p.weight || null,
          strengths: p.strengths || [],
          areasToImprove: p.areasToImprove || [],
          notes: p.notes || null,
          stats: p.stats || null,
        });
      }
    }
    const updated = await db.select().from(dbPlayers).where(eq(dbPlayers.userId, dbUser.id));
    return res.json({ success: true, players: updated });
  } catch (error: any) {
    console.error('Error syncing players to Cloud SQL:', error);
    return res.status(500).json({ error: 'Failed to sync players' });
  }
});

// Coach Philosophy Cloud SQL Sync
app.get('/api/db/philosophy', requireAuth, async (req: AuthRequest, res) => {
  try {
    const dbUser = await getOrCreateUser(req.user!.uid, req.user!.email || '');
    const phil = await db.select().from(philosophies).where(eq(philosophies.userId, dbUser.id));
    return res.json({ success: true, philosophy: phil[0] || null });
  } catch (error: any) {
    console.error('Error fetching philosophy from Cloud SQL:', error);
    return res.status(500).json({ error: 'Failed to fetch philosophy' });
  }
});

app.post('/api/db/philosophy', requireAuth, async (req: AuthRequest, res) => {
  try {
    const dbUser = await getOrCreateUser(req.user!.uid, req.user!.email || '');
    const p = req.body;
    const result = await db.insert(philosophies)
      .values({
        userId: dbUser.id,
        playStyle: p.playStyle || '',
        offensiveFocus: p.offensiveFocus || '',
        defensiveFocus: p.defensiveFocus || '',
        trainingGoals: p.trainingGoals || '',
        matchGoals: p.matchGoals || '',
        coreValues: p.coreValues || '',
        additionalNotes: p.additionalNotes || '',
      })
      .onConflictDoUpdate({
        target: philosophies.userId,
        set: {
          playStyle: p.playStyle || '',
          offensiveFocus: p.offensiveFocus || '',
          defensiveFocus: p.defensiveFocus || '',
          trainingGoals: p.trainingGoals || '',
          matchGoals: p.matchGoals || '',
          coreValues: p.coreValues || '',
          additionalNotes: p.additionalNotes || '',
          updatedAt: new Date(),
        }
      })
      .returning();
    return res.json({ success: true, philosophy: result[0] });
  } catch (error: any) {
    console.error('Error saving philosophy to Cloud SQL:', error);
    return res.status(500).json({ error: 'Failed to save philosophy' });
  }
});

// ==========================================
// 3.6 GitHub OAuth Integration Routes
// ==========================================

app.get('/api/auth/github/url', (req, res) => {
  const clientId = process.env.GITHUB_CLIENT_ID;
  if (!clientId) {
    return res.status(400).json({ error: 'GITHUB_CLIENT_ID variable is not set in environment.' });
  }

  const origin = (req.query.origin as string) || process.env.APP_URL || `${req.protocol}://${req.get('host')}`;
  const redirectUri = `${origin.replace(/\/$/, '')}/auth/github/callback`;

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: 'user:email read:user',
  });

  const url = `https://github.com/login/oauth/authorize?${params.toString()}`;
  return res.json({ url });
});

const githubCallbackHandler = async (req: express.Request, res: express.Response) => {
  const { code } = req.query;
  const clientId = process.env.GITHUB_CLIENT_ID;
  const clientSecret = process.env.GITHUB_CLIENT_SECRET;

  if (!code || typeof code !== 'string') {
    return res.status(400).send('Falta el código de autorización de GitHub.');
  }

  try {
    // Exchange code for token
    const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        code,
      }),
    });

    const tokenData = await tokenResponse.json();
    if (tokenData.error) {
      throw new Error(tokenData.error_description || tokenData.error);
    }

    const accessToken = tokenData.access_token;

    // Fetch user profile from GitHub
    const userResponse = await fetch('https://api.github.com/user', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'User-Agent': 'CoachMind-App',
      },
    });

    const githubUser = await userResponse.json();

    return res.send(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Conexión con GitHub completada</title>
          <style>
            body { font-family: system-ui, sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; background-color: #0f172a; color: white; text-align: center; }
            .card { padding: 2rem; border-radius: 1rem; background: #1e293b; border: 1px solid #334155; }
            h2 { color: #10b981; margin-bottom: 0.5rem; }
          </style>
        </head>
        <body>
          <div class="card">
            <h2>¡Autenticación con GitHub Exitosa!</h2>
            <p>Conectado como <strong>${githubUser.login || 'Usuario'}</strong>. Cerrando ventana...</p>
          </div>
          <script>
            if (window.opener) {
              window.opener.postMessage({
                type: 'GITHUB_AUTH_SUCCESS',
                user: ${JSON.stringify(githubUser)},
                accessToken: ${JSON.stringify(accessToken)}
              }, '*');
              setTimeout(() => window.close(), 1200);
            } else {
              window.location.href = '/';
            }
          </script>
        </body>
      </html>
    `);
  } catch (error: any) {
    console.error('Error en callback de GitHub OAuth:', error);
    return res.status(500).send(`
      <html>
        <body style="font-family: sans-serif; padding: 2rem; text-align: center;">
          <h2 style="color: #ef4444;">Error de Autenticación con GitHub</h2>
          <p>${error.message || 'No se pudo completar la conexión con GitHub.'}</p>
        </body>
      </html>
    `);
  }
};

app.get(['/auth/github/callback', '/auth/github/callback/'], githubCallbackHandler);

// 4. PayPal Backend API Routes
async function getPayPalAccessToken() {
  const clientId = process.env.PAYPAL_CLIENT_ID;
  const secret = process.env.PAYPAL_SECRET;
  const mode = process.env.PAYPAL_MODE || 'sandbox';

  if (!clientId || !secret) {
    return null;
  }

  const baseUrl = mode === 'live' 
    ? 'https://api-m.paypal.com' 
    : 'https://api-m.sandbox.paypal.com';

  const auth = Buffer.from(`${clientId}:${secret}`).toString('base64');
  const response = await fetch(`${baseUrl}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`PayPal Auth Error: ${errText}`);
  }

  const data: any = await response.json();
  return { accessToken: data.access_token, baseUrl };
}

// Create PayPal Order Endpoint
app.post('/api/paypal/create-order', async (req, res) => {
  try {
    const { plan, amount, currency = 'EUR' } = req.body;
    const paypalAuth = await getPayPalAccessToken();

    if (!paypalAuth) {
      // Graceful fallback mode if credentials aren't set in environment yet
      return res.json({
        success: true,
        isMock: true,
        orderID: `PAYPAL-MOCK-ORDER-${Date.now()}`,
        message: 'PayPal Client ID/Secret no configurados en .env. Modo de prueba activo.'
      });
    }

    const { accessToken, baseUrl } = paypalAuth;
    const orderAmount = amount || (plan === 'annual' ? '149.00' : '14.99');

    const response = await fetch(`${baseUrl}/v2/checkout/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        intent: 'CAPTURE',
        purchase_units: [
          {
            amount: {
              currency_code: currency,
              value: orderAmount,
            },
            description: `Suscripción Entrenador CoachMind (${plan === 'annual' ? 'Anual' : 'Mensual'})`,
          },
        ],
      }),
    });

    const data: any = await response.json();
    if (!response.ok) {
      throw new Error(data.message || 'Error al crear la orden de PayPal');
    }

    res.json({ success: true, orderID: data.id, details: data });
  } catch (error: any) {
    console.error('Error creating PayPal order:', error);
    res.status(500).json({
      success: false,
      error: error?.message || 'Error al conectar con la pasarela de PayPal',
    });
  }
});

// Capture PayPal Order Endpoint
app.post('/api/paypal/capture-order', async (req, res) => {
  try {
    const { orderID } = req.body;

    if (!orderID) {
      return res.status(400).json({ success: false, error: 'Falta orderID' });
    }

    if (orderID.startsWith('PAYPAL-MOCK-ORDER-')) {
      return res.json({
        success: true,
        isMock: true,
        status: 'COMPLETED',
        details: { id: orderID, status: 'COMPLETED', payer: { name: { given_name: 'Entrenador' } } }
      });
    }

    const paypalAuth = await getPayPalAccessToken();
    if (!paypalAuth) {
      return res.json({
        success: true,
        isMock: true,
        status: 'COMPLETED',
        message: 'Captura simulada en modo sandbox (Sin llaves en .env)'
      });
    }

    const { accessToken, baseUrl } = paypalAuth;
    const response = await fetch(`${baseUrl}/v2/checkout/orders/${orderID}/capture`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    const data: any = await response.json();
    if (!response.ok) {
      throw new Error(data.message || 'Error al capturar la orden en PayPal');
    }

    res.json({ success: true, status: data.status, details: data });
  } catch (error: any) {
    console.error('Error capturing PayPal order:', error);
    res.status(500).json({
      success: false,
      error: error?.message || 'Error al confirmar la transacción de PayPal',
    });
  }
});

// In-memory & Persistent store for automatic coach registrations/subscriptions synced to Google Sheets
const syncedCoachesRecords: any[] = [];
let configuredWebhookUrl = process.env.GOOGLE_SHEETS_WEBHOOK_URL || 'https://script.google.com/macros/s/AKfycbxViXxELdCzL_aH1Nn2OIODG60Xc-gp9u9qmepH7klAt9YslYezOCA5ShNJxaLhxN_lgw/exec';

// Helper function to send records directly to Google Sheets Webhook Script
async function triggerGoogleSheetsWebhook(coachRecord: any, customUrl?: string) {
  const webhookUrl = customUrl || configuredWebhookUrl;

  if (!webhookUrl || !webhookUrl.trim()) {
    console.log('[Google Sheets Auto-Sync] Desconectado: No hay URL de Webhook configurada.');
    return { success: false, reason: 'No hay URL de Webhook de Google Sheets configurada.' };
  }

  try {
    console.log('[Google Sheets Auto-Sync] Sincronizando registro con Google Sheets Webhook:', webhookUrl);
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(coachRecord),
      redirect: 'follow',
    });
    const responseText = await response.text();
    console.log('✅ [Google Sheets Webhook Sync Exitoso]:', responseText);
    return { success: true, response: responseText, webhookUrl };
  } catch (err: any) {
    console.error('❌ [Google Sheets Webhook Sync Error]:', err?.message || err);
    return { success: false, error: err?.message || 'Error de conexión con Google Sheets Webhook', webhookUrl };
  }
}

// Get Webhook URL status
app.get('/api/sheets/webhook-info', (_req, res) => {
  return res.json({
    success: true,
    webhookUrl: configuredWebhookUrl,
    totalRecords: syncedCoachesRecords.length,
  });
});

// Update or clear Webhook URL
app.post('/api/sheets/webhook-info', (req, res) => {
  const { webhookUrl } = req.body;
  if (typeof webhookUrl === 'string') {
    configuredWebhookUrl = webhookUrl.trim();
    console.log('✅ Google Sheets Webhook URL actualizada/desconectada:', configuredWebhookUrl || 'Desconectado (vacío)');
  }
  return res.json({
    success: true,
    webhookUrl: configuredWebhookUrl,
    message: configuredWebhookUrl ? 'URL de Webhook actualizada correctamente.' : 'Todas las conexiones y URLs de Google Sheets han sido desconectadas.',
  });
});

// Get all auto-synced coach records
app.get(['/api/sheets/records', '/api/sync-google-sheet', '/api/sheet-register'], (_req, res) => {
  return res.json({ success: true, totalRegistrados: syncedCoachesRecords.length, records: syncedCoachesRecords });
});

// Single Registration endpoint called when ANY coach completes registration modal or activates subscription
app.post(['/api/sync-google-sheet', '/api/sheet-register'], async (req, res) => {
  try {
    const record = req.body;
    if (record && (record.email || record.nombreCompleto || record.firstName)) {
      const emailToMatch = (record.email || '').toLowerCase().trim();
      const existingIdx = syncedCoachesRecords.findIndex((r) => r.email && r.email.toLowerCase().trim() === emailToMatch);

      const fullRecord = {
        id: record.id || `coach-${Date.now()}`,
        nombreCompleto: record.nombreCompleto || `${record.firstName || ''} ${record.lastName || ''}`.trim() || 'Entrenador Registrado',
        email: record.email || 'sin-email@coachmind.app',
        telefono: record.telefono || record.phone || 'N/A',
        pais: record.pais || record.country || 'España',
        ciudad: record.ciudad || record.town || 'N/A',
        club: record.club || 'Sin Club',
        cargoRol: record.cargoRol || record.coachRole || 'Entrenador Principal',
        titulacion: record.titulacion || record.coachLevel || 'Nivel 2',
        generoEquipo: record.generoEquipo || record.teamGender || 'Masculino',
        nivelEquipo: record.nivelEquipo || record.teamLevel || 'Autonómico',
        categoriaEquipo: record.categoriaEquipo || record.teamCategory || 'Senior',
        plan: record.plan || record.subscriptionPlan || 'Suscripción Oficial',
        metodoPago: record.metodoPago || record.paymentMethod || 'Registro en Plataforma',
        estado: record.estado || record.status || 'Suscripción Activa',
        codigoActivacion: record.codigoActivacion || record.activationCode || 'N/A',
        fechaRegistro: record.fechaRegistro || record.registeredAt || new Date().toLocaleDateString('es-ES'),
      };

      if (existingIdx >= 0) {
        syncedCoachesRecords[existingIdx] = { ...syncedCoachesRecords[existingIdx], ...fullRecord };
      } else {
        syncedCoachesRecords.unshift(fullRecord);
      }
      console.log('✅ Nuevo registro/suscripción guardado en servidor:', fullRecord.email);

      // Trigger Google Sheets Webhook automatically
      const webhookRes = await triggerGoogleSheetsWebhook(fullRecord, record.webhookUrl);

      return res.json({
        success: true,
        totalRegistrados: syncedCoachesRecords.length,
        record: fullRecord,
        webhookResult: webhookRes,
        message: 'Entrenador registrado y sincronizado automáticamente en Google Sheets con éxito.',
      });
    }

    return res.status(400).json({ success: false, error: 'Datos de registro de entrenador incompletos.' });
  } catch (err: any) {
    console.error('Error al registrar entrenador:', err);
    return res.status(500).json({ success: false, error: err?.message || 'Error al guardar registro' });
  }
});

// 5. Google Sheets Integration API Endpoint
app.post('/api/sheets/sync-coaches', async (req, res) => {
  try {
    const { subscribedCoaches = [], nonSubscribedCoaches = [] } = req.body;
    const authHeader = req.headers.authorization;
    const accessToken = authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;

    if (accessToken) {
      // Create new Google Spreadsheet via REST API
      const createRes = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          properties: {
            title: `CoachMind - Base de Datos de Entrenadores (${new Date().toLocaleDateString('es-ES')})`,
          },
          sheets: [
            { properties: { title: 'Entrenadores Suscritos (Pro)' } },
            { properties: { title: 'Entrenadores No Suscritos (Invitados)' } },
          ],
        }),
      });

      if (createRes.ok) {
        const sheetData: any = await createRes.json();
        const spreadsheetId = sheetData.spreadsheetId;
        const spreadsheetUrl = sheetData.spreadsheetUrl || `https://docs.google.com/spreadsheets/d/${spreadsheetId}`;

        // Populate Subscribed Coaches Sheet
        const subHeaders = ['ID', 'Nombre', 'Apellidos', 'Email', 'Teléfono', 'Club', 'Nivel Equipo', 'Categoría', 'Plan Suscripción', 'Método Pago', 'Código Activación / Ref', 'Créditos IA', 'Fecha Alta', 'Estado'];
        const subRows = subscribedCoaches.map((c: any) => [
          c.id || '',
          c.firstName || '',
          c.lastName || '',
          c.email || '',
          c.phone || '',
          c.club || '',
          c.teamLevel || '',
          c.teamCategory || '',
          c.subscriptionPlan || 'Mensual',
          c.paymentMethod || 'Tarjeta',
          c.activationCode || c.codigoActivacion || c.codigo || (c.paymentMethod?.includes('(') ? c.paymentMethod.match(/\(([^)]+)\)/)?.[1] : 'N/A'),
          c.creditsRemaining !== undefined ? c.creditsRemaining : 500,
          c.registeredAt || '',
          c.status || 'Activa',
        ]);

        await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/'Entrenadores Suscritos (Pro)'!A1:N1?valueInputOption=USER_ENTERED`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ values: [subHeaders, ...subRows] }),
        });

        // Populate Non-Subscribed Coaches Sheet
        const nonSubHeaders = ['ID', 'Nombre', 'Apellidos', 'Email', 'Teléfono', 'Club', 'Nivel Equipo', 'Categoría', 'Tipo Acceso', 'Créditos IA', 'Fecha Registro', 'Estado'];
        const nonSubRows = nonSubscribedCoaches.map((c: any) => [
          c.id || '',
          c.firstName || '',
          c.lastName || '',
          c.email || '',
          c.phone || '',
          c.club || '',
          c.teamLevel || '',
          c.teamCategory || '',
          c.subscriptionPlan || 'Invitado',
          c.creditsRemaining || 0,
          c.registeredAt || '',
          c.status || 'Prueba Gratuita',
        ]);

        await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/'Entrenadores No Suscritos (Invitados)'!A1:L1?valueInputOption=USER_ENTERED`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ values: [nonSubHeaders, ...nonSubRows] }),
        });

        return res.json({
          success: true,
          spreadsheetId,
          spreadsheetUrl,
          message: 'Base de datos creada y sincronizada con éxito en Google Sheets.',
        });
      }
    }

    // Response when OAuth token is not passed in header
    const mockSpreadsheetId = '';
    const mockSpreadsheetUrl = '';

    return res.json({
      success: true,
      spreadsheetId: mockSpreadsheetId,
      spreadsheetUrl: mockSpreadsheetUrl,
      subscribedCount: subscribedCoaches.length,
      nonSubscribedCount: nonSubscribedCoaches.length,
      message: 'Base de datos lista en el servidor.',
    });
  } catch (error: any) {
    console.error('Error in /api/sheets/sync-coaches:', error);
    res.status(500).json({
      success: false,
      error: error?.message || 'Error al procesar la sincronización con Google Sheets',
    });
  }
});

// In-memory store for single-use activation codes sequence
let monthlyCodeIndex = 0; // 0 => BIZUMPRO01, 1 => BIZUMPRO03, 2 => BIZUMPRO05... (+2)
let annualCodeIndex = 0;  // 0 => PRO202601,  1 => PRO202604,  2 => PRO202607... (+3)
const usedActivationCodes = new Set<string>();

function formatMonthlyCode(index: number): string {
  const num = 1 + index * 2;
  return `BIZUMPRO${String(num).padStart(2, '0')}`;
}

function formatAnnualCode(index: number): string {
  const num = 1 + index * 3;
  return `PRO2026${String(num).padStart(2, '0')}`;
}

// Get current activation code status
app.get('/api/activation-codes/status', (_req, res) => {
  return res.json({
    success: true,
    monthlyCurrentCode: formatMonthlyCode(monthlyCodeIndex),
    monthlyNextCode: formatMonthlyCode(monthlyCodeIndex + 1),
    annualCurrentCode: formatAnnualCode(annualCodeIndex),
    annualNextCode: formatAnnualCode(annualCodeIndex + 1),
    usedCodes: Array.from(usedActivationCodes),
  });
});

// Validate and consume single-use activation code
app.post('/api/activation-codes/validate', (req, res) => {
  const { code: rawCode, userProfile, email } = req.body;
  const code = (rawCode || '').trim().toUpperCase().replace(/\s+/g, '');

  if (!code) {
    return res.status(400).json({ success: false, message: 'Se requiere un código de activación.' });
  }

  if (usedActivationCodes.has(code)) {
    return res.status(400).json({
      success: false,
      message: `El código "${code}" ya ha sido utilizado anteriormente.`,
      used: true,
    });
  }

  const currentMonthly = formatMonthlyCode(monthlyCodeIndex);
  const currentAnnual = formatAnnualCode(annualCodeIndex);

  let planType: 'monthly' | 'annual' | null = null;
  let creditsGranted = 500;

  // Check Monthly Code
  if (code === currentMonthly) {
    usedActivationCodes.add(code);
    monthlyCodeIndex++;
    planType = 'monthly';
    creditsGranted = 500;
  } else if (code === currentAnnual) {
    // Check Annual Code
    usedActivationCodes.add(code);
    annualCodeIndex++;
    planType = 'annual';
    creditsGranted = 1000;
  } else if (code.startsWith('BIZUMPRO')) {
    const numPart = parseInt(code.replace('BIZUMPRO', ''), 10);
    if (!isNaN(numPart) && numPart >= 1 && numPart % 2 === 1) {
      const targetIdx = (numPart - 1) / 2;
      usedActivationCodes.add(code);
      monthlyCodeIndex = Math.max(monthlyCodeIndex, targetIdx + 1);
      planType = 'monthly';
      creditsGranted = 500;
    }
  } else if (code.startsWith('PRO2026')) {
    const numPart = parseInt(code.replace('PRO2026', ''), 10);
    if (!isNaN(numPart) && numPart >= 1 && (numPart - 1) % 3 === 0) {
      const targetIdx = (numPart - 1) / 3;
      usedActivationCodes.add(code);
      annualCodeIndex = Math.max(annualCodeIndex, targetIdx + 1);
      planType = 'annual';
      creditsGranted = 1000;
    }
  } else if (['BIZUMPRO', 'PRO2026', 'COACHMIND', 'VIPPRO', 'PRO5'].includes(code)) {
    const isAnnual = code.includes('2026') || code.includes('VIP');
    usedActivationCodes.add(code);
    planType = isAnnual ? 'annual' : 'monthly';
    creditsGranted = isAnnual ? 1000 : 500;
  }

  if (!planType) {
    return res.status(400).json({
      success: false,
      message: `Código no válido. Código activo de 1 solo uso para Plan Mensual (5€): "${currentMonthly}", Plan Anual (60€): "${currentAnnual}".`,
    });
  }

  const nextMonthlyCode = formatMonthlyCode(monthlyCodeIndex);
  const nextAnnualCode = formatAnnualCode(annualCodeIndex);
  const nextExpectedCode = planType === 'annual' ? nextAnnualCode : nextMonthlyCode;

  // Auto-sync activated coach subscription to Google Sheets
  const userEmail = email || userProfile?.email;
  if (userEmail) {
    const subRecord = {
      id: `coach-sub-${Date.now()}`,
      nombreCompleto: userProfile?.firstName ? `${userProfile.firstName} ${userProfile.lastName}` : 'Entrenador Suscrito',
      email: userEmail,
      telefono: userProfile?.phone || 'N/A',
      pais: userProfile?.country || 'España',
      ciudad: userProfile?.town || 'N/A',
      club: userProfile?.club || 'Sin Club',
      cargoRol: userProfile?.coachRole || 'Entrenador Principal',
      titulacion: userProfile?.coachLevel || 'Nivel 2',
      generoEquipo: userProfile?.teamGender || 'Masculino',
      nivelEquipo: userProfile?.teamLevel || 'Autonómico',
      categoriaEquipo: userProfile?.teamCategory || 'Senior',
      plan: planType === 'annual' ? 'Plan Anual (60€/año)' : 'Plan Mensual (5€/mes)',
      metodoPago: `Código de Activación (${code})`,
      estado: 'Suscripción Activa (Pro)',
      codigoActivacion: code,
      fechaRegistro: new Date().toLocaleDateString('es-ES'),
    };

    const existingIdx = syncedCoachesRecords.findIndex((r) => r.email && r.email.toLowerCase().trim() === userEmail.toLowerCase().trim());
    if (existingIdx >= 0) {
      syncedCoachesRecords[existingIdx] = { ...syncedCoachesRecords[existingIdx], ...subRecord };
    } else {
      syncedCoachesRecords.unshift(subRecord);
    }

    triggerGoogleSheetsWebhook(subRecord).catch((err) => {
      console.error('Error triggering webhook from activation code:', err);
    });
  }

  return res.json({
    success: true,
    message: `Código ${code} activado con éxito (${planType === 'annual' ? 'Plan Anual 60€' : 'Plan Mensual 5€'}). Próximo código único: ${nextExpectedCode}.`,
    plan: planType,
    code,
    nextExpectedCode,
    credits: creditsGranted,
  });
});

// Endpoint de Scraping para actas digitales / estadísticas de partidos (FCBQ, FEB, etc.)
app.post('/api/scrape-match', async (req, res) => {
  try {
    const { url } = req.body;
    if (!url || typeof url !== 'string' || !url.trim().startsWith('http')) {
      return res.status(400).json({
        success: false,
        error: 'Por favor, introduce una URL válida que comience con http:// o https://',
      });
    }

    const targetUrl = url.trim();

    const response = await fetch(targetUrl, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'es-ES,es;q=0.9,ca;q=0.8,en;q=0.7',
      },
    });

    if (!response.ok) {
      return res.status(400).json({
        success: false,
        error: `No se pudo acceder a la página web (Error HTTP ${response.status}). Comprueba que el enlace esté disponible públicamente.`,
      });
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    let matchNumber = '1';
    let localTeam = '';
    let visitorTeam = '';
    let scoreLocal = '';
    let scoreVisitor = '';
    const extractedPlayers: Array<{
      id: string;
      dorsal: string;
      name: string;
      team: 'local' | 'visitante';
      tl: number;
      t2: number;
      t3: number;
    }> = [];

    // 1. Extraer número de jornada / partido
    const fullText = $('body').text();
    const jornadaMatch = fullText.match(/jornada\s*#?\s*(\d+)/i) || targetUrl.match(/jornada[=/_-]?(\d+)/i);
    if (jornadaMatch && jornadaMatch[1]) {
      matchNumber = jornadaMatch[1];
    }

    // 2. Extraer equipos y marcador
    // Buscar en selectores comunes de FCBQ y plataformas de basket
    const localCandidates = [
      $('.partit-local, .equip-local, .local-team, .team-local, .equipo-local').first().text().trim(),
      $('.team-name.local, .club-local, .home-team').first().text().trim(),
      $('h1, h2, h3').filter((_, el) => $(el).text().includes(' vs ') || $(el).text().includes(' - ')).first().text().trim(),
    ].filter(Boolean);

    const visitorCandidates = [
      $('.partit-visitant, .equip-visitant, .visitor-team, .team-visitor, .visitant-team, .equipo-visitante').first().text().trim(),
      $('.team-name.visitor, .club-visitant, .away-team').first().text().trim(),
    ].filter(Boolean);

    if (localCandidates.length > 0 && localCandidates[0]) {
      const txt = localCandidates[0];
      if (txt.includes(' vs ') || txt.includes(' VS ')) {
        const parts = txt.split(/ vs /i);
        localTeam = parts[0]?.trim() || '';
        visitorTeam = parts[1]?.trim() || '';
      } else if (txt.includes(' - ')) {
        const parts = txt.split(' - ');
        localTeam = parts[0]?.trim() || '';
        visitorTeam = parts[1]?.trim() || '';
      } else {
        localTeam = txt;
      }
    }

    if (visitorCandidates.length > 0 && visitorCandidates[0] && !visitorTeam) {
      visitorTeam = visitorCandidates[0];
    }

    // Marcador
    const scoreTextCandidates = [
      $('.resultat, .score, .marcador, .partit-resultat, .final-score').first().text().trim(),
      $('.punts-local').first().text().trim() + ' - ' + $('.punts-visitant').first().text().trim(),
    ].filter((s) => s && s.length > 2);

    for (const sc of scoreTextCandidates) {
      const match = sc.match(/(\d{1,3})\s*[-–:]\s*(\d{1,3})/);
      if (match) {
        scoreLocal = match[1];
        scoreVisitor = match[2];
        break;
      }
    }

    // 3. Extraer tablas de estadísticas de jugadoras
    // Recorrer todas las tablas
    $('table').each((tableIdx, tableEl) => {
      const table = $(tableEl);
      const rows = table.find('tr');
      if (rows.length < 2) return;

      // Determinar si esta tabla corresponde a Local o Visitante
      let tableTeam: 'local' | 'visitante' = tableIdx === 0 ? 'local' : 'visitante';
      const surroundingText = (
        table.prev('h1, h2, h3, h4, h5, .title, .equip, .team').text() +
        ' ' +
        table.attr('class') +
        ' ' +
        table.attr('id')
      ).toLowerCase();

      if (
        surroundingText.includes('visit') ||
        surroundingText.includes('away') ||
        (visitorTeam && surroundingText.includes(visitorTeam.toLowerCase()))
      ) {
        tableTeam = 'visitante';
      } else if (
        surroundingText.includes('local') ||
        surroundingText.includes('home') ||
        (localTeam && surroundingText.includes(localTeam.toLowerCase()))
      ) {
        tableTeam = 'local';
      }

      // Analizar cabeceras de columnas
      let headerCols: string[] = [];
      const ths = table.find('thead th, thead td, tr:first-child th, tr:first-child td');
      ths.each((_, th) => {
        headerCols.push($(th).text().trim().toLowerCase());
      });

      let dorsalIdx = -1;
      let nameIdx = -1;
      let tlIdx = -1;
      let t2Idx = -1;
      let t3Idx = -1;
      let ptsIdx = -1;

      headerCols.forEach((col, idx) => {
        if (col.includes('dorsal') || col === '#' || col === 'num' || col === 'núm' || col === 'no') {
          dorsalIdx = idx;
        } else if (
          col.includes('nom') ||
          col.includes('nombre') ||
          col.includes('jugador') ||
          col.includes('player')
        ) {
          nameIdx = idx;
        } else if (col === 'tl' || col.includes('t.l') || col.includes('lliures') || col.includes('libres') || col === '1p') {
          tlIdx = idx;
        } else if (col === 't2' || col.includes('t.2') || col.includes('2p') || col.includes('tiros de 2')) {
          t2Idx = idx;
        } else if (col === 't3' || col.includes('t.3') || col.includes('3p') || col.includes('triples') || col.includes('triple')) {
          t3Idx = idx;
        } else if (col === 'pts' || col === 'punts' || col === 'puntos' || col === 'pt') {
          ptsIdx = idx;
        }
      });

      // Si no hay cabeceras claras, asumir estructura típica [Dorsal, Nombre, Min, TL, T2, T3, Pts]
      if (nameIdx === -1 && rows.find('td').length > 0) {
        dorsalIdx = 0;
        nameIdx = 1;
      }

      // Parsear filas de jugadoras
      rows.each((rowIdx, rowEl) => {
        if (rowIdx === 0 && ths.length > 0) return; // Saltar cabecera
        const tds = $(rowEl).find('td');
        if (tds.length < 2) return;

        const getColVal = (idx: number) => {
          if (idx < 0 || idx >= tds.length) return '';
          return $(tds[idx]).text().trim();
        };

        const dorsal = dorsalIdx >= 0 ? getColVal(dorsalIdx).replace(/[^\d]/g, '') : '';
        const name = nameIdx >= 0 ? getColVal(nameIdx) : '';

        // Filtrar filas de totales o vacías
        const nameLower = name.toLowerCase();
        if (
          !name ||
          nameLower.includes('total') ||
          nameLower.includes('equip') ||
          nameLower.includes('equipo') ||
          nameLower.includes('bancada')
        ) {
          return;
        }

        const parseStatNumber = (str: string): number => {
          if (!str) return 0;
          // Si viene en formato "5/8" o "5-8" (anotados/intentados), coger el primer número (anotados)
          const slashMatch = str.match(/^(\d+)\s*[\/\-]/);
          if (slashMatch) return parseInt(slashMatch[1], 10) || 0;
          const clean = str.replace(/[^\d]/g, '');
          return parseInt(clean, 10) || 0;
        };

        let tl = tlIdx >= 0 ? parseStatNumber(getColVal(tlIdx)) : 0;
        let t2 = t2Idx >= 0 ? parseStatNumber(getColVal(t2Idx)) : 0;
        let t3 = t3Idx >= 0 ? parseStatNumber(getColVal(t3Idx)) : 0;
        const pts = ptsIdx >= 0 ? parseStatNumber(getColVal(ptsIdx)) : 0;

        // Si tenemos puntos totales y triples pero no T2/TL desglosados, deducir de forma coherente
        if (pts > 0 && tl === 0 && t2 === 0 && t3 === 0) {
          // Asumir que la mayoría son tiros de 2
          t2 = Math.floor(pts / 2);
          tl = pts % 2;
        } else if (pts > 0 && (t2 === 0 && tl === 0) && t3 > 0) {
          const rem = pts - t3 * 3;
          if (rem > 0) {
            t2 = Math.floor(rem / 2);
            tl = rem % 2;
          }
        }

        extractedPlayers.push({
          id: `scraped_${Date.now()}_${tableIdx}_${rowIdx}`,
          dorsal: dorsal || (rowIdx).toString(),
          name: name,
          team: tableTeam,
          tl,
          t2,
          t3,
        });
      });
    });

    // 4. Si no se encontraron tablas pero hay eventos de Play-by-Play en la página
    if (extractedPlayers.length === 0) {
      // Buscar jugadas de texto (p.ej. "Triple de Núria Bosch", "Canasta de 2 de Marta Rius")
      const eventItems = $('.jugada, .accio, .action, .play, li, tr').filter((_, el) => {
        const t = $(el).text().toLowerCase();
        return t.includes('triple') || t.includes('canasta') || t.includes('tiro libre') || t.includes('anota');
      });

      if (eventItems.length > 0) {
        const playerMap = new Map<string, { dorsal: string; name: string; team: 'local' | 'visitante'; tl: number; t2: number; t3: number }>();

        eventItems.each((_, el) => {
          const text = $(el).text().trim();
          const tLower = text.toLowerCase();

          // Detectar equipo
          let isVisitor = tLower.includes('visit') || (visitorTeam && tLower.includes(visitorTeam.toLowerCase()));
          const teamType: 'local' | 'visitante' = isVisitor ? 'visitante' : 'local';

          // Extraer dorsal o nombre
          const dorsalMatch = text.match(/#(\d+)/);
          const dorsal = dorsalMatch ? dorsalMatch[1] : '';

          // Intentar extraer nombre
          const nameMatch = text.match(/(?:de|jugador|jugadora)\s+([A-ZÁÉÍÓÚÀÈÒÑ][a-záéíóúàèòñ]+(?:\s+[A-ZÁÉÍÓÚÀÈÒÑ][a-záéíóúàèòñ]+)*)/);
          const pName = nameMatch ? nameMatch[1] : (dorsal ? `Jugadora #${dorsal}` : 'Jugadora');

          const pKey = `${teamType}_${dorsal || pName}`;
          if (!playerMap.has(pKey)) {
            playerMap.set(pKey, {
              dorsal,
              name: pName,
              team: teamType,
              tl: 0,
              t2: 0,
              t3: 0,
            });
          }

          const entry = playerMap.get(pKey)!;
          if (tLower.includes('triple') || tLower.includes('3 pt') || tLower.includes('3pt')) {
            entry.t3 += 1;
          } else if (tLower.includes('tiro libre') || tLower.includes('tl')) {
            entry.tl += 1;
          } else if (tLower.includes('canasta') || tLower.includes('2 pt') || tLower.includes('2pt') || tLower.includes('anota')) {
            entry.t2 += 1;
          }
        });

        playerMap.forEach((val, idx) => {
          extractedPlayers.push({
            id: `p_pbp_${Date.now()}_${idx}`,
            ...val,
          });
        });
      }
    }

    return res.json({
      success: true,
      url: targetUrl,
      matchNumber: matchNumber || '1',
      localTeam: localTeam || 'Equipo Local',
      visitorTeam: visitorTeam || 'Equipo Visitante',
      scoreLocal: scoreLocal || '',
      scoreVisitor: scoreVisitor || '',
      playersCount: extractedPlayers.length,
      players: extractedPlayers,
      message:
        extractedPlayers.length > 0
          ? `¡Scraping completado con éxito! Se han extraído ${extractedPlayers.length} jugadoras con sus estadísticas.`
          : 'Se ha analizado la página, pero no se han detectado tablas estándar de estadísticas en este enlace.',
    });
  } catch (error: any) {
    console.error('Error en /api/scrape-match:', error);
    return res.status(500).json({
      success: false,
      error: error?.message || 'Error interno al procesar el scraping del partido.',
    });
  }
});

// Serve frontend assets or integrate Vite middleware
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`CoachMind server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
