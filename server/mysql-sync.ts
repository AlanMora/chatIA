import crypto from "crypto";
import mysql from "mysql2/promise";
import type { Chatbot, InsertKnowledgeBaseItem, KnowledgeBaseItem } from "@shared/schema";
import { storage } from "./storage";
import { processKnowledgeItem } from "./knowledge-base";

type MysqlTramite = mysql.RowDataPacket & {
  id: number;
  vigente_2026: string | null;
  nombre_direccion: string | null;
  nombre_departamento: string | null;
  tipo_operacion: string | null;
  nombre_programa_servicio: string | null;
  tipo_apoyo: string | null;
  poblacion: string | null;
  documentacion: string | null;
  costo: string | null;
  horario_atencion: string | null;
  convocatoria: string | null;
  informes_en: string | null;
  en_que_consiste: string | null;
  en_que_consiste_ia: string | null;
  requisitos: string | null;
  palabras_clave: string | null;
  todo_que_nesecita_saber_programa: string | null;
  que_necesito: string | null;
  cuando_es: string | null;
  que_tengo_que_hacer: string | null;
  comentarios_observaciones: string | null;
};

export type MysqlSyncResult = {
  sourceRows: number;
  created: number;
  updated: number;
  skipped: number;
  dryRun: boolean;
};

function credentialsKey(): Buffer {
  const secret = process.env.MYSQL_SYNC_ENCRYPTION_KEY;
  if (!secret) throw new Error("MYSQL_SYNC_ENCRYPTION_KEY no está configurada en el servidor.");
  return crypto.createHash("sha256").update(secret).digest();
}

export function encryptMysqlPassword(password: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", credentialsKey(), iv);
  const encrypted = Buffer.concat([cipher.update(password, "utf8"), cipher.final()]);
  return [iv.toString("base64"), cipher.getAuthTag().toString("base64"), encrypted.toString("base64")].join(".");
}

function decryptMysqlPassword(value: string): string {
  const [ivValue, tagValue, encryptedValue] = value.split(".");
  if (!ivValue || !tagValue || !encryptedValue) throw new Error("La contraseña MySQL almacenada no es válida.");
  const decipher = crypto.createDecipheriv("aes-256-gcm", credentialsKey(), Buffer.from(ivValue, "base64"));
  decipher.setAuthTag(Buffer.from(tagValue, "base64"));
  return Buffer.concat([decipher.update(Buffer.from(encryptedValue, "base64")), decipher.final()]).toString("utf8");
}

function requireMysqlConfig(chatbot: Chatbot) {
  if (!chatbot.mysqlHost || !chatbot.mysqlDatabase || !chatbot.mysqlUser || !chatbot.mysqlPasswordEncrypted) {
    throw new Error("Completa host, base de datos, usuario y contraseña de MySQL.");
  }
  return {
    host: chatbot.mysqlHost,
    port: chatbot.mysqlPort || 3306,
    database: chatbot.mysqlDatabase,
    user: chatbot.mysqlUser,
    password: decryptMysqlPassword(chatbot.mysqlPasswordEncrypted),
  };
}

export async function testMysqlConnection(chatbot: Chatbot) {
  const connection = await mysql.createConnection({ ...requireMysqlConfig(chatbot), connectTimeout: 8000 });
  try {
    const [rows] = await connection.query<(mysql.RowDataPacket & { total: number })[]>(
      "SELECT COUNT(*) AS total FROM tramites_y_servicios",
    );
    return { reachable: true, procedures: Number(rows[0]?.total || 0) };
  } finally {
    await connection.end();
  }
}

function clean(value: string | null | undefined): string | null {
  const result = value?.replace(/\r\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
  return result || null;
}

function section(label: string, value: string | null | undefined): string | null {
  const cleanValue = clean(value);
  return cleanValue ? `${label}:\n${cleanValue}` : null;
}

function sourceHash(row: MysqlTramite): string {
  return crypto.createHash("sha256").update(JSON.stringify(row)).digest("hex");
}

function toKnowledgeItem(chatbotId: number, row: MysqlTramite): InsertKnowledgeBaseItem {
  const title = clean(row.nombre_programa_servicio) || `Trámite o servicio ${row.id}`;
  const content = [
    section("En qué consiste", row.en_que_consiste_ia || row.en_que_consiste),
    section("A quién va dirigido", row.poblacion),
    section("Requisitos", row.requisitos || row.documentacion),
    section("Costo", row.costo),
    section("Horario de atención", row.horario_atencion),
    section("Convocatoria", row.convocatoria || row.cuando_es),
    section("Lugar y contacto", row.informes_en),
    section("Qué necesito", row.que_necesito),
    section("Qué tengo que hacer", row.que_tengo_que_hacer),
    section("Información adicional", row.todo_que_nesecita_saber_programa || row.comentarios_observaciones),
  ].filter((item): item is string => Boolean(item)).join("\n\n");

  return {
    chatbotId,
    externalId: `mysql-tramites-servicios:${row.id}`,
    skill: "tramites_servicios_dif_zapopan",
    tipoDocumento: clean(row.tipo_operacion) || "Trámite o servicio",
    categoria: clean(row.tipo_apoyo) || clean(row.nombre_departamento) || "Trámites y servicios",
    audiencia: clean(row.poblacion) ? [clean(row.poblacion)!] : [],
    title,
    content: content || title,
    source: "MySQL trámites y servicios",
    sourceType: "mysql",
    sourceUrl: null,
    metadata: {
      mysql_table: "tramites_y_servicios",
      mysql_id: row.id,
      mysql_source_hash: sourceHash(row),
      vigente_2026: row.vigente_2026,
      direccion_responsable: clean(row.nombre_direccion),
      departamento_responsable: clean(row.nombre_departamento),
      palabras_clave: clean(row.palabras_clave),
    },
    mimeType: "application/mysql-row",
  };
}

function changed(existing: KnowledgeBaseItem, next: InsertKnowledgeBaseItem): boolean {
  return existing.content !== next.content || existing.title !== next.title ||
    JSON.stringify(existing.metadata || {}) !== JSON.stringify(next.metadata || {}) ||
    existing.categoria !== next.categoria || existing.tipoDocumento !== next.tipoDocumento;
}

export async function syncMysqlProcedures(chatbot: Chatbot, dryRun = false): Promise<MysqlSyncResult> {
  const connection = await mysql.createConnection({ ...requireMysqlConfig(chatbot), connectTimeout: 8000 });
  try {
    const [rows] = await connection.query<MysqlTramite[]>(`
      SELECT id, vigente_2026, nombre_direccion, nombre_departamento, tipo_operacion,
        nombre_programa_servicio, tipo_apoyo, poblacion, documentacion, costo,
        horario_atencion, convocatoria, informes_en, en_que_consiste, en_que_consiste_ia,
        requisitos, palabras_clave, todo_que_nesecita_saber_programa, que_necesito,
        cuando_es, que_tengo_que_hacer, comentarios_observaciones
      FROM tramites_y_servicios
      WHERE vigente_2026 = 'SÍ'
      ORDER BY id
    `);
    const existing = new Map(
      (await storage.getKnowledgeBaseItemsByChatbot(chatbot.id))
        .filter((item) => item.externalId?.startsWith("mysql-tramites-servicios:"))
        .map((item) => [item.externalId!, item]),
    );
    let created = 0;
    let updated = 0;
    let skipped = 0;

    for (const row of rows) {
      const payload = toKnowledgeItem(chatbot.id, row);
      const current = existing.get(payload.externalId!);
      if (current && !changed(current, payload)) {
        skipped += 1;
        continue;
      }
      if (dryRun) {
        current ? updated += 1 : created += 1;
        continue;
      }
      const item = current
        ? await storage.updateKnowledgeBaseItem(current.id, payload)
        : await storage.createKnowledgeBaseItem(payload);
      if (!item) throw new Error(`No se pudo guardar ${payload.externalId}.`);
      await processKnowledgeItem(item);
      current ? updated += 1 : created += 1;
    }
    return { sourceRows: rows.length, created, updated, skipped, dryRun };
  } finally {
    await connection.end();
  }
}
let schedulerRunning = false;

export function startMysqlSyncScheduler() {
  const runDueSyncs = async () => {
    if (schedulerRunning) return;
    schedulerRunning = true;
    try {
      const chatbots = await storage.getAllChatbots();
      for (const chatbot of chatbots) {
        if (!chatbot.mysqlSyncEnabled || !chatbot.mysqlPasswordEncrypted) continue;
        const intervalMs = Math.max(chatbot.mysqlSyncIntervalMinutes || 15, 5) * 60_000;
        const lastSync = chatbot.mysqlLastSyncedAt?.getTime() || 0;
        if (Date.now() - lastSync < intervalMs) continue;
        try {
          const result = await syncMysqlProcedures(chatbot);
          await storage.updateChatbot(chatbot.id, { mysqlLastSyncedAt: new Date() });
          console.log(`[MySQL Sync] chatbot=${chatbot.id} source=${result.sourceRows} created=${result.created} updated=${result.updated} skipped=${result.skipped}`);
        } catch (error) {
          console.error(`[MySQL Sync] chatbot=${chatbot.id} failed:`, error);
        }
      }
    } finally {
      schedulerRunning = false;
    }
  };

  void runDueSyncs();
  setInterval(() => void runDueSyncs(), 60_000).unref();
}