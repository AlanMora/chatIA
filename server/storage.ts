import { eq, desc } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import type {
  User,
  InsertUser,
  Chatbot,
  InsertChatbot,
  KnowledgeBaseItem,
  InsertKnowledgeBaseItem,
  WidgetConversation,
  InsertWidgetConversation,
  WidgetMessage,
  InsertWidgetMessage,
} from "@shared/schema";
import {
  users,
  chatbots,
  knowledgeBaseItems,
  widgetConversations,
  widgetMessages,
} from "@shared/schema";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  getChatbot(id: number): Promise<Chatbot | undefined>;
  getAllChatbots(): Promise<Chatbot[]>;
  createChatbot(chatbot: InsertChatbot): Promise<Chatbot>;
  updateChatbot(id: number, chatbot: Partial<InsertChatbot>): Promise<Chatbot | undefined>;
  deleteChatbot(id: number): Promise<void>;

  getKnowledgeBaseItem(id: number): Promise<KnowledgeBaseItem | undefined>;
  getKnowledgeBaseItemsByChatbot(chatbotId: number): Promise<KnowledgeBaseItem[]>;
  createKnowledgeBaseItem(item: InsertKnowledgeBaseItem): Promise<KnowledgeBaseItem>;
  deleteKnowledgeBaseItem(id: number): Promise<void>;

  getWidgetConversation(id: number): Promise<WidgetConversation | undefined>;
  getWidgetConversationBySession(chatbotId: number, sessionId: string): Promise<WidgetConversation | undefined>;
  createWidgetConversation(conversation: InsertWidgetConversation): Promise<WidgetConversation>;

  getWidgetMessagesByConversation(conversationId: number): Promise<WidgetMessage[]>;
  createWidgetMessage(message: InsertWidgetMessage): Promise<WidgetMessage>;
}

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
});

const db = drizzle(pool);

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.id, id));
    return result[0];
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.username, username));
    return result[0];
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const result = await db.insert(users).values(insertUser).returning();
    return result[0];
  }

  async getChatbot(id: number): Promise<Chatbot | undefined> {
    const result = await db.select().from(chatbots).where(eq(chatbots.id, id));
    return result[0];
  }

  async getAllChatbots(): Promise<Chatbot[]> {
    return db.select().from(chatbots).orderBy(desc(chatbots.createdAt));
  }

  async createChatbot(chatbot: InsertChatbot): Promise<Chatbot> {
    const result = await db.insert(chatbots).values(chatbot).returning();
    return result[0];
  }

  async updateChatbot(id: number, updates: Partial<InsertChatbot>): Promise<Chatbot | undefined> {
    const result = await db
      .update(chatbots)
      .set(updates)
      .where(eq(chatbots.id, id))
      .returning();
    return result[0];
  }

  async deleteChatbot(id: number): Promise<void> {
    await db.delete(chatbots).where(eq(chatbots.id, id));
  }

  async getKnowledgeBaseItem(id: number): Promise<KnowledgeBaseItem | undefined> {
    const result = await db.select().from(knowledgeBaseItems).where(eq(knowledgeBaseItems.id, id));
    return result[0];
  }

  async getKnowledgeBaseItemsByChatbot(chatbotId: number): Promise<KnowledgeBaseItem[]> {
    return db
      .select()
      .from(knowledgeBaseItems)
      .where(eq(knowledgeBaseItems.chatbotId, chatbotId))
      .orderBy(desc(knowledgeBaseItems.createdAt));
  }

  async createKnowledgeBaseItem(item: InsertKnowledgeBaseItem): Promise<KnowledgeBaseItem> {
    const result = await db.insert(knowledgeBaseItems).values(item).returning();
    return result[0];
  }

  async deleteKnowledgeBaseItem(id: number): Promise<void> {
    await db.delete(knowledgeBaseItems).where(eq(knowledgeBaseItems.id, id));
  }

  async getWidgetConversation(id: number): Promise<WidgetConversation | undefined> {
    const result = await db.select().from(widgetConversations).where(eq(widgetConversations.id, id));
    return result[0];
  }

  async getWidgetConversationBySession(chatbotId: number, sessionId: string): Promise<WidgetConversation | undefined> {
    const result = await db
      .select()
      .from(widgetConversations)
      .where(eq(widgetConversations.chatbotId, chatbotId));
    return result.find((conv) => conv.sessionId === sessionId);
  }

  async createWidgetConversation(conversation: InsertWidgetConversation): Promise<WidgetConversation> {
    const result = await db.insert(widgetConversations).values(conversation).returning();
    return result[0];
  }

  async getWidgetMessagesByConversation(conversationId: number): Promise<WidgetMessage[]> {
    return db
      .select()
      .from(widgetMessages)
      .where(eq(widgetMessages.conversationId, conversationId))
      .orderBy(widgetMessages.createdAt);
  }

  async createWidgetMessage(message: InsertWidgetMessage): Promise<WidgetMessage> {
    const result = await db.insert(widgetMessages).values(message).returning();
    return result[0];
  }
}

export const storage = new DatabaseStorage();
