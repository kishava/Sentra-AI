"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

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

async function transcribeBlob(blob: Blob, context?: string) {
  const extension = blob.type.includes("mp4") ? "mp4" : "webm";
  const formData = new FormData();
  formData.append("audio", new File([blob], `speech.${extension}`, { type: blob.type }));
  if (context?.trim()) formData.append("context", context.trim());

  const response = await fetch("/api/transcribe", { method: "POST", body: formData });
  const data = (await response.json()) as { text?: string; error?: string };
  return { ok: response.ok, status: response.status, text: data.text?.trim(), error: data.error };
}

type UseSpeechInputOptions = {
  value: string;
  onChange: (value: string) => void;
  getContext?: () => string;
};

export function useSpeechInput({ value, onChange, getContext }: UseSpeechInputOptions) {
  const [listening, setListening] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [liveTranscript, setLiveTranscript] = useState("");

  const valueRef = useRef(value);
  const baseValueRef = useRef("");
  const committedRef = useRef("");
  const modeRef = useRef<"speech-api" | "media-recorder" | null>(null);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const recognitionActiveRef = useRef(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const transcriptionQueueRef = useRef(Promise.resolve());

  useEffect(() => {
    valueRef.current = value;
  }, [value]);

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

  const cleanupMedia = useCallback(() => {
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.requestData();
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
    recognitionActiveRef.current = false;
    cleanupRecognition();
    cleanupMedia();
    modeRef.current = null;
    setListening(false);
    setLiveTranscript("");
  }, [cleanupMedia, cleanupRecognition]);

  const transcribeChunk = useCallback(
    async (blob: Blob) => {
      if (!blob.size) return;
      setTranscribing(true);
      try {
        const context = `${baseValueRef.current} ${committedRef.current}`.trim() || getContext?.() || valueRef.current;
        const result = await transcribeBlob(blob, context);
        if (!result.ok || !result.text) return;
        committedRef.current = `${committedRef.current} ${result.text}`.trim();
        mergeIntoField(committedRef.current, "");
      } finally {
        setTranscribing(false);
      }
    },
    [getContext, mergeIntoField],
  );

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
    recognition.lang = "en-US";
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
      } else if (event.error !== "aborted" && event.error !== "no-speech") {
        toast.error("Live speech recognition failed.", {
          description: "Falling back may require stopping and trying again.",
        });
      }
      stopSpeechInput();
    };

    recognition.onend = () => {
      if (!recognitionActiveRef.current) return;
      try {
        recognition.start();
      } catch {
        stopSpeechInput();
      }
    };

    recognition.start();
    setListening(true);
    toast.message("Listening", { description: "Speak — your words appear in the prompt as you talk." });
    return true;
  }, [mergeIntoField, stopSpeechInput]);

  const startMediaRecorder = useCallback(async () => {
    if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
      toast.error("Microphone access needs a secure page.", {
        description: "Open the app on localhost or HTTPS, then allow microphone access.",
      });
      return false;
    }
    if (!window.MediaRecorder) {
      toast.error("Audio recording is not supported in this browser.");
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
      toast.error("Your browser does not provide a supported audio recording format.");
      return false;
    }

    baseValueRef.current = valueRef.current;
    committedRef.current = "";
    modeRef.current = "media-recorder";
    mediaStreamRef.current = stream;
    audioChunksRef.current = [];

    const recorder = new MediaRecorder(stream, { mimeType: supportedType });
    mediaRecorderRef.current = recorder;

    recorder.ondataavailable = (event) => {
      if (!event.data.size) return;
      audioChunksRef.current.push(event.data);
      transcriptionQueueRef.current = transcriptionQueueRef.current
        .then(() => transcribeChunk(event.data))
        .catch(() => undefined);
    };
    recorder.onerror = () => {
      stopSpeechInput();
      toast.error("Could not record microphone audio.");
    };
    recorder.onstop = () => {
      audioChunksRef.current = [];
      mediaRecorderRef.current = null;
      stream.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
      setListening(false);
      setLiveTranscript("");
      if (committedRef.current.trim()) {
        toast.success("Voice prompt ready", { description: "Review the transcript, then submit." });
      }
    };

    recorder.start(1800);
    setListening(true);
    toast.message("Listening", { description: "Speak now. Transcript updates every few seconds while you talk." });
    return true;
  }, [stopSpeechInput, transcribeChunk]);

  const toggleSpeechInput = useCallback(async () => {
    if (listening) {
      if (modeRef.current === "speech-api") {
        recognitionActiveRef.current = false;
        cleanupRecognition();
        setListening(false);
        setLiveTranscript("");
        if (committedRef.current.trim()) {
          toast.success("Voice prompt ready", { description: "Review the transcript, then submit." });
        }
        modeRef.current = null;
        return;
      }
      stopSpeechInput();
      return;
    }

    try {
      const recorderStarted = await startMediaRecorder();
      if (recorderStarted) return;

      const speechStarted = startSpeechApi();
      if (speechStarted) return;
    } catch (error) {
      const speechStarted = startSpeechApi();
      if (speechStarted) return;

      const denied =
        error instanceof DOMException &&
        (error.name === "NotAllowedError" || error.name === "PermissionDeniedError");
      toast.error("Microphone could not start.", {
        description: denied
          ? "Allow microphone access in browser site settings and try again."
          : "Check your microphone device and try again.",
      });
    }
  }, [cleanupRecognition, listening, startMediaRecorder, startSpeechApi, stopSpeechInput]);

  useEffect(() => () => {
    recognitionActiveRef.current = false;
    cleanupRecognition();
    cleanupMedia();
  }, [cleanupMedia, cleanupRecognition]);

  return {
    listening,
    transcribing,
    liveTranscript,
    toggleSpeechInput,
    stopSpeechInput,
  };
}
