import { sql } from "drizzle-orm";
import { pgTable, text, varchar, serial, integer, timestamp, jsonb, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Auth tables (users and sessions)
export * from "./models/auth";

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
  // Appearance settings
  primaryColor: text("primary_color").default("#3B82F6"),
  textColor: text("text_color").default("#FFFFFF"),
  position: text("position").default("bottom-right"),
  welcomeMessage: text("welcome_message").default("Hello! How can I help you today?"),
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
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const insertChatbotSchema = createInsertSchema(chatbots).omit({
  id: true,
  userId: true,
  createdAt: true,
});

export type InsertChatbot = z.infer<typeof insertChatbotSchema>;
export type Chatbot = typeof chatbots.$inferSelect;

// Knowledge Base items
export const knowledgeBaseItems = pgTable("knowledge_base_items", {
  id: serial("id").primaryKey(),
  chatbotId: integer("chatbot_id").references(() => chatbots.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  content: text("content").notNull(),
  sourceType: text("source_type").default("text"), // text, url, file
  sourceUrl: text("source_url"),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const insertKnowledgeBaseItemSchema = createInsertSchema(knowledgeBaseItems).omit({
  id: true,
  createdAt: true,
});

export type InsertKnowledgeBaseItem = z.infer<typeof insertKnowledgeBaseItemSchema>;
export type KnowledgeBaseItem = typeof knowledgeBaseItems.$inferSelect;

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
