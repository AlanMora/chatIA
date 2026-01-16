import { randomUUID } from "crypto";
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

export interface IStorage {
  // Users
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // Chatbots
  getChatbot(id: number): Promise<Chatbot | undefined>;
  getAllChatbots(): Promise<Chatbot[]>;
  createChatbot(chatbot: InsertChatbot): Promise<Chatbot>;
  updateChatbot(id: number, chatbot: Partial<InsertChatbot>): Promise<Chatbot | undefined>;
  deleteChatbot(id: number): Promise<void>;

  // Knowledge Base
  getKnowledgeBaseItem(id: number): Promise<KnowledgeBaseItem | undefined>;
  getKnowledgeBaseItemsByChatbot(chatbotId: number): Promise<KnowledgeBaseItem[]>;
  createKnowledgeBaseItem(item: InsertKnowledgeBaseItem): Promise<KnowledgeBaseItem>;
  deleteKnowledgeBaseItem(id: number): Promise<void>;

  // Widget Conversations
  getWidgetConversation(id: number): Promise<WidgetConversation | undefined>;
  getWidgetConversationBySession(chatbotId: number, sessionId: string): Promise<WidgetConversation | undefined>;
  createWidgetConversation(conversation: InsertWidgetConversation): Promise<WidgetConversation>;

  // Widget Messages
  getWidgetMessagesByConversation(conversationId: number): Promise<WidgetMessage[]>;
  createWidgetMessage(message: InsertWidgetMessage): Promise<WidgetMessage>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User> = new Map();
  private chatbots: Map<number, Chatbot> = new Map();
  private knowledgeBaseItems: Map<number, KnowledgeBaseItem> = new Map();
  private widgetConversations: Map<number, WidgetConversation> = new Map();
  private widgetMessages: Map<number, WidgetMessage> = new Map();
  
  private nextChatbotId = 1;
  private nextKBItemId = 1;
  private nextConversationId = 1;
  private nextMessageId = 1;

  // Users
  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  // Chatbots
  async getChatbot(id: number): Promise<Chatbot | undefined> {
    return this.chatbots.get(id);
  }

  async getAllChatbots(): Promise<Chatbot[]> {
    return Array.from(this.chatbots.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  async createChatbot(chatbot: InsertChatbot): Promise<Chatbot> {
    const id = this.nextChatbotId++;
    const newChatbot: Chatbot = {
      id,
      name: chatbot.name,
      description: chatbot.description ?? null,
      systemPrompt: chatbot.systemPrompt ?? "You are a helpful assistant.",
      aiModel: chatbot.aiModel ?? "gpt-5",
      aiProvider: chatbot.aiProvider ?? "openai",
      primaryColor: chatbot.primaryColor ?? "#3B82F6",
      textColor: chatbot.textColor ?? "#FFFFFF",
      position: chatbot.position ?? "bottom-right",
      welcomeMessage: chatbot.welcomeMessage ?? "Hello! How can I help you today?",
      temperature: chatbot.temperature ?? "0.7",
      maxTokens: chatbot.maxTokens ?? 1024,
      isActive: chatbot.isActive ?? true,
      createdAt: new Date(),
    };
    this.chatbots.set(id, newChatbot);
    return newChatbot;
  }

  async updateChatbot(id: number, updates: Partial<InsertChatbot>): Promise<Chatbot | undefined> {
    const chatbot = this.chatbots.get(id);
    if (!chatbot) return undefined;
    
    const updated: Chatbot = {
      ...chatbot,
      ...updates,
    };
    this.chatbots.set(id, updated);
    return updated;
  }

  async deleteChatbot(id: number): Promise<void> {
    this.chatbots.delete(id);
    // Also delete related knowledge base items
    for (const [itemId, item] of this.knowledgeBaseItems) {
      if (item.chatbotId === id) {
        this.knowledgeBaseItems.delete(itemId);
      }
    }
    // Delete related conversations and messages
    for (const [convId, conv] of this.widgetConversations) {
      if (conv.chatbotId === id) {
        this.widgetConversations.delete(convId);
        for (const [msgId, msg] of this.widgetMessages) {
          if (msg.conversationId === convId) {
            this.widgetMessages.delete(msgId);
          }
        }
      }
    }
  }

  // Knowledge Base
  async getKnowledgeBaseItem(id: number): Promise<KnowledgeBaseItem | undefined> {
    return this.knowledgeBaseItems.get(id);
  }

  async getKnowledgeBaseItemsByChatbot(chatbotId: number): Promise<KnowledgeBaseItem[]> {
    return Array.from(this.knowledgeBaseItems.values())
      .filter((item) => item.chatbotId === chatbotId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  async createKnowledgeBaseItem(item: InsertKnowledgeBaseItem): Promise<KnowledgeBaseItem> {
    const id = this.nextKBItemId++;
    const newItem: KnowledgeBaseItem = {
      id,
      chatbotId: item.chatbotId ?? null,
      title: item.title,
      content: item.content,
      sourceType: item.sourceType ?? "text",
      sourceUrl: item.sourceUrl ?? null,
      createdAt: new Date(),
    };
    this.knowledgeBaseItems.set(id, newItem);
    return newItem;
  }

  async deleteKnowledgeBaseItem(id: number): Promise<void> {
    this.knowledgeBaseItems.delete(id);
  }

  // Widget Conversations
  async getWidgetConversation(id: number): Promise<WidgetConversation | undefined> {
    return this.widgetConversations.get(id);
  }

  async getWidgetConversationBySession(chatbotId: number, sessionId: string): Promise<WidgetConversation | undefined> {
    return Array.from(this.widgetConversations.values()).find(
      (conv) => conv.chatbotId === chatbotId && conv.sessionId === sessionId
    );
  }

  async createWidgetConversation(conversation: InsertWidgetConversation): Promise<WidgetConversation> {
    const id = this.nextConversationId++;
    const newConversation: WidgetConversation = {
      id,
      chatbotId: conversation.chatbotId ?? null,
      sessionId: conversation.sessionId,
      createdAt: new Date(),
    };
    this.widgetConversations.set(id, newConversation);
    return newConversation;
  }

  // Widget Messages
  async getWidgetMessagesByConversation(conversationId: number): Promise<WidgetMessage[]> {
    return Array.from(this.widgetMessages.values())
      .filter((msg) => msg.conversationId === conversationId)
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  }

  async createWidgetMessage(message: InsertWidgetMessage): Promise<WidgetMessage> {
    const id = this.nextMessageId++;
    const newMessage: WidgetMessage = {
      id,
      conversationId: message.conversationId ?? null,
      role: message.role,
      content: message.content,
      createdAt: new Date(),
    };
    this.widgetMessages.set(id, newMessage);
    return newMessage;
  }
}

export const storage = new MemStorage();
