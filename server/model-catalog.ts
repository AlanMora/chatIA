export type ModelProvider = {
  id: string;
  name: string;
  type: "chat" | "embedding" | "both";
  requiresApiKey: boolean;
  supportsCustomBaseUrl: boolean;
};

export type ModelCatalogItem = {
  id: string;
  label: string;
  provider: string;
  type: "chat" | "embedding";
  dimensions?: number;
  isDefault?: boolean;
  notes?: string;
};

export const MODEL_PROVIDERS: ModelProvider[] = [
  {
    id: "openai",
    name: "OpenAI",
    type: "both",
    requiresApiKey: true,
    supportsCustomBaseUrl: false,
  },
  {
    id: "openrouter",
    name: "OpenRouter",
    type: "chat",
    requiresApiKey: true,
    supportsCustomBaseUrl: false,
  },
  {
    id: "gemini",
    name: "Google Gemini",
    type: "chat",
    requiresApiKey: true,
    supportsCustomBaseUrl: false,
  },
  {
    id: "ollama",
    name: "Ollama",
    type: "embedding",
    requiresApiKey: false,
    supportsCustomBaseUrl: true,
  },
  {
    id: "custom",
    name: "Modelo propio compatible con OpenAI",
    type: "chat",
    requiresApiKey: false,
    supportsCustomBaseUrl: true,
  },
  {
    id: "chatbot",
    name: "Proveedor del chatbot",
    type: "embedding",
    requiresApiKey: false,
    supportsCustomBaseUrl: false,
  },
];

export const MODEL_CATALOG: ModelCatalogItem[] = [
  { id: "deepseek/deepseek-r1-0528:free", label: "DeepSeek R1 (Gratis)", provider: "openrouter", type: "chat" },
  { id: "qwen/qwen3-coder:free", label: "Qwen 3 Coder (Gratis)", provider: "openrouter", type: "chat" },
  { id: "moonshotai/kimi-k2:free", label: "Kimi K2 (Gratis)", provider: "openrouter", type: "chat" },
  { id: "google/gemma-3n-e4b-it:free", label: "Gemma 3N E4B (Gratis)", provider: "openrouter", type: "chat" },
  { id: "nvidia/nemotron-nano-9b-v2:free", label: "Nemotron Nano 9B (Gratis)", provider: "openrouter", type: "chat" },
  { id: "openai/gpt-oss-20b:free", label: "GPT OSS 20B (Gratis)", provider: "openrouter", type: "chat" },

  { id: "gpt-5.5", label: "GPT-5.5", provider: "openai", type: "chat", notes: "Validar disponibilidad con la API key de la cuenta." },
  { id: "gpt-5.4", label: "GPT-5.4", provider: "openai", type: "chat", notes: "Validar disponibilidad con la API key de la cuenta." },
  { id: "gpt-5.4-mini", label: "GPT-5.4 Mini (Rapido)", provider: "openai", type: "chat", notes: "Validar disponibilidad con la API key de la cuenta." },
  { id: "gpt-5.3-codex", label: "GPT-5.3 Codex", provider: "openai", type: "chat", notes: "Modelo orientado a codigo; validar disponibilidad." },
  { id: "gpt-5.2", label: "GPT-5.2", provider: "openai", type: "chat", notes: "Validar disponibilidad con la API key de la cuenta." },
  { id: "gpt-5.1", label: "GPT-5.1", provider: "openai", type: "chat" },
  { id: "gpt-5", label: "GPT-5", provider: "openai", type: "chat", isDefault: true },
  { id: "gpt-4o", label: "GPT-4o", provider: "openai", type: "chat" },
  { id: "gpt-4o-mini", label: "GPT-4o Mini (Rapido)", provider: "openai", type: "chat" },

  { id: "gemini-3-pro-preview", label: "Gemini 3 Pro", provider: "gemini", type: "chat" },
  { id: "gemini-3-flash-preview", label: "Gemini 3 Flash", provider: "gemini", type: "chat" },
  { id: "gemini-2.5-pro", label: "Gemini 2.5 Pro", provider: "gemini", type: "chat" },
  { id: "gemini-2.5-flash", label: "Gemini 2.5 Flash (Rapido)", provider: "gemini", type: "chat" },

  { id: "custom", label: "Modelo personalizado (self-hosted)", provider: "custom", type: "chat" },

  { id: "text-embedding-3-small", label: "OpenAI text-embedding-3-small", provider: "openai", type: "embedding", dimensions: 1536, isDefault: true },
  { id: "text-embedding-3-large", label: "OpenAI text-embedding-3-large a 1536 dims", provider: "openai", type: "embedding", dimensions: 1536 },
  { id: "nomic-embed-text", label: "Ollama nomic-embed-text", provider: "ollama", type: "embedding", dimensions: 1536 },
  { id: "all-minilm:l6-v2", label: "Ollama all-minilm:l6-v2", provider: "ollama", type: "embedding", dimensions: 1536 },
];

export function filterModelCatalog(type?: string, provider?: string) {
  return MODEL_CATALOG.filter((model) => {
    if (type && model.type !== type) return false;
    if (provider && model.provider !== provider) return false;
    return true;
  });
}

export function staticProvidersForDb() {
  return MODEL_PROVIDERS.map((provider) => ({
    id: provider.id,
    name: provider.name,
    type: provider.type,
    requiresApiKey: provider.requiresApiKey,
    supportsCustomBaseUrl: provider.supportsCustomBaseUrl,
    isActive: true,
  }));
}

export function staticCatalogForDb(providerId?: string) {
  return MODEL_CATALOG
    .filter((model) => !providerId || model.provider === providerId)
    .map((model) => ({
      modelId: model.id,
      label: model.label,
      providerId: model.provider,
      type: model.type,
      dimensions: model.dimensions || null,
      isDefault: model.isDefault || false,
      isActive: true,
      source: "static",
      notes: model.notes || null,
      refreshedAt: new Date(),
    }));
}

export function providerFromDb(provider: any): ModelProvider {
  return {
    id: provider.id,
    name: provider.name,
    type: provider.type,
    requiresApiKey: Boolean(provider.requiresApiKey),
    supportsCustomBaseUrl: Boolean(provider.supportsCustomBaseUrl),
  };
}

export function modelFromDb(model: any): ModelCatalogItem {
  return {
    id: model.modelId,
    label: model.label,
    provider: model.providerId,
    type: model.type,
    dimensions: model.dimensions || undefined,
    isDefault: Boolean(model.isDefault),
    notes: model.notes || undefined,
  };
}
