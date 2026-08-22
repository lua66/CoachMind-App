import React, { useState, useEffect } from 'react';
import {
  X,
  MessageSquare,
  Send,
  User,
  Globe,
  Award,
  BookOpen,
  Dumbbell,
  ClipboardList,
  Sparkles,
  Phone,
  CheckCircle2,
  Shield,
  Briefcase,
  GraduationCap,
  Users,
} from 'lucide-react';
import { UserProfile } from '../types';

interface WhatsAppInterviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  userProfile?: UserProfile | null;
  phoneNumber?: string; // Default +34608180231
}

export const WhatsAppInterviewModal: React.FC<WhatsAppInterviewModalProps> = ({
  isOpen,
  onClose,
  userProfile,
  phoneNumber = '34608180231',
}) => {
  const [fullName, setFullName] = useState('');
  const [country, setCountry] = useState('');
  const [club, setClub] = useState('');
  const [trainingLevel, setTrainingLevel] = useState('Formación / Cantera (Infantil - Junior)');
  const [coachLevel, setCoachLevel] = useState('Nivel 2 (Autonómico / Provincial)');
  const [interviewType, setInterviewType] = useState<'tecnica' | 'tactica' | 'fisica' | 'gestion'>('tactica');
  const [additionalNotes, setAdditionalNotes] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);

  useEffect(() => {
    if (userProfile) {
      setFullName(`${userProfile.firstName || ''} ${userProfile.lastName || ''}`.trim());
      setCountry(userProfile.country || 'España');
      setClub(userProfile.club || '');
      if (userProfile.teamLevel) {
        setTrainingLevel(userProfile.teamLevel);
      }
    }
  }, [userProfile, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!fullName.trim()) {
      alert('Por favor introduce tu nombre.');
      return;
    }
    if (!country.trim()) {
      alert('Por favor indica tu país.');
      return;
    }
    if (!club.trim()) {
      alert('Por favor indica el nombre de tu club o equipo.');
      return;
    }

    const typeLabels = {
      tecnica: '🏀 Técnica (Técnica individual, tiro, bote, pase)',
      tactica: '📋 Táctica (Sistemas de juego, defensa, ataque, pizarra, scout)',
      fisica: '🏋️‍♂️ Física (Preparación física, acondicionamiento y prevenciones)',
      gestion: '💼 Gestión Deportiva (Dirección de club, cantera y planificación)',
    };

    const message = `🏀 *SOLICITUD DE ENTREVISTA / CONTACTO POR WHATSAPP* 🏀

👤 *Nombre:* ${fullName.trim()}
🌍 *País:* ${country.trim()}
🛡️ *Club:* ${club.trim()}
📊 *Nivel que entrena:* ${trainingLevel}
🎓 *Nivel de Entrenador (Título):* ${coachLevel}
🎯 *Tipo de Entrevista deseada:* ${typeLabels[interviewType]}
${additionalNotes.trim() ? `📝 *Notas adicionales:* ${additionalNotes.trim()}\n` : ''}
----------------------------------------
Hola, te contacto a través de CoachMind con estos datos para que puedas saber quién soy y qué tema me interesa para la entrevista. ¡Un saludo!`;

    // Clean phone number
    const cleanNumber = phoneNumber.replace(/[^0-9]/g, '') || '34608180231';
    const whatsappUrl = `https://wa.me/${cleanNumber}?text=${encodeURIComponent(message)}`;

    // Save history locally
    try {
      const history = JSON.parse(localStorage.getItem('coachmind_whatsapp_interviews') || '[]');
      history.push({
        fullName,
        country,
        club,
        trainingLevel,
        coachLevel,
        interviewType,
        additionalNotes,
        date: new Date().toISOString(),
      });
      localStorage.setItem('coachmind_whatsapp_interviews', JSON.stringify(history));
    } catch (err) {
      console.error('Error saving interview record', err);
    }

    setIsSuccess(true);

    // Open WhatsApp
    window.open(whatsappUrl, '_blank');

    setTimeout(() => {
      setIsSuccess(false);
      onClose();
    }, 2500);
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-fadeIn overflow-y-auto"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-slate-900 border border-emerald-500/40 rounded-3xl w-full max-w-lg text-white shadow-2xl p-5 sm:p-7 relative my-auto max-h-[92vh] overflow-y-auto custom-scrollbar flex flex-col"
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer z-20"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Glow Background Effect */}
        <div className="absolute -top-12 -left-12 w-32 h-32 bg-emerald-500/20 rounded-full blur-3xl pointer-events-none" />

        {isSuccess ? (
          <div className="text-center py-10 space-y-4 animate-fadeIn my-auto">
            <div className="w-16 h-16 rounded-3xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center justify-center mx-auto shadow-xl shadow-emerald-500/20">
              <CheckCircle2 className="w-8 h-8 animate-bounce text-emerald-400" />
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-black text-white">¡Formulario Enviado a WhatsApp!</h3>
              <p className="text-xs text-slate-300 max-w-xs mx-auto leading-relaxed">
                Se ha abierto la aplicación de WhatsApp con toda tu información formateada para iniciar la conversación.
              </p>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 relative z-10">
            {/* Header Badge */}
            <div className="space-y-1.5">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-black uppercase tracking-wider">
                <MessageSquare className="w-3.5 h-3.5 text-emerald-400" />
                <span>Contacto Directo por WhatsApp</span>
              </div>

              <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white flex items-center gap-2">
                <span>Formulario de Entrevista</span>
                <span className="text-2xl">📲</span>
              </h2>

              <p className="text-xs text-slate-300 leading-relaxed">
                Rellena este breve formulario para enviar tus datos directamente a mi WhatsApp y coordinar la entrevista según tus necesidades.
              </p>
            </div>

            {/* Inputs Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              {/* 1. Nombre */}
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-300 mb-1 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Nombre Completo *</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Juan Pérez"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800/90 border border-slate-700 text-white text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/30 font-medium"
                />
              </div>

              {/* 2. País */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1 flex items-center gap-1.5">
                  <Globe className="w-3.5 h-3.5 text-emerald-400" />
                  <span>País *</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej: España, Argentina, México..."
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800/90 border border-slate-700 text-white text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/30 font-medium"
                />
              </div>

              {/* 3. Club */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1 flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Club / Equipo *</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej: CB Estudiantes, Real Madrid..."
                  value={club}
                  onChange={(e) => setClub(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800/90 border border-slate-700 text-white text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/30 font-medium"
                />
              </div>

              {/* 4. Nivel que entrena */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1 flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Nivel que entrena *</span>
                </label>
                <select
                  value={trainingLevel}
                  onChange={(e) => setTrainingLevel(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800/90 border border-slate-700 text-white text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/30 font-medium cursor-pointer"
                >
                  <option value="Iniciación / Escuelas / Minibasket">Iniciación / Escuelas / Minibasket</option>
                  <option value="Formación / Cantera (Infantil - Junior)">Formación / Cantera (Infantil - Junior)</option>
                  <option value="Senior Autonómico / Regional">Senior Autonómico / Regional</option>
                  <option value="Senior Nacional / Liga EBA / FEB">Senior Nacional / Liga EBA / FEB</option>
                  <option value="Alto Rendimiento / Profesional">Alto Rendimiento / Profesional</option>
                </select>
              </div>

              {/* 5. Nivel que tiene de entrenador */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1 flex items-center gap-1.5">
                  <GraduationCap className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Nivel que tiene de entrenador *</span>
                </label>
                <select
                  value={coachLevel}
                  onChange={(e) => setCoachLevel(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800/90 border border-slate-700 text-white text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/30 font-medium cursor-pointer"
                >
                  <option value="Sin Titulación / Ayudante">Sin Titulación / Ayudante</option>
                  <option value="Nivel 1 (Iniciación / Base)">Nivel 1 (Iniciación / Base)</option>
                  <option value="Nivel 2 (Autonómico / Provincial)">Nivel 2 (Autonómico / Provincial)</option>
                  <option value="Nivel 3 (Entrenador Superior / FEB / FIBA)">Nivel 3 (Entrenador Superior / FEB / FIBA)</option>
                  <option value="Licencia Internacional / Profesional">Licencia Internacional / Profesional</option>
                </select>
              </div>

              {/* 6. Tipo de entrevista deseada */}
              <div className="sm:col-span-2 space-y-1.5 pt-1">
                <label className="block text-xs font-bold text-slate-300 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Tipo de Entrevista / Consulta Deseada *</span>
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <button
                    type="button"
                    onClick={() => setInterviewType('tecnica')}
                    className={`p-2.5 rounded-xl border transition-all cursor-pointer flex flex-col items-center justify-center gap-1 text-center ${
                      interviewType === 'tecnica'
                        ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300 font-extrabold shadow-md'
                        : 'bg-slate-800/60 border-slate-700/80 text-slate-400 hover:text-white hover:bg-slate-800'
                    }`}
                  >
                    <BookOpen className="w-4 h-4 text-emerald-400" />
                    <span className="text-[11px]">Técnica</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setInterviewType('tactica')}
                    className={`p-2.5 rounded-xl border transition-all cursor-pointer flex flex-col items-center justify-center gap-1 text-center ${
                      interviewType === 'tactica'
                        ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300 font-extrabold shadow-md'
                        : 'bg-slate-800/60 border-slate-700/80 text-slate-400 hover:text-white hover:bg-slate-800'
                    }`}
                  >
                    <ClipboardList className="w-4 h-4 text-emerald-400" />
                    <span className="text-[11px]">Táctica</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setInterviewType('fisica')}
                    className={`p-2.5 rounded-xl border transition-all cursor-pointer flex flex-col items-center justify-center gap-1 text-center ${
                      interviewType === 'fisica'
                        ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300 font-extrabold shadow-md'
                        : 'bg-slate-800/60 border-slate-700/80 text-slate-400 hover:text-white hover:bg-slate-800'
                    }`}
                  >
                    <Dumbbell className="w-4 h-4 text-emerald-400" />
                    <span className="text-[11px]">Física</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setInterviewType('gestion')}
                    className={`p-2.5 rounded-xl border transition-all cursor-pointer flex flex-col items-center justify-center gap-1 text-center ${
                      interviewType === 'gestion'
                        ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300 font-extrabold shadow-md'
                        : 'bg-slate-800/60 border-slate-700/80 text-slate-400 hover:text-white hover:bg-slate-800'
                    }`}
                  >
                    <Briefcase className="w-4 h-4 text-emerald-400" />
                    <span className="text-[11px]">Gestión Dep.</span>
                  </button>
                </div>
              </div>

              {/* Notas opcionales */}
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Detalles o Temas Específicos (Opcional)
                </label>
                <textarea
                  rows={2}
                  placeholder="Ej: Quisiera profundizar en sistemas de ataque contra defensa zonal y gestión de vestuario..."
                  value={additionalNotes}
                  onChange={(e) => setAdditionalNotes(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800/90 border border-slate-700 text-white text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/30 font-medium resize-none"
                />
              </div>
            </div>

            {/* Submit Button */}
            <div className="pt-2">
              <button
                type="submit"
                className="w-full py-3 px-5 rounded-2xl bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-sm flex items-center justify-center gap-2 shadow-xl shadow-emerald-500/20 active:scale-[0.98] transition-all cursor-pointer"
              >
                <Send className="w-4 h-4 text-slate-950 stroke-[3]" />
                <span>Enviar y Abrir Chat de WhatsApp Directo</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

