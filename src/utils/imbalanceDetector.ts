import {
  PlanningArea,
  MesocycleGoal,
  SessionLog,
  Microcycle,
  ImbalanceDetectionResult,
  ImbalanceAreaStat,
  ImbalanceCorrelation,
} from '../types/planning';

const ALL_AREAS: PlanningArea[] = ['tecnica', 'tactica', 'fisica', 'mental'];

/**
 * Función PURA y determinista para detectar desequilibrios entre lo planificado
 * y lo realmente trabajado en pista.
 *
 * @param goals Objetivos específicos del mesociclo (con sus áreas y estados)
 * @param sessions Registros de sesiones de entrenamiento del microciclo actual
 * @param historicalMicrocycles Microciclos pasados con sus sesiones y evaluaciones para detección de patrones
 * @param unfulfilledGoalIds IDs de objetivos marcados explícitamente como no cumplidos en este cierre
 */
export function detectImbalances(
  goals: MesocycleGoal[],
  sessions: SessionLog[],
  historicalMicrocycles: Microcycle[] = [],
  unfulfilledGoalIds: string[] = []
): ImbalanceDetectionResult {
  // 1. Calcular plannedPct repartiendo 1.0 entre las áreas de los objetivos del mesociclo
  const areaGoalCounts: Record<PlanningArea, number> = {
    tecnica: 0,
    tactica: 0,
    fisica: 0,
    mental: 0,
  };

  goals.forEach((g) => {
    if (ALL_AREAS.includes(g.area)) {
      areaGoalCounts[g.area] = (areaGoalCounts[g.area] || 0) + 1;
    }
  });

  const totalGoals = goals.length;
  const plannedPctMap: Record<PlanningArea, number> = {
    tecnica: 0.25,
    tactica: 0.25,
    fisica: 0.25,
    mental: 0.25,
  };

  if (totalGoals > 0) {
    ALL_AREAS.forEach((area) => {
      plannedPctMap[area] = areaGoalCounts[area] / totalGoals;
    });
  }

  // 2. Calcular realPct sumando duracionMin por área de SessionLog.contenidos
  const areaRealMinutes: Record<PlanningArea, number> = {
    tecnica: 0,
    tactica: 0,
    fisica: 0,
    mental: 0,
  };

  let totalRealMinutes = 0;

  sessions.forEach((session) => {
    if (Array.isArray(session.contenidos)) {
      session.contenidos.forEach((item) => {
        const area = item.area;
        const dur = Number(item.duracionMin) || 0;
        if (ALL_AREAS.includes(area)) {
          areaRealMinutes[area] += dur;
          totalRealMinutes += dur;
        }
      });
    } else if (session.duracionMin > 0) {
      // Si la sesión no tiene desglose interno pero tiene duración total, repartir por defecto
      totalRealMinutes += session.duracionMin;
      areaRealMinutes.tactica += Math.round(session.duracionMin * 0.5);
      areaRealMinutes.tecnica += Math.round(session.duracionMin * 0.3);
      areaRealMinutes.fisica += Math.round(session.duracionMin * 0.2);
    }
  });

  const realPctMap: Record<PlanningArea, number> = {
    tecnica: 0,
    tactica: 0,
    fisica: 0,
    mental: 0,
  };

  if (totalRealMinutes > 0) {
    ALL_AREAS.forEach((area) => {
      realPctMap[area] = areaRealMinutes[area] / totalRealMinutes;
    });
  } else {
    // Si no hay sesiones registradas, realPct es 0 para evitar divisiones por cero
    ALL_AREAS.forEach((area) => {
      realPctMap[area] = 0;
    });
  }

  // 3. Calcular Deltas y clasificar estado por área
  const byArea: Record<PlanningArea, ImbalanceAreaStat> = {} as any;

  ALL_AREAS.forEach((area) => {
    const planned = plannedPctMap[area];
    const real = realPctMap[area];
    const delta = totalRealMinutes > 0 ? real - planned : 0;

    let status: 'equilibrada' | 'sobre_trabajada' | 'descuidada' = 'equilibrada';
    if (delta > 0.15) {
      status = 'sobre_trabajada';
    } else if (delta < -0.15) {
      status = 'descuidada';
    }

    byArea[area] = {
      area,
      plannedPct: Math.round(planned * 1000) / 1000,
      realPct: Math.round(real * 1000) / 1000,
      delta: Math.round(delta * 1000) / 1000,
      plannedMinutes: Math.round(totalRealMinutes * planned),
      realMinutes: areaRealMinutes[area],
      status,
    };
  });

  // 4. Identificar objetivos no cumplidos y correlaciones con desequilibrios
  const unfulfilledSet = new Set(unfulfilledGoalIds);
  goals.forEach((g) => {
    if (g.estado === 'no_cumplido') {
      unfulfilledSet.add(g.id);
    }
  });

  const correlations: ImbalanceCorrelation[] = [];

  goals.forEach((goal) => {
    if (unfulfilledSet.has(goal.id)) {
      const areaStat = byArea[goal.area];

      // Hipótesis 1: El área directa del objetivo ha sido descuidada
      if (areaStat && areaStat.delta < -0.15) {
        const deficitPct = Math.round(Math.abs(areaStat.delta) * 100);
        const realPctFormatted = Math.round(areaStat.realPct * 100);
        correlations.push({
          goalId: goal.id,
          goalDescription: goal.descripcion,
          area: goal.area,
          status: 'no_cumplido',
          suspectedCause: `Área ${goal.area.toUpperCase()} descuidada en pista (${realPctFormatted}% real vs ${Math.round(areaStat.plannedPct * 100)}% planificado).`,
          evidence: `Se dedicaron solo ${areaStat.realMinutes} min a ${goal.area}, con un déficit del ${deficitPct}%.`,
        });
      }

      // Hipótesis 2: El objetivo es táctico pero la técnica de base está descuidada
      if (goal.area === 'tactica' && byArea.tecnica.delta < -0.12) {
        const techRealPct = Math.round(byArea.tecnica.realPct * 100);
        correlations.push({
          goalId: goal.id,
          goalDescription: goal.descripcion,
          area: goal.area,
          status: 'no_cumplido',
          suspectedCause: `Déficit en técnica de base: La ejecución táctica puede estar fallando por falta de automatismos técnicos individuales previos.`,
          evidence: `El trabajo técnico solo supuso el ${techRealPct}% del tiempo (${byArea.tecnica.realMinutes} min), mientras que la táctica absorbió el ${Math.round(byArea.tactica.realPct * 100)}%.`,
        });
      }

      // Hipótesis 3: Si no cae en los anteriores pero el área mental/física fue nula (0 min)
      if ((goal.area === 'mental' || goal.area === 'fisica') && areaRealMinutes[goal.area] === 0) {
        correlations.push({
          goalId: goal.id,
          goalDescription: goal.descripcion,
          area: goal.area,
          status: 'no_cumplido',
          suspectedCause: `Ausencia total de trabajo específico en el área ${goal.area}.`,
          evidence: `0 minutos registrados para el área ${goal.area} durante el microciclo.`,
        });
      }
    }
  });

  // 5. Detección de patrones a lo largo de múltiples microciclos
  const patterns: string[] = [];

  // Patrón A: Misma área descuidada durante 2+ microciclos consecutivos
  if (historicalMicrocycles.length >= 1) {
    ALL_AREAS.forEach((area) => {
      let consecutiveNeglected = byArea[area].status === 'descuidada' ? 1 : 0;
      
      historicalMicrocycles.forEach((histMicro) => {
        const histSessions = histMicro.sessions || [];
        let histAreaMins = 0;
        let histTotalMins = 0;
        histSessions.forEach((s) => {
          (s.contenidos || []).forEach((c) => {
            if (c.area === area) histAreaMins += Number(c.duracionMin) || 0;
            histTotalMins += Number(c.duracionMin) || 0;
          });
        });
        const histPct = histTotalMins > 0 ? histAreaMins / histTotalMins : 0;
        if (histPct < plannedPctMap[area] - 0.15) {
          consecutiveNeglected++;
        }
      });

      if (consecutiveNeglected >= 2) {
        patterns.push(
          `Patrón detectado: El área de ${area.toUpperCase()} acumula ${consecutiveNeglected} microciclos consecutivos descuidada.`
        );
      }
    });

    // Patrón B: Mismo objetivo no cumplido repetidamente
    unfulfilledSet.forEach((unfulfilledId) => {
      const matchCount = historicalMicrocycles.filter(
        (m) => m.evaluation && (m.evaluation.objetivosNoCumplidos || []).includes(unfulfilledId)
      ).length;

      if (matchCount >= 1) {
        const targetGoal = goals.find((g) => g.id === unfulfilledId);
        const desc = targetGoal ? targetGoal.descripcion : 'Objetivo';
        patterns.push(
          `Objetivo crónico: "${desc}" no se ha cumplido en ${matchCount + 1} microciclos acumulados.`
        );
      }
    });
  }

  // Resumen textual legible
  const neglectedAreas = ALL_AREAS.filter((a) => byArea[a].status === 'descuidada');
  const overworkedAreas = ALL_AREAS.filter((a) => byArea[a].status === 'sobre_trabajada');

  let summaryText = 'Distribución equilibrada de contenidos.';
  if (neglectedAreas.length > 0 && overworkedAreas.length > 0) {
    summaryText = `Desequilibrio detectado: sobre-trabajo en ${overworkedAreas.join(', ')} (+${Math.round(byArea[overworkedAreas[0]].delta * 100)}%) y descuido en ${neglectedAreas.join(', ')} (${Math.round(byArea[neglectedAreas[0]].delta * 100)}%).`;
  } else if (neglectedAreas.length > 0) {
    summaryText = `Áreas que requieren mayor volumen de atención: ${neglectedAreas.join(', ')}.`;
  } else if (overworkedAreas.length > 0) {
    summaryText = `Concentración muy elevada en ${overworkedAreas.join(', ')}.`;
  }

  return {
    byArea,
    correlations,
    patterns,
    totalPlannedMinutes: totalRealMinutes,
    totalRealMinutes,
    summaryText,
  };
}
