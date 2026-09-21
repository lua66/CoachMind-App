import { CoachPhilosophy } from '../types';
import { SeasonGoal, Mesocycle, Microcycle } from '../types/planning';

export interface AlignmentConflict {
  dimension: 'ritmo' | 'defensa' | 'ataque' | 'valores';
  philosophyPrinciple: string;
  conflictingGoal: string;
  severity: 'alta' | 'media';
  explanation: string;
}

export interface AlignmentCheckResult {
  isAligned: boolean;
  score: number; // 0 to 100
  conflicts: AlignmentConflict[];
  recommendations: string[];
}

const FAST_PACE_KEYWORDS = [
  'rápido',
  'rapido',
  'transición',
  'transicion',
  'contraataque',
  'run and gun',
  'ritmo alto',
  'up-tempo',
  'posesiones cortas',
  'llegar jugando',
];

const SLOW_PACE_KEYWORDS = [
  'posicional lento',
  'ritmo lento',
  'control 24 segundos',
  'ataque estático',
  'estatico',
  'pausa y ralentizar',
  'agotar posesión',
  'agotar posesion',
];

const AGGRESSIVE_DEFENSE_KEYWORDS = [
  'presión',
  'presion',
  'toda la pista',
  'trap',
  '2-2-1',
  '1-2-1-1',
  'agresiva',
  'cambios agresivos',
  'líneas de pase',
  'lineas de pase',
  'forzar pérdidas',
  'forzar perdidas',
];

const PASSIVE_DEFENSE_KEYWORDS = [
  'zona pasiva',
  'repliegue sin presionar',
  'defensa conservadora',
  'evitar saltar al 2c1',
  'no arriesgar en pase',
  'esperar en 6.75',
];

/**
 * Validador determinista de alineamiento metodológico entre Filosofía y Planificación
 */
export function validatePhilosophyAlignment(
  philosophy: Partial<CoachPhilosophy> | null | undefined,
  plan: {
    seasonGoal?: Partial<SeasonGoal> | null;
    mesocycles?: Partial<Mesocycle>[] | null;
    microcycles?: Partial<Microcycle>[] | null;
  }
): AlignmentCheckResult {
  const conflicts: AlignmentConflict[] = [];

  if (!philosophy) {
    return {
      isAligned: false,
      score: 0,
      conflicts: [
        {
          dimension: 'valores',
          philosophyPrinciple: 'Inexistente',
          conflictingGoal: 'Planificación sin filosofía base',
          severity: 'alta',
          explanation: 'No se puede comprobar la alineación sin una Filosofía de Entrenador configurada.',
        },
      ],
      recommendations: ['Define tu Filosofía de Entrenador completa antes de planificar.'],
    };
  }

  const philPlayStyle = (philosophy.playStyle || '').toLowerCase();
  const philOffense = (philosophy.offensiveFocus || '').toLowerCase();
  const philDefense = (philosophy.defensiveFocus || '').toLowerCase();

  // Aggregate all goal texts from season, mesocycles, and microcycles
  const goalTexts: { source: string; text: string }[] = [];

  if (plan.seasonGoal) {
    if (plan.seasonGoal.objetivoPrincipal) {
      goalTexts.push({ source: 'Temporada (Principal)', text: plan.seasonGoal.objetivoPrincipal });
    }
    (plan.seasonGoal.objetivosDeportivos || []).forEach((t, i) =>
      goalTexts.push({ source: `Temporada (Deportivo ${i + 1})`, text: t })
    );
    (plan.seasonGoal.objetivosFormativos || []).forEach((t, i) =>
      goalTexts.push({ source: `Temporada (Formativo ${i + 1})`, text: t })
    );
  }

  (plan.mesocycles || []).forEach((m) => {
    if (m.objetivoPrincipal) {
      goalTexts.push({ source: `${m.nombre || 'Mesociclo'} (Principal)`, text: m.objetivoPrincipal });
    }
    (m.goals || []).forEach((g) => {
      goalTexts.push({ source: `${m.nombre || 'Mesociclo'} (${g.area})`, text: g.descripcion });
    });
  });

  (plan.microcycles || []).forEach((mc) => {
    if (mc.objetivoSemanal) {
      goalTexts.push({ source: `Microciclo S${mc.semana}`, text: mc.objetivoSemanal });
    }
  });

  const isFastPacedPhil = FAST_PACE_KEYWORDS.some((kw) => philPlayStyle.includes(kw) || philOffense.includes(kw));
  const isAggressiveDefPhil = AGGRESSIVE_DEFENSE_KEYWORDS.some((kw) => philDefense.includes(kw) || philPlayStyle.includes(kw));

  // Check conflicts
  for (const item of goalTexts) {
    const textLower = item.text.toLowerCase();

    // 1. Ritmo de juego: Filosofía rápida vs Objetivo lento
    if (isFastPacedPhil) {
      for (const slowKw of SLOW_PACE_KEYWORDS) {
        if (textLower.includes(slowKw)) {
          conflicts.push({
            dimension: 'ritmo',
            philosophyPrinciple: `Estilo dinámico y rápido ("${philosophy.playStyle}")`,
            conflictingGoal: `[${item.source}] "${item.text}"`,
            severity: 'alta',
            explanation: `El objetivo promueve "${slowKw}", lo cual contradice directamente tu principio de juego rápido y transiciones tempranas.`,
          });
          break;
        }
      }
    }

    // 2. Defensa: Filosofía agresiva/presionante vs Objetivo pasivo/conservador
    if (isAggressiveDefPhil) {
      for (const passKw of PASSIVE_DEFENSE_KEYWORDS) {
        if (textLower.includes(passKw)) {
          conflicts.push({
            dimension: 'defensa',
            philosophyPrinciple: `Defensa presionante/agresiva ("${philosophy.defensiveFocus}")`,
            conflictingGoal: `[${item.source}] "${item.text}"`,
            severity: 'alta',
            explanation: `El objetivo indica "${passKw}", contradictorio con la identidad defensiva de máxima presión y forzar errores.`,
          });
          break;
        }
      }
    }
  }

  const penalty = conflicts.reduce((acc, c) => acc + (c.severity === 'alta' ? 35 : 15), 0);
  const score = Math.max(0, 100 - penalty);
  const isAligned = conflicts.length === 0;

  const recommendations: string[] = [];
  if (!isAligned) {
    recommendations.push(
      'Revisa los objetivos que entran en colisión con tus pilares ofensivos o defensivos.'
    );
    recommendations.push(
      'Asegúrate de que cada microciclo y tarea técnica refuerce activamente la identidad definida en la Filosofía.'
    );
  } else {
    recommendations.push('Planificación perfectamente coherente con tu Filosofía de Entrenador.');
  }

  return {
    isAligned,
    score,
    conflicts,
    recommendations,
  };
}
