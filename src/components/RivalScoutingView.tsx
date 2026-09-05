import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Target,
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
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { UserProfile } from '../types';
import {
  PlayerStatsData,
  generateTeamScoutingPdf,
} from '../utils/scoutingPdfGenerator';

interface RivalScoutingViewProps {
  userProfile?: UserProfile | null;
}

export interface MatchScoutingState {
  matchNumber: string;
  localTeam: string;
  visitorTeam: string;
  scoreLocal: string;
  scoreVisitor: string;
  playByPlayUrl: string;
  localPlayers: PlayerStatsData[];
  visitorPlayers: PlayerStatsData[];
}

const RIVALS_LIST = [
  { id: 1, name: 'Rival 1' },
  { id: 2, name: 'Rival 2' },
  { id: 3, name: 'Rival 3' },
  { id: 4, name: 'Rival 4' },
  { id: 5, name: 'Rival 5' },
  { id: 6, name: 'Rival 6' },
  { id: 7, name: 'Rival 7' },
  { id: 8, name: 'Rival 8' },
];

const getInitialMatchData = (rivalName: string, leg: 'ida' | 'vuelta'): MatchScoutingState => {
  return {
    matchNumber: '1',
    localTeam: leg === 'ida' ? 'Mi Equipo' : rivalName,
    visitorTeam: leg === 'ida' ? rivalName : 'Mi Equipo',
    scoreLocal: '',
    scoreVisitor: '',
    playByPlayUrl: '',
    localPlayers: [],
    visitorPlayers: [],
  };
};

export const RivalScoutingView: React.FC<RivalScoutingViewProps> = () => {
  const [selectedRivalId, setSelectedRivalId] = useState<number | null>(null);
  const [selectedMatchLeg, setSelectedMatchLeg] = useState<'ida' | 'vuelta' | null>(null);

  const selectedRival = RIVALS_LIST.find((r) => r.id === selectedRivalId);

  // Clave única para guardar por rival y por partido (ida / vuelta)
  const storageKey =
    selectedRival && selectedMatchLeg
      ? `coachmind_rival_scouting_v2_${selectedRival.id}_${selectedMatchLeg}`
      : null;

  const [matchData, setMatchData] = useState<MatchScoutingState>(() => {
    return {
      matchNumber: '1',
      localTeam: 'Mi Equipo',
      visitorTeam: 'Rival',
      scoreLocal: '',
      scoreVisitor: '',
      playByPlayUrl: '',
      localPlayers: [],
      visitorPlayers: [],
    };
  });

  const [localFeedback, setLocalFeedback] = useState<string | null>(null);
  const [visitorFeedback, setVisitorFeedback] = useState<string | null>(null);
  const [isScraping, setIsScraping] = useState<boolean>(false);
  const [scrapeFeedback, setScrapeFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const localFileInputRef = useRef<HTMLInputElement>(null);
  const visitorFileInputRef = useRef<HTMLInputElement>(null);

  // Cargar datos guardados cuando cambia el rival o el partido seleccionado
  useEffect(() => {
    if (!storageKey || !selectedRival || !selectedMatchLeg) return;
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setMatchData(parsed);
      } catch (e) {
        console.error('Error cargando scouting del partido:', e);
        setMatchData(getInitialMatchData(selectedRival.name, selectedMatchLeg));
      }
    } else {
      setMatchData(getInitialMatchData(selectedRival.name, selectedMatchLeg));
    }
  }, [storageKey, selectedRival, selectedMatchLeg]);

  // Guardar datos automáticamente
  useEffect(() => {
    if (!storageKey) return;
    localStorage.setItem(storageKey, JSON.stringify(matchData));
  }, [matchData, storageKey]);

  // Manejadores para el formulario de partido
  const handleMatchInfoChange = (
    field: keyof Omit<MatchScoutingState, 'localPlayers' | 'visitorPlayers'>,
    value: string
  ) => {
    setMatchData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  // Añadir una jugadora manual
  const handleAddPlayer = (team: 'local' | 'visitante') => {
    const defaultTeamName = team === 'local' ? (matchData.localTeam || 'Local') : (matchData.visitorTeam || 'Visitante');
    const today = new Date().toISOString().split('T')[0];

    const newPlayer: PlayerStatsData = {
      id: `p_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      equipo: defaultTeamName,
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

    if (team === 'local') {
      setMatchData((prev) => ({
        ...prev,
        localPlayers: [...prev.localPlayers, newPlayer],
      }));
    } else {
      setMatchData((prev) => ({
        ...prev,
        visitorPlayers: [...prev.visitorPlayers, newPlayer],
      }));
    }
  };

  // Actualizar estadísticas de una jugadora
  const handleUpdatePlayer = (
    team: 'local' | 'visitante',
    id: string,
    field: keyof PlayerStatsData,
    value: string | number
  ) => {
    const isLocal = team === 'local';
    const targetArrayKey = isLocal ? 'localPlayers' : 'visitorPlayers';

    setMatchData((prev) => ({
      ...prev,
      [targetArrayKey]: prev[targetArrayKey].map((p) => {
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

          // Si se edita TLA, T2A o T3A y no se forzó PTS directamente, auto-calcular PTS
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
      }),
    }));
  };

  // Eliminar jugadora
  const handleDeletePlayer = (team: 'local' | 'visitante', id: string) => {
    if (team === 'local') {
      setMatchData((prev) => ({
        ...prev,
        localPlayers: prev.localPlayers.filter((p) => p.id !== id),
      }));
    } else {
      setMatchData((prev) => ({
        ...prev,
        visitorPlayers: prev.visitorPlayers.filter((p) => p.id !== id),
      }));
    }
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

        // 1. Detectar cabecera exacta de la imagen
        // Normalizar nombres de columnas
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

        // Si no se encontraron por nombre, usar el orden canónico de la imagen:
        // 0: Equipo, 1: fecha, 2: Dorsal, 3: Jugadora, 4: PJ, 5: MIN, 6: PTS, 7: FC/P, 8: TLA, 9: TLI, 10: T2A, 11: T2I, 12: T3A, 13: T3I
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
          const equipo = getVal(idxEquipo) || (team === 'local' ? matchData.localTeam : matchData.visitorTeam) || 'Equipo';
          const fecha = getVal(idxFecha) || new Date().toISOString().split('T')[0];

          // Filtrar filas vacías o de totales
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
          const targetKey = team === 'local' ? 'localPlayers' : 'visitorPlayers';
          const teamNameKey = team === 'local' ? 'localTeam' : 'visitorTeam';

          setMatchData((prev) => ({
            ...prev,
            [targetKey]: newPlayers,
            [teamNameKey]: detectedTeamName || prev[teamNameKey],
          }));

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

  // Descargar Plantilla Excel exacta con los encabezados de la imagen
  const handleDownloadTemplate = (teamName = 'Equipo') => {
    const wsData = [
      // Encabezados exactos: Equipo | fecha | Dorsal | Jugadora | PJ | MIN | PTS | FC/P | TLA | TLI | T2A | T2I | T3A | T3I
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

  // Cargar Ejemplo Completo para ambos equipos
  const handleLoadSampleStats = () => {
    const localName = matchData.localTeam || 'CB Sant Feliu';
    const visitorName = matchData.visitorTeam || (selectedRival?.name ?? 'Rival');

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

    setMatchData((prev) => ({
      ...prev,
      localTeam: localName,
      visitorTeam: visitorName,
      scoreLocal: '75',
      scoreVisitor: '80',
      localPlayers: sampleLocal,
      visitorPlayers: sampleVisitor,
    }));
  };

  // Función de Scraping desde URL
  const handleScrapeMatch = async () => {
    const rawUrl = matchData.playByPlayUrl?.trim();
    if (!rawUrl) {
      setScrapeFeedback({
        type: 'error',
        text: 'Por favor, introduce o pega primero la URL del partido antes de scrapear.',
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

      // Mapear jugadoras extraídas al formato unificado
      const scrapedPlayers = data.players || [];
      const localExtracted: PlayerStatsData[] = [];
      const visitorExtracted: PlayerStatsData[] = [];

      scrapedPlayers.forEach((sp: any) => {
        const item: PlayerStatsData = {
          id: sp.id || `p_${Date.now()}_${Math.random()}`,
          equipo: sp.team === 'local' ? (data.localTeam || matchData.localTeam) : (data.visitorTeam || matchData.visitorTeam),
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

      setMatchData((prev) => ({
        ...prev,
        matchNumber: data.matchNumber || prev.matchNumber,
        localTeam: data.localTeam || prev.localTeam,
        visitorTeam: data.visitorTeam || prev.visitorTeam,
        scoreLocal: data.scoreLocal || prev.scoreLocal,
        scoreVisitor: data.scoreVisitor || prev.scoreVisitor,
        localPlayers: localExtracted.length > 0 ? localExtracted : prev.localPlayers,
        visitorPlayers: visitorExtracted.length > 0 ? visitorExtracted : prev.visitorPlayers,
      }));

      setScrapeFeedback({
        type: 'success',
        text: `¡Scraping completado! Se han cargado ${scrapedPlayers.length} jugadoras en total.`,
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

  // CÁLCULOS DE SCOUTING INDIVIDUALIZADOS POR EQUIPO
  const localAnalysis = useMemo(() => {
    const list = matchData.localPlayers.map((p) => ({
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
  }, [matchData.localPlayers]);

  const visitorAnalysis = useMemo(() => {
    const list = matchData.visitorPlayers.map((p) => ({
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
  }, [matchData.visitorPlayers]);

  // Manejador para descargar PDF de cada equipo
  const handleDownloadPdf = (team: 'local' | 'visitante') => {
    const isLocal = team === 'local';
    const teamName = isLocal ? (matchData.localTeam || 'Equipo Local') : (matchData.visitorTeam || 'Equipo Visitante');
    const opponentName = isLocal ? (matchData.visitorTeam || 'Equipo Visitante') : (matchData.localTeam || 'Equipo Local');
    const playersList = isLocal ? matchData.localPlayers : matchData.visitorPlayers;

    if (playersList.length === 0) {
      alert(`No hay jugadoras cargadas para el ${teamName}. Añade o sube estadísticas antes de descargar el PDF.`);
      return;
    }

    generateTeamScoutingPdf({
      teamName,
      opponentName,
      isLocal,
      matchLeg: selectedMatchLeg || 'ida',
      matchNumber: matchData.matchNumber || '1',
      scoreLocal: matchData.scoreLocal,
      scoreVisitor: matchData.scoreVisitor,
      players: playersList,
    });
  };

  // ==========================================
  // NIVEL 3: VISTA DE PARTIDO (IDA / VUELTA)
  // ==========================================
  if (selectedRival && selectedMatchLeg) {
    const legTitle = selectedMatchLeg === 'ida' ? 'Partido de Ida' : 'Partido de Vuelta';
    const legBadge = selectedMatchLeg === 'ida' ? 'Ida' : 'Vuelta';
    const badgeColor =
      selectedMatchLeg === 'ida'
        ? 'bg-blue-50 border-blue-200 text-blue-700'
        : 'bg-purple-50 border-purple-200 text-purple-700';

    return (
      <div className="space-y-6 animate-fadeIn pb-16">
        {/* Cabecera Principal */}
        <div className="bg-[#0B132B] text-white p-6 sm:p-7 rounded-3xl border border-slate-800 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <button
              type="button"
              onClick={() => setSelectedMatchLeg(null)}
              className="p-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-200 hover:text-white transition-all cursor-pointer border border-slate-700 flex items-center justify-center shrink-0"
              title="Volver a los partidos"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>

            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-400 text-[11px] font-black uppercase">
                  {selectedRival.name}
                </span>
                <span className={`px-2 py-0.5 rounded-md border text-[11px] font-black uppercase ${badgeColor}`}>
                  {legBadge}
                </span>
              </div>
              <h1 className="text-2xl font-black text-white tracking-tight mt-0.5">
                Scouting • {legTitle}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setSelectedMatchLeg(null)}
              className="text-xs font-bold text-slate-400 hover:text-white transition-colors cursor-pointer px-3 py-1.5 rounded-lg hover:bg-slate-800"
            >
              ← Volver a partidos (Ida / Vuelta)
            </button>
          </div>
        </div>

        {/* 1. FORMULARIO PRINCIPAL DEL PARTIDO & MARCADOR */}
        <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-7 shadow-sm space-y-5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-700 font-black text-xs">
                #
              </div>
              <h2 className="text-base sm:text-lg font-black text-slate-900">
                Datos del Partido & Marcador
              </h2>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleLoadSampleStats}
                className="text-xs font-bold px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer flex items-center gap-1.5 shadow-xs"
                title="Cargar ejemplo con estadísticas para ambos equipos"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                <span>Cargar Ejemplo Completo</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
            {/* Partido # */}
            <div className="md:col-span-2">
              <label className="text-[11px] font-black text-slate-600 uppercase block mb-1.5">
                Partido #
              </label>
              <input
                type="text"
                value={matchData.matchNumber}
                onChange={(e) => handleMatchInfoChange('matchNumber', e.target.value)}
                placeholder="1"
                className="w-full px-3.5 py-2.5 text-sm font-bold rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 transition-all text-center"
              />
            </div>

            {/* Equipo Local */}
            <div className="md:col-span-4">
              <label className="text-[11px] font-black text-blue-700 uppercase block mb-1.5">
                Equipo Local
              </label>
              <input
                type="text"
                value={matchData.localTeam}
                onChange={(e) => handleMatchInfoChange('localTeam', e.target.value)}
                placeholder="Ej. CB Sant Feliu"
                className="w-full px-3.5 py-2.5 text-sm font-bold rounded-xl bg-blue-50/40 border border-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all text-blue-950"
              />
            </div>

            {/* VS & Conteo Marcador */}
            <div className="md:col-span-2 flex flex-col items-center justify-center">
              <span className="text-[10px] font-black text-slate-400 uppercase mb-1">
                Marcador Final
              </span>
              <div className="flex items-center gap-1.5 w-full justify-center">
                <input
                  type="number"
                  value={matchData.scoreLocal}
                  onChange={(e) => handleMatchInfoChange('scoreLocal', e.target.value)}
                  placeholder="0"
                  className="w-14 px-2 py-2 text-base font-black rounded-xl bg-slate-100 border border-slate-300 text-center focus:ring-2 focus:ring-amber-500 outline-none"
                />
                <span className="font-black text-slate-400 text-sm">-</span>
                <input
                  type="number"
                  value={matchData.scoreVisitor}
                  onChange={(e) => handleMatchInfoChange('scoreVisitor', e.target.value)}
                  placeholder="0"
                  className="w-14 px-2 py-2 text-base font-black rounded-xl bg-slate-100 border border-slate-300 text-center focus:ring-2 focus:ring-amber-500 outline-none"
                />
              </div>
            </div>

            {/* Equipo Visitante */}
            <div className="md:col-span-4">
              <label className="text-[11px] font-black text-purple-700 uppercase block mb-1.5">
                Equipo Visitante (Rival)
              </label>
              <input
                type="text"
                value={matchData.visitorTeam}
                onChange={(e) => handleMatchInfoChange('visitorTeam', e.target.value)}
                placeholder="Ej. CB Granollers"
                className="w-full px-3.5 py-2.5 text-sm font-bold rounded-xl bg-purple-50/40 border border-purple-200 focus:outline-none focus:ring-2 focus:ring-purple-500/30 focus:border-purple-500 transition-all text-purple-950"
              />
            </div>
          </div>

          {/* Espacio para URL y Scraping */}
          <div className="pt-3 border-t border-slate-100 space-y-2.5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <label className="text-[11px] font-black text-slate-700 uppercase flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5 text-amber-500" />
                <span>URL del Play-by-Play (Acta Digital / Fed. Catalana de Basquetbol FCBQ)</span>
              </label>
              <span className="text-[10px] font-extrabold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md">
                Extractor Automático
              </span>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <div className="relative flex-1">
                <input
                  type="url"
                  value={matchData.playByPlayUrl}
                  onChange={(e) => handleMatchInfoChange('playByPlayUrl', e.target.value)}
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
                disabled={isScraping || !matchData.playByPlayUrl?.trim()}
                className={`inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black transition-all shadow-sm cursor-pointer ${
                  isScraping
                    ? 'bg-amber-100 text-amber-800 border border-amber-300 cursor-wait'
                    : !matchData.playByPlayUrl?.trim()
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
                    <span>Scrapear Scouting</span>
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

        {/* 2. SUBIDA DE 2 EXCEL SEPARADOS: UNO PARA EQUIPO LOCAL Y OTRO PARA EQUIPO VISITANTE */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* TARJETA EXCEL: EQUIPO LOCAL */}
          <div className="bg-white rounded-3xl border border-blue-200 p-6 sm:p-7 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-blue-100 pb-3">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-blue-600" />
                <h3 className="text-base font-black text-blue-950">
                  Excel: {matchData.localTeam || 'Equipo Local'}
                </h3>
              </div>
              <span className="text-xs font-black text-blue-700 bg-blue-50 px-2.5 py-1 rounded-xl border border-blue-200">
                {matchData.localPlayers.length} Jugadoras
              </span>
            </div>

            <p className="text-xs text-slate-500">
              Sube el archivo Excel con las columnas exactas: <span className="font-mono text-[11px] text-slate-700 font-bold">Equipo, fecha, Dorsal, Jugadora, PJ, MIN, PTS, FC/P, TLA, TLI, T2A, T2I, T3A, T3I</span>
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
                <span>Subir Excel Local (.xlsx)</span>
              </button>

              <button
                type="button"
                onClick={() => handleDownloadTemplate(matchData.localTeam || 'Local')}
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

          {/* TARJETA EXCEL: EQUIPO VISITANTE (RIVAL) */}
          <div className="bg-white rounded-3xl border border-purple-200 p-6 sm:p-7 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-purple-100 pb-3">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-purple-600" />
                <h3 className="text-base font-black text-purple-950">
                  Excel: {matchData.visitorTeam || 'Equipo Visitante (Rival)'}
                </h3>
              </div>
              <span className="text-xs font-black text-purple-700 bg-purple-50 px-2.5 py-1 rounded-xl border border-purple-200">
                {matchData.visitorPlayers.length} Jugadoras
              </span>
            </div>

            <p className="text-xs text-slate-500">
              Sube el archivo Excel con las columnas exactas: <span className="font-mono text-[11px] text-slate-700 font-bold">Equipo, fecha, Dorsal, Jugadora, PJ, MIN, PTS, FC/P, TLA, TLI, T2A, T2I, T3A, T3I</span>
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
                <span>Subir Excel Visitante (.xlsx)</span>
              </button>

              <button
                type="button"
                onClick={() => handleDownloadTemplate(matchData.visitorTeam || 'Visitante')}
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

        {/* 3. SCOUTING PERSONALIZADO 1: EQUIPO LOCAL CON DESCARGA PDF */}
        <div className="bg-white rounded-3xl border border-blue-200 p-6 sm:p-7 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-blue-100 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-700 font-black shrink-0">
                <Shield className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-black text-blue-950">
                  Informe Scouting • {matchData.localTeam || 'Equipo Local'}
                </h3>
                <p className="text-xs text-slate-500">
                  Análisis ofensivo personalizado (TL, T2, T3) y planilla completa
                </p>
              </div>
            </div>

            {/* BOTÓN DE DESCARGA PDF EQUIPO LOCAL */}
            <button
              type="button"
              onClick={() => handleDownloadPdf('local')}
              disabled={matchData.localPlayers.length === 0}
              className={`px-4 py-2.5 rounded-xl font-black text-xs flex items-center gap-2 transition-all shadow-sm ${
                matchData.localPlayers.length > 0
                  ? 'bg-blue-700 hover:bg-blue-600 text-white cursor-pointer active:scale-95'
                  : 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed'
              }`}
            >
              <FileDown className="w-4 h-4" />
              <span>Descargar Informe PDF (Local)</span>
            </button>
          </div>

          {/* Cuadrantes Top 5 Local */}
          {matchData.localPlayers.length === 0 ? (
            <div className="text-center py-8 border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
              <p className="text-xs font-bold text-slate-500">
                Sube el Excel del Equipo Local para ver su informe personalizado y Top 5 ofensivo.
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
                        <span className="font-bold text-slate-800 truncate">
                          {idx + 1}. {p.dorsal ? `#${p.dorsal} ` : ''}{p.jugadora}
                        </span>
                        <span className="font-black text-amber-700">{p.tla}{p.tli ? `/${p.tli}` : ''} TL</span>
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
                        <span className="font-bold text-slate-800 truncate">
                          {idx + 1}. {p.dorsal ? `#${p.dorsal} ` : ''}{p.jugadora}
                        </span>
                        <span className="font-black text-blue-700">{p.t2a}{p.t2i ? `/${p.t2i}` : ''} T2</span>
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
                        <span className="font-bold text-slate-800 truncate">
                          {idx + 1}. {p.dorsal ? `#${p.dorsal} ` : ''}{p.jugadora}
                        </span>
                        <span className="font-black text-rose-700">{p.t3a}{p.t3i ? `/${p.t3i}` : ''} T3</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Tabla Completa con Encabezados Exactos de la Imagen */}
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
                      <th className="py-2.5 px-2 text-center">T2A</th>
                      <th className="py-2.5 px-2 text-center">T2I</th>
                      <th className="py-2.5 px-2 text-center">T3A</th>
                      <th className="py-2.5 px-2 text-center">T3I</th>
                      <th className="py-2.5 px-2 text-center">Acción</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
                    {matchData.localPlayers.map((p) => (
                      <tr key={p.id} className="hover:bg-blue-50/40">
                        <td className="py-2 px-3">
                          <input
                            type="text"
                            value={p.equipo}
                            onChange={(e) => handleUpdatePlayer('local', p.id, 'equipo', e.target.value)}
                            className="w-24 px-1.5 py-1 rounded border border-slate-200 bg-white text-xs font-bold"
                          />
                        </td>
                        <td className="py-2 px-3">
                          <input
                            type="text"
                            value={p.fecha}
                            onChange={(e) => handleUpdatePlayer('local', p.id, 'fecha', e.target.value)}
                            className="w-20 px-1.5 py-1 rounded border border-slate-200 bg-white text-xs"
                          />
                        </td>
                        <td className="py-2 px-2 text-center">
                          <input
                            type="text"
                            value={p.dorsal}
                            onChange={(e) => handleUpdatePlayer('local', p.id, 'dorsal', e.target.value)}
                            className="w-10 px-1 py-1 rounded border border-slate-200 bg-white text-center font-black text-xs"
                          />
                        </td>
                        <td className="py-2 px-3">
                          <input
                            type="text"
                            value={p.jugadora}
                            onChange={(e) => handleUpdatePlayer('local', p.id, 'jugadora', e.target.value)}
                            className="w-36 px-1.5 py-1 rounded border border-slate-200 bg-white font-bold text-xs"
                          />
                        </td>
                        <td className="py-2 px-2 text-center">
                          <input
                            type="number"
                            min="0"
                            value={p.pj}
                            onChange={(e) => handleUpdatePlayer('local', p.id, 'pj', e.target.value)}
                            className="w-10 px-1 py-1 rounded border border-slate-200 bg-white text-center text-xs"
                          />
                        </td>
                        <td className="py-2 px-2 text-center">
                          <input
                            type="number"
                            min="0"
                            value={p.min}
                            onChange={(e) => handleUpdatePlayer('local', p.id, 'min', e.target.value)}
                            className="w-12 px-1 py-1 rounded border border-slate-200 bg-white text-center text-xs"
                          />
                        </td>
                        <td className="py-2 px-2 text-center">
                          <span className="inline-block px-2 py-1 rounded-md bg-amber-100 text-amber-900 font-black text-xs">
                            {p.pts}
                          </span>
                        </td>
                        <td className="py-2 px-2 text-center">
                          <input
                            type="number"
                            min="0"
                            value={p.fc_p}
                            onChange={(e) => handleUpdatePlayer('local', p.id, 'fc_p', e.target.value)}
                            className="w-10 px-1 py-1 rounded border border-slate-200 bg-white text-center text-xs"
                          />
                        </td>
                        <td className="py-2 px-2 text-center">
                          <input
                            type="number"
                            min="0"
                            value={p.tla}
                            onChange={(e) => handleUpdatePlayer('local', p.id, 'tla', e.target.value)}
                            className="w-12 px-1 py-1 rounded border border-amber-200 bg-amber-50 text-center font-bold text-xs"
                          />
                        </td>
                        <td className="py-2 px-2 text-center">
                          <input
                            type="number"
                            min="0"
                            value={p.tli}
                            onChange={(e) => handleUpdatePlayer('local', p.id, 'tli', e.target.value)}
                            className="w-12 px-1 py-1 rounded border border-slate-200 bg-white text-center text-xs"
                          />
                        </td>
                        <td className="py-2 px-2 text-center">
                          <input
                            type="number"
                            min="0"
                            value={p.t2a}
                            onChange={(e) => handleUpdatePlayer('local', p.id, 't2a', e.target.value)}
                            className="w-12 px-1 py-1 rounded border border-blue-200 bg-blue-50 text-center font-bold text-xs"
                          />
                        </td>
                        <td className="py-2 px-2 text-center">
                          <input
                            type="number"
                            min="0"
                            value={p.t2i}
                            onChange={(e) => handleUpdatePlayer('local', p.id, 't2i', e.target.value)}
                            className="w-12 px-1 py-1 rounded border border-slate-200 bg-white text-center text-xs"
                          />
                        </td>
                        <td className="py-2 px-2 text-center">
                          <input
                            type="number"
                            min="0"
                            value={p.t3a}
                            onChange={(e) => handleUpdatePlayer('local', p.id, 't3a', e.target.value)}
                            className="w-12 px-1 py-1 rounded border border-rose-200 bg-rose-50 text-center font-bold text-xs"
                          />
                        </td>
                        <td className="py-2 px-2 text-center">
                          <input
                            type="number"
                            min="0"
                            value={p.t3i}
                            onChange={(e) => handleUpdatePlayer('local', p.id, 't3i', e.target.value)}
                            className="w-12 px-1 py-1 rounded border border-slate-200 bg-white text-center text-xs"
                          />
                        </td>
                        <td className="py-2 px-2 text-center">
                          <button
                            type="button"
                            onClick={() => handleDeletePlayer('local', p.id)}
                            className="p-1 text-slate-400 hover:text-rose-600 rounded"
                            title="Eliminar jugadora"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* 4. SCOUTING PERSONALIZADO 2: EQUIPO VISITANTE (RIVAL) CON DESCARGA PDF */}
        <div className="bg-white rounded-3xl border border-purple-200 p-6 sm:p-7 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-purple-100 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-purple-50 border border-purple-200 flex items-center justify-center text-purple-700 font-black shrink-0">
                <Target className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-black text-purple-950">
                  Informe Scouting • {matchData.visitorTeam || 'Equipo Visitante (Rival)'}
                </h3>
                <p className="text-xs text-slate-500">
                  Análisis ofensivo personalizado (TL, T2, T3) y planilla completa
                </p>
              </div>
            </div>

            {/* BOTÓN DE DESCARGA PDF EQUIPO VISITANTE */}
            <button
              type="button"
              onClick={() => handleDownloadPdf('visitante')}
              disabled={matchData.visitorPlayers.length === 0}
              className={`px-4 py-2.5 rounded-xl font-black text-xs flex items-center gap-2 transition-all shadow-sm ${
                matchData.visitorPlayers.length > 0
                  ? 'bg-purple-700 hover:bg-purple-600 text-white cursor-pointer active:scale-95'
                  : 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed'
              }`}
            >
              <FileDown className="w-4 h-4" />
              <span>Descargar Informe PDF (Visitante)</span>
            </button>
          </div>

          {/* Cuadrantes Top 5 Visitante */}
          {matchData.visitorPlayers.length === 0 ? (
            <div className="text-center py-8 border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
              <p className="text-xs font-bold text-slate-500">
                Sube el Excel del Equipo Visitante para ver su informe personalizado y Top 5 ofensivo.
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
                        <span className="font-bold text-slate-800 truncate">
                          {idx + 1}. {p.dorsal ? `#${p.dorsal} ` : ''}{p.jugadora}
                        </span>
                        <span className="font-black text-amber-700">{p.tla}{p.tli ? `/${p.tli}` : ''} TL</span>
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
                    {visitorAnalysis.topT2A.map((p, idx) => (
                      <div key={p.id} className="flex items-center justify-between p-2 rounded-xl bg-white border border-blue-200 text-xs">
                        <span className="font-bold text-slate-800 truncate">
                          {idx + 1}. {p.dorsal ? `#${p.dorsal} ` : ''}{p.jugadora}
                        </span>
                        <span className="font-black text-blue-700">{p.t2a}{p.t2i ? `/${p.t2i}` : ''} T2</span>
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
                        <span className="font-bold text-slate-800 truncate">
                          {idx + 1}. {p.dorsal ? `#${p.dorsal} ` : ''}{p.jugadora}
                        </span>
                        <span className="font-black text-rose-700">{p.t3a}{p.t3i ? `/${p.t3i}` : ''} T3</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Tabla Completa con Encabezados Exactos de la Imagen */}
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
                      <th className="py-2.5 px-2 text-center">T2A</th>
                      <th className="py-2.5 px-2 text-center">T2I</th>
                      <th className="py-2.5 px-2 text-center">T3A</th>
                      <th className="py-2.5 px-2 text-center">T3I</th>
                      <th className="py-2.5 px-2 text-center">Acción</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
                    {matchData.visitorPlayers.map((p) => (
                      <tr key={p.id} className="hover:bg-purple-50/40">
                        <td className="py-2 px-3">
                          <input
                            type="text"
                            value={p.equipo}
                            onChange={(e) => handleUpdatePlayer('visitante', p.id, 'equipo', e.target.value)}
                            className="w-24 px-1.5 py-1 rounded border border-slate-200 bg-white text-xs font-bold"
                          />
                        </td>
                        <td className="py-2 px-3">
                          <input
                            type="text"
                            value={p.fecha}
                            onChange={(e) => handleUpdatePlayer('visitante', p.id, 'fecha', e.target.value)}
                            className="w-20 px-1.5 py-1 rounded border border-slate-200 bg-white text-xs"
                          />
                        </td>
                        <td className="py-2 px-2 text-center">
                          <input
                            type="text"
                            value={p.dorsal}
                            onChange={(e) => handleUpdatePlayer('visitante', p.id, 'dorsal', e.target.value)}
                            className="w-10 px-1 py-1 rounded border border-slate-200 bg-white text-center font-black text-xs"
                          />
                        </td>
                        <td className="py-2 px-3">
                          <input
                            type="text"
                            value={p.jugadora}
                            onChange={(e) => handleUpdatePlayer('visitante', p.id, 'jugadora', e.target.value)}
                            className="w-36 px-1.5 py-1 rounded border border-slate-200 bg-white font-bold text-xs"
                          />
                        </td>
                        <td className="py-2 px-2 text-center">
                          <input
                            type="number"
                            min="0"
                            value={p.pj}
                            onChange={(e) => handleUpdatePlayer('visitante', p.id, 'pj', e.target.value)}
                            className="w-10 px-1 py-1 rounded border border-slate-200 bg-white text-center text-xs"
                          />
                        </td>
                        <td className="py-2 px-2 text-center">
                          <input
                            type="number"
                            min="0"
                            value={p.min}
                            onChange={(e) => handleUpdatePlayer('visitante', p.id, 'min', e.target.value)}
                            className="w-12 px-1 py-1 rounded border border-slate-200 bg-white text-center text-xs"
                          />
                        </td>
                        <td className="py-2 px-2 text-center">
                          <span className="inline-block px-2 py-1 rounded-md bg-amber-100 text-amber-900 font-black text-xs">
                            {p.pts}
                          </span>
                        </td>
                        <td className="py-2 px-2 text-center">
                          <input
                            type="number"
                            min="0"
                            value={p.fc_p}
                            onChange={(e) => handleUpdatePlayer('visitante', p.id, 'fc_p', e.target.value)}
                            className="w-10 px-1 py-1 rounded border border-slate-200 bg-white text-center text-xs"
                          />
                        </td>
                        <td className="py-2 px-2 text-center">
                          <input
                            type="number"
                            min="0"
                            value={p.tla}
                            onChange={(e) => handleUpdatePlayer('visitante', p.id, 'tla', e.target.value)}
                            className="w-12 px-1 py-1 rounded border border-amber-200 bg-amber-50 text-center font-bold text-xs"
                          />
                        </td>
                        <td className="py-2 px-2 text-center">
                          <input
                            type="number"
                            min="0"
                            value={p.tli}
                            onChange={(e) => handleUpdatePlayer('visitante', p.id, 'tli', e.target.value)}
                            className="w-12 px-1 py-1 rounded border border-slate-200 bg-white text-center text-xs"
                          />
                        </td>
                        <td className="py-2 px-2 text-center">
                          <input
                            type="number"
                            min="0"
                            value={p.t2a}
                            onChange={(e) => handleUpdatePlayer('visitante', p.id, 't2a', e.target.value)}
                            className="w-12 px-1 py-1 rounded border border-blue-200 bg-blue-50 text-center font-bold text-xs"
                          />
                        </td>
                        <td className="py-2 px-2 text-center">
                          <input
                            type="number"
                            min="0"
                            value={p.t2i}
                            onChange={(e) => handleUpdatePlayer('visitante', p.id, 't2i', e.target.value)}
                            className="w-12 px-1 py-1 rounded border border-slate-200 bg-white text-center text-xs"
                          />
                        </td>
                        <td className="py-2 px-2 text-center">
                          <input
                            type="number"
                            min="0"
                            value={p.t3a}
                            onChange={(e) => handleUpdatePlayer('visitante', p.id, 't3a', e.target.value)}
                            className="w-12 px-1 py-1 rounded border border-rose-200 bg-rose-50 text-center font-bold text-xs"
                          />
                        </td>
                        <td className="py-2 px-2 text-center">
                          <input
                            type="number"
                            min="0"
                            value={p.t3i}
                            onChange={(e) => handleUpdatePlayer('visitante', p.id, 't3i', e.target.value)}
                            className="w-12 px-1 py-1 rounded border border-slate-200 bg-white text-center text-xs"
                          />
                        </td>
                        <td className="py-2 px-2 text-center">
                          <button
                            type="button"
                            onClick={() => handleDeletePlayer('visitante', p.id)}
                            className="p-1 text-slate-400 hover:text-rose-600 rounded"
                            title="Eliminar jugadora"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ==========================================
  // NIVEL 2: VISTA DE SELECCIÓN DE IDA O VUELTA
  // ==========================================
  if (selectedRival) {
    return (
      <div className="space-y-6 animate-fadeIn pb-12">
        <div className="bg-[#0B132B] text-white p-6 sm:p-7 rounded-3xl border border-slate-800 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <button
              type="button"
              onClick={() => {
                setSelectedRivalId(null);
                setSelectedMatchLeg(null);
              }}
              className="p-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-200 hover:text-white transition-all cursor-pointer border border-slate-700 flex items-center justify-center shrink-0"
              title="Volver al listado de rivales"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>

            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-400 text-[11px] font-black uppercase">
                  Rival #{selectedRival.id}
                </span>
              </div>
              <h1 className="text-2xl font-black text-white tracking-tight mt-0.5">
                {selectedRival.name}
              </h1>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              setSelectedRivalId(null);
              setSelectedMatchLeg(null);
            }}
            className="text-xs font-bold text-slate-400 hover:text-white transition-colors self-start sm:self-center cursor-pointer"
          >
            ← Volver a los 8 rivales
          </button>
        </div>

        {/* Las 2 tarjetas: Partido de Ida y Partido de Vuelta */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6">
          <div
            onClick={() => setSelectedMatchLeg('ida')}
            className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-7 shadow-sm hover:shadow-md hover:border-blue-300 transition-all cursor-pointer flex flex-col justify-between min-h-[260px] group"
          >
            <div className="flex items-center justify-between">
              <span className="px-3 py-1 rounded-xl bg-blue-50 border border-blue-200 text-blue-700 font-extrabold text-xs">
                Ida
              </span>
              <Calendar className="w-5 h-5 text-slate-300 group-hover:text-blue-500 transition-colors" />
            </div>

            <div className="my-6">
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 group-hover:text-blue-600 transition-colors">
                Partido de Ida
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Scouting con subida de Excel (Local y Rival) y PDF
              </p>
            </div>

            <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400 font-medium group-hover:text-slate-600">
              <span>{selectedRival.name} • Ida</span>
              <span className="text-slate-300 group-hover:text-blue-500 font-black">Abrir Scouting →</span>
            </div>
          </div>

          <div
            onClick={() => setSelectedMatchLeg('vuelta')}
            className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-7 shadow-sm hover:shadow-md hover:border-purple-300 transition-all cursor-pointer flex flex-col justify-between min-h-[260px] group"
          >
            <div className="flex items-center justify-between">
              <span className="px-3 py-1 rounded-xl bg-purple-50 border border-purple-200 text-purple-700 font-extrabold text-xs">
                Vuelta
              </span>
              <Calendar className="w-5 h-5 text-slate-300 group-hover:text-purple-500 transition-colors" />
            </div>

            <div className="my-6">
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 group-hover:text-purple-600 transition-colors">
                Partido de Vuelta
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Scouting con subida de Excel (Local y Rival) y PDF
              </p>
            </div>

            <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400 font-medium group-hover:text-slate-600">
              <span>{selectedRival.name} • Vuelta</span>
              <span className="text-slate-300 group-hover:text-purple-500 font-black">Abrir Scouting →</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // NIVEL 1: GRID PRINCIPAL DE 8 RIVALES
  // ==========================================
  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      <div className="bg-[#0B132B] text-white p-6 sm:p-7 rounded-3xl border border-slate-800 shadow-xl flex items-center justify-between">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
            <Target className="w-6 h-6 stroke-[2.5]" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-white tracking-tight">
              Área Rival Scouting
            </h1>
            <p className="text-xs text-slate-400">
              Selecciona un rival para gestionar el scouting de Ida y Vuelta
            </p>
          </div>
        </div>

        <div className="px-3.5 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-amber-400 text-xs font-black">
          8 Rivales
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        {RIVALS_LIST.map((rival) => (
          <div
            key={rival.id}
            onClick={() => {
              setSelectedRivalId(rival.id);
              setSelectedMatchLeg(null);
            }}
            className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-md hover:border-amber-400/80 transition-all cursor-pointer flex flex-col justify-between min-h-[180px] group"
          >
            <div className="flex items-center justify-between">
              <div className="w-9 h-9 rounded-xl bg-slate-100 group-hover:bg-amber-50 border border-slate-200 group-hover:border-amber-200 flex items-center justify-center text-slate-800 group-hover:text-amber-700 font-black text-xs transition-colors">
                #{rival.id}
              </div>
              <Shield className="w-5 h-5 text-slate-300 group-hover:text-amber-500 transition-colors" />
            </div>

            <div className="my-4">
              <h3 className="text-base font-black text-slate-900 group-hover:text-amber-600 transition-colors">
                {rival.name}
              </h3>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400 font-medium group-hover:text-slate-600">
              <span>Ver partidos (Ida / Vuelta)</span>
              <span className="text-slate-300 group-hover:text-amber-500 font-black">→</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
