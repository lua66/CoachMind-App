import React, { useState, useMemo } from 'react';
import {
  Star,
  X,
  ThumbsUp,
  Search,
  MessageSquareHeart,
  Sparkles,
  Filter,
  Users,
  CheckCircle2,
} from 'lucide-react';
import { AppReview, UserProfile } from '../types';

interface AllReviewsModalProps {
  isOpen: boolean;
  onClose: () => void;
  reviews: AppReview[];
  onOpenWriteReview: () => void;
}

export const AllReviewsModal: React.FC<AllReviewsModalProps> = ({
  isOpen,
  onClose,
  reviews,
  onOpenWriteReview,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStarFilter, setSelectedStarFilter] = useState<number | null>(null);

  // Mathematical average and distribution calculation
  const stats = useMemo(() => {
    const total = reviews.length;
    if (total === 0) {
      return {
        total: 0,
        average: 5.0,
        formattedAvg: '5.0',
        distribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 },
        percentages: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 },
      };
    }

    const dist: Record<number, number> = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    let sum = 0;

    reviews.forEach((r) => {
      const rating = Math.max(1, Math.min(5, Math.round(Number(r.rating) || 5)));
      dist[rating] = (dist[rating] || 0) + 1;
      sum += Number(r.rating) || 5;
    });

    const avg = sum / total;
    const percentages: Record<number, number> = {
      5: Math.round(((dist[5] || 0) / total) * 100),
      4: Math.round(((dist[4] || 0) / total) * 100),
      3: Math.round(((dist[3] || 0) / total) * 100),
      2: Math.round(((dist[2] || 0) / total) * 100),
      1: Math.round(((dist[1] || 0) / total) * 100),
    };

    return {
      total,
      average: avg,
      formattedAvg: avg.toFixed(1),
      distribution: dist,
      percentages,
    };
  }, [reviews]);

  // Filtered reviews
  const filteredReviews = useMemo(() => {
    return reviews.filter((r) => {
      const matchesSearch =
        !searchTerm.trim() ||
        r.authorName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (r.club && r.club.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (r.role && r.role.toLowerCase().includes(searchTerm.toLowerCase())) ||
        r.comment.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStar =
        selectedStarFilter === null || Math.round(Number(r.rating) || 5) === selectedStarFilter;

      return matchesSearch && matchesStar;
    });
  }, [reviews, searchTerm, selectedStarFilter]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-fadeIn">
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-3xl w-full p-5 sm:p-7 space-y-6 relative my-auto text-slate-900 dark:text-slate-100 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 pb-2 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-500 text-slate-950 flex items-center justify-center shadow-lg shadow-amber-500/20 shrink-0">
              <Star className="w-6 h-6 fill-slate-950" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
                  Todas las Reseñas y Valoraciones
                </h2>
                <span className="px-2.5 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 font-extrabold text-xs">
                  {reviews.length} {reviews.length === 1 ? 'opinión' : 'opiniones'}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Historial completo de comentarios y puntuaciones registradas por entrenadores
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            aria-label="Cerrar modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content Container */}
        <div className="space-y-6 overflow-y-auto custom-scrollbar flex-1 pr-1">
          {/* STATS & AVERAGE SUMMARY BANNER */}
          <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-slate-900 via-slate-850 to-slate-900 border border-slate-800 text-white grid grid-cols-1 sm:grid-cols-3 gap-5 items-center shadow-md">
            {/* Big Rating & Stars */}
            <div className="flex flex-col items-center justify-center sm:border-r border-slate-800/80 sm:pr-4 text-center">
              <div className="text-4xl sm:text-5xl font-black text-amber-400 tracking-tight">
                {stats.formattedAvg}
              </div>
              <div className="flex text-amber-400 gap-1 my-1.5">
                {[1, 2, 3, 4, 5].map((starIndex) => {
                  const fillPct = Math.max(
                    0,
                    Math.min(100, (stats.average - (starIndex - 1)) * 100)
                  );
                  return (
                    <div key={starIndex} className="relative w-4 h-4 text-slate-600">
                      <Star className="w-4 h-4 fill-slate-700 text-slate-700" />
                      <div
                        className="absolute top-0 left-0 overflow-hidden text-amber-400"
                        style={{ width: `${fillPct}%` }}
                      >
                        <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                      </div>
                    </div>
                  );
                })}
              </div>
              <p className="text-[11px] font-bold text-slate-300">
                Media global de <span className="text-amber-400 font-extrabold">{stats.total}</span> valoraciones
              </p>
            </div>

            {/* Distribution Bars */}
            <div className="sm:col-span-2 space-y-1.5">
              {[5, 4, 3, 2, 1].map((stars) => {
                const count = stats.distribution[stars] || 0;
                const pct = stats.percentages[stars] || 0;
                const isSelected = selectedStarFilter === stars;

                return (
                  <div
                    key={stars}
                    onClick={() =>
                      setSelectedStarFilter(isSelected ? null : stars)
                    }
                    className={`flex items-center gap-2 text-xs cursor-pointer group p-1 rounded-lg transition-colors ${
                      isSelected ? 'bg-amber-500/20' : 'hover:bg-slate-800/60'
                    }`}
                  >
                    <span className="w-12 font-bold flex items-center gap-1 text-slate-300 group-hover:text-amber-300">
                      {stars} <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                    </span>
                    <div className="flex-1 h-2.5 bg-slate-800 rounded-full overflow-hidden border border-slate-700/60">
                      <div
                        className="h-full bg-gradient-to-r from-amber-500 to-orange-400 rounded-full transition-all duration-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="w-10 text-right font-semibold text-[11px] text-slate-400">
                      {count} ({pct}%)
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Controls: Search, Filter Reset & Write review CTA */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar por entrenador, club o palabra..."
                className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-amber-500 focus:outline-none"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Star Filters */}
            <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0">
              <button
                type="button"
                onClick={() => setSelectedStarFilter(null)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  selectedStarFilter === null
                    ? 'bg-amber-500 text-slate-950 shadow-sm'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                }`}
              >
                Todas ({reviews.length})
              </button>
              {[5, 4, 3, 2, 1].map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() =>
                    setSelectedStarFilter(selectedStarFilter === s ? null : s)
                  }
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                    selectedStarFilter === s
                      ? 'bg-amber-500 text-slate-950 shadow-sm'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                  }`}
                >
                  <span>{s}</span>
                  <Star className={`w-3 h-3 ${selectedStarFilter === s ? 'fill-slate-950' : 'fill-amber-400 text-amber-400'}`} />
                </button>
              ))}
            </div>
          </div>

          {/* Reviews List */}
          <div className="space-y-3">
            {filteredReviews.length === 0 ? (
              <div className="text-center py-10 space-y-2 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700">
                <Filter className="w-8 h-8 text-slate-400 mx-auto" />
                <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
                  No se encontraron reseñas con los filtros actuales
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setSearchTerm('');
                    setSelectedStarFilter(null);
                  }}
                  className="text-xs font-extrabold text-amber-600 dark:text-amber-400 hover:underline cursor-pointer"
                >
                  Restablecer filtros
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {filteredReviews.map((rev) => (
                  <div
                    key={rev.id}
                    className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-750 space-y-2.5 relative hover:border-amber-300 dark:hover:border-amber-500/40 transition-all shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 text-slate-950 font-black text-xs flex items-center justify-center shadow-md shrink-0">
                          {rev.authorName.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <h4 className="font-extrabold text-xs sm:text-sm text-slate-900 dark:text-white">
                            {rev.authorName}
                          </h4>
                          <p className="text-[10px] sm:text-[11px] font-semibold text-amber-600 dark:text-amber-400">
                            {rev.club || 'Club Baloncesto'} •{' '}
                            <span className="text-slate-500 dark:text-slate-400">
                              {rev.role || 'Entrenador'}
                            </span>
                          </p>
                        </div>
                      </div>

                      <div className="flex text-amber-400 shrink-0">
                        {Array.from({ length: rev.rating || 5 }).map((_, i) => (
                          <Star key={i} className="w-3.5 h-3.5 fill-amber-400" />
                        ))}
                      </div>
                    </div>

                    <p className="text-xs text-slate-700 dark:text-slate-300 italic leading-relaxed pt-0.5">
                      "{rev.comment}"
                    </p>

                    <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1.5 border-t border-slate-200/60 dark:border-slate-700/60">
                      <span>{rev.createdAt}</span>
                      <span className="flex items-center gap-1 font-bold text-amber-600 dark:text-amber-400">
                        <ThumbsUp className="w-3 h-3 fill-amber-500 text-amber-500" /> Like Verificado
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Mostrando {filteredReviews.length} de {reviews.length} valoraciones registradas
          </p>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs transition-colors cursor-pointer"
            >
              Cerrar
            </button>
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenWriteReview();
              }}
              className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-extrabold text-xs shadow-md shadow-amber-500/20 transition-all cursor-pointer flex items-center justify-center gap-1.5"
            >
              <Sparkles className="w-4 h-4 text-amber-200" />
              <span>Valorar Aplicación</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
