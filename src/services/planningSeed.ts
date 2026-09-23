import {
  SeasonGoal,
  Mesocycle,
  Microcycle,
} from '../types/planning';

export const INITIAL_PLANNING_SEED: {
  season: SeasonGoal;
  mesocycles: Mesocycle[];
  microcycles: Microcycle[];
} = {
  season: {
    id: 'season-current',
    temporada: '',
    categoria: '',
    objetivoPrincipal: '',
    objetivosDeportivos: [],
    objetivosFormativos: [],
    estiloDeJuego: '',
    fechaInicio: '',
    fechaFin: '',
    createdAt: new Date().toISOString(),
  },
  mesocycles: [],
  microcycles: [],
};
