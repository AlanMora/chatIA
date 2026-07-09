import "dotenv/config";
import { buildDirectoryContactResponse } from "../server/directory-contact";

type DirectoryEvalCase = {
  name: string;
  input: string;
  includes: string[];
  excludes?: string[];
};

const chatbotId = Number.parseInt(process.env.EVAL_CHATBOT_ID || "1", 10);

const cases: DirectoryEvalCase[] = [
  {
    name: "telefono trabajo social",
    input: "Cuál es el teléfono de Trabajo Social?",
    includes: ["Trabajo Social", "3338363460"],
    excludes: ["ext.", "colaborador"],
  },
  {
    name: "telefono autismo sur",
    input: "A dónde llamo para Centro de Autismo Sur?",
    includes: ["Centro de Autismo Sur", "3338363443"],
    excludes: ["ext.", "colaborador"],
  },
  {
    name: "telefono cemam",
    input: "Teléfono del CEMAM",
    includes: ["Centro Metropolitano del Adulto Mayor", "3338363452"],
    excludes: ["ext.", "colaborador"],
  },
  {
    name: "telefono gestion social sin acento",
    input: "Dame el numero de Direccion de Gestion Social",
    includes: ["Dirección de Gestión Social", "3338363462"],
    excludes: ["ext.", "colaborador"],
  },
  {
    name: "telefono habiliteca santa lucia",
    input: "Número de la Habiliteca Santa Lucia",
    includes: ["Habiliteca", "Santa Lucía"],
    excludes: ["ext.", "colaborador"],
  },
  {
    name: "lista habilitecas",
    input: "Lista las Habilitecas",
    includes: ["contactos registrados para Habilitecas", "Habiliteca"],
    excludes: ["ext.", "colaborador"],
  },
  {
    name: "lista nidos",
    input: "Dame los teléfonos de los Nidos",
    includes: ["contactos registrados para Nidos", "Nido"],
    excludes: ["ext.", "colaborador"],
  },
  {
    name: "lista nidos y caic",
    input: "Lista los Nidos y CAIC",
    includes: ["contactos registrados para Nidos y CAIC", "Nido", "CAIC"],
    excludes: ["ext.", "colaborador"],
  },
  {
    name: "autismo ambiguo",
    input: "Teléfono de Autismo",
    includes: ["Encontré más de una opción", "Centro de Autismo Norte", "Centro de Autismo Sur"],
    excludes: ["ext.", "colaborador"],
  },
];

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
    const response = await buildDirectoryContactResponse(chatbotId, testCase.input);
    assert(response !== null, `${testCase.name}: no devolvio respuesta deterministica`);

    for (const expected of testCase.includes) {
      assert(response!.includes(expected), `${testCase.name}: falta "${expected}". Respuesta: ${response}`);
    }

    for (const forbidden of testCase.excludes || []) {
      assert(!response!.toLowerCase().includes(forbidden.toLowerCase()), `${testCase.name}: contiene "${forbidden}". Respuesta: ${response}`);
    }

    console.log(`PASS directory ${testCase.name}: ${response!.split(/\r?\n/)[0]}`);
    passed += 1;
  } catch (error) {
    console.error(`FAIL directory ${testCase.name}: ${(error as Error).message}`);
    failed += 1;
  }
}

console.log(`Evaluacion Directorio chatbot=${chatbotId}: ${passed} pasaron, ${failed} fallaron.`);

if (failed > 0) {
  process.exit(1);
}
