import { AimlTtsError, synthesizeAimlSpeech } from "@/services/aiml-tts";

export { AimlTtsError };

/** Primary voice provider: AIML TTS (uses AIML_API_KEY). */
export async function synthesizeSpeech(text: string, playbackSpeed = 1) {
  try {
    return await synthesizeAimlSpeech(text, playbackSpeed);
  } catch (error) {
    if (error instanceof AimlTtsError) throw error;
    console.warn("AIML voice synthesis unavailable", error);
    return null;
  }
}
