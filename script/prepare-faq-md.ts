import fs from "fs";
import path from "path";

type FaqRecord = {
  id: string;
  title: string;
  question: string;
  answer: string;
  links: string[];
  tags: string[];
};

function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    source: "",
    out: "jsonl/integrar/05_faq_dif_zapopan.canonical.jsonl",
  };

  for (const arg of args) {
    if (arg.startsWith("--source=")) {
      options.source = arg.slice("--source=".length);
    } else if (arg.startsWith("--out=")) {
      options.out = arg.slice("--out=".length);
    }
  }

  if (!options.source) {
    throw new Error("Uso: tsx script/prepare-faq-md.ts --source=<FAQ.md> [--out=<archivo.jsonl>]");
  }

  return options;
}

function cleanBlockText(value: string) {
  return value
    .replace(/\r/g, "")
    .split("\n")
    .map((line) => line.trimEnd())
    .join("\n")
    .trim();
}

function extractSection(block: string, label: string) {
  const escapedLabel = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const matcher = new RegExp(`\\*\\*${escapedLabel}:\\*\\*\\s*([\\s\\S]*?)(?=\\n\\*\\*(?:Pregunta|Respuesta|Enlaces|Etiquetas):\\*\\*|$)`, "i");
  return cleanBlockText(block.match(matcher)?.[1] || "");
}

function parseFaqMarkdown(markdown: string): FaqRecord[] {
  const normalized = markdown.replace(/\r\n?/g, "\n");
  const records: FaqRecord[] = [];

  for (const rawBlock of normalized.split(/^---\s*$/gm)) {
    const match = rawBlock.match(/^##\s+(FAQ-\d+)\s+-\s+(.+?)\n([\s\S]*)$/m);
    if (!match) continue;

    const [, id, title, body] = match;
    const question = extractSection(body, "Pregunta").replace(/^¿?Pregunta:\s*/i, "").trim();
    const answer = extractSection(body, "Respuesta");
    const linksText = extractSection(body, "Enlaces");
    const tagsText = extractSection(body, "Etiquetas");
    const links = linksText
      .split("\n")
      .map((line) => line.replace(/^-\s*/, "").trim())
      .filter(Boolean);
    const tags = tagsText
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean);

    if (!question || !answer) {
      throw new Error(`${id}: falta pregunta o respuesta.`);
    }

    records.push({ id, title: title.trim(), question, answer, links, tags });
  }

  if (records.length === 0) {
    throw new Error("No se encontraron bloques FAQ en el Markdown.");
  }

  return records;
}

function toJsonlRecord(record: FaqRecord) {
  const content = [
    `Pregunta frecuente: ${record.question}`,
    `Respuesta: ${record.answer}`,
    record.links.length ? `Enlaces: ${record.links.join(" | ")}` : null,
    record.tags.length ? `Etiquetas: ${record.tags.join(", ")}` : null,
  ].filter(Boolean).join("\n\n");

  return {
    id: `faq_dif_zapopan_${record.id.toLowerCase()}`,
    skill: "faq_dif_zapopan",
    tipo_documento: "pregunta_frecuente",
    categoria: record.title,
    audiencia: ["ciudadania"],
    titulo: `${record.id} - ${record.title}`,
    descripcion_breve: record.question,
    contenido: content,
    source: "FAQ DIF Zapopan curado",
    source_url: record.links[0] || null,
    metadata: {
      faq_id: record.id,
      pregunta: record.question,
      respuesta: record.answer,
      enlaces: record.links,
      etiquetas: record.tags,
    },
  };
}

const options = parseArgs();
const sourcePath = path.resolve(options.source);
const outPath = path.resolve(process.cwd(), options.out);

if (!fs.existsSync(sourcePath)) {
  throw new Error(`No existe el archivo fuente: ${sourcePath}`);
}

const records = parseFaqMarkdown(fs.readFileSync(sourcePath, "utf8"));
fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, records.map((record) => JSON.stringify(toJsonlRecord(record))).join("\n") + "\n", "utf8");

console.log(`FAQ convertido: ${records.length} registros -> ${outPath}`);
