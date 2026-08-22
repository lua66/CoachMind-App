import React, { useState, useRef, useEffect } from 'react';
import {
  Brain,
  Send,
  Sparkles,
  User,
  Loader2,
  Bot,
  Download,
  FileText,
  Copy,
  Check,
  Bookmark,
  BookmarkCheck,
  Trash2,
  Search,
  Library,
  Eye,
  X,
  FileCode2,
  Printer,
  RotateCcw,
  Sparkle,
} from 'lucide-react';
import { ChatMessage, Player, SavedAiResponse, UserProfile } from '../types';
import { consumeTrialAction } from '../utils/trialManager';

interface CoachAiViewProps {
  initialQuestion?: string;
  onClearInitialQuestion?: () => void;
  userProfile?: UserProfile | null;
  players?: Player[];
  onCheckRegistration?: (action: () => void, notice?: string) => void;
  onOpenTrialModal?: (mode?: 'general_action' | 'ficha_entrenador') => void;
}

export const CoachAiView: React.FC<CoachAiViewProps> = ({
  initialQuestion,
  onClearInitialQuestion,
  userProfile,
  players: propPlayers,
  onCheckRegistration,
  onOpenTrialModal,
}) => {
  const initialGreeting: ChatMessage = {
    id: 'msg-1',
    sender: 'ai',
    text: '¡Hola, entrenador/a! Soy **CoachMind**, tu asistente táctico e IA Entrenadora de baloncesto. ¿En qué puedo ayudarte hoy? Puedo analizar la plantilla de tus jugadoras, proponer ejercicios de pretemporada o planificar estrategias tácticas.',
    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
  };

  const [messages, setMessages] = useState<ChatMessage[]>([initialGreeting]);

  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Saved AI Library
  const [savedLibrary, setSavedLibrary] = useState<SavedAiResponse[]>(() => {
    try {
      const stored = localStorage.getItem('coachmind_ai_library');
      if (stored) return JSON.parse(stored);
    } catch (e) {
      console.error('Error loading AI library:', e);
    }
    return [];
  });

  // Modal for saving to library
  const [saveModalOpen, setSaveModalOpen] = useState(false);
  const [saveTargetMsg, setSaveTargetMsg] = useState<{ query: string; response: string } | null>(null);
  const [saveTitle, setSaveTitle] = useState('');
  const [saveCategory, setSaveCategory] = useState('Pretemporada');

  // Selected item to view detail in Library
  const [viewDetailItem, setViewDetailItem] = useState<SavedAiResponse | null>(null);

  // Filter & Search in Library
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('Todas');

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const categories = [
    'Todas',
    'Pretemporada',
    'Táctica',
    'Preparación Física',
    'Técnica Individual',
    'Sistemas de Juego',
  ];

  const suggestionChips = [
    'Analizar mi plantilla para pretemporada',
    '¿Cómo defender un Pick & Roll agresivo?',
    '3 ejercicios para mejorar el tiro tras bote',
    'Plan de preparación física de pretemporada',
  ];

  useEffect(() => {
    try {
      localStorage.setItem('coachmind_ai_library', JSON.stringify(savedLibrary));
    } catch (e) {
      console.error('Error saving AI library:', e);
    }
  }, [savedLibrary]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  useEffect(() => {
    if (initialQuestion && initialQuestion.trim()) {
      handleSendMessage(initialQuestion.trim());
      if (onClearInitialQuestion) {
        onClearInitialQuestion();
      }
    }
  }, [initialQuestion]);

  const handleClearChat = () => {
    setMessages([
      {
        ...initialGreeting,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ]);
  };

  const handleSendMessage = async (queryText?: string) => {
    const textToSend = queryText || input;
    if (!textToSend.trim() || isLoading) return;

    if (!consumeTrialAction(userProfile, 'coach-ai')) {
      if (onOpenTrialModal) onOpenTrialModal('general_action');
      return;
    }

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!queryText) setInput('');
    setIsLoading(true);

    try {
      const historyToSend = messages.map((m) => ({
        role: m.sender === 'user' ? 'user' : 'model',
        parts: [{ text: m.text }],
      }));

      let savedPhilosophy = null;
      try {
        const stored = localStorage.getItem('coachmind_philosophy');
        if (stored) savedPhilosophy = JSON.parse(stored);
      } catch (e) {}

      let currentPlayers = propPlayers || [];
      if (!currentPlayers || currentPlayers.length === 0) {
        try {
          const storedPls = localStorage.getItem('coachmind_players');
          if (storedPls) currentPlayers = JSON.parse(storedPls);
        } catch (e) {}
      }

      const response = await fetch('/api/gemini/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: textToSend,
          history: historyToSend,
          coachPhilosophy: savedPhilosophy,
          players: currentPlayers,
        }),
      });

      const contentType = response.headers.get('content-type');
      let data;
      if (contentType && contentType.includes('application/json')) {
        data = await response.json();
      } else {
        const text = await response.text();
        console.warn('Response was not JSON:', text);
        throw new Error('El servidor devolvió un error inesperado al procesar la solicitud.');
      }

      if (!data || !data.success) {
        throw new Error(data?.error || 'Error en el servidor de IA');
      }

      const aiMsg: ChatMessage = {
        id: `ai-${Date.now()}`,
        sender: 'ai',
        text: data.reply,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, aiMsg]);
    } catch (err: any) {
      console.error('Error sending chat message:', err);
      const errorMsg: ChatMessage = {
        id: `err-${Date.now()}`,
        sender: 'ai',
        text: 'Lo siento, ha ocurrido un error al consultar la IA. Comprueba que GEMINI_API_KEY esté configurada en los ajustes.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  // --- EXPORT FUNCTIONS ---

  const handleCopyText = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const exportToTxt = (title: string, text: string) => {
    const content = `====================================================
COACHMIND BASKETBALL - RESPUESTA TÁCTICA DE IA
Fecha: ${new Date().toLocaleDateString('es-ES')}
Título: ${title}
====================================================

${text}

----------------------------------------------------
Generado por CoachMind - IA Entrenadora de Baloncesto
`;
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `CoachMind_${title.replace(/[^a-zA-Z0-9_-]/g, '_')}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const exportToWord = (title: string, query: string, text: string) => {
    const htmlContent = `
      <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
      <head>
        <meta charset='utf-8'>
        <title>${title}</title>
        <style>
          body { font-family: 'Calibri', 'Arial', sans-serif; line-height: 1.6; color: #1e293b; padding: 25px; }
          .header { background-color: #2563eb; color: #ffffff; padding: 20px; text-align: center; border-radius: 8px; }
          .header h1 { margin: 0; font-size: 22px; text-transform: uppercase; letter-spacing: 1px; }
          .meta { font-size: 13px; color: #cbd5e1; margin-top: 6px; }
          .query-box { background-color: #f1f5f9; border-left: 4px solid #2563eb; padding: 12px 18px; margin: 20px 0; font-style: italic; color: #334155; }
          .content { font-size: 14px; margin-top: 20px; white-space: pre-wrap; line-height: 1.7; color: #0f172a; }
          .footer { margin-top: 40px; border-top: 1px solid #e2e8f0; padding-top: 15px; font-size: 11px; color: #94a3b8; text-align: center; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>🏀 CoachMind Basketball — Plan de Entrenamiento IA</h1>
          <div class="meta">Fecha: ${new Date().toLocaleDateString('es-ES')} | Documento de Trabajo</div>
        </div>
        
        ${query ? `<div class="query-box"><strong>Consulta del Entrenador:</strong> ${query}</div>` : ''}

        <div class="content">
          ${text.replace(/\n/g, '<br/>')}
        </div>

        <div class="footer">
          Generado por la IA Entrenadora de CoachMind • Tu Asistente Táctico de Baloncesto
        </div>
      </body>
      </html>
    `;

    const blob = new Blob(['\ufeff' + htmlContent], { type: 'application/msword;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `CoachMind_${title.replace(/[^a-zA-Z0-9_-]/g, '_')}.doc`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const exportToPdf = (title: string, query: string, text: string) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Por favor, permite las ventanas emergentes en tu navegador para generar o imprimir el PDF.');
      return;
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>CoachMind - ${title}</title>
        <style>
          @media print {
            body { margin: 0; padding: 20px; }
            .no-print { display: none !important; }
          }
          body { font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; color: #0f172a; padding: 30px; max-width: 820px; margin: 0 auto; line-height: 1.6; }
          .brand { display: flex; align-items: center; justify-content: space-between; border-bottom: 3px solid #2563eb; padding-bottom: 12px; margin-bottom: 24px; }
          .brand-title { font-size: 24px; font-weight: 800; color: #2563eb; letter-spacing: -0.5px; }
          .brand-subtitle { font-size: 13px; color: #64748b; }
          .doc-title { font-size: 20px; font-weight: 800; margin-bottom: 16px; color: #0f172a; }
          .query-box { background: #f8fafc; border: 1px solid #e2e8f0; border-left: 4px solid #2563eb; padding: 14px 18px; border-radius: 8px; margin-bottom: 24px; font-size: 14px; color: #334155; }
          .content { font-size: 14px; white-space: pre-wrap; color: #1e293b; line-height: 1.7; }
          .footer { margin-top: 40px; padding-top: 16px; border-top: 1px solid #e2e8f0; font-size: 12px; color: #94a3b8; text-align: center; }
          .btn-print { background: #2563eb; color: white; border: none; padding: 12px 24px; border-radius: 8px; font-weight: bold; cursor: pointer; margin-bottom: 24px; font-size: 14px; shadow: 0 4px 6px -1px rgba(0,0,0,0.1); }
          .btn-print:hover { background: #1d4ed8; }
        </style>
      </head>
      <body>
        <button class="btn-print no-print" onclick="window.print()">🖨️ Imprimir / Guardar como PDF</button>

        <div class="brand">
          <div>
            <div class="brand-title">🏀 CoachMind Basketball</div>
            <div class="brand-subtitle">Planificación y Estrategia de IA Entrenadora</div>
          </div>
          <div class="brand-subtitle">Fecha: ${new Date().toLocaleDateString('es-ES')}</div>
        </div>

        <div class="doc-title">${title}</div>

        ${query ? `<div class="query-box"><strong>Consulta del Entrenador:</strong> ${query}</div>` : ''}

        <div class="content">${text}</div>

        <div class="footer">
          Documento generado automáticamente por CoachMind IA Entrenadora • www.coachmind.app
        </div>

        <script>
          setTimeout(() => {
            window.print();
          }, 400);
        </script>
      </body>
      </html>
    `);
    printWindow.document.close();
  };

  // Open Save Modal
  const openSaveModal = (msgText: string, idx: number) => {
    // Find preceding user question if exists
    let userQuery = 'Consulta táctica de baloncesto';
    for (let i = idx - 1; i >= 0; i--) {
      if (messages[i].sender === 'user') {
        userQuery = messages[i].text;
        break;
      }
    }

    setSaveTargetMsg({ query: userQuery, response: msgText });
    setSaveTitle(userQuery.slice(0, 50) + (userQuery.length > 50 ? '...' : ''));
    setSaveCategory('Pretemporada');
    setSaveModalOpen(true);
  };

  const handleSaveToLibrary = () => {
    if (!saveTargetMsg || !saveTitle.trim()) return;

    const newItem: SavedAiResponse = {
      id: `saved-${Date.now()}`,
      title: saveTitle.trim(),
      category: saveCategory,
      queryText: saveTargetMsg.query,
      responseText: saveTargetMsg.response,
      createdAt: new Date().toLocaleDateString('es-ES'),
      tags: [saveCategory, 'IA Entrenadora'],
    };

    setSavedLibrary((prev) => [newItem, ...prev]);
    setSaveModalOpen(false);
    setSaveTargetMsg(null);
  };

  const handleDeleteSavedItem = (id: string) => {
    setSavedLibrary((prev) => prev.filter((item) => item.id !== id));
    if (viewDetailItem?.id === id) setViewDetailItem(null);
  };

  // Filtered saved responses
  const filteredSavedItems = savedLibrary.filter((item) => {
    const matchesCategory =
      selectedCategoryFilter === 'Todas' || item.category === selectedCategoryFilter;
    const matchesSearch =
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.queryText.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.responseText.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="space-y-6 sm:space-y-8 animate-fadeIn w-full max-w-7xl mx-auto pb-12 px-2 sm:px-0">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4 bg-white p-4 sm:p-6 rounded-2xl border border-slate-200/80 shadow-sm shrink-0">
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-600/20 shrink-0">
            <Brain className="w-6 h-6 sm:w-7 sm:h-7" />
          </div>
          <div>
            <h1 className="text-xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              IA Entrenadora
            </h1>
            <p className="text-xs sm:text-sm text-slate-500">
              Tu asistente táctico 24/7 y Biblioteca de Entrenamientos de Baloncesto
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <span className="px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-700 font-bold text-[11px] sm:text-xs flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-500 shrink-0" />
            Descarga Word, PDF y TXT
          </span>
        </div>
      </div>

      {/* CARD 1: CHAT ACTIVO CON LA IA ENTRENADORA */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-3.5 sm:p-6 space-y-4">
        {/* Chat Card Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3 gap-2">
          <div className="flex items-center gap-2 text-slate-800 font-bold text-sm sm:text-base">
            <Bot className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600 shrink-0" />
            <span>Chat de Consulta Táctica</span>
          </div>

          <div className="flex items-center gap-2">
            {messages.length > 1 && (
              <button
                onClick={handleClearChat}
                title="Limpiar conversación y reiniciar chat"
                className="px-2.5 py-1 rounded-xl bg-slate-100 hover:bg-red-50 hover:text-red-600 text-slate-600 font-bold text-[11px] sm:text-xs flex items-center gap-1 transition-all border border-slate-200/80"
              >
                <RotateCcw className="w-3.5 h-3.5 text-slate-500 hover:text-red-600" />
                <span>Limpiar chat</span>
              </button>
            )}
            <span className="text-[11px] sm:text-xs text-slate-400 font-medium hidden sm:inline">
              Gemini 2.5 Flash
            </span>
          </div>
        </div>

        {/* Chat Messages Container */}
        <div className="space-y-4 sm:space-y-6 max-h-[480px] sm:max-h-[520px] overflow-y-auto custom-scrollbar p-1 sm:p-2">
          {messages.map((msg, idx) => {
            const isUser = msg.sender === 'user';
            const isSaved = savedLibrary.some((item) => item.responseText === msg.text);

            return (
              <div
                key={msg.id}
                className={`flex gap-2.5 sm:gap-3 max-w-full sm:max-w-5xl ${
                  isUser ? 'ml-auto flex-row-reverse' : 'mr-auto'
                }`}
              >
                <div
                  className={`w-8 h-8 sm:w-9 sm:h-9 rounded-2xl flex items-center justify-center shrink-0 ${
                    isUser
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'bg-slate-900 text-amber-400 shadow-md'
                  }`}
                >
                  {isUser ? <User className="w-4 h-4 sm:w-5 sm:h-5" /> : <Bot className="w-4 h-4 sm:w-5 sm:h-5" />}
                </div>

                <div className="space-y-1.5 sm:space-y-2 max-w-[85%] sm:max-w-3xl">
                  <div
                    className={`p-3.5 sm:p-5 rounded-2xl text-xs sm:text-sm leading-relaxed whitespace-pre-line ${
                      isUser
                        ? 'bg-blue-600 text-white rounded-tr-none font-medium'
                        : 'bg-slate-50 text-slate-900 border border-slate-200/90 rounded-tl-none font-normal shadow-2xs'
                    }`}
                  >
                    {msg.text}
                  </div>

                  {/* Message Timestamp & Action Buttons for AI responses */}
                  <div
                    className={`flex items-center gap-1.5 sm:gap-2 flex-wrap text-[10px] sm:text-[11px] text-slate-400 font-medium ${
                      isUser ? 'justify-end' : 'justify-start'
                    }`}
                  >
                    <span>{msg.timestamp}</span>

                    {!isUser && (
                      <div className="flex items-center gap-1 sm:gap-1.5 overflow-x-auto max-w-full pb-0.5 sm:pb-0">
                        {/* Copy Button */}
                        <button
                          onClick={() => handleCopyText(msg.text, msg.id)}
                          title="Copiar respuesta"
                          className="px-2 py-1 rounded-lg hover:bg-slate-100 text-slate-600 flex items-center gap-1 transition-all border border-slate-200/50 bg-white sm:bg-transparent"
                        >
                          {copiedId === msg.id ? (
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                          <span className="inline">
                            {copiedId === msg.id ? 'Copiado' : 'Copiar'}
                          </span>
                        </button>

                        {/* Download TXT */}
                        <button
                          onClick={() =>
                            exportToTxt('Consulta_IA_CoachMind', msg.text)
                          }
                          title="Descargar como TXT"
                          className="px-2 py-1 rounded-lg hover:bg-slate-100 text-slate-600 flex items-center gap-1 transition-all border border-slate-200/50 bg-white sm:bg-transparent"
                        >
                          <FileText className="w-3.5 h-3.5 text-blue-600" />
                          <span>TXT</span>
                        </button>

                        {/* Download Word */}
                        <button
                          onClick={() =>
                            exportToWord('Plan_IA_CoachMind', 'Consulta Táctica', msg.text)
                          }
                          title="Descargar documento Word (.doc)"
                          className="px-2 py-1 rounded-lg hover:bg-blue-50 text-blue-700 font-semibold flex items-center gap-1 transition-all border border-blue-200/60 bg-blue-50/50"
                        >
                          <FileCode2 className="w-3.5 h-3.5 text-blue-600" />
                          <span>Word</span>
                        </button>

                        {/* Download / Print PDF */}
                        <button
                          onClick={() =>
                            exportToPdf('Plan_IA_CoachMind', 'Consulta Táctica', msg.text)
                          }
                          title="Imprimir / Exportar a PDF"
                          className="px-2 py-1 rounded-lg hover:bg-red-50 text-red-600 font-semibold flex items-center gap-1 transition-all border border-red-200/60 bg-red-50/50"
                        >
                          <Printer className="w-3.5 h-3.5 text-red-500" />
                          <span>PDF</span>
                        </button>

                        {/* Save to Library */}
                        <button
                          onClick={() => openSaveModal(msg.text, idx)}
                          title="Guardar en Biblioteca de Entrenamientos"
                          className={`px-2.5 py-1 rounded-lg text-[10px] sm:text-xs font-bold flex items-center gap-1 transition-all ${
                            isSaved
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200/80 shadow-2xs'
                          }`}
                        >
                          {isSaved ? (
                            <>
                              <BookmarkCheck className="w-3.5 h-3.5 text-emerald-600" />
                              <span>Guardado</span>
                            </>
                          ) : (
                            <>
                              <Bookmark className="w-3.5 h-3.5 text-amber-600" />
                              <span>Guardar</span>
                            </>
                          )}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}

          {isLoading && (
            <div className="flex gap-2.5 sm:gap-3 max-w-md mr-auto items-center">
              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-2xl bg-slate-900 text-amber-400 flex items-center justify-center shrink-0">
                <Bot className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <div className="p-3.5 sm:p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-500 flex items-center gap-2">
                <Loader2 className="w-4 h-4 text-blue-600 animate-spin" />
                <span>CoachMind está analizando tu consulta...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Suggestion Chips */}
        <div className="flex items-center gap-2 overflow-x-auto custom-scrollbar pt-2 pb-1 shrink-0 border-t border-slate-100">
          <Sparkles className="w-4 h-4 text-amber-500 shrink-0" />
          <span className="text-[11px] sm:text-xs font-bold text-slate-400 shrink-0">Sugerencias:</span>
          {suggestionChips.map((chip, idx) => (
            <button
              key={idx}
              onClick={() => handleSendMessage(chip)}
              className="px-2.5 py-1.5 rounded-xl bg-slate-50 hover:bg-blue-50 border border-slate-200/80 hover:border-blue-400 text-slate-700 hover:text-blue-700 text-[11px] sm:text-xs font-semibold whitespace-nowrap transition-all shadow-2xs shrink-0"
            >
              {chip}
            </button>
          ))}
        </div>

        {/* Chat Input Bar */}
        <div className="bg-slate-50 p-2 sm:p-2.5 rounded-2xl border border-slate-200/80">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="flex items-center gap-2"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Consulta táctica, ejercicios, plantilla..."
              className="flex-1 px-3 py-2.5 sm:px-4 sm:py-3 rounded-xl bg-white text-slate-800 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 border border-slate-200/80"
            />
            <button
              type="submit"
              disabled={!input.trim() || isLoading}
              className="p-2.5 sm:p-3 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold transition-all shadow-md shadow-blue-600/20 shrink-0"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>

      {/* CARD 2: BIBLIOTECA DE ENTRENAMIENTOS & CONSULTAS DE IA */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-4 sm:p-6 space-y-5 sm:space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-md shadow-amber-500/20 shrink-0">
              <Library className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-extrabold text-slate-900 tracking-tight">
                Biblioteca de Entrenamientos & Consultas
              </h2>
              <p className="text-[11px] sm:text-xs text-slate-500">
                Guarda y descarga en Word, PDF o TXT tus planes estratégicos de CoachMind
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-500 font-medium bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200/80 self-start sm:self-auto">
            <BookmarkCheck className="w-4 h-4 text-emerald-600" />
            <span>{savedLibrary.length} guardados</span>
          </div>
        </div>

        {/* Filters and Search Bar */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-3">
          {/* Category Chips Filter */}
          <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto custom-scrollbar pb-1">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategoryFilter(cat)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                  selectedCategoryFilter === cat
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Search Input */}
          <div className="relative w-full md:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar en biblioteca..."
              className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-50 border border-slate-200/80 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>
        </div>

        {/* Saved Items Grid */}
        {filteredSavedItems.length === 0 ? (
          <div className="p-8 sm:p-10 text-center bg-slate-50/50 rounded-2xl border border-dashed border-slate-200 space-y-3">
            <Library className="w-10 h-10 text-slate-300 mx-auto" />
            <h3 className="font-bold text-slate-700 text-sm">
              No hay entrenamientos guardados en esta categoría
            </h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              Realiza preguntas a la IA Entrenadora arriba y pulsa en **"Guardar"** para archivarlas y descargarlas en cualquier momento.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredSavedItems.map((item) => (
              <div
                key={item.id}
                className="bg-white rounded-2xl border border-slate-200/90 hover:border-blue-400 p-4 sm:p-5 space-y-3 transition-all hover:shadow-md flex flex-col justify-between"
              >
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <span className="px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 font-extrabold text-[11px] border border-blue-100">
                      {item.category}
                    </span>
                    <span className="text-[10px] text-slate-400 font-medium">
                      {item.createdAt}
                    </span>
                  </div>

                  <h3 className="font-extrabold text-slate-900 text-xs sm:text-sm leading-snug line-clamp-2">
                    {item.title}
                  </h3>

                  <div className="text-[11px] sm:text-xs text-slate-500 bg-slate-50 p-2.5 rounded-xl border border-slate-100 italic line-clamp-2">
                    "{item.queryText}"
                  </div>

                  <p className="text-[11px] sm:text-xs text-slate-600 line-clamp-3 leading-relaxed whitespace-pre-line pt-1">
                    {item.responseText}
                  </p>
                </div>

                {/* Card Footer Action Buttons */}
                <div className="flex items-center justify-between border-t border-slate-100 pt-3 mt-2 gap-2">
                  <button
                    onClick={() => setViewDetailItem(item)}
                    className="px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center gap-1.5 transition-all"
                  >
                    <Eye className="w-3.5 h-3.5 text-slate-600" />
                    <span>Ver</span>
                  </button>

                  <div className="flex items-center gap-1">
                    {/* Word */}
                    <button
                      onClick={() => exportToWord(item.title, item.queryText, item.responseText)}
                      title="Descargar Word (.doc)"
                      className="p-1.5 sm:p-2 rounded-xl hover:bg-blue-50 text-blue-600 transition-all"
                    >
                      <FileCode2 className="w-4 h-4" />
                    </button>

                    {/* PDF */}
                    <button
                      onClick={() => exportToPdf(item.title, item.queryText, item.responseText)}
                      title="Descargar / Imprimir PDF"
                      className="p-1.5 sm:p-2 rounded-xl hover:bg-red-50 text-red-600 transition-all"
                    >
                      <Printer className="w-4 h-4" />
                    </button>

                    {/* TXT */}
                    <button
                      onClick={() => exportToTxt(item.title, item.responseText)}
                      title="Descargar TXT"
                      className="p-1.5 sm:p-2 rounded-xl hover:bg-slate-100 text-slate-600 transition-all"
                    >
                      <FileText className="w-4 h-4" />
                    </button>

                    {/* Delete */}
                    <button
                      onClick={() => handleDeleteSavedItem(item.id)}
                      title="Eliminar de la biblioteca"
                      className="p-1.5 sm:p-2 rounded-xl hover:bg-red-50 text-slate-400 hover:text-red-600 transition-all ml-1"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* SAVE TO LIBRARY MODAL */}
      {saveModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-lg w-full p-5 sm:p-6 shadow-2xl border border-slate-200 space-y-4 sm:space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2 text-slate-900 font-extrabold text-sm sm:text-base">
                <Bookmark className="w-4 h-4 sm:w-5 sm:h-5 text-amber-500" />
                <span>Guardar en Biblioteca</span>
              </div>
              <button
                onClick={() => setSaveModalOpen(false)}
                className="p-1 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Título del Entrenamiento / Estrategia *
                </label>
                <input
                  type="text"
                  value={saveTitle}
                  onChange={(e) => setSaveTitle(e.target.value)}
                  placeholder="Ej: Plan de Pretemporada para Plantilla 12 Jugadoras"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Categoría Táctica *
                </label>
                <select
                  value={saveCategory}
                  onChange={(e) => setSaveCategory(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                >
                  <option value="Pretemporada">Pretemporada</option>
                  <option value="Táctica">Táctica Colectiva</option>
                  <option value="Preparación Física">Preparación Física</option>
                  <option value="Técnica Individual">Técnica Individual</option>
                  <option value="Sistemas de Juego">Sistemas de Juego</option>
                </select>
              </div>

              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs text-slate-600 space-y-1">
                <span className="font-bold text-slate-700 block">Vista previa de la respuesta:</span>
                <p className="line-clamp-3 italic text-slate-500 text-[11px] sm:text-xs">
                  {saveTargetMsg?.response}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => setSaveModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveToLibrary}
                disabled={!saveTitle.trim()}
                className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white text-xs font-bold shadow-md shadow-amber-500/20 flex items-center gap-1.5"
              >
                <BookmarkCheck className="w-4 h-4" />
                <span>Guardar en Biblioteca</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* VIEW DETAIL MODAL */}
      {viewDetailItem && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 z-50 animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[85vh] flex flex-col p-4 sm:p-6 shadow-2xl border border-slate-200 space-y-3 sm:space-y-4">
            <div className="flex items-start justify-between border-b border-slate-100 pb-3 gap-2">
              <div>
                <span className="px-2.5 py-0.5 rounded-md bg-blue-50 text-blue-700 font-extrabold text-[10px] border border-blue-100">
                  {viewDetailItem.category}
                </span>
                <h2 className="text-base sm:text-lg font-extrabold text-slate-900 mt-1">
                  {viewDetailItem.title}
                </h2>
                <span className="text-[11px] text-slate-400">
                  Guardado el {viewDetailItem.createdAt}
                </span>
              </div>

              <button
                onClick={() => setViewDetailItem(null)}
                className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-600 shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar space-y-3 sm:space-y-4 pr-1">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs text-slate-700 font-medium">
                <strong className="text-blue-700 block mb-0.5">Consulta realizada:</strong>
                {viewDetailItem.queryText}
              </div>

              <div className="text-xs sm:text-sm text-slate-800 leading-relaxed whitespace-pre-line bg-slate-50/50 p-3.5 sm:p-4 rounded-xl border border-slate-100">
                {viewDetailItem.responseText}
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-slate-100">
              <button
                onClick={() => handleDeleteSavedItem(viewDetailItem.id)}
                className="px-3 py-2 rounded-xl text-xs font-bold text-red-600 hover:bg-red-50 flex items-center gap-1"
              >
                <Trash2 className="w-4 h-4" />
                <span>Eliminar</span>
              </button>

              <div className="flex items-center gap-1.5 sm:gap-2">
                <button
                  onClick={() =>
                    exportToTxt(viewDetailItem.title, viewDetailItem.responseText)
                  }
                  className="px-2.5 py-1.5 sm:px-3 sm:py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center gap-1.5"
                >
                  <FileText className="w-3.5 h-3.5 text-slate-600" />
                  <span>TXT</span>
                </button>

                <button
                  onClick={() =>
                    exportToWord(
                      viewDetailItem.title,
                      viewDetailItem.queryText,
                      viewDetailItem.responseText
                    )
                  }
                  className="px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-extrabold flex items-center gap-1.5 border border-blue-200"
                >
                  <FileCode2 className="w-3.5 h-3.5 text-blue-600" />
                  <span>Word</span>
                </button>

                <button
                  onClick={() =>
                    exportToPdf(
                      viewDetailItem.title,
                      viewDetailItem.queryText,
                      viewDetailItem.responseText
                    )
                  }
                  className="px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-extrabold flex items-center gap-1.5 shadow-md shadow-red-600/20"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>PDF</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
