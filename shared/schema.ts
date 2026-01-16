import { sql } from "drizzle-orm";
import { pgTable, text, varchar, serial, integer, timestamp, jsonb, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Users table
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// Chatbots table
export const chatbots = pgTable("chatbots", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  systemPrompt: text("system_prompt").default("You are a helpful assistant."),
  aiModel: text("ai_model").default("gpt-5"),
  aiProvider: text("ai_provider").default("openai"),
  // Appearance settings
  primaryColor: text("primary_color").default("#3B82F6"),
  textColor: text("text_color").default("#FFFFFF"),
  position: text("position").default("bottom-right"),
  welcomeMessage: text("welcome_message").default("Hello! How can I help you today?"),
  // Behavior settings
  temperature: text("temperature").default("0.7"),
  maxTokens: integer("max_tokens").default(1024),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const insertChatbotSchema = createInsertSchema(chatbots).omit({
  id: true,
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
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

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
