export type PlanningArea = 'tecnica' | 'tactica' | 'fisica' | 'mental';

export type GoalStatus = 'pendiente' | 'en_progreso' | 'cumplido' | 'no_cumplido';
export type CycleState = 'planificado' | 'activo' | 'cerrado';
export type PhilosophyAlignment = 'alineado' | 'neutro' | 'contradictorio';

export interface SeasonGoal {
  id: string;
  userId?: number;
  temporada: string; // e.g. "2025-2026"
  categoria: string; // e.g. "Senior", "Junior", "Cadete"
  objetivoPrincipal: string; // e.g. "Ascenso a Primera División Nacional"
  objetivosDeportivos: string[];
  objetivosFormativos: string[];
  estiloDeJuego: string;
  fechaInicio: string; // YYYY-MM-DD
  fechaFin: string; // YYYY-MM-DD
  philosophySnapshot?: {
    playStyle: string;
    offensiveFocus: string;
    defensiveFocus: string;
    trainingGoals: string;
    matchGoals: string;
    coreValues: string;
    additionalNotes: string;
    capturedAt: string;
  };
  createdAt?: string;
  updatedAt?: string;
}

export interface MesocycleGoal {
  id: string;
  mesocycleId: string;
  area: PlanningArea;
  descripcion: string;
  indicadorExito: string;
  estado: GoalStatus;
  alignmentWithPhilosophy?: PhilosophyAlignment;
  alignmentReason?: string;
  alignmentConfidence?: 'high' | 'medium' | 'low';
}

export interface Mesocycle {
  id: string;
  seasonGoalId: string;
  nombre: string; // e.g. "Mesociclo 1: Pretemporada y Fundamentos"
  numero: number;
  fechaInicio: string;
  fechaFin: string;
  objetivoPrincipal: string;
  estado: CycleState;
  resumenCierre?: string; // Resumen comprimido por la IA
  goals: MesocycleGoal[];
}

export interface PlannedLoads {
  sesiones: number; // e.g. 4 sesiones
  intensidad: 'Baja' | 'Media' | 'Alta' | 'Máxima';
  volumenMinutos: number; // e.g. 360 min
}

export interface SessionContentItem {
  area: PlanningArea;
  contenido: string; // e.g. "Lectura de Pick & Roll central"
  duracionMin: number;
  carga?: 'Baja' | 'Media' | 'Alta';
}

export interface SessionLog {
  id: string;
  microcycleId: string;
  fecha: string;
  titulo?: string;
  duracionMin: number;
  contenidos: SessionContentItem[];
  notas?: string;
  rpe?: number; // 1 to 10
}

export interface Microcycle {
  id: string;
  mesocycleId: string;
  semana: number;
  fechaInicio: string;
  fechaFin: string;
  objetivoSemanal: string;
  cargasPlanificadas: PlannedLoads;
  goalIds: string[]; // IDs de MesocycleGoal vinculados
  estado: CycleState;
  sessions?: SessionLog[];
  evaluation?: MicrocycleEvaluation;
}

export interface MicrocycleEvaluation {
  id: string;
  microcycleId: string;
  fecha: string;
  objetivosCumplidos: string[]; // IDs de goals
  objetivosNoCumplidos: string[]; // IDs de goals
  comentarioLibre?: string;
  percepcionEntrenador: number; // 1 to 5
  incidencias?: string[];
  resumenIA?: string;
  propuestaSiguienteMicro?: string;
}

export interface ImbalanceAreaStat {
  area: PlanningArea;
  plannedPct: number; // 0.0 - 1.0 (e.g. 0.35)
  realPct: number; // 0.0 - 1.0 (e.g. 0.15)
  delta: number; // realPct - plannedPct
  plannedMinutes: number;
  realMinutes: number;
  status: 'equilibrada' | 'sobre_trabajada' | 'descuidada';
}

export interface ImbalanceCorrelation {
  goalId: string;
  goalDescription: string;
  area: PlanningArea;
  status: 'no_cumplido';
  suspectedCause: string;
  evidence: string;
}

export interface ImbalanceDetectionResult {
  byArea: Record<PlanningArea, ImbalanceAreaStat>;
  correlations: ImbalanceCorrelation[];
  patterns: string[];
  totalPlannedMinutes: number;
  totalRealMinutes: number;
  summaryText: string;
}

export interface PlanningAiChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  phase?: 1 | 2 | 3 | 4;
}
