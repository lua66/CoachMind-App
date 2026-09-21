import {
  SeasonGoal,
  Mesocycle,
  Microcycle,
  SessionLog,
  MicrocycleEvaluation,
  ImbalanceDetectionResult,
} from '../types/planning';
import { INITIAL_PLANNING_SEED } from './planningSeed';
import { detectImbalances } from '../utils/imbalanceDetector';
import {
  getCurrentPhilosophy,
  createPhilosophySnapshot,
  validatePhilosophyComplete,
  CoachPhilosophy,
} from './philosophyService';

const STORAGE_KEYS = {
  SEASON: 'coachmind_planning_season_v1',
  MESOCYCLES: 'coachmind_planning_mesocycles_v1',
  MICROCYCLES: 'coachmind_planning_microcycles_v1',
};

class PlanningService {
  private initStorage() {
    if (typeof window === 'undefined') return;

    if (!localStorage.getItem(STORAGE_KEYS.SEASON)) {
      const initialSeason = { ...INITIAL_PLANNING_SEED.season };
      const currentPhil = getCurrentPhilosophy();
      if (currentPhil && validatePhilosophyComplete(currentPhil).complete) {
        initialSeason.philosophySnapshot = createPhilosophySnapshot(currentPhil);
      }
      localStorage.setItem(STORAGE_KEYS.SEASON, JSON.stringify(initialSeason));
    }
    if (!localStorage.getItem(STORAGE_KEYS.MESOCYCLES)) {
      localStorage.setItem(STORAGE_KEYS.MESOCYCLES, JSON.stringify(INITIAL_PLANNING_SEED.mesocycles));
    }
    if (!localStorage.getItem(STORAGE_KEYS.MICROCYCLES)) {
      localStorage.setItem(STORAGE_KEYS.MICROCYCLES, JSON.stringify(INITIAL_PLANNING_SEED.microcycles));
    }
  }

  // --- SEASONS ---
  public getSeason(): SeasonGoal {
    this.initStorage();
    try {
      const data = localStorage.getItem(STORAGE_KEYS.SEASON);
      return data ? JSON.parse(data) : INITIAL_PLANNING_SEED.season;
    } catch {
      return INITIAL_PLANNING_SEED.season;
    }
  }

  public saveSeason(season: SeasonGoal): SeasonGoal {
    this.initStorage();
    const currentPhil = getCurrentPhilosophy();
    const snapshot = season.philosophySnapshot || (currentPhil ? createPhilosophySnapshot(currentPhil) : undefined);

    const updated: SeasonGoal = {
      ...season,
      philosophySnapshot: snapshot,
      updatedAt: new Date().toISOString(),
    };
    localStorage.setItem(STORAGE_KEYS.SEASON, JSON.stringify(updated));

    // Background server sync with attached philosophy
    this.syncWithServer('/api/planning/seasons', 'POST', {
      ...updated,
      coachPhilosophy: currentPhil,
    });
    return updated;
  }

  public updateSeasonPhilosophySnapshot(newPhilosophy: CoachPhilosophy): SeasonGoal {
    const season = this.getSeason();
    const snapshot = createPhilosophySnapshot(newPhilosophy);
    const updated: SeasonGoal = {
      ...season,
      philosophySnapshot: snapshot,
      updatedAt: new Date().toISOString(),
    };
    localStorage.setItem(STORAGE_KEYS.SEASON, JSON.stringify(updated));
    this.syncWithServer('/api/planning/seasons', 'POST', {
      ...updated,
      coachPhilosophy: newPhilosophy,
    });
    return updated;
  }

  // --- MESOCYCLES ---
  public getMesocycles(): Mesocycle[] {
    this.initStorage();
    try {
      const data = localStorage.getItem(STORAGE_KEYS.MESOCYCLES);
      return data ? JSON.parse(data) : INITIAL_PLANNING_SEED.mesocycles;
    } catch {
      return INITIAL_PLANNING_SEED.mesocycles;
    }
  }

  public getMesocycleById(id: string): Mesocycle | undefined {
    const list = this.getMesocycles();
    return list.find((m) => m.id === id);
  }

  public saveMesocycle(mesocycle: Mesocycle): Mesocycle {
    const list = this.getMesocycles();
    const index = list.findIndex((m) => m.id === mesocycle.id);
    let updatedList: Mesocycle[];

    if (index >= 0) {
      updatedList = [...list];
      updatedList[index] = mesocycle;
    } else {
      updatedList = [...list, mesocycle];
    }

    localStorage.setItem(STORAGE_KEYS.MESOCYCLES, JSON.stringify(updatedList));
    this.syncWithServer('/api/planning/mesocycles', 'POST', {
      ...mesocycle,
      coachPhilosophy: getCurrentPhilosophy(),
    });
    return mesocycle;
  }

  public deleteMesocycle(id: string): boolean {
    const list = this.getMesocycles();
    const filtered = list.filter((m) => m.id !== id);
    localStorage.setItem(STORAGE_KEYS.MESOCYCLES, JSON.stringify(filtered));
    this.syncWithServer(`/api/planning/mesocycles/${id}`, 'DELETE', {});
    return true;
  }

  // --- MICROCICLOS ---
  public getMicrocycles(mesocycleId?: string): Microcycle[] {
    this.initStorage();
    try {
      const data = localStorage.getItem(STORAGE_KEYS.MICROCYCLES);
      const list: Microcycle[] = data ? JSON.parse(data) : INITIAL_PLANNING_SEED.microcycles;
      if (mesocycleId) {
        return list.filter((m) => m.mesocycleId === mesocycleId);
      }
      return list;
    } catch {
      return INITIAL_PLANNING_SEED.microcycles;
    }
  }

  public getMicrocycleById(id: string): Microcycle | undefined {
    const list = this.getMicrocycles();
    return list.find((m) => m.id === id);
  }

  public saveMicrocycle(microcycle: Microcycle): Microcycle {
    const list = this.getMicrocycles();
    const index = list.findIndex((m) => m.id === microcycle.id);
    let updatedList: Microcycle[];

    if (index >= 0) {
      updatedList = [...list];
      updatedList[index] = microcycle;
    } else {
      updatedList = [...list, microcycle];
    }

    localStorage.setItem(STORAGE_KEYS.MICROCYCLES, JSON.stringify(updatedList));
    this.syncWithServer('/api/planning/microcycles', 'POST', {
      ...microcycle,
      coachPhilosophy: getCurrentPhilosophy(),
    });
    return microcycle;
  }

  public deleteMicrocycle(id: string): boolean {
    const list = this.getMicrocycles();
    const filtered = list.filter((m) => m.id !== id);
    localStorage.setItem(STORAGE_KEYS.MICROCYCLES, JSON.stringify(filtered));
    this.syncWithServer(`/api/planning/microcycles/${id}`, 'DELETE', {});
    return true;
  }

  // --- SESSION LOGS ---
  public saveSessionLog(microcycleId: string, session: SessionLog): Microcycle | undefined {
    const micro = this.getMicrocycleById(microcycleId);
    if (!micro) return undefined;

    const sessions = micro.sessions || [];
    const index = sessions.findIndex((s) => s.id === session.id);
    let updatedSessions: SessionLog[];

    if (index >= 0) {
      updatedSessions = [...sessions];
      updatedSessions[index] = session;
    } else {
      updatedSessions = [...sessions, session];
    }

    const updatedMicro: Microcycle = {
      ...micro,
      sessions: updatedSessions,
    };

    this.saveMicrocycle(updatedMicro);
    return updatedMicro;
  }

  public deleteSessionLog(microcycleId: string, sessionId: string): Microcycle | undefined {
    const micro = this.getMicrocycleById(microcycleId);
    if (!micro) return undefined;

    const sessions = (micro.sessions || []).filter((s) => s.id !== sessionId);
    const updatedMicro: Microcycle = {
      ...micro,
      sessions,
    };

    this.saveMicrocycle(updatedMicro);
    return updatedMicro;
  }

  // --- EVALUATIONS & CLOSING ---
  public saveEvaluation(microcycleId: string, evaluation: MicrocycleEvaluation): Microcycle | undefined {
    const micro = this.getMicrocycleById(microcycleId);
    if (!micro) return undefined;

    const updatedMicro: Microcycle = {
      ...micro,
      estado: 'cerrado',
      evaluation,
    };

    // Also update goals statuses in the parent mesocycle if applicable
    const meso = this.getMesocycleById(micro.mesocycleId);
    if (meso) {
      const updatedGoals = meso.goals.map((g) => {
        if (evaluation.objetivosCumplidos.includes(g.id)) {
          return { ...g, estado: 'cumplido' as const };
        }
        if (evaluation.objetivosNoCumplidos.includes(g.id)) {
          return { ...g, estado: 'no_cumplido' as const };
        }
        return g;
      });

      this.saveMesocycle({
        ...meso,
        goals: updatedGoals,
      });
    }

    this.saveMicrocycle(updatedMicro);
    return updatedMicro;
  }

  // --- DETECTOR DE DESEQUILIBRIOS ---
  public analyzeMicrocycle(
    microcycleId: string,
    unfulfilledGoalIds: string[] = []
  ): {
    microcycle: Microcycle;
    mesocycle: Mesocycle;
    analysis: ImbalanceDetectionResult;
  } | null {
    const micro = this.getMicrocycleById(microcycleId);
    if (!micro) return null;

    const meso = this.getMesocycleById(micro.mesocycleId);
    if (!meso) return null;

    const allMicrocycles = this.getMicrocycles(meso.id);
    const historical = allMicrocycles.filter((m) => m.id !== micro.id && m.semana < micro.semana);

    const analysis = detectImbalances(
      meso.goals,
      micro.sessions || [],
      historical,
      unfulfilledGoalIds.length > 0 ? unfulfilledGoalIds : micro.evaluation?.objetivosNoCumplidos || []
    );

    return {
      microcycle: micro,
      mesocycle: meso,
      analysis,
    };
  }

  // --- CUMULATIVE SEASON ANALYSIS ---
  public getSeasonCumulativeImbalances(): {
    byArea: Record<string, { realMinutes: number; realPct: number; plannedPct: number; delta: number }>;
    totalMinutes: number;
    chronicallyMissedGoals: Array<{ goal: any; missedCount: number; mesocycleName: string }>;
  } {
    const mesocycles = this.getMesocycles();
    const microcycles = this.getMicrocycles();

    const areaMinutes: Record<string, number> = {
      tecnica: 0,
      tactica: 0,
      fisica: 0,
      mental: 0,
    };
    let totalMinutes = 0;

    microcycles.forEach((micro) => {
      (micro.sessions || []).forEach((sess) => {
        (sess.contenidos || []).forEach((c) => {
          if (areaMinutes[c.area] !== undefined) {
            areaMinutes[c.area] += Number(c.duracionMin) || 0;
            totalMinutes += Number(c.duracionMin) || 0;
          }
        });
      });
    });

    // Calculate total planned goals across all mesocycles
    const areaGoalCount: Record<string, number> = {
      tecnica: 0,
      tactica: 0,
      fisica: 0,
      mental: 0,
    };
    let totalGoals = 0;

    mesocycles.forEach((m) => {
      m.goals.forEach((g) => {
        if (areaGoalCount[g.area] !== undefined) {
          areaGoalCount[g.area]++;
          totalGoals++;
        }
      });
    });

    const byArea: Record<string, any> = {};
    ['tecnica', 'tactica', 'fisica', 'mental'].forEach((area) => {
      const realPct = totalMinutes > 0 ? areaMinutes[area] / totalMinutes : 0;
      const plannedPct = totalGoals > 0 ? areaGoalCount[area] / totalGoals : 0.25;
      const delta = realPct - plannedPct;
      byArea[area] = {
        realMinutes: areaMinutes[area],
        realPct: Math.round(realPct * 1000) / 1000,
        plannedPct: Math.round(plannedPct * 1000) / 1000,
        delta: Math.round(delta * 1000) / 1000,
      };
    });

    // Chronically missed goals
    const missedMap = new Map<string, { goal: any; missedCount: number; mesocycleName: string }>();

    microcycles.forEach((micro) => {
      if (micro.evaluation && Array.isArray(micro.evaluation.objetivosNoCumplidos)) {
        const parentMeso = mesocycles.find((m) => m.id === micro.mesocycleId);
        micro.evaluation.objetivosNoCumplidos.forEach((goalId) => {
          const targetGoal = parentMeso?.goals.find((g) => g.id === goalId);
          if (targetGoal) {
            const existing = missedMap.get(goalId);
            if (existing) {
              existing.missedCount++;
            } else {
              missedMap.set(goalId, {
                goal: targetGoal,
                missedCount: 1,
                mesocycleName: parentMeso?.nombre || 'Mesociclo',
              });
            }
          }
        });
      }
    });

    return {
      byArea,
      totalMinutes,
      chronicallyMissedGoals: Array.from(missedMap.values()),
    };
  }

  // --- RESET SEED ---
  public resetToDefaultSeed() {
    localStorage.setItem(STORAGE_KEYS.SEASON, JSON.stringify(INITIAL_PLANNING_SEED.season));
    localStorage.setItem(STORAGE_KEYS.MESOCYCLES, JSON.stringify(INITIAL_PLANNING_SEED.mesocycles));
    localStorage.setItem(STORAGE_KEYS.MICROCYCLES, JSON.stringify(INITIAL_PLANNING_SEED.microcycles));
    return true;
  }

  // --- HELPER ASYNC SYNC ---
  private async syncWithServer(endpoint: string, method: string, payload: any) {
    try {
      await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
    } catch {
      // Offline or dev mode; local storage is the primary source of truth
    }
  }
}

export const planningService = new PlanningService();
