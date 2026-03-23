import { textToSpeech } from './geminiService';

const speechQueue: string[] = [];
let isSpeaking = false;

const speakNative = (text: string): Promise<void> => {
  return new Promise((resolve) => {
    if (!window.speechSynthesis) {
      resolve();
      return;
    }
    console.log(`Speech Service: Falling back to native TTS for "${text.substring(0, 30)}..."`);
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;
    utterance.onend = () => resolve();
    utterance.onerror = () => resolve();
    window.speechSynthesis.speak(utterance);
  });
};

const processQueue = async () => {
  if (speechQueue.length === 0 || isSpeaking) {
    return;
  }

  isSpeaking = true;
  const text = speechQueue.shift();

  if (text) {
    console.log(`Speech Service: Processing "${text.substring(0, 30)}..."`);
    try {
      const success = await textToSpeech(text);
      if (!success) {
        await speakNative(text);
      }
    } catch (error) {
      console.error("Speech synthesis failed:", error instanceof Error ? error.message : String(error));
      await speakNative(text);
    }
  }

  // Always reset isSpeaking and wait a bit before next phrase
  setTimeout(() => {
    isSpeaking = false;
    processQueue().catch(err => console.error("Queue process failed:", err));
  }, 500); // Reduced delay to 500ms for snappier response
};

export const speak = (text: string) => {
  if (!text) return;
  const cleanText = text.replace(/<[^>]*>?/gm, '');
  console.log(`Speech Service: Queuing "${cleanText.substring(0, 30)}..."`);
  speechQueue.push(cleanText);
  processQueue().catch(err => console.error("Speak process failed:", err));
};
