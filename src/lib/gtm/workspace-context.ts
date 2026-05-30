export type WorkspaceContext = {
  companyName?: string;
  industry?: string;
  competitors?: string;
  markets?: string;
  alertPreference?: string;
  completedAt?: string;
};

export const WORKSPACE_PROFILE_KEY = "sentra-workspace-profile";

export function getWorkspaceContext(): WorkspaceContext {
  if (typeof window === "undefined") return {};

  try {
    return JSON.parse(window.localStorage.getItem(WORKSPACE_PROFILE_KEY) || "{}") as WorkspaceContext;
  } catch {
    return {};
  }
}

export function saveWorkspaceContext(context: WorkspaceContext) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(
    WORKSPACE_PROFILE_KEY,
    JSON.stringify({ ...context, updatedAt: new Date().toISOString() }),
  );
}

export function formatWorkspaceContextForPrompt(context?: WorkspaceContext | null) {
  if (!context) return "";

  const parts = [
    context.companyName?.trim() ? `Company: ${context.companyName.trim()}` : null,
    context.industry?.trim() ? `Industry: ${context.industry.trim()}` : null,
    context.competitors?.trim() ? `Competitors to watch: ${context.competitors.trim()}` : null,
    context.markets?.trim() ? `Priority markets: ${context.markets.trim()}` : null,
    context.alertPreference?.trim() ? `Alert threshold: ${context.alertPreference.trim()}` : null,
  ].filter(Boolean);

  return parts.length ? parts.join("\n") : "";
}

export function enrichQueryWithWorkspace(query: string, context?: WorkspaceContext | null) {
  const block = formatWorkspaceContextForPrompt(context);
  if (!block) return query;
  return `${query}\n\nAccount context:\n${block}`;
}
