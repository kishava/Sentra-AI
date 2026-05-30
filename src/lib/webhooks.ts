/** Slack, Discord, or simple alert webhooks for monitor notifications. */
export const ALERT_WEBHOOK_STORAGE_KEY = "sentra-alert-webhook";

/** CRM, Zapier, Make, TriggerWare, and other automation webhooks. */
export const AUTOMATION_WEBHOOK_STORAGE_KEY = "sentra-automation-webhook";

const LEGACY_CRM_WEBHOOK_KEY = "sentra-crm-webhook";
const LEGACY_TRIGGERWARE_WEBHOOK_KEY = "sentra-triggerware-webhook";

export function isAllowedWebhook(url: string) {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" || parsed.hostname === "localhost";
  } catch {
    return false;
  }
}

function readLegacyAutomationWebhook() {
  if (typeof window === "undefined") return "";

  const crm = window.localStorage.getItem(LEGACY_CRM_WEBHOOK_KEY)?.trim() ?? "";
  const triggerware = window.localStorage.getItem(LEGACY_TRIGGERWARE_WEBHOOK_KEY)?.trim() ?? "";
  return crm || triggerware;
}

export function getAutomationWebhookUrl() {
  if (typeof window === "undefined") return "";

  const current = window.localStorage.getItem(AUTOMATION_WEBHOOK_STORAGE_KEY)?.trim() ?? "";
  if (current) return current;

  const legacy = readLegacyAutomationWebhook();
  if (!legacy) return "";

  window.localStorage.setItem(AUTOMATION_WEBHOOK_STORAGE_KEY, legacy);
  window.localStorage.removeItem(LEGACY_CRM_WEBHOOK_KEY);
  window.localStorage.removeItem(LEGACY_TRIGGERWARE_WEBHOOK_KEY);
  return legacy;
}

export function saveAutomationWebhookUrl(url: string) {
  if (typeof window === "undefined") return;
  const trimmed = url.trim();
  if (trimmed) {
    window.localStorage.setItem(AUTOMATION_WEBHOOK_STORAGE_KEY, trimmed);
  } else {
    window.localStorage.removeItem(AUTOMATION_WEBHOOK_STORAGE_KEY);
  }
  window.localStorage.removeItem(LEGACY_CRM_WEBHOOK_KEY);
  window.localStorage.removeItem(LEGACY_TRIGGERWARE_WEBHOOK_KEY);
}

export function getAlertWebhookUrl() {
  if (typeof window === "undefined") return "";
  return window.localStorage.getItem(ALERT_WEBHOOK_STORAGE_KEY)?.trim() ?? "";
}

export function saveAlertWebhookUrl(url: string) {
  if (typeof window === "undefined") return;
  const trimmed = url.trim();
  if (trimmed) {
    window.localStorage.setItem(ALERT_WEBHOOK_STORAGE_KEY, trimmed);
  } else {
    window.localStorage.removeItem(ALERT_WEBHOOK_STORAGE_KEY);
  }
}
