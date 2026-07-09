import type { KnowledgeBaseItem, KnowledgeBaseChunk } from "@shared/schema";
import OpenAI from "openai";
import { storage } from "./storage";
import { GoogleGenAI } from "@google/genai";
import {
  classifyConversationIntent,
  getActiveServiceName,
  getRequestedSectionLabel,
  mentionsSpecificServiceTopic,
} from "./conversation-policy";

type MessageLike = {
  role: string;
  content: string;
};

type RetrievedChunk = KnowledgeBaseChunk & {
  sourceTitle: string;
  sourceUrl: string | null;
  skill: string | null;
  tipoDocumento: string | null;
  categoria: string | null;
  metadata: Record<string, unknown> | null;
};

export type KnowledgeContextResult = {
  context: string;
  strategy: "empty" | "full" | "vector";
  chunksFound?: number;
  sources?: string[];
  sourceUrls?: string[];
};

const CHUNK_SIZE = 1000;
const CHUNK_OVERLAP = 200;
const MAX_CONCURRENCY = 5;
const VECTOR_DIMENSIONS = 1536;

function normalizeForMatch(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function normalizeGoogleMapsUrl(value: string): string {
  return value.replace(
    /https:\/\/www\.google\.com\/maps\/search\/\?api=1(?:&amp;|&)?query=(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/gi,
    "https://www.google.com/maps/search/$1,$2",
  );
}

function getRetrievalState(messages: MessageLike[]): {
  query: string | null;
  activeService: string | null;
  shouldPreferActiveService: boolean;
  preferredSkills: string[];
} {
  const lastUserMessage = [...messages].reverse().find(m => m.role === "user")?.content;
  if (!lastUserMessage) {
    return { query: null, activeService: null, shouldPreferActiveService: false, preferredSkills: [] };
  }

  const activeService = getActiveServiceName(messages);
  const intent = classifyConversationIntent(lastUserMessage, messages);
  const requestedSection = getRequestedSectionLabel(lastUserMessage, messages);
  const mentionsDifferentService = Boolean(activeService && mentionsSpecificServiceTopic(lastUserMessage) && !normalizeForMatch(lastUserMessage).includes(normalizeForMatch(activeService)));
  const shouldPreferActiveService = Boolean(
    activeService &&
    !mentionsDifferentService &&
    (intent === "section_request" || intent === "complete_record"),
  );
  const preferredSkills = getPreferredSkills(lastUserMessage);

  if (activeService && shouldPreferActiveService) {
    return {
      query: expandFaqRetrievalQuery(`${activeService} ${requestedSection || lastUserMessage}`),
      activeService,
      shouldPreferActiveService,
      preferredSkills,
    };
  }

  return { query: expandFaqRetrievalQuery(lastUserMessage), activeService, shouldPreferActiveService, preferredSkills };
}

function getPreferredSkills(query: string): string[] {
  const normalized = normalizeForMatch(query);
  const skills: string[] = [];

  if (/\b(violencia|riesgo|emergencia|maltrato|abandono|crisis|victima|victima|abuso|golpea|golpes)\b/.test(normalized)) {
    skills.push("protocolos_orientacion_riesgo");
  }

  if (/\b(quien eres|quien es sofia|que puedes hacer|como funcionas|dif zapopan|contacto general|sede principal|correo)\b/.test(normalized)) {
    skills.push("institucional_sofia");
  }

  if (/\b(direccion|telefono|horario|mapa|ubicacion|ubicado|donde esta|donde queda|centro|nido|habiliteca|cemam|caic|ludoteca|cercana|cercano)\b/.test(normalized)) {
    skills.push("ubicaciones_institucionales");
  }

  if (/\b(tramite|servicio|requisito|documentacion|documentos|costo|cuanto cuesta|constancia|solicitud|registro|cita|adopcion|adoptar|pension|alimenticia|despensa|despenda)\b/.test(normalized)) {
    skills.push("tramites_servicios_dif_zapopan");
  }

  if (/\b(programa|apoyo|beneficio|poblacion|personas mayores|adultos mayores|ninas|ninos|adolescentes|alimentario|alimentaria|despensa|despenda|taller)\b/.test(normalized)) {
    skills.push("programas_servicios_dif_zapopan");
  }

  if (/\b(pregunta|duda|informacion|informes|quiero|necesito|tienen|hay|donde|como|cual|cuanto|telefono|registr|inscrib|cita|apunt)\b/.test(normalized)) {
    skills.push("faq_dif_zapopan");
  }

  return Array.from(new Set(skills));
}

function expandFaqRetrievalQuery(query: string): string {
  const normalized = normalizeForMatch(query);
  const expansions: string[] = [];

  if (/\b(curso|cursos|taller|talleres|clase|clases)\b/.test(normalized) && /\b(cerca|colonia|ubicacion|donde|inscribir|meterme)\b/.test(normalized)) {
    expansions.push("Habilitecas talleres cursos ubicaciones oferta de cursos");
  }

  if (/\b(despensa|despensas|despenda|despendas|alimentaria|alimentario|alimentos|comida|viveres|canasta)\b/.test(normalized)) {
    expansions.push("Programa de Ayuda Alimentaria Directa despensas apoyo alimentario costo requisitos");
    expansions.push("Programa de Atencion Alimentaria a Personas en Situacion de Vulnerabilidad despensas");
  }

  if (/\b(pension|manutencion|alimentos|alimenticia|papa de mis hijos|padre de mis hijos|no me ayuda)\b/.test(normalized)) {
    expansions.push("pension alimenticia asesoria juridica Procuraduria Social alimentos");
  }

  if (/\b(adopcion|adoptar|adoptiva|adoptivo|acogida|familia temporal|familias de amor)\b/.test(normalized)) {
    expansions.push("adopciones acogida familia adoptiva certificacion de familia adoptiva curso inicial");
  }

  if (/\b(madre soltera|mama soltera|madres solteras|discapacidad|persona con discapacidad|apoyo social|trabajo social)\b/.test(normalized)) {
    expansions.push("Centro de Trabajo Social apoyos orientacion social personas con discapacidad madres solteras");
  }

  if (/\b(guarderia|guarderias|estancia|cuidado infantil|centro infantil|desarrollo infantil)\b/.test(normalized)) {
    expansions.push("Nidos centros de desarrollo infantil guardería niñas niños");
  }

  if (/\b(prepa|preparatoria|bachillerato|estudiar|terminar|acabar)\b/.test(normalized)) {
    expansions.push("Prepa Abierta preparatoria Habilitecas validez oficial costos");
  }

  if (/\b(voluntades|tarjeta)\b/.test(normalized)) {
    expansions.push("Tarjeta Voluntades registro requisitos documentos Habiliteca");
  }

  if (/\b(servicio social|practicas|liberar|estudiante|escuela)\b/.test(normalized)) {
    expansions.push("Servicio social Capital Humano requisitos oficio escuela");
  }

  if (/\b(extraviar|extraviarse|perderse|desorient|qr|geolocalizacion|geolocalizar|volver a casa|vuelve a casa)\b/.test(normalized)) {
    expansions.push("Vuelve a Casa código QR geolocalización registro requisitos");
  }

  return expansions.length > 0 ? `${query}\n${expansions.join("\n")}` : query;
}

function filterChunksByActiveService(chunks: RetrievedChunk[], activeService: string | null): RetrievedChunk[] {
  if (!activeService) return chunks;

  const normalizedService = normalizeForMatch(activeService);
  const serviceTerms = normalizedService
    .split(" ")
    .filter((term) => term.length >= 4);

  if (serviceTerms.length === 0) return chunks;

  const matched = chunks.filter((chunk) => {
    const haystack = normalizeForMatch(`${chunk.sourceTitle} ${chunk.content}`);
    return haystack.includes(normalizedService) || serviceTerms.every((term) => haystack.includes(term));
  });

  return matched.length > 0 ? matched : chunks;
}

function rankChunksByPreferredSkills(chunks: RetrievedChunk[], preferredSkills: string[]): RetrievedChunk[] {
  if (preferredSkills.length === 0) return chunks;

  return [...chunks].sort((a, b) => {
    const aIndex = a.skill ? preferredSkills.indexOf(a.skill) : -1;
    const bIndex = b.skill ? preferredSkills.indexOf(b.skill) : -1;
    const aScore = aIndex === -1 ? Number.MAX_SAFE_INTEGER : aIndex;
    const bScore = bIndex === -1 ? Number.MAX_SAFE_INTEGER : bIndex;
    return aScore - bScore;
  });
}

function filterChunksByQueryEntity(chunks: RetrievedChunk[], query: string): RetrievedChunk[] {
  const normalized = normalizeForMatch(query);
  const entityTerms: string[] = [];

  if (/\bhabilitecas?\b/.test(normalized)) entityTerms.push("habiliteca");
  if (/\bprepa\b|\bpreparatoria\b|\bbachillerato\b|\bacabar\b|\bterminar\b/.test(normalized)) entityTerms.push("prepa");
  if (/\bplaticas prematrimoniales\b|\bprematrimoniales\b/.test(normalized)) entityTerms.push("prematrimonial");
  if (/\bautismo\b/.test(normalized)) entityTerms.push("autismo");
  if (/\binapam\b/.test(normalized)) entityTerms.push("inapam");
  if (/\bcemam\b/.test(normalized)) entityTerms.push("cemam");
  if (/\bcaic\b/.test(normalized)) entityTerms.push("caic");
  if (/\bnido\b/.test(normalized)) entityTerms.push("nido");
  if (/\b(despensa|despensas|despenda|despendas|alimentaria|alimentario|alimentos|viveres|canasta)\b/.test(normalized)) entityTerms.push("alimentaria");
  if (/\b(pension|manutencion|alimenticia|papa de mis hijos|padre de mis hijos)\b/.test(normalized)) entityTerms.push("pension");
  if (/\b(adopcion|adoptar|adoptiva|adoptivo|acogida|familias de amor)\b/.test(normalized)) entityTerms.push("adop");
  if (/\b(madre soltera|mama soltera|madres solteras|apoyo social|trabajo social)\b/.test(normalized)) entityTerms.push("trabajo social");
  if (/\bservicio social\b|\bliberar\b|\bestudiante\b|\bescuela\b/.test(normalized)) entityTerms.push("servicio social");
  if (/\bvuelve a casa\b|\bextraviar\b|\bextraviarse\b|\bdesorient\b|\bqr\b|\bgeolocalizacion\b/.test(normalized)) entityTerms.push("vuelve a casa");
  if (/\bvoluntades\b|\btarjeta\b/.test(normalized)) entityTerms.push("voluntades");

  if (entityTerms.length === 0) return chunks;

  const matched = chunks.filter((chunk) => {
    const haystack = normalizeForMatch(`${chunk.sourceTitle} ${chunk.content} ${JSON.stringify(chunk.metadata || {})}`);
    return entityTerms.some((term) => haystack.includes(term));
  });

  return matched.length > 0 ? matched : chunks;
}

async function getLexicalKnowledgeMatches(chatbotId: number, query: string): Promise<RetrievedChunk[]> {
  const normalized = normalizeForMatch(query);
  const aliases: string[] = [];

  if (/\b(curso|cursos|taller|talleres|clase|clases)\b/.test(normalized) && /\b(cerca|colonia|ubicacion|donde|inscribir|meterme)\b/.test(normalized)) aliases.push("habilitecas");
  if (/\b(despensa|despensas|despenda|despendas|alimentaria|alimentario|alimentos|comida|viveres|canasta)\b/.test(normalized)) aliases.push("ayuda alimentaria", "asistencia alimentaria", "alimentaria directa", "despensa");
  if (/\b(pension|manutencion|alimenticia|papa de mis hijos|padre de mis hijos|no me ayuda)\b/.test(normalized)) aliases.push("pension alimenticia", "procuraduria social");
  if (/\b(adopcion|adoptar|adoptiva|adoptivo|acogida|familia temporal|familias de amor)\b/.test(normalized)) aliases.push("adopciones", "familia adoptiva", "certificacion de familia adoptiva", "acogida");
  if (/\b(madre soltera|mama soltera|madres solteras|discapacidad|persona con discapacidad|apoyo social|trabajo social)\b/.test(normalized)) aliases.push("trabajo social", "discapacidad", "apoyo social");
  if (/\b(guarderia|guarderias|estancia|cuidado infantil|centro infantil|desarrollo infantil)\b/.test(normalized)) aliases.push("nidos");
  if (/\b(prepa|preparatoria|bachillerato|estudiar|terminar|acabar)\b/.test(normalized)) aliases.push("preparatorias", "prepa abierta");
  if (/\b(voluntades|tarjeta)\b/.test(normalized)) aliases.push("tarjeta voluntades");
  if (/\b(servicio social|practicas|liberar|estudiante|escuela)\b/.test(normalized)) aliases.push("servicio social");
  if (/\b(extraviar|extraviarse|perderse|desorient|qr|geolocalizacion|geolocalizar|volver a casa|vuelve a casa)\b/.test(normalized)) aliases.push("vuelve a casa");

  if (aliases.length === 0) return [];

  const items = await storage.getKnowledgeBaseItemsByChatbot(chatbotId);
  return items
    .filter((item) => {
      const haystack = normalizeForMatch(`${item.title} ${item.content} ${JSON.stringify(item.metadata || {})}`);
      return aliases.some((alias) => haystack.includes(normalizeForMatch(alias)));
    })
    .slice(0, 6)
    .map((item, index) => ({
      id: -item.id,
      itemId: item.id,
      chatbotId: item.chatbotId,
      content: item.content,
      embedding: [],
      index,
      createdAt: item.createdAt,
      sourceTitle: item.title,
      sourceUrl: item.sourceUrl,
      skill: item.skill,
      tipoDocumento: item.tipoDocumento,
      categoria: item.categoria,
      metadata: item.metadata,
    }) as RetrievedChunk);
}

function sourceUrlFromChunk(chunk: RetrievedChunk): string | null {
  const metadataUrl = chunk.metadata?.source_url;
  const url = typeof metadataUrl === "string" && metadataUrl.trim()
    ? metadataUrl
    : chunk.sourceUrl;
  return url ? normalizeGoogleMapsUrl(url) : null;
}

function normalizeEmbedding(values: number[]): number[] {
  if (values.length < VECTOR_DIMENSIONS) {
    return [...values, ...new Array(VECTOR_DIMENSIONS - values.length).fill(0)];
  }
  return values.slice(0, VECTOR_DIMENSIONS);
}

function getOllamaEmbeddingConfig(chatbot?: any) {
  const baseUrl = (chatbot?.embeddingBaseUrl || process.env.OLLAMA_EMBEDDING_BASE_URL)?.replace(/\/$/, "");
  const model = chatbot?.embeddingModel || process.env.OLLAMA_EMBEDDING_MODEL || "nomic-embed-text";

  if (!baseUrl) return null;

  return { baseUrl, model };
}

function getEmbeddingProvider(chatbot: any): "openai" | "ollama" | "chatbot" {
  const chatbotProvider = chatbot.embeddingProvider?.toLowerCase();
  if (chatbotProvider === "openai" || chatbotProvider === "ollama" || chatbotProvider === "chatbot") {
    return chatbotProvider;
  }

  const configuredProvider = process.env.EMBEDDING_PROVIDER?.toLowerCase();
  if (configuredProvider === "openai" || configuredProvider === "ollama" || configuredProvider === "chatbot") {
    return configuredProvider;
  }

  if (process.env.OLLAMA_EMBEDDING_BASE_URL) return "ollama";
  if (process.env.OPENAI_EMBEDDING_API_KEY || process.env.AI_INTEGRATIONS_OPENAI_API_KEY || chatbot.openaiApiKey) return "openai";
  return "chatbot";
}

async function generateOllamaEmbedding(text: string, chatbot?: any): Promise<number[]> {
  const config = getOllamaEmbeddingConfig(chatbot);
  if (!config) {
    throw new Error("OLLAMA_EMBEDDING_BASE_URL is not configured");
  }

  const embedResponse = await fetch(`${config.baseUrl}/api/embed`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: config.model,
      input: text,
    }),
  });

  if (embedResponse.ok) {
    const data = await embedResponse.json();
    const values = Array.isArray(data.embeddings?.[0]) ? data.embeddings[0] : data.embedding;
    if (Array.isArray(values)) return normalizeEmbedding(values);
    throw new Error("Invalid Ollama /api/embed response format");
  }

  // Older Ollama versions expose /api/embeddings with a single prompt.
  const legacyResponse = await fetch(`${config.baseUrl}/api/embeddings`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: config.model,
      prompt: text,
    }),
  });

  if (!legacyResponse.ok) {
    const err = await legacyResponse.text();
    throw new Error(`Ollama embedding API error (${legacyResponse.status}): ${err}`);
  }

  const data = await legacyResponse.json();
  if (!Array.isArray(data.embedding)) {
    throw new Error("Invalid Ollama /api/embeddings response format");
  }

  return normalizeEmbedding(data.embedding);
}

async function generateOpenAIEmbedding(text: string, chatbot: any): Promise<number[]> {
  const apiKey =
    process.env.OPENAI_EMBEDDING_API_KEY ||
    chatbot.openaiApiKey ||
    process.env.AI_INTEGRATIONS_OPENAI_API_KEY;

  if (!apiKey || apiKey === "Missing Key") {
    throw new Error("Missing OpenAI API Key for embeddings");
  }

  const openaiInstance = new OpenAI({
    apiKey,
    baseURL: process.env.OPENAI_EMBEDDING_BASE_URL || process.env.AI_INTEGRATIONS_OPENAI_BASE_URL || undefined,
  });

  const model = chatbot.embeddingModel || process.env.OPENAI_EMBEDDING_MODEL || "text-embedding-3-small";
  const dimensions = parseInt(
    `${chatbot.embeddingDimensions || process.env.OPENAI_EMBEDDING_DIMENSIONS || VECTOR_DIMENSIONS}`,
    10,
  );

  const response = await openaiInstance.embeddings.create({
    model,
    input: text,
    dimensions: Number.isFinite(dimensions) ? dimensions : VECTOR_DIMENSIONS,
  });

  return normalizeEmbedding(response.data[0].embedding);
}

/**
 * Generates an embedding based on the chatbot's provider
 */
async function generateEmbedding(text: string, chatbot: any): Promise<number[]> {
  const provider = chatbot.aiProvider || "openai";
  const textToEmbed = text.replace(/\n/g, " ");
  const embeddingProvider = getEmbeddingProvider(chatbot);

  if (embeddingProvider === "openai") {
    const model = chatbot.embeddingModel || process.env.OPENAI_EMBEDDING_MODEL || "text-embedding-3-small";
    console.log(`[RAG] Generating embedding for chatbot ${chatbot.id} using OpenAI model: ${model}`);
    return generateOpenAIEmbedding(textToEmbed, chatbot);
  }

  if (embeddingProvider === "ollama") {
    const ollamaConfig = getOllamaEmbeddingConfig(chatbot);
    if (!ollamaConfig) throw new Error("OLLAMA_EMBEDDING_BASE_URL is not configured");
    console.log(`[RAG] Generating embedding for chatbot ${chatbot.id} using Ollama model: ${ollamaConfig.model}`);
    return generateOllamaEmbedding(textToEmbed, chatbot);
  }

  console.log(`[RAG] Generating embedding for chatbot ${chatbot.id} using provider: ${provider}`);

  try {
    if (provider === "gemini") {
      const apiKey = chatbot.geminiApiKey || process.env.AI_INTEGRATIONS_GEMINI_API_KEY;
      if (!apiKey) throw new Error("Missing Gemini API Key");
      
      const genAI = new GoogleGenAI({ apiKey });
      const result = await genAI.models.embedContent({
        model: "text-embedding-004",
        contents: [textToEmbed],
        config: { outputDimensionality: VECTOR_DIMENSIONS },
      });
      const values = result.embeddings?.[0]?.values;
      if (!values) throw new Error("Invalid Gemini embedding response format");
      return normalizeEmbedding(values);

    } else if (provider === "custom" || provider === "openrouter") {
      const baseURL = provider === "openrouter" 
        ? "https://openrouter.ai/api/v1" 
        : chatbot.customEndpoint?.replace(/\/chat\/completions\/?$/, "") || "";
      
      const apiKey = provider === "openrouter"
        ? process.env.OPENROUTER_API_KEY
        : chatbot.customApiKey || "not-required";

      console.log(`[RAG] Custom/OpenRouter request to: ${baseURL}/embeddings`);

      const response = await fetch(`${baseURL}/embeddings`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: provider === "openrouter" ? "openai/text-embedding-3-small" : chatbot.customModelName || "default",
          input: textToEmbed,
        }),
      });

      if (!response.ok) {
        const err = await response.text();
        throw new Error(`Embedding API error (${response.status}): ${err}`);
      }

      const data = await response.json();
      if (!data.data || !data.data[0] || !data.data[0].embedding) {
        throw new Error("Invalid embedding response format");
      }
      const values = data.data[0].embedding;
      return normalizeEmbedding(values);

    } else {
      // Default: OpenAI
      const apiKey = chatbot.openaiApiKey || process.env.AI_INTEGRATIONS_OPENAI_API_KEY;
      
      if (!apiKey || apiKey === "Missing Key") {
        console.error("[RAG] Error: No OpenAI API Key found for chatbot or in ENV");
        throw new Error("Missing OpenAI API Key");
      }

      const openaiInstance = new OpenAI({
        apiKey: apiKey,
        baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL || "https://api.openai.com/v1",
      });

      const response = await openaiInstance.embeddings.create({
        model: "text-embedding-3-small",
        input: textToEmbed,
      });
      return response.data[0].embedding;
    }
  } catch (error) {
    console.error(`[RAG] Error generating embedding (${provider}):`, error);
    throw error;
  }
}

/**
 * Splits text into chunks for embedding
 */
function splitIntoChunks(text: string): string[] {
  const chunks: string[] = [];
  let start = 0;

  while (start < text.length) {
    let end = Math.min(start + CHUNK_SIZE, text.length);
    
    if (end < text.length) {
      const periodIndex = text.lastIndexOf(". ", end);
      const newlineIndex = text.lastIndexOf("\n", end);
      const breakPoint = Math.max(periodIndex, newlineIndex);
      
      if (breakPoint > start + (CHUNK_SIZE * 0.5)) {
        end = breakPoint + 1;
      }
    }

    chunks.push(text.slice(start, end).trim());
    start = end - CHUNK_OVERLAP;
    if (start >= text.length - CHUNK_OVERLAP) break;
  }

  return chunks.filter(c => c.length > 0);
}

/**
 * Processes a knowledge base item: chunks it and stores embeddings
 */
export async function processKnowledgeItem(item: KnowledgeBaseItem): Promise<void> {
  const chatbot = await storage.getChatbot(item.chatbotId!);
  if (!chatbot) throw new Error("Chatbot not found");

  console.log(`[RAG] Processing item ${item.id} for chatbot ${chatbot.id} (${chatbot.name})`);

  const chunks = splitIntoChunks(item.content);
  const chunksWithEmbeddings: any[] = [];
  
  for (let i = 0; i < chunks.length; i++) {
    const content = chunks[i];
    try {
      const embedding = await generateEmbedding(content, chatbot);
      chunksWithEmbeddings.push({
        itemId: item.id,
        chatbotId: item.chatbotId!,
        content,
        embedding,
        index: i,
      });
    } catch (err) {
      console.error(`[RAG] Failed to process chunk ${i} of item ${item.id}:`, err);
      throw err;
    }
  }

  // Delete old chunks if any (re-processing)
  await storage.deleteKnowledgeBaseChunksByItem(item.id);
  
  // Batch insert new chunks
  if (chunksWithEmbeddings.length > 0) {
    await storage.createKnowledgeBaseChunks(chunksWithEmbeddings);
    console.log(`[RAG] Successfully stored ${chunksWithEmbeddings.length} chunks for item ${item.id}`);
  }
}

/**
 * Builds context for a chat message using Vector Search
 */
export async function buildKnowledgeContext(
  chatbotId: number,
  messages: MessageLike[]
): Promise<KnowledgeContextResult> {
  const chatbot = await storage.getChatbot(chatbotId);
  if (!chatbot) return { context: "", strategy: "empty" };

  const retrievalState = getRetrievalState(messages);
  const retrievalQuery = retrievalState.query;
  
  if (!retrievalQuery) {
    return { context: "", strategy: "empty" };
  }

  try {
    const queryEmbedding = await generateEmbedding(retrievalQuery, chatbot);
    const chunkLimit = retrievalState.shouldPreferActiveService || retrievalState.preferredSkills.length > 0 ? 30 : 8;
    const retrievedChunks = await storage.searchSimilarChunks(chatbotId, queryEmbedding, chunkLimit);
    const lexicalKnowledgeChunks = await getLexicalKnowledgeMatches(chatbotId, retrievalQuery);
    const mergedChunks = [...lexicalKnowledgeChunks, ...retrievedChunks].filter((chunk, index, chunks) => {
      const key = `${chunk.itemId}:${chunk.index}`;
      return chunks.findIndex((candidate) => `${candidate.itemId}:${candidate.index}` === key) === index;
    });
    const activeServiceChunks = filterChunksByActiveService(
      mergedChunks,
      retrievalState.shouldPreferActiveService ? retrievalState.activeService : null,
    );
    const entityChunks = filterChunksByQueryEntity(activeServiceChunks, retrievalQuery);
    const rankedChunks = rankChunksByPreferredSkills(entityChunks, retrievalState.preferredSkills);
    const similarChunks = rankedChunks
      .filter((chunk, index, chunks) => {
        const key = `${chunk.itemId}:${chunk.index}`;
        return chunks.findIndex((candidate) => `${candidate.itemId}:${candidate.index}` === key) === index;
      })
      .slice(0, 7);

    if (similarChunks.length === 0) {
      return { context: "", strategy: "empty" };
    }

    const body = similarChunks
      .map(chunk => {
        const sourceUrl = sourceUrlFromChunk(chunk);
        const metadata = [
          chunk.skill ? `skill=${chunk.skill}` : null,
          chunk.tipoDocumento ? `tipo_documento=${chunk.tipoDocumento}` : null,
          chunk.categoria ? `categoria=${chunk.categoria}` : null,
          sourceUrl ? `source_url=${sourceUrl}` : null,
        ].filter(Boolean).join("; ");
        return `[DOCUMENTO: ${chunk.sourceTitle}${metadata ? ` | ${metadata}` : ""}]: ${normalizeGoogleMapsUrl(chunk.content)}`;
      })
      .join("\n\n---\n\n");

    const sources = Array.from(new Set(similarChunks.map(c => c.sourceTitle)));
    const sourceUrls = Array.from(new Set(similarChunks.map(sourceUrlFromChunk).filter((url): url is string => Boolean(url))));
    console.log(`[RAG] Found information in: ${sources.join(", ")}`);

    const context = `
=== REGLAS DE RESPUESTA ===
1. Usa la informacion de los fragmentos de abajo, pero respeta primero el flujo conversacional del system prompt.
2. Si el usuario pide un listado, una categoria o pregunta "que servicios hay", responde SOLO con nombres de servicios. No incluyas "en que consiste", requisitos, costos, lugares, telefonos ni descripcion.
 3. Si el usuario selecciona un servicio o escribe directamente el nombre de un servicio, muestra el nombre, una descripcion breve basada en los fragmentos y despues el menu de apartados.
 4. Si el usuario pide un apartado especifico, responde SOLO ese apartado.
 5. Solo entrega todos los apartados si el usuario pide "ficha completa", "todos los datos" o "toda la informacion".
6. NO menciones los nombres de los archivos ni pongas citas en tu respuesta final.
 7. Si la informacion no esta abajo, indica que no esta especificada en la informacion disponible.
 8. Mantén un tono profesional, breve y directo. Para apartados usa maximo 5 viñetas breves; para ficha completa usa maximo 3 viñetas por apartado.
 9. Si la consulta es ambigua, pide una aclaración y ofrece opciones breves.
 10. Si la consulta está fuera de trámites, servicios, programas, talleres o apoyos del DIF Zapopan, redirige al portal o dependencia oficial correspondiente.
 11. Si el usuario describe violencia, maltrato, golpes, abuso, abandono, riesgo o emergencia, indica llamar al 911 si hay riesgo inmediato y orienta a servicios de reporte o atención del DIF Zapopan.
12. Si el usuario pide hablar con una persona, ayuda a identificar el tema y ofrece consultar lugar y contacto cuando exista en la base de conocimiento.
13. Para servicio seleccionado usa exactamente este formato y no uses corchetes:
[Nombre del servicio]

En breve: [una frase breve sobre de que trata]

 ¿Qué información quieres conocer?

 1. En qué consiste
 2. A quién va dirigido
 3. Requisitos
4. Costos
5. Horario, vigencia o convocatoria
6. Lugar y contacto
7. Nota importante
8. Ficha completa

14. Si hay servicio activo y el usuario pide costo, requisitos, documentacion, ubicacion, horario, telefono, contacto o ficha completa, usa solamente los fragmentos del servicio activo.
15. No sugieras documentacion si no aparece explicitamente en los fragmentos.
 16. Si el usuario pregunta ubicación o contacto, prioriza dirección, informes_en, informes_telefonos, departamento, horario_atencion y url_principal.
17. Si aparece source_url en el fragmento, puedes mencionar "Fuente: [url]" al final de forma breve.
 18. No mezcles trámites/servicios con programas salvo que el usuario lo pida y ambos fragmentos indiquen relación clara.
 19. Para trámites y servicios, solo responde con registros activos o vigentes. Si no hay fragmentos activos/vigentes del trámite o servicio solicitado, di que no encontraste ese trámite o servicio activo en la información disponible.
 20. Si el usuario pide pasos, proceso, procedimiento o "qué sigue", responde esos pasos solo si aparecen explícitamente como pasos/procedimiento en los fragmentos. Si no aparecen, responde: "No encontré pasos especificados en la información disponible." No conviertas requisitos, ubicación u horarios en pasos.
 21. Usa ortografía institucional con acentos en la respuesta final: "Encontré", "Cuál", "Qué información", "Trámite", "También", "Número", "Acompaño".
22. Si recuperas una pregunta frecuente y también trámites, servicios, programas o ubicaciones sobre el mismo tema, úsalos como información complementaria. Responde primero la intención del usuario con la FAQ cuando sea la fuente más directa, y complementa con requisitos, costos, horarios, ubicación, contacto o enlaces solo si el usuario lo pidió o si ayuda claramente a completar la orientación.
23. No presentes FAQ y trámite/servicio como opciones contradictorias. Si ambos fragmentos coinciden en el tema, intégralos en una respuesta breve y coherente; si difieren en alcance o dependencia responsable, aclara esa diferencia.

=== FRAGMENTOS DE CONOCIMIENTO ===
${body}
=== FIN DE FRAGMENTOS ===
`;

    return { 
      context, 
      strategy: "vector", 
      chunksFound: similarChunks.length,
      sources,
      sourceUrls,
    };
  } catch (error) {
    console.error("[RAG] Error in buildKnowledgeContext:", error);
    return { context: "", strategy: "empty" };
  }
}
