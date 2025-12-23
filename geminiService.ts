
import { GoogleGenAI } from "@google/genai";

// Fix: Properly initialize GoogleGenAI with the API_KEY named parameter as per guidelines.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const geminiAssistant = {
  async summarizeActa(text: string) {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Eres el asistente oficial del Centro de Estudiantes BOP 20. Resume el siguiente acta de sesión de forma profesional y concisa: ${text}`,
    });
    return response.text;
  },

  async generateAnnouncement(topic: string) {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Genera un comunicado formal para el Centro de Estudiantes BOP 20 sobre: ${topic}. Mantén un tono institucional.`,
    });
    return response.text;
  },

  async detectErrors(data: any) {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Analiza estos datos de votación/asistencia y detecta posibles inconsistencias o sugerencias de optimización: ${JSON.stringify(data)}`,
    });
    return response.text;
  }
};
