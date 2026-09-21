import {
  validatePhilosophyComplete,
  createPhilosophySnapshot,
  diffPhilosophy,
  checkAlignmentFast,
  CoachPhilosophy,
  PhilosophySnapshot,
} from '../philosophyService';

// Test Runner simple para ejecutar en entorno Node/TS
export function runPhilosophyServiceTests() {
  const results: { name: string; passed: boolean; error?: string }[] = [];

  function assert(condition: boolean, msg: string) {
    if (!condition) throw new Error(msg);
  }

  function test(name: string, fn: () => void) {
    try {
      fn();
      results.push({ name, passed: true });
    } catch (e: any) {
      results.push({ name, passed: false, error: e?.message || String(e) });
    }
  }

  // --- TESTS validatePhilosophyComplete ---
  test('validatePhilosophyComplete: Filosofía completa (4 críticos)', () => {
    const phil: CoachPhilosophy = {
      playStyle: 'Transición rápida y 5 abiertos',
      offensiveFocus: 'Espaciamiento y pase extra',
      defensiveFocus: 'Presión a todo el campo',
      trainingGoals: '',
      matchGoals: '',
      coreValues: 'Compromiso y generosidad',
      additionalNotes: '',
    };
    const res = validatePhilosophyComplete(phil);
    assert(res.status === 'complete', 'Debe ser status === complete');
    assert(res.complete === true, 'Debe ser complete === true');
    assert(res.missingCritical.length === 0, 'No debe faltar ningún crítico');
    assert(res.missingOptional.includes('trainingGoals'), 'Debe reportar missing opcionales');
  });

  test('validatePhilosophyComplete: Incompleta por falta de playStyle', () => {
    const phil: CoachPhilosophy = {
      playStyle: '',
      offensiveFocus: 'Juego libre',
      defensiveFocus: 'Individual',
      trainingGoals: '',
      matchGoals: '',
      coreValues: 'Humildad',
      additionalNotes: '',
    };
    const res = validatePhilosophyComplete(phil);
    assert(res.status === 'partial', 'Debe ser status === partial');
    assert(res.complete === false, 'Debe ser complete === false');
    assert(res.missingCritical.includes('playStyle'), 'playStyle debe estar en missingCritical');
  });

  test('validatePhilosophyComplete: Vacía o nula', () => {
    const res = validatePhilosophyComplete(null);
    assert(res.status === 'empty', 'Debe ser status === empty');
    assert(res.complete === false, 'Nulo debe ser complete === false');
    assert(res.missingCritical.length === 4, 'Deben faltar los 4 críticos');
    assert(res.missingOptional.length === 3, 'Deben faltar los 3 opcionales');
  });

  test('validatePhilosophyComplete: Reconocimiento de placeholders como incompletos', () => {
    const phil: CoachPhilosophy = {
      playStyle: 'tbd',
      offensiveFocus: 'N/A',
      defensiveFocus: '...',
      trainingGoals: '',
      matchGoals: '',
      coreValues: 'por definir',
      additionalNotes: '',
    };
    const res = validatePhilosophyComplete(phil);
    assert(res.status === 'empty', 'Debe evaluar placeholders como vacíos');
    assert(res.complete === false, 'Debe ser complete === false');
  });

  // --- TESTS diffPhilosophy ---
  test('diffPhilosophy: Detección de cambio en un campo crítico', () => {
    const current: CoachPhilosophy = {
      playStyle: 'Juego pausado y control',
      offensiveFocus: 'Pase extra',
      defensiveFocus: 'Presión',
      trainingGoals: '',
      matchGoals: '',
      coreValues: 'Esfuerzo',
      additionalNotes: '',
    };
    const snapshot: PhilosophySnapshot = {
      playStyle: 'Transición rápida',
      offensiveFocus: 'Pase extra',
      defensiveFocus: 'Presión',
      trainingGoals: '',
      matchGoals: '',
      coreValues: 'Esfuerzo',
      additionalNotes: '',
      capturedAt: '2026-09-01T00:00:00.000Z',
    };
    const diffs = diffPhilosophy(current, snapshot);
    assert(diffs.length === 1, 'Debe haber exactamente 1 diferencia');
    assert(diffs[0].field === 'playStyle', 'El campo debe ser playStyle');
    assert(diffs[0].critical === true, 'Debe marcarse como crítico');
    assert(diffs[0].currentValue === 'Juego pausado y control', 'Valor actual correcto');
    assert(diffs[0].snapshotValue === 'Transición rápida', 'Valor snapshot correcto');
  });

  // --- TESTS checkAlignmentFast ---
  test('checkAlignmentFast: Objetivo contradictorio', () => {
    const phil: CoachPhilosophy = {
      playStyle: 'Transición rápida y ritmo alto',
      offensiveFocus: 'Pase rápido',
      defensiveFocus: 'Individual presionante',
      trainingGoals: '',
      matchGoals: '',
      coreValues: 'Valentía',
      additionalNotes: '',
    };
    const goal = {
      descripcion: 'Entrenar posesiones lentas y agotar los 24s de posesión',
      area: 'tactica',
    };
    const res = checkAlignmentFast(goal, phil);
    assert(res.alignment === 'contradictorio', 'Debe ser contradictorio');
  });

  test('checkAlignmentFast: Objetivo alineado', () => {
    const phil: CoachPhilosophy = {
      playStyle: 'Transición rápida y 5 abiertos',
      offensiveFocus: 'Espaciamiento (spacing) y pase extra',
      defensiveFocus: 'Presión defensiva',
      trainingGoals: '',
      matchGoals: '',
      coreValues: 'Generosidad',
      additionalNotes: '',
    };
    const goal = {
      descripcion: 'Mejorar spacing y tiro tras pase extra',
      area: 'tactica',
    };
    const res = checkAlignmentFast(goal, phil);
    assert(res.alignment === 'alineado', 'Debe ser alineado');
  });

  test('checkAlignmentFast: Con filosofía incompleta devuelve neutro', () => {
    const phil: CoachPhilosophy = {
      playStyle: '',
      offensiveFocus: '',
      defensiveFocus: '',
      trainingGoals: '',
      matchGoals: '',
      coreValues: '',
      additionalNotes: '',
    };
    const goal = {
      descripcion: 'Mejorar bote y tiro',
      area: 'tecnica',
    };
    const res = checkAlignmentFast(goal, phil);
    assert(res.alignment === 'neutro', 'Debe ser neutro si está incompleta');
  });

  return results;
}
