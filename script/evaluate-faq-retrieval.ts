import "dotenv/config";
import { buildKnowledgeContext } from "../server/knowledge-base";

type FaqEvalCase = {
  name: string;
  input: string;
  sourceIncludes: string[];
};

const chatbotId = Number.parseInt(process.env.EVAL_CHATBOT_ID || "1", 10);

const cases: FaqEvalCase[] = [
  {
    name: "adopcion curso inicial",
    input: "queremos adoptar un niño, cual es el primer paso para empezar",
    sourceIncludes: ["FAQ-001", "adopciones", "acogida"],
  },
  {
    name: "divorcio asesoría",
    input: "me quiero separar legalmente y necesito que alguien me oriente",
    sourceIncludes: ["FAQ-002", "divorcios"],
  },
  {
    name: "pension alimenticia",
    input: "el papa de mis hijos no me ayuda, donde veo lo de pension",
    sourceIncludes: ["FAQ-003", "pension"],
  },
  {
    name: "autismo diagnostico",
    input: "sospecho que mi hijo tiene autismo, hacen valoraciones",
    sourceIncludes: ["FAQ-004", "autismo"],
  },
  {
    name: "autismo registro",
    input: "como dejo mis datos para que me contacten del centro de autismo",
    sourceIncludes: ["FAQ-005", "autismo", "registro"],
  },
  {
    name: "audiometria",
    input: "necesito revisar la audicion de mi mama o conseguir aparato auditivo",
    sourceIncludes: ["FAQ-007", "audiometrias"],
  },
  {
    name: "cataratas",
    input: "donde saco cita para revision de cataratas",
    sourceIncludes: ["FAQ-009", "cataratas"],
  },
  {
    name: "cemam inscripcion",
    input: "que papeles lleva mi abuelito para entrar al centro de adultos mayores",
    sourceIncludes: ["FAQ-010", "CEMAM"],
  },
  {
    name: "certificado discapacidad",
    input: "ocupo un certificado de discapacidad, lo tramitan ustedes",
    sourceIncludes: ["FAQ-011", "discapacidad"],
  },
  {
    name: "habilitecas talleres",
    input: "quiero meterme a un curso cerca de mi colonia",
    sourceIncludes: ["FAQ-012", "Habilitecas"],
  },
  {
    name: "inapam",
    input: "mi mama ya cumplio 60, donde saco su tarjeta del inapam",
    sourceIncludes: ["FAQ-013", "INAPAM"],
  },
  {
    name: "ludotecas",
    input: "hay algun espacio para actividades de niñas y niños",
    sourceIncludes: ["FAQ-014", "Ludotecas"],
  },
  {
    name: "nidos guarderia",
    input: "busco guarderia del DIF para mi niña",
    sourceIncludes: ["FAQ-015", "Nidos"],
  },
  {
    name: "prematrimoniales",
    input: "me voy a casar y necesito las platicas, donde me apunto",
    sourceIncludes: ["FAQ-016", "prematrimoniales"],
  },
  {
    name: "prepa abierta",
    input: "quiero acabar la prepa en una habiliteca y saber cuanto cuesta",
    sourceIncludes: ["FAQ-026", "Preparatorias"],
  },
  {
    name: "madres solteras apoyos",
    input: "soy mama soltera, hay algun apoyo social al que pueda preguntar",
    sourceIncludes: ["FAQ-018", "Trabajo Social"],
  },
  {
    name: "tarjeta voluntades",
    input: "que documentos piden para la tarjeta voluntades",
    sourceIncludes: ["FAQ-019", "Tarjeta Voluntades"],
  },
  {
    name: "psicologia",
    input: "me urge terapia psicologica, tienen algun telefono",
    sourceIncludes: ["FAQ-020", "psicologica"],
  },
  {
    name: "lenguaje infantil",
    input: "mi niño de 4 años no pronuncia bien, dan terapia de lenguaje",
    sourceIncludes: ["FAQ-021", "lenguaje"],
  },
  {
    name: "servicio social",
    input: "soy estudiante y quiero liberar mi servicio social con ustedes",
    sourceIncludes: ["FAQ-025", "Servicio social"],
  },
  {
    name: "vuelve a casa registro",
    input: "como registro a una persona que se puede extraviar para que tenga qr",
    sourceIncludes: ["FAQ-029", "Vuelve a Casa"],
  },
];

function normalize(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function sourceMatches(sources: string[], expected: string[]) {
  const normalizedSources = sources.map(normalize);
  return expected.some((needle) => normalizedSources.some((source) => source.includes(normalize(needle))));
}

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(message);
}

let passed = 0;
let failed = 0;

if (!Number.isInteger(chatbotId) || chatbotId <= 0) {
  console.error("EVAL_CHATBOT_ID debe ser un numero entero positivo.");
  process.exit(1);
}

for (const testCase of cases) {
  try {
    const result = await buildKnowledgeContext(chatbotId, [{ role: "user", content: testCase.input }]);
    const sources = result.sources || [];

    assert(result.strategy === "vector", `${testCase.name}: estrategia esperada vector, recibida ${result.strategy}`);
    assert((result.chunksFound || 0) > 0, `${testCase.name}: no recupero chunks`);
    assert(sourceMatches(sources, testCase.sourceIncludes), `${testCase.name}: fuentes no coinciden. Esperado ${testCase.sourceIncludes.join(", ")}. Recibido ${sources.join(", ")}`);

    console.log(`PASS faq ${testCase.name}: chunks=${result.chunksFound || 0}, sources=${sources.join(", ")}`);
    passed += 1;
  } catch (error) {
    console.error(`FAIL faq ${testCase.name}: ${(error as Error).message}`);
    failed += 1;
  }
}

console.log(`Evaluacion FAQ RAG chatbot=${chatbotId}: ${passed} pasaron, ${failed} fallaron.`);

if (failed > 0) {
  process.exit(1);
}
