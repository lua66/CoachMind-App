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
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { UserProfile } from '../types';

interface RivalScoutingViewProps {
  userProfile?: UserProfile | null;
}

export interface PlayerStatRow {
  id: string;
  dorsal: string;
  name: string;
  team: 'local' | 'visitante';
  tl: number; // Tiros libres anotados
  t2: number; // Tiros de 2 anotados
  t3: number; // Tiros de 3 anotados
}

export interface MatchScoutingState {
  matchNumber: string;
  localTeam: string;
  visitorTeam: string;
  scoreLocal: string;
  scoreVisitor: string;
  playByPlayUrl: string;
  players: PlayerStatRow[];
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
    players: [],
  };
};

export const RivalScoutingView: React.FC<RivalScoutingViewProps> = () => {
  const [selectedRivalId, setSelectedRivalId] = useState<number | null>(null);
  const [selectedMatchLeg, setSelectedMatchLeg] = useState<'ida' | 'vuelta' | null>(null);

  const selectedRival = RIVALS_LIST.find((r) => r.id === selectedRivalId);

  // Clave única para guardar por rival y por partido (ida / vuelta)
  const storageKey =
    selectedRival && selectedMatchLeg
      ? `coachmind_rival_scouting_${selectedRival.id}_${selectedMatchLeg}`
      : null;

  const [matchData, setMatchData] = useState<MatchScoutingState>(() => {
    return {
      matchNumber: '1',
      localTeam: 'Mi Equipo',
      visitorTeam: 'Rival',
      scoreLocal: '',
      scoreVisitor: '',
      playByPlayUrl: '',
      players: [],
    };
  });

  const [uploadFeedback, setUploadFeedback] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
    field: keyof Omit<MatchScoutingState, 'players'>,
    value: string
  ) => {
    setMatchData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  // Añadir una jugadora manual
  const handleAddPlayer = (team: 'local' | 'visitante') => {
    const newPlayer: PlayerStatRow = {
      id: `p_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      dorsal: '',
      name: '',
      team,
      tl: 0,
      t2: 0,
      t3: 0,
    };
    setMatchData((prev) => ({
      ...prev,
      players: [...prev.players, newPlayer],
    }));
  };

  // Actualizar estadísticas de una jugadora
  const handleUpdatePlayer = (
    id: string,
    field: keyof PlayerStatRow,
    value: string | number
  ) => {
    setMatchData((prev) => ({
      ...prev,
      players: prev.players.map((p) => {
        if (p.id !== id) return p;
        if (field === 'tl' || field === 't2' || field === 't3') {
          const num = Math.max(0, parseInt(value as string, 10) || 0);
          return { ...p, [field]: num };
        }
        return { ...p, [field]: value };
      }),
    }));
  };

  // Eliminar jugadora
  const handleDeletePlayer = (id: string) => {
    setMatchData((prev) => ({
      ...prev,
      players: prev.players.filter((p) => p.id !== id),
    }));
  };

  // Carga de archivo Excel / CSV
  const handleExcelUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsName = wb.SheetNames[0];
        const ws = wb.Sheets[wsName];
        const rows: any[] = XLSX.utils.sheet_to_json(ws, { header: 1 });

        if (!rows || rows.length === 0) {
          setUploadFeedback('El archivo Excel está vacío.');
          return;
        }

        // Buscar encabezados o mapear columnas
        // Formato esperado flexible:
        // [Dorsal, Nombre, Equipo (Local/Visitante), TL, T2, T3]
        const newPlayers: PlayerStatRow[] = [];
        let startIdx = 0;

        // Si la primera fila son cabeceras de texto
        if (
          rows[0] &&
          typeof rows[0][0] === 'string' &&
          (rows[0][0].toLowerCase().includes('dorsal') ||
            rows[0][0].toLowerCase().includes('#') ||
            rows[0][1]?.toString().toLowerCase().includes('nombre'))
        ) {
          startIdx = 1;
        }

        for (let i = startIdx; i < rows.length; i++) {
          const r = rows[i];
          if (!r || r.length < 2) continue;

          const dorsal = (r[0] ?? '').toString().trim();
          const name = (r[1] ?? '').toString().trim();
          if (!name && !dorsal) continue;

          let team: 'local' | 'visitante' = 'visitante';
          const teamCol = (r[2] ?? '').toString().toLowerCase();
          if (teamCol.includes('local') || teamCol === 'l') {
            team = 'local';
          }

          const tl = parseInt(r[3] ?? 0, 10) || 0;
          const t2 = parseInt(r[4] ?? 0, 10) || 0;
          const t3 = parseInt(r[5] ?? 0, 10) || 0;

          newPlayers.push({
            id: `p_excel_${Date.now()}_${i}`,
            dorsal,
            name: name || `Jugadora #${dorsal}`,
            team,
            tl: Math.max(0, tl),
            t2: Math.max(0, t2),
            t3: Math.max(0, t3),
          });
        }

        if (newPlayers.length > 0) {
          setMatchData((prev) => ({
            ...prev,
            players: [...prev.players, ...newPlayers],
          }));
          setUploadFeedback(`¡Se importaron con éxito ${newPlayers.length} jugadoras del Excel!`);
          setTimeout(() => setUploadFeedback(null), 4000);
        } else {
          setUploadFeedback('No se detectaron filas válidas en el Excel.');
        }
      } catch (err) {
        console.error('Error al procesar Excel:', err);
        setUploadFeedback('Error al leer el archivo Excel. Verifica el formato.');
      }
    };
    reader.readAsBinaryString(file);
    // Limpiar input para permitir subir el mismo archivo si es necesario
    e.target.value = '';
  };

  // Descargar plantilla de Excel
  const handleDownloadTemplate = () => {
    const wsData = [
      ['Dorsal', 'Nombre', 'Equipo (Local / Visitante)', 'TL (Anotados)', 'T2 (Anotados)', 'T3 (Triples)'],
      ['7', 'M. García', 'Local', 4, 5, 2],
      ['10', 'L. Fernández', 'Local', 2, 6, 1],
      ['14', 'C. Navarro', 'Local', 5, 2, 3],
      ['4', 'A. Pérez', 'Visitante', 3, 7, 0],
      ['9', 'S. Gómez', 'Visitante', 1, 4, 4],
      ['15', 'E. Martín', 'Visitante', 6, 3, 1],
    ];
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Plantilla Scouting');
    XLSX.writeFile(wb, 'plantilla_scouting_estadisticas.xlsx');
  };

  // Cargar datos de prueba rápidos
  const handleLoadSampleStats = () => {
    const localName = matchData.localTeam || 'Equipo Local';
    const visitorName = matchData.visitorTeam || 'Equipo Visitante';

    const sample: PlayerStatRow[] = [
      // Local
      { id: 's1', dorsal: '4', name: 'Laura Gómez', team: 'local', tl: 4, t2: 6, t3: 2 },
      { id: 's2', dorsal: '7', name: 'Clara Puig', team: 'local', tl: 2, t2: 5, t3: 3 },
      { id: 's3', dorsal: '10', name: 'Marta Rius', team: 'local', tl: 6, t2: 3, t3: 1 },
      { id: 's4', dorsal: '12', name: 'Alba Soler', team: 'local', tl: 1, t2: 4, t3: 2 },
      { id: 's5', dorsal: '15', name: 'Núria Bosch', team: 'local', tl: 3, t2: 5, t3: 0 },
      { id: 's6', dorsal: '8', name: 'Carla Vila', team: 'local', tl: 0, t2: 2, t3: 1 },
      // Visitante
      { id: 's7', dorsal: '5', name: 'Sara Morales', team: 'visitante', tl: 5, t2: 7, t3: 1 },
      { id: 's8', dorsal: '9', name: 'Elena Serra', team: 'visitante', tl: 2, t2: 4, t3: 4 },
      { id: 's9', dorsal: '11', name: 'Paula Font', team: 'visitante', tl: 4, t2: 6, t3: 0 },
      { id: 's10', dorsal: '14', name: 'Júlia Roca', team: 'visitante', tl: 6, t2: 2, t3: 2 },
      { id: 's11', dorsal: '21', name: 'Marina Cros', team: 'visitante', tl: 1, t2: 3, t3: 3 },
      { id: 's12', dorsal: '6', name: 'Berta Mas', team: 'visitante', tl: 2, t2: 1, t3: 0 },
    ];

    setMatchData((prev) => ({
      ...prev,
      scoreLocal: '68',
      scoreVisitor: '65',
      players: sample,
    }));
  };

  // CÁLCULOS DE SCOUTING: TOP 5 JUGADORAS MÁS OFENSIVAS
  const scoutingAnalysis = useMemo(() => {
    const playersWithPoints = matchData.players.map((p) => {
      const ptsTL = p.tl * 1;
      const ptsT2 = p.t2 * 2;
      const ptsT3 = p.t3 * 3;
      const totalPoints = ptsTL + ptsT2 + ptsT3;
      return {
        ...p,
        ptsTL,
        ptsT2,
        ptsT3,
        totalPoints,
      };
    });

    const localPlayers = playersWithPoints.filter((p) => p.team === 'local');
    const visitorPlayers = playersWithPoints.filter((p) => p.team === 'visitante');

    const totalLocalPoints = localPlayers.reduce((acc, p) => acc + p.totalPoints, 0);
    const totalVisitorPoints = visitorPlayers.reduce((acc, p) => acc + p.totalPoints, 0);

    const getTop5 = (list: typeof playersWithPoints, key: 'totalPoints' | 'tl' | 't2' | 't3') => {
      return [...list].sort((a, b) => b[key] - a[key]).slice(0, 5);
    };

    return {
      local: {
        totalPoints: totalLocalPoints,
        topOverall: getTop5(localPlayers, 'totalPoints'),
        topTL: getTop5(localPlayers, 'tl'),
        topT2: getTop5(localPlayers, 't2'),
        topT3: getTop5(localPlayers, 't3'),
      },
      visitor: {
        totalPoints: totalVisitorPoints,
        topOverall: getTop5(visitorPlayers, 'totalPoints'),
        topTL: getTop5(visitorPlayers, 'tl'),
        topT2: getTop5(visitorPlayers, 't2'),
        topT3: getTop5(visitorPlayers, 't3'),
      },
      allPlayersCount: matchData.players.length,
    };
  }, [matchData.players]);

  // ==========================================
  // NIVEL 3: Vista de Partido (Ida o Vuelta)
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
        {/* Cabecera de navegación */}
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

        {/* ==========================================
            1. FORMULARIO PRINCIPAL DEL PARTIDO
           ========================================== */}
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
                className="text-xs font-bold px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer flex items-center gap-1.5"
                title="Cargar ejemplo de prueba"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                <span>Cargar Ejemplo</span>
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
              <label className="text-[11px] font-black text-blue-700 uppercase block mb-1.5 flex items-center gap-1">
                <span>Equipo Local</span>
              </label>
              <input
                type="text"
                value={matchData.localTeam}
                onChange={(e) => handleMatchInfoChange('localTeam', e.target.value)}
                placeholder="Ej. Mi Equipo"
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
              <label className="text-[11px] font-black text-purple-700 uppercase block mb-1.5 flex items-center gap-1">
                <span>Equipo Visitante</span>
              </label>
              <input
                type="text"
                value={matchData.visitorTeam}
                onChange={(e) => handleMatchInfoChange('visitorTeam', e.target.value)}
                placeholder="Ej. Rival 1"
                className="w-full px-3.5 py-2.5 text-sm font-bold rounded-xl bg-purple-50/40 border border-purple-200 focus:outline-none focus:ring-2 focus:ring-purple-500/30 focus:border-purple-500 transition-all text-purple-950"
              />
            </div>
          </div>

          {/* Espacio reservado para URL del Play-by-Play de la Federación Catalana */}
          <div className="pt-2 border-t border-slate-100">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-1.5">
              <label className="text-[11px] font-black text-slate-700 uppercase flex items-center gap-1.5">
                <Link className="w-3.5 h-3.5 text-amber-500" />
                <span>URL del Play-by-Play (Acta Digital / Fed. Catalana de Basquetbol)</span>
              </label>
              <span className="text-[10px] font-extrabold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md">
                Espacio preparado para integración FCBQ
              </span>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="url"
                value={matchData.playByPlayUrl}
                onChange={(e) => handleMatchInfoChange('playByPlayUrl', e.target.value)}
                placeholder="https://www.basquetcatala.cat/partit/... (Pega aquí el enlace de la federación)"
                className="flex-1 px-3.5 py-2.5 text-xs font-medium rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 transition-all"
              />
            </div>
          </div>
        </div>

        {/* ==========================================
            2. TARJETA PRINCIPAL: SUBIR MANUAL O EN EXCEL
           ========================================== */}
        <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-7 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-base sm:text-lg font-black text-slate-900 flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
                <span>Carga de Estadísticas de Jugadoras (TL, T2, T3)</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Sube las estadísticas manual o mediante archivo Excel para activar el scouting ofensivo.
              </p>
            </div>

            {/* Acciones de Excel y Manual */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Input de archivo Excel oculto */}
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx, .xls, .csv"
                onChange={handleExcelUpload}
                className="hidden"
              />

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Subir en Excel (.xlsx)</span>
              </button>

              <button
                type="button"
                onClick={handleDownloadTemplate}
                className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                title="Descargar plantilla de Excel"
              >
                <Download className="w-3.5 h-3.5 text-slate-500" />
                <span>Plantilla Excel</span>
              </button>
            </div>
          </div>

          {/* Feedback de subida */}
          {uploadFeedback && (
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-bold flex items-center gap-2 animate-fadeIn">
              <Check className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{uploadFeedback}</span>
            </div>
          )}

          {/* Botones para añadir jugadora manual */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50 p-3 rounded-2xl border border-slate-100">
            <span className="text-xs font-bold text-slate-600">
              Añadir jugadoras manualmente:
            </span>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleAddPlayer('local')}
                className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-black text-xs flex items-center gap-1 cursor-pointer transition-all shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Jugadora {matchData.localTeam || 'Local'}</span>
              </button>

              <button
                type="button"
                onClick={() => handleAddPlayer('visitante')}
                className="px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-black text-xs flex items-center gap-1 cursor-pointer transition-all shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Jugadora {matchData.visitorTeam || 'Visitante'}</span>
              </button>
            </div>
          </div>

          {/* Tabla de estadísticas de jugadoras */}
          {matchData.players.length === 0 ? (
            <div className="text-center py-10 px-4 border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50/50 space-y-3">
              <FileSpreadsheet className="w-10 h-10 text-slate-300 mx-auto" />
              <div className="max-w-sm mx-auto">
                <p className="text-sm font-black text-slate-700">
                  No hay estadísticas registradas todavía
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  Añade jugadoras con los botones de arriba, sube un archivo Excel o haz clic en "Cargar Ejemplo" para ver el scouting en acción.
                </p>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[650px]">
                <thead>
                  <tr className="border-b border-slate-200 text-[11px] font-black text-slate-400 uppercase tracking-wider">
                    <th className="py-2.5 px-3 w-16">Dorsal</th>
                    <th className="py-2.5 px-3">Nombre Jugadora</th>
                    <th className="py-2.5 px-3 w-32">Equipo</th>
                    <th className="py-2.5 px-3 w-24 text-center">TL (1 pt)</th>
                    <th className="py-2.5 px-3 w-24 text-center">T2 (2 pts)</th>
                    <th className="py-2.5 px-3 w-24 text-center">T3 (3 pts)</th>
                    <th className="py-2.5 px-3 w-24 text-center">Puntos Totales</th>
                    <th className="py-2.5 px-3 w-12 text-center">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs font-semibold text-slate-700">
                  {matchData.players.map((player) => {
                    const totalPts = player.tl * 1 + player.t2 * 2 + player.t3 * 3;
                    const isLocal = player.team === 'local';

                    return (
                      <tr
                        key={player.id}
                        className={`hover:bg-slate-50/80 transition-colors ${
                          isLocal ? 'bg-blue-50/20' : 'bg-purple-50/20'
                        }`}
                      >
                        {/* Dorsal */}
                        <td className="py-2 px-3">
                          <input
                            type="text"
                            value={player.dorsal}
                            onChange={(e) =>
                              handleUpdatePlayer(player.id, 'dorsal', e.target.value)
                            }
                            placeholder="#"
                            className="w-12 px-2 py-1.5 text-center font-black rounded-lg border border-slate-200 bg-white focus:ring-2 focus:ring-amber-500 outline-none"
                          />
                        </td>

                        {/* Nombre */}
                        <td className="py-2 px-3">
                          <input
                            type="text"
                            value={player.name}
                            onChange={(e) =>
                              handleUpdatePlayer(player.id, 'name', e.target.value)
                            }
                            placeholder="Nombre de la jugadora..."
                            className="w-full px-2.5 py-1.5 font-bold rounded-lg border border-slate-200 bg-white focus:ring-2 focus:ring-amber-500 outline-none"
                          />
                        </td>

                        {/* Equipo */}
                        <td className="py-2 px-3">
                          <select
                            value={player.team}
                            onChange={(e) =>
                              handleUpdatePlayer(
                                player.id,
                                'team',
                                e.target.value as 'local' | 'visitante'
                              )
                            }
                            className={`w-full px-2 py-1.5 rounded-lg border font-black text-xs outline-none cursor-pointer ${
                              isLocal
                                ? 'bg-blue-50 border-blue-200 text-blue-800'
                                : 'bg-purple-50 border-purple-200 text-purple-800'
                            }`}
                          >
                            <option value="local">Local ({matchData.localTeam || 'Local'})</option>
                            <option value="visitante">
                              Visitante ({matchData.visitorTeam || 'Visitante'})
                            </option>
                          </select>
                        </td>

                        {/* TL */}
                        <td className="py-2 px-3 text-center">
                          <input
                            type="number"
                            min="0"
                            value={player.tl}
                            onChange={(e) =>
                              handleUpdatePlayer(player.id, 'tl', e.target.value)
                            }
                            className="w-16 px-2 py-1.5 text-center font-black rounded-lg border border-slate-200 bg-white focus:ring-2 focus:ring-amber-500 outline-none"
                          />
                        </td>

                        {/* T2 */}
                        <td className="py-2 px-3 text-center">
                          <input
                            type="number"
                            min="0"
                            value={player.t2}
                            onChange={(e) =>
                              handleUpdatePlayer(player.id, 't2', e.target.value)
                            }
                            className="w-16 px-2 py-1.5 text-center font-black rounded-lg border border-slate-200 bg-white focus:ring-2 focus:ring-amber-500 outline-none"
                          />
                        </td>

                        {/* T3 */}
                        <td className="py-2 px-3 text-center">
                          <input
                            type="number"
                            min="0"
                            value={player.t3}
                            onChange={(e) =>
                              handleUpdatePlayer(player.id, 't3', e.target.value)
                            }
                            className="w-16 px-2 py-1.5 text-center font-black rounded-lg border border-slate-200 bg-white focus:ring-2 focus:ring-amber-500 outline-none"
                          />
                        </td>

                        {/* Puntos Totales Calculados */}
                        <td className="py-2 px-3 text-center">
                          <span className="inline-block px-2.5 py-1 rounded-lg bg-slate-900 text-amber-400 font-black text-xs shadow-xs">
                            {totalPts} pts
                          </span>
                        </td>

                        {/* Eliminar */}
                        <td className="py-2 px-3 text-center">
                          <button
                            type="button"
                            onClick={() => handleDeletePlayer(player.id)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer"
                            title="Eliminar jugadora"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* ==========================================
            3. SCOUTING: TOP 5 JUGADORAS MÁS OFENSIVAS (TL, T2, T3)
           ========================================== */}
        {matchData.players.length > 0 && (
          <div className="space-y-6">
            <div className="bg-[#0B132B] text-white p-6 sm:p-7 rounded-3xl border border-slate-800 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
                  <Flame className="w-5 h-5 stroke-[2.5]" />
                </div>
                <div>
                  <h2 className="text-xl font-black text-white">
                    Scouting Ofensivo • Top 5 Jugadoras (TL, T2, T3)
                  </h2>
                  <p className="text-xs text-slate-300">
                    Análisis de las 5 mayores amenazas anotadoras de cada equipo
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="px-3 py-1 rounded-xl bg-slate-900 border border-slate-800 text-xs font-black text-amber-400">
                  {matchData.players.length} Jugadoras analizadas
                </span>
              </div>
            </div>

            {/* SECCIÓN 1: TOP 5 DEL EQUIPO VISITANTE (RIVAL) */}
            <div className="bg-white rounded-3xl border border-purple-200/80 p-6 sm:p-7 shadow-sm space-y-6">
              <div className="flex items-center justify-between border-b border-purple-100 pb-3">
                <div className="flex items-center gap-2.5">
                  <span className="w-3 h-3 rounded-full bg-purple-600 animate-pulse" />
                  <h3 className="text-lg font-black text-purple-950">
                    {matchData.visitorTeam || 'Equipo Visitante (Rival)'}
                  </h3>
                </div>
                <span className="text-xs font-black text-purple-800 bg-purple-50 px-3 py-1 rounded-xl border border-purple-200">
                  Total Anotado: {scoutingAnalysis.visitor.totalPoints} pts
                </span>
              </div>

              {/* Grid con las 4 categorías: Top 5 Anotadoras, Top 5 TL, Top 5 T2, Top 5 T3 */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* 1. TOP 5 TOTALES */}
                <div className="p-4 rounded-2xl bg-slate-900 text-white space-y-3 shadow-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black uppercase text-amber-400 flex items-center gap-1.5">
                      <Trophy className="w-4 h-4" />
                      Top 5 Puntos Totales
                    </span>
                  </div>

                  <div className="space-y-2">
                    {scoutingAnalysis.visitor.topOverall.map((p, idx) => (
                      <div
                        key={p.id}
                        className="flex items-center justify-between p-2 rounded-xl bg-slate-800/80 border border-slate-700/80 text-xs"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="w-5 h-5 rounded-md bg-amber-500/20 text-amber-300 font-black text-[10px] flex items-center justify-center shrink-0">
                            #{idx + 1}
                          </span>
                          <span className="font-bold truncate">
                            {p.dorsal ? `#${p.dorsal} ` : ''}
                            {p.name || 'Sin nombre'}
                          </span>
                        </div>
                        <span className="font-black text-amber-400 shrink-0 ml-2">
                          {p.totalPoints} pts
                        </span>
                      </div>
                    ))}
                    {scoutingAnalysis.visitor.topOverall.length === 0 && (
                      <p className="text-xs text-slate-500 italic py-2 text-center">
                        Sin datos suficientes
                      </p>
                    )}
                  </div>
                </div>

                {/* 2. TOP 5 TL (TIROS LIBRES) */}
                <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200/80 space-y-3 shadow-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black uppercase text-amber-900 flex items-center gap-1.5">
                      <Zap className="w-4 h-4 text-amber-600" />
                      Top 5 Tiros Libres (TL)
                    </span>
                  </div>

                  <div className="space-y-2">
                    {scoutingAnalysis.visitor.topTL.map((p, idx) => (
                      <div
                        key={p.id}
                        className="flex items-center justify-between p-2 rounded-xl bg-white border border-amber-200 text-xs"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="w-5 h-5 rounded-md bg-amber-100 text-amber-800 font-black text-[10px] flex items-center justify-center shrink-0">
                            #{idx + 1}
                          </span>
                          <span className="font-bold text-slate-800 truncate">
                            {p.dorsal ? `#${p.dorsal} ` : ''}
                            {p.name || 'Sin nombre'}
                          </span>
                        </div>
                        <span className="font-black text-amber-700 shrink-0 ml-2">
                          {p.tl} TL ({p.ptsTL} pts)
                        </span>
                      </div>
                    ))}
                    {scoutingAnalysis.visitor.topTL.length === 0 && (
                      <p className="text-xs text-slate-400 italic py-2 text-center">
                        Sin datos suficientes
                      </p>
                    )}
                  </div>
                </div>

                {/* 3. TOP 5 T2 (TIROS DE 2) */}
                <div className="p-4 rounded-2xl bg-blue-50/70 border border-blue-200/80 space-y-3 shadow-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black uppercase text-blue-900 flex items-center gap-1.5">
                      <BarChart3 className="w-4 h-4 text-blue-600" />
                      Top 5 Tiros de 2 (T2)
                    </span>
                  </div>

                  <div className="space-y-2">
                    {scoutingAnalysis.visitor.topT2.map((p, idx) => (
                      <div
                        key={p.id}
                        className="flex items-center justify-between p-2 rounded-xl bg-white border border-blue-200 text-xs"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="w-5 h-5 rounded-md bg-blue-100 text-blue-800 font-black text-[10px] flex items-center justify-center shrink-0">
                            #{idx + 1}
                          </span>
                          <span className="font-bold text-slate-800 truncate">
                            {p.dorsal ? `#${p.dorsal} ` : ''}
                            {p.name || 'Sin nombre'}
                          </span>
                        </div>
                        <span className="font-black text-blue-700 shrink-0 ml-2">
                          {p.t2} T2 ({p.ptsT2} pts)
                        </span>
                      </div>
                    ))}
                    {scoutingAnalysis.visitor.topT2.length === 0 && (
                      <p className="text-xs text-slate-400 italic py-2 text-center">
                        Sin datos suficientes
                      </p>
                    )}
                  </div>
                </div>

                {/* 4. TOP 5 T3 (TRIPLES) */}
                <div className="p-4 rounded-2xl bg-rose-50/70 border border-rose-200/80 space-y-3 shadow-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black uppercase text-rose-900 flex items-center gap-1.5">
                      <Flame className="w-4 h-4 text-rose-600" />
                      Top 5 Triples (T3)
                    </span>
                  </div>

                  <div className="space-y-2">
                    {scoutingAnalysis.visitor.topT3.map((p, idx) => (
                      <div
                        key={p.id}
                        className="flex items-center justify-between p-2 rounded-xl bg-white border border-rose-200 text-xs"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="w-5 h-5 rounded-md bg-rose-100 text-rose-800 font-black text-[10px] flex items-center justify-center shrink-0">
                            #{idx + 1}
                          </span>
                          <span className="font-bold text-slate-800 truncate">
                            {p.dorsal ? `#${p.dorsal} ` : ''}
                            {p.name || 'Sin nombre'}
                          </span>
                        </div>
                        <span className="font-black text-rose-700 shrink-0 ml-2">
                          {p.t3} T3 ({p.ptsT3} pts)
                        </span>
                      </div>
                    ))}
                    {scoutingAnalysis.visitor.topT3.length === 0 && (
                      <p className="text-xs text-slate-400 italic py-2 text-center">
                        Sin datos suficientes
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* SECCIÓN 2: TOP 5 DEL EQUIPO LOCAL */}
            <div className="bg-white rounded-3xl border border-blue-200/80 p-6 sm:p-7 shadow-sm space-y-6">
              <div className="flex items-center justify-between border-b border-blue-100 pb-3">
                <div className="flex items-center gap-2.5">
                  <span className="w-3 h-3 rounded-full bg-blue-600 animate-pulse" />
                  <h3 className="text-lg font-black text-blue-950">
                    {matchData.localTeam || 'Equipo Local'}
                  </h3>
                </div>
                <span className="text-xs font-black text-blue-800 bg-blue-50 px-3 py-1 rounded-xl border border-blue-200">
                  Total Anotado: {scoutingAnalysis.local.totalPoints} pts
                </span>
              </div>

              {/* Grid con las 4 categorías: Top 5 Anotadoras, Top 5 TL, Top 5 T2, Top 5 T3 */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* 1. TOP 5 TOTALES */}
                <div className="p-4 rounded-2xl bg-slate-900 text-white space-y-3 shadow-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black uppercase text-amber-400 flex items-center gap-1.5">
                      <Trophy className="w-4 h-4" />
                      Top 5 Puntos Totales
                    </span>
                  </div>

                  <div className="space-y-2">
                    {scoutingAnalysis.local.topOverall.map((p, idx) => (
                      <div
                        key={p.id}
                        className="flex items-center justify-between p-2 rounded-xl bg-slate-800/80 border border-slate-700/80 text-xs"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="w-5 h-5 rounded-md bg-amber-500/20 text-amber-300 font-black text-[10px] flex items-center justify-center shrink-0">
                            #{idx + 1}
                          </span>
                          <span className="font-bold truncate">
                            {p.dorsal ? `#${p.dorsal} ` : ''}
                            {p.name || 'Sin nombre'}
                          </span>
                        </div>
                        <span className="font-black text-amber-400 shrink-0 ml-2">
                          {p.totalPoints} pts
                        </span>
                      </div>
                    ))}
                    {scoutingAnalysis.local.topOverall.length === 0 && (
                      <p className="text-xs text-slate-500 italic py-2 text-center">
                        Sin datos suficientes
                      </p>
                    )}
                  </div>
                </div>

                {/* 2. TOP 5 TL */}
                <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200/80 space-y-3 shadow-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black uppercase text-amber-900 flex items-center gap-1.5">
                      <Zap className="w-4 h-4 text-amber-600" />
                      Top 5 Tiros Libres (TL)
                    </span>
                  </div>

                  <div className="space-y-2">
                    {scoutingAnalysis.local.topTL.map((p, idx) => (
                      <div
                        key={p.id}
                        className="flex items-center justify-between p-2 rounded-xl bg-white border border-amber-200 text-xs"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="w-5 h-5 rounded-md bg-amber-100 text-amber-800 font-black text-[10px] flex items-center justify-center shrink-0">
                            #{idx + 1}
                          </span>
                          <span className="font-bold text-slate-800 truncate">
                            {p.dorsal ? `#${p.dorsal} ` : ''}
                            {p.name || 'Sin nombre'}
                          </span>
                        </div>
                        <span className="font-black text-amber-700 shrink-0 ml-2">
                          {p.tl} TL ({p.ptsTL} pts)
                        </span>
                      </div>
                    ))}
                    {scoutingAnalysis.local.topTL.length === 0 && (
                      <p className="text-xs text-slate-400 italic py-2 text-center">
                        Sin datos suficientes
                      </p>
                    )}
                  </div>
                </div>

                {/* 3. TOP 5 T2 */}
                <div className="p-4 rounded-2xl bg-blue-50/70 border border-blue-200/80 space-y-3 shadow-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black uppercase text-blue-900 flex items-center gap-1.5">
                      <BarChart3 className="w-4 h-4 text-blue-600" />
                      Top 5 Tiros de 2 (T2)
                    </span>
                  </div>

                  <div className="space-y-2">
                    {scoutingAnalysis.local.topT2.map((p, idx) => (
                      <div
                        key={p.id}
                        className="flex items-center justify-between p-2 rounded-xl bg-white border border-blue-200 text-xs"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="w-5 h-5 rounded-md bg-blue-100 text-blue-800 font-black text-[10px] flex items-center justify-center shrink-0">
                            #{idx + 1}
                          </span>
                          <span className="font-bold text-slate-800 truncate">
                            {p.dorsal ? `#${p.dorsal} ` : ''}
                            {p.name || 'Sin nombre'}
                          </span>
                        </div>
                        <span className="font-black text-blue-700 shrink-0 ml-2">
                          {p.t2} T2 ({p.ptsT2} pts)
                        </span>
                      </div>
                    ))}
                    {scoutingAnalysis.local.topT2.length === 0 && (
                      <p className="text-xs text-slate-400 italic py-2 text-center">
                        Sin datos suficientes
                      </p>
                    )}
                  </div>
                </div>

                {/* 4. TOP 5 T3 */}
                <div className="p-4 rounded-2xl bg-rose-50/70 border border-rose-200/80 space-y-3 shadow-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black uppercase text-rose-900 flex items-center gap-1.5">
                      <Flame className="w-4 h-4 text-rose-600" />
                      Top 5 Triples (T3)
                    </span>
                  </div>

                  <div className="space-y-2">
                    {scoutingAnalysis.local.topT3.map((p, idx) => (
                      <div
                        key={p.id}
                        className="flex items-center justify-between p-2 rounded-xl bg-white border border-rose-200 text-xs"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="w-5 h-5 rounded-md bg-rose-100 text-rose-800 font-black text-[10px] flex items-center justify-center shrink-0">
                            #{idx + 1}
                          </span>
                          <span className="font-bold text-slate-800 truncate">
                            {p.dorsal ? `#${p.dorsal} ` : ''}
                            {p.name || 'Sin nombre'}
                          </span>
                        </div>
                        <span className="font-black text-rose-700 shrink-0 ml-2">
                          {p.t3} T3 ({p.ptsT3} pts)
                        </span>
                      </div>
                    ))}
                    {scoutingAnalysis.local.topT3.length === 0 && (
                      <p className="text-xs text-slate-400 italic py-2 text-center">
                        Sin datos suficientes
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ==========================================
  // NIVEL 2: Vista de Rival (Partidos Ida y Vuelta)
  // ==========================================
  if (selectedRival) {
    return (
      <div className="space-y-6 animate-fadeIn pb-12">
        {/* Cabecera con botón de volver al listado de 8 rivales */}
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
          {/* Tarjeta 1: Partido de Ida */}
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
                Formulario de partido, estadísticas manual/Excel y scouting Top 5 ofensivas
              </p>
            </div>

            <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400 font-medium group-hover:text-slate-600">
              <span>{selectedRival.name} • Ida</span>
              <span className="text-slate-300 group-hover:text-blue-500 font-black">Abrir Scouting →</span>
            </div>
          </div>

          {/* Tarjeta 2: Partido de Vuelta */}
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
                Formulario de partido, estadísticas manual/Excel y scouting Top 5 ofensivas
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
  // NIVEL 1: Vista principal con las 8 tarjetas
  // ==========================================
  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* Header */}
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
              Selecciona un rival para ver y analizar sus partidos
            </p>
          </div>
        </div>

        <div className="px-3.5 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-amber-400 text-xs font-black">
          8 Rivales
        </div>
      </div>

      {/* Grid de 8 tarjetas limpias */}
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
