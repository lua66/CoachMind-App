import React, { useState } from 'react';
import { FileSpreadsheet, Sparkles, Check, ExternalLink, RefreshCw, Lock, ShieldCheck, Download, Users, UserCheck, UserX } from 'lucide-react';
import { UserProfile } from '../types';

interface GoogleSheetsSyncCardProps {
  userProfile?: UserProfile | null;
}

export interface CoachRecord {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  club: string;
  teamLevel: string;
  teamCategory: string;
  isSubscribed: boolean;
  subscriptionPlan?: string;
  paymentMethod?: string;
  activationCode?: string;
  creditsRemaining?: number;
  registeredAt: string;
  status: string;
}

// Sample initial database of coaches for demonstration and syncing
export const initialCoachesDatabase: CoachRecord[] = [
  {
    id: 'coach-001',
    firstName: 'Carlos',
    lastName: 'García Pérez',
    email: 'carlos.garcia@baloncesto.es',
    phone: '+34 612 345 678',
    club: 'CB Estudiantes Cadete',
    teamLevel: 'Autonómico',
    teamCategory: 'Cadete (Sub-16)',
    isSubscribed: true,
    subscriptionPlan: 'Licencia Gratuita Libre (Acceso Total)',
    paymentMethod: 'Registro Web Oficial',
    creditsRemaining: 99999,
    registeredAt: '2026-01-15',
    status: 'Licencia Activa',
  },
  {
    id: 'coach-002',
    firstName: 'María',
    lastName: 'Fernández López',
    email: 'maria.fdez@basketclub.com',
    phone: '+34 689 112 233',
    club: 'Valencia Basket Cantera',
    teamLevel: 'Regional',
    teamCategory: 'Infantil (Sub-14)',
    isSubscribed: true,
    subscriptionPlan: 'Licencia Gratuita Libre (Acceso Total)',
    paymentMethod: 'Registro Web Oficial',
    creditsRemaining: 99999,
    registeredAt: '2026-02-01',
    status: 'Licencia Activa',
  },
  {
    id: 'coach-003',
    firstName: 'Javier',
    lastName: 'Martínez Ruiz',
    email: 'j.martinez@cbcanarias.org',
    phone: '+34 655 443 211',
    club: 'Juventud Badalona Sub-18',
    teamLevel: 'Nacional',
    teamCategory: 'Junior (Sub-18)',
    isSubscribed: true,
    subscriptionPlan: 'Licencia Gratuita Libre (Acceso Total)',
    paymentMethod: 'Registro Web Oficial',
    creditsRemaining: 99999,
    registeredAt: '2025-11-20',
    status: 'Licencia Activa',
  },
  {
    id: 'coach-004',
    firstName: 'David',
    lastName: 'Sánchez Gómez',
    email: 'david.sanchez@gmail.com',
    phone: '+34 633 998 877',
    club: 'CD Basket San Agustín',
    teamLevel: 'Escolar / Iniciación',
    teamCategory: 'Alevín (Sub-12)',
    isSubscribed: true,
    subscriptionPlan: 'Licencia Gratuita Libre (Acceso Total)',
    paymentMethod: 'Registro Web Oficial',
    creditsRemaining: 99999,
    registeredAt: '2026-03-02',
    status: 'Licencia Activa',
  },
  {
    id: 'coach-005',
    firstName: 'Laura',
    lastName: 'Torres Navarro',
    email: 'laura.torres@hotmail.com',
    phone: '+34 677 221 100',
    club: 'Colegio Maristas Basket',
    teamLevel: 'Liga Local',
    teamCategory: 'Benjamín (Sub-10)',
    isSubscribed: true,
    subscriptionPlan: 'Licencia Gratuita Libre (Acceso Total)',
    paymentMethod: 'Registro Web Oficial',
    creditsRemaining: 99999,
    registeredAt: '2026-03-05',
    status: 'Licencia Activa',
  },
  {
    id: 'coach-006',
    firstName: 'Alejandro',
    lastName: 'Navarro Vidal',
    email: 'a.navarro@basketmadrid.org',
    phone: '+34 644 332 211',
    club: 'Real Canoe NC',
    teamLevel: 'Autonómico',
    teamCategory: 'Senior',
    isSubscribed: true,
    subscriptionPlan: 'Licencia Gratuita Libre (Acceso Total)',
    paymentMethod: 'Registro Web Oficial',
    creditsRemaining: 99999,
    registeredAt: '2026-03-08',
    status: 'Licencia Activa',
  },
];

export const GoogleSheetsSyncCard: React.FC<GoogleSheetsSyncCardProps> = ({ userProfile }) => {
  const [isSyncing, setIsSyncing] = useState(false);
  const [sheetUrl, setSheetUrl] = useState<string | null>(null);
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [syncSuccess, setSyncSuccess] = useState(false);
  const [serverRecords, setServerRecords] = useState<any[]>([]);
  
  // Webhook state
  const [webhookUrlInput, setWebhookUrlInput] = useState('https://script.google.com/macros/s/AKfycbxViXxELdCzL_aH1Nn2OIODG60Xc-gp9u9qmepH7klAt9YslYezOCA5ShNJxaLhxN_lgw/exec');
  const [isSavingWebhook, setIsSavingWebhook] = useState(false);
  const [isTestingWebhook, setIsTestingWebhook] = useState(false);
  const [webhookStatusMsg, setWebhookStatusMsg] = useState<string | null>(null);

  // Fetch server records and Webhook info on mount
  React.useEffect(() => {
    fetch('/api/sheets/records')
      .then((res) => res.json())
      .then((data) => {
        if (data.success && Array.isArray(data.records)) {
          setServerRecords(data.records);
        }
      })
      .catch((err) => console.warn('Could not fetch server sheet records:', err));

    fetch('/api/sheets/webhook-info')
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.webhookUrl) {
          setWebhookUrlInput(data.webhookUrl);
        }
      })
      .catch(() => {});
  }, []);

  const handleSaveWebhook = async () => {
    setIsSavingWebhook(true);
    setWebhookStatusMsg(null);

    try {
      const res = await fetch('/api/sheets/webhook-info', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ webhookUrl: webhookUrlInput.trim() }),
      });
      const data = await res.json();
      if (data.success) {
        if (!webhookUrlInput.trim()) {
          setWebhookStatusMsg('✅ Se han eliminado y desconectado todas las URLs de Google Sheets.');
        } else {
          setWebhookStatusMsg('✅ URL de Webhook guardada correctamente.');
        }
      } else {
        setWebhookStatusMsg('⚠️ Error al actualizar URL de Webhook.');
      }
    } catch (err: any) {
      setWebhookStatusMsg('⚠️ Error de red al actualizar Webhook.');
    } finally {
      setIsSavingWebhook(false);
    }
  };

  const handleDisconnectWebhook = async () => {
    setIsSavingWebhook(true);
    setWebhookStatusMsg(null);
    setWebhookUrlInput('');

    try {
      const res = await fetch('/api/sheets/webhook-info', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ webhookUrl: '' }),
      });
      const data = await res.json();
      if (data.success) {
        setWebhookStatusMsg('✅ Desconectado: Se han eliminado todas las URLs y conexiones externas con Google Sheets.');
      } else {
        setWebhookStatusMsg('⚠️ No se pudo completar la desconexión.');
      }
    } catch (err: any) {
      setWebhookStatusMsg('⚠️ Error al solicitar la desconexión.');
    } finally {
      setIsSavingWebhook(false);
    }
  };

  const handleTestWebhookSend = async () => {
    setIsTestingWebhook(true);
    setWebhookStatusMsg(null);

    const sampleTestRecord = {
      nombreCompleto: userProfile?.firstName ? `${userProfile.firstName} ${userProfile.lastName}` : 'Entrenador de Prueba',
      email: userProfile?.email || 'prueba.entrenador@coachmind.app',
      telefono: userProfile?.phone || '+34 600 000 000',
      pais: userProfile?.country || 'España',
      ciudad: userProfile?.town || 'Madrid',
      club: userProfile?.club || 'Club de Prueba',
      cargoRol: userProfile?.coachRole || 'Entrenador Principal',
      titulacion: userProfile?.coachLevel || 'Nivel 2',
      generoEquipo: userProfile?.teamGender || 'Masculino',
      nivelEquipo: userProfile?.teamLevel || 'Autonómico',
      categoriaEquipo: userProfile?.teamCategory || 'Senior',
      plan: 'Licencia Gratuita Libre (Acceso Total)',
      metodoPago: 'Registro Web Directo',
      estado: 'Licencia Gratuita Registrada',
      codigoActivacion: 'N/A',
      fechaRegistro: new Date().toLocaleDateString('es-ES'),
      webhookUrl: webhookUrlInput.trim() || undefined,
    };

    try {
      const res = await fetch('/api/sync-google-sheet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sampleTestRecord),
      });
      const data = await res.json();

      if (data.success) {
        setWebhookStatusMsg('✅ Registro de prueba enviado y sincronizado con éxito en tu Google Sheet.');
        // Refresh server records
        const recordsRes = await fetch('/api/sheets/records');
        const recordsData = await recordsRes.json();
        if (recordsData.success && Array.isArray(recordsData.records)) {
          setServerRecords(recordsData.records);
        }
      } else {
        setWebhookStatusMsg(`⚠️ Error en sincronización: ${data.error || 'Respuesta no válida'}`);
      }
    } catch (err: any) {
      setWebhookStatusMsg(`⚠️ Error al enviar prueba: ${err.message}`);
    } finally {
      setIsTestingWebhook(false);
    }
  };

  // Filter base list
  const subscribedList: CoachRecord[] = [...initialCoachesDatabase.filter((c) => c.isSubscribed)];
  const nonSubscribedList: CoachRecord[] = [...initialCoachesDatabase.filter((c) => !c.isSubscribed)];

  // Merge server and local storage records
  const localRecordsRaw = localStorage.getItem('coachmind_google_sheet_records');
  const localRecords: any[] = localRecordsRaw ? JSON.parse(localRecordsRaw) : [];
  const allSyncedRecords = [...serverRecords, ...localRecords];

  allSyncedRecords.forEach((rec, idx) => {
    if (!rec || !rec.email) return;
    const isPaid = rec.plan?.includes('Mensual') || rec.plan?.includes('Anual') || rec.estado?.includes('Suscripción Activa') || rec.estado?.includes('Pro');
    const coachItem: CoachRecord = {
      id: `synced-${idx}-${Date.now()}`,
      firstName: rec.nombreCompleto?.split(' ')[0] || rec.firstName || 'Entrenador',
      lastName: rec.nombreCompleto?.split(' ').slice(1).join(' ') || rec.lastName || 'Registrado',
      email: rec.email,
      phone: rec.telefono || rec.phone || 'N/A',
      club: rec.club || 'Sin Club',
      teamLevel: rec.nivelEquipo || rec.teamLevel || 'Autonómico',
      teamCategory: rec.categoriaEquipo || rec.teamCategory || 'Senior',
      isSubscribed: isPaid,
      subscriptionPlan: rec.plan || (isPaid ? 'Mensual (5€/mes)' : 'Invitado'),
      paymentMethod: rec.metodoPago || (isPaid ? 'Tarjeta' : 'Sin Pago'),
      activationCode: rec.codigoActivacion || rec.codigo || rec.activationCode || (rec.metodoPago?.includes('(') ? rec.metodoPago.match(/\(([^)]+)\)/)?.[1] : isPaid ? 'BIZUMPRO01' : 'N/A'),
      creditsRemaining: isPaid ? 500 : 100,
      registeredAt: rec.fechaRegistro || rec.registeredAt || new Date().toISOString().split('T')[0],
      status: rec.estado || (isPaid ? 'Activa (Pro)' : 'Prueba Gratuita'),
    };

    if (isPaid) {
      if (!subscribedList.some((c) => c.email.toLowerCase() === rec.email.toLowerCase())) {
        subscribedList.unshift(coachItem);
      }
    } else {
      if (!nonSubscribedList.some((c) => c.email.toLowerCase() === rec.email.toLowerCase())) {
        nonSubscribedList.unshift(coachItem);
      }
    }
  });

  // If active userProfile exists, append or merge it
  if (userProfile && userProfile.email) {
    const isPaidUser = userProfile.subscriptionStatus === 'active' || !!userProfile.subscriptionPlan;
    const userCoachRecord: CoachRecord = {
      id: 'current-user-profile',
      firstName: userProfile.firstName || 'Entrenador',
      lastName: userProfile.lastName || 'Registrado',
      email: userProfile.email,
      phone: userProfile.phone || 'N/A',
      club: userProfile.club || 'Sin Club',
      teamLevel: userProfile.teamLevel || 'Autonómico',
      teamCategory: userProfile.teamCategory || 'Senior',
      isSubscribed: isPaidUser,
      subscriptionPlan: userProfile.subscriptionPlan === 'annual'
        ? 'Anual (60€/año)'
        : userProfile.subscriptionPlan === 'monthly'
        ? 'Mensual (5€/mes)'
        : 'Prueba Gratuita (Invitado)',
      paymentMethod: userProfile.paymentMethod === 'paypal'
        ? 'PayPal'
        : userProfile.paymentMethod === 'bizum'
        ? 'Bizum / WhatsApp'
        : userProfile.paymentMethod === 'code'
        ? 'Código / Cupón VIP'
        : userProfile.cardLast4
        ? `Tarjeta (•••• ${userProfile.cardLast4})`
        : 'Tarjeta Visa/Mastercard',
      activationCode: userProfile.paymentMethod === 'bizum' || userProfile.paymentMethod === 'code' ? 'BIZUMPRO' : 'N/A',
      creditsRemaining: userProfile.creditsRemaining ?? (isPaidUser ? 500 : 100),
      registeredAt: userProfile.registeredAt || new Date().toLocaleDateString('es-ES'),
      status: isPaidUser ? 'Activa (Pro)' : 'Prueba Gratuita (Invitado)',
    };

    if (isPaidUser) {
      // Replace existing entry with same email or unshift
      const existingIdx = subscribedList.findIndex((c) => c.email.toLowerCase() === userProfile.email.toLowerCase());
      if (existingIdx >= 0) {
        subscribedList[existingIdx] = userCoachRecord;
      } else {
        subscribedList.unshift(userCoachRecord);
      }
    } else {
      const existingIdx = nonSubscribedList.findIndex((c) => c.email.toLowerCase() === userProfile.email.toLowerCase());
      if (existingIdx >= 0) {
        nonSubscribedList[existingIdx] = userCoachRecord;
      } else {
        nonSubscribedList.unshift(userCoachRecord);
      }
    }
  }

  const handleSyncGoogleSheets = async () => {
    setIsSyncing(true);
    setErrorMessage(null);
    setSyncSuccess(false);

    try {
      // Send coaches payload to Express endpoint /api/sheets/sync-coaches
      const response = await fetch('/api/sheets/sync-coaches', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          subscribedCoaches: subscribedList,
          nonSubscribedCoaches: nonSubscribedList,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Error al conectar con la API de Google Sheets');
      }

      setSheetUrl(data.spreadsheetUrl);
      setLastSyncTime(new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
      setSyncSuccess(true);
    } catch (err: any) {
      console.error('Error syncing Google Sheets:', err);
      setErrorMessage(err.message || 'Error durante la sincronización');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleDownloadCSV = (type: 'subscribed' | 'nonsubscribed') => {
    const list = type === 'subscribed' ? subscribedList : nonSubscribedList;
    const headers = ['ID', 'Nombre', 'Apellidos', 'Email', 'Teléfono', 'Club', 'Nivel Equipo', 'Categoría', 'Plan', 'Método Pago', 'Código Activación', 'Estado'];
    
    const rows = list.map((c) => [
      c.id,
      `"${c.firstName}"`,
      `"${c.lastName}"`,
      `"${c.email}"`,
      `"${c.phone}"`,
      `"${c.club}"`,
      `"${c.teamLevel}"`,
      `"${c.teamCategory}"`,
      `"${c.subscriptionPlan || '-'}"`,
      `"${c.paymentMethod || '-'}"`,
      `"${c.activationCode || 'N/A'}"`,
      `"${c.status}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `CoachMind_Entrenadores_${type === 'subscribed' ? 'Suscritos' : 'No_Suscritos'}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="bg-gradient-to-br from-emerald-950 via-slate-900 to-indigo-950 text-white p-6 rounded-2xl border border-emerald-500/30 shadow-xl space-y-5">
      {/* Card Header */}
      {/* Hero Banner for Google Integration */}
      <div className="relative w-full h-32 sm:h-36 rounded-2xl overflow-hidden border border-emerald-500/30 shadow-lg mb-2 bg-gradient-to-r from-emerald-900 via-teal-950 to-slate-900 flex items-center px-6">
        <div className="flex items-center gap-4 z-10">
          <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center text-emerald-400 shadow-xl shadow-emerald-950/60 shrink-0">
            <FileSpreadsheet className="w-8 h-8 text-emerald-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-emerald-400" />
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-300">Google Cloud Sync</span>
            </div>
            <h3 className="font-black text-lg sm:text-xl text-white tracking-wide">
              Integración Directa con Google Sheets
            </h3>
            <p className="text-xs text-emerald-200/70 mt-0.5">
              Sincronización bidireccional y exportación de entrenadores en tiempo real
            </p>
          </div>
        </div>
        <div className="absolute -right-6 -bottom-6 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />
      </div>

      <div className="flex items-center justify-between flex-wrap gap-3 border-b border-emerald-500/20 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-emerald-500/20 border border-emerald-400/30 text-emerald-400 flex items-center justify-center shrink-0 shadow-lg shadow-emerald-950/40">
            <FileSpreadsheet className="w-6 h-6 text-emerald-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                Base de Datos Google Sheets
              </span>
            </div>
            <h3 className="text-lg font-extrabold text-white tracking-tight">
              Sincronización de Entrenadores Registrados
            </h3>
          </div>
        </div>

        <button
          type="button"
          onClick={handleSyncGoogleSheets}
          disabled={isSyncing}
          className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-black text-xs shadow-lg shadow-emerald-500/20 flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
          <span>{isSyncing ? 'Creando Google Sheet...' : 'Crear / Sincronizar Google Sheet'}</span>
        </button>
      </div>

      {/* Privacy Guarantee & Administrator Access Badge */}
      <div className="p-4 rounded-xl bg-slate-900/90 border border-emerald-500/40 text-emerald-200 text-xs space-y-2 flex items-start gap-3">
        <div className="w-9 h-9 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/30">
          <ShieldCheck className="w-5 h-5 text-emerald-400" />
        </div>
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h4 className="font-extrabold text-white text-xs">
              Sincronización 100% Gratuita y Automática en Español
            </h4>
            <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              Sin Pagos
            </span>
          </div>
          <p className="text-[11px] text-slate-300 leading-relaxed">
            <strong>No requiere pagar nada ni configurar cuentas complejas.</strong> Google Sheets y Google Apps Script son herramientas completamente gratuitas de Google. Cada vez que un nuevo entrenador se registra en tu app, sus datos se envían solos a tu hoja de cálculo sin que tengas que hacer nada.
          </p>
        </div>
      </div>

      {/* Instant Webhook Auto-Sync Configuration & Direct Testing */}
      <div className="p-4 rounded-xl bg-slate-900/90 border border-emerald-500/30 space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-emerald-400" />
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">
              Sincronización Automática en Tiempo Real (Google Apps Script / Webhook)
            </h4>
          </div>
          <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
            Suscripciones Auto-Enviadas
          </span>
        </div>

        <p className="text-[11px] text-slate-300 leading-relaxed">
          Cada vez que un entrenador se registra o activa una suscripción, sus datos se envían automáticamente a tu Webhook de Google Sheets en tiempo real.
        </p>

        <div className="flex flex-col sm:flex-row items-center gap-2 pt-1">
          <div className="relative flex-1 w-full">
            <input
              type="text"
              value={webhookUrlInput}
              onChange={(e) => setWebhookUrlInput(e.target.value)}
              placeholder="Pega aquí tu URL de Google Apps Script o déjala vacía..."
              className="w-full pl-3 pr-24 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
            />
            <button
              type="button"
              onClick={handleSaveWebhook}
              disabled={isSavingWebhook}
              className="absolute right-1 top-1 bottom-1 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] transition-all cursor-pointer disabled:opacity-50"
            >
              {isSavingWebhook ? 'Guardando...' : 'Guardar'}
            </button>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={handleTestWebhookSend}
              disabled={isTestingWebhook || !webhookUrlInput.trim()}
              className="flex-1 sm:flex-none px-3.5 py-2 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 font-extrabold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer disabled:opacity-40 shrink-0"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isTestingWebhook ? 'animate-spin' : ''}`} />
              <span>{isTestingWebhook ? 'Enviando...' : 'Probar Envío'}</span>
            </button>

            <button
              type="button"
              onClick={handleDisconnectWebhook}
              disabled={isSavingWebhook}
              className="px-3.5 py-2 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 text-rose-300 font-extrabold text-xs flex items-center justify-center gap-1 transition-all cursor-pointer disabled:opacity-40 shrink-0"
              title="Borrar todas las URLs y desconectar Google Sheets"
            >
              <span>Desconectar / Borrar URL</span>
            </button>
          </div>
        </div>

        {webhookStatusMsg && (
          <div className="p-2.5 rounded-lg bg-slate-950 border border-emerald-500/30 text-xs text-emerald-200 font-medium animate-fadeIn">
            {webhookStatusMsg}
          </div>
        )}

        {/* Apps Script Guide & Copyable Code for CoachMind Basketball */}
        <div className="mt-3 pt-3 border-t border-slate-800 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-extrabold text-teal-300 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-teal-400" />
              Código Google Apps Script para "CoachMind Basketball"
            </span>
            <button
              type="button"
              onClick={() => {
                const code = `function doPost(e) {
  try {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    if (sheet.getLastRow() === 0) {
      sheet.appendRow(["Fecha", "Nombre", "Email", "Teléfono", "País", "Ciudad", "Club", "Cargo", "Titulación", "Categoría", "Nivel", "Plan", "Método Pago"]);
    }
    var data = JSON.parse(e.postData.contents);
    sheet.appendRow([
      data.fechaRegistro || new Date().toLocaleDateString('es-ES'),
      data.nombreCompleto || data.firstName + ' ' + data.lastName || 'Entrenador',
      data.email || '',
      data.telefono || '',
      data.pais || '',
      data.ciudad || '',
      data.club || '',
      data.cargoRol || '',
      data.titulacion || '',
      data.categoriaEquipo || '',
      data.nivelEquipo || '',
      data.plan || 'Licencia Gratuita Libre',
      data.metodoPago || 'Registro Web'
    ]);
    return ContentService.createTextOutput(JSON.stringify({result: "success"})).setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({result: "error", error: err.toString()})).setMimeType(ContentService.MimeType.JSON);
  }
}`;
                navigator.clipboard.writeText(code);
                setWebhookStatusMsg('📋 Código de Google Apps Script copiado al portapapeles.');
              }}
              className="px-2.5 py-1 rounded bg-teal-500/20 hover:bg-teal-500/30 border border-teal-500/40 text-teal-300 font-bold text-[11px] transition-all cursor-pointer"
            >
              Copiar Código Script
            </button>
          </div>
          <p className="text-[11px] text-slate-400">
            En tu Google Sheet llamado <strong>CoachMind Basketball</strong>, ve a <strong>Extensiones &gt; Apps Script</strong>, pega este código, guarda e implementa como <strong>Aplicación web</strong> (Acceso: <em>Cualquier persona</em>). Pega la URL resultante arriba.
          </p>
        </div>
      </div>

      {/* Database Statistics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Subscribed Coaches Block */}
        <div className="p-4 rounded-xl bg-slate-900/80 border border-emerald-500/30 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
              <UserCheck className="w-4 h-4 text-emerald-400" />
              Entrenadores Registrados (Acceso Total)
            </span>
            <span className="px-2 py-0.5 text-xs font-black rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              {subscribedList.length + nonSubscribedList.length} Registrados
            </span>
          </div>
          <p className="text-[11px] text-slate-300 leading-relaxed">
            Entrenadores oficiales registrados con licencia gratuita libre, acceso completo a herramientas de IA, diseño de entrenamientos y pizarra.
          </p>
          <div className="pt-2 flex items-center justify-between border-t border-slate-800 text-[11px]">
            <span className="text-slate-400">Exportar grupo:</span>
            <button
              type="button"
              onClick={() => handleDownloadCSV('subscribed')}
              className="text-emerald-400 hover:underline font-bold flex items-center gap-1 cursor-pointer"
            >
              <Download className="w-3 h-3" />
              <span>Descargar CSV</span>
            </button>
          </div>
        </div>

        {/* Database Info Block */}
        <div className="p-4 rounded-xl bg-slate-900/80 border border-teal-500/30 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-teal-400 flex items-center gap-1.5">
              <Users className="w-4 h-4 text-teal-400" />
              Sincronización Continua Google
            </span>
            <span className="px-2 py-0.5 text-xs font-black rounded-full bg-teal-500/20 text-teal-300 border border-teal-500/30">
              Auto-Sync
            </span>
          </div>
          <p className="text-[11px] text-slate-300 leading-relaxed">
            Cada registro enviado desde el formulario de la app se guarda automáticamente en el servidor y se transmite directamente a tu Google Sheet.
          </p>
          <div className="pt-2 flex items-center justify-between border-t border-slate-800 text-[11px]">
            <span className="text-slate-400">Exportar registros:</span>
            <button
              type="button"
              onClick={() => handleDownloadCSV('subscribed')}
              className="text-teal-400 hover:underline font-bold flex items-center gap-1 cursor-pointer"
            >
              <Download className="w-3 h-3" />
              <span>Descargar CSV Completo</span>
            </button>
          </div>
        </div>
      </div>

      {/* Sync Status / Google Sheet Link Banner */}
      {sheetUrl && (
        <div className="p-4 rounded-xl bg-emerald-950/90 border border-emerald-500/50 space-y-2 animate-fadeIn">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-emerald-300 font-extrabold text-xs">
              <Check className="w-4 h-4 text-emerald-400" />
              <span>¡Base de Datos Creada y Sincronizada en Google Sheets!</span>
            </div>
            {lastSyncTime && (
              <span className="text-[10px] text-slate-400">Última sinc: {lastSyncTime}</span>
            )}
          </div>
          <p className="text-xs text-slate-200">
            Se ha creado y actualizado tu libro de cálculo en Google Sheets con pestañas separadas para Entrenadores Suscritos y No Suscritos.
          </p>
          <div className="pt-2">
            <a
              href={sheetUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs shadow-md transition-all"
            >
              <ExternalLink className="w-4 h-4" />
              <span>Abrir Hoja de Cálculo en Google Sheets</span>
            </a>
          </div>
        </div>
      )}

      {errorMessage && (
        <div className="p-3 bg-red-950/80 border border-red-700/80 rounded-xl text-red-200 text-xs font-medium">
          ⚠️ {errorMessage}
        </div>
      )}
    </div>
  );
};
