import React, { useState } from 'react';
import { Star, X, CheckCircle2, Heart, Sparkles, ThumbsUp } from 'lucide-react';
import { AppReview, UserProfile } from '../types';
import { saveStoredReview } from './ReviewModal';

interface ExitLikeModalProps {
  isOpen: boolean;
  onClose: () => void;
  userProfile?: UserProfile | null;
  onReviewSubmitted?: (reviews: AppReview[]) => void;
}

export const ExitLikeModal: React.FC<ExitLikeModalProps> = ({
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
  const [comment, setComment] = useState('¡Excelente aplicación para entrenadores de baloncesto! La recomiendo 100%.');
  const [isSubmittedSuccess, setIsSubmittedSuccess] = useState(false);

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

    setIsSubmittedSuccess(true);
    setTimeout(() => {
      setIsSubmittedSuccess(false);
      onClose();
    }, 2000);
  };

  return (
    <div data-exit-like-modal="true" className="fixed inset-0 bg-slate-950/85 backdrop-blur-md z-50 flex items-center justify-center p-4 overflow-y-auto animate-fadeIn">
      <div className="bg-slate-900 border-2 border-amber-500/50 rounded-3xl shadow-2xl max-w-lg w-full p-6 sm:p-8 space-y-5 relative my-auto text-white">
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {isSubmittedSuccess ? (
          <div className="text-center py-8 space-y-4 animate-fadeIn">
            <div className="w-16 h-16 rounded-3xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/20">
              <CheckCircle2 className="w-8 h-8 animate-bounce" />
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-black text-white">
                ¡Gracias por tu Like y Reseña! 👍
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed max-w-xs mx-auto">
                Tu valoración ha sido guardada e integrada en el <span className="font-bold text-amber-400">Panel de Reseñas</span> de CoachMind.
              </p>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Top Badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-black uppercase tracking-wider">
              <Heart className="w-3.5 h-3.5 text-amber-400 fill-amber-400 animate-pulse" />
              <span>Aviso Importante</span>
            </div>

            {/* Title */}
            <div className="space-y-1">
              <h2 className="text-2xl font-black tracking-tight text-white flex items-center gap-2">
                <span>¡No te vayas sin dejar tu Like!</span>
                <span className="text-2xl">👍</span>
              </h2>
              <p className="text-xs text-slate-300 leading-relaxed">
                Tu apoyo ayuda a miles de entrenadores de baloncesto. Déjanos tu estrella y valoración para incluirla en el <strong className="text-amber-400">Panel de Reseñas</strong>.
              </p>
            </div>

            {/* Star Rating selector */}
            <div className="p-4 rounded-2xl bg-slate-800/90 border border-amber-500/30 text-center space-y-2 shadow-inner">
              <label className="block text-xs font-extrabold text-amber-400 uppercase tracking-wider">
                Tu Valoración
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
                            : 'text-slate-700'
                        }`}
                      />
                    </button>
                  );
                })}
              </div>

              <div className="text-xs font-bold text-amber-300">
                {rating === 5 && '⭐⭐⭐⭐⭐ ¡Súper recomendada para entrenadores!'}
                {rating === 4 && '⭐⭐⭐⭐ Excelente aplicación'}
                {rating === 3 && '⭐⭐⭐ Buena herramienta'}
                {rating === 2 && '⭐⭐ Aceptable'}
                {rating === 1 && '⭐ Mejorable'}
              </div>
            </div>

            {/* Author details */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="block text-[11px] font-bold text-slate-300">
                  Tu Nombre
                </label>
                <input
                  type="text"
                  required
                  value={authorName}
                  onChange={(e) => setAuthorName(e.target.value)}
                  placeholder="ej. Carlos Entrenador"
                  className="w-full p-2.5 rounded-xl border border-slate-700 bg-slate-800 text-xs text-white font-medium focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[11px] font-bold text-slate-300">
                  Club / Equipo
                </label>
                <input
                  type="text"
                  required
                  value={club}
                  onChange={(e) => setClub(e.target.value)}
                  placeholder="ej. CB Alcobendas"
                  className="w-full p-2.5 rounded-xl border border-slate-700 bg-slate-800 text-xs text-white font-medium focus:ring-2 focus:ring-amber-500"
                />
              </div>
            </div>

            {/* Review Comment */}
            <div className="space-y-1">
              <label className="block text-[11px] font-bold text-slate-300">
                Tu Comentario o Reseña
              </label>
              <textarea
                rows={2}
                required
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Escribe lo que más te ha gustado de CoachMind..."
                className="w-full p-3 rounded-xl border border-slate-700 bg-slate-800 text-xs text-white font-medium focus:ring-2 focus:ring-amber-500 focus:outline-none resize-none"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2.5 pt-1">
              <button
                type="button"
                onClick={onClose}
                className="w-1/3 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition-colors cursor-pointer text-center"
              >
                Cerrar
              </button>
              <button
                type="submit"
                className="w-2/3 py-3 rounded-xl bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-600 hover:to-orange-600 text-slate-950 font-black text-xs shadow-lg shadow-amber-500/20 transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <ThumbsUp className="w-4 h-4 fill-slate-950 text-slate-950" />
                <span>Dejar mi Like y Reseña 👍</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
