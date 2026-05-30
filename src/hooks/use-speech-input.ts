"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { pickRecordingBlob, prepareTranscriptionFile } from "@/lib/voice/audio-encoding";
import { resolveSpeechRecognitionLanguage, resolveSttLanguage } from "@/lib/voice/languages";

type SpeechRecognitionCtor = new () => SpeechRecognitionInstance;

type SpeechRecognitionInstance = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: SpeechRecognitionResultEvent) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
};

type SpeechRecognitionResultEvent = {
  resultIndex: number;
  results: SpeechRecognitionResultList;
};

type SpeechRecognitionResultList = {
  length: number;
  [index: number]: {
    isFinal: boolean;
    0: { transcript: string };
  };
};

function getSpeechRecognitionCtor(): SpeechRecognitionCtor | null {
  if (typeof window === "undefined") return null;
  const win = window as typeof window & {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  };
  return win.SpeechRecognition ?? win.webkitSpeechRecognition ?? null;
}

async function transcribeBlob(blob: Blob, context?: string, language?: string, mimeType?: string) {
  const prepared = await prepareTranscriptionFile(blob, mimeType || blob.type);
  const formData = new FormData();
  formData.append("audio", prepared);
  if (context?.trim()) formData.append("context", context.trim());
  if (language) formData.append("language", resolveSttLanguage(language));

  const response = await fetch("/api/transcribe", { method: "POST", body: formData });
  const data = (await response.json()) as { text?: string; error?: string; provider?: string };
  return {
    ok: response.ok,
    status: response.status,
    text: data.text?.trim(),
    error: data.error,
    provider: data.provider,
  };
}

type UseSpeechInputOptions = {
  value: string;
  onChange: (value: string) => void;
  getContext?: () => string;
  language?: string;
};

export function useSpeechInput({ value, onChange, getContext, language = "en" }: UseSpeechInputOptions) {
  const [listening, setListening] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [liveTranscript, setLiveTranscript] = useState("");

  const valueRef = useRef(value);
  const baseValueRef = useRef("");
  const committedRef = useRef("");
  const modeRef = useRef<"speech-api" | "media-recorder" | "hybrid" | null>(null);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const recognitionActiveRef = useRef(false);
  const fallbackInProgressRef = useRef(false);
  const skipBackupTranscriptionRef = useRef(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const mediaMimeTypeRef = useRef("audio/webm");
  const audioChunksRef = useRef<Blob[]>([]);
  const languageRef = useRef(language);
  const startMediaRecorderRef = useRef<
    (options?: { preserveTranscript?: boolean; backupOnly?: boolean }) => Promise<boolean>
  >(async () => false);

  useEffect(() => {
    valueRef.current = value;
  }, [value]);

  useEffect(() => {
    languageRef.current = language;
  }, [language]);

  const mergeIntoField = useCallback(
    (committed: string, interim: string) => {
      const base = baseValueRef.current.trim();
      const spoken = [committed.trim(), interim.trim()].filter(Boolean).join(" ").trim();
      if (!spoken) return;
      const merged = base ? `${base} ${spoken}` : spoken;
      onChange(merged);
      setLiveTranscript(interim.trim());
    },
    [onChange],
  );

  const cleanupMedia = useCallback((skipTranscription = false) => {
    skipBackupTranscriptionRef.current = skipTranscription;
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.stop();
      return;
    }
    mediaRecorderRef.current = null;
    mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
    mediaStreamRef.current = null;
    audioChunksRef.current = [];
  }, []);

  const cleanupRecognition = useCallback(() => {
    recognitionActiveRef.current = false;
    recognitionRef.current?.abort();
    recognitionRef.current = null;
  }, []);

  const stopSpeechInput = useCallback(() => {
    fallbackInProgressRef.current = false;
    recognitionActiveRef.current = false;
    cleanupRecognition();
    cleanupMedia(false);
    modeRef.current = null;
    setListening(false);
    setLiveTranscript("");
  }, [cleanupMedia, cleanupRecognition]);

  const transcribeRecording = useCallback(
    async (blob: Blob, mimeType: string) => {
      if (!blob.size) return false;
      setTranscribing(true);
      try {
        const context = `${baseValueRef.current} ${committedRef.current}`.trim() || getContext?.() || valueRef.current;
        const result = await transcribeBlob(blob, context, languageRef.current, mimeType);
        if (!result.ok) {
          if (result.status === 429) {
            toast.error("Voice transcription limit reached.", {
              description: "Wait a few minutes or type your prompt.",
            });
          } else {
            toast.error(result.error ?? "Could not transcribe your voice.");
          }
          return false;
        }
        if (!result.text) {
          toast.message("No speech detected", { description: "Try speaking closer to the microphone." });
          return false;
        }
        committedRef.current = `${committedRef.current} ${result.text}`.trim();
        mergeIntoField(committedRef.current, "");
        toast.success("Voice prompt ready", {
          description:
            result.provider === "speechmatics"
              ? "Transcribed with Speechmatics. Review, then submit."
              : "Review the transcript, then submit.",
        });
        return true;
      } finally {
        setTranscribing(false);
      }
    },
    [getContext, mergeIntoField],
  );

  const fallbackToMediaRecorder = useCallback(async () => {
    if (fallbackInProgressRef.current) return;
    fallbackInProgressRef.current = true;

    const partial = committedRef.current.trim();
    cleanupRecognition();
    modeRef.current = "media-recorder";

    toast.message("Using server transcription", {
      description: "Keep speaking, then tap Stop when finished.",
    });

    const started = await startMediaRecorderRef.current({ preserveTranscript: Boolean(partial) });
    fallbackInProgressRef.current = false;

    if (!started) {
      setListening(false);
      setLiveTranscript("");
      if (partial) mergeIntoField(partial, "");
      toast.error("Voice input unavailable.", { description: "Type your prompt instead." });
    }
  }, [cleanupRecognition, mergeIntoField]);

  const startSpeechApi = useCallback(() => {
    const Ctor = getSpeechRecognitionCtor();
    if (!Ctor) return false;

    baseValueRef.current = valueRef.current;
    committedRef.current = "";
    modeRef.current = "speech-api";
    recognitionActiveRef.current = true;

    const recognition = new Ctor();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = resolveSpeechRecognitionLanguage(languageRef.current);
    recognitionRef.current = recognition;

    recognition.onresult = (event) => {
      let interim = "";
      let finalDelta = "";
      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        const piece = event.results[index][0].transcript;
        if (event.results[index].isFinal) finalDelta += piece;
        else interim += piece;
      }
      if (finalDelta) committedRef.current = `${committedRef.current} ${finalDelta}`.trim();
      mergeIntoField(committedRef.current, interim);
    };

    recognition.onerror = (event) => {
      if (event.error === "not-allowed" || event.error === "service-not-allowed") {
        toast.error("Microphone permission was denied.");
        stopSpeechInput();
        return;
      }
      if (event.error === "aborted" || event.error === "no-speech") return;

      void fallbackToMediaRecorder();
    };

    recognition.onend = () => {
      if (!recognitionActiveRef.current || fallbackInProgressRef.current) return;
      try {
        recognition.start();
      } catch {
        void fallbackToMediaRecorder();
      }
    };

    try {
      recognition.start();
    } catch {
      return false;
    }

    setListening(true);
    toast.message("Listening", { description: "Speak now — text appears as you talk. Tap Stop when done." });
    return true;
  }, [fallbackToMediaRecorder, mergeIntoField, stopSpeechInput]);

  const startMediaRecorder = useCallback(
    async (options?: { preserveTranscript?: boolean; backupOnly?: boolean }) => {
      if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
        if (!options?.backupOnly) {
          toast.error("Microphone access needs a secure page.", {
            description: "Open the app on localhost or HTTPS, then allow microphone access.",
          });
        }
        return false;
      }
      if (!window.MediaRecorder) {
        if (!options?.backupOnly) {
          toast.error("Audio recording is not supported in this browser.");
        }
        return false;
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true, channelCount: 1 },
      });

      const supportedType = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"].find((type) =>
        MediaRecorder.isTypeSupported(type),
      );
      if (!supportedType) {
        stream.getTracks().forEach((track) => track.stop());
        if (!options?.backupOnly) {
          toast.error("Your browser does not provide a supported audio recording format.");
        }
        return false;
      }

      if (!options?.preserveTranscript) {
        baseValueRef.current = valueRef.current;
        committedRef.current = "";
      }

      modeRef.current = options?.backupOnly ? "hybrid" : "media-recorder";
      mediaStreamRef.current = stream;
      audioChunksRef.current = [];

      const recorder = new MediaRecorder(stream, { mimeType: supportedType });
      mediaRecorderRef.current = recorder;
      mediaMimeTypeRef.current = supportedType;

      recorder.ondataavailable = (event) => {
        if (!event.data.size) return;
        audioChunksRef.current.push(event.data);
      };
      recorder.onerror = () => {
        stopSpeechInput();
        toast.error("Could not record microphone audio.");
      };
      recorder.onstop = () => {
        const chunks = audioChunksRef.current;
        audioChunksRef.current = [];
        mediaRecorderRef.current = null;
        stream.getTracks().forEach((track) => track.stop());
        mediaStreamRef.current = null;

        const skipTranscription = skipBackupTranscriptionRef.current;
        skipBackupTranscriptionRef.current = false;

        if (modeRef.current === "hybrid" || modeRef.current === "speech-api") {
          setListening(false);
          setLiveTranscript("");
          modeRef.current = null;
        }

        if (skipTranscription || committedRef.current.trim()) {
          if (committedRef.current.trim() && !skipTranscription) {
            toast.success("Voice prompt ready", { description: "Review the transcript, then submit." });
          }
          return;
        }

        setListening(false);
        setLiveTranscript("");
        modeRef.current = null;

        const blob = pickRecordingBlob(chunks, mediaMimeTypeRef.current);
        void (async () => {
          if (blob) await transcribeRecording(blob, mediaMimeTypeRef.current);
        })();
      };

      recorder.start();
      if (!options?.backupOnly) {
        setListening(true);
        toast.message("Listening", { description: "Tap Stop or the microphone again when you are done speaking." });
      }
      return true;
    },
    [stopSpeechInput, transcribeRecording],
  );

  useEffect(() => {
    startMediaRecorderRef.current = startMediaRecorder;
  }, [startMediaRecorder]);

  const toggleSpeechInput = useCallback(async () => {
    if (listening) {
      if (modeRef.current === "speech-api" || modeRef.current === "hybrid") {
        recognitionActiveRef.current = false;
        cleanupRecognition();
        setListening(false);
        setLiveTranscript("");

        const hasLiveText = committedRef.current.trim();
        if (hasLiveText) {
          cleanupMedia(true);
          toast.success("Voice prompt ready", { description: "Review the transcript, then submit." });
        } else {
          cleanupMedia(false);
        }

        modeRef.current = null;
        return;
      }
      stopSpeechInput();
      return;
    }

    try {
      const speechStarted = startSpeechApi();
      if (speechStarted) {
        void startMediaRecorder({ preserveTranscript: true, backupOnly: true });
        return;
      }

      const recorderStarted = await startMediaRecorder();
      if (recorderStarted) return;
    } catch (error) {
      const recorderStarted = await startMediaRecorder().catch(() => false);
      if (recorderStarted) return;

      const denied =
        error instanceof DOMException &&
        (error.name === "NotAllowedError" || error.name === "PermissionDeniedError");
      toast.error("Microphone could not start.", {
        description: denied
          ? "Allow microphone access in browser site settings and try again."
          : "Check your microphone device and try again.",
      });
    }
  }, [cleanupRecognition, cleanupMedia, listening, startMediaRecorder, startSpeechApi, stopSpeechInput]);

  useEffect(() => () => {
    recognitionActiveRef.current = false;
    cleanupRecognition();
    cleanupMedia(true);
  }, [cleanupMedia, cleanupRecognition]);

  return {
    listening,
    transcribing,
    liveTranscript,
    toggleSpeechInput,
    stopSpeechInput,
  };
}
