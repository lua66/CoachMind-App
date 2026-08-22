import React, { useState } from 'react';
import { UserProfile } from '../types';
import {
  ShieldCheck,
  User,
  Mail,
  Phone,
  Globe,
  MapPin,
  ShieldAlert,
  Award,
  X,
  Sparkles,
  CheckCircle2,
  Loader2,
  LogIn,
  KeyRound,
  Calendar,
  MessageSquare,
  Smartphone,
  ArrowRight,
  Trophy,
} from 'lucide-react';
import { 
  auth, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword 
} from '../lib/firebase';
import { saveCoachProfileToFirestore } from '../lib/firebaseSync';

interface RegistrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRegister: (profile: UserProfile) => void;
  titleNotice?: string;
  userProfile?: UserProfile | null;
  onOpenWhatsAppInterview?: () => void;
}

export const RegistrationModal: React.FC<RegistrationModalProps> = ({
  isOpen,
  onClose,
  onRegister,
  titleNotice,
  userProfile,
  onOpenWhatsAppInterview,
}) => {
  // View Mode: 'register' or 'login'
  const [authMode, setAuthMode] = useState<'register' | 'login'>('register');

  // Form Fields
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [country, setCountry] = useState('España');
  const [town, setTown] = useState('');
  const [club, setClub] = useState('');
  const [season, setSeason] = useState('2025/2026');
  const [teamGender, setTeamGender] = useState('Masculino');
  const [coachRole, setCoachRole] = useState('Entrenador Principal');
  const [coachLevel, setCoachLevel] = useState('Nivel 2 / Autonómico');
  const [teamLevel, setTeamLevel] = useState('Autonómico');
  const [teamCategory, setTeamCategory] = useState('Senior');
  const [errorMsg, setErrorMsg] = useState('');

  // Login Fields
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Processing & Success State
  const [isProcessing, setIsProcessing] = useState(false);
  const [registerSuccess, setRegisterSuccess] = useState(false);
  const [createdProfile, setCreatedProfile] = useState<UserProfile | null>(null);

  // Pre-fill user data if userProfile is provided
  React.useEffect(() => {
    if (isOpen) {
      if (userProfile) {
        setFirstName(userProfile.firstName || '');
        setLastName(userProfile.lastName || '');
        setEmail(userProfile.email || '');
        setPhone(userProfile.phone || '');
        setCountry(userProfile.country || 'España');
        setTown(userProfile.town || '');
        setClub(userProfile.club || '');
        setSeason(userProfile.season || '2025/2026');
        setCoachRole(userProfile.coachRole || 'Entrenador Principal');
        setCoachLevel(userProfile.coachLevel || 'Nivel 2 / Autonómico');
        setTeamGender(userProfile.teamGender || 'Masculino');
        setTeamLevel(userProfile.teamLevel || 'Autonómico');
        setTeamCategory(userProfile.teamCategory || 'Senior');
      }
      setErrorMsg('');
      setRegisterSuccess(false);
      setIsProcessing(false);
    }
  }, [isOpen, userProfile]);

  if (!isOpen) return null;

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginEmail.trim() || !loginPassword.trim()) {
      setErrorMsg('Introduce tu correo y contraseña para iniciar sesión.');
      return;
    }
    setErrorMsg('');
    setIsLoggingIn(true);

    try {
      await signInWithEmailAndPassword(auth, loginEmail.trim(), loginPassword.trim());
      setIsLoggingIn(false);
      onClose();
    } catch (err: any) {
      console.error('Login error:', err);
      setIsLoggingIn(false);
      if (err.code === 'auth/invalid-credential' || err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') {
        setErrorMsg('El correo electrónico o la contraseña son incorrectos.');
      } else {
        setErrorMsg('Error al iniciar sesión. Por favor verifica tus datos.');
      }
    }
  };

  const handleFreeRegistrationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (
      !firstName.trim() ||
      !lastName.trim() ||
      !email.trim() ||
      !password.trim() ||
      !phone.trim() ||
      !country.trim() ||
      !town.trim() ||
      !club.trim()
    ) {
      setErrorMsg('Por favor completa los campos obligatorios (*) para obtener tu carnet de entrenador.');
      return;
    }

    if (password.trim().length < 6) {
      setErrorMsg('La contraseña debe tener al menos 6 caracteres.');
      return;
    }

    setIsProcessing(true);

    try {
      // Create user or get current user in Firebase Auth
      let userUid = auth.currentUser?.uid || '';
      if (!userUid && email.trim() && password.trim()) {
        try {
          const userCred = await createUserWithEmailAndPassword(auth, email.trim(), password.trim());
          userUid = userCred.user.uid;
        } catch (authError: any) {
          if (authError.code === 'auth/email-already-in-use') {
            try {
              const loginCred = await signInWithEmailAndPassword(auth, email.trim(), password.trim());
              userUid = loginCred.user.uid;
            } catch (signInErr) {
              if (!userProfile) {
                setIsProcessing(false);
                setErrorMsg('Este correo ya está registrado. Por favor introduce tu contraseña o inicia sesión.');
                return;
              }
            }
          } else if (!userProfile) {
            setIsProcessing(false);
            setErrorMsg(authError.message || 'Error al registrar la cuenta.');
            return;
          }
        }
      }

      const profile: UserProfile = {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim(),
        phone: phone.trim(),
        country: country.trim(),
        town: town.trim(),
        club: club.trim(),
        season: season.trim() || '2025/2026',
        teamGender: teamGender.trim() || 'Masculino',
        coachRole: coachRole.trim() || 'Entrenador Principal',
        coachLevel: coachLevel.trim() || 'Nivel 2 / Autonómico',
        teamLevel: teamLevel.trim() || 'Autonómico',
        teamCategory: teamCategory.trim() || 'Senior',
        registeredAt: new Date().toLocaleDateString('es-ES', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
        }),
        subscriptionPlan: 'free_unlimited',
        subscriptionStatus: 'active',
        creditsRemaining: 999999,
        totalCredits: 999999,
      };

      // Save to Firebase Firestore
      if (userUid) {
        await saveCoachProfileToFirestore(userUid, profile);
      }

      // Sync user record to Google Sheets / Database backend
      try {
        const sheetRecord = {
          fechaRegistro: profile.registeredAt,
          nombreCompleto: `${profile.firstName} ${profile.lastName}`,
          email: profile.email,
          telefono: profile.phone,
          pais: profile.country,
          ciudad: profile.town,
          club: profile.club,
          cargoRol: profile.coachRole,
          titulacion: profile.coachLevel,
          generoEquipo: profile.teamGender,
          nivelEquipo: profile.teamLevel,
          categoriaEquipo: profile.teamCategory,
          plan: 'Licencia Gratuita Libre (Acceso Total)',
          metodoPago: 'Registro Gratuito',
          estado: 'Licencia Gratuita Registrada',
        };

        const existingSheets = JSON.parse(localStorage.getItem('coachmind_google_sheet_records') || '[]');
        existingSheets.push(sheetRecord);
        localStorage.setItem('coachmind_google_sheet_records', JSON.stringify(existingSheets));

        const GOOGLE_SHEETS_WEBHOOK_URL = 'https://script.google.com/macros/s/AKfycbxViXxELdCzL_aH1Nn2OIODG60Xc-gp9u9qmepH7klAt9YslYezOCA5ShNJxaLhxN_lgw/exec';

        // 1. Try backend Express API sync
        fetch('/api/sync-google-sheet', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(sheetRecord),
        }).catch(() => {});

        // 2. Direct client-side dispatch to Google Sheets Webhook (Essential for Vercel static deployments & guest mode)
        fetch(GOOGLE_SHEETS_WEBHOOK_URL, {
          method: 'POST',
          mode: 'no-cors',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(sheetRecord),
        }).catch((err) => {
          console.warn('Direct Google Sheets Webhook sync warning:', err);
        });
      } catch (err) {
        console.error('Sheet sync error:', err);
      }

      setIsProcessing(false);
      setCreatedProfile(profile);
      setRegisterSuccess(true);
    } catch (err: any) {
      console.error('Registration error:', err);
      setIsProcessing(false);
      setErrorMsg('Ocurrió un error al procesar el registro. Por favor, inténtalo de nuevo.');
    }
  };

  const handleFinish = () => {
    if (createdProfile) {
      onRegister(createdProfile);
    }
    onClose();
  };

  return (
    <div data-registration-modal="true" className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/85 backdrop-blur-md animate-fadeIn overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700/90 rounded-3xl w-full max-w-2xl text-white shadow-2xl overflow-hidden my-auto relative">
        {/* Top Header Banner */}
        <div className="bg-gradient-to-r from-amber-600 via-orange-600 to-amber-700 p-5 sm:p-6 text-white relative overflow-hidden">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-full bg-black/20 hover:bg-black/40 text-white/80 hover:text-white transition-all cursor-pointer"
            aria-label="Cerrar modal"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center shadow-inner shrink-0">
              <ShieldCheck className="w-7 h-7 text-amber-200" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-2.5 py-0.5 rounded-full bg-black/20 text-amber-100 border border-white/20 text-[10px] font-black uppercase tracking-wider flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-amber-300" />
                  Acceso Total 100% Gratuito
                </span>
              </div>
              <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight mt-0.5">
                {registerSuccess ? '¡Carnet Digital Activado!' : 'Licencia Digital de Entrenador'}
              </h3>
            </div>
          </div>

          {!registerSuccess && (
            <div className="flex border-b border-white/10 bg-black/20 text-xs font-bold mt-4 rounded-xl overflow-hidden">
              <button
                type="button"
                onClick={() => {
                  setAuthMode('register');
                  setErrorMsg('');
                }}
                className={`flex-1 py-2.5 px-4 flex items-center justify-center gap-2 transition-colors cursor-pointer ${
                  authMode === 'register'
                    ? 'bg-white/20 text-white border-b-2 border-white'
                    : 'text-amber-100/70 hover:text-white'
                }`}
              >
                <Sparkles className="w-4 h-4 text-amber-300" />
                <span>Registrarme Gratis</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setAuthMode('login');
                  setErrorMsg('');
                }}
                className={`flex-1 py-2.5 px-4 flex items-center justify-center gap-2 transition-colors cursor-pointer ${
                  authMode === 'login'
                    ? 'bg-white/20 text-white border-b-2 border-white'
                    : 'text-amber-100/70 hover:text-white'
                }`}
              >
                <LogIn className="w-4 h-4 text-amber-300" />
                <span>Iniciar Sesión</span>
              </button>
            </div>
          )}

          <p className="text-xs sm:text-sm text-amber-100/90 mt-2.5 leading-relaxed">
            {registerSuccess
              ? 'Tu ficha y carnet de entrenador oficial han quedado registrados correctamente.'
              : authMode === 'register'
              ? titleNotice || 'Registra tus datos como entrenador de forma totalmente gratuita para guardar tus pizarras, ejercicios y equipos.'
              : 'Ingresa tus credenciales para cargar tu perfil de entrenador.'}
          </p>
        </div>

        {/* LOGIN FORM */}
        {!registerSuccess && authMode === 'login' && (
          <form onSubmit={handleLoginSubmit} autoComplete="off" className="p-5 sm:p-6 space-y-4">
            {errorMsg && (
              <div className="p-3.5 rounded-xl bg-red-950/80 border border-red-800/80 text-red-200 text-xs font-medium flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-red-400 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <div className="space-y-3.5 max-w-md mx-auto py-2">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-blue-400" />
                  Correo Electrónico *
                </label>
                <input
                  type="email"
                  required
                  autoComplete="off"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  placeholder="entrenador@miclub.com"
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                  <KeyRound className="w-3.5 h-3.5 text-amber-400" />
                  Contraseña *
                </label>
                <input
                  type="password"
                  required
                  autoComplete="current-password"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="pt-3 flex items-center justify-between gap-3 border-t border-slate-800/80">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-all cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isLoggingIn}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-white text-xs font-black flex items-center justify-center gap-2 shadow-lg shadow-orange-500/20 active:scale-95 transition-all cursor-pointer disabled:opacity-50"
              >
                {isLoggingIn ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                    <span>Iniciando Sesión...</span>
                  </>
                ) : (
                  <>
                    <LogIn className="w-4 h-4 text-white" />
                    <span>Entrar a Mi Panel</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}

        {/* FREE REGISTRATION FORM */}
        {!registerSuccess && authMode === 'register' && (
          <form onSubmit={handleFreeRegistrationSubmit} autoComplete="off" className="p-5 sm:p-6 space-y-4">
            {errorMsg && (
              <div className="p-3.5 rounded-xl bg-red-950/80 border border-red-800/80 text-red-200 text-xs font-medium flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-red-400 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {/* Nombre */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-amber-400" />
                  Nombre *
                </label>
                <input
                  type="text"
                  required
                  autoComplete="off"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="Ej. Carlos"
                  className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>

              {/* Apellidos */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-amber-400" />
                  Apellidos *
                </label>
                <input
                  type="text"
                  required
                  autoComplete="off"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Ej. García Martínez"
                  className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>

              {/* Correo Electrónico */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-amber-400" />
                  Correo Electrónico *
                </label>
                <input
                  type="email"
                  required
                  autoComplete="off"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="entrenador@miclub.com"
                  className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>

              {/* Contraseña */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                  <KeyRound className="w-3.5 h-3.5 text-amber-400" />
                  Contraseña (mín. 6 caracteres) *
                </label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>

              {/* Teléfono */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-amber-400" />
                  Teléfono / WhatsApp *
                </label>
                <input
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+34 612 345 678"
                  className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>

              {/* País */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                  <Globe className="w-3.5 h-3.5 text-amber-400" />
                  País *
                </label>
                <input
                  type="text"
                  required
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  placeholder="España, Argentina, México..."
                  className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>

              {/* Pueblo / Ciudad */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-amber-400" />
                  Pueblo / Ciudad *
                </label>
                <input
                  type="text"
                  required
                  value={town}
                  onChange={(e) => setTown(e.target.value)}
                  placeholder="Ej. Madrid, Valencia, Sevilla..."
                  className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>

              {/* Club */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                  <Award className="w-3.5 h-3.5 text-amber-400" />
                  Club / Colegio / Entidad *
                </label>
                <input
                  type="text"
                  required
                  value={club}
                  onChange={(e) => setClub(e.target.value)}
                  placeholder="Ej. Club Baloncesto Estudiantes / C.B. San Fernando"
                  className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>

              {/* Temporada */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-amber-400" />
                  Temporada Actual *
                </label>
                <input
                  type="text"
                  required
                  value={season}
                  onChange={(e) => setSeason(e.target.value)}
                  placeholder="Ej. 2025/2026"
                  className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>

              {/* Cargo / Rol */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-300">Cargo / Rol en el Equipo *</label>
                <select
                  value={coachRole}
                  onChange={(e) => setCoachRole(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none"
                >
                  <option value="Entrenador Principal">Entrenador Principal</option>
                  <option value="Entrenador Ayudante">Entrenador Ayudante</option>
                  <option value="Director Técnico">Director Técnico</option>
                  <option value="Preparador Físico">Preparador Físico</option>
                  <option value="Coordinador Cantera">Coordinador Cantera</option>
                </select>
              </div>

              {/* Titulación */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-300">Titulación / Licencia FEB *</label>
                <select
                  value={coachLevel}
                  onChange={(e) => setCoachLevel(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none"
                >
                  <option value="Nivel 1 / Iniciación">Nivel 1 / Iniciación</option>
                  <option value="Nivel 2 / Autonómico">Nivel 2 / Autonómico</option>
                  <option value="Nivel 3 / Superior (FEB)">Nivel 3 / Superior (FEB)</option>
                  <option value="Sin Titulación Oficial">Sin Titulación Oficial</option>
                  <option value="Estudiante Ciencias del Deporte">Estudiante Ciencias del Deporte</option>
                </select>
              </div>

              {/* Categoría */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-300">Categoría del Equipo *</label>
                <select
                  value={teamCategory}
                  onChange={(e) => setTeamCategory(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none"
                >
                  <option value="Benjamín (Sub-10)">Benjamín (Sub-10)</option>
                  <option value="Alevín (Sub-12)">Alevín (Sub-12)</option>
                  <option value="Infantil (Sub-14)">Infantil (Sub-14)</option>
                  <option value="Cadete (Sub-16)">Cadete (Sub-16)</option>
                  <option value="Juvenil / Junior (Sub-18)">Juvenil / Junior (Sub-18)</option>
                  <option value="Sub-22">Sub-22</option>
                  <option value="Senior">Senior</option>
                  <option value="Sénior Pro">Sénior Pro</option>
                  <option value="Veteranos">Veteranos</option>
                </select>
              </div>
            </div>

            <div className="pt-3 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-slate-800/80">
              <button
                type="button"
                onClick={onClose}
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-all cursor-pointer"
              >
                Cancelar
              </button>

              <button
                type="submit"
                disabled={isProcessing}
                className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-white text-xs font-black flex items-center justify-center gap-2 shadow-lg shadow-orange-500/20 active:scale-95 transition-all cursor-pointer disabled:opacity-50"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                    <span>Registrando Licencia...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-white" />
                    <span>Obtener Carnet Gratuito y Activar Plataforma</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}

        {/* REGISTRATION SUCCESS VIEW */}
        {registerSuccess && createdProfile && (
          <div className="p-6 space-y-5 text-center">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 mx-auto flex items-center justify-center animate-bounce">
              <CheckCircle2 className="w-10 h-10" />
            </div>

            <div>
              <h4 className="text-xl font-black text-white">¡Licencia Digital de Entrenador Activada!</h4>
              <p className="text-xs text-slate-300 mt-1 max-w-md mx-auto">
                Tus datos han sido guardados en la base de datos oficial. Ya tienes acceso completo e ilimitado a todas las herramientas de CoachMind.
              </p>
            </div>

            {/* Carnet Preview */}
            <div className="bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-4 rounded-2xl border border-amber-500/30 text-left space-y-2 relative overflow-hidden">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <div className="flex items-center gap-2">
                  <Trophy className="w-4 h-4 text-amber-400" />
                  <span className="text-xs font-black text-amber-300 uppercase tracking-wide">CoachMind Baloncesto</span>
                </div>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-black">
                  Licencia Verificada
                </span>
              </div>
              <p className="text-sm font-extrabold text-white">{createdProfile.firstName} {createdProfile.lastName}</p>
              <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-300">
                <div><span className="text-slate-500">Club:</span> {createdProfile.club}</div>
                <div><span className="text-slate-500">Cargo:</span> {createdProfile.coachRole}</div>
                <div><span className="text-slate-500">Titulación:</span> {createdProfile.coachLevel}</div>
                <div><span className="text-slate-500">Categoría:</span> {createdProfile.teamCategory}</div>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={handleFinish}
                className="w-full py-3 px-6 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white font-black text-xs flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 cursor-pointer"
              >
                <span>Ir a Mi Panel de CoachMind</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
