import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Shield,
  ArrowLeft,
  Calendar,
  Upload,
  FileSpreadsheet,
  Plus,
  Trash2,
  Trophy,
  Flame,
  Zap,
  Award,
  Link,
  Info,
  Check,
  Download,
  BarChart3,
  TrendingUp,
  UserCheck,
  Layers,
  Sparkles,
  Loader2,
  Globe,
  FileDown,
  Edit3,
  Search,
  Users,
  Coffee,
  Swords,
  CheckCircle2,
  ChevronRight,
  ArrowRight,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { UserProfile } from '../types';
import {
  PlayerStatsData,
  generateTeamScoutingPdf,
} from '../utils/scoutingPdfGenerator';
import { ScoutingAiConsultant } from './ScoutingAiConsultant';

interface RivalScoutingViewProps {
  userProfile?: UserProfile | null;
}

export interface MatchData {
  id: string;
  matchIndex: number; // 1, 2, 3
  localTeam: string;
  visitorTeam: string;
  scoreLocal: string;
  scoreVisitor: string;
  playByPlayUrl: string;
  localPlayers: PlayerStatsData[];
  visitorPlayers: PlayerStatsData[];
}

export interface JornadaState {
  jornadaNumber: number;
  restingTeam: string;
  matches: [MatchData, MatchData, MatchData];
}

// 14 Jornadas
const TOTAL_JORNADAS = 14;

// Equipos predeterminados de la liga (7 equipos)
const DEFAULT_LEAGUE_TEAMS = [
  'CB Sant Feliu',
  'CB Granollers',
  'Bàsquet Manresa',
  'CEB Girona',
  'Joventut Badalona',
  'CB Tarragona',
  'CB Prat',
];

// Generador de emparejamientos predeterminados para las 14 jornadas (Round Robin con 7 equipos, ida y vuelta)
const generateDefaultJornada = (jornadaNum: number): JornadaState => {
  const teams = [...DEFAULT_LEAGUE_TEAMS];
  const round = jornadaNum - 1; // 0 to 13

  // Rotación simple para 7 equipos (1 descansa, 6 juegan 3 partidos)
  // Equipos: 0, 1, 2, 3, 4, 5, 6
  const restingIdx = round % 7;
  const restingTeam = teams[restingIdx];
  const activeTeams = teams.filter((_, idx) => idx !== restingIdx);

  // 3 partidos
  // Si round >= 7 es la segunda vuelta (se invierten locales/visitantes)
  const isSecondRound = round >= 7;

  const p1_local = isSecondRound ? activeTeams[3] : activeTeams[0];
  const p1_visitor = isSecondRound ? activeTeams[0] : activeTeams[3];

  const p2_local = isSecondRound ? activeTeams[4] : activeTeams[1];
  const p2_visitor = isSecondRound ? activeTeams[1] : activeTeams[4];

  const p3_local = isSecondRound ? activeTeams[5] : activeTeams[2];
  const p3_visitor = isSecondRound ? activeTeams[2] : activeTeams[5];

  return {
    jornadaNumber: jornadaNum,
    restingTeam: restingTeam,
    matches: [
      {
        id: `j${jornadaNum}_m1`,
        matchIndex: 1,
        localTeam: p1_local,
        visitorTeam: p1_visitor,
        scoreLocal: '',
        scoreVisitor: '',
        playByPlayUrl: '',
        localPlayers: [],
        visitorPlayers: [],
      },
      {
        id: `j${jornadaNum}_m2`,
        matchIndex: 2,
        localTeam: p2_local,
        visitorTeam: p2_visitor,
        scoreLocal: '',
        scoreVisitor: '',
        playByPlayUrl: '',
        localPlayers: [],
        visitorPlayers: [],
      },
      {
        id: `j${jornadaNum}_m3`,
        matchIndex: 3,
        localTeam: p3_local,
        visitorTeam: p3_visitor,
        scoreLocal: '',
        scoreVisitor: '',
        playByPlayUrl: '',
        localPlayers: [],
        visitorPlayers: [],
      },
    ],
  };
};

export const RivalScoutingView: React.FC<RivalScoutingViewProps> = ({ userProfile }) => {
  // Estado de navegación: Jornada seleccionada (1..14)
  const [selectedJornadaNum, setSelectedJornadaNum] = useState<number | null>(null);

  // Partido activo dentro de la Jornada (0: Partido 1, 1: Partido 2, 2: Partido 3)
  const [activeMatchIndex, setActiveMatchIndex] = useState<number>(0);

  // Sub-vista dentro del partido: 'both' | 'local' | 'visitor'
  const [activeTeamView, setActiveTeamView] = useState<'both' | 'local' | 'visitor'>('both');

  // Estado de los datos de la jornada seleccionada
  const [jornadaData, setJornadaData] = useState<JornadaState>(() => generateDefaultJornada(1));

  // Estados de feedback
  const [localFeedback, setLocalFeedback] = useState<string | null>(null);
  const [visitorFeedback, setVisitorFeedback] = useState<string | null>(null);
  const [isScraping, setIsScraping] = useState<boolean>(false);
  const [scrapeFeedback, setScrapeFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const localFileInputRef = useRef<HTMLInputElement>(null);
  const visitorFileInputRef = useRef<HTMLInputElement>(null);

  // Clave de almacenamiento en localStorage para la Jornada seleccionada
  const storageKey = selectedJornadaNum ? `coachmind_jornada_scouting_v3_${selectedJornadaNum}` : null;

  // Cargar datos de la jornada al cambiar
  useEffect(() => {
    if (!selectedJornadaNum) return;
    const saved = localStorage.getItem(`coachmind_jornada_scouting_v3_${selectedJornadaNum}`);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setJornadaData(parsed);
      } catch (e) {
        console.error('Error cargando datos de la jornada:', e);
        setJornadaData(generateDefaultJornada(selectedJornadaNum));
      }
    } else {
      setJornadaData(generateDefaultJornada(selectedJornadaNum));
    }
    setActiveMatchIndex(0);
    setActiveTeamView('both');
    setLocalFeedback(null);
    setVisitorFeedback(null);
    setScrapeFeedback(null);
  }, [selectedJornadaNum]);

  // Guardar datos automáticamente
  useEffect(() => {
    if (!storageKey || !selectedJornadaNum) return;
    localStorage.setItem(storageKey, JSON.stringify(jornadaData));
  }, [jornadaData, storageKey, selectedJornadaNum]);

  // Partido actual seleccionado
  const currentMatch = jornadaData.matches[activeMatchIndex] || jornadaData.matches[0];

  // Modificar información del partido actual
  const handleUpdateCurrentMatchInfo = (
    field: keyof Omit<MatchData, 'localPlayers' | 'visitorPlayers' | 'id' | 'matchIndex'>,
    val: string
  ) => {
    setJornadaData((prev) => {
      const updatedMatches = [...prev.matches] as [MatchData, MatchData, MatchData];
      updatedMatches[activeMatchIndex] = {
        ...updatedMatches[activeMatchIndex],
        [field]: val,
      };
      return { ...prev, matches: updatedMatches };
    });
  };

  // Modificar equipo que descansa
  const handleUpdateRestingTeam = (val: string) => {
    setJornadaData((prev) => ({
      ...prev,
      restingTeam: val,
    }));
  };

  // Añadir una jugadora manual al equipo local o visitante del partido actual
  const handleAddPlayer = (team: 'local' | 'visitante') => {
    const isLocal = team === 'local';
    const targetTeamName = isLocal ? (currentMatch.localTeam || 'Local') : (currentMatch.visitorTeam || 'Visitante');
    const today = new Date().toISOString().split('T')[0];

    const newPlayer: PlayerStatsData = {
      id: `p_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      equipo: targetTeamName,
      fecha: today,
      dorsal: '',
      jugadora: '',
      pj: 1,
      min: 20,
      pts: 0,
      fc_p: 0,
      tla: 0,
      tli: 0,
      t2a: 0,
      t2i: 0,
      t3a: 0,
      t3i: 0,
      team,
    };

    setJornadaData((prev) => {
      const updatedMatches = [...prev.matches] as [MatchData, MatchData, MatchData];
      const match = updatedMatches[activeMatchIndex];

      if (isLocal) {
        match.localPlayers = [...match.localPlayers, newPlayer];
      } else {
        match.visitorPlayers = [...match.visitorPlayers, newPlayer];
      }

      return { ...prev, matches: updatedMatches };
    });
  };

  // Actualizar estadísticas de una jugadora
  const handleUpdatePlayer = (
    team: 'local' | 'visitante',
    id: string,
    field: keyof PlayerStatsData,
    value: string | number
  ) => {
    const isLocal = team === 'local';

    setJornadaData((prev) => {
      const updatedMatches = [...prev.matches] as [MatchData, MatchData, MatchData];
      const match = updatedMatches[activeMatchIndex];
      const list = isLocal ? match.localPlayers : match.visitorPlayers;

      const updatedList = list.map((p) => {
        if (p.id !== id) return p;

        let updated = { ...p };
        const numericFields: (keyof PlayerStatsData)[] = [
          'pj',
          'min',
          'pts',
          'fc_p',
          'tla',
          'tli',
          't2a',
          't2i',
          't3a',
          't3i',
        ];

        if (numericFields.includes(field)) {
          const numVal = Math.max(0, parseInt(value as string, 10) || 0);
          updated = { ...updated, [field]: numVal };

          // Si se edita TLA, T2A o T3A, recalcular PTS automáticamente
          if (field === 'tla' || field === 't2a' || field === 't3a') {
            const tla = field === 'tla' ? numVal : updated.tla;
            const t2a = field === 't2a' ? numVal : updated.t2a;
            const t3a = field === 't3a' ? numVal : updated.t3a;
            updated.pts = tla * 1 + t2a * 2 + t3a * 3;
          }
        } else {
          updated = { ...updated, [field]: value };
        }

        return updated;
      });

      if (isLocal) {
        match.localPlayers = updatedList;
      } else {
        match.visitorPlayers = updatedList;
      }

      return { ...prev, matches: updatedMatches };
    });
  };

  // Eliminar jugadora
  const handleDeletePlayer = (team: 'local' | 'visitante', id: string) => {
    const isLocal = team === 'local';

    setJornadaData((prev) => {
      const updatedMatches = [...prev.matches] as [MatchData, MatchData, MatchData];
      const match = updatedMatches[activeMatchIndex];

      if (isLocal) {
        match.localPlayers = match.localPlayers.filter((p) => p.id !== id);
      } else {
        match.visitorPlayers = match.visitorPlayers.filter((p) => p.id !== id);
      }

      return { ...prev, matches: updatedMatches };
    });
  };

  // PARSER DE EXCEL ADAPTADO EXACTAMENTE A LA CABECERA DE LA IMAGEN:
  // [Equipo, fecha, Dorsal, Jugadora, PJ, MIN, PTS, FC/P, TLA, TLI, T2A, T2I, T3A, T3I]
  const parseExcelTeamData = (
    file: File,
    team: 'local' | 'visitante',
    setFeedback: (msg: string | null) => void
  ) => {
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsName = wb.SheetNames[0];
        const ws = wb.Sheets[wsName];
        const rows: any[] = XLSX.utils.sheet_to_json(ws, { header: 1 });

        if (!rows || rows.length === 0) {
          setFeedback('El archivo Excel está vacío.');
          return;
        }

        let startRowIdx = 0;
        let colMap: Record<string, number> = {};

        const headerRow = rows[0] || [];
        const isHeader = headerRow.some(
          (c: any) =>
            typeof c === 'string' &&
            (c.toLowerCase().includes('equipo') ||
              c.toLowerCase().includes('dorsal') ||
              c.toLowerCase().includes('jugadora') ||
              c.toLowerCase().includes('pts') ||
              c.toLowerCase().includes('tla'))
        );

        if (isHeader) {
          startRowIdx = 1;
          headerRow.forEach((cell: any, idx: number) => {
            if (!cell) return;
            const norm = cell.toString().trim().toLowerCase();
            if (norm === 'equipo' || norm.includes('club') || norm.includes('team')) colMap['equipo'] = idx;
            else if (norm === 'fecha' || norm.includes('date')) colMap['fecha'] = idx;
            else if (norm === 'dorsal' || norm === '#' || norm === 'num' || norm === 'núm' || norm === 'no') colMap['dorsal'] = idx;
            else if (norm === 'jugadora' || norm === 'jugador' || norm === 'nombre' || norm === 'player') colMap['jugadora'] = idx;
            else if (norm === 'pj') colMap['pj'] = idx;
            else if (norm === 'min') colMap['min'] = idx;
            else if (norm === 'pts' || norm === 'puntos') colMap['pts'] = idx;
            else if (norm.includes('fc') || norm.includes('falta') || norm.includes('fc/p')) colMap['fc_p'] = idx;
            else if (norm === 'tla' || norm === 'tl_a') colMap['tla'] = idx;
            else if (norm === 'tli' || norm === 'tl_i') colMap['tli'] = idx;
            else if (norm === 't2a' || norm === 't2_a') colMap['t2a'] = idx;
            else if (norm === 't2i' || norm === 't2_i') colMap['t2i'] = idx;
            else if (norm === 't3a' || norm === 't3_a') colMap['t3a'] = idx;
            else if (norm === 't3i' || norm === 't3_i') colMap['t3i'] = idx;
          });
        }

        const getIdx = (key: string, fallback: number) => (colMap[key] !== undefined ? colMap[key] : fallback);

        const idxEquipo = getIdx('equipo', 0);
        const idxFecha = getIdx('fecha', 1);
        const idxDorsal = getIdx('dorsal', 2);
        const idxJugadora = getIdx('jugadora', 3);
        const idxPJ = getIdx('pj', 4);
        const idxMin = getIdx('min', 5);
        const idxPts = getIdx('pts', 6);
        const idxFC = getIdx('fc_p', 7);
        const idxTLA = getIdx('tla', 8);
        const idxTLI = getIdx('tli', 9);
        const idxT2A = getIdx('t2a', 10);
        const idxT2I = getIdx('t2i', 11);
        const idxT3A = getIdx('t3a', 12);
        const idxT3I = getIdx('t3i', 13);

        const newPlayers: PlayerStatsData[] = [];
        let detectedTeamName = '';

        for (let i = startRowIdx; i < rows.length; i++) {
          const r = rows[i];
          if (!r || r.length === 0) continue;

          const getVal = (idx: number) => (r[idx] !== undefined && r[idx] !== null ? r[idx].toString().trim() : '');
          const getNum = (idx: number) => {
            const raw = getVal(idx);
            if (!raw) return 0;
            const parsed = parseInt(raw.replace(/[^\d]/g, ''), 10);
            return isNaN(parsed) ? 0 : Math.max(0, parsed);
          };

          const dorsal = getVal(idxDorsal);
          const jugadora = getVal(idxJugadora);
          const equipo = getVal(idxEquipo) || (team === 'local' ? currentMatch.localTeam : currentMatch.visitorTeam) || 'Equipo';
          const fecha = getVal(idxFecha) || new Date().toISOString().split('T')[0];

          if (!jugadora && !dorsal) continue;
          if (jugadora.toLowerCase().includes('total') || jugadora.toLowerCase().includes('equipo')) continue;

          if (equipo && !detectedTeamName) {
            detectedTeamName = equipo;
          }

          const pj = getNum(idxPJ) || 1;
          const min = getNum(idxMin) || 0;
          const fc_p = getNum(idxFC) || 0;
          const tla = getNum(idxTLA) || 0;
          const tli = getNum(idxTLI) || tla;
          const t2a = getNum(idxT2A) || 0;
          const t2i = getNum(idxT2I) || t2a;
          const t3a = getNum(idxT3A) || 0;
          const t3i = getNum(idxT3I) || t3a;

          let pts = getNum(idxPts);
          if (pts === 0 && (tla > 0 || t2a > 0 || t3a > 0)) {
            pts = tla * 1 + t2a * 2 + t3a * 3;
          }

          newPlayers.push({
            id: `p_excel_${team}_${Date.now()}_${i}`,
            equipo,
            fecha,
            dorsal,
            jugadora: jugadora || `Jugadora #${dorsal}`,
            pj,
            min,
            pts,
            fc_p,
            tla,
            tli,
            t2a,
            t2i,
            t3a,
            t3i,
            team,
          });
        }

        if (newPlayers.length > 0) {
          const isLocal = team === 'local';

          setJornadaData((prev) => {
            const updatedMatches = [...prev.matches] as [MatchData, MatchData, MatchData];
            const match = { ...updatedMatches[activeMatchIndex] };

            if (isLocal) {
              match.localPlayers = newPlayers;
              if (detectedTeamName) match.localTeam = detectedTeamName;
            } else {
              match.visitorPlayers = newPlayers;
              if (detectedTeamName) match.visitorTeam = detectedTeamName;
            }

            updatedMatches[activeMatchIndex] = match;
            return { ...prev, matches: updatedMatches };
          });

          setFeedback(`¡Excel procesado con éxito! Se cargaron ${newPlayers.length} jugadoras con todas las estadísticas.`);
          setTimeout(() => setFeedback(null), 5000);
        } else {
          setFeedback('No se encontraron registros de jugadoras válidos en el archivo Excel.');
        }
      } catch (err) {
        console.error('Error al procesar Excel:', err);
        setFeedback('Error al leer el archivo Excel. Verifica que las columnas coincidan con el formato.');
      }
    };
    reader.readAsBinaryString(file);
  };

  // Descargar Plantilla Excel exacta con los 14 encabezados
  const handleDownloadTemplate = (teamName = 'Equipo') => {
    const wsData = [
      ['Equipo', 'fecha', 'Dorsal', 'Jugadora', 'PJ', 'MIN', 'PTS', 'FC/P', 'TLA', 'TLI', 'T2A', 'T2I', 'T3A', 'T3I'],
      [teamName, '2026-03-15', '4', 'Laura Gómez', 1, 28, 16, 2, 4, 5, 3, 6, 2, 4],
      [teamName, '2026-03-15', '7', 'Clara Puig', 1, 25, 14, 1, 2, 2, 3, 5, 2, 5],
      [teamName, '2026-03-15', '10', 'Marta Rius', 1, 30, 18, 3, 6, 7, 3, 8, 2, 3],
      [teamName, '2026-03-15', '12', 'Alba Soler', 1, 18, 9, 2, 1, 2, 4, 7, 0, 1],
      [teamName, '2026-03-15', '15', 'Núria Bosch', 1, 22, 11, 4, 3, 4, 4, 9, 0, 0],
    ];
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Plantilla Scouting');
    XLSX.writeFile(wb, `plantilla_scouting_${teamName.toLowerCase().replace(/\s+/g, '_')}.xlsx`);
  };

  // Cargar Ejemplo de Prueba Completo para este Partido
  const handleLoadSampleMatch = () => {
    const localName = currentMatch.localTeam || 'CB Sant Feliu';
    const visitorName = currentMatch.visitorTeam || 'CB Granollers';

    const sampleLocal: PlayerStatsData[] = [
      { id: 'l1', equipo: localName, fecha: '2026-03-15', dorsal: '4', jugadora: 'Laura Gómez', pj: 1, min: 28, pts: 18, fc_p: 2, tla: 4, tli: 5, t2a: 4, t2i: 7, t3a: 2, t3i: 4, team: 'local' },
      { id: 'l2', equipo: localName, fecha: '2026-03-15', dorsal: '7', jugadora: 'Clara Puig', pj: 1, min: 25, pts: 15, fc_p: 1, tla: 2, tli: 2, t2a: 2, t2i: 5, t3a: 3, t3i: 6, team: 'local' },
      { id: 'l3', equipo: localName, fecha: '2026-03-15', dorsal: '10', jugadora: 'Marta Rius', pj: 1, min: 32, pts: 19, fc_p: 3, tla: 6, tli: 8, t2a: 5, t2i: 9, t3a: 1, t3i: 2, team: 'local' },
      { id: 'l4', equipo: localName, fecha: '2026-03-15', dorsal: '12', jugadora: 'Alba Soler', pj: 1, min: 20, pts: 10, fc_p: 2, tla: 1, tli: 2, t2a: 3, t2i: 6, t3a: 1, t3i: 3, team: 'local' },
      { id: 'l5', equipo: localName, fecha: '2026-03-15', dorsal: '15', jugadora: 'Núria Bosch', pj: 1, min: 22, pts: 8, fc_p: 4, tla: 2, tli: 3, t2a: 3, t2i: 8, t3a: 0, t3i: 0, team: 'local' },
      { id: 'l6', equipo: localName, fecha: '2026-03-15', dorsal: '8', jugadora: 'Carla Vila', pj: 1, min: 14, pts: 5, fc_p: 0, tla: 0, tli: 0, t2a: 1, t2i: 3, t3a: 1, t3i: 2, team: 'local' },
    ];

    const sampleVisitor: PlayerStatsData[] = [
      { id: 'v1', equipo: visitorName, fecha: '2026-03-15', dorsal: '5', jugadora: 'Sara Morales', pj: 1, min: 30, pts: 21, fc_p: 3, tla: 5, tli: 6, t2a: 5, t2i: 10, t3a: 2, t3i: 5, team: 'visitante' },
      { id: 'v2', equipo: visitorName, fecha: '2026-03-15', dorsal: '9', jugadora: 'Elena Serra', pj: 1, min: 27, pts: 18, fc_p: 2, tla: 2, tli: 2, t2a: 2, t2i: 4, t3a: 4, t3i: 9, team: 'visitante' },
      { id: 'v3', equipo: visitorName, fecha: '2026-03-15', dorsal: '11', jugadora: 'Paula Font', pj: 1, min: 26, pts: 14, fc_p: 1, tla: 4, tli: 4, t2a: 5, t2i: 8, t3a: 0, t3i: 1, team: 'visitante' },
      { id: 'v4', equipo: visitorName, fecha: '2026-03-15', dorsal: '14', jugadora: 'Júlia Roca', pj: 1, min: 24, pts: 12, fc_p: 4, tla: 6, tli: 7, t2a: 3, t2i: 6, t3a: 0, t3i: 2, team: 'visitante' },
      { id: 'v5', equipo: visitorName, fecha: '2026-03-15', dorsal: '21', jugadora: 'Marina Cros', pj: 1, min: 19, pts: 11, fc_p: 2, tla: 1, tli: 2, t2a: 2, t2i: 4, t3a: 2, t3i: 5, team: 'visitante' },
      { id: 'v6', equipo: visitorName, fecha: '2026-03-15', dorsal: '6', jugadora: 'Berta Mas', pj: 1, min: 12, pts: 4, fc_p: 1, tla: 2, tli: 2, t2a: 1, t2i: 2, t3a: 0, t3i: 1, team: 'visitante' },
    ];

    setJornadaData((prev) => {
      const updatedMatches = [...prev.matches] as [MatchData, MatchData, MatchData];
      updatedMatches[activeMatchIndex] = {
        ...updatedMatches[activeMatchIndex],
        scoreLocal: '75',
        scoreVisitor: '80',
        localPlayers: sampleLocal,
        visitorPlayers: sampleVisitor,
      };
      return { ...prev, matches: updatedMatches };
    });
  };

  // Scraping automático de la URL del partido
  const handleScrapeMatch = async () => {
    const rawUrl = currentMatch.playByPlayUrl?.trim();
    if (!rawUrl) {
      setScrapeFeedback({
        type: 'error',
        text: 'Por favor, introduce primero la URL del partido para scrapear.',
      });
      return;
    }

    setIsScraping(true);
    setScrapeFeedback(null);

    try {
      const res = await fetch('/api/scrape-match', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: rawUrl }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'No se pudieron extraer datos del enlace.');
      }

      const scrapedPlayers = data.players || [];
      const localExtracted: PlayerStatsData[] = [];
      const visitorExtracted: PlayerStatsData[] = [];

      scrapedPlayers.forEach((sp: any) => {
        const item: PlayerStatsData = {
          id: sp.id || `p_${Date.now()}_${Math.random()}`,
          equipo: sp.team === 'local' ? (data.localTeam || currentMatch.localTeam) : (data.visitorTeam || currentMatch.visitorTeam),
          fecha: new Date().toISOString().split('T')[0],
          dorsal: sp.dorsal || '',
          jugadora: sp.name || 'Jugadora',
          pj: 1,
          min: 20,
          pts: sp.tl * 1 + sp.t2 * 2 + sp.t3 * 3,
          fc_p: 0,
          tla: sp.tl || 0,
          tli: sp.tl || 0,
          t2a: sp.t2 || 0,
          t2i: sp.t2 || 0,
          t3a: sp.t3 || 0,
          t3i: sp.t3 || 0,
          team: sp.team === 'local' ? 'local' : 'visitante',
        };

        if (sp.team === 'local') localExtracted.push(item);
        else visitorExtracted.push(item);
      });

      setJornadaData((prev) => {
        const updatedMatches = [...prev.matches] as [MatchData, MatchData, MatchData];
        updatedMatches[activeMatchIndex] = {
          ...updatedMatches[activeMatchIndex],
          localTeam: data.localTeam || updatedMatches[activeMatchIndex].localTeam,
          visitorTeam: data.visitorTeam || updatedMatches[activeMatchIndex].visitorTeam,
          scoreLocal: data.scoreLocal || updatedMatches[activeMatchIndex].scoreLocal,
          scoreVisitor: data.scoreVisitor || updatedMatches[activeMatchIndex].scoreVisitor,
          localPlayers: localExtracted.length > 0 ? localExtracted : updatedMatches[activeMatchIndex].localPlayers,
          visitorPlayers: visitorExtracted.length > 0 ? visitorExtracted : updatedMatches[activeMatchIndex].visitorPlayers,
        };
        return { ...prev, matches: updatedMatches };
      });

      setScrapeFeedback({
        type: 'success',
        text: `¡Scraping completado con éxito! Se cargaron ${scrapedPlayers.length} jugadoras.`,
      });
      setTimeout(() => setScrapeFeedback(null), 6000);
    } catch (err: any) {
      console.error(err);
      setScrapeFeedback({
        type: 'error',
        text: err.message || 'Error al procesar el scraping de la URL.',
      });
    } finally {
      setIsScraping(false);
    }
  };

  // CÁLCULOS DE SCOUTING PARA EQUIPO LOCAL
  const localAnalysis = useMemo(() => {
    const list = currentMatch.localPlayers.map((p) => ({
      ...p,
      pts: p.pts || (p.tla * 1 + p.t2a * 2 + p.t3a * 3),
      pctTL: p.tli > 0 ? Math.round((p.tla / p.tli) * 100) : null,
      pctT2: p.t2i > 0 ? Math.round((p.t2a / p.t2i) * 100) : null,
      pctT3: p.t3i > 0 ? Math.round((p.t3a / p.t3i) * 100) : null,
    }));

    const totalPTS = list.reduce((sum, p) => sum + p.pts, 0);
    const totalTLA = list.reduce((sum, p) => sum + p.tla, 0);
    const totalTLI = list.reduce((sum, p) => sum + p.tli, 0);
    const totalT2A = list.reduce((sum, p) => sum + p.t2a, 0);
    const totalT2I = list.reduce((sum, p) => sum + p.t2i, 0);
    const totalT3A = list.reduce((sum, p) => sum + p.t3a, 0);
    const totalT3I = list.reduce((sum, p) => sum + p.t3i, 0);

    return {
      players: list,
      totalPTS,
      totalTLA,
      totalTLI,
      totalT2A,
      totalT2I,
      totalT3A,
      totalT3I,
      topPTS: [...list].sort((a, b) => b.pts - a.pts).slice(0, 5),
      topTLA: [...list].sort((a, b) => b.tla - a.tla).slice(0, 5),
      topT2A: [...list].sort((a, b) => b.t2a - a.t2a).slice(0, 5),
      topT3A: [...list].sort((a, b) => b.t3a - a.t3a).slice(0, 5),
    };
  }, [currentMatch.localPlayers]);

  // CÁLCULOS DE SCOUTING PARA EQUIPO VISITANTE
  const visitorAnalysis = useMemo(() => {
    const list = currentMatch.visitorPlayers.map((p) => ({
      ...p,
      pts: p.pts || (p.tla * 1 + p.t2a * 2 + p.t3a * 3),
      pctTL: p.tli > 0 ? Math.round((p.tla / p.tli) * 100) : null,
      pctT2: p.t2i > 0 ? Math.round((p.t2a / p.t2i) * 100) : null,
      pctT3: p.t3i > 0 ? Math.round((p.t3a / p.t3i) * 100) : null,
    }));

    const totalPTS = list.reduce((sum, p) => sum + p.pts, 0);
    const totalTLA = list.reduce((sum, p) => sum + p.tla, 0);
    const totalTLI = list.reduce((sum, p) => sum + p.tli, 0);
    const totalT2A = list.reduce((sum, p) => sum + p.t2a, 0);
    const totalT2I = list.reduce((sum, p) => sum + p.t2i, 0);
    const totalT3A = list.reduce((sum, p) => sum + p.t3a, 0);
    const totalT3I = list.reduce((sum, p) => sum + p.t3i, 0);

    return {
      players: list,
      totalPTS,
      totalTLA,
      totalTLI,
      totalT2A,
      totalT2I,
      totalT3A,
      totalT3I,
      topPTS: [...list].sort((a, b) => b.pts - a.pts).slice(0, 5),
      topTLA: [...list].sort((a, b) => b.tla - a.tla).slice(0, 5),
      topT2A: [...list].sort((a, b) => b.t2a - a.t2a).slice(0, 5),
      topT3A: [...list].sort((a, b) => b.t3a - a.t3a).slice(0, 5),
    };
  }, [currentMatch.visitorPlayers]);

  // Manejador para descargar PDF del equipo seleccionado
  const handleDownloadPdf = (team: 'local' | 'visitante') => {
    const isLocal = team === 'local';
    const teamName = isLocal ? (currentMatch.localTeam || 'Equipo Local') : (currentMatch.visitorTeam || 'Equipo Visitante');
    const opponentName = isLocal ? (currentMatch.visitorTeam || 'Equipo Visitante') : (currentMatch.localTeam || 'Equipo Local');
    const playersList = isLocal ? currentMatch.localPlayers : currentMatch.visitorPlayers;

    if (playersList.length === 0) {
      alert(`No hay jugadoras cargadas para el ${teamName}. Añade o sube estadísticas antes de descargar el PDF.`);
      return;
    }

    generateTeamScoutingPdf({
      teamName,
      opponentName,
      isLocal,
      jornadaNumber: jornadaData.jornadaNumber,
      matchNumber: (activeMatchIndex + 1).toString(),
      scoreLocal: currentMatch.scoreLocal,
      scoreVisitor: currentMatch.scoreVisitor,
      players: playersList,
    });
  };

  // Helper para calcular cuántos equipos de una jornada tienen jugadoras cargadas
  const getJornadaStatsSummary = (jNum: number) => {
    const saved = localStorage.getItem(`coachmind_jornada_scouting_v3_${jNum}`);
    if (!saved) return { teamsWithData: 0, totalPlayers: 0 };
    try {
      const data: JornadaState = JSON.parse(saved);
      let teamsWithData = 0;
      let totalPlayers = 0;
      data.matches.forEach((m) => {
        if (m.localPlayers && m.localPlayers.length > 0) {
          teamsWithData++;
          totalPlayers += m.localPlayers.length;
        }
        if (m.visitorPlayers && m.visitorPlayers.length > 0) {
          teamsWithData++;
          totalPlayers += m.visitorPlayers.length;
        }
      });
      return { teamsWithData, totalPlayers };
    } catch {
      return { teamsWithData: 0, totalPlayers: 0 };
    }
  };

  // ==========================================
  // VISTA 1: LISTADO PRINCIPAL DE 14 JORNADAS
  // ==========================================
  if (selectedJornadaNum === null) {
    return (
      <div className="space-y-7 animate-fadeIn pb-16">
        {/* Banner Superior de Scouting de Liga */}
        <div className="bg-[#0B132B] text-white p-7 sm:p-9 rounded-3xl border border-slate-800 shadow-xl relative overflow-hidden">
          <div className="absolute right-0 top-0 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="relative z-10 max-w-3xl space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-xl bg-amber-500/20 border border-amber-500/30 text-amber-400 text-xs font-black tracking-wide uppercase">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Scouting de Liga Regular • 14 Jornadas</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
              Scouting por Jornada (6 Equipos + 1 Descansa)
            </h1>
            <p className="text-slate-300 text-sm leading-relaxed">
              Planifica y analiza el rendimiento de los <strong>6 equipos que juegan de forma independiente</strong> en cada una de las 14 jornadas de la temporada. Sube los archivos Excel con las estadísticas oficiales, visualiza el Top 5 ofensivo (TL, T2, T3, Puntos) y descarga informes individuales en PDF.
            </p>
          </div>
        </div>

        {/* Resumen Informativo de Estructura */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-200 text-blue-700 flex items-center justify-center font-black">
              <Calendar className="w-6 h-6" />
            </div>
            <div>
              <span className="text-xs font-bold text-slate-500 uppercase">Temporada Regular</span>
              <p className="text-base font-black text-slate-900">14 Jornadas Completas</p>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200 text-amber-700 flex items-center justify-center font-black">
              <Swords className="w-6 h-6" />
            </div>
            <div>
              <span className="text-xs font-bold text-slate-500 uppercase">Estructura por Jornada</span>
              <p className="text-base font-black text-slate-900">3 Partidos • 6 Equipos Activos</p>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-purple-50 border border-purple-200 text-purple-700 flex items-center justify-center font-black">
              <Coffee className="w-6 h-6" />
            </div>
            <div>
              <span className="text-xs font-bold text-slate-500 uppercase">Rotación de Descanso</span>
              <p className="text-base font-black text-slate-900">1 Equipo Descansa por Jornada</p>
            </div>
          </div>
        </div>

        {/* GRID DE LAS 14 JORNADAS */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              <span>Selecciona una Jornada para Escoutear</span>
            </h2>
            <span className="text-xs font-bold text-slate-500">
              14 Jornadas Disponibles
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5">
            {Array.from({ length: TOTAL_JORNADAS }, (_, i) => i + 1).map((jNum) => {
              const defaultInfo = generateDefaultJornada(jNum);
              const summary = getJornadaStatsSummary(jNum);
              const isSecondRound = jNum > 7;

              return (
                <div
                  key={jNum}
                  onClick={() => setSelectedJornadaNum(jNum)}
                  className="group bg-white rounded-3xl border border-slate-200/90 hover:border-amber-400 p-5 shadow-xs hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-pointer flex flex-col justify-between space-y-4 relative overflow-hidden"
                >
                  <div className="space-y-3">
                    {/* Cabecera de Tarjeta */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="w-10 h-10 rounded-2xl bg-[#0B132B] text-amber-400 font-black text-base flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform">
                          J{jNum}
                        </div>
                        <div>
                          <h3 className="font-black text-slate-900 text-base group-hover:text-amber-600 transition-colors">
                            Jornada {jNum}
                          </h3>
                          <span className="text-[10px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                            {isSecondRound ? 'Segunda Vuelta' : 'Primera Vuelta'}
                          </span>
                        </div>
                      </div>

                      {summary.teamsWithData > 0 ? (
                        <span className="px-2 py-1 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-[10px] font-black flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>{summary.teamsWithData}/6 Escouteados</span>
                        </span>
                      ) : (
                        <span className="px-2 py-1 rounded-xl bg-slate-100 text-slate-500 text-[10px] font-bold">
                          Sin datos
                        </span>
                      )}
                    </div>

                    {/* Partidos de la Jornada */}
                    <div className="space-y-1.5 pt-1">
                      {defaultInfo.matches.map((m, mIdx) => (
                        <div
                          key={m.id}
                          className="px-2.5 py-1.5 rounded-xl bg-slate-50 border border-slate-100 text-[11px] font-bold text-slate-700 flex items-center justify-between"
                        >
                          <span className="truncate max-w-[45%] text-slate-900">{m.localTeam}</span>
                          <span className="text-[10px] font-extrabold text-slate-400 uppercase">vs</span>
                          <span className="truncate max-w-[45%] text-slate-900 text-right">{m.visitorTeam}</span>
                        </div>
                      ))}
                    </div>

                    {/* Equipo que descansa */}
                    <div className="px-2.5 py-1.5 rounded-xl bg-purple-50/70 border border-purple-100 text-[11px] font-bold text-purple-900 flex items-center justify-between">
                      <span className="text-[10px] uppercase font-extrabold text-purple-600 flex items-center gap-1">
                        <Coffee className="w-3 h-3" /> Descansa:
                      </span>
                      <span className="truncate font-black">{defaultInfo.restingTeam}</span>
                    </div>
                  </div>

                  {/* Botón de acceso */}
                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs font-black text-slate-700 group-hover:text-amber-600">
                    <span>Abrir Espacio de Scouting</span>
                    <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // VISTA 2: ESPACIO DE TRABAJO DE LA JORNADA
  // ==========================================
  const activeMatchNum = activeMatchIndex + 1;

  return (
    <div className="space-y-6 animate-fadeIn pb-16">
      {/* Cabecera Principal de la Jornada */}
      <div className="bg-[#0B132B] text-white p-6 sm:p-7 rounded-3xl border border-slate-800 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <button
            type="button"
            onClick={() => setSelectedJornadaNum(null)}
            className="p-2.5 rounded-2xl bg-slate-800/90 hover:bg-slate-700 text-slate-200 hover:text-white transition-all cursor-pointer border border-slate-700 flex items-center justify-center shrink-0 shadow-xs"
            title="Volver al panel de las 14 Jornadas"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-lg bg-amber-500/20 text-amber-400 text-xs font-black uppercase tracking-wider">
                Jornada {selectedJornadaNum} de 14
              </span>
              <span className="px-2.5 py-0.5 rounded-lg bg-slate-800 text-slate-300 text-xs font-bold">
                3 Partidos • 6 Equipos
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight mt-0.5">
              Scouting de Jornada {selectedJornadaNum}
            </h1>
          </div>
        </div>

        {/* Selector rápido de Jornadas */}
        <div className="flex items-center gap-2">
          <label className="text-xs font-bold text-slate-400 hidden sm:inline">Cambiar Jornada:</label>
          <select
            value={selectedJornadaNum}
            onChange={(e) => setSelectedJornadaNum(Number(e.target.value))}
            className="px-3.5 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs font-black text-white focus:outline-none focus:ring-2 focus:ring-amber-500 cursor-pointer"
          >
            {Array.from({ length: TOTAL_JORNADAS }, (_, i) => i + 1).map((n) => (
              <option key={n} value={n}>
                Jornada {n}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={() => setSelectedJornadaNum(null)}
            className="text-xs font-bold text-slate-300 hover:text-white transition-colors cursor-pointer px-3 py-2 rounded-xl hover:bg-slate-800"
          >
            Ver todas las Jornadas
          </button>
        </div>
      </div>

      {/* BANNER DE LOS 3 PARTIDOS Y EQUIPO QUE DESCANSA */}
      <div className="bg-white rounded-3xl border border-slate-200 p-5 sm:p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <Swords className="w-5 h-5 text-amber-600" />
            <h2 className="text-base font-black text-slate-900">
              Partidos de la Jornada {selectedJornadaNum} & Equipo en Descanso
            </h2>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-500">Equipo que descansa:</span>
            <input
              type="text"
              value={jornadaData.restingTeam}
              onChange={(e) => handleUpdateRestingTeam(e.target.value)}
              placeholder="Nombre del equipo"
              className="px-3 py-1.5 text-xs font-black rounded-xl bg-purple-50 border border-purple-200 text-purple-900 focus:ring-2 focus:ring-purple-500 outline-none"
            />
          </div>
        </div>

        {/* SELECTOR DE PARTIDO ACTIVO (3 BOTONES / CARDS DE PARTIDOS) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
          {jornadaData.matches.map((m, idx) => {
            const isActive = activeMatchIndex === idx;
            const localCount = m.localPlayers.length;
            const visitorCount = m.visitorPlayers.length;
            const totalPlayers = localCount + visitorCount;

            return (
              <div
                key={m.id}
                onClick={() => setActiveMatchIndex(idx)}
                className={`p-4 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between space-y-3 ${
                  isActive
                    ? 'bg-slate-900 text-white border-slate-900 shadow-md ring-2 ring-amber-500/50'
                    : 'bg-slate-50 hover:bg-white text-slate-800 border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span
                    className={`text-[11px] font-black uppercase px-2 py-0.5 rounded-md ${
                      isActive ? 'bg-amber-500 text-slate-950' : 'bg-slate-200 text-slate-700'
                    }`}
                  >
                    Partido {idx + 1}
                  </span>

                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                      totalPlayers > 0
                        ? isActive
                          ? 'bg-emerald-500/20 text-emerald-400'
                          : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : isActive
                        ? 'text-slate-400'
                        : 'text-slate-500'
                    }`}
                  >
                    {totalPlayers > 0 ? `${totalPlayers} jugadoras` : 'Sin datos'}
                  </span>
                </div>

                <div className="text-center py-1">
                  <p className="font-black text-sm truncate">{m.localTeam || `Local ${idx + 1}`}</p>
                  <p className="text-[11px] font-extrabold text-amber-500 uppercase my-0.5">
                    {m.scoreLocal || m.scoreVisitor ? `${m.scoreLocal || '0'} - ${m.scoreVisitor || '0'}` : 'VS'}
                  </p>
                  <p className="font-black text-sm truncate">{m.visitorTeam || `Visitante ${idx + 1}`}</p>
                </div>

                <div className="pt-2 border-t border-slate-700/40 flex items-center justify-between text-[11px]">
                  <span className={isActive ? 'text-slate-300' : 'text-slate-500'}>
                    L: {localCount} | V: {visitorCount}
                  </span>
                  <span className={`font-black ${isActive ? 'text-amber-400' : 'text-slate-700'}`}>
                    {isActive ? '● Editando' : 'Seleccionar →'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* FORMULARIO Y MARCADOR DEL PARTIDO SELECCIONADO */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-7 shadow-sm space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-700 font-black">
              #{activeMatchNum}
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-900">
                Partido {activeMatchNum}: {currentMatch.localTeam} vs {currentMatch.visitorTeam}
              </h2>
              <p className="text-xs text-slate-500">
                Configura los equipos, marcador, enlace del acta o carga el scouting individual
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleLoadSampleMatch}
              className="text-xs font-bold px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer flex items-center gap-1.5 shadow-xs"
              title="Cargar ejemplo con estadísticas para este partido"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>Cargar Ejemplo Partido {activeMatchNum}</span>
            </button>
          </div>
        </div>

        {/* Nombres de equipos y marcador */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
          {/* Equipo Local */}
          <div className="md:col-span-5">
            <label className="text-[11px] font-black text-blue-700 uppercase block mb-1.5">
              Equipo Local (Partido {activeMatchNum})
            </label>
            <input
              type="text"
              value={currentMatch.localTeam}
              onChange={(e) => handleUpdateCurrentMatchInfo('localTeam', e.target.value)}
              placeholder="Ej. CB Sant Feliu"
              className="w-full px-3.5 py-2.5 text-sm font-bold rounded-xl bg-blue-50/40 border border-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all text-blue-950"
            />
          </div>

          {/* Marcador Final */}
          <div className="md:col-span-2 flex flex-col items-center justify-center">
            <span className="text-[10px] font-black text-slate-400 uppercase mb-1">
              Marcador Final
            </span>
            <div className="flex items-center gap-1.5 w-full justify-center">
              <input
                type="number"
                value={currentMatch.scoreLocal}
                onChange={(e) => handleUpdateCurrentMatchInfo('scoreLocal', e.target.value)}
                placeholder="0"
                className="w-14 px-2 py-2 text-base font-black rounded-xl bg-slate-100 border border-slate-300 text-center focus:ring-2 focus:ring-amber-500 outline-none"
              />
              <span className="font-black text-slate-400 text-sm">-</span>
              <input
                type="number"
                value={currentMatch.scoreVisitor}
                onChange={(e) => handleUpdateCurrentMatchInfo('scoreVisitor', e.target.value)}
                placeholder="0"
                className="w-14 px-2 py-2 text-base font-black rounded-xl bg-slate-100 border border-slate-300 text-center focus:ring-2 focus:ring-amber-500 outline-none"
              />
            </div>
          </div>

          {/* Equipo Visitante */}
          <div className="md:col-span-5">
            <label className="text-[11px] font-black text-purple-700 uppercase block mb-1.5">
              Equipo Visitante (Partido {activeMatchNum})
            </label>
            <input
              type="text"
              value={currentMatch.visitorTeam}
              onChange={(e) => handleUpdateCurrentMatchInfo('visitorTeam', e.target.value)}
              placeholder="Ej. CB Granollers"
              className="w-full px-3.5 py-2.5 text-sm font-bold rounded-xl bg-purple-50/40 border border-purple-200 focus:outline-none focus:ring-2 focus:ring-purple-500/30 focus:border-purple-500 transition-all text-purple-950"
            />
          </div>
        </div>

        {/* Extractor Scraping URL */}
        <div className="pt-3 border-t border-slate-100 space-y-2.5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <label className="text-[11px] font-black text-slate-700 uppercase flex items-center gap-1.5">
              <Globe className="w-3.5 h-3.5 text-amber-500" />
              <span>URL del Play-by-Play / Acta Digital (FCBQ / Federación)</span>
            </label>
            <span className="text-[10px] font-extrabold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md">
              Extractor Automático para Partido {activeMatchNum}
            </span>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <div className="relative flex-1">
              <input
                type="url"
                value={currentMatch.playByPlayUrl}
                onChange={(e) => handleUpdateCurrentMatchInfo('playByPlayUrl', e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleScrapeMatch();
                  }
                }}
                placeholder="https://www.basquetcatala.cat/partit/... (Pega la URL del partido)"
                className="w-full pl-9 pr-3.5 py-2.5 text-xs font-medium rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 transition-all text-slate-800"
              />
              <Link className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            </div>

            <button
              type="button"
              onClick={handleScrapeMatch}
              disabled={isScraping || !currentMatch.playByPlayUrl?.trim()}
              className={`inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black transition-all shadow-sm cursor-pointer ${
                isScraping
                  ? 'bg-amber-100 text-amber-800 border border-amber-300 cursor-wait'
                  : !currentMatch.playByPlayUrl?.trim()
                  ? 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed'
                  : 'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 shadow-amber-500/20 active:scale-[0.98]'
              }`}
            >
              {isScraping ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-amber-700" />
                  <span>Scrapeando...</span>
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4 text-slate-950" />
                  <span>Scrapear Partido {activeMatchNum}</span>
                </>
              )}
            </button>
          </div>

          {scrapeFeedback && (
            <div
              className={`p-3 rounded-xl border text-xs font-medium flex items-start gap-2 animate-fadeIn ${
                scrapeFeedback.type === 'success'
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                  : 'bg-rose-50 border-rose-200 text-rose-800'
              }`}
            >
              {scrapeFeedback.type === 'success' ? (
                <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              ) : (
                <Info className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              )}
              <p className="font-bold">{scrapeFeedback.text}</p>
            </div>
          )}
        </div>
      </div>

      {/* SUBIDAS DE EXCEL SEPARADAS PARA CADA EQUIPO DE ESTE PARTIDO */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* TARJETA EXCEL: EQUIPO LOCAL */}
        <div className="bg-white rounded-3xl border border-blue-200 p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-blue-100 pb-3">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-blue-600" />
              <h3 className="text-base font-black text-blue-950">
                Excel: {currentMatch.localTeam || 'Equipo Local'}
              </h3>
            </div>
            <span className="text-xs font-black text-blue-700 bg-blue-50 px-2.5 py-1 rounded-xl border border-blue-200">
              {currentMatch.localPlayers.length} Jugadoras
            </span>
          </div>

          <p className="text-xs text-slate-500">
            Columnas reconocidas: <span className="font-mono text-[11px] text-slate-700 font-bold">Equipo, fecha, Dorsal, Jugadora, PJ, MIN, PTS, FC/P, TLA, TLI, T2A, T2I, T3A, T3I</span>
          </p>

          <div className="flex flex-wrap items-center gap-2 pt-1">
            <input
              ref={localFileInputRef}
              type="file"
              accept=".xlsx, .xls, .csv"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) parseExcelTeamData(f, 'local', setLocalFeedback);
                e.target.value = '';
              }}
              className="hidden"
            />

            <button
              type="button"
              onClick={() => localFileInputRef.current?.click()}
              className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-black text-xs transition-all shadow-xs flex items-center gap-2 cursor-pointer"
            >
              <Upload className="w-4 h-4" />
              <span>Subir Excel ({currentMatch.localTeam || 'Local'})</span>
            </button>

            <button
              type="button"
              onClick={() => handleDownloadTemplate(currentMatch.localTeam || 'Local')}
              className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors flex items-center gap-1.5 cursor-pointer"
              title="Descargar plantilla Excel con los encabezados exactos"
            >
              <Download className="w-3.5 h-3.5 text-slate-500" />
              <span>Plantilla</span>
            </button>

            <button
              type="button"
              onClick={() => handleAddPlayer('local')}
              className="px-3 py-2 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-xs transition-colors flex items-center gap-1 cursor-pointer border border-blue-200"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ Fila manual</span>
            </button>
          </div>

          {localFeedback && (
            <div className="p-3 rounded-xl bg-blue-50 border border-blue-200 text-blue-900 text-xs font-bold flex items-center gap-2 animate-fadeIn">
              <Check className="w-4 h-4 text-blue-600 shrink-0" />
              <span>{localFeedback}</span>
            </div>
          )}
        </div>

        {/* TARJETA EXCEL: EQUIPO VISITANTE */}
        <div className="bg-white rounded-3xl border border-purple-200 p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-purple-100 pb-3">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-purple-600" />
              <h3 className="text-base font-black text-purple-950">
                Excel: {currentMatch.visitorTeam || 'Equipo Visitante'}
              </h3>
            </div>
            <span className="text-xs font-black text-purple-700 bg-purple-50 px-2.5 py-1 rounded-xl border border-purple-200">
              {currentMatch.visitorPlayers.length} Jugadoras
            </span>
          </div>

          <p className="text-xs text-slate-500">
            Columnas reconocidas: <span className="font-mono text-[11px] text-slate-700 font-bold">Equipo, fecha, Dorsal, Jugadora, PJ, MIN, PTS, FC/P, TLA, TLI, T2A, T2I, T3A, T3I</span>
          </p>

          <div className="flex flex-wrap items-center gap-2 pt-1">
            <input
              ref={visitorFileInputRef}
              type="file"
              accept=".xlsx, .xls, .csv"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) parseExcelTeamData(f, 'visitante', setVisitorFeedback);
                e.target.value = '';
              }}
              className="hidden"
            />

            <button
              type="button"
              onClick={() => visitorFileInputRef.current?.click()}
              className="px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-black text-xs transition-all shadow-xs flex items-center gap-2 cursor-pointer"
            >
              <Upload className="w-4 h-4" />
              <span>Subir Excel ({currentMatch.visitorTeam || 'Visitante'})</span>
            </button>

            <button
              type="button"
              onClick={() => handleDownloadTemplate(currentMatch.visitorTeam || 'Visitante')}
              className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors flex items-center gap-1.5 cursor-pointer"
              title="Descargar plantilla Excel con los encabezados exactos"
            >
              <Download className="w-3.5 h-3.5 text-slate-500" />
              <span>Plantilla</span>
            </button>

            <button
              type="button"
              onClick={() => handleAddPlayer('visitante')}
              className="px-3 py-2 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-700 font-bold text-xs transition-colors flex items-center gap-1 cursor-pointer border border-purple-200"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ Fila manual</span>
            </button>
          </div>

          {visitorFeedback && (
            <div className="p-3 rounded-xl bg-purple-50 border border-purple-200 text-purple-900 text-xs font-bold flex items-center gap-2 animate-fadeIn">
              <Check className="w-4 h-4 text-purple-600 shrink-0" />
              <span>{visitorFeedback}</span>
            </div>
          )}
        </div>
      </div>

      {/* TABS DE VISUALIZACIÓN DE LOS 2 EQUIPOS */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-2">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTeamView('both')}
            className={`px-3.5 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
              activeTeamView === 'both'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Ver Ambos Equipos
          </button>

          <button
            type="button"
            onClick={() => setActiveTeamView('local')}
            className={`px-3.5 py-2 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTeamView === 'local'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-blue-50 text-blue-700 hover:bg-blue-100'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-blue-400" />
            <span>{currentMatch.localTeam || 'Local'} ({currentMatch.localPlayers.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTeamView('visitor')}
            className={`px-3.5 py-2 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTeamView === 'visitor'
                ? 'bg-purple-600 text-white shadow-xs'
                : 'bg-purple-50 text-purple-700 hover:bg-purple-100'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-purple-400" />
            <span>{currentMatch.visitorTeam || 'Visitante'} ({currentMatch.visitorPlayers.length})</span>
          </button>
        </div>
      </div>

      {/* INFORMES DE SCOUTING Y TABLAS */}
      <div className="space-y-8">
        {/* INFORME EQUIPO LOCAL */}
        {(activeTeamView === 'both' || activeTeamView === 'local') && (
          <div className="bg-white rounded-3xl border border-blue-200 p-6 sm:p-7 shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-blue-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-700 font-black shrink-0">
                  <Shield className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-blue-950">
                    Scouting: {currentMatch.localTeam || 'Equipo Local'} (Jornada {selectedJornadaNum} • Partido {activeMatchNum})
                  </h3>
                  <p className="text-xs text-slate-500">
                    Análisis ofensivo personalizado (Top 5 TL, T2, T3, Puntos) y planilla completa
                  </p>
                </div>
              </div>

              {/* BOTÓN DESCARGA PDF LOCAL */}
              <button
                type="button"
                onClick={() => handleDownloadPdf('local')}
                disabled={currentMatch.localPlayers.length === 0}
                className={`px-4 py-2.5 rounded-xl font-black text-xs flex items-center gap-2 transition-all shadow-sm ${
                  currentMatch.localPlayers.length > 0
                    ? 'bg-blue-700 hover:bg-blue-600 text-white cursor-pointer active:scale-95'
                    : 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed'
                }`}
              >
                <FileDown className="w-4 h-4" />
                <span>Descargar PDF ({currentMatch.localTeam || 'Local'})</span>
              </button>
            </div>

            {currentMatch.localPlayers.length === 0 ? (
              <div className="text-center py-8 border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
                <p className="text-xs font-bold text-slate-500">
                  Sube el Excel o añade jugadoras para ver el informe y Top 5 de {currentMatch.localTeam || 'Local'}.
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* 4 Cards de Top 5 */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* Top 5 PTS */}
                  <div className="p-4 rounded-2xl bg-slate-900 text-white space-y-3 shadow-sm">
                    <span className="text-xs font-black uppercase text-amber-400 flex items-center gap-1.5">
                      <Trophy className="w-4 h-4" />
                      Top 5 Puntos (PTS)
                    </span>
                    <div className="space-y-1.5">
                      {localAnalysis.topPTS.map((p, idx) => (
                        <div key={p.id} className="flex items-center justify-between p-2 rounded-xl bg-slate-800 text-xs">
                          <span className="font-bold truncate">
                            {idx + 1}. {p.dorsal ? `#${p.dorsal} ` : ''}{p.jugadora}
                          </span>
                          <span className="font-black text-amber-400">{p.pts} pts</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Top 5 TLA */}
                  <div className="p-4 rounded-2xl bg-amber-50/80 border border-amber-200 space-y-3 shadow-sm">
                    <span className="text-xs font-black uppercase text-amber-900 flex items-center gap-1.5">
                      <Zap className="w-4 h-4 text-amber-600" />
                      Top 5 Tiros Libres (TLA)
                    </span>
                    <div className="space-y-1.5">
                      {localAnalysis.topTLA.map((p, idx) => (
                        <div key={p.id} className="flex items-center justify-between p-2 rounded-xl bg-white border border-amber-200 text-xs">
                          <span className="font-bold text-slate-800 truncate mr-2">
                            {idx + 1}. {p.dorsal ? `#${p.dorsal} ` : ''}{p.jugadora}
                          </span>
                          <span className="font-black text-amber-700 shrink-0">{p.tla}{p.tli ? `/${p.tli}` : ''}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Top 5 T2A */}
                  <div className="p-4 rounded-2xl bg-blue-50/80 border border-blue-200 space-y-3 shadow-sm">
                    <span className="text-xs font-black uppercase text-blue-900 flex items-center gap-1.5">
                      <BarChart3 className="w-4 h-4 text-blue-600" />
                      Top 5 Tiros de 2 (T2A)
                    </span>
                    <div className="space-y-1.5">
                      {localAnalysis.topT2A.map((p, idx) => (
                        <div key={p.id} className="flex items-center justify-between p-2 rounded-xl bg-white border border-blue-200 text-xs">
                          <span className="font-bold text-slate-800 truncate mr-2">
                            {idx + 1}. {p.dorsal ? `#${p.dorsal} ` : ''}{p.jugadora}
                          </span>
                          <span className="font-black text-blue-700 shrink-0">{p.t2a}{p.t2i ? `/${p.t2i}` : ''}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Top 5 T3A */}
                  <div className="p-4 rounded-2xl bg-rose-50/80 border border-rose-200 space-y-3 shadow-sm">
                    <span className="text-xs font-black uppercase text-rose-900 flex items-center gap-1.5">
                      <Flame className="w-4 h-4 text-rose-600" />
                      Top 5 Triples (T3A)
                    </span>
                    <div className="space-y-1.5">
                      {localAnalysis.topT3A.map((p, idx) => (
                        <div key={p.id} className="flex items-center justify-between p-2 rounded-xl bg-white border border-rose-200 text-xs">
                          <span className="font-bold text-slate-800 truncate mr-2">
                            {idx + 1}. {p.dorsal ? `#${p.dorsal} ` : ''}{p.jugadora}
                          </span>
                          <span className="font-black text-rose-700 shrink-0">{p.t3a}{p.t3i ? `/${p.t3i}` : ''}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Tabla Completa con Encabezados Exactos */}
                <div className="overflow-x-auto border border-slate-200 rounded-2xl">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead className="bg-slate-900 text-white font-black text-[11px] uppercase tracking-wider">
                      <tr>
                        <th className="py-2.5 px-3">Equipo</th>
                        <th className="py-2.5 px-3">Fecha</th>
                        <th className="py-2.5 px-2 text-center">Dorsal</th>
                        <th className="py-2.5 px-3">Jugadora</th>
                        <th className="py-2.5 px-2 text-center">PJ</th>
                        <th className="py-2.5 px-2 text-center">MIN</th>
                        <th className="py-2.5 px-2 text-center text-amber-400 font-black">PTS</th>
                        <th className="py-2.5 px-2 text-center">FC/P</th>
                        <th className="py-2.5 px-2 text-center">TLA</th>
                        <th className="py-2.5 px-2 text-center">TLI</th>
                        <th className="py-2.5 px-2 text-center">%TL</th>
                        <th className="py-2.5 px-2 text-center">T2A</th>
                        <th className="py-2.5 px-2 text-center">T2I</th>
                        <th className="py-2.5 px-2 text-center">%T2</th>
                        <th className="py-2.5 px-2 text-center">T3A</th>
                        <th className="py-2.5 px-2 text-center">T3I</th>
                        <th className="py-2.5 px-2 text-center">%T3</th>
                        <th className="py-2.5 px-2 text-center">Acción</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                      {localAnalysis.players.map((p) => (
                        <tr key={p.id} className="hover:bg-blue-50/30 transition-colors">
                          <td className="py-2 px-3 font-bold text-slate-900">{p.equipo}</td>
                          <td className="py-2 px-3 text-slate-500">{p.fecha}</td>
                          <td className="py-2 px-2 text-center font-bold">
                            <input
                              type="text"
                              value={p.dorsal}
                              onChange={(e) => handleUpdatePlayer('local', p.id, 'dorsal', e.target.value)}
                              className="w-10 text-center font-black bg-slate-100 rounded py-0.5"
                            />
                          </td>
                          <td className="py-2 px-3 font-bold text-slate-900">
                            <input
                              type="text"
                              value={p.jugadora}
                              onChange={(e) => handleUpdatePlayer('local', p.id, 'jugadora', e.target.value)}
                              className="w-full font-bold bg-transparent border-b border-transparent hover:border-slate-300 focus:border-blue-500 outline-none"
                            />
                          </td>
                          <td className="py-2 px-2 text-center">
                            <input
                              type="number"
                              value={p.pj}
                              onChange={(e) => handleUpdatePlayer('local', p.id, 'pj', e.target.value)}
                              className="w-10 text-center bg-slate-50 rounded py-0.5"
                            />
                          </td>
                          <td className="py-2 px-2 text-center">
                            <input
                              type="number"
                              value={p.min}
                              onChange={(e) => handleUpdatePlayer('local', p.id, 'min', e.target.value)}
                              className="w-12 text-center bg-slate-50 rounded py-0.5"
                            />
                          </td>
                          <td className="py-2 px-2 text-center font-black text-amber-700 bg-amber-50/50">
                            {p.pts}
                          </td>
                          <td className="py-2 px-2 text-center">
                            <input
                              type="number"
                              value={p.fc_p}
                              onChange={(e) => handleUpdatePlayer('local', p.id, 'fc_p', e.target.value)}
                              className="w-10 text-center bg-slate-50 rounded py-0.5"
                            />
                          </td>
                          <td className="py-2 px-2 text-center">
                            <input
                              type="number"
                              value={p.tla}
                              onChange={(e) => handleUpdatePlayer('local', p.id, 'tla', e.target.value)}
                              className="w-10 text-center bg-amber-50/50 font-bold rounded py-0.5"
                            />
                          </td>
                          <td className="py-2 px-2 text-center">
                            <input
                              type="number"
                              value={p.tli}
                              onChange={(e) => handleUpdatePlayer('local', p.id, 'tli', e.target.value)}
                              className="w-10 text-center bg-slate-50 rounded py-0.5"
                            />
                          </td>
                          <td className="py-2 px-2 text-center font-bold text-amber-700">
                            {p.pctTL !== null ? `${p.pctTL}%` : '-'}
                          </td>
                          <td className="py-2 px-2 text-center">
                            <input
                              type="number"
                              value={p.t2a}
                              onChange={(e) => handleUpdatePlayer('local', p.id, 't2a', e.target.value)}
                              className="w-10 text-center bg-blue-50/50 font-bold rounded py-0.5"
                            />
                          </td>
                          <td className="py-2 px-2 text-center">
                            <input
                              type="number"
                              value={p.t2i}
                              onChange={(e) => handleUpdatePlayer('local', p.id, 't2i', e.target.value)}
                              className="w-10 text-center bg-slate-50 rounded py-0.5"
                            />
                          </td>
                          <td className="py-2 px-2 text-center font-bold text-blue-700">
                            {p.pctT2 !== null ? `${p.pctT2}%` : '-'}
                          </td>
                          <td className="py-2 px-2 text-center">
                            <input
                              type="number"
                              value={p.t3a}
                              onChange={(e) => handleUpdatePlayer('local', p.id, 't3a', e.target.value)}
                              className="w-10 text-center bg-rose-50/50 font-bold rounded py-0.5"
                            />
                          </td>
                          <td className="py-2 px-2 text-center">
                            <input
                              type="number"
                              value={p.t3i}
                              onChange={(e) => handleUpdatePlayer('local', p.id, 't3i', e.target.value)}
                              className="w-10 text-center bg-slate-50 rounded py-0.5"
                            />
                          </td>
                          <td className="py-2 px-2 text-center font-bold text-rose-700">
                            {p.pctT3 !== null ? `${p.pctT3}%` : '-'}
                          </td>
                          <td className="py-2 px-2 text-center">
                            <button
                              type="button"
                              onClick={() => handleDeletePlayer('local', p.id)}
                              className="p-1 text-slate-400 hover:text-rose-600 transition-colors"
                              title="Eliminar fila"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-slate-100 font-black text-slate-900 text-xs">
                      <tr>
                        <td colSpan={6} className="py-2.5 px-3 text-right">
                          TOTALES EQUIPO LOCAL ({localAnalysis.players.length} Jugadoras):
                        </td>
                        <td className="py-2.5 px-2 text-center text-amber-700 bg-amber-100/50 font-black">
                          {localAnalysis.totalPTS}
                        </td>
                        <td className="py-2.5 px-2 text-center">-</td>
                        <td className="py-2.5 px-2 text-center">{localAnalysis.totalTLA}</td>
                        <td className="py-2.5 px-2 text-center">{localAnalysis.totalTLI}</td>
                        <td className="py-2.5 px-2 text-center">
                          {localAnalysis.totalTLI > 0 ? `${Math.round((localAnalysis.totalTLA / localAnalysis.totalTLI) * 100)}%` : '-'}
                        </td>
                        <td className="py-2.5 px-2 text-center">{localAnalysis.totalT2A}</td>
                        <td className="py-2.5 px-2 text-center">{localAnalysis.totalT2I}</td>
                        <td className="py-2.5 px-2 text-center">
                          {localAnalysis.totalT2I > 0 ? `${Math.round((localAnalysis.totalT2A / localAnalysis.totalT2I) * 100)}%` : '-'}
                        </td>
                        <td className="py-2.5 px-2 text-center">{localAnalysis.totalT3A}</td>
                        <td className="py-2.5 px-2 text-center">{localAnalysis.totalT3I}</td>
                        <td className="py-2.5 px-2 text-center">
                          {localAnalysis.totalT3I > 0 ? `${Math.round((localAnalysis.totalT3A / localAnalysis.totalT3I) * 100)}%` : '-'}
                        </td>
                        <td></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>

                {/* CONSULTOR TÁCTICO & TOMA DE DECISIONES IA (EQUIPO LOCAL) */}
                <ScoutingAiConsultant
                  teamName={currentMatch.localTeam || 'Equipo Local'}
                  teamRole="local"
                  jornadaNumber={selectedJornadaNum}
                  matchIndex={activeMatchIndex}
                  matchOpponent={currentMatch.visitorTeam || 'Equipo Visitante'}
                  players={currentMatch.localPlayers}
                  rivalPlayers={currentMatch.visitorPlayers}
                  coachPhilosophy={userProfile?.coachPhilosophy}
                />
              </div>
            )}
          </div>
        )}

        {/* INFORME EQUIPO VISITANTE */}
        {(activeTeamView === 'both' || activeTeamView === 'visitor') && (
          <div className="bg-white rounded-3xl border border-purple-200 p-6 sm:p-7 shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-purple-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-purple-50 border border-purple-200 flex items-center justify-center text-purple-700 font-black shrink-0">
                  <Shield className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-purple-950">
                    Scouting: {currentMatch.visitorTeam || 'Equipo Visitante'} (Jornada {selectedJornadaNum} • Partido {activeMatchNum})
                  </h3>
                  <p className="text-xs text-slate-500">
                    Análisis ofensivo personalizado (Top 5 TL, T2, T3, Puntos) y planilla completa
                  </p>
                </div>
              </div>

              {/* BOTÓN DESCARGA PDF VISITANTE */}
              <button
                type="button"
                onClick={() => handleDownloadPdf('visitante')}
                disabled={currentMatch.visitorPlayers.length === 0}
                className={`px-4 py-2.5 rounded-xl font-black text-xs flex items-center gap-2 transition-all shadow-sm ${
                  currentMatch.visitorPlayers.length > 0
                    ? 'bg-purple-700 hover:bg-purple-600 text-white cursor-pointer active:scale-95'
                    : 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed'
                }`}
              >
                <FileDown className="w-4 h-4" />
                <span>Descargar PDF ({currentMatch.visitorTeam || 'Visitante'})</span>
              </button>
            </div>

            {currentMatch.visitorPlayers.length === 0 ? (
              <div className="text-center py-8 border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
                <p className="text-xs font-bold text-slate-500">
                  Sube el Excel o añade jugadoras para ver el informe y Top 5 de {currentMatch.visitorTeam || 'Visitante'}.
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* 4 Cards de Top 5 */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* Top 5 PTS */}
                  <div className="p-4 rounded-2xl bg-slate-900 text-white space-y-3 shadow-sm">
                    <span className="text-xs font-black uppercase text-amber-400 flex items-center gap-1.5">
                      <Trophy className="w-4 h-4" />
                      Top 5 Puntos (PTS)
                    </span>
                    <div className="space-y-1.5">
                      {visitorAnalysis.topPTS.map((p, idx) => (
                        <div key={p.id} className="flex items-center justify-between p-2 rounded-xl bg-slate-800 text-xs">
                          <span className="font-bold truncate">
                            {idx + 1}. {p.dorsal ? `#${p.dorsal} ` : ''}{p.jugadora}
                          </span>
                          <span className="font-black text-amber-400">{p.pts} pts</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Top 5 TLA */}
                  <div className="p-4 rounded-2xl bg-amber-50/80 border border-amber-200 space-y-3 shadow-sm">
                    <span className="text-xs font-black uppercase text-amber-900 flex items-center gap-1.5">
                      <Zap className="w-4 h-4 text-amber-600" />
                      Top 5 Tiros Libres (TLA)
                    </span>
                    <div className="space-y-1.5">
                      {visitorAnalysis.topTLA.map((p, idx) => (
                        <div key={p.id} className="flex items-center justify-between p-2 rounded-xl bg-white border border-amber-200 text-xs">
                          <span className="font-bold text-slate-800 truncate mr-2">
                            {idx + 1}. {p.dorsal ? `#${p.dorsal} ` : ''}{p.jugadora}
                          </span>
                          <span className="font-black text-amber-700 shrink-0">{p.tla}{p.tli ? `/${p.tli}` : ''}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Top 5 T2A */}
                  <div className="p-4 rounded-2xl bg-purple-50/80 border border-purple-200 space-y-3 shadow-sm">
                    <span className="text-xs font-black uppercase text-purple-900 flex items-center gap-1.5">
                      <BarChart3 className="w-4 h-4 text-purple-600" />
                      Top 5 Tiros de 2 (T2A)
                    </span>
                    <div className="space-y-1.5">
                      {visitorAnalysis.topT2A.map((p, idx) => (
                        <div key={p.id} className="flex items-center justify-between p-2 rounded-xl bg-white border border-purple-200 text-xs">
                          <span className="font-bold text-slate-800 truncate mr-2">
                            {idx + 1}. {p.dorsal ? `#${p.dorsal} ` : ''}{p.jugadora}
                          </span>
                          <span className="font-black text-purple-700 shrink-0">{p.t2a}{p.t2i ? `/${p.t2i}` : ''}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Top 5 T3A */}
                  <div className="p-4 rounded-2xl bg-rose-50/80 border border-rose-200 space-y-3 shadow-sm">
                    <span className="text-xs font-black uppercase text-rose-900 flex items-center gap-1.5">
                      <Flame className="w-4 h-4 text-rose-600" />
                      Top 5 Triples (T3A)
                    </span>
                    <div className="space-y-1.5">
                      {visitorAnalysis.topT3A.map((p, idx) => (
                        <div key={p.id} className="flex items-center justify-between p-2 rounded-xl bg-white border border-rose-200 text-xs">
                          <span className="font-bold text-slate-800 truncate mr-2">
                            {idx + 1}. {p.dorsal ? `#${p.dorsal} ` : ''}{p.jugadora}
                          </span>
                          <span className="font-black text-rose-700 shrink-0">{p.t3a}{p.t3i ? `/${p.t3i}` : ''}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Tabla Completa Visitante */}
                <div className="overflow-x-auto border border-slate-200 rounded-2xl">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead className="bg-slate-900 text-white font-black text-[11px] uppercase tracking-wider">
                      <tr>
                        <th className="py-2.5 px-3">Equipo</th>
                        <th className="py-2.5 px-3">Fecha</th>
                        <th className="py-2.5 px-2 text-center">Dorsal</th>
                        <th className="py-2.5 px-3">Jugadora</th>
                        <th className="py-2.5 px-2 text-center">PJ</th>
                        <th className="py-2.5 px-2 text-center">MIN</th>
                        <th className="py-2.5 px-2 text-center text-amber-400 font-black">PTS</th>
                        <th className="py-2.5 px-2 text-center">FC/P</th>
                        <th className="py-2.5 px-2 text-center">TLA</th>
                        <th className="py-2.5 px-2 text-center">TLI</th>
                        <th className="py-2.5 px-2 text-center">%TL</th>
                        <th className="py-2.5 px-2 text-center">T2A</th>
                        <th className="py-2.5 px-2 text-center">T2I</th>
                        <th className="py-2.5 px-2 text-center">%T2</th>
                        <th className="py-2.5 px-2 text-center">T3A</th>
                        <th className="py-2.5 px-2 text-center">T3I</th>
                        <th className="py-2.5 px-2 text-center">%T3</th>
                        <th className="py-2.5 px-2 text-center">Acción</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                      {visitorAnalysis.players.map((p) => (
                        <tr key={p.id} className="hover:bg-purple-50/30 transition-colors">
                          <td className="py-2 px-3 font-bold text-slate-900">{p.equipo}</td>
                          <td className="py-2 px-3 text-slate-500">{p.fecha}</td>
                          <td className="py-2 px-2 text-center font-bold">
                            <input
                              type="text"
                              value={p.dorsal}
                              onChange={(e) => handleUpdatePlayer('visitante', p.id, 'dorsal', e.target.value)}
                              className="w-10 text-center font-black bg-slate-100 rounded py-0.5"
                            />
                          </td>
                          <td className="py-2 px-3 font-bold text-slate-900">
                            <input
                              type="text"
                              value={p.jugadora}
                              onChange={(e) => handleUpdatePlayer('visitante', p.id, 'jugadora', e.target.value)}
                              className="w-full font-bold bg-transparent border-b border-transparent hover:border-slate-300 focus:border-purple-500 outline-none"
                            />
                          </td>
                          <td className="py-2 px-2 text-center">
                            <input
                              type="number"
                              value={p.pj}
                              onChange={(e) => handleUpdatePlayer('visitante', p.id, 'pj', e.target.value)}
                              className="w-10 text-center bg-slate-50 rounded py-0.5"
                            />
                          </td>
                          <td className="py-2 px-2 text-center">
                            <input
                              type="number"
                              value={p.min}
                              onChange={(e) => handleUpdatePlayer('visitante', p.id, 'min', e.target.value)}
                              className="w-12 text-center bg-slate-50 rounded py-0.5"
                            />
                          </td>
                          <td className="py-2 px-2 text-center font-black text-amber-700 bg-amber-50/50">
                            {p.pts}
                          </td>
                          <td className="py-2 px-2 text-center">
                            <input
                              type="number"
                              value={p.fc_p}
                              onChange={(e) => handleUpdatePlayer('visitante', p.id, 'fc_p', e.target.value)}
                              className="w-10 text-center bg-slate-50 rounded py-0.5"
                            />
                          </td>
                          <td className="py-2 px-2 text-center">
                            <input
                              type="number"
                              value={p.tla}
                              onChange={(e) => handleUpdatePlayer('visitante', p.id, 'tla', e.target.value)}
                              className="w-10 text-center bg-amber-50/50 font-bold rounded py-0.5"
                            />
                          </td>
                          <td className="py-2 px-2 text-center">
                            <input
                              type="number"
                              value={p.tli}
                              onChange={(e) => handleUpdatePlayer('visitante', p.id, 'tli', e.target.value)}
                              className="w-10 text-center bg-slate-50 rounded py-0.5"
                            />
                          </td>
                          <td className="py-2 px-2 text-center font-bold text-amber-700">
                            {p.pctTL !== null ? `${p.pctTL}%` : '-'}
                          </td>
                          <td className="py-2 px-2 text-center">
                            <input
                              type="number"
                              value={p.t2a}
                              onChange={(e) => handleUpdatePlayer('visitante', p.id, 't2a', e.target.value)}
                              className="w-10 text-center bg-purple-50/50 font-bold rounded py-0.5"
                            />
                          </td>
                          <td className="py-2 px-2 text-center">
                            <input
                              type="number"
                              value={p.t2i}
                              onChange={(e) => handleUpdatePlayer('visitante', p.id, 't2i', e.target.value)}
                              className="w-10 text-center bg-slate-50 rounded py-0.5"
                            />
                          </td>
                          <td className="py-2 px-2 text-center font-bold text-purple-700">
                            {p.pctT2 !== null ? `${p.pctT2}%` : '-'}
                          </td>
                          <td className="py-2 px-2 text-center">
                            <input
                              type="number"
                              value={p.t3a}
                              onChange={(e) => handleUpdatePlayer('visitante', p.id, 't3a', e.target.value)}
                              className="w-10 text-center bg-rose-50/50 font-bold rounded py-0.5"
                            />
                          </td>
                          <td className="py-2 px-2 text-center">
                            <input
                              type="number"
                              value={p.t3i}
                              onChange={(e) => handleUpdatePlayer('visitante', p.id, 't3i', e.target.value)}
                              className="w-10 text-center bg-slate-50 rounded py-0.5"
                            />
                          </td>
                          <td className="py-2 px-2 text-center font-bold text-rose-700">
                            {p.pctT3 !== null ? `${p.pctT3}%` : '-'}
                          </td>
                          <td className="py-2 px-2 text-center">
                            <button
                              type="button"
                              onClick={() => handleDeletePlayer('visitante', p.id)}
                              className="p-1 text-slate-400 hover:text-rose-600 transition-colors"
                              title="Eliminar fila"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-slate-100 font-black text-slate-900 text-xs">
                      <tr>
                        <td colSpan={6} className="py-2.5 px-3 text-right">
                          TOTALES EQUIPO VISITANTE ({visitorAnalysis.players.length} Jugadoras):
                        </td>
                        <td className="py-2.5 px-2 text-center text-amber-700 bg-amber-100/50 font-black">
                          {visitorAnalysis.totalPTS}
                        </td>
                        <td className="py-2.5 px-2 text-center">-</td>
                        <td className="py-2.5 px-2 text-center">{visitorAnalysis.totalTLA}</td>
                        <td className="py-2.5 px-2 text-center">{visitorAnalysis.totalTLI}</td>
                        <td className="py-2.5 px-2 text-center">
                          {visitorAnalysis.totalTLI > 0 ? `${Math.round((visitorAnalysis.totalTLA / visitorAnalysis.totalTLI) * 100)}%` : '-'}
                        </td>
                        <td className="py-2.5 px-2 text-center">{visitorAnalysis.totalT2A}</td>
                        <td className="py-2.5 px-2 text-center">{visitorAnalysis.totalT2I}</td>
                        <td className="py-2.5 px-2 text-center">
                          {visitorAnalysis.totalT2I > 0 ? `${Math.round((visitorAnalysis.totalT2A / visitorAnalysis.totalT2I) * 100)}%` : '-'}
                        </td>
                        <td className="py-2.5 px-2 text-center">{visitorAnalysis.totalT3A}</td>
                        <td className="py-2.5 px-2 text-center">{visitorAnalysis.totalT3I}</td>
                        <td className="py-2.5 px-2 text-center">
                          {visitorAnalysis.totalT3I > 0 ? `${Math.round((visitorAnalysis.totalT3A / visitorAnalysis.totalT3I) * 100)}%` : '-'}
                        </td>
                        <td></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>

                {/* CONSULTOR TÁCTICO & TOMA DE DECISIONES IA (EQUIPO VISITANTE) */}
                <ScoutingAiConsultant
                  teamName={currentMatch.visitorTeam || 'Equipo Visitante'}
                  teamRole="visitante"
                  jornadaNumber={selectedJornadaNum}
                  matchIndex={activeMatchIndex}
                  matchOpponent={currentMatch.localTeam || 'Equipo Local'}
                  players={currentMatch.visitorPlayers}
                  rivalPlayers={currentMatch.localPlayers}
                  coachPhilosophy={userProfile?.coachPhilosophy}
                />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
