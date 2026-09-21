import React from 'react';
import { CalendarRange } from 'lucide-react';
import { UserProfile } from '../types';

interface AnnualPlanningViewProps {
  userProfile?: UserProfile | null;
}

export const AnnualPlanningView: React.FC<AnnualPlanningViewProps> = ({ userProfile }) => {
  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-xl border border-blue-100">
            <CalendarRange className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Planificación anual</h1>
            <p className="text-sm text-slate-500">Sección de planificación anual</p>
          </div>
        </div>
      </div>

      {/* Main empty container */}
      <div className="bg-white rounded-2xl border border-slate-200 p-12 min-h-[420px] flex flex-col items-center justify-center text-center shadow-sm">
        <div className="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center mb-4 border border-slate-100">
          <CalendarRange className="w-8 h-8 text-slate-400" />
        </div>
        <h3 className="text-lg font-semibold text-slate-800 mb-1">Planificación anual</h3>
        <p className="text-sm text-slate-500 max-w-md">
          Sección abierta y lista para configurar los contenidos y herramientas de planificación anual.
        </p>
      </div>
    </div>
  );
};
