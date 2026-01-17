import { eq, desc, sql, and, gte, count } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import type {
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
  chatbots,
  knowledgeBaseItems,
  widgetConversations,
  widgetMessages,
} from "@shared/schema";

export interface AnalyticsStats {
  totalConversations: number;
  totalMessages: number;
  userMessages: number;
  assistantMessages: number;
  conversationsToday: number;
  messagesToday: number;
}

export interface ConversationWithMessages {
  conversation: WidgetConversation;
  messages: WidgetMessage[];
  chatbotName: string;
}

export interface DailyStats {
  date: string;
  conversations: number;
  messages: number;
}

export interface IStorage {
  getChatbot(id: number): Promise<Chatbot | undefined>;
  getAllChatbots(): Promise<Chatbot[]>;
  getChatbotsByUser(userId: string): Promise<Chatbot[]>;
  createChatbot(chatbot: InsertChatbot & { userId: string }): Promise<Chatbot>;
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

  getAnalyticsStats(chatbotId?: number, daysBack?: number): Promise<AnalyticsStats>;
  getRecentConversations(chatbotId?: number, limit?: number): Promise<ConversationWithMessages[]>;
  getDailyStats(chatbotId?: number, daysBack?: number): Promise<DailyStats[]>;
}

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
});

const db = drizzle(pool);

export class DatabaseStorage implements IStorage {
  async getChatbot(id: number): Promise<Chatbot | undefined> {
    const result = await db.select().from(chatbots).where(eq(chatbots.id, id));
    return result[0];
  }

  async getAllChatbots(): Promise<Chatbot[]> {
    return db.select().from(chatbots).orderBy(desc(chatbots.createdAt));
  }

  async getChatbotsByUser(userId: string): Promise<Chatbot[]> {
    return db.select().from(chatbots).where(eq(chatbots.userId, userId)).orderBy(desc(chatbots.createdAt));
  }

  async createChatbot(chatbot: InsertChatbot & { userId: string }): Promise<Chatbot> {
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

  async getAnalyticsStats(chatbotId?: number, daysBack: number = 7): Promise<AnalyticsStats> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysBack);
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const allConversations = await db.select().from(widgetConversations)
      .where(gte(widgetConversations.createdAt, startDate));
    
    const filteredConvs = chatbotId 
      ? allConversations.filter(c => c.chatbotId === chatbotId)
      : allConversations;
    
    const todayConvs = filteredConvs.filter(c => c.createdAt >= todayStart);
    const filteredConvIds = new Set(filteredConvs.map(c => c.id));
    const todayConvIds = new Set(todayConvs.map(c => c.id));

    const allMessages = await db
      .select()
      .from(widgetMessages)
      .where(gte(widgetMessages.createdAt, startDate));

    const filteredMessages = allMessages.filter(m => 
      m.conversationId && filteredConvIds.has(m.conversationId)
    );

    const todayMessages = allMessages.filter(m => 
      m.conversationId && todayConvIds.has(m.conversationId) && m.createdAt >= todayStart
    );

    const userMessages = filteredMessages.filter(m => m.role === 'user').length;
    const assistantMessages = filteredMessages.filter(m => m.role === 'assistant').length;

    return {
      totalConversations: filteredConvs.length,
      totalMessages: filteredMessages.length,
      userMessages,
      assistantMessages,
      conversationsToday: todayConvs.length,
      messagesToday: todayMessages.length,
    };
  }

  async getRecentConversations(chatbotId?: number, limit: number = 10): Promise<ConversationWithMessages[]> {
    let query = db.select().from(widgetConversations).orderBy(desc(widgetConversations.createdAt)).limit(limit);
    
    if (chatbotId) {
      query = query.where(eq(widgetConversations.chatbotId, chatbotId)) as typeof query;
    }

    const conversations = await query;
    const results: ConversationWithMessages[] = [];

    for (const conv of conversations) {
      const messages = await this.getWidgetMessagesByConversation(conv.id);
      const chatbot = conv.chatbotId ? await this.getChatbot(conv.chatbotId) : null;
      results.push({
        conversation: conv,
        messages,
        chatbotName: chatbot?.name || 'Desconocido',
      });
    }

    return results;
  }

  async getDailyStats(chatbotId?: number, daysBack: number = 7): Promise<DailyStats[]> {
    const stats: DailyStats[] = [];
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysBack);
    startDate.setHours(0, 0, 0, 0);

    const allConversations = await db.select().from(widgetConversations)
      .where(gte(widgetConversations.createdAt, startDate));
    
    const filteredConvs = chatbotId 
      ? allConversations.filter(c => c.chatbotId === chatbotId)
      : allConversations;
    
    const filteredConvIds = new Set(filteredConvs.map(c => c.id));

    const allMessages = await db.select().from(widgetMessages)
      .where(gte(widgetMessages.createdAt, startDate));
    
    const filteredMessages = allMessages.filter(m => 
      m.conversationId && filteredConvIds.has(m.conversationId)
    );
    
    for (let i = daysBack - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);
      
      const nextDate = new Date(date);
      nextDate.setDate(nextDate.getDate() + 1);

      const dayConvs = filteredConvs.filter(c => {
        const created = new Date(c.createdAt);
        return created >= date && created < nextDate;
      });

      const dayMsgs = filteredMessages.filter(m => {
        const created = new Date(m.createdAt);
        return created >= date && created < nextDate;
      });

      stats.push({
        date: date.toISOString().split('T')[0],
        conversations: dayConvs.length,
        messages: dayMsgs.length,
      });
    }

    return stats;
  }
}

export const storage = new DatabaseStorage();
