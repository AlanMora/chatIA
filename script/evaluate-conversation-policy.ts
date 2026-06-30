import {
  buildRuntimeSystemPrompt,
  classifyConversationIntent,
  deriveConversationState,
  extractServiceOptionsFromList,
  extractServiceOptionsWithDescriptionsFromList,
  getActiveServiceName,
  getRequestedSectionLabel,
  buildAmbiguousHelpResponse,
  getDeterministicWidgetResponse,
  type ConversationIntent,
  type ConversationMessage,
  type ConversationState,
} from "../server/conversation-policy";

type IntentCase = {
  name: string;
  input: string;
  expected: ConversationIntent;
  messages?: ConversationMessage[];
};

type ResponseCase = {
  name: string;
  messages: ConversationMessage[];
  includes: string[];
  excludes: string[];
};

type StateCase = {
  name: string;
  input: string;
  expected: ConversationState;
  messages?: ConversationMessage[];
};

const cemamList = `Servicios ofrecidos en el CEMAM:

1. Servicios Basicos y Asistenciales
2. Desarrollo de Habilidades Productivas y Emprendurismo
3. Solicitud de Visita Escolar al CEMAM
4. Reporte de Personas Mayores en Situacion de Vulnerabilidad
5. Afiliacion al INAPAM

¿Cuál de estos servicios te interesa consultar? Puedes escribir el número o el nombre del servicio.`;

const sectionMenu = `Afiliacion al INAPAM

¿Qué información quieres conocer?

1. En qué consiste
2. A quién va dirigido
3. Requisitos
4. Costos
5. Horario, vigencia o convocatoria
6. Lugar y contacto
7. Nota importante
8. Ficha completa

Puedes escribir el número o el apartado.`;

const initialWelcome = `Hola, soy SofIA, asistente virtual del DIF Zapopan.

Puedo orientarte sobre trámites, servicios, programas, talleres y apoyos disponibles.

Elige una opcion o escribe tu pregunta:

1. Buscar un trámite o servicio
2. No se que necesito
3. Ver por grupo de atención
4. Ver programas o talleres`;

const cemamDescriptiveList = `Servicios en el CEMAM

Servicios Basicos y Asistenciales

Atencion en estetica, comedor, transporte y biblioteca.
Gratuito para adultos mayores afiliados al CEMAM.
Desarrollo de Habilidades Productivas y Emprendurismo

Talleres de tejido, bordado, pintura, bisuteria, reciclado, etc.
Gratuito, con aportacion voluntaria en algunos casos.
Afiliacion al INAPAM

Proceso para acceder a descuentos en servicios publicos.
Gratuito.
Reporte de Personas Mayores en Situacion de Vulnerabilidad

Registro de adultos mayores en situaciones de omision de cuidado.
Gratuito.`;

const intentCases: IntentCase[] = [
  { name: "listado CEMAM", input: "que tramites y/o servicios hay en el CEMAM", expected: "list" },
  { name: "boton rapido CEMAM", input: "Servicios en el CEMAM", expected: "list" },
  { name: "servicio directo servicios basicos", input: "Servicios Básicos y Asistenciales", expected: "direct_service" },
  { name: "listado ayuda alimentaria", input: "Qué servicios hay sobre ayuda alimentaria", expected: "list" },
  { name: "listado programas", input: "ver programas", expected: "list" },
  { name: "ayuda general", input: "No sé qué necesito", expected: "general_help" },
  { name: "servicio directo INAPAM", input: "Afiliación al INAPAM", expected: "direct_service" },
  { name: "servicio directo prematrimonial", input: "platicas prematrimoniales", expected: "direct_service" },
  { name: "servicio directo taller", input: "Taller de serigrafía", expected: "direct_service" },
  { name: "apartado requisitos", input: "requisitos", expected: "section_request" },
  { name: "apartado costo", input: "cuanto cuesta", expected: "section_request" },
  { name: "apartado horario", input: "horario de atención", expected: "section_request" },
  { name: "apartado lugar", input: "donde queda", expected: "section_request" },
  { name: "ficha completa", input: "dame la ficha completa", expected: "complete_record" },
  { name: "todos los datos", input: "quiero todos los datos", expected: "complete_record" },
  { name: "saludo ambiguo", input: "hola", expected: "ambiguous" },
  { name: "ayuda ambigua", input: "ayuda", expected: "ambiguous" },
  { name: "informacion complementaria", input: "que es el DIF", expected: "complementary" },
  { name: "fuera de alcance", input: "como tramito mi pasaporte", expected: "out_of_scope" },
  { name: "emergencia", input: "hay una emergencia y peligro inmediato", expected: "emergency" },
  { name: "riesgo por maltrato", input: "mi vecino golpea a sus hijos, que puedo hacer", expected: "emergency" },
  { name: "riesgo adulto mayor", input: "hay un adulto mayor abandonado", expected: "emergency" },
  { name: "contacto humano", input: "quiero hablar con una persona real", expected: "human_handoff" },
  {
    name: "seleccion numerica desde listado",
    input: "5",
    expected: "service_selection",
    messages: [
      { role: "assistant", content: cemamList },
      { role: "user", content: "5" },
    ],
  },
  {
    name: "seleccion numerica desde listado descriptivo",
    input: "1",
    expected: "service_selection",
    messages: [
      { role: "assistant", content: cemamDescriptiveList },
      { role: "user", content: "1" },
    ],
  },
  {
    name: "numero desde menu es solicitud de apartado",
    input: "4",
    expected: "section_request",
    messages: [
      { role: "assistant", content: sectionMenu },
      { role: "user", content: "4" },
    ],
  },
  {
    name: "numero desde saludo inicial es opcion inicial",
    input: "3",
    expected: "general_help",
    messages: [
      { role: "assistant", content: initialWelcome },
      { role: "user", content: "3" },
    ],
  },
];

const responseCases: ResponseCase[] = [
  {
    name: "seleccion numerica devuelve menu",
    messages: [
      { role: "assistant", content: cemamList },
      { role: "user", content: "5" },
    ],
    includes: ["Afiliacion al INAPAM", "Te acompaño con este servicio", "¿Qué información quieres conocer?", "8. Ficha completa"],
    excludes: ["Proceso para inscribir", "Documentación requerida", "Servicio gratuito"],
  },
  {
    name: "seleccion numerica desde listado descriptivo devuelve menu",
    messages: [
      { role: "assistant", content: cemamDescriptiveList },
      { role: "user", content: "1" },
    ],
    includes: ["Servicios Basicos y Asistenciales", "En breve: Atencion en estetica, comedor, transporte y biblioteca.", "¿Qué información quieres conocer?", "8. Ficha completa"],
    excludes: ["Gratuito"],
  },
  {
    name: "servicio directo devuelve menu",
    messages: [{ role: "user", content: "Afiliación al INAPAM" }],
    includes: ["Afiliación al INAPAM", "Te acompaño con este servicio", "¿Qué información quieres conocer?", "3. Requisitos"],
    excludes: ["Proceso para inscribir", "Adultos mayores", "Servicio gratuito"],
  },
  {
    name: "directo prematrimonial devuelve menu",
    messages: [{ role: "user", content: "platicas prematrimoniales" }],
    includes: ["platicas prematrimoniales", "Te acompaño con este servicio", "¿Qué información quieres conocer?", "4. Costos"],
    excludes: ["Cuota aproximada", "actas de nacimiento", "comprobante de transferencia"],
  },
  {
    name: "numero desde menu no genera respuesta deterministica",
    messages: [
      { role: "assistant", content: sectionMenu },
      { role: "user", content: "4" },
    ],
    includes: [],
    excludes: [],
  },
  {
    name: "numero 3 desde saludo inicial devuelve grupos",
    messages: [
      { role: "assistant", content: initialWelcome },
      { role: "user", content: "3" },
    ],
    includes: ["grupo de atención", "Personas mayores", "Personas con discapacidad"],
    excludes: ["Requisitos", "Talleres deportivos"],
  },
  {
    name: "listado amplio no se intercepta como servicio directo",
    messages: [{ role: "user", content: "que servicios hay en el CEMAM" }],
    includes: [],
    excludes: [],
  },
  {
    name: "saludo devuelve orientacion UX",
    messages: [{ role: "user", content: "hola" }],
    includes: ["Para orientarte mejor", "Buscar un trámite o servicio", "Ver programas o talleres"],
    excludes: ["No encontré ese dato", "Ficha completa"],
  },
  {
    name: "complementaria evita inventar",
    messages: [{ role: "user", content: "que es el DIF" }],
    includes: ["orientación general", "trámite, servicio, programa, taller o apoyo"],
    excludes: ["Presidencia", "requisitos"],
  },
  {
    name: "fuera de alcance redirige",
    messages: [{ role: "user", content: "como tramito mi pasaporte" }],
    includes: ["Solo puedo orientar", "dependencia oficial correspondiente"],
    excludes: ["requisitos del pasaporte", "costo del pasaporte"],
  },
  {
    name: "emergencia deriva a 911",
    messages: [{ role: "user", content: "hay una emergencia con peligro inmediato" }],
    includes: ["llama al 911", "no sustituyo atención de emergencia"],
    excludes: ["ficha completa", "requisitos"],
  },
  {
    name: "riesgo por maltrato activa protocolo prioritario",
    messages: [{ role: "user", content: "mi vecino golpea a sus hijos, que puedo hacer" }],
    includes: ["llama al 911", "servicios de reporte", "Niñas, niños o adolescentes"],
    excludes: ["ficha completa", "requisitos"],
  },
  {
    name: "contacto humano pide tema",
    messages: [{ role: "user", content: "quiero hablar con una persona real" }],
    includes: ["Para atención con una persona", "Adultos mayores", "Ayuda alimentaria"],
    excludes: ["No encontré ese dato", "911"],
  },
];

const stateCases: StateCase[] = [
  { name: "estado listado", input: "que servicios hay en el CEMAM", expected: "searching_service" },
  { name: "estado servicio directo", input: "Afiliacion al INAPAM", expected: "service_selected" },
  {
    name: "estado apartado",
    input: "4",
    expected: "section_selected",
    messages: [
      { role: "assistant", content: sectionMenu },
      { role: "user", content: "4" },
    ],
  },
  { name: "estado fuera de alcance", input: "como tramito mi pasaporte", expected: "out_of_scope" },
  { name: "estado contacto humano", input: "quiero hablar con una persona real", expected: "requires_human" },
  { name: "estado emergencia", input: "hay peligro inmediato", expected: "emergency" },
];

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(message);
}

let passed = 0;
let failed = 0;

for (const testCase of intentCases) {
  try {
    const messages = testCase.messages || [{ role: "user", content: testCase.input }];
    const actual = classifyConversationIntent(testCase.input, messages);
    assert(actual === testCase.expected, `${testCase.name}: esperado ${testCase.expected}, recibido ${actual}`);
    passed += 1;
  } catch (error) {
    failed += 1;
    console.error(`FAIL intent - ${testCase.name}: ${(error as Error).message}`);
  }
}

for (const testCase of responseCases) {
  try {
    const actual = getDeterministicWidgetResponse(testCase.messages);
    if (testCase.includes.length === 0 && testCase.excludes.length === 0) {
      assert(actual === null, `${testCase.name}: esperado null, recibido ${actual}`);
    } else {
      assert(typeof actual === "string", `${testCase.name}: esperado respuesta deterministica`);
      for (const expectedText of testCase.includes) {
        assert(actual!.includes(expectedText), `${testCase.name}: falta "${expectedText}"`);
      }
      for (const forbiddenText of testCase.excludes) {
        assert(!actual!.includes(forbiddenText), `${testCase.name}: no debe incluir "${forbiddenText}"`);
      }
    }
    passed += 1;
  } catch (error) {
    failed += 1;
    console.error(`FAIL response - ${testCase.name}: ${(error as Error).message}`);
  }
}

for (const testCase of stateCases) {
  try {
    const messages = testCase.messages || [{ role: "user", content: testCase.input }];
    const actual = deriveConversationState(testCase.input, messages);
    assert(actual === testCase.expected, `${testCase.name}: esperado ${testCase.expected}, recibido ${actual}`);
    passed += 1;
  } catch (error) {
    failed += 1;
    console.error(`FAIL state - ${testCase.name}: ${(error as Error).message}`);
  }
}

try {
  const options = extractServiceOptionsFromList(cemamList);
  assert(options.length === 5, `extractServiceOptionsFromList: esperado 5, recibido ${options.length}`);
  assert(options[4] === "Afiliacion al INAPAM", "extractServiceOptionsFromList: opcion 5 incorrecta");
  const descriptiveOptions = extractServiceOptionsFromList(cemamDescriptiveList);
  assert(descriptiveOptions.length === 4, `extractServiceOptionsFromList descriptivo: esperado 4, recibido ${descriptiveOptions.length}`);
  assert(descriptiveOptions[0] === "Servicios Basicos y Asistenciales", "extractServiceOptionsFromList descriptivo: opcion 1 incorrecta");
  const descriptiveOptionsWithDescriptions = extractServiceOptionsWithDescriptionsFromList(cemamDescriptiveList);
  assert(
    descriptiveOptionsWithDescriptions[0]?.description === "Atencion en estetica, comedor, transporte y biblioteca.",
    "extractServiceOptionsWithDescriptionsFromList: descripcion de opcion 1 incorrecta",
  );
  assert(
    getRequestedSectionLabel("1", [
      { role: "assistant", content: sectionMenu },
      { role: "user", content: "1" },
    ]) === "En qué consiste",
    "getRequestedSectionLabel: número 1 no mapea a En qué consiste",
  );

  const runtimePrompt = buildRuntimeSystemPrompt("Prompt base", "Contexto RAG");
  assert(runtimePrompt.includes("POLITICA RUNTIME DE CONVERSACION"), "runtime prompt sin politica");
  assert(runtimePrompt.includes("Contexto RAG"), "runtime prompt sin contexto RAG");
  assert(runtimePrompt.includes("consulta es ambigua"), "runtime prompt sin politica UX ambigua");
  assert(buildAmbiguousHelpResponse().includes("Buscar un trámite o servicio"), "respuesta ambigua sin opciones");
  assert(
    getActiveServiceName([
      { role: "assistant", content: sectionMenu },
      { role: "user", content: "cuanto cuesta ese servicio" },
    ]) === "Afiliacion al INAPAM",
    "getActiveServiceName: no detecta servicio activo desde menu",
  );
  passed += 8;
} catch (error) {
  failed += 1;
  console.error(`FAIL support - ${(error as Error).message}`);
}

console.log(`Evaluacion conversacional: ${passed} pasaron, ${failed} fallaron.`);

if (failed > 0) {
  process.exit(1);
}

