import "dotenv/config";
import fs from "fs";
import path from "path";
import pg from "pg";
import { storage } from "../server/storage";
import { processKnowledgeItem } from "../server/knowledge-base";
import type { InsertKnowledgeBaseItem, KnowledgeBaseItem } from "../shared/schema";

type SofiaJsonlRecord = {
  id: string;
  skill: string;
  tipo_documento: string;
  categoria: string;
  audiencia?: string[];
  titulo: string;
  descripcion_breve?: string | null;
  contenido?: string;
  pageContent?: string;
  apartados?: Record<string, unknown>;
  source?: string | null;
  source_url?: string | null;
  metadata: Record<string, unknown>;
};

const DEFAULT_FILES = [
  "jsonl/integrar/99_sofia_kb_master_completo_depurado.jsonl",
  "jsonl/integrar/sofia_tramites_servicios_2026_06_12_173504.jsonl",
];

const EXPECTED_COUNTS_BY_BASENAME: Record<string, { total: number; skills: Record<string, number> }> = {
  "99_sofia_kb_master_completo_depurado.jsonl": {
    total: 92,
    skills: {
      institucional_sofia: 7,
      protocolos_orientacion_riesgo: 4,
      programas_servicios_dif_zapopan: 38,
      ubicaciones_institucionales: 43,
    },
  },
  "sofia_tramites_servicios_2026_06_12_173504.jsonl": {
    total: 80,
    skills: {
      tramites_servicios_dif_zapopan: 80,
    },
  },
};

function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    chatbotId: 1,
    purge: false,
    backup: false,
    files: DEFAULT_FILES,
  };

  for (const arg of args) {
    if (arg.startsWith("--chatbotId=")) {
      options.chatbotId = Number.parseInt(arg.split("=")[1], 10);
    } else if (arg === "--purge") {
      options.purge = true;
    } else if (arg === "--backup") {
      options.backup = true;
    } else if (arg.startsWith("--file=")) {
      options.files = [arg.split("=")[1]];
    } else if (arg.startsWith("--files=")) {
      const value = arg.split("=")[1];
      options.files = value === "master,tramitesservicios"
        ? DEFAULT_FILES
        : value.split(",").map((item) => item.trim()).filter(Boolean);
    }
  }

  if (!Number.isInteger(options.chatbotId) || options.chatbotId <= 0) {
    throw new Error("--chatbotId debe ser un entero positivo.");
  }

  return options;
}

function readJsonl(filePath: string): SofiaJsonlRecord[] {
  const absolutePath = path.resolve(process.cwd(), filePath);
  if (!absolutePath.includes(`${path.sep}jsonl${path.sep}integrar${path.sep}`)) {
    throw new Error(`Solo se permite importar desde jsonl/integrar: ${filePath}`);
  }
  if (absolutePath.includes(`${path.sep}referencia_no_integrar${path.sep}`)) {
    throw new Error(`No se permite importar referencia_no_integrar: ${filePath}`);
  }
  if (!fs.existsSync(absolutePath)) {
    throw new Error(`No existe el archivo JSONL: ${filePath}`);
  }

  const records: SofiaJsonlRecord[] = [];
  const ids = new Set<string>();
  const skills = new Map<string, number>();
  const lines = fs.readFileSync(absolutePath, "utf8").split(/\r?\n/);

  lines.forEach((line, index) => {
    const trimmed = line.trim();
    if (!trimmed) return;

    let record: SofiaJsonlRecord;
    try {
      record = JSON.parse(trimmed);
    } catch (error) {
      throw new Error(`${filePath}:${index + 1} JSON invalido: ${(error as Error).message}`);
    }

    const missing = ["id", "skill", "tipo_documento", "categoria", "titulo", "metadata"]
      .filter((field) => !(field in record));
    if (missing.length > 0) {
      throw new Error(`${filePath}:${index + 1} faltan campos: ${missing.join(", ")}`);
    }

    const content = record.contenido || record.pageContent;
    if (!record.id || !content) {
      throw new Error(`${filePath}:${index + 1} id/contenido vacio.`);
    }
    if (ids.has(record.id)) {
      throw new Error(`${filePath}:${index + 1} id duplicado: ${record.id}`);
    }

    ids.add(record.id);
    skills.set(record.skill, (skills.get(record.skill) || 0) + 1);
    records.push(record);
  });

  const expected = EXPECTED_COUNTS_BY_BASENAME[path.basename(filePath)];
  if (expected) {
    if (records.length !== expected.total) {
      throw new Error(`${filePath}: esperado ${expected.total} registros, recibido ${records.length}.`);
    }
    for (const [skill, expectedCount] of Object.entries(expected.skills)) {
      const actual = skills.get(skill) || 0;
      if (actual !== expectedCount) {
        throw new Error(`${filePath}: skill ${skill} esperado ${expectedCount}, recibido ${actual}.`);
      }
    }
  }

  return records;
}

function buildContent(record: SofiaJsonlRecord) {
  const content = record.contenido || record.pageContent || "";
  const audience = Array.isArray(record.audiencia) ? record.audiencia.join(", ") : "";
  const metadata = JSON.stringify(record.metadata || {});
  const apartados = record.apartados ? JSON.stringify(record.apartados) : "";

  return [
    `Skill: ${record.skill}`,
    `Tipo de documento: ${record.tipo_documento}`,
    `Categoria: ${record.categoria}`,
    audience ? `Audiencia: ${audience}` : null,
    `Titulo: ${record.titulo}`,
    record.descripcion_breve ? `Descripcion breve: ${record.descripcion_breve}` : null,
    content,
    apartados ? `Apartados estructurados: ${apartados}` : null,
    `Metadata: ${metadata}`,
  ].filter(Boolean).join("\n");
}

function toKnowledgeItem(chatbotId: number, record: SofiaJsonlRecord): InsertKnowledgeBaseItem {
  const metadata = {
    ...(record.metadata || {}),
    descripcion_breve: record.descripcion_breve || null,
    apartados: record.apartados || null,
    jsonl_id: record.id,
  };
  const sourceUrl =
    record.source_url ||
    (typeof record.metadata?.source_url === "string" ? record.metadata.source_url : null);

  return {
    chatbotId,
    externalId: record.id,
    skill: record.skill,
    tipoDocumento: record.tipo_documento,
    categoria: record.categoria,
    audiencia: Array.isArray(record.audiencia) ? record.audiencia : [],
    title: record.titulo,
    content: buildContent(record),
    source: record.source || null,
    sourceType: "jsonl",
    sourceUrl,
    metadata,
    mimeType: "application/jsonl",
  };
}

function stableJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.entries(value as Record<string, unknown>)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, field]) => `${JSON.stringify(key)}:${stableJson(field)}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

function hasKnowledgeItemChanged(existing: KnowledgeBaseItem, payload: InsertKnowledgeBaseItem) {
  return (
    existing.externalId !== payload.externalId ||
    existing.skill !== payload.skill ||
    existing.tipoDocumento !== payload.tipoDocumento ||
    existing.categoria !== payload.categoria ||
    stableJson(existing.audiencia || []) !== stableJson(payload.audiencia || []) ||
    existing.title !== payload.title ||
    existing.content !== payload.content ||
    existing.source !== payload.source ||
    existing.sourceType !== payload.sourceType ||
    existing.sourceUrl !== payload.sourceUrl ||
    stableJson(existing.metadata || {}) !== stableJson(payload.metadata || {})
  );
}

async function backupKnowledgeBase(chatbotId: number) {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL no esta configurado.");

  const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  try {
    const items = await client.query("select * from knowledge_base_items where chatbot_id = $1 order by id", [chatbotId]);
    const chunks = await client.query(
      `select kbc.*
       from knowledge_base_chunks kbc
       join knowledge_base_items kbi on kbi.id = kbc.item_id
       where kbi.chatbot_id = $1
       order by kbc.item_id, kbc.index`,
      [chatbotId],
    );

    const backupDir = path.resolve(process.cwd(), "backups", "knowledge-base");
    fs.mkdirSync(backupDir, { recursive: true });
    const timestamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\..+$/, "").replace("T", "-");
    const backupPath = path.join(backupDir, `chatbot-${chatbotId}-${timestamp}.json`);
    fs.writeFileSync(
      backupPath,
      JSON.stringify({ chatbotId, createdAt: new Date().toISOString(), items: items.rows, chunks: chunks.rows }, null, 2),
      "utf8",
    );
    console.log(`Backup creado: ${backupPath}`);
    return backupPath;
  } finally {
    await client.end();
  }
}

async function main() {
  const options = parseArgs();
  const chatbot = await storage.getChatbot(options.chatbotId);
  if (!chatbot) throw new Error(`No existe chatbotId=${options.chatbotId}.`);

  const records = options.files.flatMap(readJsonl);
  const repeatedIds = records
    .map((record) => record.id)
    .filter((id, index, all) => all.indexOf(id) !== index);
  if (repeatedIds.length > 0) {
    throw new Error(`IDs duplicados entre archivos: ${Array.from(new Set(repeatedIds)).join(", ")}`);
  }

  if (options.backup) {
    await backupKnowledgeBase(options.chatbotId);
  }

  if (options.purge) {
    await storage.deleteKnowledgeBaseItemsByChatbot(options.chatbotId);
    console.log(`KB purgada para chatbotId=${options.chatbotId}.`);
  }

  let created = 0;
  let updated = 0;
  let skipped = 0;

  for (const record of records) {
    const payload = toKnowledgeItem(options.chatbotId, record);
    const existing = await storage.getKnowledgeBaseItemByExternalId(options.chatbotId, record.id);
    if (existing && !hasKnowledgeItemChanged(existing, payload)) {
      skipped += 1;
      continue;
    }
    const item = existing
      ? await storage.updateKnowledgeBaseItem(existing.id, payload)
      : await storage.createKnowledgeBaseItem(payload);
    if (!item) throw new Error(`No se pudo guardar ${record.id}.`);
    await processKnowledgeItem(item);
    existing ? updated += 1 : created += 1;
  }

  console.log(`Importacion completada. Creados=${created}, actualizados=${updated}, omitidos=${skipped}, total=${records.length}.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
