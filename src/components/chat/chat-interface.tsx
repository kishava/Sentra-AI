"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import ReactMarkdown from "react-markdown";
import type { Components } from "react-markdown";
import { motion } from "framer-motion";
import { Bot, FileText, Mic2, MicOff, Paperclip, Radar, Send, Sparkles, Volume2, X } from "lucide-react";
import { toast } from "sonner";
import { AiOrb } from "@/components/shared/ai-orb";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { LiveAgentLogs } from "@/features/activity-console/ai-activity-console";
import { usePipelineLogs } from "@/hooks/use-pipeline-logs";
import { useSpeechInput } from "@/hooks/use-speech-input";
import { useTypewriter } from "@/hooks/use-typewriter";
import { chatPipelineScript } from "@/lib/pipeline-log-scripts";
import { getWorkspaceContext } from "@/lib/gtm/workspace-context";
import { WorkspacePage, WorkspacePageHeader } from "@/components/workspace/workspace-page";
import { abortVoiceController, isAbortError } from "@/lib/voice/abort";
import { playPipelinedVoice } from "@/lib/voice/pipelined-playback";
import { cn } from "@/lib/utils";
import { useSettings } from "@/settings/settings-context";
import type { ChatDocumentEvidence, ChatMessage, ChatProvider } from "@/types/intelligence";

const prompts = [
  "Analyze Tesla competitors",
  "Track AI startups in Singapore",
  "Summarize current market trends",
  "Monitor pricing changes",
];

const initialMessages: ChatMessage[] = [
  {
    id: "welcome",
    role: "assistant",
    createdAt: new Date().toISOString(),
    content:
      "I am Sentra, your autonomous enterprise intelligence analyst. Ask me to monitor competitors, summarize market shifts, score risks, or generate a strategic briefing.",
  },
];

const assistantMarkdownComponents: Components = {
  h1: ({ children }) => <h2 className="mb-3 mt-6 text-xl font-semibold text-white first:mt-0">{children}</h2>,
  h2: ({ children }) => <h2 className="mb-3 mt-6 text-lg font-semibold text-white first:mt-0">{children}</h2>,
  h3: ({ children }) => (
    <h3 className="mb-2 mt-6 text-sm font-semibold uppercase tracking-[0.18em] text-sentra-cyan first:mt-0">
      {children}
    </h3>
  ),
  p: ({ children }) => <p className="mb-3 text-sm leading-7 text-white/72 last:mb-0">{children}</p>,
  strong: ({ children }) => <strong className="font-semibold text-white">{children}</strong>,
  ul: ({ children }) => (
    <ul className="mb-4 space-y-2 pl-1 last:mb-0 [&_li]:relative [&_li]:pl-4 [&_li]:before:absolute [&_li]:before:left-0 [&_li]:before:top-2.5 [&_li]:before:h-1.5 [&_li]:before:w-1.5 [&_li]:before:rounded-full [&_li]:before:bg-sentra-cyan">
      {children}
    </ul>
  ),
  ol: ({ children }) => <ol className="mb-4 list-decimal space-y-2 pl-5 text-white/72 last:mb-0">{children}</ol>,
  li: ({ children }) => <li className="text-sm leading-6 text-white/72">{children}</li>,
  a: ({ children, href }) => (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="break-words text-sentra-cyan underline decoration-cyan-300/30 underline-offset-4 transition"
    >
      {children}
    </a>
  ),
  blockquote: ({ children }) => (
    <blockquote className="my-4 rounded-r-2xl border-l-2 border-sentra-cyan/60 bg-white/[0.04] px-4 py-3">
      {children}
    </blockquote>
  ),
};

function AssistantMessage({ content, animated }: { content: string; animated?: boolean }) {
  const displayed = useTypewriter(content, animated);

  return (
    <div className="max-w-none">
      <ReactMarkdown components={assistantMarkdownComponents}>{displayed}</ReactMarkdown>
    </div>
  );
}

export function ChatInterface() {
  const { settings } = useSettings();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [threadId, setThreadId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [useGtmAgent, setUseGtmAgent] = useState(false);
  const [liveChatReady, setLiveChatReady] = useState<boolean | null>(null);
  const [attachedDocument, setAttachedDocument] = useState<ChatDocumentEvidence | null>(null);
  const [parsingDocument, setParsingDocument] = useState(false);
  const documentInputRef = useRef<HTMLInputElement | null>(null);
  const [voiceStatus, setVoiceStatus] = useState<"idle" | "loading" | "playing">("idle");
  const [activeVoiceText, setActiveVoiceText] = useState<string | null>(null);
  const handledPromptRef = useRef<string | null>(null);
  const autoGreetingStartedRef = useRef(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioUrlRef = useRef<string | null>(null);
  const voiceAbortRef = useRef<AbortController | null>(null);
  const voiceRunIdRef = useRef(0);
  const currentVoiceTextRef = useRef<string | null>(null);
  const speakingTimeoutRef = useRef<number | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const lastAssistantId = useMemo(
    () => [...messages].reverse().find((message) => message.role === "assistant")?.id,
    [messages],
  );
  const speaking = voiceStatus !== "idle";
  const pipeline = usePipelineLogs(chatPipelineScript);
  const {
    listening,
    transcribing,
    liveTranscript,
    toggleSpeechInput,
    stopSpeechInput,
  } = useSpeechInput({
    value: input,
    onChange: setInput,
    getContext: () => input,
  });

  function finishVoicePlayback() {
    currentVoiceTextRef.current = null;
    setActiveVoiceText(null);
    if (speakingTimeoutRef.current) {
      window.clearTimeout(speakingTimeoutRef.current);
      speakingTimeoutRef.current = null;
    }
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = "";
      audioRef.current = null;
    }
    if (audioUrlRef.current) {
      URL.revokeObjectURL(audioUrlRef.current);
      audioUrlRef.current = null;
    }
    setVoiceStatus("idle");
  }

  function resetVoicePlayback() {
    voiceRunIdRef.current += 1;
    const controller = voiceAbortRef.current;
    voiceAbortRef.current = null;
    abortVoiceController(controller);
    finishVoicePlayback();
  }

  useEffect(() => {
    fetch("/api/health/integrations")
      .then((response) => response.json())
      .then((data: { aiml?: boolean; llm?: { ready?: boolean } }) => {
        setLiveChatReady(Boolean(data?.aiml ?? data?.llm?.ready));
      })
      .catch(() => setLiveChatReady(false));
  }, []);

  useEffect(() => {
    fetch("/api/chat/threads", { method: "POST" })
      .then((response) => response.json())
      .then((data: { thread?: { id: string } }) => {
        if (data.thread?.id) setThreadId(data.thread.id);
      })
      .catch(() => {
        // Thread creation requires Supabase auth.
      });
  }, []);

  useEffect(() => {
    window.addEventListener("pagehide", resetVoicePlayback);

    return () => {
      window.removeEventListener("pagehide", resetVoicePlayback);
      resetVoicePlayback();
      stopSpeechInput();
    };
  }, [stopSpeechInput]);

  useEffect(() => {
    if (pathname !== "/chat") {
      const timeout = window.setTimeout(resetVoicePlayback, 0);
      return () => window.clearTimeout(timeout);
    }
  }, [pathname]);

  useEffect(() => {
    if (!settings.voice.microphone) stopSpeechInput();
  }, [settings.voice.microphone, stopSpeechInput]);

  useEffect(() => {
    if (!settings.voice.enabled) queueMicrotask(resetVoicePlayback);
  }, [settings.voice.enabled]);

  useEffect(() => {
    if (autoGreetingStartedRef.current) return;
    if (!settings.voice.enabled || !settings.voice.autoPlayback) return;

    autoGreetingStartedRef.current = true;
    const timeout = window.setTimeout(() => {
      void playVoice(initialMessages[0].content, { automatic: true });
    }, 700);

    return () => window.clearTimeout(timeout);
    // The greeting should run once per chat mount, using the initial voice handler.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "auto", block: "end" });
  }, [messages, loading]);

  async function handleDocumentSelect(file: File | null) {
    if (!file || parsingDocument) return;

    setParsingDocument(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const response = await fetch("/api/documents/parse", { method: "POST", body: formData });
      const data = (await response.json()) as {
        document?: ChatDocumentEvidence;
        error?: string;
      };

      if (!response.ok || !data.document?.text) {
        throw new Error(data.error ?? "Could not read document.");
      }

      setAttachedDocument(data.document);
      toast.success(`Attached ${data.document.fileName}`, {
        description: data.document.ocrUsed
          ? "Smart OCR extracted text (AIML or Featherless vision)."
          : data.document.truncated
            ? "Large file trimmed for analysis context."
            : `${data.document.charCount?.toLocaleString() ?? ""} characters loaded.`,
      });
    } catch (error) {
      toast.error("Document upload failed.", {
        description: error instanceof Error ? error.message : "Please try another file.",
      });
    } finally {
      setParsingDocument(false);
      if (documentInputRef.current) documentInputRef.current.value = "";
    }
  }

  async function sendMessage(nextInput = input) {
    const trimmed = nextInput.trim();
    const document = attachedDocument;
    if ((!trimmed && !document) || loading) return;
    stopSpeechInput();

    const displayContent = trimmed || `Analyze the uploaded document: ${document!.fileName}`;

    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: displayContent,
      createdAt: new Date().toISOString(),
      attachment: document
        ? {
            fileName: document.fileName,
            mimeType: document.mimeType,
            charCount: document.charCount,
            truncated: document.truncated,
            ocrUsed: document.ocrUsed,
          }
        : undefined,
    };

    setMessages((current) => [...current, userMessage]);
    setInput("");
    setAttachedDocument(null);
    setLoading(true);
    pipeline.start();

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: displayContent,
          history: messages,
          threadId,
          brightData: settings.brightData,
          document: document ?? undefined,
          workspace: getWorkspaceContext(),
          useGtmAgent,
        }),
      });
      const data = (await response.json()) as {
        message?: string;
        provider?: ChatProvider;
        threadId?: string;
        error?: string;
      };

      if (data.threadId) setThreadId(data.threadId);

      if (!response.ok || typeof data.message !== "string" || !data.message.trim()) {
        throw new Error(data.error || "Sentra returned an empty response.");
      }

      const reply = data.message;
      setMessages((current) => [
        ...current,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: reply,
          createdAt: new Date().toISOString(),
          provider: data.provider,
        },
      ]);
    } catch (error) {
      toast.error("Sentra could not complete the analysis.", {
        description: error instanceof Error ? error.message : "Please try again.",
      });
    } finally {
      pipeline.complete();
      setLoading(false);
    }
  }

  useEffect(() => {
    const prompt = searchParams.get("prompt");
    if (!prompt || handledPromptRef.current === prompt) return;

    handledPromptRef.current = prompt;
    void sendMessage(prompt);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once per unique prompt URL
  }, [searchParams]);

  async function playVoice(content: string, options?: { automatic?: boolean }) {
    if (!settings.voice.enabled) {
      if (!options?.automatic) toast.message("AI voice response is disabled in Settings.");
      return;
    }

    if (speaking && currentVoiceTextRef.current === content) {
      resetVoicePlayback();
      return;
    }

    resetVoicePlayback();
    const runId = voiceRunIdRef.current;
    const abortController = new AbortController();
    voiceAbortRef.current = abortController;
    currentVoiceTextRef.current = content;
    setActiveVoiceText(content);
    setVoiceStatus("loading");

    try {
      const result = await playPipelinedVoice(
        content,
        { volume: settings.voice.volume, speed: settings.voice.speed, voiceMode: settings.voice.mode },
        abortController.signal,
        {
          onStatus: (status) => {
            if (voiceRunIdRef.current !== runId) return;
            if (status !== "idle") setVoiceStatus(status);
          },
        },
      );

      if (abortController.signal.aborted || voiceRunIdRef.current !== runId) return;
      if (result === "cancelled") return;

      if (result === "demo") {
        toast.message("Voice is still in demo mode", {
          description: "Add SPEECHMATICS_API_KEY to the Supabase vault (npm run secrets:rotate).",
        });
        speakingTimeoutRef.current = window.setTimeout(finishVoicePlayback, 1800);
        return;
      }

      if (result === "completed" || result === "empty") {
        finishVoicePlayback();
      }
    } catch (error) {
      if (isAbortError(error) || voiceRunIdRef.current !== runId) return;
      finishVoicePlayback();
      const blockedAutoplay =
        options?.automatic &&
        error instanceof DOMException &&
        (error.name === "NotAllowedError" || error.name === "AbortError");

      if (blockedAutoplay) {
        toast.message("Voice greeting is ready", {
          description: "Click Voice controls if your browser blocked autoplay.",
        });
        return;
      }

      toast.error("Voice playback failed.", {
        description: error instanceof Error ? error.message : "Please try again.",
      });
    }
  }

  return (
    <WorkspacePage>
      <WorkspacePageHeader
        badge="Streaming enterprise AI"
        title="Sentra analyst chat"
        description="Ask for live web intelligence, competitor monitoring, risk scoring, or market recommendations. Enable GTM agent for Bright Data MCP collection."
      />
      {liveChatReady === false && (
        <p className="-mt-4 rounded-2xl border border-amber-300/25 bg-amber-400/10 px-4 py-3 text-sm text-amber-100">
          Live chat needs <code className="font-mono text-xs">AIML_API_KEY</code> from{" "}
          <a href="https://aimlapi.com" target="_blank" rel="noreferrer" className="underline">
            aimlapi.com
          </a>{" "}
          in <code className="font-mono text-xs">.env.local</code>, then restart{" "}
          <code className="font-mono text-xs">npm run dev</code>.
        </p>
      )}
      <div className="grid min-w-0 gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <Card className="flex min-h-[calc(100svh-11rem)] min-w-0 flex-col overflow-hidden md:min-h-[calc(100vh-9rem)]" glow>
          <div className="border-b border-white/10 px-5 py-4 md:px-6">
            <p className="text-sm text-white/50">Account context from Monitors is applied automatically to each request.</p>
          </div>

          <div className="flex-1 space-y-5 overflow-y-auto overscroll-contain p-4 md:p-6">
            {messages.map((message) => (
              <motion.div
                key={message.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                className={cn(
                  "min-w-0",
                  message.role === "user" ? "ml-auto max-w-3xl" : "mr-auto max-w-4xl",
                )}
              >
                <div
                  className={
                    message.role === "user"
                      ? "rounded-3xl bg-gradient-to-r from-sentra-cyan to-sentra-violet p-[1px]"
                      : "rounded-3xl border border-white/10 bg-white/[0.055] p-5"
                  }
                >
                  <div className={message.role === "user" ? "rounded-3xl bg-sentra-ink px-5 py-4 text-white" : ""}>
                    {message.role === "assistant" && (
                      <div className="mb-4 flex items-center gap-3">
                        <span className="grid h-9 w-9 place-items-center rounded-2xl bg-cyan-300/10 text-sentra-cyan">
                          <Bot className="h-4 w-4" />
                        </span>
                        <span className="text-sm font-medium text-white">Sentra AI</span>
                        {message.provider && (
                          <span className="hidden rounded-full border border-white/10 bg-white/[0.06] px-2.5 py-1 text-[10px] uppercase tracking-[0.16em] text-white/45 sm:inline-flex">
                            {message.provider === "featherless-document-bright-data"
                              ? "Featherless + Bright Data"
                              : message.provider === "featherless-document"
                                ? "Featherless document"
                                : message.provider === "aiml-document-bright-data"
                                  ? "Document + Bright Data"
                                  : message.provider === "aiml-document"
                                    ? "Document analysis"
                                    : message.provider === "aiml-bright-data" || message.provider === "bright-data-openai"
                                  ? "Bright Data + AIML"
                                  : message.provider === "gtm-agent"
                                    ? "GTM agent · MCP + AIML"
                                  : message.provider === "aiml-search"
                                    ? "AIML live search"
                                    : "Live web search"}
                          </span>
                        )}
                        <button
                          type="button"
                          className={cn(
                            "ml-auto rounded-full border border-white/10 p-2 text-white/50 transition",
                            speaking &&
                              activeVoiceText === message.content &&
                              "border-cyan-200/40 bg-cyan-300/10 text-cyan-100",
                          )}
                          onClick={() => void playVoice(message.content)}
                          disabled={!settings.voice.enabled}
                          aria-label={
                            speaking && activeVoiceText === message.content
                              ? "Stop voice response"
                              : "Play voice response"
                          }
                        >
                          {voiceStatus === "loading" && activeVoiceText === message.content ? (
                            <Sparkles className="h-4 w-4 animate-pulse" />
                          ) : (
                            <Volume2 className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                    )}
                    {message.role === "assistant" ? (
                      <AssistantMessage content={message.content} animated={message.id === lastAssistantId} />
                    ) : (
                      <div>
                        {message.attachment && (
                          <p className="mb-2 flex items-center gap-2 text-xs text-sentra-cyan/90">
                            <FileText className="h-3.5 w-3.5 shrink-0" />
                            <span className="truncate">{message.attachment.fileName}</span>
                          </p>
                        )}
                        <p className="break-words text-sm leading-6 text-white/80">{message.content}</p>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
            {loading && (
              <div className="mr-auto max-w-3xl rounded-3xl border border-white/10 bg-white/[0.055] p-5">
                <div className="flex items-center gap-3 text-white/70">
                  <Sparkles className="h-4 w-4 animate-pulse text-sentra-cyan" />
                  Sentra is collecting live evidence and reasoning through recommendations...
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="border-t border-white/10 p-4 md:p-5">
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant={useGtmAgent ? "neon" : "ghost"}
                size="sm"
                className="rounded-full"
                onClick={() => setUseGtmAgent((current) => !current)}
              >
                <Radar className="h-4 w-4" />
                {useGtmAgent ? "GTM agent on" : "Run GTM agent"}
              </Button>
              {prompts.map((prompt) => (
                <button
                  key={prompt}
                  className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1.5 text-xs text-white/60 transition"
                  onClick={() => sendMessage(prompt)}
                >
                  {prompt}
                </button>
              ))}
            </div>
            {attachedDocument && (
              <div className="mb-3 flex items-center gap-2 rounded-2xl border border-cyan-200/20 bg-cyan-300/[0.06] px-3 py-2 text-sm text-cyan-50/90">
                <FileText className="h-4 w-4 shrink-0" />
                <span className="min-w-0 flex-1 truncate">
                  {attachedDocument.fileName}
                  {attachedDocument.ocrUsed ? " · OCR" : ""}
                </span>
                <button
                  type="button"
                  className="rounded-full p-1 text-white/50 transition hover:bg-white/10 hover:text-white"
                  onClick={() => setAttachedDocument(null)}
                  aria-label="Remove attached document"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}
            <input
              ref={documentInputRef}
              type="file"
              className="hidden"
              accept=".pdf,.docx,.txt,.md,.csv,.png,.jpg,.jpeg,.webp,application/pdf,text/plain,text/markdown,text/csv,image/png,image/jpeg,image/webp,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              onChange={(event) => void handleDocumentSelect(event.target.files?.[0] ?? null)}
            />
            <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto_auto_auto]">
              <Textarea
                value={input}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    sendMessage();
                  }
                }}
                placeholder={
                  attachedDocument
                    ? "Ask about this document, or press Send to summarize it..."
                    : "Ask Sentra to analyze competitors, monitor a market, or brief leadership..."
                }
                className="min-h-24 sm:min-h-16"
              />
              <div className="grid grid-cols-3 gap-3 sm:contents">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-14 w-full shrink-0 sm:h-16 sm:w-16"
                  onClick={() => documentInputRef.current?.click()}
                  disabled={parsingDocument || loading}
                  aria-label="Attach PDF or document"
                >
                  {parsingDocument ? (
                    <Sparkles className="h-5 w-5 animate-pulse" />
                  ) : (
                    <Paperclip className="h-5 w-5" />
                  )}
                </Button>
                {settings.voice.microphone && (
                  <Button
                    type="button"
                    variant={listening ? "neon" : "ghost"}
                    size="icon"
                    className="h-14 w-full shrink-0 sm:h-16 sm:w-16"
                    onClick={() => void toggleSpeechInput()}
                    disabled={transcribing}
                    aria-label={listening ? "Stop voice recording" : transcribing ? "Transcribing voice prompt" : "Record voice prompt"}
                  >
                    {transcribing ? (
                      <Sparkles className="h-5 w-5 animate-pulse" />
                    ) : listening ? (
                      <MicOff className="h-5 w-5" />
                    ) : (
                      <Mic2 className="h-5 w-5" />
                    )}
                  </Button>
                )}
                <Button
                  variant="neon"
                  size="icon"
                  className="h-14 w-full shrink-0 sm:h-16 sm:w-16"
                  onClick={() => sendMessage()}
                  disabled={loading || (!input.trim() && !attachedDocument)}
                  aria-label="Send message"
                >
                  <Send className="h-5 w-5" />
                </Button>
              </div>
            </div>
            <p className="mt-2 text-xs text-white/40">
              {listening
                ? liveTranscript
                  ? `Listening: ${liveTranscript}`
                  : "Listening — transcript appears as you speak."
                : !settings.voice.microphone
                  ? "Microphone input is disabled in Settings."
                  : transcribing
                  ? "Refining transcript..."
                  : "Attach PDF, DOCX, TXT, or images (smart OCR). Include a URL or monitor/competitor keywords for Bright Data."}
            </p>
          </div>
        </Card>

        <aside className="grid min-w-0 content-start gap-5">
          <Card className="p-6 text-center" glow>
            <AiOrb speaking={speaking || listening || transcribing} size="md" className="mx-auto" />
            <h3 className="mt-6 text-xl font-semibold text-white">Voice analyst</h3>
            <p className="mt-2 text-sm leading-6 text-white/55">
              {voiceStatus === "loading"
                ? "Preparing first sentence…"
                : voiceStatus === "playing"
                  ? "Speaking sentence by sentence. Click the active voice button to stop."
                  : listening
                    ? "Transcript updates live in the prompt while you speak."
                    : "Use the microphone beside the prompt box to speak your request, or click a response voice button."}
            </p>
            <Button
              variant="ghost"
              className="mt-5"
              onClick={() => {
                const latestAssistant = [...messages]
                  .reverse()
                  .find((message) => message.role === "assistant");

                if (!latestAssistant) {
                  toast.message("No analyst response available yet.");
                  return;
                }

                void playVoice(latestAssistant.content);
              }}
              disabled={!settings.voice.enabled}
            >
              {voiceStatus === "loading" ? (
                <Sparkles className="h-4 w-4 animate-pulse" />
              ) : (
                <Mic2 className="h-4 w-4" />
              )}
              {speaking ? "Stop voice" : "Voice controls"}
            </Button>
          </Card>
          {settings.analyst.liveLogs && (loading || pipeline.logs.length > 0) && (
            <Card className="overflow-hidden p-0" glow>
              <div className="border-b border-white/10 px-5 py-4">
                <p className="text-sm font-semibold text-white">Live intelligence terminal</p>
                <p className="mt-1 text-xs text-white/42">Bright Data + AI pipeline telemetry</p>
              </div>
              <div className="terminal-panel">
                <LiveAgentLogs logs={pipeline.logs} running={pipeline.running} />
              </div>
            </Card>
          )}
          <Card className="p-6" glow>
            <p className="text-sm uppercase tracking-[0.24em] text-white/35">Intelligence modes</p>
            <div className="mt-5 grid gap-3">
              {["Competitor monitor", "Market scout", "Risk analyst", "Pricing tracker"].map((mode) => (
                <div key={mode} className="rounded-2xl border border-white/10 bg-white/[0.045] p-3 text-sm text-white/62">
                  {mode}
                </div>
              ))}
            </div>
          </Card>
        </aside>
      </div>
    </WorkspacePage>
  );
}
