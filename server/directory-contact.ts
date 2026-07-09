import type { KnowledgeBaseItem } from "@shared/schema";
import { storage } from "./storage";

type DirectoryContact = {
  office: string;
  phone: string | null;
  alternativePhones: string[];
  category: string;
  aliases: string[];
};

type DirectoryIntent =
  | { type: "none" }
  | { type: "lookup"; query: string }
  | { type: "list"; category: "habilitecas" | "nidos" | "caic" | "nidos_caic" };

const CONTACT_KEYWORDS = /\b(tel[eé]fono|telefono|n[uú]mero|numero|contacto|llamar|llamo|comunicar|comunicarme|directo|a donde llamo|donde llamo)\b/i;
const LIST_KEYWORDS = /\b(lista|listar|dame|cu[aá]les|cuales|qu[eé]\s+.+tienen|contactos? de|tel[eé]fonos? de|telefonos? de)\b/i;

export function normalizeDirectoryText(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\b(no|num|numero)\b/g, " ")
    .replace(/\b0+(\d)\b/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
}

function phoneFromMetadata(metadata: Record<string, unknown> | null | undefined) {
  const phone = typeof metadata?.telefono_directo === "string" ? metadata.telefono_directo.replace(/\D+/g, "") : "";
  return phone || null;
}

function alternativePhonesFromMetadata(metadata: Record<string, unknown> | null | undefined) {
  return Array.isArray(metadata?.telefonos_alternativos)
    ? metadata.telefonos_alternativos
      .map((value) => typeof value === "string" ? value.replace(/\D+/g, "") : "")
      .filter(Boolean)
    : [];
}

function aliasesFromMetadata(metadata: Record<string, unknown> | null | undefined) {
  return Array.isArray(metadata?.aliases)
    ? metadata.aliases.filter((value): value is string => typeof value === "string").map(normalizeDirectoryText)
    : [];
}

function toDirectoryContact(item: KnowledgeBaseItem): DirectoryContact {
  return {
    office: typeof item.metadata?.oficina === "string" ? item.metadata.oficina : item.title,
    phone: phoneFromMetadata(item.metadata),
    alternativePhones: alternativePhonesFromMetadata(item.metadata),
    category: typeof item.metadata?.categoria === "string" ? item.metadata.categoria : item.categoria || "",
    aliases: aliasesFromMetadata(item.metadata),
  };
}

type DirectoryListCategory = Extract<DirectoryIntent, { type: "list" }>["category"];

function categoryMatches(contact: DirectoryContact, category: DirectoryListCategory) {
  const haystack = normalizeDirectoryText(`${contact.office} ${contact.category}`);
  if (category === "habilitecas") return haystack.includes("habiliteca");
  if (category === "nidos") return haystack.includes("nido");
  if (category === "caic") return haystack.includes("caic");
  return haystack.includes("nido") || haystack.includes("caic");
}

function detectDirectoryIntent(message: string): DirectoryIntent {
  const normalized = normalizeDirectoryText(message);
  const asksContact = CONTACT_KEYWORDS.test(message);

  if ((LIST_KEYWORDS.test(message) || asksContact) && /\bhabilitecas?\b/.test(normalized)) {
    return { type: "list", category: "habilitecas" };
  }
  if ((LIST_KEYWORDS.test(message) || asksContact) && /\bnidos?\b/.test(normalized) && /\bcaic\b/.test(normalized)) {
    return { type: "list", category: "nidos_caic" };
  }
  if ((LIST_KEYWORDS.test(message) || asksContact) && /\bnidos?\b/.test(normalized)) {
    return { type: "list", category: "nidos" };
  }
  if ((LIST_KEYWORDS.test(message) || asksContact) && /\bcaic\b/.test(normalized)) {
    return { type: "list", category: "caic" };
  }

  if (!asksContact) return { type: "none" };

  const query = normalized
    .replace(/\b(cual|cu[aá]l|es|el|la|los|las|de|del|para|por|favor|telefono|tel[eé]fono|numero|n[uú]mero|contacto|directo|a donde llamo|donde llamo|llamar|llamo|comunicarme|comunicar)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return { type: "lookup", query: query || normalized };
}

function scoreContact(contact: DirectoryContact, query: string) {
  const normalizedOffice = normalizeDirectoryText(contact.office);
  const normalizedCategory = normalizeDirectoryText(contact.category);
  const aliases = [normalizedOffice, normalizedCategory, ...contact.aliases];
  const queryTerms = query.split(" ").filter((term) => term.length >= 2);

  let score = 0;
  for (const alias of aliases) {
    if (!alias) continue;
    if (alias === query) score += 100;
    if (alias.includes(query)) score += 70;
    if (query.includes(alias) && alias.length >= 4) score += 60;
    const matchedTerms = queryTerms.filter((term) => alias.includes(term)).length;
    score += matchedTerms * 8;
  }

  return score;
}

function formatContact(contact: DirectoryContact) {
  const lines = [`La oficina de ${contact.office} tiene como teléfono directo: ${contact.phone}.`];
  if (contact.alternativePhones.length > 0) {
    lines.push(`Teléfono alternativo: ${contact.alternativePhones.join(", ")}.`);
  }
  return lines.join("\n");
}

function formatList(categoryLabel: string, contacts: DirectoryContact[]) {
  const lines = contacts
    .filter((contact) => contact.phone)
    .slice(0, 30)
    .map((contact, index) => {
      const alternative = contact.alternativePhones.length > 0 ? ` / alternativo ${contact.alternativePhones.join(", ")}` : "";
      return `${index + 1}. ${contact.office} - ${contact.phone}${alternative}`;
    });

  if (lines.length === 0) {
    return `No encontré teléfonos directos actualizados para ${categoryLabel} en el directorio.`;
  }

  return `Estos son los contactos registrados para ${categoryLabel}:\n\n${lines.join("\n")}`;
}

function formatAmbiguous(matches: DirectoryContact[]) {
  const options = matches
    .filter((contact) => contact.phone)
    .slice(0, 8)
    .map((contact, index) => `${index + 1}. ${contact.office} - ${contact.phone}`)
    .join("\n");

  return `Encontré más de una opción relacionada:\n\n${options}\n\n¿A cuál deseas comunicarte?`;
}

export async function buildDirectoryContactResponse(chatbotId: number, message: string): Promise<string | null> {
  const intent = detectDirectoryIntent(message);
  if (intent.type === "none") return null;

  const contacts = (await storage.getKnowledgeBaseItemsByChatbot(chatbotId))
    .filter((item) => item.skill === "directorio_dif_zapopan")
    .map(toDirectoryContact);

  if (contacts.length === 0) return null;

  if (intent.type === "list") {
    const matches = contacts.filter((contact) => categoryMatches(contact, intent.category));
    const label = intent.category === "nidos_caic"
      ? "Nidos y CAIC"
      : intent.category === "caic"
        ? "CAIC"
        : intent.category === "nidos"
          ? "Nidos"
          : "Habilitecas";
    return formatList(label, matches);
  }

  const scored = contacts
    .map((contact) => ({ contact, score: scoreContact(contact, intent.query) }))
    .filter((entry) => entry.score >= 16)
    .sort((a, b) => b.score - a.score);

  if (scored.length === 0) {
    return "No encontré un teléfono directo actualizado para esa oficina en el directorio.";
  }

  const bestScore = scored[0].score;
  const bestMatches = scored.filter((entry) => bestScore - entry.score <= 8).map((entry) => entry.contact);

  if (bestMatches.length > 1) {
    return formatAmbiguous(bestMatches);
  }

  const best = bestMatches[0];
  return best.phone
    ? formatContact(best)
    : `No encontré un teléfono directo actualizado para ${best.office} en el directorio.`;
}
