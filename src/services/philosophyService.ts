import { CoachPhilosophy } from '../types';

export type { CoachPhilosophy };

export interface PhilosophySnapshot {
  playStyle: string;
  offensiveFocus: string;
  defensiveFocus: string;
  trainingGoals: string;
  matchGoals: string;
  coreValues: string;
  additionalNotes: string;
  capturedAt: string;
}

export interface PhilosophyDiffItem {
  field: keyof Omit<PhilosophySnapshot, 'capturedAt'>;
  label: string;
  currentValue: string;
  snapshotValue: string;
  critical: boolean;
}

export type AlignmentStatus = 'alineado' | 'neutro' | 'contradictorio';

export interface AlignmentResult {
  alignment: AlignmentStatus;
  reason: string;
  confidence: 'high' | 'medium' | 'low';
}

export const CRITICAL_PHILOSOPHY_FIELDS: Array<keyof Omit<PhilosophySnapshot, 'capturedAt'>> = [
  'playStyle',
  'offensiveFocus',
  'defensiveFocus',
  'coreValues',
];

export const OPTIONAL_PHILOSOPHY_FIELDS: Array<keyof Omit<PhilosophySnapshot, 'capturedAt'>> = [
  'trainingGoals',
  'matchGoals',
  'additionalNotes',
];

export const ALL_PHILOSOPHY_FIELDS: Array<keyof Omit<PhilosophySnapshot, 'capturedAt'>> = [
  'playStyle',
  'offensiveFocus',
  'defensiveFocus',
  'trainingGoals',
  'matchGoals',
  'coreValues',
  'additionalNotes',
];

export const PHILOSOPHY_FIELD_LABELS: Record<keyof Omit<PhilosophySnapshot, 'capturedAt'>, string> = {
  playStyle: 'Estilo General y Ritmo de Juego',
  offensiveFocus: 'Principios Ofensivos',
  defensiveFocus: 'Principios Defensivos',
  trainingGoals: 'Metas de Entrenamiento / Desarrollo',
  matchGoals: 'Metas de Partido / Competitivas',
  coreValues: 'Valores e Identidad del Equipo',
  additionalNotes: 'Notas Libres y Directrices IA',
};

/**
 * Valida si un valor individual de un campo de la filosofía se considera completo:
 * - trim().length >= 3
 * - Excluye placeholders (case-insensitive): 'n/a', 'na', '-', '...', 'por definir', 'tbd', 'todo', 'pendiente'
 * - Arrays (como coreValues): completo si al menos 1 elemento pasa la validación
 * - null o undefined -> false
 */
export function isFieldComplete(value: unknown): boolean {
  if (value === null || value === undefined) return false;
  if (Array.isArray(value)) {
    return value.some((item) => isFieldComplete(item));
  }
  if (typeof value !== 'string') return false;
  const v = value.trim().toLowerCase();
  if (v.length < 3) return false;
  const placeholders = [
    'n/a',
    'na',
    '-',
    '...',
    'por definir',
    'tbd',
    'todo',
    'pendiente',
  ];
  if (placeholders.includes(v)) return false;
  return true;
}

export type PhilosophyCompletenessStatus = 'empty' | 'partial' | 'complete';

/**
 * Valida si la filosofía de entrenador está completa, parcial o vacía.
 * Devuelve nombres de campo exactos en missingCritical y missingOptional.
 */
export function validatePhilosophyComplete(
  philosophy: Partial<CoachPhilosophy> | null | undefined
): {
  status: PhilosophyCompletenessStatus;
  complete: boolean;
  missingCritical: string[];
  missingOptional: string[];
} {
  if (!philosophy) {
    return {
      status: 'empty',
      complete: false,
      missingCritical: [...CRITICAL_PHILOSOPHY_FIELDS],
      missingOptional: [...OPTIONAL_PHILOSOPHY_FIELDS],
    };
  }

  const missingCritical: string[] = [];
  const missingOptional: string[] = [];
  let filledCount = 0;

  for (const field of CRITICAL_PHILOSOPHY_FIELDS) {
    const val = philosophy[field];
    if (isFieldComplete(val)) {
      filledCount++;
    } else {
      missingCritical.push(field);
    }
  }

  for (const field of OPTIONAL_PHILOSOPHY_FIELDS) {
    const val = philosophy[field];
    if (isFieldComplete(val)) {
      filledCount++;
    } else {
      missingOptional.push(field);
    }
  }

  // Estado A: VACÍA (ningún campo definido)
  if (filledCount === 0) {
    return {
      status: 'empty',
      complete: false,
      missingCritical,
      missingOptional,
    };
  }

  // Estado B: PARCIAL (falta alguno de los 4 críticos)
  if (missingCritical.length > 0) {
    return {
      status: 'partial',
      complete: false,
      missingCritical,
      missingOptional,
    };
  }

  // Estado C: COMPLETA (los 4 críticos completos)
  return {
    status: 'complete',
    complete: true,
    missingCritical: [],
    missingOptional,
  };
}

let livePhilosophyCache: CoachPhilosophy | null = null;
let lastFetchTimestamp = 0;
const CACHE_TTL_MS = 60 * 1000; // 60 segundos

/**
 * Obtiene la filosofía viva desde /api/db/philosophy (con caché de 60s).
 * Permite forzar refresco con forceRefresh = true.
 */
export async function fetchLivePhilosophy(
  forceRefresh = false,
  authToken?: string | null
): Promise<CoachPhilosophy | null> {
  const now = Date.now();
  if (!forceRefresh && livePhilosophyCache && now - lastFetchTimestamp < CACHE_TTL_MS) {
    return livePhilosophyCache;
  }

  try {
    const headers: Record<string, string> = {};
    if (authToken) {
      headers['Authorization'] = `Bearer ${authToken}`;
    }

    const res = await fetch('/api/db/philosophy', { headers });
    if (res.ok) {
      const data = await res.json();
      if (data.success && data.philosophy) {
        livePhilosophyCache = data.philosophy;
        lastFetchTimestamp = Date.now();
        return livePhilosophyCache;
      }
    }
  } catch (err) {
    console.warn('Error al consultar /api/db/philosophy:', err);
  }

  // Fallback si no hay red o fallo de endpoint
  if (livePhilosophyCache) return livePhilosophyCache;
  return getCurrentPhilosophy();
}

/**
 * Invalida la caché en memoria de la filosofía viva
 */
export function invalidatePhilosophyCache(): void {
  lastFetchTimestamp = 0;
  livePhilosophyCache = null;
}

// Escuchador global de actualización de filosofía
if (typeof window !== 'undefined') {
  window.addEventListener('coachmind_philosophy_saved', () => {
    invalidatePhilosophyCache();
  });
}

/**
 * Obtiene la filosofía actual del entrenador desde localStorage o cache de sesión
 */
export function getCurrentPhilosophy(userId?: string): CoachPhilosophy | null {
  if (typeof window === 'undefined') return null;

  try {
    // 1. Intentar clave específica de usuario
    if (userId) {
      const userKey = `coach_philosophy_${userId}`;
      const savedUser = localStorage.getItem(userKey);
      if (savedUser) return JSON.parse(savedUser);
    }

    // 2. Intentar clave estándar de la app
    const genericKey = 'coach_philosophy_default';
    const savedGeneric = localStorage.getItem(genericKey);
    if (savedGeneric) return JSON.parse(savedGeneric);

    // 3. Buscar cualquier clave que coincida
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith('coach_philosophy_')) {
        const val = localStorage.getItem(k);
        if (val) return JSON.parse(val);
      }
    }

    return null;
  } catch (err) {
    console.error('Error al leer filosofía de localStorage:', err);
    return null;
  }
}

/**
 * Crea un snapshot inmutable de la filosofía actual para fijar a la temporada
 */
export function createPhilosophySnapshot(philosophy: Partial<CoachPhilosophy>): PhilosophySnapshot {
  return {
    playStyle: (philosophy.playStyle || '').trim(),
    offensiveFocus: (philosophy.offensiveFocus || '').trim(),
    defensiveFocus: (philosophy.defensiveFocus || '').trim(),
    trainingGoals: (philosophy.trainingGoals || '').trim(),
    matchGoals: (philosophy.matchGoals || '').trim(),
    coreValues: (philosophy.coreValues || '').trim(),
    additionalNotes: (philosophy.additionalNotes || '').trim(),
    capturedAt: new Date().toISOString(),
  };
}

/**
 * Detecta diferencias entre la filosofía viva actual y el snapshot congelado de la temporada
 */
export function diffPhilosophy(
  current: Partial<CoachPhilosophy> | null | undefined,
  snapshot: Partial<PhilosophySnapshot> | null | undefined
): PhilosophyDiffItem[] {
  if (!current || !snapshot) return [];

  const diffs: PhilosophyDiffItem[] = [];

  for (const field of ALL_PHILOSOPHY_FIELDS) {
    const curVal = (current[field] || '').trim();
    const snapVal = (snapshot[field] || '').trim();

    if (curVal !== snapVal) {
      diffs.push({
        field,
        label: PHILOSOPHY_FIELD_LABELS[field],
        currentValue: curVal,
        snapshotValue: snapVal,
        critical: CRITICAL_PHILOSOPHY_FIELDS.includes(field),
      });
    }
  }

  return diffs;
}

/**
 * Evaluación rápida heurística y determinista para UI optimista o fallback offline
 */
export function checkAlignmentFast(
  goal: { descripcion: string; area: string },
  philosophy: Partial<CoachPhilosophy> | null | undefined
): AlignmentResult {
  if (!philosophy) {
    return {
      alignment: 'neutro',
      reason: 'No hay filosofía de entrenador disponible para contrastar.',
      confidence: 'low',
    };
  }

  const { complete } = validatePhilosophyComplete(philosophy);
  if (!complete) {
    return {
      alignment: 'neutro',
      reason: 'La filosofía de entrenador está incompleta. Complétala para una evaluación precisa.',
      confidence: 'low',
    };
  }

  const desc = (goal.descripcion || '').toLowerCase();
  const playStyle = (philosophy.playStyle || '').toLowerCase();
  const off = (philosophy.offensiveFocus || '').toLowerCase();
  const def = (philosophy.defensiveFocus || '').toLowerCase();
  const core = (philosophy.coreValues || '').toLowerCase();

  // Detección de posibles contradicciones heurísticas
  if (
    (playStyle.includes('rápido') || playStyle.includes('transición') || playStyle.includes('ritmo alto')) &&
    (desc.includes('posesiones lentas') || desc.includes('agotar los 24s') || desc.includes('retrasar el juego'))
  ) {
    return {
      alignment: 'contradictorio',
      reason: `El objetivo promueve un ritmo pausado que choca con el estilo de juego '${philosophy.playStyle}'.`,
      confidence: 'low',
    };
  }

  if (
    (def.includes('individual') || def.includes('presión') || def.includes('agresiva') || def.includes('cambios')) &&
    (desc.includes('zona pasiva') || desc.includes('zona 2-3 estática'))
  ) {
    return {
      alignment: 'contradictorio',
      reason: `El objetivo defensivo pasivo contradice tu principio de defensa agresiva/presión.`,
      confidence: 'low',
    };
  }

  // Detección de alineación positiva
  const matchesArea =
    (goal.area === 'tactica' && (desc.includes('espacio') || desc.includes('spacing') || desc.includes('pick') || desc.includes('balance'))) ||
    (goal.area === 'tecnica' && (desc.includes('tiro') || desc.includes('pase') || desc.includes('bote') || desc.includes('1c1'))) ||
    (goal.area === 'fisica' && (desc.includes('ritmo') || desc.includes('velocidad') || desc.includes('fuerza'))) ||
    (goal.area === 'mental' && (desc.includes('comunicación') || desc.includes('concentración') || desc.includes('esfuerzo')));

  const matchesKeywords =
    (off && (desc.includes('pase') || desc.includes('transición') || desc.includes('5 abiertos') || desc.includes('lectura'))) ||
    (def && (desc.includes('rebote') || desc.includes('contención') || desc.includes('ayuda') || desc.includes('presión'))) ||
    (core && (desc.includes('equipo') || desc.includes('compañerismo') || desc.includes('intensidad') || desc.includes('disciplina')));

  if (matchesArea || matchesKeywords) {
    return {
      alignment: 'alineado',
      reason: `Refuerza principios de tu estilo y modelo de juego (${philosophy.playStyle || 'juego colectivo'}).`,
      confidence: 'low',
    };
  }

  return {
    alignment: 'neutro',
    reason: 'Objetivo de desarrollo complementario sin conflicto directo con tu filosofía.',
    confidence: 'low',
  };
}

// Cache en memoria para evaluaciones del LLM: key = `${goalId || goalDesc}_${hash}`
const alignmentCache = new Map<string, AlignmentResult>();

function computePhilosophyHash(phil: Partial<CoachPhilosophy>): string {
  const str = ALL_PHILOSOPHY_FIELDS.map((f) => phil[f] || '').join('|');
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return hash.toString(36);
}

/**
 * Evaluación de coherencia y alineación con LLM en backend
 */
export async function checkAlignment(
  goal: { id?: string; descripcion: string; area: string },
  philosophy: Partial<CoachPhilosophy> | null | undefined
): Promise<AlignmentResult> {
  if (!philosophy) {
    return {
      alignment: 'neutro',
      reason: 'No hay filosofía de entrenador disponible para contrastar.',
      confidence: 'high',
    };
  }

  const { complete } = validatePhilosophyComplete(philosophy);
  if (!complete) {
    return {
      alignment: 'neutro',
      reason: 'La filosofía de entrenador está incompleta. Complétala primero en la sección de Filosofía.',
      confidence: 'high',
    };
  }

  const cacheKey = `${goal.id || goal.descripcion}_${computePhilosophyHash(philosophy)}`;
  if (alignmentCache.has(cacheKey)) {
    return alignmentCache.get(cacheKey)!;
  }

  try {
    const res = await fetch('/api/planning/ai-check-alignment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        goal,
        philosophy,
      }),
    });

    if (res.ok) {
      const data = await res.json();
      if (data.alignment && data.reason) {
        const result: AlignmentResult = {
          alignment: data.alignment,
          reason: data.reason,
          confidence: data.confidence || 'high',
        };
        alignmentCache.set(cacheKey, result);
        return result;
      }
    }
  } catch (err) {
    console.warn('Fallo en llamada a LLM para checkAlignment, usando fallback rápido:', err);
  }

  // Fallback rápido si la API no está disponible
  const fastResult = checkAlignmentFast(goal, philosophy);
  alignmentCache.set(cacheKey, fastResult);
  return fastResult;
}
