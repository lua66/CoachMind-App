import React, { useState } from 'react';
import {
  Video,
  Plus,
  Sparkles,
  Trophy,
  Loader2,
  CheckCircle2,
  Trash2,
  AlertTriangle,
  X,
  ArrowLeft,
  UploadCloud,
  FileSpreadsheet,
  Pencil,
  ChevronRight,
  FileCheck,
  UserPlus,
  RotateCcw,
  Table,
  Calculator,
  Users,
} from 'lucide-react';
import { MatchRecord, PlayerMatchStat, Player, UserProfile, ViewMode } from '../types';
import { consumeTrialAction } from '../utils/trialManager';

interface MatchAnalysisViewProps {
  matches: MatchRecord[];
  players?: Player[];
  onAddMatch: (match: MatchRecord) => void;
  onDeleteMatch?: (id: string) => void;
  onClearMatches?: () => void;
  userProfile?: UserProfile | null;
  onCheckRegistration?: (action: () => void, notice?: string) => void;
  onNavigate?: (view: ViewMode) => void;
  onOpenTrialModal?: (mode?: 'general_action' | 'ficha_entrenador') => void;
}

export const MatchAnalysisView: React.FC<MatchAnalysisViewProps> = ({
  matches,
  players = [],
  onAddMatch,
  onDeleteMatch,
  onClearMatches,
  userProfile,
  onCheckRegistration,
  onNavigate,
  onOpenTrialModal,
}) => {
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [registerMode, setRegisterMode] = useState<'select' | 'manual' | 'file'>('select');

  // Manual & Common Form States
  const [opponent, setOpponent] = useState('');
  const [scoreUs, setScoreUs] = useState(70);
  const [scoreThem, setScoreThem] = useState(65);
  const [notes, setNotes] = useState('');

  // Player Box Score Rows State (Manual Mode)
  const [playerStatsRows, setPlayerStatsRows] = useState<PlayerMatchStat[]>([]);

  // File Upload States
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileContentText, setFileContentText] = useState<string>('');
  const [isDragging, setIsDragging] = useState<boolean>(false);

  const [isLoadingAi, setIsLoadingAi] = useState(false);
  const [selectedMatch, setSelectedMatch] = useState<MatchRecord | null>(
    matches.length > 0 ? matches[0] : null
  );

  // Custom confirmation modal states
  const [matchToDelete, setMatchToDelete] = useState<MatchRecord | null>(null);
  const [isClearAllOpen, setIsClearAllOpen] = useState(false);

  // Helper para convertir string de minutos ("20:00", "34:13", "15") a formato decimal
  const parseMinutesToDecimal = (minStr: string): number => {
    if (!minStr) return 0;
    const parts = minStr.toString().trim().split(':');
    if (parts.length === 2) {
      const m = parseFloat(parts[0]) || 0;
      const s = parseFloat(parts[1]) || 0;
      return m + (s / 60);
    }
    return parseFloat(minStr) || 0;
  };

  // Helper to calculate all dependent formulas for a player row according to exact user formulas:
  // - PTS = (2PA * 2) + (3PA * 3) + TLA
  // - VAL/PER = ( (PTS + REB + AST) - ((2PI - 2PA) + (3PI - 3PA) + (TLI - TLA)) ) / MIN
  // - +/- = (MIN / PTS) - (nuestro_tanteo - tanteo_rival)
  const calculateRowStats = (
    row: PlayerMatchStat,
    changedField?: keyof PlayerMatchStat,
    changedVal?: any,
    currentUsScore: number = scoreUs,
    currentThemScore: number = scoreThem
  ): PlayerMatchStat => {
    const updated = { ...row };
    if (changedField !== undefined) {
      (updated as any)[changedField] = changedVal;
    }

    const twoPA = Math.max(0, Number(updated.twoPA) || 0);
    let twoPI = Math.max(0, Number(updated.twoPI) || 0);
    if (twoPI < twoPA) twoPI = twoPA;

    const threePA = Math.max(0, Number(updated.threePA) || 0);
    let threePI = Math.max(0, Number(updated.threePI) || 0);
    if (threePI < threePA) threePI = threePA;

    const tlA = Math.max(0, Number(updated.tlA) || 0);
    let tlI = Math.max(0, Number(updated.tlI) || 0);
    if (tlI < tlA) tlI = tlA;

    // PTS: 2PA puntos anotados (*2), 3PA triples anotados (*3), TLA tiros libres anotados (*1)
    let pts = Number(updated.pts) || 0;
    if (changedField !== 'pts') {
      pts = twoPA * 2 + threePA * 3 + tlA;
    }

    const reb = Math.max(0, Number(updated.reb) || 0);
    const ast = Math.max(0, Number(updated.ast) || 0);
    const minDecimal = parseMinutesToDecimal(updated.min);

    // 1) VAL/PER: (Aciertos [PTS+REB+AST] - Fallos [(2PI-2PA)+(3PI-3PA)+(TLI-TLA)]) / MIN
    const missed2P = Math.max(0, twoPI - twoPA);
    const missed3P = Math.max(0, threePI - threePA);
    const missedTL = Math.max(0, tlI - tlA);
    const hits = pts + reb + ast;
    const misses = missed2P + missed3P + missedTL;
    const netValScore = hits - misses;

    const uPER = minDecimal > 0 ? netValScore / minDecimal : netValScore;
    const calculatedVal = Math.round(uPER * 100) / 100;

    let val = updated.val !== undefined ? Number(updated.val) : calculatedVal;
    if (changedField !== 'val') {
      val = calculatedVal;
    }

    // 2) +/- (Plus/Minus): (Minutos / Puntos creados jugador) - (Tanteo nuestro - Tanteo rival)
    const scoreDiff = currentUsScore - currentThemScore;
    const minPerPt = pts > 0 ? (minDecimal / pts) : 0;
    const calculatedPlusMinus = Math.round((minPerPt - scoreDiff) * 100) / 100;

    let plusMinus = Number(updated.plusMinus) || 0;
    if (changedField !== 'plusMinus') {
      plusMinus = calculatedPlusMinus;
    }

    return {
      ...updated,
      twoPA,
      twoPI,
      threePA,
      threePI,
      tlA,
      tlI,
      pts,
      reb,
      ast,
      val,
      plusMinus,
    };
  };

  // Helper to pre-populate player stats rows
  const initDefaultPlayerRows = () => {
    if (players && players.length > 0) {
      const rosterRows: PlayerMatchStat[] = players.map((p) =>
        calculateRowStats({
          id: `pstat-${p.id}`,
          name: p.name + (p.jerseyNumber ? ` (#${p.jerseyNumber})` : ''),
          jerseyNumber: p.jerseyNumber,
          min: '20:00',
          pts: 0,
          reb: 0,
          ast: 0,
          twoPA: 0,
          twoPI: 0,
          threePA: 0,
          threePI: 0,
          tlA: 0,
          tlI: 0,
          plusMinus: 0,
        }, undefined, undefined, 70, 65)
      );
      setPlayerStatsRows(rosterRows);
    } else {
      // Default initial sample rows matching the user's reference table
      setPlayerStatsRows([
        calculateRowStats({ id: 'pstat-1', name: 'Punter K.', min: '34:13', pts: 26, reb: 4, ast: 2, twoPA: 2, twoPI: 3, threePA: 7, threePI: 10, tlA: 1, tlI: 1, plusMinus: 0 }, undefined, undefined, 70, 65),
        calculateRowStats({ id: 'pstat-2', name: 'Shengelia T.', min: '29:50', pts: 15, reb: 4, ast: 5, twoPA: 4, twoPI: 6, threePA: 1, threePI: 4, tlA: 4, tlI: 7, plusMinus: 0 }, undefined, undefined, 70, 65),
        calculateRowStats({ id: 'pstat-3', name: 'Vesely J.', min: '24:48', pts: 12, reb: 8, ast: 1, twoPA: 2, twoPI: 6, threePA: 1, threePI: 2, tlA: 5, tlI: 6, plusMinus: 0 }, undefined, undefined, 70, 65),
      ]);
    }
  };

  const openAddModal = () => {
    if (!userProfile) {
      if (onOpenTrialModal) onOpenTrialModal('general_action');
      return;
    }
    setRegisterMode('select');
    setOpponent('');
    setNotes('');
    setScoreUs(70);
    setScoreThem(65);
    setSelectedFile(null);
    setFileContentText('');
    initDefaultPlayerRows();
    setIsAddOpen(true);
  };

  // Row operations for manual box score table
  const handleAddPlayerRow = () => {
    const nextNum = playerStatsRows.length + 1;
    const newRow = calculateRowStats({
      id: `pstat-${Date.now()}-${nextNum}`,
      name: `Jugador ${nextNum}`,
      min: '15:00',
      pts: 0,
      reb: 0,
      ast: 0,
      twoPA: 0,
      twoPI: 0,
      threePA: 0,
      threePI: 0,
      tlA: 0,
      tlI: 0,
      plusMinus: 0,
    });
    setPlayerStatsRows((prev) => [...prev, newRow]);
  };

  const handleRemovePlayerRow = (id: string) => {
    setPlayerStatsRows((prev) => prev.filter((row) => row.id !== id));
  };

  const handlePlayerRowChange = (id: string, field: keyof PlayerMatchStat, value: any) => {
    setPlayerStatsRows((prev) =>
      prev.map((r) => {
        if (r.id !== id) return r;
        return calculateRowStats(r, field, value);
      })
    );
  };

  const handleRecalculateAllRows = () => {
    setPlayerStatsRows((prev) => prev.map((r) => calculateRowStats(r)));
  };

  // Calculate box score aggregates
  const totalPtsFromRows = playerStatsRows.reduce((acc, r) => acc + (Number(r.pts) || 0), 0);
  const totalRebFromRows = playerStatsRows.reduce((acc, r) => acc + (Number(r.reb) || 0), 0);
  const totalAstFromRows = playerStatsRows.reduce((acc, r) => acc + (Number(r.ast) || 0), 0);
  const total2PAFromRows = playerStatsRows.reduce((acc, r) => acc + (Number(r.twoPA) || 0), 0);
  const total2PIFromRows = playerStatsRows.reduce((acc, r) => acc + (Number(r.twoPI) || 0), 0);
  const total3PAFromRows = playerStatsRows.reduce((acc, r) => acc + (Number(r.threePA) || 0), 0);
  const total3PIFromRows = playerStatsRows.reduce((acc, r) => acc + (Number(r.threePI) || 0), 0);
  const totalTLAFromRows = playerStatsRows.reduce((acc, r) => acc + (Number(r.tlA) || 0), 0);
  const totalTLIFromRows = playerStatsRows.reduce((acc, r) => acc + (Number(r.tlI) || 0), 0);
  const totalPlusMinusFromRows = playerStatsRows.reduce((acc, r) => acc + (Number(r.plusMinus) || 0), 0);
  const totalValFromRows = Math.round(
    playerStatsRows.reduce((acc, r) => acc + (Number(r.val) || 0), 0) * 10
  ) / 10;

  const syncTeamScoreWithPlayers = () => {
    if (totalPtsFromRows > 0) {
      setScoreUs(totalPtsFromRows);
      setPlayerStatsRows((prev) => prev.map((r) => calculateRowStats(r, undefined, undefined, totalPtsFromRows, scoreThem)));
    }
  };

  const handleFileChange = (file: File | null) => {
    if (!file) return;
    setSelectedFile(file);

    const rawName = file.name.replace(/\.[^/.]+$/, '');
    const cleanName = rawName
      .replace(/[_-]/g, ' ')
      .replace(/(partido|acta|estadistica|stats|baloncesto|basketball|informe|pdf|excel|csv)/gi, '')
      .trim();

    if (cleanName) {
      const formattedName = cleanName.charAt(0).toUpperCase() + cleanName.slice(1);
      setOpponent(formattedName);
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      if (text) {
        setFileContentText(text.slice(0, 5000));
      }
    };
    try {
      reader.readAsText(file);
    } catch (err) {
      console.warn('Could not read file as text:', err);
    }
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalOpponent = opponent.trim() || (selectedFile ? selectedFile.name.replace(/\.[^/.]+$/, '') : 'Rival');

    if (!finalOpponent && !selectedFile) return;

    if (!consumeTrialAction(userProfile, 'match-analysis')) {
      setIsAddOpen(false);
      if (onOpenTrialModal) onOpenTrialModal('general_action');
      return;
    }

    setIsLoadingAi(true);

    // Prepare box score text for AI prompt if manual
    let boxScoreSummaryText = '';
    if (registerMode === 'manual' && playerStatsRows.length > 0) {
      const validRows = playerStatsRows.filter((r) => r.name.trim().length > 0);
      boxScoreSummaryText = validRows
        .map(
          (r) =>
            `${r.name}: ${r.pts} pts, ${r.reb} reb, ${r.ast} ast (${r.twoPA}/${r.twoPI} 2P, ${r.threePA}/${r.threePI} 3P, ${r.tlA}/${r.tlI} TL, +/- ${r.plusMinus})`
        )
        .join('\n');
    }

    let aiAnalysis;
    try {
      const response = await fetch('/api/gemini/analyze-match', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          opponent: finalOpponent,
          scoreUs,
          scoreThem,
          notes: notes + (boxScoreSummaryText ? `\n\nESTADÍSTICAS INDIVIDUALES / BOX SCORE:\n${boxScoreSummaryText}` : ''),
          fileName: selectedFile?.name,
          fileContent: fileContentText,
        }),
      });
      const contentType = response.headers.get('content-type');
      let data;
      if (contentType && contentType.includes('application/json')) {
        data = await response.json();
      } else {
        const text = await response.text();
        console.warn('Response was not JSON:', text);
      }
      if (data && data.success) {
        aiAnalysis = data.analysis;
      }
    } catch (err) {
      console.error('Error generating AI match analysis:', err);
    } finally {
      setIsLoadingAi(false);
    }

    const savedPlayerStats =
      registerMode === 'manual'
        ? playerStatsRows.filter((r) => r.name.trim().length > 0)
        : undefined;

    const newMatch: MatchRecord = {
      id: `match-${Date.now()}`,
      opponent: finalOpponent,
      date: new Date().toISOString().split('T')[0],
      isHome: true,
      scoreUs,
      scoreThem,
      notes: notes || (selectedFile ? `Informe adjunto: ${selectedFile.name}` : 'Sin observaciones adicionales.'),
      fileName: selectedFile?.name,
      fileType: selectedFile?.type || (selectedFile?.name.endsWith('.pdf') ? 'application/pdf' : 'spreadsheet'),
      playerStats: savedPlayerStats,
      aiAnalysis,
    };

    onAddMatch(newMatch);
    setSelectedMatch(newMatch);
    setIsAddOpen(false);
    setOpponent('');
    setNotes('');
    setSelectedFile(null);
    setFileContentText('');
    setRegisterMode('select');
  };

  const confirmDeleteSingleMatch = () => {
    if (!matchToDelete || !onDeleteMatch) return;
    onDeleteMatch(matchToDelete.id);
    if (selectedMatch?.id === matchToDelete.id) {
      setSelectedMatch(null);
    }
    setMatchToDelete(null);
  };

  const confirmClearAllMatches = () => {
    if (onClearMatches) {
      onClearMatches();
    }
    setSelectedMatch(null);
    setIsClearAllOpen(false);
  };

  return (
    <div className="space-y-6 animate-fadeIn max-w-6xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-600/20 shrink-0">
            <Video className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
              Análisis de Partido
            </h1>
            <p className="text-xs text-slate-500">
              Scorecard manual por jugador, importación de actas PDF/Excel/CSV y diagnósticos tácticos con IA
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {onNavigate && (
            <button
              onClick={() => onNavigate('dashboard')}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold text-xs border border-slate-200 transition-all cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Volver</span>
            </button>
          )}

          {matches.length > 0 && onClearMatches && (
            <button
              onClick={() => setIsClearAllOpen(true)}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 font-extrabold text-xs border border-red-200 transition-all cursor-pointer"
            >
              <Trash2 className="w-4 h-4" />
              <span>Borrar todos los partidos</span>
            </button>
          )}

          <button
            onClick={openAddModal}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-md shadow-blue-600/20 transition-all hover:scale-[1.02] cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Registrar partido</span>
          </button>
        </div>
      </div>

      {/* Main Grid: Matches List vs Selected Match Analysis */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Matches List (4 cols) */}
        <div className="lg:col-span-4 space-y-3">
          <div className="flex items-center justify-between px-1">
            <h3 className="font-extrabold text-slate-900 text-sm">Partidos registrados</h3>
            <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
              {matches.length}
            </span>
          </div>

          {matches.length === 0 ? (
            <div className="p-8 bg-white rounded-2xl border border-slate-200 text-center text-xs text-slate-400 space-y-2">
              <Trophy className="w-8 h-8 text-slate-300 mx-auto" />
              <p>Aún no hay partidos registrados. ¡Añade tu primer encuentro!</p>
            </div>
          ) : (
            matches.map((m) => {
              const isWon = m.scoreUs > m.scoreThem;
              const isSelected = selectedMatch?.id === m.id;

              return (
                <div
                  key={m.id}
                  onClick={() => setSelectedMatch(m)}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer space-y-2.5 ${
                    isSelected
                      ? 'bg-blue-50/80 border-blue-500 shadow-md ring-2 ring-blue-500/20'
                      : 'bg-white border-slate-200/80 hover:bg-slate-50 shadow-sm'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-400">{m.date}</span>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                        isWon ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {isWon ? 'Victoria' : 'Derrota'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <h4 className="font-extrabold text-slate-900 text-base">vs {m.opponent}</h4>
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-lg text-slate-900">
                        {m.scoreUs} - {m.scoreThem}
                      </span>
                      {onDeleteMatch && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setMatchToDelete(m);
                          }}
                          className="p-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 transition-colors cursor-pointer ml-1"
                          title="Borrar análisis de este partido"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Attached file or Box Score badge */}
                  <div className="flex items-center gap-2 flex-wrap">
                    {m.fileName && (
                      <div className="flex items-center gap-1.5 text-[11px] font-bold text-blue-700 bg-blue-100/70 px-2.5 py-1 rounded-lg">
                        <FileSpreadsheet className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                        <span className="truncate max-w-[160px]">{m.fileName}</span>
                      </div>
                    )}
                    {m.playerStats && m.playerStats.length > 0 && (
                      <div className="flex items-center gap-1 text-[11px] font-extrabold text-amber-800 bg-amber-100/80 px-2.5 py-1 rounded-lg">
                        <Table className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                        <span>Box Score ({m.playerStats.length} jug.)</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Match Breakdown Panel (8 cols) */}
        <div className="lg:col-span-8 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm min-h-[400px]">
          {selectedMatch ? (
            <div className="space-y-6">
              <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                <div>
                  <h2 className="text-2xl font-extrabold text-slate-900">
                    vs {selectedMatch.opponent}
                  </h2>
                  <p className="text-xs text-slate-500">Fecha: {selectedMatch.date}</p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <div className="text-3xl font-black text-slate-900">
                      {selectedMatch.scoreUs} - {selectedMatch.scoreThem}
                    </div>
                  </div>
                  {onDeleteMatch && (
                    <button
                      type="button"
                      onClick={() => setMatchToDelete(selectedMatch)}
                      className="px-3.5 py-2 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 font-extrabold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                      <span>Eliminar partido</span>
                    </button>
                  )}
                </div>
              </div>

              {/* File badge if match has attached file */}
              {selectedMatch.fileName && (
                <div className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-bold">
                  <FileCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Documento oficial importado: <strong>{selectedMatch.fileName}</strong></span>
                </div>
              )}

              {/* Box Score Stat Sheet Table (If playerStats present) */}
              {selectedMatch.playerStats && selectedMatch.playerStats.length > 0 && (
                <div className="space-y-3 pt-1">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-extrabold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                      <Table className="w-4 h-4 text-blue-600" />
                      <span>Scorecard / Estadísticas de Jugadores</span>
                    </h4>
                    <span className="text-[11px] font-bold text-slate-400">
                      {selectedMatch.playerStats.length} Jugadores anotados
                    </span>
                  </div>

                  <div className="overflow-x-auto rounded-2xl border border-slate-200/90 shadow-sm bg-white">
                    <table className="w-full text-left text-xs text-slate-700 border-collapse">
                      <thead>
                        <tr className="bg-slate-100/90 text-[11px] font-extrabold text-slate-600 border-b border-slate-200">
                          <th className="py-2.5 px-3">JUGADOR</th>
                          <th className="py-2.5 px-2 text-center bg-amber-50/80 text-amber-900">PTS</th>
                          <th className="py-2.5 px-2 text-center">REB</th>
                          <th className="py-2.5 px-2 text-center">AST</th>
                          <th className="py-2.5 px-2 text-center">MIN</th>
                          <th className="py-2.5 px-2 text-center">2PA</th>
                          <th className="py-2.5 px-2 text-center text-slate-400">2PI</th>
                          <th className="py-2.5 px-2 text-center">3PA</th>
                          <th className="py-2.5 px-2 text-center text-slate-400">3PI</th>
                          <th className="py-2.5 px-2 text-center">TLA</th>
                          <th className="py-2.5 px-2 text-center text-slate-400">TLI</th>
                          <th className="py-2.5 px-2 text-center bg-blue-50/80 text-blue-900">+/-</th>
                          <th className="py-2.5 px-2 text-center bg-emerald-50/80 text-emerald-900" title="Valoración FIBA / PER">VAL/PER</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-medium">
                        {selectedMatch.playerStats.map((row) => {
                          const valCalc =
                            row.val !== undefined
                              ? row.val
                              : row.pts +
                                row.reb +
                                row.ast -
                                (Math.max(0, row.twoPI - row.twoPA) +
                                  Math.max(0, row.threePI - row.threePA) +
                                  Math.max(0, row.tlI - row.tlA));
                          return (
                            <tr key={row.id} className="hover:bg-slate-50 transition-colors">
                              <td className="py-2 px-3 font-bold text-slate-900 flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0" />
                                <span className="truncate">{row.name}</span>
                              </td>
                              <td className="py-2 px-2 text-center font-black text-slate-900 bg-amber-50/50">
                                {row.pts}
                              </td>
                              <td className="py-2 px-2 text-center font-bold text-slate-700">{row.reb}</td>
                              <td className="py-2 px-2 text-center font-bold text-slate-700">{row.ast}</td>
                              <td className="py-2 px-2 text-center text-slate-500 font-mono text-[11px]">{row.min}</td>
                              <td className="py-2 px-2 text-center text-slate-800">{row.twoPA}</td>
                              <td className="py-2 px-2 text-center text-slate-400">{row.twoPI}</td>
                              <td className="py-2 px-2 text-center text-slate-800">{row.threePA}</td>
                              <td className="py-2 px-2 text-center text-slate-400">{row.threePI}</td>
                              <td className="py-2 px-2 text-center text-slate-800">{row.tlA}</td>
                              <td className="py-2 px-2 text-center text-slate-400">{row.tlI}</td>
                              <td className={`py-2 px-2 text-center font-bold ${row.plusMinus >= 0 ? 'text-blue-600' : 'text-red-500'}`}>
                                {row.plusMinus >= 0 ? `+${row.plusMinus}` : row.plusMinus}
                              </td>
                              <td className="py-2 px-2 text-center font-black text-emerald-700 bg-emerald-50/40">
                                {valCalc}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                      {/* Summary Totals Row */}
                      <tfoot>
                        <tr className="bg-slate-100/90 font-black text-[11px] text-slate-900 border-t-2 border-slate-300">
                          <td className="py-2.5 px-3 uppercase tracking-wider">TOTALES</td>
                          <td className="py-2.5 px-2 text-center text-amber-700 text-sm">
                            {selectedMatch.playerStats.reduce((a, b) => a + (b.pts || 0), 0)}
                          </td>
                          <td className="py-2.5 px-2 text-center">
                            {selectedMatch.playerStats.reduce((a, b) => a + (b.reb || 0), 0)}
                          </td>
                          <td className="py-2.5 px-2 text-center">
                            {selectedMatch.playerStats.reduce((a, b) => a + (b.ast || 0), 0)}
                          </td>
                          <td className="py-2.5 px-2 text-center text-slate-400">-</td>
                          <td className="py-2.5 px-2 text-center">
                            {selectedMatch.playerStats.reduce((a, b) => a + (b.twoPA || 0), 0)}
                          </td>
                          <td className="py-2.5 px-2 text-center text-slate-500">
                            {selectedMatch.playerStats.reduce((a, b) => a + (b.twoPI || 0), 0)}
                          </td>
                          <td className="py-2.5 px-2 text-center">
                            {selectedMatch.playerStats.reduce((a, b) => a + (b.threePA || 0), 0)}
                          </td>
                          <td className="py-2.5 px-2 text-center text-slate-500">
                            {selectedMatch.playerStats.reduce((a, b) => a + (b.threePI || 0), 0)}
                          </td>
                          <td className="py-2.5 px-2 text-center">
                            {selectedMatch.playerStats.reduce((a, b) => a + (b.tlA || 0), 0)}
                          </td>
                          <td className="py-2.5 px-2 text-center text-slate-500">
                            {selectedMatch.playerStats.reduce((a, b) => a + (b.tlI || 0), 0)}
                          </td>
                          <td className="py-2.5 px-2 text-center text-blue-700">
                            {selectedMatch.playerStats.reduce((a, b) => a + (b.plusMinus || 0), 0)}
                          </td>
                          <td className="py-2.5 px-2 text-center text-emerald-800 font-extrabold">
                            {selectedMatch.playerStats.reduce(
                              (a, b) =>
                                a +
                                (b.val !== undefined
                                  ? b.val
                                  : b.pts +
                                    b.reb +
                                    b.ast -
                                    (Math.max(0, b.twoPI - b.twoPA) +
                                      Math.max(0, b.threePI - b.threePA) +
                                      Math.max(0, b.tlI - b.tlA))),
                              0
                            )}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
              )}

              {/* Notes */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1">
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Observaciones del entrenador
                </h4>
                <p className="text-xs text-slate-800 leading-relaxed whitespace-pre-line">{selectedMatch.notes}</p>
              </div>

              {/* AI Analysis */}
              {selectedMatch.aiAnalysis ? (
                <div className="space-y-4 pt-2">
                  <div className="flex items-center gap-2 text-sm font-bold text-blue-600">
                    <Sparkles className="w-4 h-4 text-amber-500" />
                    <span>Diagnóstico táctico generado por CoachMind AI</span>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-center">
                    <div className="p-3.5 rounded-2xl bg-blue-50 border border-blue-200/60">
                      <span className="text-[10px] font-bold text-blue-600 uppercase">
                        Eficiencia Ofensiva
                      </span>
                      <p className="text-lg font-extrabold text-blue-900">
                        {selectedMatch.aiAnalysis.offensiveRating}
                      </p>
                    </div>
                    <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200/60">
                      <span className="text-[10px] font-bold text-emerald-600 uppercase">
                        Solidez Defensiva
                      </span>
                      <p className="text-lg font-extrabold text-emerald-900">
                        {selectedMatch.aiAnalysis.defensiveRating}
                      </p>
                    </div>
                  </div>

                  {/* Takeaways */}
                  <div className="p-4 rounded-2xl bg-slate-900 text-white space-y-2">
                    <h4 className="text-xs font-bold text-amber-400 uppercase tracking-wider">
                      Puntos Clave del Encuentro
                    </h4>
                    <ul className="space-y-1.5 text-xs text-slate-300">
                      {selectedMatch.aiAnalysis.keyTakeaways.map((t, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                          <span>{t}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Recommended Drills */}
                  <div className="p-4 rounded-2xl bg-amber-50/80 border border-amber-200/80 space-y-2">
                    <h4 className="text-xs font-bold text-amber-900 uppercase tracking-wider">
                      Ejercicios de corrección para el próximo entrenamiento
                    </h4>
                    <ul className="space-y-1 text-xs text-amber-900">
                      {selectedMatch.aiAnalysis.recommendedDrills.map((d, idx) => (
                        <li key={idx}>🏀 {d}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              ) : (
                <div className="py-8 text-center text-xs text-slate-400">
                  Sin análisis de IA adjunto para este encuentro.
                </div>
              )}
            </div>
          ) : (
            <div className="py-24 text-center text-xs text-slate-400">
              Selecciona un partido de la lista para ver el desglose o registra uno nuevo.
            </div>
          )}
        </div>
      </div>

      {/* Add Match Modal */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className={`bg-white rounded-3xl w-full shadow-2xl p-6 sm:p-7 space-y-5 border border-slate-200 animate-scaleUp relative my-auto ${
            registerMode === 'manual' ? 'max-w-4xl' : 'max-w-lg'
          }`}>
            <button
              type="button"
              onClick={() => setIsAddOpen(false)}
              className="absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            {/* MODE 1: SELECT MODE (2 BUTTONS: MANUAL OR FILE) */}
            {registerMode === 'select' && (
              <div className="space-y-6">
                <div>
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 text-blue-700 font-extrabold text-[11px] mb-2 border border-blue-200/60">
                    <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                    <span>Opciones de Registro Profesional</span>
                  </div>
                  <h3 className="text-xl font-black text-slate-900 tracking-tight">Registrar Nuevo Partido</h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Elige el método de registro para proceder con tu análisis táctico:
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Option A: Manual */}
                  <button
                    type="button"
                    onClick={() => setRegisterMode('manual')}
                    className="p-5 rounded-2xl border-2 border-slate-200 hover:border-blue-500 bg-slate-50/50 hover:bg-blue-50/30 transition-all text-left flex flex-col justify-between space-y-4 group cursor-pointer shadow-sm hover:shadow-md"
                  >
                    <div className="space-y-3">
                      <div className="w-11 h-11 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-600/20 group-hover:scale-110 transition-transform">
                        <Pencil className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-[10px] font-extrabold text-blue-600 bg-blue-100 px-2 py-0.5 rounded-md uppercase">
                            Entrada Directa / Box Score
                          </span>
                        </div>
                        <h4 className="font-extrabold text-slate-900 text-base group-hover:text-blue-700 transition-colors">
                          Registro Manual
                        </h4>
                      </div>
                      <p className="text-xs text-slate-500 leading-relaxed">
                        Formulario con Scorecard completo por jugadores (puntos, rebotes, asistencias, tiros y +/-).
                      </p>
                    </div>

                    <div className="flex items-center gap-1.5 text-xs font-bold text-blue-600 group-hover:translate-x-1 transition-transform pt-2">
                      <span>Abrir formulario y score</span>
                      <ChevronRight className="w-4 h-4" />
                    </div>
                  </button>

                  {/* Option B: Upload File (PDF / Excel / CSV) */}
                  <button
                    type="button"
                    onClick={() => setRegisterMode('file')}
                    className="p-5 rounded-2xl border-2 border-slate-200 hover:border-emerald-500 bg-slate-50/50 hover:bg-emerald-50/30 transition-all text-left flex flex-col justify-between space-y-4 group cursor-pointer shadow-sm hover:shadow-md"
                  >
                    <div className="space-y-3">
                      <div className="w-11 h-11 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-md shadow-emerald-600/20 group-hover:scale-110 transition-transform">
                        <UploadCloud className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-[10px] font-extrabold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-md uppercase">
                            Pro / Importación
                          </span>
                        </div>
                        <h4 className="font-extrabold text-slate-900 text-base group-hover:text-emerald-700 transition-colors">
                          Subir Archivo (PDF, Excel, CSV)
                        </h4>
                      </div>
                      <p className="text-xs text-slate-500 leading-relaxed">
                        Carga el acta oficial, hoja de cálculo (.xlsx/.csv) o informe en PDF para un diagnóstico exhaustivo.
                      </p>
                    </div>

                    <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-600 group-hover:translate-x-1 transition-transform pt-2">
                      <span>Subir archivo</span>
                      <ChevronRight className="w-4 h-4" />
                    </div>
                  </button>
                </div>
              </div>
            )}

            {/* MODE 2: MANUAL ENTRY FORM WITH PLAYER SCORECARD TABLE */}
            {registerMode === 'manual' && (
              <div className="space-y-5">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setRegisterMode('select')}
                      className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 transition-all cursor-pointer"
                      title="Volver a la selección de opciones"
                    >
                      <ArrowLeft className="w-4 h-4" />
                    </button>
                    <div>
                      <h3 className="text-lg font-extrabold text-slate-900">Registro Manual & Box Score de Jugadores</h3>
                      <p className="text-[11px] text-slate-500">Formulario profesional de estadísticas del partido</p>
                    </div>
                  </div>

                  {totalPtsFromRows > 0 && (
                    <button
                      type="button"
                      onClick={syncTeamScoreWithPlayers}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 font-extrabold text-xs transition-all cursor-pointer"
                      title="Actualizar nuestro tanteo con la suma de puntos del equipo"
                    >
                      <Calculator className="w-3.5 h-3.5 text-amber-600" />
                      <span>Sincronizar tanteo ({totalPtsFromRows} pts)</span>
                    </button>
                  )}
                </div>

                <form onSubmit={handleAddSubmit} className="space-y-5">
                  {/* Basic Match Data Header */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="sm:col-span-1">
                      <label className="block text-xs font-bold text-slate-700 mb-1">Nombre del Rival *</label>
                      <input
                        type="text"
                        required
                        value={opponent}
                        onChange={(e) => setOpponent(e.target.value)}
                        placeholder="Ej. CB San Fernando"
                        className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 font-bold"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Nuestro Tanteo</label>
                      <input
                        type="number"
                        value={scoreUs}
                        onChange={(e) => {
                          const newUs = Number(e.target.value);
                          setScoreUs(newUs);
                          setPlayerStatsRows((prev) => prev.map((r) => calculateRowStats(r, undefined, undefined, newUs, scoreThem)));
                        }}
                        className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 font-black text-blue-700"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Tanteo Rival</label>
                      <input
                        type="number"
                        value={scoreThem}
                        onChange={(e) => {
                          const newThem = Number(e.target.value);
                          setScoreThem(newThem);
                          setPlayerStatsRows((prev) => prev.map((r) => calculateRowStats(r, undefined, undefined, scoreUs, newThem)));
                        }}
                        className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 font-black text-red-600"
                      />
                    </div>
                  </div>

                  {/* BOX SCORE / PLAYER STATS TABLE (MATCHING THE USER'S REFERENCE IMAGE) */}
                  <div className="space-y-2 pt-1">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Table className="w-4 h-4 text-blue-600" />
                        <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider">
                          Estadísticas de Jugadores (Box Score)
                        </h4>
                      </div>

                      <div className="flex items-center gap-2 flex-wrap">
                        <button
                          type="button"
                          onClick={handleRecalculateAllRows}
                          className="px-2.5 py-1 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 font-extrabold text-[11px] flex items-center gap-1 border border-amber-200 cursor-pointer"
                          title="Recalcular puntos, valoración PER y diferenciales"
                        >
                          <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                          <span>Recalcular Fórmulas</span>
                        </button>

                        {players.length > 0 && (
                          <button
                            type="button"
                            onClick={initDefaultPlayerRows}
                            className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[11px] flex items-center gap-1 border border-slate-200 cursor-pointer"
                          >
                            <Users className="w-3.5 h-3.5 text-blue-600" />
                            <span>Plantilla ({players.length})</span>
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={handleAddPlayerRow}
                          className="px-2.5 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 font-extrabold text-[11px] flex items-center gap-1 border border-blue-200 cursor-pointer"
                        >
                          <UserPlus className="w-3.5 h-3.5" />
                          <span>+ Añadir Jugador</span>
                        </button>
                      </div>
                    </div>

                    {/* Table Container with Horizontal Scrollbar */}
                    <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm max-h-[320px] overflow-y-auto">
                      <table className="w-full text-left text-xs border-collapse min-w-[780px]">
                        <thead className="sticky top-0 bg-slate-100 text-[11px] font-black text-slate-600 border-b border-slate-200 z-10">
                          <tr>
                            <th className="py-2.5 px-3 min-w-[130px]">JUGADOR</th>
                            <th className="py-2.5 px-1 text-center w-12">MIN</th>
                            <th className="py-2.5 px-1 text-center w-12 bg-amber-100/80 text-amber-900">PTS</th>
                            <th className="py-2.5 px-1 text-center w-11">REB</th>
                            <th className="py-2.5 px-1 text-center w-11">AST</th>
                            <th className="py-2.5 px-1 text-center w-11">2PA</th>
                            <th className="py-2.5 px-1 text-center w-11 text-slate-400">2PI</th>
                            <th className="py-2.5 px-1 text-center w-11">3PA</th>
                            <th className="py-2.5 px-1 text-center w-11 text-slate-400">3PI</th>
                            <th className="py-2.5 px-1 text-center w-11">TLA</th>
                            <th className="py-2.5 px-1 text-center w-11 text-slate-400">TLI</th>
                            <th className="py-2.5 px-1 text-center w-12 bg-blue-50 text-blue-900">+/-</th>
                            <th className="py-2.5 px-1 text-center w-14 bg-emerald-50 text-emerald-900" title="Valoración / PER (PTS + REB + AST - Tiros Fallados)">VAL/PER</th>
                            <th className="py-2.5 px-2 text-center w-8"></th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-medium">
                          {playerStatsRows.map((r, idx) => {
                            const calculatedVal = r.val !== undefined ? r.val : 0;
                            return (
                              <tr key={r.id} className="hover:bg-slate-50 transition-colors">
                                {/* Name Input */}
                                <td className="py-1.5 px-2">
                                  <input
                                    type="text"
                                    value={r.name}
                                    onChange={(e) => handlePlayerRowChange(r.id, 'name', e.target.value)}
                                    placeholder={`Jugador ${idx + 1}`}
                                    className="w-full px-2 py-1 rounded-lg bg-slate-50 border border-slate-200 text-xs font-extrabold text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                  />
                                </td>
                                {/* MIN */}
                                <td className="py-1.5 px-1">
                                  <input
                                    type="text"
                                    value={r.min}
                                    onChange={(e) => handlePlayerRowChange(r.id, 'min', e.target.value)}
                                    placeholder="20:00"
                                    className="w-full px-1 py-1 text-center rounded-lg bg-slate-50 border border-slate-200 text-[11px] font-mono text-slate-600 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                  />
                                </td>
                                {/* PTS (Auto-calculated from shots) */}
                                <td className="py-1.5 px-1 bg-amber-50/50">
                                  <input
                                    type="number"
                                    value={r.pts}
                                    onChange={(e) => handlePlayerRowChange(r.id, 'pts', e.target.value === '' ? 0 : Number(e.target.value))}
                                    className="w-full px-1 py-1 text-center rounded-lg bg-amber-100/80 border border-amber-300 text-xs font-black text-amber-900 focus:outline-none"
                                  />
                                </td>
                                {/* REB */}
                                <td className="py-1.5 px-1">
                                  <input
                                    type="number"
                                    value={r.reb}
                                    onChange={(e) => handlePlayerRowChange(r.id, 'reb', e.target.value === '' ? 0 : Number(e.target.value))}
                                    className="w-full px-1 py-1 text-center rounded-lg bg-slate-50 border border-slate-200 text-xs font-bold text-slate-800 focus:outline-none"
                                  />
                                </td>
                                {/* AST */}
                                <td className="py-1.5 px-1">
                                  <input
                                    type="number"
                                    value={r.ast}
                                    onChange={(e) => handlePlayerRowChange(r.id, 'ast', e.target.value === '' ? 0 : Number(e.target.value))}
                                    className="w-full px-1 py-1 text-center rounded-lg bg-slate-50 border border-slate-200 text-xs font-bold text-slate-800 focus:outline-none"
                                  />
                                </td>
                                {/* 2PA */}
                                <td className="py-1.5 px-1">
                                  <input
                                    type="number"
                                    value={r.twoPA}
                                    onChange={(e) => handlePlayerRowChange(r.id, 'twoPA', e.target.value === '' ? 0 : Number(e.target.value))}
                                    className="w-full px-1 py-1 text-center rounded-lg bg-slate-50 border border-slate-200 text-xs font-bold text-slate-800 focus:outline-none"
                                  />
                                </td>
                                {/* 2PI */}
                                <td className="py-1.5 px-1">
                                  <input
                                    type="number"
                                    value={r.twoPI}
                                    onChange={(e) => handlePlayerRowChange(r.id, 'twoPI', e.target.value === '' ? 0 : Number(e.target.value))}
                                    className="w-full px-1 py-1 text-center rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-500 focus:outline-none"
                                  />
                                </td>
                                {/* 3PA */}
                                <td className="py-1.5 px-1">
                                  <input
                                    type="number"
                                    value={r.threePA}
                                    onChange={(e) => handlePlayerRowChange(r.id, 'threePA', e.target.value === '' ? 0 : Number(e.target.value))}
                                    className="w-full px-1 py-1 text-center rounded-lg bg-slate-50 border border-slate-200 text-xs font-bold text-slate-800 focus:outline-none"
                                  />
                                </td>
                                {/* 3PI */}
                                <td className="py-1.5 px-1">
                                  <input
                                    type="number"
                                    value={r.threePI}
                                    onChange={(e) => handlePlayerRowChange(r.id, 'threePI', e.target.value === '' ? 0 : Number(e.target.value))}
                                    className="w-full px-1 py-1 text-center rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-500 focus:outline-none"
                                  />
                                </td>
                                {/* TLA */}
                                <td className="py-1.5 px-1">
                                  <input
                                    type="number"
                                    value={r.tlA}
                                    onChange={(e) => handlePlayerRowChange(r.id, 'tlA', e.target.value === '' ? 0 : Number(e.target.value))}
                                    className="w-full px-1 py-1 text-center rounded-lg bg-slate-50 border border-slate-200 text-xs font-bold text-slate-800 focus:outline-none"
                                  />
                                </td>
                                {/* TLI */}
                                <td className="py-1.5 px-1">
                                  <input
                                    type="number"
                                    value={r.tlI}
                                    onChange={(e) => handlePlayerRowChange(r.id, 'tlI', e.target.value === '' ? 0 : Number(e.target.value))}
                                    className="w-full px-1 py-1 text-center rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-500 focus:outline-none"
                                  />
                                </td>
                                {/* +/- */}
                                <td className="py-1.5 px-1 bg-blue-50/40">
                                  <input
                                    type="number"
                                    step="0.01"
                                    value={r.plusMinus}
                                    onChange={(e) => handlePlayerRowChange(r.id, 'plusMinus', e.target.value === '' ? 0 : Number(e.target.value))}
                                    className="w-full px-1 py-1 text-center rounded-lg bg-white border border-blue-200 text-xs font-black text-blue-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                  />
                                </td>
                                {/* VAL / PER */}
                                <td className="py-1.5 px-1 bg-emerald-50/40">
                                  <input
                                    type="number"
                                    step="0.01"
                                    value={calculatedVal}
                                    onChange={(e) => handlePlayerRowChange(r.id, 'val', e.target.value === '' ? 0 : Number(e.target.value))}
                                    className="w-full px-1 py-1 text-center rounded-lg bg-emerald-100/70 border border-emerald-300 text-xs font-black text-emerald-900 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                                    title="Valoración FIBA / PER = (PTS + REB + AST - Fallos) / MIN"
                                  />
                                </td>
                                {/* Action Delete */}
                                <td className="py-1.5 px-1 text-center">
                                  <button
                                    type="button"
                                    onClick={() => handleRemovePlayerRow(r.id)}
                                    className="p-1 rounded text-red-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                                    title="Eliminar fila de jugador"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                        <tfoot className="bg-slate-100 font-black text-[11px] text-slate-900 border-t-2 border-slate-300 sticky bottom-0 z-10">
                          <tr>
                            <td className="py-2 px-3">TOTAL EQUIPO</td>
                            <td className="py-2 px-1 text-center text-slate-400">-</td>
                            <td className="py-2 px-1 text-center text-amber-800 text-xs font-black">{totalPtsFromRows}</td>
                            <td className="py-2 px-1 text-center">{totalRebFromRows}</td>
                            <td className="py-2 px-1 text-center">{totalAstFromRows}</td>
                            <td className="py-2 px-1 text-center">{total2PAFromRows}</td>
                            <td className="py-2 px-1 text-center text-slate-500">{total2PIFromRows}</td>
                            <td className="py-2 px-1 text-center">{total3PAFromRows}</td>
                            <td className="py-2 px-1 text-center text-slate-500">{total3PIFromRows}</td>
                            <td className="py-2 px-1 text-center">{totalTLAFromRows}</td>
                            <td className="py-2 px-1 text-center text-slate-500">{totalTLIFromRows}</td>
                            <td className="py-2 px-1 text-center text-blue-700 font-black">{totalPlusMinusFromRows}</td>
                            <td className="py-2 px-1 text-center text-emerald-800 font-black">{totalValFromRows}</td>
                            <td></td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Observaciones / Notas tácticas del partido
                    </label>
                    <textarea
                      rows={2}
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Ej. Sufrimos en el rebote defensivo y cometimos muchas pérdidas en el 4º cuarto..."
                      className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 resize-none"
                    />
                  </div>

                  <div className="pt-2 flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setRegisterMode('select')}
                      className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs cursor-pointer"
                    >
                      Volver
                    </button>
                    <button
                      type="submit"
                      disabled={isLoadingAi || !opponent.trim()}
                      className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center gap-2 shadow-md shadow-blue-600/20 cursor-pointer disabled:opacity-50"
                    >
                      {isLoadingAi ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>Generando diagnóstico táctico...</span>
                        </>
                      ) : (
                        <span>Guardar y Analizar Partido</span>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* MODE 3: FILE UPLOAD FORM */}
            {registerMode === 'file' && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                  <button
                    type="button"
                    onClick={() => setRegisterMode('select')}
                    className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 transition-all cursor-pointer"
                    title="Volver a la selección de opciones"
                  >
                    <ArrowLeft className="w-4 h-4" />
                  </button>
                  <div>
                    <h3 className="text-lg font-extrabold text-slate-900">Subir Archivo Profesional</h3>
                    <p className="text-[11px] text-slate-500">Carga actas o informes en PDF, Excel (.xlsx/.xls) o CSV</p>
                  </div>
                </div>

                <form onSubmit={handleAddSubmit} className="space-y-4">
                  {/* Dropzone */}
                  {!selectedFile ? (
                    <div
                      onDragOver={(e) => {
                        e.preventDefault();
                        setIsDragging(true);
                      }}
                      onDragLeave={() => setIsDragging(false)}
                      onDrop={(e) => {
                        e.preventDefault();
                        setIsDragging(false);
                        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                          handleFileChange(e.dataTransfer.files[0]);
                        }
                      }}
                      className={`border-2 border-dashed rounded-2xl p-6 text-center transition-all flex flex-col items-center justify-center space-y-3 cursor-pointer ${
                        isDragging
                          ? 'border-emerald-500 bg-emerald-50/50 scale-[1.01]'
                          : 'border-slate-300 hover:border-emerald-400 bg-slate-50/60 hover:bg-emerald-50/20'
                      }`}
                      onClick={() => {
                        const input = document.getElementById('match-file-input');
                        if (input) input.click();
                      }}
                    >
                      <input
                        id="match-file-input"
                        type="file"
                        accept=".pdf,.xlsx,.xls,.csv,.txt"
                        className="hidden"
                        onChange={(e) => {
                          if (e.target.files && e.target.files[0]) {
                            handleFileChange(e.target.files[0]);
                          }
                        }}
                      />
                      <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center shadow-sm">
                        <UploadCloud className="w-6 h-6" />
                      </div>
                      <div>
                        <p className="text-xs font-extrabold text-slate-800">
                          Haz clic para examinar o arrastra tu archivo aquí
                        </p>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          Formatos soportados: PDF, Excel (.xlsx, .xls), CSV, TXT (hasta 10 MB)
                        </p>
                      </div>

                      <div className="flex items-center gap-2 pt-1">
                        <span className="px-2 py-0.5 bg-red-100 text-red-700 font-extrabold text-[10px] rounded-md">
                          PDF
                        </span>
                        <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 font-extrabold text-[10px] rounded-md">
                          EXCEL
                        </span>
                        <span className="px-2 py-0.5 bg-blue-100 text-blue-800 font-extrabold text-[10px] rounded-md">
                          CSV
                        </span>
                      </div>
                    </div>
                  ) : (
                    /* Selected file state */
                    <div className="p-4 rounded-2xl bg-emerald-50/80 border border-emerald-200 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-md">
                          <FileSpreadsheet className="w-5 h-5" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-extrabold text-slate-900 truncate">
                            {selectedFile.name}
                          </p>
                          <p className="text-[10px] font-bold text-emerald-700">
                            {(selectedFile.size / 1024).toFixed(1)} KB • Archivo cargado
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          setSelectedFile(null);
                          setFileContentText('');
                        }}
                        className="px-3 py-1.5 rounded-lg bg-white border border-emerald-200 hover:bg-emerald-100 text-emerald-800 font-extrabold text-[11px] shrink-0 transition-all cursor-pointer"
                      >
                        Cambiar
                      </button>
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Nombre del Rival *</label>
                    <input
                      type="text"
                      required
                      value={opponent}
                      onChange={(e) => setOpponent(e.target.value)}
                      placeholder="Ej. CB San Fernando (detectado o editable)"
                      className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/20 font-medium"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Nuestro Tanteo <span className="text-[10px] font-normal text-slate-400">(opcional)</span>
                      </label>
                      <input
                        type="number"
                        value={scoreUs}
                        onChange={(e) => setScoreUs(Number(e.target.value))}
                        className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/20 font-bold"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Tanteo Rival <span className="text-[10px] font-normal text-slate-400">(opcional)</span>
                      </label>
                      <input
                        type="number"
                        value={scoreThem}
                        onChange={(e) => setScoreThem(Number(e.target.value))}
                        className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/20 font-bold"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Observaciones adicionales <span className="text-[10px] font-normal text-slate-400">(opcional)</span>
                    </label>
                    <textarea
                      rows={2}
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Notas adicionales para complementar los datos extraídos del archivo..."
                      className="w-full p-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/20 resize-none"
                    />
                  </div>

                  <div className="pt-2 flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setRegisterMode('select')}
                      className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs cursor-pointer"
                    >
                      Volver
                    </button>
                    <button
                      type="submit"
                      disabled={isLoadingAi || (!selectedFile && !opponent.trim())}
                      className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-2 shadow-md shadow-emerald-600/20 cursor-pointer disabled:opacity-50"
                    >
                      {isLoadingAi ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>Procesando archivo con IA...</span>
                        </>
                      ) : (
                        <span>Procesar Archivo y Analizar</span>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Delete Single Match Confirmation Modal */}
      {matchToDelete && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 space-y-4 border border-slate-200 shadow-2xl animate-scaleUp">
            <div className="w-12 h-12 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1">
              <h3 className="font-extrabold text-slate-900 text-lg">¿Borrar este partido?</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Se eliminará permanentemente el análisis y marcador de{' '}
                <strong className="text-slate-800">vs {matchToDelete.opponent}</strong>.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                onClick={() => setMatchToDelete(null)}
                className="py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={confirmDeleteSingleMatch}
                className="py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs shadow-md shadow-red-600/20 cursor-pointer"
              >
                Sí, borrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Clear ALL Matches Confirmation Modal */}
      {isClearAllOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 space-y-4 border border-slate-200 shadow-2xl animate-scaleUp">
            <div className="w-12 h-12 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1">
              <h3 className="font-extrabold text-slate-900 text-lg">¿Borrar TODOS los partidos?</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Esta acción eliminará de forma irreversible todos los registros de partidos y diagnósticos tácticos.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsClearAllOpen(false)}
                className="py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={confirmClearAllMatches}
                className="py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs shadow-md shadow-red-600/20 cursor-pointer"
              >
                Sí, borrar todo
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
