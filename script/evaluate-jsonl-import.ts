import "dotenv/config";
import fs from "fs";
import path from "path";
import pg from "pg";

type ExpectedFile = {
  path: string;
  total: number;
  skills: Record<string, number>;
};

const expectedFiles: ExpectedFile[] = [
  {
    path: "jsonl/integrar/99_sofia_kb_master_completo_depurado.jsonl",
    total: 92,
    skills: {
      institucional_sofia: 7,
      protocolos_orientacion_riesgo: 4,
      programas_servicios_dif_zapopan: 38,
      ubicaciones_institucionales: 43,
    },
  },
  {
    path: "jsonl/integrar/sofia_tramites_servicios_2026_06_12_173504.jsonl",
    total: 80,
    skills: {
      tramites_servicios_dif_zapopan: 80,
    },
  },
  {
    path: "jsonl/integrar/05_faq_dif_zapopan.canonical.jsonl",
    total: 31,
    skills: {
      faq_dif_zapopan: 31,
    },
  },
];

const chatbotId = Number.parseInt(process.env.EVAL_CHATBOT_ID || "1", 10);

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(message);
}

function validateFile(expected: ExpectedFile) {
  const absolutePath = path.resolve(process.cwd(), expected.path);
  assert(fs.existsSync(absolutePath), `No existe ${expected.path}`);

  const ids = new Set<string>();
  const skills = new Map<string, number>();
  let total = 0;

  fs.readFileSync(absolutePath, "utf8")
    .split(/\r?\n/)
    .forEach((line, index) => {
      const trimmed = line.trim();
      if (!trimmed) return;
      const row = JSON.parse(trimmed);
      for (const field of ["id", "skill", "tipo_documento", "categoria", "titulo", "metadata"]) {
        assert(field in row, `${expected.path}:${index + 1} falta ${field}`);
      }
      assert(row.contenido || row.pageContent, `${expected.path}:${index + 1} falta contenido/pageContent`);
      assert(!ids.has(row.id), `${expected.path}:${index + 1} id duplicado ${row.id}`);
      ids.add(row.id);
      skills.set(row.skill, (skills.get(row.skill) || 0) + 1);
      total += 1;
    });

  assert(total === expected.total, `${expected.path}: esperado ${expected.total}, recibido ${total}`);
  for (const [skill, count] of Object.entries(expected.skills)) {
    assert((skills.get(skill) || 0) === count, `${expected.path}: ${skill} esperado ${count}, recibido ${skills.get(skill) || 0}`);
  }
}

async function validateDatabase() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL no esta configurado.");

  const expectedTotal = expectedFiles.reduce((sum, file) => sum + file.total, 0);
  const expectedSkills = expectedFiles.reduce<Record<string, number>>((acc, file) => {
    for (const [skill, count] of Object.entries(file.skills)) {
      acc[skill] = (acc[skill] || 0) + count;
    }
    return acc;
  }, {});

  const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  try {
    const total = await client.query(
      "select count(*)::int as count from knowledge_base_items where chatbot_id = $1 and external_id is not null",
      [chatbotId],
    );
    assert(total.rows[0].count === expectedTotal, `DB: esperado ${expectedTotal} items JSONL, recibido ${total.rows[0].count}`);

    const duplicates = await client.query(
      `select external_id, count(*)::int as count
       from knowledge_base_items
       where chatbot_id = $1 and external_id is not null
       group by external_id
       having count(*) > 1`,
      [chatbotId],
    );
    assert(duplicates.rows.length === 0, `DB: hay external_id duplicados`);

    const skillCounts = await client.query(
      `select skill, count(*)::int as count
       from knowledge_base_items
       where chatbot_id = $1 and external_id is not null
       group by skill`,
      [chatbotId],
    );
    const actualSkills = new Map<string, number>(skillCounts.rows.map((row) => [row.skill, row.count]));
    for (const [skill, count] of Object.entries(expectedSkills)) {
      assert((actualSkills.get(skill) || 0) === count, `DB: ${skill} esperado ${count}, recibido ${actualSkills.get(skill) || 0}`);
    }

    const chunks = await client.query(
      `select count(*)::int as count
       from knowledge_base_chunks kbc
       join knowledge_base_items kbi on kbi.id = kbc.item_id
       where kbi.chatbot_id = $1 and kbi.external_id is not null`,
      [chatbotId],
    );
    assert(chunks.rows[0].count >= expectedTotal, `DB: chunks insuficientes (${chunks.rows[0].count})`);
  } finally {
    await client.end();
  }
}

for (const expected of expectedFiles) {
  validateFile(expected);
}

await validateDatabase();

console.log(`Evaluacion JSONL import chatbot=${chatbotId}: OK`);
