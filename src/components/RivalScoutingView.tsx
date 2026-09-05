import React, { useState, useEffect } from 'react';
import {
  Target,
  Shield,
  Search,
  Plus,
  Edit2,
  Check,
  X,
  FileText,
  Calendar,
  Zap,
  TrendingUp,
  AlertTriangle,
  UserCheck,
  ChevronRight,
  Sparkles,
  Info,
  Layers,
  Award,
} from 'lucide-react';
import { UserProfile } from '../types';

export interface RivalTeam {
  id: string;
  rivalNumber: number;
  name: string;
  shortName: string;
  city: string;
  primaryColor: string;
  secondaryColor: string;
  record: {
    won: number;
    lost: number;
  };
  styleTags: string[];
  keyStrengths: string[];
  keyWeaknesses: string[];
  nextMatchDate?: string;
  matchLeg?: 'Ida' | 'Vuelta' | 'Pendiente';
  notes: string;
  starredPlayersCount?: number;
}

const DEFAULT_RIVALS: RivalTeam[] = [
  {
    id: 'rival-1',
    rivalNumber: 1,
    name: 'Rival 1',
    shortName: 'RIV-1',
    city: 'Por definir',
    primaryColor: '#EF4444', // Red
    secondaryColor: '#991B1B',
    record: { won: 0, lost: 0 },
    styleTags: ['Juego Rápido', 'Transición Ofensiva'],
    keyStrengths: ['Presión a toda pista', 'Tiro exterior'],
    keyWeaknesses: ['Rebote defensivo', 'Balance en repliegue'],
    nextMatchDate: 'Próxima Jornada',
    matchLeg: 'Ida',
    notes: 'Primer rival de la competición. Espacio listo para detallar sistemas ofensivos, jugadoras clave y plan de partido.',
    starredPlayersCount: 0,
  },
  {
    id: 'rival-2',
    rivalNumber: 2,
    name: 'Rival 2',
    shortName: 'RIV-2',
    city: 'Por definir',
    primaryColor: '#3B82F6', // Blue
    secondaryColor: '#1E40AF',
    record: { won: 0, lost: 0 },
    styleTags: ['Defensa en Zona 2-3', 'Ritmo Pausado'],
    keyStrengths: ['Poder interior', 'Cierre del rebote'],
    keyWeaknesses: ['Ataque contra presión', 'Tiro libre'],
    nextMatchDate: 'Pendiente',
    matchLeg: 'Ida',
    notes: 'Segundo rival. Scouting disponible para análisis de quintetos y situaciones especiales.',
    starredPlayersCount: 0,
  },
  {
    id: 'rival-3',
    rivalNumber: 3,
    name: 'Rival 3',
    shortName: 'RIV-3',
    city: 'Por definir',
    primaryColor: '#10B981', // Emerald
    secondaryColor: '#065F46',
    record: { won: 0, lost: 0 },
    styleTags: ['Pick & Roll Central', 'Presión 1-2-1-1'],
    keyStrengths: ['Base directora dominante', 'Intensidad física'],
    keyWeaknesses: ['Profundidad de banquillo', 'Faltas personales'],
    nextMatchDate: 'Pendiente',
    matchLeg: 'Ida',
    notes: 'Tercer rival. Configura los emparejamientos defensivos y las normas tácticas.',
    starredPlayersCount: 0,
  },
  {
    id: 'rival-4',
    rivalNumber: 4,
    name: 'Rival 4',
    shortName: 'RIV-4',
    city: 'Por definir',
    primaryColor: '#F59E0B', // Amber
    secondaryColor: '#92400E',
    record: { won: 0, lost: 0 },
    styleTags: ['Tiradores de Esquinas', 'Defensa Individual Flash'],
    keyStrengths: ['Efectividad en triples', 'Movimiento sin balón'],
    keyWeaknesses: ['Juego poste bajo', 'Pérdidas no forzadas'],
    nextMatchDate: 'Pendiente',
    matchLeg: 'Ida',
    notes: 'Cuarto rival. Registra las jugadas de saque de fondo y de banda (ATO).',
    starredPlayersCount: 0,
  },
  {
    id: 'rival-5',
    rivalNumber: 5,
    name: 'Rival 5',
    shortName: 'RIV-5',
    city: 'Por definir',
    primaryColor: '#8B5CF6', // Purple
    secondaryColor: '#5B21B6',
    record: { won: 0, lost: 0 },
    styleTags: ['Ataque 5 Fuera', 'Cambios Automáticos'],
    keyStrengths: ['Espaciado de pista (Spacing)', 'Versatilidad'],
    keyWeaknesses: ['Defensa de bloqueos directos', 'Rebote ofensivo'],
    nextMatchDate: 'Pendiente',
    matchLeg: 'Ida',
    notes: 'Quinto rival. Análisis de rotación de minutos y tendencias en cuartos finales.',
    starredPlayersCount: 0,
  },
  {
    id: 'rival-6',
    rivalNumber: 6,
    name: 'Rival 6',
    shortName: 'RIV-6',
    city: 'Por definir',
    primaryColor: '#EC4899', // Pink
    secondaryColor: '#9D174D',
    record: { won: 0, lost: 0 },
    styleTags: ['Juego Rápido', 'Defensa Agresiva'],
    keyStrengths: ['Transiciones tras robo', '1c1 exterior'],
    keyWeaknesses: ['Ataque posicional lento', 'Defensa de puertas atrás'],
    nextMatchDate: 'Pendiente',
    matchLeg: 'Ida',
    notes: 'Sexto rival. Detalla los focos de atención y jugadores determinantes.',
    starredPlayersCount: 0,
  },
  {
    id: 'rival-7',
    rivalNumber: 7,
    name: 'Rival 7',
    shortName: 'RIV-7',
    city: 'Por definir',
    primaryColor: '#06B6D4', // Cyan
    secondaryColor: '#0E7490',
    record: { won: 0, lost: 0 },
    styleTags: ['Control de Tempo', 'Defensa Mixta (Caja+1)'],
    keyStrengths: ['Táctica defensiva variada', 'Pocas pérdidas'],
    keyWeaknesses: ['Anotación rápida', 'Tiro tras bote'],
    nextMatchDate: 'Pendiente',
    matchLeg: 'Ida',
    notes: 'Séptimo rival. Preparación táctica de defensas alternativas y ajustes.',
    starredPlayersCount: 0,
  },
  {
    id: 'rival-8',
    rivalNumber: 8,
    name: 'Rival 8',
    shortName: 'RIV-8',
    city: 'Por definir',
    primaryColor: '#64748B', // Slate
    secondaryColor: '#334155',
    record: { won: 0, lost: 0 },
    styleTags: ['Juego Colectivo', 'Balance Defensivo Sólido'],
    keyStrengths: ['Disciplina táctica', 'Porcentaje de tiros libres'],
    keyWeaknesses: ['Falta de generación individual', 'Velocidad de repliegue'],
    nextMatchDate: 'Pendiente',
    matchLeg: 'Ida',
    notes: 'Octavo rival. Tarjeta completa para el informe técnico y plan de partido final.',
    starredPlayersCount: 0,
  },
];

interface RivalScoutingViewProps {
  userProfile?: UserProfile | null;
}

export const RivalScoutingView: React.FC<RivalScoutingViewProps> = ({
  userProfile,
}) => {
  const [rivals, setRivals] = useState<RivalTeam[]>(() => {
    const saved = localStorage.getItem('coachmind_rival_scouting_teams');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length === 8) {
          return parsed;
        }
      } catch (e) {
        console.error('Error loading rivals:', e);
      }
    }
    return DEFAULT_RIVALS;
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [editingRivalId, setEditingRivalId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<RivalTeam>>({});
  const [selectedRivalModal, setSelectedRivalModal] = useState<RivalTeam | null>(null);

  // Save changes to localStorage
  useEffect(() => {
    localStorage.setItem('coachmind_rival_scouting_teams', JSON.stringify(rivals));
  }, [rivals]);

  const handleStartEdit = (rival: RivalTeam) => {
    setEditingRivalId(rival.id);
    setEditForm({
      name: rival.name,
      shortName: rival.shortName,
      city: rival.city,
      primaryColor: rival.primaryColor,
      notes: rival.notes,
      nextMatchDate: rival.nextMatchDate,
      matchLeg: rival.matchLeg,
      styleTags: [...rival.styleTags],
    });
  };

  const handleSaveEdit = (rivalId: string) => {
    setRivals((prev) =>
      prev.map((r) => {
        if (r.id !== rivalId) return r;
        return {
          ...r,
          ...editForm,
        };
      })
    );
    setEditingRivalId(null);
    setEditForm({});
  };

  const handleCancelEdit = () => {
    setEditingRivalId(null);
    setEditForm({});
  };

  const filteredRivals = rivals.filter((r) => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) return true;
    return (
      r.name.toLowerCase().includes(query) ||
      r.shortName.toLowerCase().includes(query) ||
      r.city.toLowerCase().includes(query) ||
      r.notes.toLowerCase().includes(query) ||
      r.styleTags.some((t) => t.toLowerCase().includes(query))
    );
  });

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* Header Banner */}
      <div className="bg-[#0B132B] text-white p-6 sm:p-8 rounded-3xl border border-slate-800 shadow-xl relative overflow-hidden">
        {/* Background decorative basketball circles */}
        <div className="absolute -right-16 -top-16 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute right-32 -bottom-20 w-48 h-48 bg-orange-500/10 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-500/30 text-amber-400 text-xs font-black uppercase tracking-wider">
              <Target className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>Área Rival Scouting • 8 Equipos Rivales</span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center gap-3">
              <span>Scouting de Equipos Rivales</span>
            </h1>

            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              Panel táctico para analizar a tus <strong>8 rivales directos</strong> de la liga. Personaliza los nombres, sistemas de juego, fortalezas, debilidades e informes de cada equipo.
            </p>
          </div>

          {/* Quick Counter Stats */}
          <div className="flex items-center gap-3 self-start md:self-center shrink-0">
            <div className="p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800 text-center min-w-[90px] shadow-sm">
              <span className="text-[10px] font-bold text-slate-400 uppercase block">Total Rivales</span>
              <span className="text-2xl font-black text-amber-400">8</span>
            </div>
            <div className="p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800 text-center min-w-[90px] shadow-sm">
              <span className="text-[10px] font-bold text-slate-400 uppercase block">Competición</span>
              <span className="text-xs font-black text-emerald-400 mt-1 block">Liga Activa</span>
            </div>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200 shadow-sm">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por rival, estilo o notas..."
            className="w-full pl-9 pr-3.5 py-2 text-xs font-medium rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 transition-all"
          />
        </div>

        <div className="text-xs font-bold text-slate-500 flex items-center gap-2">
          <span>Mostrando 8 tarjetas de scouting</span>
          <span className="w-1.5 h-1.5 rounded-full bg-slate-300" />
          <span className="text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md font-extrabold border border-amber-200">
            8 Rivales
          </span>
        </div>
      </div>

      {/* 8 Rival Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 sm:gap-5">
        {filteredRivals.map((rival) => {
          const isEditing = editingRivalId === rival.id;

          return (
            <div
              key={rival.id}
              className="bg-white rounded-3xl border border-slate-200/90 shadow-sm hover:shadow-md transition-all duration-200 flex flex-col justify-between overflow-hidden group hover:border-slate-300"
            >
              {/* Card Header with Rival Number & Accent Color Top Line */}
              <div>
                <div
                  className="h-2 w-full"
                  style={{ backgroundColor: rival.primaryColor }}
                />

                <div className="p-4 sm:p-5 space-y-4">
                  {/* Top Header Badge & Actions */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span
                        className="w-7 h-7 rounded-xl flex items-center justify-center text-xs font-black text-white shadow-xs"
                        style={{ backgroundColor: rival.primaryColor }}
                      >
                        #{rival.rivalNumber}
                      </span>
                      <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200">
                        Rival {rival.rivalNumber}
                      </span>
                    </div>

                    {!isEditing && (
                      <button
                        type="button"
                        onClick={() => handleStartEdit(rival)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
                        title="Editar nombre y datos rápidos"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  {/* Team Name and City */}
                  {isEditing ? (
                    <div className="space-y-2 pt-1 animate-fadeIn">
                      <div>
                        <label className="text-[10px] font-black text-slate-600 uppercase block mb-1">
                          Nombre del Equipo Rival:
                        </label>
                        <input
                          type="text"
                          value={editForm.name || ''}
                          onChange={(e) =>
                            setEditForm((prev) => ({ ...prev, name: e.target.value }))
                          }
                          className="w-full px-2.5 py-1.5 text-xs font-bold rounded-lg border border-slate-300 focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none"
                          placeholder={`Ej. Rival ${rival.rivalNumber}`}
                        />
                      </div>

                      <div>
                        <label className="text-[10px] font-black text-slate-600 uppercase block mb-1">
                          Ciudad / Pabellón:
                        </label>
                        <input
                          type="text"
                          value={editForm.city || ''}
                          onChange={(e) =>
                            setEditForm((prev) => ({ ...prev, city: e.target.value }))
                          }
                          className="w-full px-2.5 py-1.5 text-xs font-medium rounded-lg border border-slate-300 focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none"
                          placeholder="Ciudad o pista"
                        />
                      </div>

                      <div>
                        <label className="text-[10px] font-black text-slate-600 uppercase block mb-1">
                          Color representativo:
                        </label>
                        <div className="flex items-center gap-1.5">
                          {['#EF4444', '#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899', '#06B6D4', '#64748B'].map(
                            (c) => (
                              <button
                                key={c}
                                type="button"
                                onClick={() => setEditForm((prev) => ({ ...prev, primaryColor: c }))}
                                className={`w-5 h-5 rounded-full border-2 transition-transform cursor-pointer ${
                                  editForm.primaryColor === c ? 'scale-125 border-slate-900 ring-2 ring-amber-400' : 'border-white'
                                }`}
                                style={{ backgroundColor: c }}
                              />
                            )
                          )}
                        </div>
                      </div>

                      <div>
                        <label className="text-[10px] font-black text-slate-600 uppercase block mb-1">
                          Notas rápidas:
                        </label>
                        <textarea
                          rows={2}
                          value={editForm.notes || ''}
                          onChange={(e) =>
                            setEditForm((prev) => ({ ...prev, notes: e.target.value }))
                          }
                          className="w-full px-2.5 py-1.5 text-xs font-medium rounded-lg border border-slate-300 focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none resize-none"
                          placeholder="Anotaciones de scouting..."
                        />
                      </div>

                      {/* Edit Actions */}
                      <div className="flex items-center gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => handleSaveEdit(rival.id)}
                          className="flex-1 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs flex items-center justify-center gap-1 shadow-xs cursor-pointer"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Guardar</span>
                        </button>
                        <button
                          type="button"
                          onClick={handleCancelEdit}
                          className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <div className="flex items-center gap-2.5">
                        <div
                          className="w-10 h-10 rounded-2xl flex items-center justify-center font-black text-white text-base shadow-sm shrink-0"
                          style={{ backgroundColor: rival.primaryColor }}
                        >
                          {rival.name.slice(0, 2).toUpperCase()}
                        </div>
                        <div className="min-w-0 flex-1">
                          <h3 className="text-base font-black text-slate-900 truncate group-hover:text-amber-600 transition-colors">
                            {rival.name}
                          </h3>
                          <p className="text-xs text-slate-400 truncate">
                            {rival.city || 'Pabellón por definir'}
                          </p>
                        </div>
                      </div>

                      {/* Style Tags */}
                      <div className="pt-2 flex flex-wrap gap-1.5">
                        {rival.styleTags.map((tag, idx) => (
                          <span
                            key={idx}
                            className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[10px] font-bold border border-slate-200"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>

                      {/* Scouting Strengths & Weaknesses snippet */}
                      <div className="pt-2 space-y-1.5 text-[11px]">
                        <div className="flex items-start gap-1.5 text-emerald-800 bg-emerald-50/70 p-2 rounded-xl border border-emerald-200/60">
                          <Zap className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                          <div className="line-clamp-2 leading-tight">
                            <span className="font-extrabold">Fortaleza: </span>
                            {rival.keyStrengths.join(' • ')}
                          </div>
                        </div>

                        <div className="flex items-start gap-1.5 text-rose-800 bg-rose-50/70 p-2 rounded-xl border border-rose-200/60">
                          <AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0 mt-0.5" />
                          <div className="line-clamp-2 leading-tight">
                            <span className="font-extrabold">Debilidad: </span>
                            {rival.keyWeaknesses.join(' • ')}
                          </div>
                        </div>
                      </div>

                      {/* Notes snippet */}
                      {rival.notes && (
                        <div className="pt-1 text-[11px] text-slate-500 line-clamp-2 leading-relaxed italic bg-slate-50 p-2 rounded-xl border border-slate-100">
                          "{rival.notes}"
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Card Footer Button */}
              {!isEditing && (
                <div className="p-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500">
                    <Calendar className="w-3 h-3 text-slate-400" />
                    <span>{rival.nextMatchDate || 'Pendiente'}</span>
                  </div>

                  <button
                    type="button"
                    onClick={() => setSelectedRivalModal(rival)}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-black transition-all cursor-pointer shadow-xs active:scale-95"
                  >
                    <span>Ficha Rival</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Modal Detailed View for a Rival */}
      {selectedRivalModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn"
          onClick={() => setSelectedRivalModal(null)}
        >
          <div
            className="bg-white rounded-3xl w-full max-w-lg max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden animate-scaleUp"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div
              className="p-6 text-white flex items-center justify-between relative"
              style={{ backgroundColor: selectedRivalModal.primaryColor }}
            >
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-xs flex items-center justify-center font-black text-xl text-white shadow-inner">
                  #{selectedRivalModal.rivalNumber}
                </div>
                <div>
                  <span className="px-2 py-0.5 rounded bg-black/20 text-white text-[10px] font-black uppercase">
                    Scouting Detallado
                  </span>
                  <h3 className="text-xl font-black text-white">{selectedRivalModal.name}</h3>
                  <p className="text-xs text-white/80">{selectedRivalModal.city || 'Ciudad por definir'}</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedRivalModal(null)}
                className="p-2 text-white/80 hover:text-white rounded-xl hover:bg-white/20 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4 overflow-y-auto text-xs text-slate-700">
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                <h4 className="font-black text-slate-900 uppercase text-[11px] flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-amber-500" />
                  <span>Estilo de Juego Principal</span>
                </h4>
                <div className="flex flex-wrap gap-1.5">
                  {selectedRivalModal.styleTags.map((t, i) => (
                    <span key={i} className="px-2.5 py-1 rounded-lg bg-white text-slate-800 font-extrabold border border-slate-200 shadow-xs">
                      {t}
                    </span>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 space-y-1.5">
                  <h4 className="font-black text-emerald-900 uppercase text-[11px] flex items-center gap-1.5">
                    <Zap className="w-4 h-4 text-emerald-600" />
                    <span>Puntos Fuertes</span>
                  </h4>
                  <ul className="list-disc list-inside space-y-1 text-emerald-950 font-medium">
                    {selectedRivalModal.keyStrengths.map((s, i) => (
                      <li key={i}>{s}</li>
                    ))}
                  </ul>
                </div>

                <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 space-y-1.5">
                  <h4 className="font-black text-rose-900 uppercase text-[11px] flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 text-rose-600" />
                    <span>Vulnerabilidades</span>
                  </h4>
                  <ul className="list-disc list-inside space-y-1 text-rose-950 font-medium">
                    {selectedRivalModal.keyWeaknesses.map((w, i) => (
                      <li key={i}>{w}</li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                <h4 className="font-black text-slate-900 uppercase text-[11px] flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-slate-500" />
                  <span>Informe Técnico & Plan de Partido</span>
                </h4>
                <p className="text-slate-600 leading-relaxed bg-white p-3 rounded-xl border border-slate-200/80">
                  {selectedRivalModal.notes || 'Sin anotaciones de scouting todavía.'}
                </p>
              </div>

              <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 flex items-center gap-2.5">
                <Info className="w-4 h-4 text-amber-600 shrink-0" />
                <span className="text-[11px] font-medium leading-tight">
                  Las 8 tarjetas están listas para ser configuradas con los datos específicos de cada rival según tus próximas instrucciones.
                </span>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end">
              <button
                type="button"
                onClick={() => setSelectedRivalModal(null)}
                className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-black transition-all cursor-pointer"
              >
                Cerrar Ficha
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
