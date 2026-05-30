"use client";

import { useRef, useState } from "react";
import { FileText, Loader2, Sparkles } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { getWorkspaceContext } from "@/lib/gtm/workspace-context";

type BattlecardAnalyzerProps = {
  compact?: boolean;
};

export function BattlecardAnalyzer({ compact = false }: BattlecardAnalyzerProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [loading, setLoading] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [liveCheck, setLiveCheck] = useState(false);

  async function analyzeFile(file: File | null) {
    if (!file || loading) return;

    setLoading(true);
    setAnalysis(null);
    setFileName(file.name);

    try {
      const formData = new FormData();
      formData.append("file", file);
      const parseResponse = await fetch("/api/documents/parse", { method: "POST", body: formData });
      const parsed = (await parseResponse.json()) as {
        document?: { fileName: string; text: string };
        error?: string;
      };

      if (!parseResponse.ok || !parsed.document?.text) {
        throw new Error(parsed.error || "Could not read battlecard PDF.");
      }

      const response = await fetch("/api/battlecard/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileName: parsed.document.fileName,
          text: parsed.document.text,
          workspace: getWorkspaceContext(),
          runLiveCheck: true,
        }),
      });

      const data = (await response.json()) as {
        analysis?: string;
        liveCheck?: boolean;
        provider?: string;
        error?: string;
      };

      if (!response.ok || !data.analysis) {
        throw new Error(data.error || "Battlecard analysis failed.");
      }

      setAnalysis(data.analysis);
      setLiveCheck(Boolean(data.liveCheck));
      toast.success("Battlecard analyzed", {
        description: data.liveCheck
          ? "Featherless + Bright Data live verification complete."
          : "Featherless document analysis complete.",
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Battlecard analysis failed.");
      setFileName(null);
    } finally {
      setLoading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <Card className={compact ? "p-4" : "p-5 md:p-6"} glow>
      <div className="flex items-start justify-between gap-3">
        <div>
          <Badge variant="violet">Featherless + Bright Data</Badge>
          <h2 className={`mt-3 font-semibold text-white ${compact ? "text-lg" : "text-xl"}`}>
            Analyze battlecard PDF
          </h2>
          <p className="mt-2 text-sm leading-6 text-white/55">
            Upload a competitor battlecard. Featherless reads the document; Bright Data verifies claims against the live web.
          </p>
        </div>
        <FileText className="h-5 w-5 shrink-0 text-sentra-cyan" />
      </div>

      <input
        ref={inputRef}
        type="file"
        className="hidden"
        accept=".pdf,.docx,.txt,.md,application/pdf,text/plain,text/markdown,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        onChange={(event) => void analyzeFile(event.target.files?.[0] ?? null)}
      />

      <div className="mt-4 flex flex-wrap gap-3">
        <Button variant="neon" disabled={loading} onClick={() => inputRef.current?.click()}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          {loading ? "Analyzing…" : "Upload battlecard"}
        </Button>
        {fileName && <Badge variant="default">{fileName}</Badge>}
        {liveCheck && <Badge variant="success">Live web check</Badge>}
      </div>

      {analysis && (
        <div className="prose-invert mt-5 max-w-none rounded-3xl border border-white/10 bg-white/[0.045] p-4 text-sm leading-7 text-white/68">
          <ReactMarkdown>{analysis}</ReactMarkdown>
        </div>
      )}
    </Card>
  );
}
