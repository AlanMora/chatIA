import type { KnowledgeBaseItem } from "@shared/schema";

type MessageLike = {
  role: string;
  content: string;
};

type KnowledgeChunk = {
  itemId: number;
  title: string;
  sourceUrl: string | null;
  index: number;
  content: string;
  normalizedTitle: string;
  normalizedContent: string;
  tokenCounts: Map<string, number>;
};

type RetrievedChunk = KnowledgeChunk & {
  score: number;
};

export type KnowledgeContextResult = {
  context: string;
  totalItems: number;
  totalChunks: number;
  selectedChunks: number;
  contextChars: number;
  strategy: "empty" | "full" | "ranked";
};

const CHUNK_SIZE = 1_400;
const CHUNK_OVERLAP = 220;
const MAX_CONTEXT_CHARS = 24_000;
const MAX_RETRIEVED_CHUNKS = 16;
const MAX_CHUNKS_PER_ITEM = 3;
const FULL_CONTEXT_THRESHOLD = 18_000;
const MAX_CACHE_ENTRIES = 25;
const MIN_RELEVANCE_SCORE = 7;

const STOP_WORDS = new Set([
  "a", "al", "algo", "algun", "alguna", "algunas", "alguno", "algunos", "ante", "antes",
  "aquel", "aquella", "aquellas", "aquello", "aquellos", "asi", "aun", "aunque", "bajo",
  "bien", "cada", "casi", "como", "con", "contra", "cual", "cuales", "cualquier", "cuando",
  "cuanta", "cuantas", "cuanto", "cuantos", "de", "del", "desde", "donde", "dos", "el",
  "ella", "ellas", "ello", "ellos", "en", "entre", "era", "erais", "eran", "eras", "eres",
  "es", "esa", "esas", "ese", "eso", "esos", "esta", "estaba", "estaban", "estado", "estais",
  "estamos", "estan", "estar", "estas", "este", "esto", "estos", "fue", "fueron", "fui",
  "fuimos", "ha", "habia", "hace", "hacia", "han", "hasta", "hay", "incluso", "la", "las",
  "le", "les", "lo", "los", "mas", "me", "mi", "mientras", "mis", "mucha", "muchas", "mucho",
  "muchos", "muy", "nada", "ni", "no", "nos", "nosotras", "nosotros", "nuestra", "nuestras",
  "nuestro", "nuestros", "o", "os", "otra", "otras", "otro", "otros", "para", "pero", "poco",
  "por", "porque", "que", "quien", "quienes", "se", "sea", "segun", "ser", "si", "siempre",
  "sin", "sobre", "sois", "solo", "somos", "son", "soy", "su", "sus", "tal", "tambien",
  "te", "teneis", "tenemos", "tener", "tengo", "ti", "tiene", "tienen", "todo", "todos",
  "tu", "tus", "un", "una", "unas", "uno", "unos", "usted", "ustedes", "ya",
  "about", "after", "all", "also", "an", "and", "any", "are", "as", "at", "be", "been",
  "being", "between", "both", "but", "by", "can", "could", "did", "do", "does", "for",
  "from", "had", "has", "have", "he", "her", "here", "hers", "him", "his", "how", "i",
  "if", "in", "into", "is", "it", "its", "just", "may", "might", "more", "most", "must",
  "my", "need", "not", "of", "on", "only", "or", "our", "ours", "please", "should", "so",
  "some", "than", "that", "the", "their", "theirs", "them", "then", "there", "these", "they",
  "this", "those", "to", "too", "under", "up", "us", "very", "was", "we", "were", "what",
  "when", "where", "which", "who", "why", "will", "with", "would", "you", "your", "yours",
]);

const chunkCache = new Map<string, KnowledgeChunk[]>();

function normalizeSearchText(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizePromptText(text: string): string {
  return text
    .replace(/\r\n/g, "\n")
    .replace(/\u0000/g, "")
    .replace(/[^\S\n]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function tokenize(text: string): string[] {
  return normalizeSearchText(text)
    .split(" ")
    .filter((token) => token.length >= 2 && !STOP_WORDS.has(token));
}

function buildTokenCounts(tokens: string[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const token of tokens) {
    counts.set(token, (counts.get(token) || 0) + 1);
  }
  return counts;
}

function buildCacheKey(items: KnowledgeBaseItem[]): string {
  return items
    .map((item) => {
      const createdAt =
        item.createdAt instanceof Date
          ? item.createdAt.getTime()
          : new Date(item.createdAt).getTime();
      return `${item.id}:${createdAt}:${item.content.length}:${item.title.length}`;
    })
    .join("|");
}

function pruneChunkCache(): void {
  while (chunkCache.size > MAX_CACHE_ENTRIES) {
    const oldestKey = chunkCache.keys().next().value;
    if (!oldestKey) {
      return;
    }
    chunkCache.delete(oldestKey);
  }
}

function splitIntoChunks(text: string): string[] {
  const normalized = normalizePromptText(text);
  if (!normalized) {
    return [];
  }

  const chunks: string[] = [];
  let start = 0;

  while (start < normalized.length) {
    let end = Math.min(start + CHUNK_SIZE, normalized.length);

    if (end < normalized.length) {
      const windowStart = start + Math.floor(CHUNK_SIZE * 0.55);
      const sentenceBreak = normalized.lastIndexOf(". ", end);
      const newlineBreak = normalized.lastIndexOf("\n", end);
      const breakPoint = Math.max(sentenceBreak, newlineBreak);
      if (breakPoint >= windowStart) {
        end = breakPoint + 1;
      }
    }

    const chunk = normalized.slice(start, end).trim();
    if (chunk) {
      chunks.push(chunk);
    }

    if (end >= normalized.length) {
      break;
    }

    start = Math.max(end - CHUNK_OVERLAP, start + 1);
  }

  return chunks;
}

function buildChunks(items: KnowledgeBaseItem[]): KnowledgeChunk[] {
  const cacheKey = buildCacheKey(items);
  const cached = chunkCache.get(cacheKey);
  if (cached) {
    chunkCache.delete(cacheKey);
    chunkCache.set(cacheKey, cached);
    return cached;
  }

  const chunks = items.flatMap((item) => {
    const title = item.title || "Documento sin titulo";
    const sourceUrl = item.sourceUrl || null;
    const normalizedTitle = normalizeSearchText(title);

    return splitIntoChunks(item.content).map((content, index) => {
      const normalizedContent = normalizeSearchText(content);
      return {
        itemId: item.id,
        title,
        sourceUrl,
        index,
        content,
        normalizedTitle,
        normalizedContent,
        tokenCounts: buildTokenCounts(tokenize(content)),
      };
    });
  });

  chunkCache.set(cacheKey, chunks);
  pruneChunkCache();
  return chunks;
}

function buildRetrievalQuery(messages: MessageLike[]): string {
  const recentUserMessages = messages
    .filter((message) => message.role === "user" && message.content?.trim())
    .slice(-4)
    .map((message) => message.content.trim());

  const query = recentUserMessages.join("\n");
  return query.slice(-2_000);
}

function buildKeyPhrases(tokens: string[]): string[] {
  const phrases: string[] = [];

  for (let size = 3; size >= 2; size--) {
    for (let index = 0; index <= tokens.length - size; index++) {
      const phraseTokens = tokens.slice(index, index + size);
      const phrase = phraseTokens.join(" ");
      if (phrase.length >= 8) {
        phrases.push(phrase);
      }
    }
  }

  return Array.from(new Set(phrases)).slice(0, 8);
}

function scoreChunk(chunk: KnowledgeChunk, query: string, queryTokens: string[]): number {
  if (!queryTokens.length) {
    return 0;
  }

  let score = 0;
  const matchedTokens = new Set<string>();
  const keyPhrases = buildKeyPhrases(queryTokens);
  const normalizedQuery = normalizeSearchText(query);

  for (const token of queryTokens) {
    const titleMatches = chunk.normalizedTitle.includes(token);
    const contentHits = chunk.tokenCounts.get(token) || 0;

    if (titleMatches) {
      score += 9;
      matchedTokens.add(token);
    }

    if (contentHits > 0) {
      score += 6 + Math.min(contentHits, 4) * 2;
      matchedTokens.add(token);
    }
  }

  if (normalizedQuery && normalizedQuery.length >= 18 && chunk.normalizedContent.includes(normalizedQuery)) {
    score += 18;
  }

  for (const phrase of keyPhrases) {
    if (chunk.normalizedTitle.includes(phrase)) {
      score += 12;
    } else if (chunk.normalizedContent.includes(phrase)) {
      score += 8;
    }
  }

  score += matchedTokens.size * 3;

  if (chunk.index === 0 && matchedTokens.size > 0) {
    score += 2;
  }

  return score;
}

function selectRelevantChunks(chunks: KnowledgeChunk[], query: string): RetrievedChunk[] {
  const queryTokens = tokenize(query);
  const ranked = chunks
    .map((chunk) => ({
      ...chunk,
      score: scoreChunk(chunk, query, queryTokens),
    }))
    .filter((chunk) => chunk.score > 0)
    .sort((left, right) => right.score - left.score);

  if (ranked.length === 0) {
    return [];
  }

  const selected: RetrievedChunk[] = [];
  const perItemCount = new Map<number, number>();
  let totalChars = 0;

  for (const chunk of ranked) {
    if (chunk.score < MIN_RELEVANCE_SCORE && selected.length > 0) {
      break;
    }

    const currentItemCount = perItemCount.get(chunk.itemId) || 0;
    if (currentItemCount >= MAX_CHUNKS_PER_ITEM) {
      continue;
    }

    const blockLength = chunk.content.length + chunk.title.length + 64;
    if (selected.length > 0 && totalChars + blockLength > MAX_CONTEXT_CHARS) {
      continue;
    }

    selected.push(chunk);
    perItemCount.set(chunk.itemId, currentItemCount + 1);
    totalChars += blockLength;

    if (selected.length >= MAX_RETRIEVED_CHUNKS || totalChars >= MAX_CONTEXT_CHARS) {
      break;
    }
  }

  if (selected.length === 0 && ranked[0].score > 0) {
    return [ranked[0]];
  }

  return selected;
}

function formatAllItems(items: KnowledgeBaseItem[]): string {
  const body = items
    .map((item) => `### ${item.title}\n${normalizePromptText(item.content)}`)
    .join("\n\n---\n\n");

  return `

=== INSTRUCCIONES CRITICAS - DEBES SEGUIRLAS SIEMPRE ===

1. SOLO puedes responder usando la informacion de la BASE DE CONOCIMIENTO que aparece abajo.
2. Si la pregunta NO puede ser respondida con la informacion de la base de conocimiento, DEBES responder EXACTAMENTE: "Lo siento, no tengo información sobre eso en mi base de conocimiento. Solo puedo ayudarte con los temas que tengo documentados."
3. NUNCA inventes, supongas o uses informacion externa que no este en la base de conocimiento.
4. Si el usuario insiste en un tema que no esta en tu base de conocimiento, repite amablemente que no puedes ayudar con eso.
5. Si encuentras la respuesta en la base de conocimiento, responde de forma clara y directa.

=== BASE DE CONOCIMIENTO - ESTA ES TU UNICA FUENTE DE INFORMACION ===
${body}
=== FIN DE BASE DE CONOCIMIENTO ===

RECUERDA: Si no esta arriba, NO lo sabes. Responde que no tienes esa informacion.`;
}

function formatRankedContext(retrievedChunks: RetrievedChunk[]): string {
  const body = retrievedChunks.length
    ? retrievedChunks
        .map(
          (chunk) =>
            `### ${chunk.title} (fragmento ${chunk.index + 1})\n${chunk.content}`,
        )
        .join("\n\n---\n\n")
    : "No se encontraron fragmentos suficientemente relevantes para esta pregunta dentro de la base de conocimiento.";

  return `

=== INSTRUCCIONES CRITICAS - DEBES SEGUIRLAS SIEMPRE ===

1. SOLO puedes responder usando los FRAGMENTOS RELEVANTES de la base de conocimiento que aparecen abajo.
2. Si la pregunta NO puede ser respondida con esos fragmentos, DEBES responder EXACTAMENTE: "Lo siento, no tengo información sobre eso en mi base de conocimiento. Solo puedo ayudarte con los temas que tengo documentados."
3. NUNCA inventes, supongas o uses informacion externa que no aparezca en los fragmentos recuperados.
4. Si hay varias fuentes relevantes, combina la respuesta solo con lo que si este respaldado por esos fragmentos.
5. Si el usuario pide algo fuera del material recuperado, responde con la frase exacta indicada arriba.

=== FRAGMENTOS RELEVANTES DE LA BASE DE CONOCIMIENTO ===
${body}
=== FIN DE FRAGMENTOS RELEVANTES ===

RECUERDA: Si no esta en los fragmentos mostrados arriba, NO lo sabes.`;
}

export function buildKnowledgeContext(
  knowledgeItems: KnowledgeBaseItem[],
  messages: MessageLike[],
): KnowledgeContextResult {
  if (knowledgeItems.length === 0) {
    return {
      context: "",
      totalItems: 0,
      totalChunks: 0,
      selectedChunks: 0,
      contextChars: 0,
      strategy: "empty",
    };
  }

  const totalChars = knowledgeItems.reduce((sum, item) => sum + item.content.length, 0);

  if (totalChars <= FULL_CONTEXT_THRESHOLD) {
    const context = formatAllItems(knowledgeItems);
    return {
      context,
      totalItems: knowledgeItems.length,
      totalChunks: knowledgeItems.length,
      selectedChunks: knowledgeItems.length,
      contextChars: context.length,
      strategy: "full",
    };
  }

  const chunks = buildChunks(knowledgeItems);
  const query = buildRetrievalQuery(messages);
  const selectedChunks = selectRelevantChunks(chunks, query);
  const context = formatRankedContext(selectedChunks);

  return {
    context,
    totalItems: knowledgeItems.length,
    totalChunks: chunks.length,
    selectedChunks: selectedChunks.length,
    contextChars: context.length,
    strategy: "ranked",
  };
}
