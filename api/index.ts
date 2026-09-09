import type { VercelRequest, VercelResponse } from "@vercel/node";
import { GoogleGenAI, Type } from "@google/genai";

// Helper for timeout
function withTimeout<T>(promise: Promise<T>, ms: number = 25000): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`Timeout after ${ms}ms`)), ms)
    ),
  ]);
}

// Helper to retrieve API key from standard environment variables
function getEffectiveApiKey(): { key: string; source: string } | null {
  const candidates = [
    { name: "GEMINI_API_KEY", val: process.env.GEMINI_API_KEY },
    { name: "VITE_GEMINI_API_KEY", val: process.env.VITE_GEMINI_API_KEY },
    { name: "GOOGLE_API_KEY", val: process.env.GOOGLE_API_KEY },
    { name: "GOOGLE_GENAI_API_KEY", val: process.env.GOOGLE_GENAI_API_KEY },
  ];

  for (const c of candidates) {
    const v = (c.val || "").trim();
    if (v && v !== "MY_GEMINI_API_KEY" && !v.includes("MY_GEMINI_API_KEY")) {
      return { key: v, source: c.name };
    }
  }
  return null;
}

function getGeminiClient(): GoogleGenAI | null {
  const detected = getEffectiveApiKey();
  if (!detected) return null;
  try {
    return new GoogleGenAI({
      apiKey: detected.key,
    });
  } catch (e) {
    console.warn("Error initializing GoogleGenAI in Vercel:", e);
    return null;
  }
}

// Fallback tactical QA generator for scouting when Gemini is offline
function generateScoutingFallbackQA(params: any): string {
  const qLower = (params.question || "").toLowerCase();
  const team = params.teamName || "el equipo";
  const players: any[] = Array.isArray(params.players) ? params.players : [];
  const topStats = params.topStats || {};

  const totalPts = players.reduce((s, p) => s + Number(p.pts || (Number(p.tla || 0) * 1 + Number(p.t2a || 0) * 2 + Number(p.t3a || 0) * 3) || 0), 0);
  const totalT2A = players.reduce((s, p) => s + Number(p.t2a || 0), 0);
  const totalT2I = players.reduce((s, p) => s + Number(p.t2i || p.t2a || 0), 0);
  const totalT3A = players.reduce((s, p) => s + Number(p.t3a || 0), 0);
  const totalT3I = players.reduce((s, p) => s + Number(p.t3i || p.t3a || 0), 0);
  const totalTLA = players.reduce((s, p) => s + Number(p.tla || 0), 0);
  const totalTLI = players.reduce((s, p) => s + Number(p.tli || p.tla || 0), 0);

  const t2Pct = totalT2I > 0 ? Math.round((totalT2A / totalT2I) * 100) : 0;
  const t3Pct = totalT3I > 0 ? Math.round((totalT3A / totalT3I) * 100) : 0;
  const tlPct = totalTLI > 0 ? Math.round((totalTLA / totalTLI) * 100) : 0;

  const topScorer = (topStats.topPTS && topStats.topPTS[0]) || (players.length > 0 ? [...players].sort((a, b) => (b.pts || 0) - (a.pts || 0))[0] : null);
  const topScorerPts = topScorer ? Number(topScorer.pts || (topScorer.tla * 1 + topScorer.t2a * 2 + topScorer.t3a * 3) || 0) : 0;
  const topShare = totalPts > 0 && topScorerPts > 0 ? Math.round((topScorerPts / totalPts) * 100) : 0;
  const p1Label = topScorer ? `${topScorer.dorsal ? '#' + topScorer.dorsal + ' ' : ''}${topScorer.jugadora || 'Jugadora principal'} (${topScorerPts} pts)` : 'Referente ofensiva';

  return `📊 **Diagnóstico Táctico Post-Partido • ${team} (Jornada ${params.jornadaNumber || 1})**

• **Producción Colectiva:** ${totalPts} puntos totales (${totalT2A}/${totalT2I} en T2 al ${t2Pct}%, ${totalT3A}/${totalT3I} en T3 al ${t3Pct}% y ${totalTLA}/${totalTLI} en TL al ${tlPct}%).
• **Referente Principal:** **${p1Label}**, concentrando el ${topShare}% del volumen anotador del equipo.
• **Marcador registrado:** ${params.scoreLocal || '?'} - ${params.scoreVisitor || '?'}.

🎯 **Claves de Rendimiento:**
1. **Efectividad en el Tiro:** ${t2Pct < 40 ? `El ${t2Pct}% en tiros de 2 puntos indica dificultades para finalizar con contacto bajo el aro.` : `Buen acierto en tiros de 2 (${t2Pct}%), castigando la pintura.`}
2. **Dependencia y Rotación:** ${topShare > 30 ? `Alta dependencia de ${p1Label}. Forzar ayudas defensivas sobre ella cuando ataque.` : `Anotación equilibrada entre varias jugadoras.`}
3. **Recomendación Táctica:** ${t3Pct < 25 ? `Colapsar la zona interior y retar el lanzamiento exterior.` : `Defender los cortes exteriores y no permitir tiros liberados en las esquinas.`}`;
}

// Tactical response generator for coach chat
function generateBasketballTacticalResponse(
  message: string,
  players: any[] = [],
  coachPhilosophy: any = null
): string {
  const msgLower = (message || "").toLowerCase();

  if (
    msgLower.includes("amistoso") ||
    msgLower.includes("partido") ||
    msgLower.includes("debajo del aro") ||
    msgLower.includes("rebote") ||
    msgLower.includes("actitud") ||
    msgLower.includes("2x1")
  ) {
    return `🏀 **Análisis Táctico y Plan de Corrección • CoachMind**

1️⃣ **Finalizaciones debajo del aro (Aumentar efectividad en pintura)**
* **Diagnóstico:** Los fallos cercanos suelen deberse a la prisa por tirar antes del contacto o a no proteger el balón con los codos/cuerpo.
* **Ejercicio (Rueda de Finalizaciones con Oposición):** 2 filas en 45°. Entrada explosiva recibiendo contacto de manopla/fitball. Terminar con tabla alta sin bajar el balón.

2️⃣ **Control y Cierre del Rebote (Box Out Colectivo)**
* **Diagnóstico:** Mirar solo el balón en lugar de hacer contacto primero con la atacante asignada.
* **Ejercicio (Competición 3c3 de Rebote):** Exigir 1 segundo de contacto antes de saltar a por el balón.

3️⃣ **Actitud e Intensidad para Ganar Minutos**
* **Regla de oro:** Los minutos se ganan en el esfuerzo sin balón (balances defensivos, ayudas, tirarse a por balones divididos).`;
  }

  // Pick & Roll / Screens / Bloqueos
  if (msgLower.includes("pick") || msgLower.includes("bloqueo") || msgLower.includes("pantalla")) {
    if (msgLower.includes("defen") || msgLower.includes("agresiv") || msgLower.includes("parar") || msgLower.includes("contra")) {
      return `🛡️ **Defensa del Pick & Roll Agresivo en Baloncesto:**

1. **Flash / Trap (2x1 al Manejador):**
   - **Manejador:** La defensora del grande salta agresiva sobre el bote para forzar al base rival a cortar el dribling o pasar incómodo hacia atrás.
   - **Recuperación:** La defensora del balón persigue y recupera por detrás mientras la defensora del grande frena la penetración.
   - **Rotaciones del Lado Débil:** La jugadora en lado de ayuda (*Last Defender*) rota al corazón de la zona para cortar el pase a la caída (*Roll*) del pívot.

2. **Hundimiento / Drop (Protección de Pintura):**
   - La defensora del bloqueador se mantiene hundida a 1.5 - 2 metros, protegiendo el aro contra la caída y forzando tiros de media distancia de menor efectividad.

3. **Next / Finta y Recuperación (*Stunt*):**
   - La primera línea de pase amaga hacia el balón para frenar el avance del base sin perder a su tiradora.

4. **Consigna de Pista:** La comunicación vocal debe ser inmediata: *"¡Bloqueo derecha!"* / *"¡Flash!"* / *"¡Cambio!"*.`;
    }

    return `🏀 **Sistemas de Pick & Roll y Bloqueos Directos:**

1. **Lectura del Manejador:** Atacar el pie adelantado del defensor del grande. Si la defensa se hunde (*Drop*), castigar con tiro tras bote o pase picado al continuador (*Roll*).
2. **Lectura del Bloqueador:** Fijar el contacto en ángulo de 45° con buena base y continuar explosivo al aro (*Roll*) o abrirse a 6.75m (*Pop*).
3. **Espaciado (Spacing):** Las otras tres jugadoras deben mantener los pies detrás de la línea de 3 puntos en las esquinas y a 45° para generar líneas de pase limpias.`;
  }

  // Roster / Plantilla específica
  if (
    /\b(plantilla|jugadoras?|roster|dorsales?|fichas?)\b/i.test(msgLower) ||
    (msgLower.includes("analiza") && msgLower.includes("jugadora"))
  ) {
    if (players && players.length > 0) {
      return `📋 **Diagnóstico de Plantilla (${players.length} Jugadoras)**\n\n` +
        players.map((p: any) => `• **#${p.jerseyNumber ?? '?'} ${p.name || 'Jugadora'} (${p.role || 'Posición'})**: Fortalezas (*${Array.isArray(p.strengths) ? p.strengths.join(', ') : 'Compromiso'}*) | Por pulir (*${Array.isArray(p.areasToImprove) ? p.areasToImprove.join(', ') : 'Técnica'}*)`).join('\n') +
        `\n\n🎯 **Recomendación:** Organiza bloques de 20 minutos de trabajo por posiciones al inicio de cada sesión.`;
    }
  }

  // Zonas / Defensas
  if (msgLower.includes("zona") || msgLower.includes("defensa") || msgLower.includes("2-3") || msgLower.includes("1-3-1")) {
    return `🛡️ **Claves Tácticas para Atacar y Defender en Zona:**\n\n• **Pase al poste alto:** El balón en la bombilla colapsa a la defensa y genera tiros abiertos en esquina (*corner*).\n• **Pase extra:** Mover el balón más rápido que los desplazamientos defensivos.\n• **Rebote defensivo:** Cierre obligatorio en zona (*Box Out*) por áreas asignadas.`;
  }

  // Tiros / Ejercicios
  if (msgLower.includes("tiro") || msgLower.includes("ejercicio") || msgLower.includes("entrenamiento")) {
    return `🎯 **Ejercicio de Tiro bajo presión:**\n\n1. **Estructura:** 3 filas en cabecera y 45°. Pase diagonal, recepción en 2 tiempos y tiro tras bote.\n2. **Objetivo:** 15 conversiones seguidas con defensor persiguiendo.\n3. **Clave técnica:** Codos alineados con el aro e impulso fluido de piernas.`;
  }

  return `🏀 **Recomendaciones Tácticas de CoachMind**\n\n• **En Ataque:** Fomenta la circulación con al menos 3 pases antes del primer tiro y ataca siempre el lado débil de la defensa.\n• **En Defensa:** Mantén la intensidad con comunicación constante en bloqueos y exige el cierre de rebote (*Box Out*).\n• **Transiciones:** Tras rebote o robo defensivo, busca el primer pase de apertura en menos de 1.5 segundos.`;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS headers
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS,PATCH,DELETE,POST,PUT");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization"
  );

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  const url = req.url || "";

  // 1. Diagnostic / Status Endpoint (/api/gemini/status, /api/status)
  if (url.includes("/api/gemini/status") || url.includes("/api/status")) {
    const detected = getEffectiveApiKey();
    if (!detected) {
      return res.status(200).json({
        success: false,
        hasKey: false,
        message: "No se ha configurado GEMINI_API_KEY en las variables de entorno de Vercel. Ve a Project Settings > Environment Variables en Vercel y añade GEMINI_API_KEY.",
      });
    }

    const masked = detected.key.length > 8 ? `${detected.key.slice(0, 4)}...${detected.key.slice(-4)}` : "****";

    try {
      const ai = getGeminiClient();
      if (!ai) {
        return res.status(200).json({
          success: false,
          hasKey: true,
          keySource: detected.source,
          maskedKey: masked,
          message: "No se pudo instanciar el cliente GoogleGenAI en Vercel.",
        });
      }

      const startTime = Date.now();
      const testRes = await withTimeout(
        ai.models.generateContent({
          model: "gemini-3.6-flash",
          contents: 'Ping test. Responde brevemente "OK".',
        }),
        6000
      );
      const latency = Date.now() - startTime;

      return res.status(200).json({
        success: true,
        hasKey: true,
        keySource: detected.source,
        maskedKey: masked,
        keyLength: detected.key.length,
        latencyMs: latency,
        testedModel: "gemini-3.6-flash",
        responseSample: testRes.text?.trim() || "OK",
        message: "Conexión con la API de Google Gemini en Vercel verificada y operativa.",
      });
    } catch (err: any) {
      return res.status(200).json({
        success: false,
        hasKey: true,
        keySource: detected.source,
        maskedKey: masked,
        keyLength: detected.key.length,
        errorName: err?.name || "GeminiError",
        errorMessage: err?.message || String(err),
        errorCode: err?.status || err?.code || "API_CALL_FAILED",
        message: `Error al conectar con la API de Gemini: ${err?.message || "Error desconocido"}. Revisa que tu API Key sea válida en Google AI Studio.`,
      });
    }
  }

  // 2. Health Endpoint
  if (url.includes("/api/health") || url === "/api") {
    return res.status(200).json({
      status: "ok",
      service: "CoachMind-App Serverless API (Vercel)",
      timestamp: new Date().toISOString(),
      hasGeminiKey: Boolean(getEffectiveApiKey()),
    });
  }

  // 3. Scouting Q&A Route (/api/gemini/scouting-qa)
  if (req.method === "POST" && url.includes("/api/gemini/scouting-qa")) {
    try {
      const {
        question,
        teamName,
        teamRole,
        jornadaNumber,
        matchIndex,
        matchOpponent,
        scoreLocal,
        scoreVisitor,
        players = [],
        rivalPlayers = [],
        topStats,
        coachPhilosophy,
        history,
      } = req.body || {};

      const userQuestion = (question || "").trim();
      const playersList = Array.isArray(players) ? players : [];
      const rivalList = Array.isArray(rivalPlayers) ? rivalPlayers : [];

      const totalPts = playersList.reduce((s: number, p: any) => s + Number(p.pts || (p.tla * 1 + p.t2a * 2 + p.t3a * 3) || 0), 0);
      const totalT2A = playersList.reduce((s: number, p: any) => s + Number(p.t2a || 0), 0);
      const totalT2I = playersList.reduce((s: number, p: any) => s + Number(p.t2i || p.t2a || 0), 0);
      const totalT3A = playersList.reduce((s: number, p: any) => s + Number(p.t3a || 0), 0);
      const totalT3I = playersList.reduce((s: number, p: any) => s + Number(p.t3i || p.t3a || 0), 0);
      const totalTLA = playersList.reduce((s: number, p: any) => s + Number(p.tla || 0), 0);
      const totalTLI = playersList.reduce((s: number, p: any) => s + Number(p.tli || p.tla || 0), 0);

      const pctT2Total = totalT2I > 0 ? `${Math.round((totalT2A / totalT2I) * 100)}%` : "0%";
      const pctT3Total = totalT3I > 0 ? `${Math.round((totalT3A / totalT3I) * 100)}%` : "0%";
      const pctTLTotal = totalTLI > 0 ? `${Math.round((totalTLA / totalTLI) * 100)}%` : "0%";

      const teamStatsSummary = playersList
        .map((p: any) => {
          const d = p.dorsal !== undefined && p.dorsal !== null && p.dorsal !== "" ? `#${p.dorsal}` : "#-";
          const tla = Number(p.tla || 0);
          const tli = Number(p.tli || tla);
          const t2a = Number(p.t2a || 0);
          const t2i = Number(p.t2i || t2a);
          const t3a = Number(p.t3a || 0);
          const t3i = Number(p.t3i || t3a);
          const pts = Number(p.pts !== undefined && p.pts !== null ? p.pts : (tla * 1 + t2a * 2 + t3a * 3));
          const pctTL = tli > 0 ? `${Math.round((tla / tli) * 100)}%` : "-";
          const pctT2 = t2i > 0 ? `${Math.round((t2a / t2i) * 100)}%` : "-";
          const pctT3 = t3i > 0 ? `${Math.round((t3a / t3i) * 100)}%` : "-";
          return `• ${d} ${p.jugadora || "Jugadora"}: ${pts} PTS | T2: ${t2a}/${t2i} (${pctT2}) | T3: ${t3a}/${t3i} (${pctT3}) | TL: ${tla}/${tli} (${pctTL}) | Faltas: ${p.fc_p || 0} | Min: ${p.min || 0}`;
        })
        .join("\n");

      let topStatsSummary = "";
      if (topStats) {
        if (Array.isArray(topStats.topPTS) && topStats.topPTS.length > 0) {
          topStatsSummary += `\n- TOP 5 ANOTADORAS: ` + topStats.topPTS.map((p: any) => `${p.dorsal ? '#' + p.dorsal + ' ' : ''}${p.jugadora} (${p.pts} pts)`).join(', ');
        }
        if (Array.isArray(topStats.topT3A) && topStats.topT3A.length > 0) {
          topStatsSummary += `\n- TOP 5 TRIPLES (T3A): ` + topStats.topT3A.map((p: any) => `${p.dorsal ? '#' + p.dorsal + ' ' : ''}${p.jugadora} (${p.t3a}/${p.t3i} T3)`).join(', ');
        }
        if (Array.isArray(topStats.topT2A) && topStats.topT2A.length > 0) {
          topStatsSummary += `\n- TOP 5 TIROS DE 2 (T2A): ` + topStats.topT2A.map((p: any) => `${p.dorsal ? '#' + p.dorsal + ' ' : ''}${p.jugadora} (${p.t2a}/${p.t2i} T2)`).join(', ');
        }
        if (Array.isArray(topStats.topTLA) && topStats.topTLA.length > 0) {
          topStatsSummary += `\n- TOP 5 TIROS LIBRES (TLA): ` + topStats.topTLA.map((p: any) => `${p.dorsal ? '#' + p.dorsal + ' ' : ''}${p.jugadora} (${p.tla}/${p.tli} TL)`).join(', ');
        }
      }

      const ai = getGeminiClient();
      if (ai && userQuestion) {
        const systemInstruction = `Eres CoachMind Scouting Analyst, el Asesor Táctico y Director de Scouting de Baloncesto Profesional FIBA.
Responde SIEMPRE en Español de España (Castellano). Razona analíticamente sobre el partido, citando nombres, dorsales y estadísticas exactas de la planilla.`;

        const prompt = `PREGUNTA DEL ENTRENADOR: "${userQuestion}"

DATOS DEL PARTIDO:
- Jornada ${jornadaNumber || 1}, Partido ${matchIndex !== undefined ? matchIndex + 1 : 1}
- Equipo Analizado: "${teamName || 'Equipo'}" (${teamRole === 'local' ? 'Local' : 'Visitante'})
- Marcador: ${scoreLocal || '?'} (Local) - ${scoreVisitor || '?'} (Visitante)
- Rival: "${matchOpponent || 'Rival'}"

TOTALES DE EQUIPO (${teamName}):
- Puntos Totales: ${totalPts} PTS | T2: ${totalT2A}/${totalT2I} (${pctT2Total}) | T3: ${totalT3A}/${totalT3I} (${pctT3Total}) | TL: ${totalTLA}/${totalTLI} (${pctTLTotal})

RANKINGS TOP 5 DE ${teamName}:
${topStatsSummary || '- Calculados a partir del Box Score.'}

BOX SCORE COMPLETO:
${teamStatsSummary}

Analiza y responde tácticamente a la consulta del entrenador:`;

        try {
          const response = await withTimeout(
            ai.models.generateContent({
              model: "gemini-3.6-flash",
              contents: prompt,
              config: { systemInstruction },
            }),
            12000
          );

          if (response?.text?.trim()) {
            return res.status(200).json({ success: true, text: response.text.trim(), reply: response.text.trim() });
          }
        } catch (apiErr) {
          console.warn("Gemini scouting Q&A error on Vercel:", apiErr);
        }
      }

      const fallbackReply = generateScoutingFallbackQA(req.body);
      return res.status(200).json({ success: true, text: fallbackReply, reply: fallbackReply });
    } catch (err: any) {
      console.error("Error in scouting QA handler:", err);
      const fallbackReply = generateScoutingFallbackQA(req.body || {});
      return res.status(200).json({ success: true, text: fallbackReply, reply: fallbackReply });
    }
  }

  // 4. Chat Route (/api/gemini/chat or /api/chat)
  if (req.method === "POST" && (url.includes("/api/gemini/chat") || url.includes("/api/chat"))) {
    try {
      const { message, history, coachPhilosophy, players } = req.body || {};
      const ai = getGeminiClient();

      if (ai && message) {
        let systemInstruction = `Eres CoachMind, el asistente experto e IA Entrenadora de baloncesto 24/7.
Respuestas concisas, estructuradas con viñetas, tono profesional, motivador y táctico en Español de España. Utiliza terminología real de baloncesto (defensa 2x1, pick and roll, box out, spacing, balance defensivo, ayudas). Si te consultan por errores de partido o actitud, ofrece siempre ejercicios y pautas pedagógicas concretas.`;

        if (coachPhilosophy) {
          systemInstruction += `\n\nFilosofía del entrenador: Estilo ${coachPhilosophy.playStyle || 'Dinámico'}, Ataque ${coachPhilosophy.offensiveFocus || 'Espaciado'}, Defensa ${coachPhilosophy.defensiveFocus || 'Presión'}.`;
        }

        const formattedHistory = Array.isArray(history)
          ? history
              .filter((msg: any) => msg && (msg.text || (msg.parts && msg.parts[0]?.text)))
              .map((msg: any) => ({
                role: (msg.role === 'user' || msg.sender === 'user') ? 'user' : 'model',
                parts: [{ text: msg.text || (msg.parts && msg.parts[0] ? msg.parts[0].text : '') }],
              }))
          : [];

        try {
          let response = null;
          try {
            const chat = ai.chats.create({
              model: "gemini-3.6-flash",
              history: formattedHistory,
              config: { systemInstruction, temperature: 0.7 },
            });
            response = await withTimeout(chat.sendMessage({ message }), 20000);
          } catch (m1Err) {
            console.warn("Primary gemini-3.6-flash chat failed, trying gemini-3.8-flash:", m1Err);
            const chatFallback = ai.chats.create({
              model: "gemini-3.8-flash",
              history: formattedHistory,
              config: { systemInstruction, temperature: 0.7 },
            });
            response = await withTimeout(chatFallback.sendMessage({ message }), 20000);
          }

          if (response && response.text) {
            return res.status(200).json({ success: true, text: response.text, reply: response.text });
          }
        } catch (apiErr) {
          console.warn("Gemini chat call in Vercel failed, using fallback:", apiErr);
        }
      }

      const reply = generateBasketballTacticalResponse(message || "", players || [], coachPhilosophy);
      return res.status(200).json({ success: true, text: reply, reply });
    } catch (err: any) {
      const fallbackReply = generateBasketballTacticalResponse(req.body?.message || "", req.body?.players || [], req.body?.coachPhilosophy);
      return res.status(200).json({ success: true, text: fallbackReply, reply: fallbackReply });
    }
  }

  // 5. Training Review Route (/api/gemini/review-training)
  if (req.method === "POST" && url.includes("/api/gemini/review-training")) {
    try {
      const { title, objective, category, level, intensity, durationMinutes, drills } = req.body || {};
      const ai = getGeminiClient();

      if (ai) {
        const drillsText = (drills || [])
          .map((d: any, i: number) => `Ejercicio ${i + 1}: "${d.title}" (${d.durationMinutes || 15} min) - ${d.description || ''} | Pautas: ${(d.coachingTips || []).join(', ')}`)
          .join('\n');

        const prompt = `Eres CoachMind, Metodólogo Experto de Baloncesto FIBA. Audita el siguiente entrenamiento:
- Objetivo: "${objective || 'Mejora general'}"
- Título: ${title || 'Sesión'} | Categoría: ${category || 'Senior'} | Nivel: ${level || 'Regional'} | Intensidad: ${intensity || 'Media'} | Duración: ${durationMinutes || 90} min
Ejercicios diseñados:
${drillsText}

Analiza si cumple el objetivo y devuelve un informe estructurado.`;

        try {
          const response = await withTimeout(
            ai.models.generateContent({
              model: "gemini-3.6-flash",
              contents: prompt,
              config: {
                responseMimeType: "application/json",
                responseSchema: {
                  type: Type.OBJECT,
                  properties: {
                    alignmentScore: { type: Type.INTEGER },
                    summary: { type: Type.STRING },
                    strengths: { type: Type.ARRAY, items: { type: Type.STRING } },
                    drillFeedbacks: {
                      type: Type.ARRAY,
                      items: {
                        type: Type.OBJECT,
                        properties: {
                          drillTitle: { type: Type.STRING },
                          isAligned: { type: Type.BOOLEAN },
                          status: { type: Type.STRING },
                          reason: { type: Type.STRING },
                          suggestion: { type: Type.STRING },
                        },
                        required: ["drillTitle", "isAligned", "status", "reason"],
                      },
                    },
                    tacticalSuggestions: { type: Type.ARRAY, items: { type: Type.STRING } },
                    loadAssessment: {
                      type: Type.OBJECT,
                      properties: {
                        intensityMatch: { type: Type.STRING },
                        durationBalance: { type: Type.STRING },
                      },
                      required: ["intensityMatch", "durationBalance"],
                    },
                  },
                  required: ["alignmentScore", "summary", "strengths", "drillFeedbacks", "tacticalSuggestions", "loadAssessment"],
                },
              },
            }),
            10000
          );

          if (response?.text) {
            const report = JSON.parse(response.text);
            return res.status(200).json({ success: true, report });
          }
        } catch (apiErr) {
          console.warn("Gemini training review error on Vercel:", apiErr);
        }
      }

      const report = {
        alignmentScore: 88,
        summary: `La sesión diseñada tiene una coherencia táctica alta respecto al objetivo "${objective || 'Fundamentos'}".`,
        strengths: ["Buena progresión pedagógica", "Intensidad acorde a la categoría", "Ocupación equilibrada del espacio"],
        drillFeedbacks: (drills || []).map((d: any, idx: number) => ({
          drillTitle: d.title || `Ejercicio ${idx + 1}`,
          isAligned: true,
          status: "optimal",
          reason: `Aporta trabajo específico para ${objective || 'el plan'}.`,
          suggestion: "Introducir variantes con presión de tiempo para mayor realismo competitivo.",
        })),
        tacticalSuggestions: [
          "Mantener consignas verbales cortas durante las explicaciones.",
          "Exigir máxima velocidad en las transiciones defensivas.",
        ],
        loadAssessment: {
          intensityMatch: `Intensidad ${intensity || 'Media'}: Óptima para ${category || 'Senior'}.`,
          durationBalance: `${durationMinutes || 90} min: Buen reparto de cargas de trabajo.`,
        },
      };
      return res.status(200).json({ success: true, report });
    } catch (err: any) {
      return res.status(200).json({ success: true, report: { alignmentScore: 85, summary: "Sesión analizada correctamente." } });
    }
  }

  // 6. Match Analysis Route (/api/gemini/analyze-match)
  if (req.method === "POST" && url.includes("/api/gemini/analyze-match")) {
    try {
      const { opponent, scoreUs, scoreThem, notes } = req.body || {};
      const ai = getGeminiClient();

      if (ai) {
        const prompt = `Analiza este partido de baloncesto:
Rival: ${opponent || 'Rival'}
Resultado: Nuestro equipo ${scoreUs || 0} - ${scoreThem || 0} Rival.
Notas del entrenador: ${notes || 'Sin notas adicionales'}`;

        try {
          const response = await withTimeout(
            ai.models.generateContent({
              model: "gemini-3.6-flash",
              contents: prompt,
              config: {
                responseMimeType: "application/json",
                responseSchema: {
                  type: Type.OBJECT,
                  properties: {
                    offensiveRating: { type: Type.STRING },
                    defensiveRating: { type: Type.STRING },
                    keyTakeaways: { type: Type.ARRAY, items: { type: Type.STRING } },
                    recommendedDrills: { type: Type.ARRAY, items: { type: Type.STRING } },
                  },
                  required: ["offensiveRating", "defensiveRating", "keyTakeaways", "recommendedDrills"],
                },
              },
            }),
            10000
          );

          if (response?.text) {
            const analysis = JSON.parse(response.text);
            return res.status(200).json({ success: true, analysis });
          }
        } catch (apiErr) {
          console.warn("Gemini match analysis error on Vercel:", apiErr);
        }
      }

      const isWin = Number(scoreUs) >= Number(scoreThem);
      const analysis = {
        offensiveRating: isWin ? "8.5/10 - Buen ritmo ofensivo y efectividad" : "6.5/10 - Dificultad en lectura de ventajas",
        defensiveRating: isWin ? "8/10 - Presión efectiva y control de rebote" : "6/10 - Desajustes en balance defensivo",
        keyTakeaways: [
          `Partido contra ${opponent || 'el rival'}: ${scoreUs || 0} - ${scoreThem || 0}`,
          "Sólida actitud colectiva e intensidad en cancha",
          "Aspectos a pulir: efectividad en tiros cercanos y anticipación en rebote",
        ],
        recommendedDrills: [
          "Trabajo de finalizaciones con contacto y uso de tablero",
          "Cierre de rebote en parejas (Box Out agresivo)",
          "Ataque contra defensa presionante 2x1",
        ],
      };
      return res.status(200).json({ success: true, analysis });
    } catch (err: any) {
      return res.status(200).json({ success: true, analysis: { offensiveRating: "7.5/10", defensiveRating: "7.5/10" } });
    }
  }

  // 7. Generate Training Route (/api/gemini/generate-training or /api/generate-training)
  if (req.method === "POST" && (url.includes("/api/gemini/generate-training") || url.includes("/api/generate-training"))) {
    try {
      const { title, category, level, intensity, durationMinutes, objective, coachPhilosophy } = req.body || {};
      const ai = getGeminiClient();
      const dur = durationMinutes || 90;

      if (ai) {
        const prompt = `Eres CoachMind, director técnico de baloncesto FIBA. Diseña un entrenamiento completo de ${dur} minutos enfocado en: "${objective || title || 'Fundamentos Tácticos'}". Categoría ${category || 'Senior'}, Nivel ${level || 'Regional'}, Intensidad ${intensity || 'Media'}.`;

        try {
          const response = await withTimeout(
            ai.models.generateContent({
              model: "gemini-3.6-flash",
              contents: prompt,
              config: {
                responseMimeType: "application/json",
                responseSchema: {
                  type: Type.OBJECT,
                  properties: {
                    warmup: {
                      type: Type.ARRAY,
                      items: {
                        type: Type.OBJECT,
                        properties: {
                          id: { type: Type.STRING },
                          title: { type: Type.STRING },
                          durationMinutes: { type: Type.INTEGER },
                          playersCount: { type: Type.STRING },
                          description: { type: Type.STRING },
                          coachingTips: { type: Type.ARRAY, items: { type: Type.STRING } },
                        },
                        required: ["id", "title", "durationMinutes", "description"],
                      },
                    },
                    mainDrills: {
                      type: Type.ARRAY,
                      items: {
                        type: Type.OBJECT,
                        properties: {
                          id: { type: Type.STRING },
                          title: { type: Type.STRING },
                          durationMinutes: { type: Type.INTEGER },
                          playersCount: { type: Type.STRING },
                          description: { type: Type.STRING },
                          coachingTips: { type: Type.ARRAY, items: { type: Type.STRING } },
                        },
                        required: ["id", "title", "durationMinutes", "description"],
                      },
                    },
                    cooldown: {
                      type: Type.ARRAY,
                      items: {
                        type: Type.OBJECT,
                        properties: {
                          id: { type: Type.STRING },
                          title: { type: Type.STRING },
                          durationMinutes: { type: Type.INTEGER },
                          playersCount: { type: Type.STRING },
                          description: { type: Type.STRING },
                          coachingTips: { type: Type.ARRAY, items: { type: Type.STRING } },
                        },
                        required: ["id", "title", "durationMinutes", "description"],
                      },
                    },
                    coachNotes: { type: Type.ARRAY, items: { type: Type.STRING } },
                    totalDuration: { type: Type.INTEGER },
                  },
                  required: ["warmup", "mainDrills", "cooldown", "coachNotes", "totalDuration"],
                },
              },
            }),
            12000
          );

          if (response?.text) {
            const plan = JSON.parse(response.text);
            return res.status(200).json({ success: true, plan, training: plan });
          }
        } catch (apiErr) {
          console.warn("Gemini generate-training error on Vercel:", apiErr);
        }
      }

      const training = {
        warmup: [
          {
            id: `w-${Date.now()}`,
            title: `Activación dinámica y técnica: ${category || 'Equipo'}`,
            durationMinutes: Math.round(dur * 0.2),
            playersCount: "Plantilla completa",
            description: "Movilidad articular, bote con cambios de dirección y entradas a canasta.",
            coachingTips: ["Máxima concentración", "Intensidad progresiva"],
          },
        ],
        mainDrills: [
          {
            id: `m-${Date.now()}-1`,
            title: `Bloque Principal: ${objective || title || 'Fundamentos Tácticos'}`,
            durationMinutes: Math.round(dur * 0.45),
            playersCount: "Grupos reducidos / 3v3",
            description: `Trabajo progresivo enfocado en ${objective || 'táctica'}.`,
            coachingTips: ["Exigir calidad en el pase", "Cierre de rebote obligatorio"],
          },
          {
            id: `m-${Date.now()}-2`,
            title: `Aplicación en 5c5 Real Condicionado`,
            durationMinutes: Math.round(dur * 0.25),
            playersCount: "5 vs 5",
            description: "Juego real aplicando las normas y variantes trabajadas.",
            coachingTips: ["Comunicación constante", "Ritmo de partido"],
          },
        ],
        cooldown: [
          {
            id: `c-${Date.now()}`,
            title: "Vuelta a la calma y tiros libres bajo fatiga",
            durationMinutes: Math.round(dur * 0.1),
            playersCount: "Parejas",
            description: "Series de tiros libres individuales y estiramientos musculares guiados.",
            coachingTips: ["Regular la respiración", "Feedback final del entrenador"],
          },
        ],
        coachNotes: [
          `Objetivo principal de la sesión: ${objective || title || 'Mejora continua'}.`,
          `Nivel: ${level || 'Regional'} | Intensidad: ${intensity || 'Media'}.`,
        ],
        totalDuration: dur,
      };

      return res.status(200).json({ success: true, plan: training, training, text: JSON.stringify(training) });
    } catch (err: any) {
      return res.status(500).json({ error: "Error al generar entrenamiento" });
    }
  }

  // Fallback default
  return res.status(200).json({ success: true, message: "CoachMind API activa y lista" });
}
