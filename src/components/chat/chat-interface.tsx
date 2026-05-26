"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import ReactMarkdown from "react-markdown";
import type { Components } from "react-markdown";
import { motion } from "framer-motion";
import { Bot, Mic2, MicOff, Send, Sparkles, Volume2 } from "lucide-react";
import { toast } from "sonner";
import { AiOrb } from "@/components/shared/ai-orb";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { useTypewriter } from "@/hooks/use-typewriter";
import type { ChatMessage } from "@/types/intelligence";

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
      className="break-words text-sentra-cyan underline decoration-cyan-300/30 underline-offset-4 transition hover:text-white"
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
  const searchParams = useSearchParams();
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [listening, setListening] = useState(false);
  const handledPromptRef = useRef<string | null>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const speechBaseInputRef = useRef("");
  const lastAssistantId = useMemo(
    () => [...messages].reverse().find((message) => message.role === "assistant")?.id,
    [messages],
  );

  useEffect(() => {
    const prompt = searchParams.get("prompt");
    if (!prompt || handledPromptRef.current === prompt) return;

    handledPromptRef.current = prompt;
    setInput(prompt);
  }, [searchParams]);

  useEffect(() => {
    return () => {
      recognitionRef.current?.stop();
    };
  }, []);

  async function sendMessage(nextInput = input) {
    const trimmed = nextInput.trim();
    if (!trimmed || loading) return;

    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: trimmed,
      createdAt: new Date().toISOString(),
    };

    setMessages((current) => [...current, userMessage]);
    setInput("");
    setLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: trimmed, history: messages }),
      });
      const data = (await response.json()) as { message?: string; error?: string };

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
        },
      ]);
    } catch (error) {
      toast.error("Sentra could not complete the analysis.", {
        description: error instanceof Error ? error.message : "Please try again.",
      });
    } finally {
      setLoading(false);
    }
  }

  async function playVoice(content: string) {
    setSpeaking(true);
    try {
      const response = await fetch("/api/voice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: content }),
      });

      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(data?.error ?? "ElevenLabs rejected the voice request.");
      }

      if (response.headers.get("content-type")?.includes("audio")) {
        const blob = await response.blob();
        const audio = new Audio(URL.createObjectURL(blob));
        audio.onended = () => setSpeaking(false);
        await audio.play();
      } else {
        toast.message("Voice is still in demo mode", {
          description: "Restart the dev server so Next.js reloads your ElevenLabs key.",
        });
        window.setTimeout(() => setSpeaking(false), 1800);
      }
    } catch (error) {
      setSpeaking(false);
      toast.error("Voice playback failed.", {
        description: error instanceof Error ? error.message : "Please try again.",
      });
    }
  }

  function toggleSpeechInput() {
    if (listening) {
      recognitionRef.current?.stop();
      setListening(false);
      return;
    }

    const Recognition = window.SpeechRecognition ?? window.webkitSpeechRecognition;
    if (!Recognition) {
      toast.error("Speech input is not supported in this browser.", {
        description: "Try Chrome or Edge and allow microphone permission.",
      });
      return;
    }

    const recognition = new Recognition();
    recognitionRef.current = recognition;
    speechBaseInputRef.current = input.trim();
    recognition.lang = "en-US";
    recognition.continuous = false;
    recognition.interimResults = true;

    recognition.onresult = (event) => {
      let transcript = "";
      for (let index = 0; index < event.results.length; index += 1) {
        transcript += event.results[index][0]?.transcript ?? "";
      }

      const separator = speechBaseInputRef.current && transcript.trim() ? " " : "";
      setInput(`${speechBaseInputRef.current}${separator}${transcript}`.trimStart());
    };

    recognition.onerror = (event) => {
      setListening(false);
      toast.error("Could not capture speech.", {
        description: event.message || `Speech recognition error: ${event.error}`,
      });
    };

    recognition.onend = () => {
      setListening(false);
    };

    try {
      setListening(true);
      recognition.start();
      toast.message("Listening...", {
        description: "Speak your intelligence request, then press send.",
      });
    } catch (error) {
      setListening(false);
      toast.error("Could not start speech input.", {
        description: error instanceof Error ? error.message : "Please check microphone access.",
      });
    }
  }

  return (
    <>
      <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
        <Card className="flex min-h-[calc(100vh-9rem)] flex-col overflow-hidden" glow>
          <div className="border-b border-white/10 p-6">
            <Badge variant="cyan">Streaming enterprise AI</Badge>
            <h1 className="mt-3 text-3xl font-semibold text-white md:text-5xl">Sentra analyst chat</h1>
            <p className="mt-3 text-white/55">
              Ask for live web intelligence, competitor monitoring, risk scoring, or market recommendations.
            </p>
          </div>

          <div className="flex-1 space-y-5 overflow-y-auto p-5 md:p-6">
            {messages.map((message) => (
              <motion.div
                key={message.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                className={message.role === "user" ? "ml-auto max-w-3xl" : "mr-auto max-w-4xl"}
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
                        <button
                          className="ml-auto rounded-full border border-white/10 p-2 text-white/50 transition hover:text-white"
                          onClick={() => playVoice(message.content)}
                          aria-label="Play voice response"
                        >
                          <Volume2 className="h-4 w-4" />
                        </button>
                      </div>
                    )}
                    {message.role === "assistant" ? (
                      <AssistantMessage content={message.content} animated={message.id === lastAssistantId} />
                    ) : (
                      <p className="text-sm leading-6 text-white/80">{message.content}</p>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
            {loading && (
              <div className="mr-auto max-w-3xl rounded-3xl border border-white/10 bg-white/[0.055] p-5">
                <div className="flex items-center gap-3 text-white/70">
                  <Sparkles className="h-4 w-4 animate-pulse text-sentra-cyan" />
                  Sentra is querying live web context and reasoning through recommendations...
                </div>
              </div>
            )}
          </div>

          <div className="border-t border-white/10 p-5">
            <div className="mb-4 flex flex-wrap gap-2">
              {prompts.map((prompt) => (
                <button
                  key={prompt}
                  className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1.5 text-xs text-white/60 transition hover:border-cyan-200/30 hover:text-white"
                  onClick={() => sendMessage(prompt)}
                >
                  {prompt}
                </button>
              ))}
            </div>
            <div className="flex gap-3">
              <Textarea
                value={input}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    sendMessage();
                  }
                }}
                placeholder="Ask Sentra to analyze competitors, monitor a market, or brief leadership..."
                className="min-h-16"
              />
              <Button
                type="button"
                variant={listening ? "neon" : "ghost"}
                size="icon"
                className="h-16 w-16 shrink-0"
                onClick={toggleSpeechInput}
                aria-label={listening ? "Stop voice input" : "Speak prompt"}
              >
                {listening ? <MicOff className="h-5 w-5" /> : <Mic2 className="h-5 w-5" />}
              </Button>
              <Button variant="neon" size="icon" className="h-16 w-16 shrink-0" onClick={() => sendMessage()}>
                <Send className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </Card>

        <aside className="grid content-start gap-5">
          <Card className="p-6 text-center" glow>
            <AiOrb speaking={speaking} size="md" className="mx-auto" />
            <h3 className="mt-6 text-xl font-semibold text-white">Voice analyst</h3>
            <p className="mt-2 text-sm leading-6 text-white/55">
              Use the microphone beside the prompt box to speak your request, or click the voice
              button on an AI response to hear the ElevenLabs analyst voice.
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

                playVoice(latestAssistant.content);
              }}
            >
              <Mic2 className="h-4 w-4" /> Voice controls
            </Button>
          </Card>
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
    </>
  );
}
