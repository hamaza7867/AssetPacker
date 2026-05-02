import { GoogleGenAI } from "@google/genai";
import { ScriptResponse, StockAsset } from "../types";
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
    return this.executeLLM(userPrompt, config);
  },

  async rankMedia(sceneContext: { narration: string, query: string }, candidates: StockAsset[], config: ApiKeys): Promise<number> {
    if (candidates.length <= 1) return 0;

    const list = candidates.slice(0, 8).map((c, i) => 
      `[${i}] Type: ${c.type}, Desc: ${c.description}, Tags: ${c.tags?.join(', ')}`
    ).join('\n');

    const prompt = `As a film director, select the BEST stock media asset for this scene.
    Scene Narration: "${sceneContext.narration}"
    Target Concept: "${sceneContext.query}"

    Candidate Assets:
    ${list}

    Return ONLY the index number of the best asset. No explanation.`;

    try {
      const result = await this.executeLLM(prompt, config, true);
      const index = parseInt(typeof result === 'string' ? result : (result as any).index);
      return isNaN(index) ? 0 : Math.min(index, candidates.length - 1);
    } catch (e) {
      return 0;
    }
  },

  async executeLLM(prompt: string, config: ApiKeys, raw: boolean = false): Promise<any> {
    if (config.provider === 'gemini') {
      if (!config.gemini) return raw ? "0" : this.getMockScript("");
      
      try {
        const genAI = new GoogleGenAI({ apiKey: config.gemini });
        const response = await genAI.models.generateContent({
          model: "gemini-1.5-flash",
          contents: [{ role: "user", parts: [{ text: prompt }] }]
        });
        const text = (typeof response.text === 'function' ? (response as any).text() : response.text) || "";
        return raw ? text.trim() : this.parseResponse(text);
      } catch (e: any) {
        throw new Error(e.message || "Failed to generate script with Gemini");
      }
    }

    const baseUrl = config.provider === 'groq' 
      ? 'https://api.groq.com/openai/v1' 
      : config.provider === 'openai' 
        ? 'https://api.openai.com/v1' 
        : config.baseUrl || 'https://api.openai.com/v1';

    const apiKey = config[config.provider];
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
            { role: 'system', content: 'You are a professional video director. Return ONLY the requested content.' },
            { role: 'user', content: prompt }
          ],
          response_format: raw ? undefined : { type: "json_object" }
        })
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      const content = data.choices[0].message.content;
      return raw ? content.trim() : this.parseResponse(content);
    } catch (e: any) {
      throw new Error(e.message || "Connection failed");
    }
  },

  parseResponse(text: string): ScriptResponse {
    try {
      const cleanJson = text.replace(/```json/g, '').replace(/```/g, '').trim();
      return JSON.parse(cleanJson);
    } catch (e) {
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
