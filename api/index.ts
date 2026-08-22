import type { VercelRequest, VercelResponse } from "@vercel/node";
import { GoogleGenAI } from "@google/genai";

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
    res.status(200).end();
    return;
  }

  const url = req.url || "";

  if (url.includes("/api/health") || url === "/api") {
    return res.status(200).json({ status: "ok", service: "CoachMind-App Serverless API", timestamp: new Date().toISOString() });
  }

  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return res.status(500).json({
      error: "Falta configurar GEMINI_API_KEY en las variables de entorno de Vercel.",
    });
  }

  const ai = new GoogleGenAI({ apiKey });

  if (req.method === "POST" && url.includes("/api/generate-training")) {
    try {
      const { prompt, systemInstruction } = req.body || {};
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt || "Diseña una sesión de entrenamiento de baloncesto",
        config: {
          systemInstruction: systemInstruction || "Eres CoachMind, un asistente táctico de élite para entrenadores de baloncesto.",
          temperature: 0.7,
        },
      });
      return res.status(200).json({ text: response.text });
    } catch (err: any) {
      return res.status(500).json({ error: err.message || "Error al generar entrenamiento con IA" });
    }
  }

  if (req.method === "POST" && url.includes("/api/simulate-match")) {
    try {
      const { scenario, coachDecision } = req.body || {};
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: `Escenario: ${scenario}\nDecisión del entrenador: ${coachDecision}\nSimula el desenlace del partido y análisis táctico.`,
        config: {
          systemInstruction: "Eres el motor de simulación táctica de CoachMind Baloncesto.",
          temperature: 0.8,
        },
      });
      return res.status(200).json({ text: response.text });
    } catch (err: any) {
      return res.status(500).json({ error: err.message || "Error en el simulador" });
    }
  }

  // Fallback endpoint
  return res.status(200).json({ message: "CoachMind API activa" });
}
