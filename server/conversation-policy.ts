export type ConversationMessage = {
  role: string;
  content: string;
};

export type ConversationIntent =
  | "list"
  | "service_selection"
  | "direct_service"
  | "section_request"
  | "complete_record"
  | "ambiguous"
  | "complementary"
  | "out_of_scope"
  | "emergency"
  | "human_handoff"
  | "general_help"
  | "unknown";

export type ConversationState =
  | "searching_service"
  | "service_selected"
  | "section_selected"
  | "out_of_scope"
  | "requires_human"
  | "emergency"
  | "unknown";

type ServiceOption = {
  name: string;
  description?: string;
};

const SECTION_KEYWORDS =
  /\b(requisitos?|costos?|cuanto|cu[aá]nto|horario|vigencia|convocatoria|lugar|donde queda|d[oó]nde queda|direccion|direcci[oó]n|telefono|tel[eé]fono|contacto|en que consiste|en qu[eé] consiste|a quien va dirigido|a qui[eé]n va dirigido|detalles?|m[aá]s detalles?|ampliar|pasos?|procedimiento|proceso|como lo hago|c[oó]mo lo hago|que sigue|qu[eé] sigue)\b/i;

const COMPLETE_RECORD_KEYWORDS =
  /\b(ficha completa|todos los datos|toda la informacion|toda la informaci[oó]n|detalle completo|proceso completo)\b/i;

const LIST_KEYWORDS =
  /\b(que servicios hay|qu[eé] servicios hay|cu[aá]les servicios|listado|tr[aá]mites y(?:\/o)? servicios|que apoyos|qu[eé] apoyos|servicios sobre|servicios del|servicios en|servicios para|ver programas|ver por grupo)\b/i;

const DIRECT_SERVICE_MARKERS =
  /\b(afiliaci[oó]n|pl[aá]ticas?|prematrimoniales?|programa|taller(?:es)?|solicitud|reporte|servicios? b[aá]sicos|servicio m[eé]dico|alimentaci[oó]n escolar|inapam|adopci[oó]n|adoptiva|acogida|despensas?|despendas?|alimentaria|pensi[oó]n|alimenticia|trabajo social)\b/i;

const GREETING_KEYWORDS =
  /^(hola|buenos dias|buenas tardes|buenas noches|buen dia|hey|saludos)[!.?\s]*$/i;

const AMBIGUOUS_HELP_KEYWORDS =
  /^(ayuda|informacion|informaci[oó]n|necesito apoyo|quiero apoyo|orientame|ori[eé]ntame|que hago|qu[eé] hago)[!.?\s]*$/i;

const HUMAN_HANDOFF_KEYWORDS =
  /\b(hablar con alguien|asesor humano|persona real|contacto humano|operador|atienda una persona|quiero llamar|quiero comunicarme|atencion presencial|atenci[oó]n presencial)\b/i;

const EMERGENCY_KEYWORDS =
  /\b(emergencia|peligro inmediato|riesgo inmediato|me quiero suicidar|suicidio|violencia en este momento|me estan agrediendo|me est[aá]n agrediendo|amenaza inmediata|lesion grave|lesi[oó]n grave)\b/i;

const SAFETY_RISK_KEYWORDS =
  /\b(violencia|maltrato|golpea|golpes|abuso|abandono|peligro|riesgo|amenaza|ninos en riesgo|ni[nñ]os en riesgo|ni[nñ]as en riesgo|adulto mayor abandonado|persona mayor abandonada|omision de cuidado|omisi[oó]n de cuidado)\b/i;

const OUT_OF_SCOPE_KEYWORDS =
  /\b(clima|pronostico|pron[oó]stico|futbol|f[uú]tbol|receta de cocina|matematicas|matem[aá]ticas|tarea escolar|programar en|codigo fuente|c[oó]digo fuente|pasaporte|licencia de conducir|predial|multas de transito|multas de tr[aá]nsito|curp en linea|curp en l[ií]nea)\b/i;

const COMPLEMENTARY_KEYWORDS =
  /\b(que es el dif|qu[eé] es el dif|que hace el dif|qu[eé] hace el dif|como funciona|c[oó]mo funciona|base de conocimiento|servicios publicos|servicios p[uú]blicos|informacion general|informaci[oó]n general)\b/i;

const SECTION_BY_NUMBER: Record<number, string> = {
  1: "En qué consiste",
  2: "A quién va dirigido",
  3: "Requisitos",
  4: "Costos",
  5: "Horario, vigencia o convocatoria",
  6: "Lugar y contacto",
  7: "Nota importante",
  8: "Ficha completa",
};

function normalizeForIntent(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function mentionsSpecificServiceTopic(content: string): boolean {
  const normalized = normalizeForIntent(content);
  return /\b(platicas prematrimoniales|prematrimoniales|inapam|cemam|kokone|autismo|talleres deportivos|ayuda alimentaria|asistencia alimentaria|despensa|despenda|carril rosa|testamento|habiliteca|caic|nido|adopcion|adoptar|adoptiva|acogida|pension|alimenticia|trabajo social|discapacidad)\b/.test(normalized);
}

export function buildServiceSectionMenu(serviceName: string, description?: string): string {
  const cleanDescription = description?.trim();

  return `${serviceName}

${cleanDescription ? `En breve: ${cleanDescription}` : "Te acompaño con este servicio. Puedo mostrarte la información por partes para que sea más fácil revisarla."}

¿Qué información quieres conocer?

1. En qué consiste
2. A quién va dirigido
3. Requisitos
4. Costos
5. Horario, vigencia o convocatoria
6. Lugar y contacto
7. Nota importante
8. Ficha completa

Puedes escribir el número o el apartado. También puedes pedir "ficha completa".
`;
}

export function buildAmbiguousHelpResponse(): string {
  return `Para orientarte mejor, dime qué necesitas o elige una opción:

1. Buscar un trámite o servicio
2. Ver programas o talleres
3. Ver servicios por grupo de atención
4. Hablar con una persona o pedir canal de atención

Si ya tienes un tema, puedes escribirlo directamente.`;
}

export function buildComplementaryInfoResponse(): string {
  return `Puedo darte orientación general sobre el DIF Zapopan, pero para evitar datos incorrectos necesito relacionarlo con un trámite, servicio, programa, taller o apoyo disponible.

Puedes preguntarme, por ejemplo:

1. Qué servicios hay para personas mayores
2. Qué apoyos alimentarios existen
3. Qué talleres hay
4. Buscar un trámite específico`;
}

export function buildOutOfScopeResponse(): string {
  return `Solo puedo orientar sobre trámites, servicios, programas, talleres y apoyos del DIF Zapopan.

Para ese tema, consulta el portal o dependencia oficial correspondiente.

Si tu consulta está relacionada con DIF Zapopan, dime el trámite, servicio, programa o grupo de atención que quieres revisar.`;
}

export function buildEmergencyResponse(): string {
  return `Si hay peligro inmediato o una emergencia, llama al 911 ahora.

Yo puedo orientar sobre servicios del DIF Zapopan, pero no sustituyo atención de emergencia ni intervención de una autoridad.

Cuando la situación esté segura, puedo ayudarte a buscar servicios relacionados con atención, reportes, apoyo o canalización.`;
}

export function buildSafetyRiskResponse(): string {
  return `Lamento la situación. Si hay riesgo inmediato para una niña, niño, adolescente, persona adulta mayor o cualquier persona, llama al 911.

También puedo orientarte con servicios de reporte y atención del DIF Zapopan relacionados con maltrato, abandono, violencia o situación de vulnerabilidad.

Para ayudarte mejor, dime si se trata de:

1. Niñas, niños o adolescentes
2. Personas adultas mayores
3. Violencia familiar
4. Otra situación de riesgo`;
}

export function buildHumanHandoffResponse(): string {
  return `Puedo ayudarte a ubicar el servicio correcto antes de canalizarte.

Para atención con una persona, indica el tema principal:

1. Adultos mayores
2. Niñas, niños y adolescentes
3. Ayuda alimentaria
4. Talleres o programas
5. Reporte o situación vulnerable

Si ya sabes el servicio, escribe su nombre y te muestro lugar y contacto disponibles en la base de conocimiento.`;
}

export function isInitialWelcomeMenu(content: string): boolean {
  return /buscar un tr[aá]mite o servicio/i.test(content) &&
    /no s[eé] que necesito|no s[eé] qué necesito/i.test(content) &&
    /ver por grupo de atenci[oó]n/i.test(content) &&
    /ver programas o talleres/i.test(content);
}

export function buildInitialMenuOptionResponse(option: number): string | null {
  if (option === 1) {
    return `Escribe el nombre del trámite, servicio, programa, taller o apoyo que buscas.

Ejemplos:
1. Pláticas prematrimoniales
2. INAPAM
3. Ayuda alimentaria
4. Talleres deportivos`;
  }

  if (option === 2) {
    return buildAmbiguousHelpResponse();
  }

  if (option === 3) {
    return `Puedo ayudarte por grupo de atención. Escribe el número o el grupo que quieres revisar:

1. Personas mayores
2. Niñas, niños y adolescentes
3. Personas con discapacidad
4. Familias
5. Mujeres
6. Personas en situación vulnerable`;
  }

  if (option === 4) {
    return `Puedo buscar programas o talleres disponibles.

Puedes escribir, por ejemplo:
1. Talleres deportivos
2. Talleres recreativos
3. Talleres educativos
4. Apoyos alimentarios
5. Programas para personas mayores`;
  }

  return null;
}

function isInitialNumericMenuSelection(
  selectedNumber: number,
  messages: ConversationMessage[] = [],
): boolean {
  if (selectedNumber < 1 || selectedNumber > 4) return false;

  const hasAssistantMessage = messages.some((message) => message.role === "assistant");
  if (hasAssistantMessage) return false;

  const userMessages = messages.filter((message) => message.role === "user");
  return userMessages.length <= 1;
}

function normalizeServiceLine(line: string): string {
  return line.trim().replace(/^\*+\s*/, "").replace(/\*+$/, "").replace(/^\d+[\).\-\s]+/, "").trim();
}

function isLikelyDescriptionLine(line: string): boolean {
  return line.length > 0 && /[.!?]$/.test(line) && line.split(/\s+/).length >= 3;
}

function isLikelyServiceHeading(line: string): boolean {
  return line.length > 0 && !/[.!?:]$/.test(line) && line.split(/\s+/).length <= 10;
}

export function extractServiceOptionsWithDescriptionsFromList(content: string): ServiceOption[] {
  const isServiceSelectionPrompt =
    /cu[aá]l(?:es)? de estos servicios|cu[aá]l quieres consultar|escribir el n[uú]mero o el nombre|opciones relacionadas/i.test(content);
  const isSectionMenu =
    /qu[eé] informacion quieres conocer|qu[eé] información quieres conocer|ficha completa|en que consiste|en qué consiste/i.test(content) &&
    /requisitos|costos|lugar y contacto/i.test(content);

  if (isSectionMenu) return [];

  const ignoredLine = /^[¿?]?(servicios ofrecidos|encontr[eé] estas opciones|cu[aá]l|puedes escribir|escribe el n[uú]mero|centro de estancias)/i;
  const rawLines = content
    .split(/\r?\n/)
    .map(normalizeServiceLine)
    .filter((line) => line.length > 0);

  const numberedOptions = rawLines
    .filter((line) => !ignoredLine.test(line))
    .filter((line) => !line.endsWith(":"))
    .filter((line) => !/[.!?]$/.test(line))
    .map((name, index) => {
      const originalIndex = rawLines.indexOf(name);
      const next = rawLines[originalIndex + 1] || "";
      return {
        name,
        description: isLikelyDescriptionLine(next) && !ignoredLine.test(next) ? next : undefined,
      };
    })
    .slice(0, 12);

  if (isServiceSelectionPrompt) return numberedOptions;

  const inferredOptions = rawLines
    .map<ServiceOption | null>((line, index) => {
      const next = rawLines[index + 1] || "";
      const hasDescriptionAfter = isLikelyDescriptionLine(next);
      const looksLikeHeading = isLikelyServiceHeading(line);
      const isIntro = ignoredLine.test(line) || /hola|puedo orientarte|elige una opcion/i.test(line);
      const isContinuation = /gratuito|incluye|atencion|talleres|proceso|registro|puedes escribir/i.test(line);
      if (!looksLikeHeading || !hasDescriptionAfter || isIntro || isContinuation) return null;
      return { name: line, description: next };
    })
    .filter((option): option is ServiceOption => option !== null)
    .slice(0, 12);

  return inferredOptions;
}

export function extractServiceOptionsFromList(content: string): string[] {
  return extractServiceOptionsWithDescriptionsFromList(content).map((option) => option.name);
}

export function extractServiceNameFromSectionMenu(content: string): string | null {
  const isSectionMenu =
    /que informacion quieres conocer|ficha completa/i.test(content) &&
    /requisitos|costos|lugar y contacto/i.test(content);

  const sectionLabels = new Set([
    "en que consiste",
    "en qué consiste",
    "a quien va dirigido",
    "a quién va dirigido",
    "requisitos",
    "costos",
    "horario, vigencia o convocatoria",
    "lugar y contacto",
    "nota importante",
    "ficha completa",
  ]);

  const nonEmptyLines = content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  if (isSectionMenu) return nonEmptyLines[0] || null;

  const firstLine = nonEmptyLines[0];
  const secondLine = nonEmptyLines[1];
  if (firstLine && secondLine && sectionLabels.has(secondLine.toLowerCase())) {
    return firstLine;
  }

  return null;
}

export function getActiveServiceName(messages: ConversationMessage[]): string | null {
  return [...messages]
    .reverse()
    .filter((message) => message.role === "assistant")
    .map((message) => extractServiceNameFromSectionMenu(message.content))
    .find((serviceName): serviceName is string => Boolean(serviceName)) || null;
}

export function normalizeDirectServiceName(content: string): string {
  return content
    .trim()
    .replace(/\s+/g, " ")
    .replace(/^(sobre|acerca de|informacion sobre|informaci[oó]n sobre)\s+/i, "")
    .trim();
}

export function getSectionLabelByNumber(sectionNumber: number): string | null {
  return SECTION_BY_NUMBER[sectionNumber] || null;
}

export function getRequestedSectionLabel(
  content: string,
  messages: ConversationMessage[] = [],
): string | null {
  const normalized = content.trim().replace(/\s+/g, " ");
  const selectedNumber = Number.parseInt(normalized, 10);

  if (Number.isInteger(selectedNumber)) {
    const previousAssistant = [...messages]
      .slice(0, -1)
      .reverse()
      .find((message) => message.role === "assistant");

    if (previousAssistant && extractServiceNameFromSectionMenu(previousAssistant.content)) {
      return getSectionLabelByNumber(selectedNumber);
    }
  }

  if (/\brequisitos?\b/i.test(normalized)) return "Requisitos";
  if (/\b(costos?|cuanto|cu[aá]nto)\b/i.test(normalized)) return "Costos";
  if (/\b(horario|vigencia|convocatoria)\b/i.test(normalized)) return "Horario, vigencia o convocatoria";
  if (/\b(lugar|donde queda|d[oó]nde queda|direccion|direcci[oó]n|telefono|tel[eé]fono|contacto)\b/i.test(normalized)) return "Lugar y contacto";
  if (/\ben que consiste\b/i.test(normalized)) return "En que consiste";
  if (/\ba quien va dirigido\b/i.test(normalized)) return "A quien va dirigido";
  if (/\bnota importante\b/i.test(normalized)) return "Nota importante";
  if (COMPLETE_RECORD_KEYWORDS.test(normalized)) return "Ficha completa";

  return null;
}

export function looksLikeDirectServiceName(content: string): boolean {
  const normalized = normalizeDirectServiceName(content);
  if (!normalized) return false;

  const lower = normalized.toLowerCase();
  const wordCount = normalized.split(" ").length;
  const asksForList = /\b(que|qu[eé]|cuales|cu[aá]les|listado|tramites|tr[aá]mites|apoyos|hay|tienen|ver)\b/i.test(lower);
  const asksForDetail = SECTION_KEYWORDS.test(lower) || COMPLETE_RECORD_KEYWORDS.test(lower);

  return wordCount <= 8 && !asksForList && !asksForDetail && DIRECT_SERVICE_MARKERS.test(lower);
}

export function classifyConversationIntent(
  content: string,
  messages: ConversationMessage[] = [],
): ConversationIntent {
  const normalized = content.trim().replace(/\s+/g, " ");
  const selectedNumber = Number.parseInt(normalized, 10);

  if (COMPLETE_RECORD_KEYWORDS.test(normalized)) return "complete_record";
  if (EMERGENCY_KEYWORDS.test(normalized)) return "emergency";
  if (SAFETY_RISK_KEYWORDS.test(normalized)) return "emergency";
  if (HUMAN_HANDOFF_KEYWORDS.test(normalized)) return "human_handoff";
  if (SECTION_KEYWORDS.test(normalized)) return "section_request";
  if (LIST_KEYWORDS.test(normalized)) return "list";
  if (OUT_OF_SCOPE_KEYWORDS.test(normalized)) return "out_of_scope";
  if (COMPLEMENTARY_KEYWORDS.test(normalized)) return "complementary";
  if (GREETING_KEYWORDS.test(normalized) || AMBIGUOUS_HELP_KEYWORDS.test(normalized)) return "ambiguous";
  if (/\b(no se que necesito|no s[eé] qu[eé] necesito|necesito ayuda|busco un servicio)\b/i.test(normalized)) {
    return "general_help";
  }
  if (looksLikeDirectServiceName(normalized)) return "direct_service";

  if (Number.isInteger(selectedNumber) && selectedNumber > 0) {
    const previousAssistant = [...messages]
      .slice(0, -1)
      .reverse()
      .find((message) => message.role === "assistant");

    if (!previousAssistant && isInitialNumericMenuSelection(selectedNumber, messages)) {
      return "general_help";
    }

    if (previousAssistant && isInitialWelcomeMenu(previousAssistant.content)) {
      return "general_help";
    }

    if (previousAssistant && extractServiceOptionsFromList(previousAssistant.content).length > 0) {
      return "service_selection";
    }

    if (previousAssistant && extractServiceNameFromSectionMenu(previousAssistant.content)) {
      return selectedNumber === 8 ? "complete_record" : "section_request";
    }
  }

  return "unknown";
}

export function deriveConversationState(
  content: string,
  messages: ConversationMessage[] = [],
): ConversationState {
  const intent = classifyConversationIntent(content, messages);

  if (intent === "emergency") return "emergency";
  if (intent === "human_handoff") return "requires_human";
  if (intent === "out_of_scope") return "out_of_scope";
  if (intent === "direct_service" || intent === "service_selection") return "service_selected";
  if (intent === "section_request" || intent === "complete_record") return "section_selected";
  if (intent === "list" || intent === "ambiguous" || intent === "general_help" || intent === "complementary") {
    return "searching_service";
  }

  return "unknown";
}

export function getDeterministicWidgetResponse(messages: ConversationMessage[]): string | null {
  const lastMessage = messages[messages.length - 1];
  if (!lastMessage || lastMessage.role !== "user") return null;

  const currentContent = lastMessage.content.trim();
  const currentIntent = classifyConversationIntent(currentContent, messages);
  const selectedNumber = Number.parseInt(currentContent, 10);

  if (currentIntent === "ambiguous" || (currentIntent === "general_help" && !Number.isInteger(selectedNumber))) {
    return buildAmbiguousHelpResponse();
  }
  if (currentIntent === "complementary") {
    return buildComplementaryInfoResponse();
  }
  if (currentIntent === "out_of_scope") {
    return buildOutOfScopeResponse();
  }
  if (currentIntent === "emergency") {
    return EMERGENCY_KEYWORDS.test(currentContent)
      ? buildEmergencyResponse()
      : buildSafetyRiskResponse();
  }
  if (currentIntent === "human_handoff") {
    return buildHumanHandoffResponse();
  }

  if (!Number.isInteger(selectedNumber) || selectedNumber < 1) {
    if (looksLikeDirectServiceName(currentContent)) {
      return buildServiceSectionMenu(normalizeDirectServiceName(currentContent));
    }
    return null;
  }

  const previousAssistant = [...messages]
    .slice(0, -1)
    .reverse()
    .find((message) => message.role === "assistant");

  if (!previousAssistant) {
    return buildInitialMenuOptionResponse(selectedNumber);
  }

  if (isInitialWelcomeMenu(previousAssistant.content)) {
    return buildInitialMenuOptionResponse(selectedNumber);
  }

  const serviceOptions = extractServiceOptionsWithDescriptionsFromList(previousAssistant.content);
  const selectedService = serviceOptions[selectedNumber - 1];
  if (!selectedService) return null;

  return buildServiceSectionMenu(selectedService.name, selectedService.description);
}

export function buildRuntimeSystemPrompt(systemPrompt: string | null | undefined, knowledgeContext: string): string {
  const basePrompt = systemPrompt || "You are a helpful assistant.";

  return `${basePrompt}

=== POLITICA RUNTIME DE CONVERSACION ===
Estas reglas son obligatorias y tienen prioridad sobre los fragmentos RAG:
1. Si la intención es LISTADO, responde solo nombres de servicios y pregunta cuál quiere consultar.
2. Si la intención es SELECCIÓN DE SERVICIO o SERVICIO DIRECTO, responde con: nombre del servicio sin corchetes, una descripción breve tomada de los fragmentos, y después el menú de apartados.
3. Si la intención es APARTADO, responde solo ese apartado en máximo 5 viñetas breves.
4. Si la intención es FICHA COMPLETA, entrega todos los apartados, pero resume cada apartado en máximo 3 viñetas breves.
5. Nunca conviertas una selección de servicio en ficha completa.
6. Nunca inventes datos faltantes; usa "No encontré ese dato en la información disponible."
7. Si la consulta es ambigua, pide una aclaración breve y ofrece opciones.
8. Si la consulta está fuera de DIF Zapopan, dilo con claridad y redirige al portal o dependencia oficial correspondiente.
9. Si el usuario describe violencia, maltrato, golpes, abuso, abandono, riesgo o emergencia, activa protocolo prioritario: indica llamar al 911 si hay riesgo inmediato y después orienta a servicios de reporte o atención del DIF Zapopan.
10. Si el usuario pide hablar con una persona, ayuda a ubicar el tema o servicio y ofrece pedir lugar/contacto si está en la base de conocimiento.
11. Para información complementaria relacionada con DIF, responde en general solo si no inventas datos; después pide que el usuario elija trámite, servicio, programa, taller o apoyo.
12. Cuando el usuario conteste con un número desde el menú de apartados: 1=En qué consiste, 2=A quién va dirigido, 3=Requisitos, 4=Costos, 5=Horario/vigencia/convocatoria, 6=Lugar y contacto, 7=Nota importante, 8=Ficha completa.
13. Formato obligatorio para servicio seleccionado:
[Nombre del servicio]

En breve: [una sola frase breve sobre de qué trata el servicio, usando solo los fragmentos disponibles. Si no hay descripción, escribe: Puedo mostrarte la información por partes para que sea más fácil revisarla.]

¿Qué información quieres conocer?

1. En qué consiste
2. A quién va dirigido
3. Requisitos
4. Costos
5. Horario, vigencia o convocatoria
6. Lugar y contacto
7. Nota importante
8. Ficha completa

Puedes escribir el número o el apartado. También puedes pedir "ficha completa".
14. Nunca pongas el nombre del servicio entre corchetes en la respuesta final.
15. Cuando ya haya un servicio activo y el usuario pregunte por "ese servicio", costo, requisitos, documentación, ubicación, horario, teléfono, contacto o ficha completa, responde usando exclusivamente la información del servicio activo. No mezcles información de otros servicios.
16. Si un campo solicitado no aparece en la información recuperada, di que no está especificado. No sugieras documentos, costos, horarios, teléfonos ni ubicaciones no recuperadas.
17. Para preguntas de ubicación o contacto, prioriza dirección, informes_en, informes_telefonos, departamento, horario_atencion y url_principal.
18. En trámites y servicios, solo ofrece o desarrolla registros activos/vigentes. Si un trámite o servicio no aparece como activo en la información recuperada, responde que no encontraste ese trámite o servicio activo en la información disponible.
19. Usa ortografía institucional con acentos: "Encontré", "Cuál", "Qué información", "Trámite", "También", "Número", "Acompaño". No escribas "Encontre", "Cual", "Que informacion" ni "acompanó/acompaño" sin tilde.
20. Si el usuario pide pasos, proceso, procedimiento o "qué sigue", responde esos pasos solo si aparecen explícitamente como pasos/procedimiento en los fragmentos. Si no aparecen, responde: "No encontré pasos especificados en la información disponible." No conviertas requisitos, ubicación u horarios en pasos.
21. Evita respuestas largas. Para celular, prioriza frases cortas, viñetas breves y solo el dato solicitado.
=== FIN POLITICA RUNTIME ===

${knowledgeContext}`;
}
