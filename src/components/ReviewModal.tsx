import React, { useState } from 'react';
import { Star, X, CheckCircle2, MessageSquareHeart, Sparkles } from 'lucide-react';
import { AppReview, UserProfile } from '../types';

export const INITIAL_APP_REVIEWS: AppReview[] = [
  {
    id: 'rev-1',
    authorName: 'Carlos M.',
    club: 'CB Alcobendas',
    role: 'Entrenador Senior',
    rating: 5,
    comment:
      'Una herramienta brillante e imprescindible para planificar mis entrenamientos y analizar los partidos con la IA. ¡100% recomendada!',
    createdAt: '2026-07-20',
  },
  {
    id: 'rev-2',
    authorName: 'Laura G.',
    club: 'Real Canoe NC',
    role: 'Entrenadora Cadete',
    rating: 5,
    comment:
      'El asistente Coach IA nos ahorra muchísimo tiempo en la preparación de ejercicios específicos. La calidad de las sesiones es fantástica.',
    createdAt: '2026-07-18',
  },
  {
    id: 'rev-3',
    authorName: 'David R.',
    club: 'CB Torrelodones',
    role: 'Director Técnico',
    rating: 5,
    comment:
      'La pizarra táctica animada y la ficha oficial del entrenador le dan una presencia súper profesional a todo nuestro club.',
    createdAt: '2026-07-15',
  },
  {
    id: 'rev-4',
    authorName: 'Marta S.',
    club: 'Distrito Olímpico',
    role: 'Sénior Femenino',
    rating: 5,
    comment:
      'Súper intuitiva y completa. Gestionar las estadísticas del equipo y ver los avances en el dashboard es de 10.',
    createdAt: '2026-07-10',
  },
];

export const getStoredReviews = (): AppReview[] => {
  try {
    const data = localStorage.getItem('coachmind_app_reviews');
    if (data) {
      const parsed = JSON.parse(data);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (e) {
    console.error('Error loading reviews:', e);
  }
  return INITIAL_APP_REVIEWS;
};

export const saveStoredReview = (newReview: AppReview): AppReview[] => {
  const current = getStoredReviews();
  const updated = [newReview, ...current];
  try {
    localStorage.setItem('coachmind_app_reviews', JSON.stringify(updated));
    window.dispatchEvent(new Event('coachmind_reviews_updated'));
  } catch (e) {
    console.error('Error saving review:', e);
  }
  return updated;
};

interface ReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  userProfile?: UserProfile | null;
  onReviewSubmitted?: (reviews: AppReview[]) => void;
}

export const ReviewModal: React.FC<ReviewModalProps> = ({
  isOpen,
  onClose,
  userProfile,
  onReviewSubmitted,
}) => {
  const defaultName = `${userProfile?.firstName || 'Entrenador'} ${userProfile?.lastName || ''}`.trim();
  const defaultClub = userProfile?.club || 'Club Baloncesto';

  const [authorName, setAuthorName] = useState(defaultName);
  const [club, setClub] = useState(defaultClub);
  const [rating, setRating] = useState<number>(5);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [comment, setComment] = useState('');
  const [submittedSuccess, setSubmittedSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!comment.trim()) return;

    const reviewItem: AppReview = {
      id: `rev-${Date.now()}`,
      authorName: authorName.trim() || 'Entrenador Anónimo',
      club: club.trim() || 'Club Baloncesto',
      role: userProfile?.teamCategory ? `Entrenador ${userProfile.teamCategory}` : 'Entrenador de Baloncesto',
      rating,
      comment: comment.trim(),
      createdAt: new Date().toISOString().split('T')[0],
    };

    const updatedList = saveStoredReview(reviewItem);
    if (onReviewSubmitted) {
      onReviewSubmitted(updatedList);
    }

    setSubmittedSuccess(true);
    setTimeout(() => {
      setSubmittedSuccess(false);
      setComment('');
      onClose();
    }, 2200);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto animate-fadeIn">
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-md w-full p-6 sm:p-8 space-y-5 relative my-auto text-slate-900 dark:text-slate-100">
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {submittedSuccess ? (
          <div className="text-center py-8 space-y-4 animate-fadeIn">
            <div className="w-16 h-16 rounded-3xl bg-emerald-100 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/10">
              <CheckCircle2 className="w-8 h-8 animate-bounce" />
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-extrabold text-slate-900 dark:text-white">
                ¡Muchas gracias por tu reseña!
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed max-w-xs mx-auto">
                Tu valoración con <span className="font-bold text-amber-500">{rating} ★ estrellas</span> ha sido registrada con éxito e integrada en el panel general de la aplicación.
              </p>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Header */}
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-500 shrink-0">
                <MessageSquareHeart className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-lg sm:text-xl font-extrabold tracking-tight">
                  Valora tu experiencia con CoachMind
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Tu opinión ayuda a otros entrenadores a verificar la calidad
                </p>
              </div>
            </div>

            {/* Star Rating selector */}
            <div className="p-4 rounded-2xl bg-amber-50/60 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-800/40 text-center space-y-2">
              <label className="block text-xs font-extrabold text-amber-900 dark:text-amber-200 uppercase tracking-wider">
                Selecciona tu puntuación
              </label>

              <div className="flex items-center justify-center gap-2">
                {[1, 2, 3, 4, 5].map((star) => {
                  const effectiveRating = hoverRating || rating;
                  const isFilled = star <= effectiveRating;

                  return (
                    <button
                      key={star}
                      type="button"
                      onMouseEnter={() => setHoverRating(star)}
                      onMouseLeave={() => setHoverRating(0)}
                      onClick={() => setRating(star)}
                      className="p-1 transition-transform hover:scale-125 cursor-pointer focus:outline-none"
                    >
                      <Star
                        className={`w-8 h-8 transition-colors ${
                          isFilled
                            ? 'text-amber-400 fill-amber-400 drop-shadow-md'
                            : 'text-slate-300 dark:text-slate-700'
                        }`}
                      />
                    </button>
                  );
                })}
              </div>

              <div className="text-xs font-bold text-amber-800 dark:text-amber-300">
                {rating === 5 && '⭐⭐⭐⭐⭐ ¡Excelente! La recomiendo 100%'}
                {rating === 4 && '⭐⭐⭐⭐ Muy buena aplicación'}
                {rating === 3 && '⭐⭐⭐ Buena experiencia'}
                {rating === 2 && '⭐⭐ Regular'}
                {rating === 1 && '⭐ Necesita mejoras'}
              </div>
            </div>

            {/* Author details */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300">
                  Tu Nombre
                </label>
                <input
                  type="text"
                  required
                  value={authorName}
                  onChange={(e) => setAuthorName(e.target.value)}
                  placeholder="ej. Juan Pérez"
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-800 dark:text-slate-100 font-medium focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300">
                  Club / Equipo
                </label>
                <input
                  type="text"
                  required
                  value={club}
                  onChange={(e) => setClub(e.target.value)}
                  placeholder="ej. CB Madrid"
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-800 dark:text-slate-100 font-medium focus:ring-2 focus:ring-amber-500"
                />
              </div>
            </div>

            {/* Review Comment */}
            <div className="space-y-1">
              <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300">
                Escribe tu reseña u opinión sobre CoachMind *
              </label>
              <textarea
                rows={3}
                required
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="¿Qué es lo que más te gusta de CoachMind? ¿Cómo ayuda a tus entrenamientos o partidos?..."
                className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-800 dark:text-slate-100 font-medium focus:ring-2 focus:ring-amber-500 focus:outline-none resize-none"
              />
            </div>

            {/* Buttons */}
            <div className="flex items-center gap-2.5 pt-1">
              <button
                type="button"
                onClick={onClose}
                className="w-1/3 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs transition-colors cursor-pointer text-center"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="w-2/3 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-extrabold text-xs shadow-md shadow-amber-500/20 transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <Sparkles className="w-4 h-4" />
                <span>Publicar Reseña</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
