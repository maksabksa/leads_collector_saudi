import { spawn } from "child_process";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export type TTSVoice = "alloy" | "echo" | "fable" | "onyx" | "nova" | "shimmer";

export interface TTSOptions {
  text: string;
  voice?: TTSVoice;
  speed?: number; // 0.25 - 4.0
  lang?: string; // ar, ar-SA, en, etc.
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
 * تحويل النص لصوت باستخدام gTTS (Google Text-to-Speech)
 * يرجع Buffer يحتوي على ملف MP3
 */
export async function textToSpeech(options: TTSOptions): Promise<TTSResult | TTSError> {
  return new Promise((resolve) => {
    try {
      const lang = normalizeLang(options.lang || "ar");
      const slow = options.speed !== undefined && options.speed < 0.8 ? "true" : "false";

      const scriptPath = path.join(__dirname, "gtts_helper.py");
      const proc = spawn("python3.11", [scriptPath, lang, slow], {
        stdio: ["pipe", "pipe", "pipe"],
      });

      const chunks: Buffer[] = [];
      const errChunks: Buffer[] = [];

      proc.stdout.on("data", (chunk: Buffer) => chunks.push(chunk));
      proc.stderr.on("data", (chunk: Buffer) => errChunks.push(chunk));

      proc.on("close", (code) => {
        if (code !== 0) {
          const errMsg = Buffer.concat(errChunks).toString("utf8").trim();
          resolve({
            error: "gTTS failed",
            details: errMsg || `exit code ${code}`,
          });
          return;
        }

        const audioBuffer = Buffer.concat(chunks);
        if (audioBuffer.length < 100) {
          resolve({
            error: "gTTS returned empty audio",
            details: `Buffer size: ${audioBuffer.length} bytes`,
          });
          return;
        }

        resolve({
          audioBuffer,
          mimeType: "audio/mpeg",
        });
      });

      proc.on("error", (err) => {
        resolve({
          error: "gTTS process error",
          details: err.message,
        });
      });

      // إرسال النص للـ stdin
      proc.stdin.write(options.text, "utf8");
      proc.stdin.end();

      // timeout بعد 30 ثانية
      const timer = setTimeout(() => {
        proc.kill();
        resolve({
          error: "gTTS timeout",
          details: "Process killed after 30s",
        });
      }, 30000);

      proc.on("close", () => clearTimeout(timer));
    } catch (err) {
      resolve({
        error: "TTS request exception",
        details: err instanceof Error ? err.message : String(err),
      });
    }
  });
}

/**
 * تحويل كود اللغة لصيغة gTTS المدعومة
 */
function normalizeLang(lang: string): string {
  if (lang.startsWith("ar")) return "ar";
  if (lang.startsWith("en")) return "en";
  return lang.split("-")[0] || "ar";
}
