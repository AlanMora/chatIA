import type { Chatbot } from "@shared/schema";

const LOCAL_DEVELOPMENT_ORIGINS = new Set([
  "http://localhost",
  "http://127.0.0.1",
]);

export function normalizeWidgetOrigin(value?: string | null): string | null {
  if (!value) return null;

  try {
    const url = new URL(value);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    return url.origin.toLowerCase();
  } catch {
    return null;
  }
}

function splitConfiguredEntries(value?: string | null): string[] {
  return (value || "")
    .split(/[\n,]+/)
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean);
}

export function parseWidgetAllowedOrigins(value?: string | null): string[] {
  return splitConfiguredEntries(value).flatMap((entry) => {
    const exactOrigin = normalizeWidgetOrigin(entry);
    if (exactOrigin) return [exactOrigin];
    if (/^[a-z0-9.-]+$/i.test(entry)) return [`https://${entry}`];
    return [];
  });
}

function configuredWidgetValue(chatbot: Chatbot): string {
  return chatbot.allowedDomains?.trim() || process.env.WIDGET_ALLOWED_ORIGINS || "";
}

function configuredWidgetOrigins(chatbot: Chatbot): string[] {
  return parseWidgetAllowedOrigins(configuredWidgetValue(chatbot));
}

function configuredBareHosts(chatbot: Chatbot): string[] {
  return splitConfiguredEntries(configuredWidgetValue(chatbot))
    .filter((entry) => /^[a-z0-9.-]+$/i.test(entry));
}

export function isWidgetOriginAllowed(chatbot: Chatbot, origin?: string): boolean {
  if (!origin) return true;

  const normalizedOrigin = normalizeWidgetOrigin(origin);
  if (!normalizedOrigin) return false;

  const allowedOrigins = configuredWidgetOrigins(chatbot);
  if (allowedOrigins.includes(normalizedOrigin)) return true;

  const host = new URL(normalizedOrigin).hostname;
  // A bare local host is an explicit development/internal opt-in and accepts
  // its local port. Public bare host names remain HTTPS-only above.
  if (
    ["localhost", "127.0.0.1", "192.168.8.39"].includes(host) &&
    configuredBareHosts(chatbot).includes(host)
  ) {
    return true;
  }

  return process.env.NODE_ENV !== "production" && LOCAL_DEVELOPMENT_ORIGINS.has(normalizedOrigin);
}