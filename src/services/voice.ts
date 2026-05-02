"use client";

export const voiceService = {
  async generateSpeech(text: string, apiKey: string, voiceId: string): Promise<Blob> {
    if (!apiKey) throw new Error("ElevenLabs API Key is missing");
    
    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'xi-api-key': apiKey
      },
      body: JSON.stringify({
        text,
        model_id: 'eleven_monolingual_v1',
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.5
        }
      })
    });

    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.detail?.message || "Speech generation failed");
    }

    return await response.blob();
  }
};
