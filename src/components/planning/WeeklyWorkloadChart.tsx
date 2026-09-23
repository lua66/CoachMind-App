import React, { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  ReferenceLine,
  Cell,
} from 'recharts';
import {
  Activity,
  Calendar,
  Clock,
  Flame,
  Layers,
  TrendingUp,
  BarChart3,
  Filter,
  CheckCircle2,
  AlertCircle,
  Sparkles,
} from 'lucide-react';
import { Microcycle, Mesocycle } from '../../types/planning';

interface WeeklyWorkloadChartProps {
  microcycles: Microcycle[];
  mesocycles: Mesocycle[];
  onSelectMicrocycle?: (microcycleId: string, mesocycleId: string) => void;
  title?: string;
  subtitle?: string;
}

type MetricType = 'volumen' | 'carga' | 'sesiones';

const INTENSITY_WEIGHTS: Record<string, number> = {
  Baja: 1.0,
  Media: 1.5,
  Alta: 2.0,
  Máxima: 2.5,
};

const INTENSITY_COLORS: Record<string, { bg: string; text: string; bar: string }> = {
  Baja: { bg: 'bg-blue-50', text: 'text-blue-700', bar: '#38bdf8' },
  Media: { bg: 'bg-emerald-50', text: 'text-emerald-700', bar: '#10b981' },
  Alta: { bg: 'bg-amber-50', text: 'text-amber-700', bar: '#f59e0b' },
  Máxima: { bg: 'bg-rose-50', text: 'text-rose-700', bar: '#ef4444' },
};

export const WeeklyWorkloadChart: React.FC<WeeklyWorkloadChartProps> = ({
  microcycles,
  mesocycles,
  onSelectMicrocycle,
  title = 'Carga de Trabajo Semanal Programada',
  subtitle = 'Monitoreo de volumen, intensidad y sesiones planificadas a lo largo de la temporada',
}) => {
  const [selectedMesoFilter, setSelectedMesoFilter] = useState<string>('all');
  const [metric, setMetric] = useState<MetricType>('volumen');
  const [selectedWeekDetail, setSelectedWeekDetail] = useState<Microcycle | null>(null);

  // Filter microcycles according to selected mesocycle
  const filteredMicrocycles = useMemo(() => {
    const list = selectedMesoFilter === 'all'
      ? microcycles
      : microcycles.filter((m) => m.mesocycleId === selectedMesoFilter);
    return [...list].sort((a, b) => a.semana - b.semana);
  }, [microcycles, selectedMesoFilter]);

  // Transform data for recharts
  const chartData = useMemo(() => {
    return filteredMicrocycles.map((micro) => {
      const parentMeso = mesocycles.find((m) => m.id === micro.mesocycleId);
      const plannedMin = micro.cargasPlanificadas?.volumenMinutos || 0;
      const plannedSessions = micro.cargasPlanificadas?.sesiones || 0;
      const intensity = micro.cargasPlanificadas?.intensidad || 'Media';
      const weight = INTENSITY_WEIGHTS[intensity] || 1.5;

      const realSessions = micro.sessions || [];
      const realMin = realSessions.reduce((acc, s) => acc + (Number(s.duracionMin) || 0), 0);
      const realSessionCount = realSessions.length;

      // Real RPE average
      const sessionsWithRpe = realSessions.filter((s) => s.rpe && s.rpe > 0);
      const avgRpe = sessionsWithRpe.length > 0
        ? sessionsWithRpe.reduce((acc, s) => acc + (s.rpe || 0), 0) / sessionsWithRpe.length
        : 0;

      // Workload score (Arbitrary Units / UA)
      const plannedWorkload = Math.round(plannedMin * weight);
      const realWeight = avgRpe > 0 ? avgRpe / 4 : weight;
      const realWorkload = Math.round(realMin * realWeight);

      // Compliance ratio
      const complianceMinPct = plannedMin > 0 ? Math.round((realMin / plannedMin) * 100) : 0;

      return {
        id: micro.id,
        mesocycleId: micro.mesocycleId,
        mesocycleName: parentMeso?.nombre || `Meso ${micro.mesocycleId}`,
        semana: micro.semana,
        name: `Semana ${micro.semana}`,
        shortName: `S${micro.semana}`,
        fechaInicio: micro.fechaInicio,
        fechaFin: micro.fechaFin,
        objetivoSemanal: micro.objetivoSemanal,
        estado: micro.estado,
        intensidad: intensity,
        // Metric 1: Volumen
        'Volumen Planificado (min)': plannedMin,
        'Volumen Real (min)': realMin,
        // Metric 2: Carga Arbitraria (UA)
        'Carga Planificada (UA)': plannedWorkload,
        'Carga Real (UA)': realWorkload,
        // Metric 3: Sesiones
        'Sesiones Planificadas': plannedSessions,
        'Sesiones Realizadas': realSessionCount,
        avgRpe: avgRpe > 0 ? avgRpe.toFixed(1) : 'N/A',
        complianceMinPct,
        rawMicrocycle: micro,
      };
    });
  }, [filteredMicrocycles, mesocycles]);

  // Overall calculations for KPIs
  const kpis = useMemo(() => {
    let totalPlannedMin = 0;
    let totalRealMin = 0;
    let totalPlannedSessions = 0;
    let totalRealSessions = 0;
    let maxWorkloadWeek = { semana: 0, min: 0 };
    const intensityCounts: Record<string, number> = { Baja: 0, Media: 0, Alta: 0, Máxima: 0 };

    filteredMicrocycles.forEach((m) => {
      const pMin = m.cargasPlanificadas?.volumenMinutos || 0;
      totalPlannedMin += pMin;
      totalPlannedSessions += m.cargasPlanificadas?.sesiones || 0;

      const rMin = (m.sessions || []).reduce((acc, s) => acc + (Number(s.duracionMin) || 0), 0);
      totalRealMin += rMin;
      totalRealSessions += (m.sessions || []).length;

      if (pMin > maxWorkloadWeek.min) {
        maxWorkloadWeek = { semana: m.semana, min: pMin };
      }

      const inten = m.cargasPlanificadas?.intensidad || 'Media';
      intensityCounts[inten] = (intensityCounts[inten] || 0) + 1;
    });

    const avgPlannedMin = filteredMicrocycles.length > 0
      ? Math.round(totalPlannedMin / filteredMicrocycles.length)
      : 0;

    // Dominant intensity
    let dominantIntensity = 'Media';
    let maxCount = -1;
    Object.entries(intensityCounts).forEach(([k, v]) => {
      if (v > maxCount) {
        maxCount = v;
        dominantIntensity = k;
      }
    });

    return {
      totalPlannedMin,
      totalRealMin,
      avgPlannedMin,
      totalPlannedSessions,
      totalRealSessions,
      maxWorkloadWeek,
      dominantIntensity,
      totalWeeks: filteredMicrocycles.length,
    };
  }, [filteredMicrocycles]);

  const handleBarClick = (entry: any) => {
    if (entry && entry.rawMicrocycle) {
      setSelectedWeekDetail(entry.rawMicrocycle);
      if (onSelectMicrocycle) {
        onSelectMicrocycle(entry.rawMicrocycle.id, entry.rawMicrocycle.mesocycleId);
      }
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 sm:p-6 space-y-6">
      {/* Chart Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-gradient-to-br from-orange-500 to-amber-600 text-white rounded-2xl shadow-sm">
            <BarChart3 className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <span>{title}</span>
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-orange-100 text-orange-800">
                {kpis.totalWeeks} Semanas
              </span>
            </h3>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">{subtitle}</p>
          </div>
        </div>

        {/* Controls: Metric switch + Mesocycle filter */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Mesocycle Filter */}
          <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs">
            <Filter className="w-3.5 h-3.5 text-slate-500 ml-1.5" />
            <select
              value={selectedMesoFilter}
              onChange={(e) => setSelectedMesoFilter(e.target.value)}
              className="bg-transparent text-xs font-semibold text-slate-700 outline-hidden py-1 pr-2 cursor-pointer"
            >
              <option value="all">Toda la Temporada</option>
              {mesocycles.map((meso) => (
                <option key={meso.id} value={meso.id}>
                  {meso.nombre}
                </option>
              ))}
            </select>
          </div>

          {/* Metric Selector Tabs */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setMetric('volumen')}
              className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                metric === 'volumen'
                  ? 'bg-white text-orange-600 shadow-2xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Minutos (Volumen)
            </button>
            <button
              type="button"
              onClick={() => setMetric('carga')}
              className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                metric === 'carga'
                  ? 'bg-white text-orange-600 shadow-2xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Carga (UA)
            </button>
            <button
              type="button"
              onClick={() => setMetric('sesiones')}
              className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                metric === 'sesiones'
                  ? 'bg-white text-orange-600 shadow-2xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Sesiones
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-xl bg-orange-50/60 border border-orange-100/80">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-orange-700">
            <Clock className="w-3.5 h-3.5" />
            <span>Volumen Total</span>
          </div>
          <div className="text-xl font-black text-slate-900 mt-1">
            {kpis.totalPlannedMin} <span className="text-xs font-normal text-slate-500">min ({Math.round(kpis.totalPlannedMin / 60)}h)</span>
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">
            Ejecutado: <strong className="text-slate-700">{kpis.totalRealMin} min</strong>
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-600">
            <Activity className="w-3.5 h-3.5 text-slate-500" />
            <span>Media Semanal</span>
          </div>
          <div className="text-xl font-black text-slate-900 mt-1">
            {kpis.avgPlannedMin} <span className="text-xs font-normal text-slate-500">min/sem</span>
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">
            ~{(kpis.avgPlannedMin / 60).toFixed(1)} horas semanales
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-600">
            <Flame className="w-3.5 h-3.5 text-amber-500" />
            <span>Pico de Carga</span>
          </div>
          <div className="text-xl font-black text-slate-900 mt-1">
            {kpis.maxWorkloadWeek.min > 0 ? `S${kpis.maxWorkloadWeek.semana}` : '-'}
            <span className="text-xs font-normal text-slate-500"> ({kpis.maxWorkloadWeek.min} min)</span>
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">
            Semana con mayor volumen
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-600">
            <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
            <span>Intensidad Predominante</span>
          </div>
          <div className="text-xl font-black text-slate-900 mt-1 flex items-center gap-1.5">
            <span>{kpis.dominantIntensity}</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold">
              {INTENSITY_WEIGHTS[kpis.dominantIntensity]}x
            </span>
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">
            {kpis.totalPlannedSessions} sesiones planificadas
          </div>
        </div>
      </div>

      {/* Main Interactive Bar Chart */}
      <div className="w-full">
        <div className="w-full h-72 sm:h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              margin={{ top: 15, right: 15, left: -10, bottom: 25 }}
              onClick={(state: any) => {
                if (state && state.activePayload && state.activePayload[0]) {
                  handleBarClick(state.activePayload[0].payload);
                }
              }}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 11, fill: '#475569', fontWeight: 500 }}
                tickLine={false}
                axisLine={{ stroke: '#cbd5e1' }}
                interval={0}
                angle={chartData.length > 8 ? -25 : 0}
                textAnchor={chartData.length > 8 ? 'end' : 'middle'}
              />
              <YAxis
                tick={{ fontSize: 11, fill: '#64748b' }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) => {
                  if (metric === 'volumen') return `${v}m`;
                  if (metric === 'carga') return `${v} UA`;
                  return `${v}`;
                }}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload || !payload.length) return null;
                  const data = payload[0].payload;
                  const intensityStyle = INTENSITY_COLORS[data.intensidad] || INTENSITY_COLORS.Media;

                  return (
                    <div className="bg-slate-900 text-white rounded-xl p-3.5 shadow-xl border border-slate-800 text-xs max-w-xs z-50">
                      <div className="flex items-center justify-between gap-3 pb-2 border-b border-slate-800">
                        <div>
                          <span className="font-bold text-sm text-white">{data.name}</span>
                          <span className="text-[11px] text-slate-400 block">{data.mesocycleName}</span>
                        </div>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${intensityStyle.bg} ${intensityStyle.text}`}>
                          {data.intensidad}
                        </span>
                      </div>

                      <div className="py-2 text-[11px] text-slate-300">
                        <strong className="text-slate-100">Objetivo:</strong> {data.objetivoSemanal}
                      </div>

                      <div className="space-y-1 pt-2 border-t border-slate-800 text-[11px]">
                        <div className="flex justify-between items-center text-slate-300">
                          <span>Volumen Planificado:</span>
                          <span className="font-bold text-amber-400">{data['Volumen Planificado (min)']} min</span>
                        </div>
                        <div className="flex justify-between items-center text-slate-300">
                          <span>Volumen Real:</span>
                          <span className="font-bold text-orange-400">{data['Volumen Real (min)']} min</span>
                        </div>
                        <div className="flex justify-between items-center text-slate-300">
                          <span>Sesiones (Plan / Real):</span>
                          <span className="font-bold text-white">{data['Sesiones Planificadas']} / {data['Sesiones Realizadas']}</span>
                        </div>
                        <div className="flex justify-between items-center text-slate-300">
                          <span>Carga Estimada:</span>
                          <span className="font-bold text-emerald-400">{data['Carga Planificada (UA)']} UA</span>
                        </div>
                        {data.avgRpe !== 'N/A' && (
                          <div className="flex justify-between items-center text-slate-300">
                            <span>RPE Medio Registrado:</span>
                            <span className="font-bold text-cyan-300">{data.avgRpe} / 10</span>
                          </div>
                        )}
                      </div>

                      <div className="mt-2.5 pt-2 border-t border-slate-800 text-[10px] text-slate-400 flex items-center justify-between">
                        <span>Estado: <strong className="capitalize text-slate-200">{data.estado}</strong></span>
                        <span className="text-orange-400 font-semibold">Clic para ver semana</span>
                      </div>
                    </div>
                  );
                }}
              />
              <Legend
                wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }}
                iconType="circle"
              />

              {metric === 'volumen' && (
                <>
                  <Bar
                    dataKey="Volumen Planificado (min)"
                    fill="#fb923c"
                    radius={[6, 6, 0, 0]}
                    maxBarSize={36}
                  />
                  <Bar
                    dataKey="Volumen Real (min)"
                    fill="#ea580c"
                    radius={[6, 6, 0, 0]}
                    maxBarSize={36}
                  />
                </>
              )}

              {metric === 'carga' && (
                <>
                  <Bar
                    dataKey="Carga Planificada (UA)"
                    fill="#38bdf8"
                    radius={[6, 6, 0, 0]}
                    maxBarSize={36}
                  />
                  <Bar
                    dataKey="Carga Real (UA)"
                    fill="#0284c7"
                    radius={[6, 6, 0, 0]}
                    maxBarSize={36}
                  />
                </>
              )}

              {metric === 'sesiones' && (
                <>
                  <Bar
                    dataKey="Sesiones Planificadas"
                    fill="#a78bfa"
                    radius={[6, 6, 0, 0]}
                    maxBarSize={36}
                  />
                  <Bar
                    dataKey="Sesiones Realizadas"
                    fill="#7c3aed"
                    radius={[6, 6, 0, 0]}
                    maxBarSize={36}
                  />
                </>
              )}
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Interactive Week Inspector / Selected Week Banner */}
      {selectedWeekDetail && (
        <div className="p-4 rounded-xl bg-orange-50/70 border border-orange-200/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-slate-800 transition">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-orange-600 text-white">
                Semana {selectedWeekDetail.semana}
              </span>
              <span className="text-xs text-slate-500 font-medium">
                {selectedWeekDetail.fechaInicio} al {selectedWeekDetail.fechaFin}
              </span>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-200/80 text-slate-700 capitalize">
                {selectedWeekDetail.estado}
              </span>
            </div>
            <p className="text-xs text-slate-700 font-medium">
              <strong>Objetivo:</strong> {selectedWeekDetail.objetivoSemanal}
            </p>
            <p className="text-xs text-slate-600">
              Planificado: {selectedWeekDetail.cargasPlanificadas?.volumenMinutos} min • {selectedWeekDetail.cargasPlanificadas?.sesiones} sesiones • Intensidad {selectedWeekDetail.cargasPlanificadas?.intensidad}
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
            {onSelectMicrocycle && (
              <button
                type="button"
                onClick={() => onSelectMicrocycle(selectedWeekDetail.id, selectedWeekDetail.mesocycleId)}
                className="px-3.5 py-1.5 bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-xs font-semibold transition cursor-pointer shadow-2xs"
              >
                Abrir en Microciclos
              </button>
            )}
            <button
              type="button"
              onClick={() => setSelectedWeekDetail(null)}
              className="px-2.5 py-1.5 text-xs text-slate-500 hover:text-slate-800 transition cursor-pointer"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}

      {/* Legend / Methodology Note */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between text-[11px] text-slate-500 pt-2 border-t border-slate-100 gap-2">
        <div className="flex items-center gap-4 flex-wrap">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-400 inline-block" />
            Baja (1.0x)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
            Media (1.5x)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" />
            Alta (2.0x)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block" />
            Máxima (2.5x)
          </span>
        </div>
        <span className="italic">Haz clic en cualquier barra para inspeccionar el microciclo.</span>
      </div>
    </div>
  );
};
