import React, { useState, useEffect } from 'react';
import {
  Settings,
  MessageSquare,
  Smartphone,
  ShieldCheck,
  User,
  Globe,
  Shield,
  Users,
  GraduationCap,
  Sparkles,
  BookOpen,
  ClipboardList,
  Dumbbell,
  Briefcase,
  Send,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { UserProfile } from '../types';

interface SettingsViewProps {
  userProfile?: UserProfile | null;
  onUpdateProfile?: (profile: UserProfile | null) => void;
  onOpenRegisterModal?: () => void;
  onClearAllData?: () => void;
  onOpenFichaLockModal?: () => void;
  onOpenWhatsAppInterview?: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  userProfile,
  onOpenWhatsAppInterview,
}) => {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [fullName, setFullName] = useState('');
  const [country, setCountry] = useState('España');
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
  }, [userProfile]);

  const handleToggleForm = () => {
    setIsFormOpen((prev) => !prev);
    if (onOpenWhatsAppInterview) {
      onOpenWhatsAppInterview();
    }
  };

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

    const cleanNumber = '34608180231';
    const whatsappUrl = `https://wa.me/${cleanNumber}?text=${encodeURIComponent(message)}`;

    setIsSuccess(true);
    window.open(whatsappUrl, '_blank');

    setTimeout(() => {
      setIsSuccess(false);
    }, 4000);
  };

  return (
    <div className="space-y-6 animate-fadeIn max-w-2xl mx-auto pb-12">
      {/* Settings Header */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm flex items-center gap-4">
        <div className="w-12 h-12 rounded-2xl bg-slate-900 flex items-center justify-center text-white shadow-lg shadow-slate-900/20 shrink-0">
          <Settings className="w-6 h-6 text-emerald-400" />
        </div>
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Configuración
          </h1>
          <p className="text-xs text-slate-500 font-medium">
            Atención al entrenador y solicitudes de entrevista por WhatsApp
          </p>
        </div>
      </div>

      {/* Main WhatsApp Card */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-950 to-emerald-950 p-6 sm:p-8 rounded-3xl border border-emerald-500/30 text-white shadow-xl space-y-6 relative overflow-hidden">
        {/* Glow effect */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex items-center gap-2.5">
          <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-black uppercase tracking-wider flex items-center gap-1.5">
            <MessageSquare className="w-3.5 h-3.5 text-emerald-400" />
            <span>Contacto Directo</span>
          </span>
          <span className="text-xs font-bold text-amber-300">WhatsApp Oficial</span>
        </div>

        <div className="space-y-2">
          <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight leading-tight">
            Solicitar Entrevista o Asesoría por WhatsApp 🏀
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed max-w-lg">
            Haz clic en el botón para desplegar el formulario de solicitud. Podrás indicar tu
            <strong> Nombre, País, Club, Nivel que entrenas, Titulación de entrenador</strong> y el
            <strong> Tipo de Entrevista</strong> (Técnica, Táctica, Física o Gestión Deportiva).
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-slate-800/80 border border-slate-700/80 space-y-2 text-xs text-slate-300">
          <div className="font-extrabold text-white flex items-center gap-1.5 text-xs">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>¿Qué ocurre al enviar el formulario?</span>
          </div>
          <p className="leading-relaxed">
            Se compilarán todos tus datos en un mensaje formateado y se abrirá directamente tu aplicación de WhatsApp para enviarme la información y coordinar la entrevista inmediatamente.
          </p>
        </div>

        {/* Action Button */}
        <button
          type="button"
          onClick={handleToggleForm}
          className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-sm sm:text-base flex items-center justify-center gap-3 shadow-xl shadow-emerald-500/25 hover:scale-[1.01] active:scale-[0.99] transition-all cursor-pointer"
        >
          <Smartphone className="w-5 h-5 text-slate-950 stroke-[2.5]" />
          <span>{isFormOpen ? 'Ocultar Formulario' : 'Contactar por WhatsApp'}</span>
          {isFormOpen ? (
            <ChevronUp className="w-5 h-5 text-slate-950 stroke-[2.5]" />
          ) : (
            <ChevronDown className="w-5 h-5 text-slate-950 stroke-[2.5]" />
          )}
        </button>

        {/* Embedded Form in SettingsView */}
        {isFormOpen && (
          <div className="pt-4 border-t border-slate-800 animate-fadeIn">
            {isSuccess ? (
              <div className="text-center py-8 space-y-3 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-6">
                <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto animate-bounce" />
                <h3 className="text-lg font-black text-white">¡Formulario Enviado!</h3>
                <p className="text-xs text-slate-300">
                  Se ha abierto WhatsApp con toda tu información preparada.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4 text-left">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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

                  {/* 6. Tipo de entrevista */}
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
                      placeholder="Ej: Quisiera profundizar en sistemas de ataque contra defensa zonal..."
                      value={additionalNotes}
                      onChange={(e) => setAdditionalNotes(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800/90 border border-slate-700 text-white text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/30 font-medium resize-none"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-3.5 px-5 rounded-2xl bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-xl shadow-emerald-500/20 active:scale-[0.98] transition-all cursor-pointer mt-2"
                >
                  <Send className="w-4 h-4 text-slate-950 stroke-[3]" />
                  <span>Enviar y Abrir Chat de WhatsApp Directo</span>
                </button>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
