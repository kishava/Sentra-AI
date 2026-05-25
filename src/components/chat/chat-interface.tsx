"use client";

import { useMemo, useState } from "react";
import ReactMarkdown from "react-markdown";
import { motion } from "framer-motion";
import { Bot, Mic2, Send, Sparkles, Volume2 } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/dashboard/app-shell";
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

function AssistantMessage({ content, animated }: { content: string; animated?: boolean }) {
  const displayed = useTypewriter(content, animated);

  return (
    <div className="prose prose-invert max-w-none prose-p:text-white/68 prose-strong:text-white prose-li:text-white/65">
      <ReactMarkdown>{displayed}</ReactMarkdown>
    </div>
  );
}

export function ChatInterface() {
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const lastAssistantId = useMemo(
    () => [...messages].reverse().find((message) => message.role === "assistant")?.id,
    [messages],
  );

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
    } catch {
      setSpeaking(false);
      toast.error("Voice playback failed.");
    }
  }

  return (
    <AppShell>
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
              Click the voice button on an AI response to hear the configured ElevenLabs analyst
              voice. Restart the dev server after changing voice settings.
            </p>
            <Button variant="ghost" className="mt-5">
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
    </AppShell>
  );
}
