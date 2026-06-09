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

const SECTION_KEYWORDS =
  /\b(requisitos?|costos?|cuanto|cu[aá]nto|horario|vigencia|convocatoria|lugar|donde queda|d[oó]nde queda|direccion|direcci[oó]n|telefono|tel[eé]fono|contacto|en que consiste|a quien va dirigido)\b/i;

const COMPLETE_RECORD_KEYWORDS =
  /\b(ficha completa|todos los datos|toda la informacion|toda la informaci[oó]n|detalle completo|proceso completo)\b/i;

const LIST_KEYWORDS =
  /\b(que servicios hay|qu[eé] servicios hay|cu[aá]les servicios|listado|tr[aá]mites y(?:\/o)? servicios|que apoyos|qu[eé] apoyos|servicios sobre|servicios del|servicios para|ver programas|ver por grupo)\b/i;

const DIRECT_SERVICE_MARKERS =
  /\b(afiliaci[oó]n|pl[aá]ticas?|prematrimoniales?|programa|taller(?:es)?|solicitud|reporte|servicio m[eé]dico|alimentaci[oó]n escolar|inapam)\b/i;

const GREETING_KEYWORDS =
  /^(hola|buenos dias|buenas tardes|buenas noches|buen dia|hey|saludos)[!.?\s]*$/i;

const AMBIGUOUS_HELP_KEYWORDS =
  /^(ayuda|informacion|informaci[oó]n|necesito apoyo|quiero apoyo|orientame|ori[eé]ntame|que hago|qu[eé] hago)[!.?\s]*$/i;

const HUMAN_HANDOFF_KEYWORDS =
  /\b(hablar con alguien|asesor humano|persona real|contacto humano|operador|atienda una persona|quiero llamar|quiero comunicarme|atencion presencial|atenci[oó]n presencial)\b/i;

const EMERGENCY_KEYWORDS =
  /\b(emergencia|peligro inmediato|riesgo inmediato|me quiero suicidar|suicidio|violencia en este momento|me estan agrediendo|me est[aá]n agrediendo|amenaza inmediata|lesion grave|lesi[oó]n grave)\b/i;

const OUT_OF_SCOPE_KEYWORDS =
  /\b(clima|pronostico|pron[oó]stico|futbol|f[uú]tbol|receta de cocina|matematicas|matem[aá]ticas|tarea escolar|programar en|codigo fuente|c[oó]digo fuente|pasaporte|licencia de conducir|predial|multas de transito|multas de tr[aá]nsito|curp en linea|curp en l[ií]nea)\b/i;

const COMPLEMENTARY_KEYWORDS =
  /\b(que es el dif|qu[eé] es el dif|que hace el dif|qu[eé] hace el dif|como funciona|c[oó]mo funciona|base de conocimiento|servicios publicos|servicios p[uú]blicos|informacion general|informaci[oó]n general)\b/i;

export function buildServiceSectionMenu(serviceName: string): string {
  return `${serviceName}

Que informacion quieres conocer?

1. En que consiste
2. A quien va dirigido
3. Requisitos
4. Costos
5. Horario, vigencia o convocatoria
6. Lugar y contacto
7. Nota importante
8. Ficha completa

Puedes escribir el numero o el apartado. Tambien puedes pedir "ficha completa".`;
}

export function buildAmbiguousHelpResponse(): string {
  return `Para orientarte mejor, dime que necesitas o elige una opcion:

1. Buscar un tramite o servicio
2. Ver programas o talleres
3. Ver servicios por grupo de atencion
4. Hablar con una persona o pedir canal de atencion

Si ya tienes un tema, puedes escribirlo directamente.`;
}

export function buildComplementaryInfoResponse(): string {
  return `Puedo darte orientacion general sobre el DIF Zapopan, pero para evitar datos incorrectos necesito relacionarlo con un tramite, servicio, programa, taller o apoyo disponible.

Puedes preguntarme, por ejemplo:

1. Que servicios hay para personas mayores
2. Que apoyos alimentarios existen
3. Que talleres hay
4. Buscar un tramite especifico`;
}

export function buildOutOfScopeResponse(): string {
  return `Solo puedo orientar sobre tramites, servicios, programas, talleres y apoyos del DIF Zapopan.

Para ese tema, consulta el portal o dependencia oficial correspondiente.

Si tu consulta esta relacionada con DIF Zapopan, dime el tramite, servicio, programa o grupo de atencion que quieres revisar.`;
}

export function buildEmergencyResponse(): string {
  return `Si hay peligro inmediato o una emergencia, llama al 911 ahora.

Yo puedo orientar sobre servicios del DIF Zapopan, pero no sustituyo atencion de emergencia ni intervencion de una autoridad.

Cuando la situacion este segura, puedo ayudarte a buscar servicios relacionados con atencion, reportes, apoyo o canalizacion.`;
}

export function buildHumanHandoffResponse(): string {
  return `Puedo ayudarte a ubicar el servicio correcto antes de canalizarte.

Para atencion con una persona, indica el tema principal:

1. Adultos mayores
2. Ninas, ninos y adolescentes
3. Ayuda alimentaria
4. Talleres o programas
5. Reporte o situacion vulnerable

Si ya sabes el servicio, escribe su nombre y te muestro lugar y contacto disponibles en la base de conocimiento.`;
}

export function extractServiceOptionsFromList(content: string): string[] {
  const isServiceSelectionPrompt =
    /cual(?:es)? de estos servicios|cual quieres consultar|escribir el numero o el nombre|opciones relacionadas/i.test(content);
  const isSectionMenu =
    /que informacion quieres conocer|ficha completa|en que consiste/i.test(content) &&
    /requisitos|costos|lugar y contacto/i.test(content);

  if (!isServiceSelectionPrompt || isSectionMenu) return [];

  const ignoredLine = /^[¿?]?(servicios ofrecidos|encontre estas opciones|cual|puedes escribir|escribe el numero|centro de estancias)/i;
  return content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .map((line) => line.replace(/^\d+[\).\-\s]+/, "").trim())
    .filter((line) => line.length > 0)
    .filter((line) => !ignoredLine.test(line))
    .filter((line) => !line.endsWith(":"))
    .slice(0, 12);
}

export function extractServiceNameFromSectionMenu(content: string): string | null {
  const isSectionMenu =
    /que informacion quieres conocer|ficha completa/i.test(content) &&
    /requisitos|costos|lugar y contacto/i.test(content);

  if (!isSectionMenu) return null;

  const firstLine = content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find((line) => line.length > 0);

  return firstLine || null;
}

export function looksLikeDirectServiceName(content: string): boolean {
  const normalized = content.trim().replace(/\s+/g, " ");
  if (!normalized) return false;

  const lower = normalized.toLowerCase();
  const wordCount = normalized.split(" ").length;
  const asksForList = /\b(que|qu[eé]|cuales|cu[aá]les|listado|servicios|tramites|tr[aá]mites|apoyos|hay|tienen|ver)\b/i.test(lower);
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

  if (currentIntent === "ambiguous" || currentIntent === "general_help") {
    return buildAmbiguousHelpResponse();
  }
  if (currentIntent === "complementary") {
    return buildComplementaryInfoResponse();
  }
  if (currentIntent === "out_of_scope") {
    return buildOutOfScopeResponse();
  }
  if (currentIntent === "emergency") {
    return buildEmergencyResponse();
  }
  if (currentIntent === "human_handoff") {
    return buildHumanHandoffResponse();
  }

  const selectedNumber = Number.parseInt(currentContent, 10);
  if (!Number.isInteger(selectedNumber) || selectedNumber < 1) {
    if (looksLikeDirectServiceName(currentContent)) {
      return buildServiceSectionMenu(currentContent);
    }
    return null;
  }

  const previousAssistant = [...messages]
    .slice(0, -1)
    .reverse()
    .find((message) => message.role === "assistant");

  if (!previousAssistant) return null;

  const serviceOptions = extractServiceOptionsFromList(previousAssistant.content);
  const selectedService = serviceOptions[selectedNumber - 1];
  if (!selectedService) return null;

  return buildServiceSectionMenu(selectedService);
}

export function buildRuntimeSystemPrompt(systemPrompt: string | null | undefined, knowledgeContext: string): string {
  const basePrompt = systemPrompt || "You are a helpful assistant.";

  return `${basePrompt}

=== POLITICA RUNTIME DE CONVERSACION ===
Estas reglas son obligatorias y tienen prioridad sobre los fragmentos RAG:
1. Si la intencion es LISTADO, responde solo nombres de servicios y pregunta cual quiere consultar.
2. Si la intencion es SELECCION DE SERVICIO, responde solo el menu de apartados.
3. Si la intencion es APARTADO, responde solo ese apartado.
4. Si la intencion es FICHA COMPLETA, entrega todos los apartados.
5. Nunca conviertas una seleccion de servicio en ficha completa.
6. Nunca inventes datos faltantes; usa "No encontre ese dato en la informacion disponible."
7. Si la consulta es ambigua, pide una aclaracion breve y ofrece opciones.
8. Si la consulta esta fuera de DIF Zapopan, dilo con claridad y redirige al portal o dependencia oficial correspondiente.
9. Si el usuario describe una emergencia o riesgo inmediato, indica llamar al 911 y aclara que no sustituyes atencion de emergencia.
10. Si el usuario pide hablar con una persona, ayuda a ubicar el tema o servicio y ofrece pedir lugar/contacto si esta en la base de conocimiento.
11. Para informacion complementaria relacionada con DIF, responde en general solo si no inventas datos; despues pide que el usuario elija tramite, servicio, programa, taller o apoyo.
=== FIN POLITICA RUNTIME ===

${knowledgeContext}`;
}
