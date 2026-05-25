import OpenAI from "openai";
import { demoAnalysis } from "@/data/mock-intelligence";
import type { IntelligenceAnalysis } from "@/types/intelligence";

const SYSTEM_PROMPT = `You are Sentra AI, an enterprise intelligence analyst.
Analyze live web evidence from Bright Data and user context.
Return concise boardroom-ready intelligence with:
- executive summary
- risks
- opportunities
- recommendations
- confidence score
Use a premium enterprise tone and never invent exact sources that were not provided.`;

const CHAT_PROMPT = `You are Sentra AI, a helpful live-web analyst.
Answer the user's latest question directly and concisely.
Search the live web before answering every request. For current facts, officeholders, news, prices, or other time-sensitive claims, rely on the newest reliable sources and mention a specific date when useful.
For current officeholders, search for the latest election, appointment, or swearing-in record and prefer the newest official government source available. Do not treat an older government page as current if a newer official record supersedes it.
Do not volunteer an "as of today" date unless the user requests it; cite the source's dated event instead.
Do not force simple factual questions into an enterprise intelligence brief.
Do not reuse unrelated demo intelligence or repeat a previous answer unless the user asks about it.
Use clean markdown. For answers longer than a short paragraph, organize information with descriptive ### headings and bullet lists. Put forecasts in a distinct ### Outlook section only when requested or relevant. Never output dense unstructured paragraphs.
Do not create a Sources section; source links are added by the application.`;

function getFreshnessDate() {
  const timeZone = process.env.SENTRA_TIMEZONE || "Asia/Colombo";
  const date = new Intl.DateTimeFormat("en-GB", {
    dateStyle: "long",
    timeZone,
  }).format(new Date());

  return { date, timeZone };
}

function getOpenAIClient() {
  if (!process.env.OPENAI_API_KEY) return null;
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

export async function generateEnterpriseAnalysis(
  query: string,
  webEvidence: string,
): Promise<IntelligenceAnalysis> {
  const client = getOpenAIClient();
  if (!client) {
    return {
      ...demoAnalysis,
      summary: `${demoAnalysis.summary} Demo analysis generated for: "${query}".`,
    };
  }

  const response = await client.chat.completions.create({
    model: "gpt-4o-mini",
    temperature: 0.35,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      {
        role: "user",
        content: `Query: ${query}\n\nBright Data evidence:\n${webEvidence}\n\nReturn JSON with keys: summary, risks, opportunities, recommendations, confidenceScore.`,
      },
    ],
  });

  const content = response.choices[0]?.message?.content;
  if (!content) return demoAnalysis;

  const parsed = JSON.parse(content) as Omit<IntelligenceAnalysis, "signals">;
  return {
    ...parsed,
    signals: demoAnalysis.signals,
  };
}

export async function generateChatResponse(message: string) {
  const client = getOpenAIClient();
  if (!client) {
    throw new Error("Configure OPENAI_API_KEY to use live chat answers.");
  }

  const freshnessDate = getFreshnessDate();
  const response = await client.responses.create({
    model: process.env.OPENAI_CHAT_MODEL || "gpt-5.5",
    instructions: `${CHAT_PROMPT}\nUse ${freshnessDate.date} (${freshnessDate.timeZone}) as the current date when resolving which source is latest.`,
    input: message,
    tools: [{ type: "web_search", search_context_size: "medium" }],
    tool_choice: "required",
    include: ["web_search_call.action.sources"],
    store: false,
  });

  const text = response.output_text.trim();
  if (!text) {
    throw new Error("Live search returned an empty answer.");
  }

  const citations = response.output.flatMap((item) =>
    item.type === "message"
      ? item.content.flatMap((content) =>
          content.type === "output_text"
            ? content.annotations.filter((annotation) => annotation.type === "url_citation")
            : [],
        )
      : [],
  );
  const sources = Array.from(
    new Map(citations.map((citation) => [citation.url, citation.title || citation.url])).entries(),
  );

  if (!sources.length) {
    return text;
  }

  return `${text}\n\n### Sources\n${sources
    .map(([url, title]) => `- [${title}](${url})`)
    .join("\n")}`;
}
