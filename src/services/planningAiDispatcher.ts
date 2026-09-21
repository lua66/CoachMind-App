import { CoachPhilosophy } from '../types';
import {
  validatePhilosophyComplete,
  PhilosophyCompletenessStatus,
} from './philosophyService';

export interface ValidatePhilosophyResult {
  tool: 'validate_philosophy_complete';
  complete: boolean;
  status: PhilosophyCompletenessStatus;
  missingCritical: string[];
  missingOptional: string[];
  message?: string;
}

export const PHILOSOPHY_INCOMPLETE_BLOCKING_MESSAGE =
  'No puedo analizar ni planificar sin tu Filosofía de Entrenador completa. Complétala primero en la sección Filosofía de Entrenador.';

/**
 * Tool de validación de filosofía para el dispatcher del LLM
 */
export function toolValidatePhilosophyComplete(
  philosophy: Partial<CoachPhilosophy> | null | undefined
): ValidatePhilosophyResult {
  const validation = validatePhilosophyComplete(philosophy);

  return {
    tool: 'validate_philosophy_complete',
    complete: validation.complete,
    status: validation.status,
    missingCritical: validation.missingCritical,
    missingOptional: validation.missingOptional,
    message: validation.complete ? undefined : PHILOSOPHY_INCOMPLETE_BLOCKING_MESSAGE,
  };
}

export interface PlanningAiDispatcherResponse<T = any> {
  success: boolean;
  data?: T;
  text?: string;
  error?: string;
  status?: PhilosophyCompletenessStatus;
  missingCritical?: string[];
  message?: string;
}

/**
 * Dispatcher central para llamadas de IA de Planificación.
 * Ejecuta SIEMPRE como primer paso la tool validate_philosophy_complete.
 * Si complete === false, corta el flujo inmediatamente sin invocar al LLM principal.
 */
export async function dispatchPlanningAiCall<T = any>(
  endpoint: string,
  payload: any,
  philosophy: Partial<CoachPhilosophy> | null | undefined
): Promise<PlanningAiDispatcherResponse<T>> {
  // 1. Tool execution al inicio
  const toolCheck = toolValidatePhilosophyComplete(philosophy);

  if (!toolCheck.complete) {
    // Corta el flujo inmediatamente sin llamar al LLM
    return {
      success: false,
      error: 'PHILOSOPHY_INCOMPLETE',
      status: toolCheck.status,
      missingCritical: toolCheck.missingCritical,
      message: PHILOSOPHY_INCOMPLETE_BLOCKING_MESSAGE,
    };
  }

  // 2. Si es completa, llama al endpoint de backend
  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...payload,
        coachPhilosophy: philosophy,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      return {
        success: false,
        error: data.error || 'SERVER_ERROR',
        status: data.status,
        missingCritical: data.missingCritical,
        message: data.message || 'Error al procesar la solicitud de IA',
      };
    }

    return {
      success: true,
      data: data.data || data,
      text: data.text || data.diagnosis,
    };
  } catch (err: any) {
    return {
      success: false,
      error: 'NETWORK_ERROR',
      message: err?.message || 'Error de conexión con el motor de IA',
    };
  }
}
