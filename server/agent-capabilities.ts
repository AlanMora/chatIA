import type { InsertAgentSkill, InsertAgentTool } from "@shared/schema";
import { storage } from "./storage";

export const DEFAULT_AGENT_SKILLS: InsertAgentSkill[] = [
  {
    id: "government-service-orientation",
    name: "Orientacion de servicios gubernamentales",
    description: "Guia al ciudadano para encontrar tramites, servicios, programas, talleres y apoyos.",
    category: "gobierno",
    instructions:
      "Primero identifica necesidad, despues muestra opciones y finalmente entrega solo el apartado solicitado. No confirmes beneficios, citas ni registros.",
    isSystem: true,
    isActive: true,
  },
  {
    id: "service-section-flow",
    name: "Flujo por apartados",
    description: "Evita fichas completas no solicitadas y controla requisitos, costos, horario, lugar y contacto.",
    category: "conversacion",
    instructions:
      "Cuando el usuario seleccione un servicio, muestra menu de apartados. Entrega ficha completa solo si la pide explicitamente.",
    isSystem: true,
    isActive: true,
  },
  {
    id: "out-of-scope-safety",
    name: "Fuera de alcance y seguridad",
    description: "Maneja temas externos, emergencias y solicitudes de contacto humano.",
    category: "seguridad",
    instructions:
      "Si la consulta no corresponde a DIF Zapopan, redirige a la dependencia oficial. Si hay emergencia, indica llamar al 911.",
    isSystem: true,
    isActive: true,
  },
];

export const DEFAULT_AGENT_TOOLS: InsertAgentTool[] = [
  {
    id: "search_knowledge_base",
    name: "Buscar en base de conocimiento",
    description: "Recupera fragmentos relevantes de documentos cargados.",
    category: "knowledge",
    permission: "read",
    requiresConfirmation: false,
    schema: { input: { query: "string", chatbotId: "number" } },
    isSystem: true,
    isActive: true,
  },
  {
    id: "list_services_by_category",
    name: "Listar servicios por categoria",
    description: "Devuelve nombres de servicios relacionados con un tema o grupo de atencion.",
    category: "knowledge",
    permission: "read",
    requiresConfirmation: false,
    schema: { input: { category: "string", chatbotId: "number" } },
    isSystem: true,
    isActive: true,
  },
  {
    id: "get_service_record",
    name: "Obtener ficha de servicio",
    description: "Entrega apartados de un servicio cuando el usuario los solicita.",
    category: "knowledge",
    permission: "read",
    requiresConfirmation: false,
    schema: { input: { serviceName: "string", section: "string" } },
    isSystem: true,
    isActive: true,
  },
  {
    id: "export_conversation",
    name: "Exportar conversacion",
    description: "Prepara una conversacion para revision o seguimiento administrativo.",
    category: "operacion",
    permission: "read",
    requiresConfirmation: true,
    schema: { input: { conversationId: "number" } },
    isSystem: true,
    isActive: true,
  },
  {
    id: "create_lead",
    name: "Crear lead",
    description: "Registra datos de contacto cuando el chatbot tiene captura habilitada.",
    category: "operacion",
    permission: "write",
    requiresConfirmation: true,
    schema: { input: { name: "string", email: "string", phone: "string" } },
    isSystem: true,
    isActive: true,
  },
  {
    id: "human_handoff",
    name: "Derivar a contacto humano",
    description: "Marca una conversacion para canalizacion o atencion humana.",
    category: "operacion",
    permission: "sensitive",
    requiresConfirmation: true,
    schema: { input: { reason: "string", topic: "string" } },
    isSystem: true,
    isActive: true,
  },
];

let seeded = false;

export async function ensureAgentCapabilitiesSeeded() {
  if (seeded) return;
  await storage.upsertAgentSkills(DEFAULT_AGENT_SKILLS);
  await storage.upsertAgentTools(DEFAULT_AGENT_TOOLS);
  seeded = true;
}

export async function buildCapabilitiesPrompt(chatbotId: number): Promise<string> {
  await ensureAgentCapabilitiesSeeded();
  const [skills, tools, enabledSkills, enabledTools] = await Promise.all([
    storage.getAgentSkills(),
    storage.getAgentTools(),
    storage.getChatbotSkills(chatbotId),
    storage.getChatbotTools(chatbotId),
  ]);

  const enabledSkillIds = new Set(enabledSkills.filter((item) => item.isEnabled).map((item) => item.skillId));
  const enabledToolIds = new Set(enabledTools.filter((item) => item.isEnabled).map((item) => item.toolId));

  const activeSkills = skills.filter((skill) => skill.isActive && enabledSkillIds.has(skill.id));
  const activeTools = tools.filter((tool) => tool.isActive && enabledToolIds.has(tool.id));

  if (activeSkills.length === 0 && activeTools.length === 0) return "";

  return `
=== SKILLS Y TOOLS HABILITADAS ===
Skills:
${activeSkills.map((skill) => `- ${skill.name}: ${skill.instructions}`).join("\n") || "- Ninguna"}

Tools disponibles:
${activeTools.map((tool) => `- ${tool.id}: ${tool.name}. Permiso: ${tool.permission}. Confirmacion: ${tool.requiresConfirmation ? "si" : "no"}.`).join("\n") || "- Ninguna"}

Reglas:
1. No afirmes haber ejecutado una tool si no recibiste un resultado explicito.
2. No ejecutes ni sugieras acciones sensibles sin confirmacion.
3. Usa skills como reglas de comportamiento, no como fuente de datos.
=== FIN SKILLS Y TOOLS ===
`;
}
