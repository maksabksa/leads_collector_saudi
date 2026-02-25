import { ENV } from "./env";

export type TTSVoice = "alloy" | "echo" | "fable" | "onyx" | "nova" | "shimmer";

export interface TTSOptions {
  text: string;
  voice?: TTSVoice;
  speed?: number; // 0.25 - 4.0
}

export interface TTSResult {
  audioBuffer: Buffer;
  mimeType: "audio/mpeg";
}

export interface TTSError {
  error: string;
  details?: string;
}

/**
 * تحويل النص لصوت باستخدام OpenAI TTS عبر FORGE API
 * يرجع Buffer يحتوي على ملف MP3
 */
export async function textToSpeech(options: TTSOptions): Promise<TTSResult | TTSError> {
  try {
    const baseUrl = ENV.forgeApiUrl.endsWith("/")
      ? ENV.forgeApiUrl
      : `${ENV.forgeApiUrl}/`;

    const fullUrl = new URL("v1/audio/speech", baseUrl).toString();

    const body = {
      model: "tts-1",
      input: options.text,
      voice: options.voice || "nova",
      response_format: "mp3",
      speed: options.speed || 1.0,
    };

    const response = await fetch(fullUrl, {
      method: "POST",
      headers: {
        authorization: `Bearer ${ENV.forgeApiKey}`,
        "Content-Type": "application/json",
        "Accept-Encoding": "identity",
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => "");
      return {
        error: "TTS service request failed",
        details: `HTTP ${response.status}: ${errorText.substring(0, 200)}`,
      };
    }

    const arrayBuffer = await response.arrayBuffer();
    const audioBuffer = Buffer.from(arrayBuffer);

    if (audioBuffer.length < 100) {
      return {
        error: "TTS returned empty audio",
        details: `Buffer size: ${audioBuffer.length} bytes`,
      };
    }

    return {
      audioBuffer,
      mimeType: "audio/mpeg",
    };
  } catch (err) {
    return {
      error: "TTS request exception",
      details: err instanceof Error ? err.message : String(err),
    };
  }
}
