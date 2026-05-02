import { GoogleGenAI } from "@google/genai";
import { ScriptResponse } from "../types";
import { ApiKeys } from "../components/Settings";

export const aiService = {
  async generateScript(prompt: string, config: ApiKeys): Promise<ScriptResponse> {
    const systemPrompt = `You are an expert scriptwriter. Convert the following input into a structured video script.
    Break it into logical scenes based on the content flow. There is no limit to the number of scenes.
    For each scene, provide:
    1. "narration": The voiceover text.
    2. "visualQuery": A highly specific search term for stock footage (Pexels/Pixabay compatible).
    
    Return ONLY valid JSON:
    {
      "title": "...",
      "description": "...",
      "scenes": [
        { "id": 1, "narration": "...", "visualQuery": "..." }
      ]
    }`;

    const userPrompt = `${systemPrompt}\n\nInput: ${prompt}`;

    // 1. Google Gemini
    if (config.provider === 'gemini') {
      if (!config.gemini) return this.getMockScript(prompt);
      
      try {
        const genAI = new GoogleGenAI({ apiKey: config.gemini });
        const response = await genAI.models.generateContent({
          model: "gemini-1.5-flash",
          contents: [{ role: "user", parts: [{ text: userPrompt }] }]
        });
        
        const text = (typeof response.text === 'function' ? (response as any).text() : response.text) || "";
        if (!text) throw new Error("Gemini returned an empty response");
        
        return this.parseResponse(text);
      } catch (e: any) {
        console.error("Gemini call failed", e);
        throw new Error(e.message || "Failed to generate script with Gemini");
      }
    }

    // 2. OpenAI / Groq / Custom (OpenAI-Compatible)
    const baseUrl = config.provider === 'groq' 
      ? 'https://api.groq.com/openai/v1' 
      : config.provider === 'openai' 
        ? 'https://api.openai.com/v1' 
        : config.baseUrl || 'https://api.openai.com/v1';

    const apiKey = config[config.provider];
    if (!apiKey) return this.getMockScript(prompt);

    const model = config.model || (config.provider === 'groq' ? 'llama-3.3-70b-versatile' : 'gpt-4o-mini');

    try {
      const response = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: model,
          messages: [
            { role: 'system', content: 'You are a professional video director. Return ONLY raw JSON.' },
            { role: 'user', content: userPrompt }
          ],
          response_format: { type: "json_object" }
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = `HTTP ${response.status}`;
        try {
          const errorJson = JSON.parse(errorText);
          errorMessage = errorJson.error?.message || errorMessage;
        } catch (e) {
          errorMessage = errorText || errorMessage;
        }
        throw new Error(errorMessage);
      }

      const data = await response.json();
      
      if (!data.choices || !data.choices[0] || !data.choices[0].message) {
        throw new Error("Invalid response structure from LLM provider");
      }

      const content = data.choices[0].message.content;
      return this.parseResponse(content);
    } catch (e: any) {
      console.error("LLM API Call failed", e);
      // Propagate the actual error message instead of letting it fail silently or with a generic message
      throw new Error(e.message || "Connection failed");
    }
  },

  parseResponse(text: string): ScriptResponse {
    try {
      const cleanJson = text.replace(/```json/g, '').replace(/```/g, '').trim();
      return JSON.parse(cleanJson);
    } catch (e) {
      console.error("Failed to parse AI response", text);
      throw new Error("Invalid AI response format");
    }
  },

  getMockScript(topic: string): ScriptResponse {
    return {
      title: "Mock: " + topic,
      description: "A placeholder script for " + topic,
      scenes: [
        { id: 1, narration: "Welcome to the video.", visualQuery: "cinematic " + topic },
        { id: 2, narration: "This is a demonstration of the AI logic.", visualQuery: topic + " concept" },
        { id: 3, narration: "Thank you for using AssetPacker.ai.", visualQuery: "abstract background" },
        { id: 4, narration: "Everything is set for your production.", visualQuery: "film making" },
        { id: 5, narration: "Download your bundle now.", visualQuery: "success" }
      ]
    };
  }
};
