import React, { useState, useEffect, useRef } from 'react';
import {
  Brain,
  Send,
  RefreshCw,
  Trash2,
  MessageSquareQuote,
  Sparkles,
} from 'lucide-react';
import { PlayerStatsData } from '../utils/scoutingPdfGenerator';

export interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
}

interface ScoutingAiConsultantProps {
  teamName: string;
  teamRole: 'local' | 'visitante';
  jornadaNumber: number;
  matchIndex: number;
  matchOpponent: string;
  players: PlayerStatsData[];
  rivalPlayers?: PlayerStatsData[];
  coachPhilosophy?: any;
}

export const ScoutingAiConsultant: React.FC<ScoutingAiConsultantProps> = ({
  teamName,
  teamRole,
  jornadaNumber,
  matchIndex,
  matchOpponent,
  players,
  rivalPlayers = [],
  coachPhilosophy,
}) => {
  const storageKey = `coachmind_scouting_chat_j${jornadaNumber}_m${matchIndex}_${teamRole}`;

  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error(e);
    }
    return [];
  });

  const [inputQuery, setInputQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Save conversation state
  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(messages));
    } catch (e) {
      console.error(e);
    }
  }, [messages, storageKey]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const handleSendMessage = async (textToSend?: string) => {
    const query = (textToSend || inputQuery).trim();
    if (!query || isLoading) return;

    const userMsg: ChatMessage = {
      id: `msg_u_${Date.now()}`,
      sender: 'user',
      text: query,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!textToSend) setInputQuery('');
    setIsLoading(true);

    try {
      // Build top stats summary
      const topPTS = [...players].sort((a, b) => b.pts - a.pts).slice(0, 5);
      const topTLA = [...players].sort((a, b) => b.tla - a.tla).slice(0, 5);
      const topT2A = [...players].sort((a, b) => b.t2a - a.t2a).slice(0, 5);
      const topT3A = [...players].sort((a, b) => b.t3a - a.t3a).slice(0, 5);

      const totalPTS = players.reduce((sum, p) => sum + (p.pts || 0), 0);
      const totalTLA = players.reduce((sum, p) => sum + (p.tla || 0), 0);
      const totalTLI = players.reduce((sum, p) => sum + (p.tli || 0), 0);
      const totalT2A = players.reduce((sum, p) => sum + (p.t2a || 0), 0);
      const totalT2I = players.reduce((sum, p) => sum + (p.t2i || 0), 0);
      const totalT3A = players.reduce((sum, p) => sum + (p.t3a || 0), 0);
      const totalT3I = players.reduce((sum, p) => sum + (p.t3i || 0), 0);

      const historyFormatted = messages.map((m) => ({
        role: m.sender === 'user' ? 'user' : 'model',
        parts: [{ text: m.text }],
      }));

      const res = await fetch('/api/gemini/scouting-qa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: query,
          teamName: teamName || (teamRole === 'local' ? 'Equipo Local' : 'Equipo Visitante'),
          teamRole,
          jornadaNumber,
          matchIndex,
          matchOpponent,
          players,
          rivalPlayers,
          topStats: {
            topPTS,
            topTLA,
            topT2A,
            topT3A,
            totalPTS,
            totalTLA,
            totalTLI,
            totalT2A,
            totalT2I,
            totalT3A,
            totalT3I,
          },
          coachPhilosophy,
          history: historyFormatted,
        }),
      });

      const data = await res.json();
      const replyText =
        data.reply ||
        data.text ||
        'No se pudo generar la respuesta táctica. Por favor, revisa las estadísticas cargadas o vuelve a intentar tu consulta.';

      const assistantMsg: ChatMessage = {
        id: `msg_a_${Date.now()}`,
        sender: 'assistant',
        text: replyText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err: any) {
      console.error('Error fetching scouting AI reply:', err);
      const errorMsg: ChatMessage = {
        id: `msg_err_${Date.now()}`,
        sender: 'assistant',
        text: '⚠️ Ocurrió un problema de conexión con el Asesor Táctico. Por favor, asegúrate de haber cargado jugadoras y reintenta tu pregunta.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearHistory = () => {
    if (window.confirm('¿Quieres reiniciar las preguntas y respuestas del análisis táctico de este equipo?')) {
      setMessages([]);
      localStorage.removeItem(storageKey);
    }
  };

  return (
    <div className="mt-8 pt-6 border-t-2 border-dashed border-slate-200 space-y-5">
      {/* Encabezado del Consultor Táctico */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-gradient-to-r from-slate-900 via-slate-800 to-[#0B132B] text-white p-4 sm:p-5 rounded-2xl shadow-md border border-slate-700">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-400/40 text-amber-400 flex items-center justify-center shrink-0 shadow-inner">
            <Brain className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="font-black text-sm sm:text-base text-white tracking-tight flex items-center gap-1.5">
                Asesor Táctico & Scouting IA
              </h4>
              <span className="px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-300 text-[10px] font-black uppercase tracking-wider border border-amber-400/30 flex items-center gap-1">
                <Sparkles className="w-3 h-3" /> Razonamiento Libre
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-0.5">
              Escribe libremente cualquier hipótesis, pregunta táctica o duda sobre el partido y las estadísticas de <strong className="text-amber-300">{teamName || 'este equipo'}</strong>
            </p>
          </div>
        </div>

        {messages.length > 0 && (
          <button
            type="button"
            onClick={handleClearHistory}
            className="self-start sm:self-center px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-rose-950/60 text-slate-300 hover:text-rose-300 border border-slate-700 hover:border-rose-800 text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer shrink-0"
            title="Limpiar conversación de este equipo"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Reiniciar chat</span>
          </button>
        )}
      </div>

      {/* Hilo de Mensajes */}
      <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 sm:p-5 space-y-4 max-h-[440px] overflow-y-auto shadow-inner">
        {messages.length === 0 ? (
          <div className="text-center py-8 px-4 space-y-3">
            <div className="w-12 h-12 mx-auto rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center shadow-xs">
              <MessageSquareQuote className="w-6 h-6" />
            </div>
            <h5 className="text-xs font-black text-slate-800 uppercase tracking-wider">
              Chat Táctico Abierto con la IA
            </h5>
            <p className="text-xs text-slate-600 max-w-md mx-auto leading-relaxed">
              Plantea cualquier duda u opinión con tus propias palabras (por ejemplo: <em>"¿Por qué crees que anotaron tan poco?"</em>, <em>"¿Cómo defender a su jugadora #12?"</em> o <em>"Plantea un 5v5 para frenar su tiro de 3"</em>). La IA analizará los datos y razonará su respuesta.
            </p>
          </div>
        ) : (
          messages.map((m) => {
            const isUser = m.sender === 'user';
            return (
              <div
                key={m.id}
                className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} space-y-1 animate-fadeIn`}
              >
                <div className="flex items-center gap-1.5 px-1">
                  <span className="text-[10px] font-black uppercase text-slate-400">
                    {isUser ? 'Tú (Entrenador)' : 'IA Scouting Analyst'}
                  </span>
                  <span className="text-[9px] text-slate-400">• {m.timestamp}</span>
                </div>

                <div
                  className={`max-w-[92%] sm:max-w-[85%] rounded-2xl p-4 text-xs leading-relaxed whitespace-pre-wrap ${
                    isUser
                      ? 'bg-slate-900 text-white rounded-tr-xs shadow-sm font-medium'
                      : 'bg-white text-slate-800 border border-slate-200/90 rounded-tl-xs shadow-sm'
                  }`}
                >
                  {m.text}
                </div>
              </div>
            );
          })
        )}

        {isLoading && (
          <div className="flex items-center gap-2 p-3.5 rounded-2xl bg-white border border-amber-200 text-slate-700 text-xs font-bold animate-pulse max-w-xs shadow-xs">
            <RefreshCw className="w-4 h-4 text-amber-600 animate-spin shrink-0" />
            <span>Razonando y analizando estadísticas del partido...</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input de Pregunta del Entrenador */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSendMessage();
        }}
        className="flex items-center gap-2"
      >
        <div className="relative flex-1">
          <input
            type="text"
            value={inputQuery}
            onChange={(e) => setInputQuery(e.target.value)}
            disabled={isLoading || players.length === 0}
            placeholder={
              players.length === 0
                ? 'Sube primero el Excel o añade jugadoras para consultar a la IA...'
                : `Escribe tu pregunta o hipótesis sobre ${teamName || 'este equipo'}...`
            }
            className="w-full px-4 py-3 rounded-2xl border border-slate-300 focus:border-amber-500 focus:ring-2 focus:ring-amber-200 text-xs font-medium text-slate-800 placeholder-slate-400 bg-white shadow-2xs transition-all disabled:bg-slate-100 disabled:cursor-not-allowed"
          />
        </div>

        <button
          type="submit"
          disabled={!inputQuery.trim() || isLoading || players.length === 0}
          className="px-5 py-3 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs transition-all shadow-sm flex items-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 shrink-0"
        >
          <span>Consultar IA</span>
          <Send className="w-3.5 h-3.5" />
        </button>
      </form>
    </div>
  );
};
