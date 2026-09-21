import React from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from 'recharts';
import { ImbalanceAreaStat } from '../../types/planning';

interface AreaBalanceChartProps {
  byArea: Record<string, ImbalanceAreaStat | { realPct: number; plannedPct: number; realMinutes?: number; plannedMinutes?: number }>;
  height?: number;
}

const AREA_LABELS: Record<string, string> = {
  tecnica: 'Técnica',
  tactica: 'Táctica',
  fisica: 'Física',
  mental: 'Mental',
};

export const AreaBalanceChart: React.FC<AreaBalanceChartProps> = ({ byArea, height = 260 }) => {
  const data = ['tecnica', 'tactica', 'fisica', 'mental'].map((areaKey) => {
    const item = byArea[areaKey] || { realPct: 0, plannedPct: 0.25 };
    const realPct = Math.round((item.realPct || 0) * 100);
    const plannedPct = Math.round((item.plannedPct || 0) * 100);
    const delta = realPct - plannedPct;

    return {
      areaKey,
      name: AREA_LABELS[areaKey] || areaKey,
      'Real (%)': realPct,
      'Planificado (%)': plannedPct,
      delta,
      realMinutes: 'realMinutes' in item ? item.realMinutes : undefined,
    };
  });

  return (
    <div className="w-full bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-semibold text-slate-800">
          Distribución de Cargas (% Planificado vs % Real en Pista)
        </h4>
        <span className="text-xs text-slate-500 font-medium">Margen óptimo: ±15%</span>
      </div>

      <div style={{ width: '100%', height }}>
        <ResponsiveContainer>
          <BarChart data={data} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
            <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#475569' }} tickLine={false} />
            <YAxis
              tick={{ fontSize: 11, fill: '#64748b' }}
              tickFormatter={(v) => `${v}%`}
              domain={[0, 100]}
            />
            <Tooltip
              formatter={(value: any, name: any, item: any) => {
                const mins = item.payload.realMinutes !== undefined ? ` (${item.payload.realMinutes} min)` : '';
                return [`${value}%${name === 'Real (%)' ? mins : ''}`, name];
              }}
              contentStyle={{
                backgroundColor: '#ffffff',
                borderColor: '#e2e8f0',
                borderRadius: '8px',
                fontSize: '12px',
                boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
              }}
            />
            <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '8px' }} />
            <Bar dataKey="Planificado (%)" fill="#94a3b8" radius={[4, 4, 0, 0]} maxBarSize={32} />
            <Bar dataKey="Real (%)" fill="#ea580c" radius={[4, 4, 0, 0]} maxBarSize={32} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
