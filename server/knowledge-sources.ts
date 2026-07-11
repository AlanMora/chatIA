import type { KnowledgeBaseItem } from "@shared/schema";

export type KnowledgeSource = "tramites_servicios" | "red_atencion" | "faq";

export type KnowledgeSourceSelection = {
  primary: KnowledgeSource;
  complementary?: KnowledgeSource;
};

export type KnowledgeSourceRecord = {
  source: KnowledgeSource;
  title: string;
  kind: "tramite_servicio" | "centro" | "oficina" | "faq";
  content: string;
  fields: Record<string, string>;
};

function normalize(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function getKnowledgeSource(skill: string | null | undefined): KnowledgeSource | null {
  if (skill === "tramites_servicios_dif_zapopan" || skill === "programas_servicios_dif_zapopan") {
    return "tramites_servicios";
  }
  if (skill === "ubicaciones_institucionales" || skill === "directorio_dif_zapopan") {
    return "red_atencion";
  }
  if (skill === "faq_dif_zapopan") return "faq";
  return null;
}

export function selectKnowledgeSources(query: string, hasActiveService = false): KnowledgeSourceSelection {
  const normalized = normalize(query);
  const asksRedAtencion = /\b(direccion|ubicacion|ubicaciones|donde|telefono|numero|contacto|horario|mapa|centro|sede|oficina|habiliteca|nido|caic|cemam|cerca|cercano|cercana)\b/.test(normalized);
  const asksTramite = /\b(tramite|servicio|requisitos|documentos|documentacion|costo|costos|proceso|pasos|solicitud|registro|inscribir|inscripcion|vigencia|convocatoria)\b/.test(normalized);
  const asksFaq = /\b(que es|como funciona|puedo|pueden|hay|tienen|duda|pregunta|informacion|apoyo|beneficio)\b/.test(normalized);

  if (hasActiveService || asksTramite) {
    return asksRedAtencion
      ? { primary: "tramites_servicios", complementary: "red_atencion" }
      : { primary: "tramites_servicios" };
  }

  if (asksRedAtencion) return { primary: "red_atencion" };
  if (asksFaq) return { primary: "faq" };
  return { primary: "faq", complementary: "tramites_servicios" };
}

export function belongsToKnowledgeSources(
  item: Pick<KnowledgeBaseItem, "skill">,
  selection: KnowledgeSourceSelection,
): boolean {
  const source = getKnowledgeSource(item.skill);
  return source === selection.primary || source === selection.complementary;
}

function getString(metadata: Record<string, unknown> | null, key: string): string | null {
  const value = metadata?.[key];
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function getRecordKind(item: KnowledgeBaseItem, source: KnowledgeSource): KnowledgeSourceRecord["kind"] {
  if (source === "tramites_servicios") return "tramite_servicio";
  if (source === "faq") return "faq";
  const type = normalize(`${item.tipoDocumento || ""} ${item.categoria || ""} ${getString(item.metadata, "tipo") || ""}`);
  return /\b(oficina|departamento|direccion)\b/.test(type) ? "oficina" : "centro";
}

export function buildKnowledgeSourceRecords(
  items: KnowledgeBaseItem[],
  selection: KnowledgeSourceSelection,
  query: string,
  limit = selection.primary === "red_atencion" ? 10 : 4,
): KnowledgeSourceRecord[] {
  const queryTerms = normalize(query).split(" ").filter((term) => term.length >= 3);

  return items
    .filter((item) => belongsToKnowledgeSources(item, selection))
    .map((item) => {
      const haystack = normalize(`${item.title} ${item.content} ${JSON.stringify(item.metadata || {})}`);
      const title = normalize(item.title);
      const score = queryTerms.reduce(
        (total, term) => total + (title.includes(term) ? 8 : haystack.includes(term) ? 2 : 0),
        0,
      );
      return { item, score };
    })
    .filter(({ score }) => score > 0 || queryTerms.length === 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ item }) => {
      const source = getKnowledgeSource(item.skill)!;
      const fields = Object.fromEntries(
        [
          ["Dirección", getString(item.metadata, "direccion")],
          ["Teléfono", getString(item.metadata, "telefono") || getString(item.metadata, "telefono_directo")],
          ["Horario", getString(item.metadata, "horario_atencion") || getString(item.metadata, "dias_atencion")],
          ["Mapa", getString(item.metadata, "google_maps_url") || getString(item.metadata, "source_url") || item.sourceUrl],
        ].filter((entry): entry is [string, string] => Boolean(entry[1])),
      );
      return {
        source,
        title: item.title,
        kind: getRecordKind(item, source),
        content: item.content.slice(0, 800),
        fields,
      };
    });
}

export function formatKnowledgeSourceRecords(records: KnowledgeSourceRecord[]): string {
  return records.map((record, index) => {
    const fields = Object.entries(record.fields)
      .map(([label, value]) => `- ${label}: ${value}`)
      .join("\n");
    const heading = record.source === "red_atencion"
      ? `REGISTRO ${index + 1}\nNombre: ${record.title}`
      : `[${record.kind}] ${record.title}`;
    return `${heading}${fields ? `\n${fields}` : ""}${fields && record.content ? "\n" : ""}${record.content}`;
  }).join("\n\n---\n\n");
}

export function buildSourceFormattingInstructions(selection: KnowledgeSourceSelection): string {
  const sources = [selection.primary, selection.complementary].filter(Boolean).join(", ");
  return `\n=== FUENTES ACTIVAS ===\nFuente principal: ${selection.primary}.${selection.complementary ? ` Fuente complementaria: ${selection.complementary}.` : ""}\nUsa la fuente complementaria solo si aclara o completa directamente la pregunta. No la presentes como una respuesta separada.\nFormato: para tramites_servicios usa un resumen breve y ofrece apartados cuando corresponda; para faq responde de forma natural y breve. Para red_atencion, cada REGISTRO recuperado representa una sede: enumera los resultados como 1., 2., 3. y conserva el nombre en negritas con los datos disponibles de Dirección, Horario, Teléfono y Mapa en viñetas. Si se recuperó Dirección, nunca respondas únicamente con el nombre de la sede. No inventes datos que no estén en el registro.\nNo menciones nombres de fuentes, documentos, metadata ni el texto \"${sources}\" al usuario.\n=== FIN FUENTES ACTIVAS ===`;
}
