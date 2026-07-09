import { sql } from "drizzle-orm";
import { pgTable, text, varchar, serial, integer, timestamp, jsonb, boolean, customType, uniqueIndex } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Custom vector type for pgvector
const vector = customType<{ data: number[] }>({
  dataType() {
    return "vector(1536)"; // 1536 is the dimension for OpenAI embeddings
  },
  toDriver(value: number[]) {
    return `[${value.join(",")}]`;
  },
  fromDriver(value: unknown) {
    if (typeof value !== "string") return [];
    return value
      .replace(/[\[\]]/g, "")
      .split(",")
      .map(Number);
  },
});

// Auth tables (users and sessions)
export * from "./models/auth";
export * from "./models/chat";

// Chatbots table
export const chatbots = pgTable("chatbots", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id"),
  name: text("name").notNull(),
  description: text("description"),
  systemPrompt: text("system_prompt").default("You are a helpful assistant."),
  aiModel: text("ai_model").default("gpt-5"),
  aiProvider: text("ai_provider").default("openai"),
  // Custom/Self-hosted model settings
  customEndpoint: text("custom_endpoint"),
  customApiKey: text("custom_api_key"),
  customModelName: text("custom_model_name"),
  // Per-chatbot API keys for premium providers
  openaiApiKey: text("openai_api_key"),
  geminiApiKey: text("gemini_api_key"),
  // Embedding settings for RAG
  embeddingProvider: text("embedding_provider").default("openai"),
  embeddingModel: text("embedding_model").default("text-embedding-3-small"),
  embeddingDimensions: integer("embedding_dimensions").default(1536),
  embeddingBaseUrl: text("embedding_base_url"),
  // Appearance settings
  primaryColor: text("primary_color").default("#3B82F6"),
  textColor: text("text_color").default("#FFFFFF"),
  position: text("position").default("bottom-right"),
  welcomeMessage: text("welcome_message").default("Hola, soy SofIA, asistente virtual del DIF Zapopan. Puedo orientarte sobre tramites, servicios, programas, talleres y apoyos disponibles. Escribe el tramite o servicio que buscas, pide un listado por tema o grupo de atencion, o selecciona un apartado como requisitos, costos, horarios, lugar y contacto."),
  lifecycleStatus: text("lifecycle_status").default("draft"), // draft, testing, production, archived
  avatarImage: text("avatar_image"),
  // Behavior settings
  temperature: text("temperature").default("0.7"),
  maxTokens: integer("max_tokens").default(1024),
  isActive: boolean("is_active").default(true),
  // ElevenLabs voice settings (per chatbot)
  elevenLabsAgentId: text("elevenlabs_agent_id"),
  // Lead capture form settings
  requireLeadCapture: boolean("require_lead_capture").default(false),
  leadCaptureFields: text("lead_capture_fields").default("name,email"), // comma-separated: name,email,phone,company
  // Production security and governance settings
  allowedDomains: text("allowed_domains").default(""),
  widgetRateLimitPerMinute: integer("widget_rate_limit_per_minute").default(20),
  widgetMaxMessageLength: integer("widget_max_message_length").default(1200),
  widgetRequirePrivacyNotice: boolean("widget_require_privacy_notice").default(true),
  widgetPrivacyNotice: text("widget_privacy_notice").default("Este asistente brinda orientación informativa. No compartas datos sensibles o de emergencia por este chat."),
  dataRetentionDays: integer("data_retention_days").default(180),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const insertChatbotSchema = createInsertSchema(chatbots).omit({
  id: true,
  userId: true,
  createdAt: true,
});

export type InsertChatbot = z.infer<typeof insertChatbotSchema>;
export type Chatbot = typeof chatbots.$inferSelect;

// Model providers and catalog
export const modelProviders = pgTable("model_providers", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  type: text("type").notNull(), // chat, embedding, both
  requiresApiKey: boolean("requires_api_key").default(false),
  supportsCustomBaseUrl: boolean("supports_custom_base_url").default(false),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const insertModelProviderSchema = createInsertSchema(modelProviders).omit({
  createdAt: true,
});

export type InsertModelProvider = z.infer<typeof insertModelProviderSchema>;
export type ModelProvider = typeof modelProviders.$inferSelect;

export const modelCatalog = pgTable("model_catalog", {
  id: serial("id").primaryKey(),
  modelId: text("model_id").notNull(),
  label: text("label").notNull(),
  providerId: text("provider_id").notNull(),
  type: text("type").notNull(), // chat, embedding
  dimensions: integer("dimensions"),
  isDefault: boolean("is_default").default(false),
  isActive: boolean("is_active").default(true),
  source: text("source").default("static"),
  notes: text("notes"),
  refreshedAt: timestamp("refreshed_at"),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const insertModelCatalogSchema = createInsertSchema(modelCatalog).omit({
  id: true,
  createdAt: true,
});

export type InsertModelCatalog = z.infer<typeof insertModelCatalogSchema>;
export type ModelCatalog = typeof modelCatalog.$inferSelect;

export const chatbotModelSettings = pgTable("chatbot_model_settings", {
  chatbotId: integer("chatbot_id").primaryKey().references(() => chatbots.id, { onDelete: "cascade" }),
  chatProvider: text("chat_provider").default("openai"),
  chatModel: text("chat_model").default("gpt-5"),
  embeddingProvider: text("embedding_provider").default("openai"),
  embeddingModel: text("embedding_model").default("text-embedding-3-small"),
  embeddingDimensions: integer("embedding_dimensions").default(1536),
  embeddingBaseUrl: text("embedding_base_url"),
  temperature: text("temperature").default("0.7"),
  maxTokens: integer("max_tokens").default(1024),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const insertChatbotModelSettingsSchema = createInsertSchema(chatbotModelSettings);

export type InsertChatbotModelSettings = z.infer<typeof insertChatbotModelSettingsSchema>;
export type ChatbotModelSettings = typeof chatbotModelSettings.$inferSelect;

// Knowledge Base items
export const knowledgeBaseItems = pgTable("knowledge_base_items", {
  id: serial("id").primaryKey(),
  chatbotId: integer("chatbot_id").references(() => chatbots.id, { onDelete: "cascade" }),
  externalId: text("external_id"),
  skill: text("skill"),
  tipoDocumento: text("tipo_documento"),
  categoria: text("categoria"),
  audiencia: jsonb("audiencia").$type<string[]>(),
  title: text("title").notNull(),
  content: text("content").notNull(),
  source: text("source"),
  sourceType: text("source_type").default("text"), // text, url, file
  sourceUrl: text("source_url"),
  metadata: jsonb("metadata").$type<Record<string, unknown>>(),
  filePath: text("file_path"),
  mimeType: text("mime_type"),
  fileSize: integer("file_size"),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => {
  return {
    chatbotExternalIdIdx: uniqueIndex("knowledge_base_items_chatbot_external_id_idx").on(table.chatbotId, table.externalId),
  };
});

export const insertKnowledgeBaseItemSchema = createInsertSchema(knowledgeBaseItems).omit({
  id: true,
  createdAt: true,
});

export type InsertKnowledgeBaseItem = z.infer<typeof insertKnowledgeBaseItemSchema>;
export type KnowledgeBaseItem = typeof knowledgeBaseItems.$inferSelect;

// Agent skills and tools
export const agentSkills = pgTable("agent_skills", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  instructions: text("instructions").notNull(),
  category: text("category").default("general"),
  isSystem: boolean("is_system").default(true),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const insertAgentSkillSchema = createInsertSchema(agentSkills).omit({
  createdAt: true,
});

export type InsertAgentSkill = z.infer<typeof insertAgentSkillSchema>;
export type AgentSkill = typeof agentSkills.$inferSelect;

export const agentTools = pgTable("agent_tools", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  category: text("category").default("knowledge"),
  permission: text("permission").default("read"), // read, write, external, sensitive
  requiresConfirmation: boolean("requires_confirmation").default(false),
  schema: jsonb("schema").$type<Record<string, unknown>>(),
  isSystem: boolean("is_system").default(true),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const insertAgentToolSchema = createInsertSchema(agentTools).omit({
  createdAt: true,
});

export type InsertAgentTool = z.infer<typeof insertAgentToolSchema>;
export type AgentTool = typeof agentTools.$inferSelect;

export const chatbotSkills = pgTable("chatbot_skills", {
  id: serial("id").primaryKey(),
  chatbotId: integer("chatbot_id").references(() => chatbots.id, { onDelete: "cascade" }).notNull(),
  skillId: text("skill_id").references(() => agentSkills.id, { onDelete: "cascade" }).notNull(),
  isEnabled: boolean("is_enabled").default(true),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const insertChatbotSkillSchema = createInsertSchema(chatbotSkills).omit({
  id: true,
  createdAt: true,
});

export type InsertChatbotSkill = z.infer<typeof insertChatbotSkillSchema>;
export type ChatbotSkill = typeof chatbotSkills.$inferSelect;

export const chatbotTools = pgTable("chatbot_tools", {
  id: serial("id").primaryKey(),
  chatbotId: integer("chatbot_id").references(() => chatbots.id, { onDelete: "cascade" }).notNull(),
  toolId: text("tool_id").references(() => agentTools.id, { onDelete: "cascade" }).notNull(),
  isEnabled: boolean("is_enabled").default(true),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const insertChatbotToolSchema = createInsertSchema(chatbotTools).omit({
  id: true,
  createdAt: true,
});

export type InsertChatbotTool = z.infer<typeof insertChatbotToolSchema>;
export type ChatbotTool = typeof chatbotTools.$inferSelect;

export const toolExecutionLogs = pgTable("tool_execution_logs", {
  id: serial("id").primaryKey(),
  chatbotId: integer("chatbot_id").references(() => chatbots.id, { onDelete: "cascade" }),
  conversationId: integer("conversation_id"),
  toolId: text("tool_id").references(() => agentTools.id, { onDelete: "set null" }),
  userId: varchar("user_id"),
  input: jsonb("input").$type<Record<string, unknown>>(),
  output: jsonb("output").$type<Record<string, unknown>>(),
  status: text("status").default("success"),
  error: text("error"),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const insertToolExecutionLogSchema = createInsertSchema(toolExecutionLogs).omit({
  id: true,
  createdAt: true,
});

export type InsertToolExecutionLog = z.infer<typeof insertToolExecutionLogSchema>;
export type ToolExecutionLog = typeof toolExecutionLogs.$inferSelect;

// Knowledge Base Chunks (for Vector Search / RAG)
export const knowledgeBaseChunks = pgTable("knowledge_base_chunks", {
  id: serial("id").primaryKey(),
  itemId: integer("item_id").references(() => knowledgeBaseItems.id, { onDelete: "cascade" }),
  chatbotId: integer("chatbot_id").references(() => chatbots.id, { onDelete: "cascade" }),
  content: text("content").notNull(),
  embedding: vector("embedding"),
  index: integer("index").notNull(),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const insertKnowledgeBaseChunkSchema = createInsertSchema(knowledgeBaseChunks).omit({
  id: true,
  createdAt: true,
});

export type InsertKnowledgeBaseChunk = z.infer<typeof insertKnowledgeBaseChunkSchema>;
export type KnowledgeBaseChunk = typeof knowledgeBaseChunks.$inferSelect;

// Widget conversations (for the embeddable widget)
export const widgetConversations = pgTable("widget_conversations", {
  id: serial("id").primaryKey(),
  chatbotId: integer("chatbot_id").references(() => chatbots.id, { onDelete: "cascade" }),
  sessionId: text("session_id").notNull(),
  // Lead capture info
  visitorName: text("visitor_name"),
  visitorEmail: text("visitor_email"),
  visitorPhone: text("visitor_phone"),
  visitorCompany: text("visitor_company"),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const insertWidgetConversationSchema = createInsertSchema(widgetConversations).omit({
  id: true,
  createdAt: true,
});

export type InsertWidgetConversation = z.infer<typeof insertWidgetConversationSchema>;
export type WidgetConversation = typeof widgetConversations.$inferSelect;

// Widget messages
export const widgetMessages = pgTable("widget_messages", {
  id: serial("id").primaryKey(),
  conversationId: integer("conversation_id").references(() => widgetConversations.id, { onDelete: "cascade" }),
  role: text("role").notNull(), // user or assistant
  content: text("content").notNull(),
  responseTimeMs: integer("response_time_ms"), // Time to generate response in ms (for assistant messages)
  knowledgeStrategy: text("knowledge_strategy"),
  knowledgeSources: jsonb("knowledge_sources").$type<string[]>(),
  knowledgeChunks: integer("knowledge_chunks"),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

// Conversation ratings/feedback
export const conversationRatings = pgTable("conversation_ratings", {
  id: serial("id").primaryKey(),
  conversationId: integer("conversation_id").references(() => widgetConversations.id, { onDelete: "cascade" }),
  rating: integer("rating").notNull(), // 1-5 stars
  feedback: text("feedback"),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const insertConversationRatingSchema = createInsertSchema(conversationRatings).omit({
  id: true,
  createdAt: true,
});

export type InsertConversationRating = z.infer<typeof insertConversationRatingSchema>;
export type ConversationRating = typeof conversationRatings.$inferSelect;

export const insertWidgetMessageSchema = createInsertSchema(widgetMessages).omit({
  id: true,
  createdAt: true,
});

export type InsertWidgetMessage = z.infer<typeof insertWidgetMessageSchema>;
export type WidgetMessage = typeof widgetMessages.$inferSelect;

// Analytics for chatbots
export const chatbotAnalytics = pgTable("chatbot_analytics", {
  id: serial("id").primaryKey(),
  chatbotId: integer("chatbot_id").references(() => chatbots.id, { onDelete: "cascade" }),
  totalConversations: integer("total_conversations").default(0),
  totalMessages: integer("total_messages").default(0),
  date: timestamp("date").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export type ChatbotAnalytics = typeof chatbotAnalytics.$inferSelect;

// Predefined responses (quick replies)
export const predefinedResponses = pgTable("predefined_responses", {
  id: serial("id").primaryKey(),
  chatbotId: integer("chatbot_id").references(() => chatbots.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  content: text("content").notNull(),
  category: text("category"), // optional category for grouping
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const insertPredefinedResponseSchema = createInsertSchema(predefinedResponses).omit({
  id: true,
  createdAt: true,
});

export type InsertPredefinedResponse = z.infer<typeof insertPredefinedResponseSchema>;
export type PredefinedResponse = typeof predefinedResponses.$inferSelect;

// Notifications/Alerts
export const notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull(),
  type: text("type").notNull(), // low_satisfaction, no_response, high_volume
  title: text("title").notNull(),
  message: text("message").notNull(),
  chatbotId: integer("chatbot_id").references(() => chatbots.id, { onDelete: "cascade" }),
  conversationId: integer("conversation_id").references(() => widgetConversations.id, { onDelete: "cascade" }),
  isRead: boolean("is_read").default(false),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const insertNotificationSchema = createInsertSchema(notifications).omit({
  id: true,
  createdAt: true,
});

export type InsertNotification = z.infer<typeof insertNotificationSchema>;
export type Notification = typeof notifications.$inferSelect;
