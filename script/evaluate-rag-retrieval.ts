import "dotenv/config";
import { buildKnowledgeContext } from "../server/knowledge-base";
import {
  classifyConversationIntent,
  getDeterministicWidgetResponse,
  type ConversationIntent,
  type ConversationMessage,
} from "../server/conversation-policy";

type RagCase = {
  name: string;
  input: string;
  minChunks: number;
  sourceIncludes?: string[];
};

type FlowTurn = {
  user: string;
  expectedIntent: ConversationIntent;
  minChunks?: number;
  deterministicIncludes?: string[];
  assistantFixture?: string;
  sourceIncludes?: string[];
};

type FlowCase = {
  name: string;
  turns: FlowTurn[];
};

const chatbotId = Number.parseInt(process.env.EVAL_CHATBOT_ID || "1", 10);

const simpleCases: RagCase[] = [
  {
    name: "platicas prematrimoniales",
    input: "platicas prematrimoniales",
    minChunks: 1,
    sourceIncludes: ["platicas-prematrimoniales"],
  },
  {
    name: "servicios CEMAM",
    input: "que tramites y/o servicios hay en el CEMAM",
    minChunks: 1,
    sourceIncludes: ["cemam", "inapam"],
  },
  {
    name: "ayuda alimentaria",
    input: "que servicios hay sobre ayuda alimentaria",
    minChunks: 1,
    sourceIncludes: ["ayuda-alimentaria", "alimentaria"],
  },
  {
    name: "talleres deportivos",
    input: "talleres deportivos",
    minChunks: 1,
    sourceIncludes: ["talleres-deportivos"],
  },
  {
    name: "afiliacion INAPAM",
    input: "Afiliacion al INAPAM",
    minChunks: 1,
    sourceIncludes: ["inapam"],
  },
];

const cemamList = `Servicios ofrecidos en el CEMAM:

1. Servicios Basicos y Asistenciales
2. Desarrollo de Habilidades Productivas y Emprendurismo
3. Solicitud de Visita Escolar al CEMAM
4. Reporte de Personas Mayores en Situacion de Vulnerabilidad
5. Afiliacion al INAPAM

Cual de estos servicios te interesa consultar? Puedes escribir el numero o el nombre del servicio.`;

const inapanMenu = `Afiliacion al INAPAM

Que informacion quieres conocer?

1. En que consiste
2. A quien va dirigido
3. Requisitos
4. Costos
5. Horario, vigencia o convocatoria
6. Lugar y contacto
7. Nota importante
8. Ficha completa

Puedes escribir el numero o el apartado.`;

const prematrimonialMenu = `platicas prematrimoniales

Que informacion quieres conocer?

1. En que consiste
2. A quien va dirigido
3. Requisitos
4. Costos
5. Horario, vigencia o convocatoria
6. Lugar y contacto
7. Nota importante
8. Ficha completa

Puedes escribir el numero o el apartado.`;

const alimentariaList = `Encontre estas opciones relacionadas:

1. Programa de Ayuda Alimentaria Directa
2. Programa de Atencion Alimentaria a Personas en Situacion de Vulnerabilidad

Cual quieres consultar? Puedes escribir el numero o el nombre.`;

const ayudaMenu = `Programa de Ayuda Alimentaria Directa

Que informacion quieres conocer?

1. En que consiste
2. A quien va dirigido
3. Requisitos
4. Costos
5. Horario, vigencia o convocatoria
6. Lugar y contacto
7. Nota importante
8. Ficha completa

Puedes escribir el numero o el apartado.`;

const flowCases: FlowCase[] = [
  {
    name: "CEMAM -> INAPAM -> requisitos -> costos -> ficha",
    turns: [
      {
        user: "que tramites y/o servicios hay en el CEMAM",
        expectedIntent: "list",
        minChunks: 1,
        assistantFixture: cemamList,
        sourceIncludes: ["cemam", "inapam"],
      },
      {
        user: "5",
        expectedIntent: "service_selection",
        deterministicIncludes: ["Afiliacion al INAPAM", "¿Qué información quieres conocer?", "8. Ficha completa"],
        assistantFixture: inapanMenu,
      },
      {
        user: "3",
        expectedIntent: "section_request",
        minChunks: 1,
        assistantFixture: "Afiliacion al INAPAM\n\nRequisitos\nDocumento de prueba.",
        sourceIncludes: ["inapam"],
      },
      {
        user: "costos",
        expectedIntent: "section_request",
        minChunks: 1,
        assistantFixture: "Afiliacion al INAPAM\n\nCostos\nDato de prueba.",
        sourceIncludes: ["inapam"],
      },
      {
        user: "ficha completa",
        expectedIntent: "complete_record",
        minChunks: 1,
        assistantFixture: "Afiliacion al INAPAM\n\nFicha completa\nDato de prueba.",
        sourceIncludes: ["inapam"],
      },
    ],
  },
  {
    name: "Prematrimoniales directo -> costo -> requisitos -> lugar",
    turns: [
      {
        user: "platicas prematrimoniales",
        expectedIntent: "direct_service",
        deterministicIncludes: ["platicas prematrimoniales", "¿Qué información quieres conocer?", "4. Costos"],
        assistantFixture: prematrimonialMenu,
      },
      {
        user: "4",
        expectedIntent: "section_request",
        minChunks: 1,
        assistantFixture: "platicas prematrimoniales\n\nCostos\nDato de prueba.",
        sourceIncludes: ["platicas-prematrimoniales"],
      },
      {
        user: "requisitos",
        expectedIntent: "section_request",
        minChunks: 1,
        assistantFixture: "platicas prematrimoniales\n\nRequisitos\nDato de prueba.",
        sourceIncludes: ["platicas-prematrimoniales"],
      },
      {
        user: "lugar y contacto",
        expectedIntent: "section_request",
        minChunks: 1,
        assistantFixture: "platicas prematrimoniales\n\nLugar y contacto\nDato de prueba.",
        sourceIncludes: ["platicas-prematrimoniales"],
      },
    ],
  },
  {
    name: "Ayuda alimentaria -> programa 1 -> requisitos -> ficha completa",
    turns: [
      {
        user: "que servicios hay sobre ayuda alimentaria",
        expectedIntent: "list",
        minChunks: 1,
        assistantFixture: alimentariaList,
        sourceIncludes: ["alimentaria"],
      },
      {
        user: "1",
        expectedIntent: "service_selection",
        deterministicIncludes: ["Programa de Ayuda Alimentaria Directa", "¿Qué información quieres conocer?"],
        assistantFixture: ayudaMenu,
      },
      {
        user: "requisitos",
        expectedIntent: "section_request",
        minChunks: 1,
        assistantFixture: "Programa de Ayuda Alimentaria Directa\n\nRequisitos\nDato de prueba.",
        sourceIncludes: ["ayuda-alimentaria"],
      },
      {
        user: "todos los datos",
        expectedIntent: "complete_record",
        minChunks: 1,
        assistantFixture: "Programa de Ayuda Alimentaria Directa\n\nFicha completa\nDato de prueba.",
        sourceIncludes: ["ayuda-alimentaria"],
      },
    ],
  },
  {
    name: "Cambio de tema reinicia busqueda",
    turns: [
      {
        user: "Afiliacion al INAPAM",
        expectedIntent: "direct_service",
        deterministicIncludes: ["Afiliacion al INAPAM", "¿Qué información quieres conocer?"],
        assistantFixture: inapanMenu,
      },
      {
        user: "talleres deportivos",
        expectedIntent: "direct_service",
        deterministicIncludes: ["talleres deportivos", "¿Qué información quieres conocer?"],
        assistantFixture: "talleres deportivos\n\nQue informacion quieres conocer?\n\n1. En que consiste\n2. A quien va dirigido\n3. Requisitos\n4. Costos\n5. Horario, vigencia o convocatoria\n6. Lugar y contacto\n7. Nota importante\n8. Ficha completa\n\nPuedes escribir el numero o el apartado.",
      },
      {
        user: "requisitos",
        expectedIntent: "section_request",
        minChunks: 1,
        assistantFixture: "talleres deportivos\n\nRequisitos\nDato de prueba.",
        sourceIncludes: ["talleres-deportivos"],
      },
    ],
  },
];

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(message);
}

function sourceMatches(sources: string[], expected: string[]) {
  const normalize = (value: string) =>
    value
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, " ")
      .trim();
  const normalizedSources = sources.map(normalize);
  return expected.some((needle) => normalizedSources.some((source) => source.includes(normalize(needle))));
}

async function assertRagResult(name: string, messages: ConversationMessage[], minChunks: number, sourceIncludes?: string[]) {
  const result = await buildKnowledgeContext(chatbotId, messages);

  assert(result.strategy === "vector", `${name}: estrategia esperada vector, recibida ${result.strategy}`);
  assert((result.chunksFound || 0) >= minChunks, `${name}: chunks insuficientes`);
  assert((result.sources || []).length > 0, `${name}: no se reportaron fuentes`);
  assert(result.context.includes("FRAGMENTOS DE CONOCIMIENTO"), `${name}: contexto RAG invalido`);

  if (sourceIncludes?.length) {
    assert(
      sourceMatches(result.sources || [], sourceIncludes),
      `${name}: fuentes no coinciden. Esperado alguno de ${sourceIncludes.join(", ")}. Recibido ${(result.sources || []).join(", ")}`,
    );
  }

  return result;
}

let passed = 0;
let failed = 0;

if (!Number.isInteger(chatbotId) || chatbotId <= 0) {
  console.error("EVAL_CHATBOT_ID debe ser un numero entero positivo.");
  process.exit(1);
}

for (const testCase of simpleCases) {
  try {
    const result = await assertRagResult(testCase.name, [{ role: "user", content: testCase.input }], testCase.minChunks, testCase.sourceIncludes);
    console.log(
      `PASS simple ${testCase.name}: chunks=${result.chunksFound || 0}, sources=${(result.sources || []).join(", ")}`,
    );
    passed += 1;
  } catch (error) {
    console.error(`FAIL simple ${testCase.name}: ${(error as Error).message}`);
    failed += 1;
  }
}

for (const flow of flowCases) {
  const messages: ConversationMessage[] = [];

  for (const [index, turn] of flow.turns.entries()) {
    const testName = `${flow.name} / turno ${index + 1}: ${turn.user}`;

    try {
      messages.push({ role: "user", content: turn.user });

      const intent = classifyConversationIntent(turn.user, messages);
      assert(intent === turn.expectedIntent, `${testName}: intent esperado ${turn.expectedIntent}, recibido ${intent}`);

      const deterministic = getDeterministicWidgetResponse(messages);
      if (turn.deterministicIncludes?.length) {
        assert(typeof deterministic === "string", `${testName}: esperaba respuesta deterministica`);
        for (const expectedText of turn.deterministicIncludes) {
          assert(deterministic!.includes(expectedText), `${testName}: falta "${expectedText}"`);
        }
      } else {
        assert(deterministic === null, `${testName}: no esperaba respuesta deterministica`);
      }

      if (turn.minChunks) {
        const result = await assertRagResult(testName, messages, turn.minChunks, turn.sourceIncludes);
        console.log(`PASS flow ${testName}: intent=${intent}, chunks=${result.chunksFound || 0}`);
      } else {
        console.log(`PASS flow ${testName}: intent=${intent}, deterministic=true`);
      }

      if (turn.assistantFixture) {
        messages.push({ role: "assistant", content: turn.assistantFixture });
      }

      passed += 1;
    } catch (error) {
      console.error(`FAIL flow ${testName}: ${(error as Error).message}`);
      failed += 1;
      break;
    }
  }
}

console.log(`Evaluacion RAG real chatbot=${chatbotId}: ${passed} pasaron, ${failed} fallaron.`);

if (failed > 0) {
  process.exit(1);
}
