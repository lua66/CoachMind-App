import {
  isFieldComplete,
  validatePhilosophyComplete,
  CRITICAL_PHILOSOPHY_FIELDS,
} from '../src/services/philosophyService';
import {
  toolValidatePhilosophyComplete,
  PHILOSOPHY_INCOMPLETE_BLOCKING_MESSAGE,
} from '../src/services/planningAiDispatcher';
import { validatePhilosophyAlignment } from '../src/utils/philosophyAlignmentValidator';
import { CoachPhilosophy } from '../src/types';

// Simple Test Runner
let passed = 0;
let failed = 0;

function assert(condition: boolean, message: string) {
  if (condition) {
    console.log(`  ✓ ${message}`);
    passed++;
  } else {
    console.error(`  ✗ FAIL: ${message}`);
    failed++;
  }
}

function runSuite() {
  console.log('\n========================================');
  console.log('STEP 3 COMPREHENSIVE TEST SUITE');
  console.log('========================================\n');

  // -------------------------------------------------------------
  // 1. isFieldComplete Unit Tests
  // -------------------------------------------------------------
  console.log('1. Testing isFieldComplete():');
  assert(isFieldComplete('Baloncesto de ritmo alto') === true, 'Valid string passes');
  assert(isFieldComplete('Transición rápida') === true, 'Valid phrase passes');
  assert(isFieldComplete('') === false, 'Empty string fails');
  assert(isFieldComplete('   ') === false, 'Whitespace only fails');
  assert(isFieldComplete(null) === false, 'null fails');
  assert(isFieldComplete(undefined) === false, 'undefined fails');
  assert(isFieldComplete('ab') === false, 'Short string (<3 chars) fails');
  assert(isFieldComplete('N/A') === false, 'Placeholder "N/A" fails');
  assert(isFieldComplete('n/a') === false, 'Placeholder "n/a" fails');
  assert(isFieldComplete(' - ') === false, 'Placeholder "-" fails');
  assert(isFieldComplete('...') === false, 'Placeholder "..." fails');
  assert(isFieldComplete('Por definir') === false, 'Placeholder "Por definir" fails');
  assert(isFieldComplete('tbd') === false, 'Placeholder "tbd" fails');
  assert(isFieldComplete('TODO') === false, 'Placeholder "TODO" fails');
  assert(isFieldComplete('pendiente') === false, 'Placeholder "pendiente" fails');

  // -------------------------------------------------------------
  // 2. validatePhilosophyComplete Unit Tests
  // -------------------------------------------------------------
  console.log('\n2. Testing validatePhilosophyComplete():');
  
  // 2a. Empty
  const emptyRes = validatePhilosophyComplete(null);
  assert(emptyRes.status === 'empty', 'Null philosophy returns status: "empty"');
  assert(emptyRes.complete === false, 'Null philosophy returns complete: false');
  assert(emptyRes.missingCritical.length === 4, 'Null philosophy misses all 4 critical fields');

  const emptyObjRes = validatePhilosophyComplete({});
  assert(emptyObjRes.status === 'empty', 'Empty object returns status: "empty"');
  assert(emptyObjRes.complete === false, 'Empty object returns complete: false');

  // 2b. Partial
  const partialPhilosophy: Partial<CoachPhilosophy> = {
    coreValues: 'Compromiso, esfuerzo y generosidad táctica',
    // playStyle, offensiveFocus, defensiveFocus are missing
  };
  const partialRes = validatePhilosophyComplete(partialPhilosophy);
  assert(partialRes.status === 'partial', 'Partial philosophy returns status: "partial"');
  assert(partialRes.complete === false, 'Partial philosophy returns complete: false');
  assert(partialRes.missingCritical.includes('playStyle'), 'Partial correctly identifies missing playStyle');
  assert(partialRes.missingCritical.includes('offensiveFocus'), 'Partial correctly identifies missing offensiveFocus');
  assert(partialRes.missingCritical.includes('defensiveFocus'), 'Partial correctly identifies missing defensiveFocus');
  assert(!partialRes.missingCritical.includes('coreValues'), 'coreValues is not in missingCritical');

  // 2c. Complete
  const completePhilosophy: CoachPhilosophy = {
    playStyle: 'Juego rápido de transiciones dinámicas y posesiones cortas',
    offensiveFocus: 'Espaciamiento 5-out, inversión rápida de balón y bloqueos directos dinámicos',
    defensiveFocus: 'Presión 1-2-1-1 a toda pista y defensa individual con ayudas agresivas',
    trainingGoals: 'Desarrollar toma de decisiones bajo fatiga y tiro tras recepción',
    matchGoals: 'Competir con intensidad 40 minutos y mantener el balance defensivo',
    coreValues: 'Cultura de esfuerzo, respeto al compañero y sacrificio defensivo',
    additionalNotes: 'Priorizar quintetos versátiles.',
  };
  const completeRes = validatePhilosophyComplete(completePhilosophy);
  assert(completeRes.status === 'complete', 'Complete philosophy returns status: "complete"');
  assert(completeRes.complete === true, 'Complete philosophy returns complete: true');
  assert(completeRes.missingCritical.length === 0, 'Complete philosophy has 0 missingCritical');

  // -------------------------------------------------------------
  // 3. requireCompletePhilosophy Middleware Unit Simulation
  // -------------------------------------------------------------
  console.log('\n3. Testing requireCompletePhilosophy Middleware Logic:');

  function simulateMiddleware(req: any, res: any, next: () => void) {
    const philosophy = req.body?.coachPhilosophy || req.userPhilosophy;
    const validation = validatePhilosophyComplete(philosophy);

    if (!validation.complete) {
      return res.status(400).json({
        error: 'PHILOSOPHY_INCOMPLETE',
        status: validation.status,
        missingCritical: validation.missingCritical,
        message: 'No puedo analizar ni planificar sin tu Filosofía de Entrenador completa. Complétala primero en la sección Filosofía de Entrenador.',
      });
    }

    req.userPhilosophy = philosophy;
    return next();
  }

  // 3a. Rejection when incomplete
  let statusSet = 0;
  let jsonResponse: any = null;
  let nextCalled = false;

  const mockReqIncomplete = { body: { coachPhilosophy: partialPhilosophy } };
  const mockResIncomplete = {
    status: (s: number) => {
      statusSet = s;
      return {
        json: (data: any) => {
          jsonResponse = data;
        },
      };
    },
  };

  simulateMiddleware(mockReqIncomplete, mockResIncomplete, () => {
    nextCalled = true;
  });

  assert(statusSet === 400, 'Middleware returns HTTP 400 when incomplete');
  assert(nextCalled === false, 'Middleware stops execution chain (next not called)');
  assert(jsonResponse?.error === 'PHILOSOPHY_INCOMPLETE', 'Returns error: "PHILOSOPHY_INCOMPLETE"');
  assert(
    jsonResponse?.message ===
      'No puedo analizar ni planificar sin tu Filosofía de Entrenador completa. Complétala primero en la sección Filosofía de Entrenador.',
    'Returns exact user-facing required message'
  );
  assert(jsonResponse?.status === 'partial', 'Returns status: "partial"');

  // 3b. Acceptance when complete
  statusSet = 0;
  jsonResponse = null;
  let isNextCalled = false;
  const mockReqComplete = { body: { coachPhilosophy: completePhilosophy } };
  const mockResComplete = {
    status: (s: number) => {
      statusSet = s;
      return { json: (data: any) => (jsonResponse = data) };
    },
  };

  simulateMiddleware(mockReqComplete, mockResComplete, () => {
    isNextCalled = true;
  });

  assert(isNextCalled, 'Middleware calls next() when philosophy is complete');
  assert(statusSet === 0, 'Middleware does not error on complete philosophy');

  // -------------------------------------------------------------
  // 4. LLM Tool: validate_philosophy_complete
  // -------------------------------------------------------------
  console.log('\n4. Testing LLM tool: toolValidatePhilosophyComplete():');
  const toolResultIncomplete = toolValidatePhilosophyComplete(partialPhilosophy);
  assert(toolResultIncomplete.complete === false, 'Tool marks partial philosophy as complete: false');
  assert(
    toolResultIncomplete.message === PHILOSOPHY_INCOMPLETE_BLOCKING_MESSAGE,
    'Tool returns blocking message for LLM cutoff'
  );

  const toolResultComplete = toolValidatePhilosophyComplete(completePhilosophy);
  assert(toolResultComplete.complete === true, 'Tool marks complete philosophy as complete: true');
  assert(toolResultComplete.message === undefined, 'Tool does not return blocking message when valid');

  // -------------------------------------------------------------
  // 5. Philosophy Alignment Validator Unit Tests
  // -------------------------------------------------------------
  console.log('\n5. Testing validatePhilosophyAlignment():');

  // 5a. Conflicting plan: Fast pace philosophy vs slow positional goal
  const conflictingPlan = {
    seasonGoal: {
      objetivoPrincipal: 'Jugar a ritmo lento y agotar posesión de 24 segundos en cada ataque',
      objetivosDeportivos: ['Asegurar rebote y pausar y ralentizar todas las transiciones'],
    },
    mesocycles: [
      {
        id: 'meso-1',
        mesocycleId: 'meso-1',
        seasonGoalId: 's1',
        numero: 1,
        nombre: 'Mesociclo 1',
        fechaInicio: '2025-09-01',
        fechaFin: '2025-09-30',
        objetivoPrincipal: 'Transición controlada',
        estado: 'planificado' as const,
        goals: [
          {
            id: 'g-1',
            mesocycleId: 'meso-1',
            area: 'tactica' as const,
            descripcion: 'Trabajar ataque estático sin transiciones',
            indicadorExito: 'Minimizar contraataques',
            estado: 'pendiente' as const,
          },
        ],
      },
    ],
  };

  const alignmentConflictResult = validatePhilosophyAlignment(completePhilosophy, conflictingPlan);
  assert(alignmentConflictResult.isAligned === false, 'Detects misaligned goals');
  assert(alignmentConflictResult.conflicts.length > 0, 'Identifies specific alignment conflicts');
  assert(alignmentConflictResult.conflicts.some((c) => c.dimension === 'ritmo'), 'Flags pace conflict');
  assert(alignmentConflictResult.score < 100, `Score is penalized (score: ${alignmentConflictResult.score})`);

  // 5b. Aligned plan: Fast pace philosophy with dynamic goals
  const alignedPlan = {
    seasonGoal: {
      objetivoPrincipal: 'Consolidar transiciones rápidas y llegar jugando en los primeros 8 segundos',
      objetivosDeportivos: ['Dominar el contraataque y forzar pérdidas con presión en toda la pista'],
    },
    mesocycles: [
      {
        id: 'meso-1',
        mesocycleId: 'meso-1',
        seasonGoalId: 's1',
        numero: 1,
        nombre: 'Mesociclo 1',
        fechaInicio: '2025-09-01',
        fechaFin: '2025-09-30',
        objetivoPrincipal: 'Velocidad y agresividad',
        estado: 'planificado' as const,
        goals: [
          {
            id: 'g-1',
            mesocycleId: 'meso-1',
            area: 'tactica' as const,
            descripcion: 'Ocupación de 5 esquinas y salida de contraataque con pase adelantado',
            indicadorExito: 'Anotar en primeros 6s',
            estado: 'pendiente' as const,
          },
          {
            id: 'g-2',
            mesocycleId: 'meso-1',
            area: 'tactica' as const,
            descripcion: 'Presión 1-2-1-1 tras canasta convertida',
            indicadorExito: 'Recuperar 5 balones',
            estado: 'pendiente' as const,
          },
        ],
      },
    ],
  };

  const alignmentSuccessResult = validatePhilosophyAlignment(completePhilosophy, alignedPlan);
  assert(alignmentSuccessResult.isAligned === true, 'Recognizes perfectly aligned plan');
  assert(alignmentSuccessResult.conflicts.length === 0, 'Zero conflicts for aligned plan');
  assert(alignmentSuccessResult.score === 100, 'Score is 100 for aligned plan');

  console.log('\n========================================');
  console.log(`RESULTS: ${passed} passed, ${failed} failed`);
  console.log('========================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runSuite();
