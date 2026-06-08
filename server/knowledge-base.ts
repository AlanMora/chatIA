import type { KnowledgeBaseItem, KnowledgeBaseChunk } from "@shared/schema";
import OpenAI from "openai";
import { storage } from "./storage";
import { GoogleGenAI } from "@google/genai";

type MessageLike = {
  role: string;
  content: string;
};

export type KnowledgeContextResult = {
  context: string;
  strategy: "empty" | "full" | "vector";
  chunksFound?: number;
};

const CHUNK_SIZE = 1000;
const CHUNK_OVERLAP = 200;
const MAX_CONCURRENCY = 5;

/**
 * Generates an embedding based on the chatbot's provider
 */
async function generateEmbedding(text: string, chatbot: any): Promise<number[]> {
  const provider = chatbot.aiProvider || "openai";
  const textToEmbed = text.replace(/\n/g, " ");

  console.log(`[RAG] Generating embedding for chatbot ${chatbot.id} using provider: ${provider}`);

  try {
    if (provider === "gemini") {
      const apiKey = chatbot.geminiApiKey || process.env.AI_INTEGRATIONS_GEMINI_API_KEY;
      if (!apiKey) throw new Error("Missing Gemini API Key");
      
      const genAI = new GoogleGenAI(apiKey);
      const model = genAI.getGenerativeModel({ model: "text-embedding-004" });
      const result = await model.embedContent(textToEmbed);
      const values = result.embedding.values;
      
      if (values.length < 1536) {
        return [...values, ...new Array(1536 - values.length).fill(0)];
      }
      return values.slice(0, 1536);

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
      
      if (values.length < 1536) {
        return [...values, ...new Array(1536 - values.length).fill(0)];
      }
      return values.slice(0, 1536);

    } else {
      // Default: OpenAI
      // IMPORTANTE: Priorizamos la llave del chatbot
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
  
  // Procesamiento secuencial controlado para asegurar que cada uno use la llave correcta
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

  const lastUserMessage = [...messages].reverse().find(m => m.role === "user")?.content;
  
  if (!lastUserMessage) {
    return { context: "", strategy: "empty" };
  }

  try {
    const queryEmbedding = await generateEmbedding(lastUserMessage, chatbot);
    const similarChunks = await storage.searchSimilarChunks(chatbotId, queryEmbedding, 5);

    if (similarChunks.length === 0) {
      return { context: "", strategy: "empty" };
    }
// 3. Format the context with Sources
const body = similarChunks
  .map(chunk => `[FUENTE: ${chunk.sourceTitle}]: ${chunk.content}`)
  .join("\n\n---\n\n");

const context = `
=== REGLAS DE ORO DE VERIFICACIÓN ===
1. RESPONDE ÚNICAMENTE usando la información de los fragmentos proporcionados.
2. CITADO OBLIGATORIO: Al final de cada frase o párrafo que use información del conocimiento, DEBES poner la fuente entre corchetes, por ejemplo: [Fuente: Manual_Procedimientos.pdf].
3. Si la información NO está en los fragmentos, responde: "Lo siento, esa información no se encuentra en mis documentos oficiales."
4. PROHIBIDO: No uses conocimiento general, no inventes datos, no supongas nada que no esté escrito abajo.

=== FRAGMENTOS DE CONOCIMIENTO (FUENTES OFICIALES) ===
${body}
=== FIN DE FRAGMENTOS ===
`;


    return { 
      context, 
      strategy: "vector", 
      chunksFound: similarChunks.length 
    };
  } catch (error) {
    console.error("[RAG] Error in buildKnowledgeContext:", error);
    return { context: "", strategy: "empty" };
  }
}
