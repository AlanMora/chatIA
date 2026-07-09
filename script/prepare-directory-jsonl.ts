import fs from "fs";
import path from "path";

type DirectorySourceRecord = {
  tipo: string;
  oficina: string;
  telefono_directo: string | null;
  telefonos_alternativos?: string[];
  categoria: string;
  fuente?: string | null;
  seccion_fuente?: string | null;
  version_documento?: string | null;
  fecha_documento?: string | null;
  uso_rag?: string | null;
  notas_limpieza?: string | null;
  id: string;
};

const DEFAULT_OUT = "jsonl/integrar/06_directorio_dif_zapopan.canonical.jsonl";

function parseArgs() {
  const options = {
    source: "",
    out: DEFAULT_OUT,
  };

  for (const arg of process.argv.slice(2)) {
    if (arg.startsWith("--source=")) options.source = arg.slice("--source=".length);
    if (arg.startsWith("--out=")) options.out = arg.slice("--out=".length);
  }

  if (!options.source) {
    throw new Error("Uso: tsx script/prepare-directory-jsonl.ts --source=<Directorio.jsonl> [--out=<archivo.jsonl>]");
  }

  return options;
}

function normalizePhone(value: string | null | undefined) {
  return typeof value === "string" ? value.replace(/\D+/g, "") : "";
}

function normalizeAliases(value: string) {
  const normalized = value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
  const aliases = new Set<string>([normalized]);

  aliases.add(normalized.replace(/\bno\b/g, "").replace(/\s+/g, " ").trim());
  aliases.add(normalized.replace(/\b0+(\d)\b/g, "$1"));

  if (normalized.includes("centro metropolitano del adulto mayor")) aliases.add("cemam");
  if (normalized.includes("direccion de gestion social")) aliases.add("gestion social");
  if (normalized.includes("trabajo social")) aliases.add("trabajo social");
  if (normalized.includes("centro de autismo sur")) aliases.add("autismo sur");
  if (normalized.includes("centro de autismo norte")) aliases.add("autismo norte");
  if (normalized.includes("habiliteca")) {
    aliases.add(normalized.replace(/^habiliteca\s+0?/, "habiliteca "));
  }
  if (normalized.includes("nido")) {
    aliases.add(normalized.replace(/^nido\s+0?/, "nido "));
  }
  if (normalized.includes("caic")) {
    aliases.add(normalized.replace(/^caic\s+no\s+0?/, "caic "));
    aliases.add(normalized.replace(/^caic\s+0?/, "caic "));
  }

  return Array.from(aliases).filter(Boolean);
}

function toCanonical(record: DirectorySourceRecord) {
  const telefonoDirecto = normalizePhone(record.telefono_directo);
  const telefonosAlternativos = Array.isArray(record.telefonos_alternativos)
    ? record.telefonos_alternativos.map(normalizePhone).filter(Boolean)
    : [];
  const aliases = normalizeAliases(record.oficina);
  const contenido = [
    `Directorio oficial DIF Zapopan: ${record.oficina}.`,
    `Categoria: ${record.categoria}.`,
    telefonoDirecto ? `Telefono directo actualizado: ${telefonoDirecto}.` : "No tiene telefono directo registrado.",
    telefonosAlternativos.length > 0 ? `Telefonos alternativos: ${telefonosAlternativos.join(", ")}.` : null,
    "Usar como fuente de verdad para consultas de telefono o contacto institucional.",
    "No mostrar extensiones ni nombres de colaboradores.",
  ].filter(Boolean).join("\n");

  return {
    id: record.id,
    skill: "directorio_dif_zapopan",
    tipo_documento: "directorio_contacto",
    categoria: record.categoria,
    titulo: record.oficina,
    contenido,
    source: record.fuente || "Directorio Oficial DIF Zapopan",
    source_url: null,
    metadata: {
      tipo: record.tipo,
      oficina: record.oficina,
      telefono_directo: telefonoDirecto || null,
      telefonos_alternativos: telefonosAlternativos,
      categoria: record.categoria,
      aliases,
      fuente: record.fuente || null,
      seccion_fuente: record.seccion_fuente || null,
      version_documento: record.version_documento || null,
      fecha_documento: record.fecha_documento || null,
      uso_rag: record.uso_rag || null,
      notas_limpieza: record.notas_limpieza || null,
      fuente_verdad_telefonos: true,
    },
  };
}

function main() {
  const options = parseArgs();
  const sourcePath = path.resolve(process.cwd(), options.source);
  const outPath = path.resolve(process.cwd(), options.out);
  const lines = fs.readFileSync(sourcePath, "utf8").split(/\r?\n/).filter((line) => line.trim());
  const records = lines.map((line, index) => {
    try {
      return JSON.parse(line) as DirectorySourceRecord;
    } catch (error) {
      throw new Error(`${options.source}:${index + 1} JSON invalido: ${(error as Error).message}`);
    }
  });

  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, records.map((record) => JSON.stringify(toCanonical(record))).join("\n") + "\n", "utf8");
  console.log(`Directorio canonical generado: ${options.out}. Registros=${records.length}`);
}

main();
