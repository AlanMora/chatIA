import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertChatbotSchema, insertKnowledgeBaseItemSchema } from "@shared/schema";
import OpenAI from "openai";
import { GoogleGenAI } from "@google/genai";
import multer from "multer";
import mammoth from "mammoth";
import * as cheerio from "cheerio";
import { registerElevenLabsRoutes } from "./elevenlabs";
import { setupAuth, registerAuthRoutes, isAuthenticated } from "./replit_integrations/auth";

import path from "path";
import fs from "fs";

const uploadDocs = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain'
    ];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only PDF, DOC, DOCX, and TXT files are allowed.'));
    }
  }
});

const uploadImage = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      const uploadDir = path.join(process.cwd(), 'uploads');
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }
      cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      const ext = path.extname(file.originalname);
      cb(null, `avatar-${uniqueSuffix}${ext}`);
    }
  }),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit for images
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPEG, PNG, GIF, and WebP images are allowed.'));
    }
  }
});

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

const gemini = new GoogleGenAI({
  apiKey: process.env.AI_INTEGRATIONS_GEMINI_API_KEY,
  httpOptions: {
    apiVersion: "",
    baseUrl: process.env.AI_INTEGRATIONS_GEMINI_BASE_URL,
  },
});

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // ==================== Authentication ====================
  await setupAuth(app);
  registerAuthRoutes(app);

  // ==================== ElevenLabs Voice AI ====================
  await registerElevenLabsRoutes(app);

  // ==================== Chatbots API ====================
  
  // Get all chatbots for current user
  app.get("/api/chatbots", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      const chatbots = await storage.getChatbotsByUser(userId);
      res.json(chatbots);
    } catch (error) {
      console.error("Error fetching chatbots:", error);
      res.status(500).json({ error: "Failed to fetch chatbots" });
    }
  });

  // Get single chatbot
  app.get("/api/chatbots/:id", isAuthenticated, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      const userId = req.user?.claims?.sub;
      const chatbot = await storage.getChatbot(id);
      if (!chatbot) {
        return res.status(404).json({ error: "Chatbot not found" });
      }
      if (chatbot.userId !== userId) {
        return res.status(403).json({ error: "Access denied" });
      }
      res.json(chatbot);
    } catch (error) {
      console.error("Error fetching chatbot:", error);
      res.status(500).json({ error: "Failed to fetch chatbot" });
    }
  });

  // Create chatbot (with limit check)
  const MAX_CHATBOTS_PER_USER = 10;
  app.post("/api/chatbots", isAuthenticated, async (req: any, res) => {
    try {
      const parsed = insertChatbotSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.message });
      }
      const userId = req.user?.claims?.sub;
      
      // Check limit
      const currentCount = await storage.getChatbotCountByUser(userId);
      if (currentCount >= MAX_CHATBOTS_PER_USER) {
        return res.status(400).json({ 
          error: `Has alcanzado el límite de ${MAX_CHATBOTS_PER_USER} chatbots. Elimina uno para crear otro.`,
          code: "LIMIT_REACHED"
        });
      }
      
      const chatbot = await storage.createChatbot({ ...parsed.data, userId });
      res.status(201).json(chatbot);
    } catch (error) {
      console.error("Error creating chatbot:", error);
      res.status(500).json({ error: "Failed to create chatbot" });
    }
  });

  // Update chatbot
  app.patch("/api/chatbots/:id", isAuthenticated, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      const userId = req.user?.claims?.sub;
      const existing = await storage.getChatbot(id);
      if (!existing) {
        return res.status(404).json({ error: "Chatbot not found" });
      }
      if (existing.userId !== userId) {
        return res.status(403).json({ error: "Access denied" });
      }
      const chatbot = await storage.updateChatbot(id, req.body);
      res.json(chatbot);
    } catch (error) {
      console.error("Error updating chatbot:", error);
      res.status(500).json({ error: "Failed to update chatbot" });
    }
  });

  // Delete chatbot
  app.delete("/api/chatbots/:id", isAuthenticated, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      const userId = req.user?.claims?.sub;
      const existing = await storage.getChatbot(id);
      if (!existing) {
        return res.status(404).json({ error: "Chatbot not found" });
      }
      if (existing.userId !== userId) {
        return res.status(403).json({ error: "Access denied" });
      }
      await storage.deleteChatbot(id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting chatbot:", error);
      res.status(500).json({ error: "Failed to delete chatbot" });
    }
  });

  // ==================== Knowledge Base API ====================

  // Get knowledge base items for a chatbot
  app.get("/api/knowledge-base/:chatbotId", isAuthenticated, async (req: any, res) => {
    try {
      const chatbotId = parseInt(req.params.chatbotId);
      const userId = req.user?.claims?.sub;
      const chatbot = await storage.getChatbot(chatbotId);
      if (!chatbot || chatbot.userId !== userId) {
        return res.status(403).json({ error: "Access denied" });
      }
      const items = await storage.getKnowledgeBaseItemsByChatbot(chatbotId);
      res.json(items);
    } catch (error) {
      console.error("Error fetching knowledge base:", error);
      res.status(500).json({ error: "Failed to fetch knowledge base items" });
    }
  });

  // Create knowledge base item (with limit check)
  const MAX_KB_ITEMS_PER_USER = 50;
  app.post("/api/knowledge-base", isAuthenticated, async (req: any, res) => {
    try {
      const parsed = insertKnowledgeBaseItemSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.message });
      }
      const userId = req.user?.claims?.sub;
      const chatbot = await storage.getChatbot(parsed.data.chatbotId!);
      if (!chatbot || chatbot.userId !== userId) {
        return res.status(403).json({ error: "Access denied" });
      }
      
      // Check limit
      const currentCount = await storage.getKnowledgeBaseCountByUser(userId);
      if (currentCount >= MAX_KB_ITEMS_PER_USER) {
        return res.status(400).json({ 
          error: `Has alcanzado el límite de ${MAX_KB_ITEMS_PER_USER} elementos en la base de conocimiento.`,
          code: "LIMIT_REACHED"
        });
      }
      
      const item = await storage.createKnowledgeBaseItem(parsed.data);
      res.status(201).json(item);
    } catch (error) {
      console.error("Error creating knowledge base item:", error);
      res.status(500).json({ error: "Failed to create knowledge base item" });
    }
  });

  // Delete knowledge base item
  app.delete("/api/knowledge-base/:id", isAuthenticated, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      const userId = req.user?.claims?.sub;
      const item = await storage.getKnowledgeBaseItem(id);
      if (item?.chatbotId) {
        const chatbot = await storage.getChatbot(item.chatbotId);
        if (!chatbot || chatbot.userId !== userId) {
          return res.status(403).json({ error: "Access denied" });
        }
      }
      await storage.deleteKnowledgeBaseItem(id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting knowledge base item:", error);
      res.status(500).json({ error: "Failed to delete knowledge base item" });
    }
  });

  // Upload file and extract content
  app.post("/api/knowledge-base/upload", isAuthenticated, uploadDocs.single('file'), async (req: any, res) => {
    try {
      const file = req.file;
      const chatbotId = parseInt(req.body.chatbotId);
      const title = req.body.title || file?.originalname || 'Uploaded File';
      const userId = req.user?.claims?.sub;

      if (!file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      if (!chatbotId) {
        return res.status(400).json({ error: "chatbotId is required" });
      }

      const chatbot = await storage.getChatbot(chatbotId);
      if (!chatbot || chatbot.userId !== userId) {
        return res.status(403).json({ error: "Access denied" });
      }

      let content = "";

      // Extract content based on file type
      if (file.mimetype === 'application/pdf') {
        const pdfModule = await import("pdf-parse") as any;
        const pdfParse = pdfModule.default || pdfModule;
        const pdfData = await pdfParse(file.buffer);
        content = pdfData.text;
      } else if (file.mimetype === 'application/msword' || 
                 file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
        const result = await mammoth.extractRawText({ buffer: file.buffer });
        content = result.value;
      } else if (file.mimetype === 'text/plain') {
        content = file.buffer.toString('utf-8');
      }

      if (!content.trim()) {
        return res.status(400).json({ error: "Could not extract content from file" });
      }

      // Create knowledge base item
      const item = await storage.createKnowledgeBaseItem({
        chatbotId,
        title,
        content: content.trim(),
        sourceType: "file",
        sourceUrl: file.originalname,
      });

      res.status(201).json(item);
    } catch (error) {
      console.error("Error uploading file:", error);
      res.status(500).json({ error: "Failed to process uploaded file" });
    }
  });

  // Extract content from URL
  app.post("/api/knowledge-base/url", isAuthenticated, async (req: any, res) => {
    try {
      const { chatbotId, url, title } = req.body;
      const userId = req.user?.claims?.sub;

      if (!chatbotId || !url) {
        return res.status(400).json({ error: "chatbotId and url are required" });
      }

      const chatbot = await storage.getChatbot(parseInt(chatbotId));
      if (!chatbot || chatbot.userId !== userId) {
        return res.status(403).json({ error: "Access denied" });
      }

      // Validate URL
      let parsedUrl: URL;
      try {
        parsedUrl = new URL(url);
      } catch {
        return res.status(400).json({ error: "Invalid URL format" });
      }

      // Fetch the page content
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; ChatbotKB/1.0)',
        },
      });

      if (!response.ok) {
        return res.status(400).json({ error: `Failed to fetch URL: ${response.statusText}` });
      }

      const html = await response.text();
      const $ = cheerio.load(html);

      // Remove script, style, and other non-content elements
      $('script, style, nav, header, footer, aside, noscript, iframe').remove();

      // Extract main content - try common content selectors first
      let content = '';
      const contentSelectors = ['main', 'article', '.content', '.post', '#content', '#main'];
      
      for (const selector of contentSelectors) {
        const element = $(selector);
        if (element.length > 0) {
          content = element.text();
          break;
        }
      }

      // Fallback to body if no specific content container found
      if (!content) {
        content = $('body').text();
      }

      // Clean up whitespace
      content = content.replace(/\s+/g, ' ').trim();

      if (!content) {
        return res.status(400).json({ error: "Could not extract content from URL" });
      }

      // Truncate if too long (max 50k characters)
      if (content.length > 50000) {
        content = content.substring(0, 50000) + '...';
      }

      // Get page title if not provided
      const pageTitle = title || $('title').text().trim() || parsedUrl.hostname;

      // Create knowledge base item
      const item = await storage.createKnowledgeBaseItem({
        chatbotId: parseInt(chatbotId),
        title: pageTitle,
        content,
        sourceType: "url",
        sourceUrl: url,
      });

      res.status(201).json(item);
    } catch (error) {
      console.error("Error extracting from URL:", error);
      res.status(500).json({ error: "Failed to extract content from URL" });
    }
  });

  // ==================== Analytics API ====================

  // Get analytics stats
  app.get("/api/analytics/stats", isAuthenticated, async (req: any, res) => {
    try {
      const chatbotId = req.query.chatbotId ? parseInt(req.query.chatbotId as string) : undefined;
      const days = req.query.days ? parseInt(req.query.days as string) : 7;
      const userId = req.user?.claims?.sub;
      
      if (chatbotId) {
        const chatbot = await storage.getChatbot(chatbotId);
        if (!chatbot || chatbot.userId !== userId) {
          return res.status(403).json({ error: "Access denied" });
        }
        const stats = await storage.getAnalyticsStats(chatbotId, days);
        res.json(stats);
      } else {
        const userChatbots = await storage.getChatbotsByUser(userId);
        const chatbotIds = userChatbots.map(c => c.id);
        const stats = await storage.getAnalyticsStatsByIds(chatbotIds, days);
        res.json(stats);
      }
    } catch (error) {
      console.error("Error fetching analytics stats:", error);
      res.status(500).json({ error: "Failed to fetch analytics" });
    }
  });

  // Get daily stats for charts
  app.get("/api/analytics/daily", isAuthenticated, async (req: any, res) => {
    try {
      const chatbotId = req.query.chatbotId ? parseInt(req.query.chatbotId as string) : undefined;
      const days = req.query.days ? parseInt(req.query.days as string) : 7;
      const userId = req.user?.claims?.sub;
      
      if (chatbotId) {
        const chatbot = await storage.getChatbot(chatbotId);
        if (!chatbot || chatbot.userId !== userId) {
          return res.status(403).json({ error: "Access denied" });
        }
        const dailyStats = await storage.getDailyStats(chatbotId, days);
        res.json(dailyStats);
      } else {
        const userChatbots = await storage.getChatbotsByUser(userId);
        const chatbotIds = userChatbots.map(c => c.id);
        const dailyStats = await storage.getDailyStatsByIds(chatbotIds, days);
        res.json(dailyStats);
      }
    } catch (error) {
      console.error("Error fetching daily stats:", error);
      res.status(500).json({ error: "Failed to fetch daily stats" });
    }
  });

  // Get recent conversations
  app.get("/api/analytics/conversations", isAuthenticated, async (req: any, res) => {
    try {
      const chatbotId = req.query.chatbotId ? parseInt(req.query.chatbotId as string) : undefined;
      const userId = req.user?.claims?.sub;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;
      
      if (chatbotId) {
        const chatbot = await storage.getChatbot(chatbotId);
        if (!chatbot || chatbot.userId !== userId) {
          return res.status(403).json({ error: "Access denied" });
        }
        const conversations = await storage.getRecentConversations(chatbotId, limit);
        res.json(conversations);
      } else {
        const userChatbots = await storage.getChatbotsByUser(userId);
        const chatbotIds = userChatbots.map(c => c.id);
        const conversations = await storage.getRecentConversationsByIds(chatbotIds, limit);
        res.json(conversations);
      }
    } catch (error) {
      console.error("Error fetching conversations:", error);
      res.status(500).json({ error: "Failed to fetch conversations" });
    }
  });

  // Get single conversation with full messages
  app.get("/api/analytics/conversations/:id", isAuthenticated, async (req: any, res) => {
    try {
      const conversationId = parseInt(req.params.id);
      const userId = req.user?.claims?.sub;
      
      const conversationDetails = await storage.getConversationWithMessages(conversationId);
      if (!conversationDetails) {
        return res.status(404).json({ error: "Conversation not found" });
      }
      
      // Verify access
      if (conversationDetails.conversation.chatbotId) {
        const chatbot = await storage.getChatbot(conversationDetails.conversation.chatbotId);
        if (!chatbot || chatbot.userId !== userId) {
          return res.status(403).json({ error: "Access denied" });
        }
      }
      
      res.json(conversationDetails);
    } catch (error) {
      console.error("Error fetching conversation details:", error);
      res.status(500).json({ error: "Failed to fetch conversation" });
    }
  });

  // Get extended metrics (response time, ratings)
  app.get("/api/analytics/metrics", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      const days = req.query.days ? parseInt(req.query.days as string) : 7;
      const chatbotId = req.query.chatbotId ? parseInt(req.query.chatbotId as string) : null;
      
      let chatbotIds: number[];
      if (chatbotId) {
        const chatbot = await storage.getChatbot(chatbotId);
        if (!chatbot || chatbot.userId !== userId) {
          return res.status(403).json({ error: "Access denied" });
        }
        chatbotIds = [chatbotId];
      } else {
        const userChatbots = await storage.getChatbotsByUser(userId);
        chatbotIds = userChatbots.map(c => c.id);
      }
      
      if (chatbotIds.length === 0) {
        return res.json({
          averageResponseTimeMs: null,
          averageRating: null,
        });
      }
      
      const avgResponseTime = await storage.getAverageResponseTimeByIds(chatbotIds, days);
      const avgRating = await storage.getAverageRatingByIds(chatbotIds);
      
      res.json({
        averageResponseTimeMs: avgResponseTime,
        averageRating: avgRating,
      });
    } catch (error) {
      console.error("Error fetching metrics:", error);
      res.status(500).json({ error: "Failed to fetch metrics" });
    }
  });

  // ==================== Ratings API ====================

  // Submit rating for a conversation (public endpoint for widget)
  app.post("/api/widget/:chatbotId/rate", async (req, res) => {
    try {
      const chatbotId = parseInt(req.params.chatbotId);
      const { sessionId, rating, feedback } = req.body;
      
      if (!sessionId || !rating || rating < 1 || rating > 5) {
        return res.status(400).json({ error: "Valid sessionId and rating (1-5) required" });
      }
      
      const chatbot = await storage.getChatbot(chatbotId);
      if (!chatbot || !chatbot.isActive) {
        return res.status(404).json({ error: "Chatbot not found" });
      }
      
      const conversation = await storage.getWidgetConversationBySession(chatbotId, sessionId);
      if (!conversation) {
        return res.status(404).json({ error: "Conversation not found" });
      }
      
      // Check if already rated
      const existingRating = await storage.getRatingsByConversation(conversation.id);
      if (existingRating) {
        return res.status(400).json({ error: "Conversation already rated" });
      }
      
      const newRating = await storage.createConversationRating({
        conversationId: conversation.id,
        rating,
        feedback: feedback || null,
      });
      
      res.status(201).json(newRating);
    } catch (error) {
      console.error("Error submitting rating:", error);
      res.status(500).json({ error: "Failed to submit rating" });
    }
  });

  // ==================== Export API ====================

  // Export all user data (chatbots, KB, conversations)
  app.get("/api/export", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      
      const chatbots = await storage.getChatbotsByUser(userId);
      const chatbotIds = chatbots.map(c => c.id);
      
      const exportData: any = {
        exportedAt: new Date().toISOString(),
        chatbots: [],
      };
      
      for (const chatbot of chatbots) {
        const knowledgeBase = await storage.getKnowledgeBaseItemsByChatbot(chatbot.id);
        const conversations = await storage.getRecentConversations(chatbot.id, 100);
        
        exportData.chatbots.push({
          ...chatbot,
          knowledgeBase,
          conversations,
        });
      }
      
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="chatbot-export-${Date.now()}.json"`);
      res.json(exportData);
    } catch (error) {
      console.error("Error exporting data:", error);
      res.status(500).json({ error: "Failed to export data" });
    }
  });

  // Get user limits info
  app.get("/api/user/limits", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      
      const chatbotCount = await storage.getChatbotCountByUser(userId);
      const kbCount = await storage.getKnowledgeBaseCountByUser(userId);
      
      res.json({
        chatbots: { current: chatbotCount, max: MAX_CHATBOTS_PER_USER },
        knowledgeBaseItems: { current: kbCount, max: MAX_KB_ITEMS_PER_USER },
      });
    } catch (error) {
      console.error("Error fetching limits:", error);
      res.status(500).json({ error: "Failed to fetch limits" });
    }
  });

  // ==================== Widget API ====================

  // Get widget config (for embedded widget)
  app.get("/api/widget/:chatbotId/config", async (req, res) => {
    try {
      const chatbotId = parseInt(req.params.chatbotId);
      const chatbot = await storage.getChatbot(chatbotId);
      if (!chatbot) {
        return res.status(404).json({ error: "Chatbot not found" });
      }
      if (!chatbot.isActive) {
        return res.status(403).json({ error: "Chatbot is not active" });
      }
      res.json({
        id: chatbot.id,
        name: chatbot.name,
        primaryColor: chatbot.primaryColor,
        textColor: chatbot.textColor,
        position: chatbot.position,
        welcomeMessage: chatbot.welcomeMessage,
        avatarImage: chatbot.avatarImage,
        elevenLabsAgentId: chatbot.elevenLabsAgentId,
      });
    } catch (error) {
      console.error("Error fetching widget config:", error);
      res.status(500).json({ error: "Failed to fetch widget config" });
    }
  });

  // Get signed URL for voice chat (per chatbot)
  app.get("/api/widget/:chatbotId/voice/signed-url", async (req, res) => {
    try {
      const chatbotId = parseInt(req.params.chatbotId);
      const chatbot = await storage.getChatbot(chatbotId);
      
      if (!chatbot) {
        return res.status(404).json({ error: "Chatbot not found" });
      }
      
      if (!chatbot.elevenLabsAgentId) {
        return res.status(400).json({ error: "Voice not configured for this chatbot" });
      }
      
      const apiKey = process.env.ELEVENLABS_API_KEY;
      if (!apiKey) {
        return res.status(503).json({ error: "ElevenLabs API key not configured" });
      }
      
      const response = await fetch(
        `https://api.elevenlabs.io/v1/convai/conversation/get_signed_url?agent_id=${chatbot.elevenLabsAgentId}`,
        {
          headers: {
            "xi-api-key": apiKey,
          },
        }
      );
      
      if (!response.ok) {
        const error = await response.text();
        console.error("ElevenLabs signed URL error:", error);
        return res.status(response.status).json({ error: "Failed to get signed URL" });
      }
      
      const data = await response.json();
      res.json(data);
    } catch (error) {
      console.error("Error getting chatbot voice signed URL:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Widget chat endpoint (streaming)
  app.post("/api/widget/:chatbotId/chat", async (req, res) => {
    try {
      const chatbotId = parseInt(req.params.chatbotId);
      const { message, sessionId } = req.body;

      if (!message || !sessionId) {
        return res.status(400).json({ error: "Message and sessionId are required" });
      }

      const chatbot = await storage.getChatbot(chatbotId);
      if (!chatbot) {
        return res.status(404).json({ error: "Chatbot not found" });
      }
      if (!chatbot.isActive) {
        return res.status(403).json({ error: "Chatbot is not active" });
      }

      // Get or create conversation
      let conversation = await storage.getWidgetConversationBySession(chatbotId, sessionId);
      if (!conversation) {
        conversation = await storage.createWidgetConversation({
          chatbotId,
          sessionId,
        });
      }

      // Save user message
      await storage.createWidgetMessage({
        conversationId: conversation.id,
        role: "user",
        content: message,
      });

      // Get conversation history
      const messages = await storage.getWidgetMessagesByConversation(conversation.id);
      
      // Get knowledge base context
      const knowledgeItems = await storage.getKnowledgeBaseItemsByChatbot(chatbotId);
      console.log(`[Widget Chat] Chatbot ${chatbotId} has ${knowledgeItems.length} knowledge base items`);
      
      let knowledgeContext = "";
      if (knowledgeItems.length > 0) {
        const kbContent = knowledgeItems.map(i => `### ${i.title}\n${i.content}`).join("\n\n---\n\n");
        knowledgeContext = `

=== INSTRUCCIONES CRÍTICAS - DEBES SEGUIRLAS SIEMPRE ===

1. SOLO puedes responder usando la información de la BASE DE CONOCIMIENTO que aparece abajo.
2. Si la pregunta NO puede ser respondida con la información de la base de conocimiento, DEBES responder EXACTAMENTE: "Lo siento, no tengo información sobre eso en mi base de conocimiento. Solo puedo ayudarte con los temas que tengo documentados."
3. NUNCA inventes, supongas o uses información externa que no esté en la base de conocimiento.
4. Si el usuario insiste en un tema que no está en tu base de conocimiento, repite amablemente que no puedes ayudar con eso.
5. Sé amable y profesional, pero firme en no dar información que no tengas.

=== BASE DE CONOCIMIENTO - ESTA ES TU ÚNICA FUENTE DE INFORMACIÓN ===
${kbContent}
=== FIN DE BASE DE CONOCIMIENTO ===

RECUERDA: Si no está arriba, NO lo sabes. Responde que no tienes esa información.`;
        console.log(`[Widget Chat] Knowledge context length: ${knowledgeContext.length} characters`);
      }

      // Set up SSE
      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");

      let fullResponse = "";
      const aiProvider = chatbot.aiProvider || "openai";
      const aiModel = chatbot.aiModel || "gpt-5";
      const startTime = Date.now();

      if (aiProvider === "openrouter") {
        // Build OpenAI-compatible messages for OpenRouter (free models)
        const chatMessages: OpenAI.Chat.ChatCompletionMessageParam[] = [
          {
            role: "system",
            content: (chatbot.systemPrompt || "You are a helpful assistant.") + knowledgeContext,
          },
          ...messages.map((m) => ({
            role: m.role as "user" | "assistant",
            content: m.content,
          })),
        ];

        // Create OpenRouter client using user's API key
        const openrouterClient = new OpenAI({
          apiKey: process.env.OPENROUTER_API_KEY || "",
          baseURL: "https://openrouter.ai/api/v1",
        });

        // Stream response from OpenRouter
        const stream = await openrouterClient.chat.completions.create({
          model: aiModel,
          messages: chatMessages,
          stream: true,
          max_tokens: chatbot.maxTokens || 1024,
        });

        for await (const chunk of stream) {
          const content = chunk.choices[0]?.delta?.content || "";
          if (content) {
            fullResponse += content;
            res.write(`data: ${JSON.stringify({ content })}\n\n`);
          }
        }
      } else if (aiProvider === "custom") {
        // Build OpenAI-compatible messages for custom endpoint
        const chatMessages: OpenAI.Chat.ChatCompletionMessageParam[] = [
          {
            role: "system",
            content: (chatbot.systemPrompt || "You are a helpful assistant.") + knowledgeContext,
          },
          ...messages.map((m) => ({
            role: m.role as "user" | "assistant",
            content: m.content,
          })),
        ];

        // Create custom OpenAI client for user's server
        const customClient = new OpenAI({
          apiKey: chatbot.customApiKey || "not-required",
          baseURL: chatbot.customEndpoint?.replace(/\/chat\/completions\/?$/, "") || "",
        });

        // Stream response from custom endpoint
        const stream = await customClient.chat.completions.create({
          model: chatbot.customModelName || "default",
          messages: chatMessages,
          stream: true,
          max_tokens: chatbot.maxTokens || 1024,
        });

        for await (const chunk of stream) {
          const content = chunk.choices[0]?.delta?.content || "";
          if (content) {
            fullResponse += content;
            res.write(`data: ${JSON.stringify({ content })}\n\n`);
          }
        }
      } else if (aiProvider === "gemini") {
        // Build Gemini messages
        const systemPrompt = (chatbot.systemPrompt || "You are a helpful assistant.") + knowledgeContext;
        const geminiMessages = messages.map((m) => ({
          role: m.role === "user" ? "user" : "model" as const,
          parts: [{ text: m.content }],
        }));

        // Add system prompt as first user message for Gemini
        const fullContents = [
          { role: "user" as const, parts: [{ text: `System instructions: ${systemPrompt}` }] },
          { role: "model" as const, parts: [{ text: "Understood. I will follow these instructions." }] },
          ...geminiMessages,
        ];
        
        // Stream response from Gemini
        const stream = await gemini.models.generateContentStream({
          model: aiModel,
          contents: fullContents,
          config: {
            maxOutputTokens: chatbot.maxTokens || 1024,
          },
        });

        for await (const chunk of stream) {
          const content = chunk.text || "";
          if (content) {
            fullResponse += content;
            res.write(`data: ${JSON.stringify({ content })}\n\n`);
          }
        }
      } else {
        // Build OpenAI messages
        const chatMessages: OpenAI.Chat.ChatCompletionMessageParam[] = [
          {
            role: "system",
            content: (chatbot.systemPrompt || "You are a helpful assistant.") + knowledgeContext,
          },
          ...messages.map((m) => ({
            role: m.role as "user" | "assistant",
            content: m.content,
          })),
        ];

        // Stream response from OpenAI
        const stream = await openai.chat.completions.create({
          model: aiModel,
          messages: chatMessages,
          stream: true,
          max_completion_tokens: chatbot.maxTokens || 1024,
        });

        for await (const chunk of stream) {
          const content = chunk.choices[0]?.delta?.content || "";
          if (content) {
            fullResponse += content;
            res.write(`data: ${JSON.stringify({ content })}\n\n`);
          }
        }
      }

      // Save assistant message with response time
      const responseTimeMs = Date.now() - startTime;
      await storage.createWidgetMessage({
        conversationId: conversation.id,
        role: "assistant",
        content: fullResponse,
        responseTimeMs,
      });

      res.write(`data: ${JSON.stringify({ done: true, responseTimeMs })}\n\n`);
      res.end();
    } catch (error) {
      console.error("Error in widget chat:", error);
      if (res.headersSent) {
        res.write(`data: ${JSON.stringify({ error: "Chat error" })}\n\n`);
        res.end();
      } else {
        res.status(500).json({ error: "Chat failed" });
      }
    }
  });

  // ==================== Avatar Upload API ====================

  // Serve uploaded images
  app.use('/uploads', (req, res, next) => {
    const uploadsDir = path.join(process.cwd(), 'uploads');
    const filePath = path.join(uploadsDir, req.path);
    
    // Security check: prevent path traversal
    if (!filePath.startsWith(uploadsDir)) {
      return res.status(403).json({ error: "Access denied" });
    }
    
    res.sendFile(filePath, (err) => {
      if (err) {
        res.status(404).json({ error: "File not found" });
      }
    });
  });

  // Upload avatar image for chatbot
  app.post("/api/chatbots/:id/avatar", isAuthenticated, (req: any, res, next) => {
    uploadImage.single('avatar')(req, res, (err: any) => {
      if (err) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({ error: "La imagen es muy grande. Máximo 5MB" });
        }
        if (err.message.includes('Invalid file type')) {
          return res.status(400).json({ error: "Formato no válido. Usa JPG, PNG, GIF o WebP" });
        }
        return res.status(400).json({ error: "Error al procesar la imagen" });
      }
      next();
    });
  }, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      const file = req.file;
      const userId = req.user?.claims?.sub;

      if (!file) {
        return res.status(400).json({ error: "No se subió ninguna imagen" });
      }

      const chatbot = await storage.getChatbot(id);
      if (!chatbot) {
        try { fs.unlinkSync(file.path); } catch {}
        return res.status(404).json({ error: "Chatbot no encontrado" });
      }

      if (chatbot.userId !== userId) {
        try { fs.unlinkSync(file.path); } catch {}
        return res.status(403).json({ error: "Access denied" });
      }

      if (chatbot.avatarImage) {
        try {
          const oldPath = path.join(process.cwd(), chatbot.avatarImage.replace(/^\//, ''));
          if (fs.existsSync(oldPath)) {
            fs.unlinkSync(oldPath);
          }
        } catch {}
      }

      const avatarUrl = `/uploads/${file.filename}`;
      const updatedChatbot = await storage.updateChatbot(id, { avatarImage: avatarUrl });
      
      res.json({ avatarImage: avatarUrl, chatbot: updatedChatbot });
    } catch (error) {
      console.error("Error uploading avatar:", error);
      res.status(500).json({ error: "No se pudo subir la imagen" });
    }
  });

  // Delete avatar image
  app.delete("/api/chatbots/:id/avatar", isAuthenticated, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      const userId = req.user?.claims?.sub;
      const chatbot = await storage.getChatbot(id);
      
      if (!chatbot) {
        return res.status(404).json({ error: "Chatbot no encontrado" });
      }

      if (chatbot.userId !== userId) {
        return res.status(403).json({ error: "Access denied" });
      }

      if (chatbot.avatarImage) {
        try {
          const filePath = path.join(process.cwd(), chatbot.avatarImage.replace(/^\//, ''));
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
          }
        } catch {}
      }

      const updatedChatbot = await storage.updateChatbot(id, { avatarImage: null });
      res.json({ chatbot: updatedChatbot });
    } catch (error) {
      console.error("Error deleting avatar:", error);
      res.status(500).json({ error: "No se pudo eliminar la imagen" });
    }
  });

  // ==================== Predefined Responses ====================
  
  // Get predefined responses for a chatbot
  app.get("/api/predefined-responses/:chatbotId", isAuthenticated, async (req: any, res) => {
    try {
      const chatbotId = parseInt(req.params.chatbotId);
      const userId = req.user?.claims?.sub;
      
      const chatbot = await storage.getChatbot(chatbotId);
      if (!chatbot || chatbot.userId !== userId) {
        return res.status(403).json({ error: "Access denied" });
      }
      
      const responses = await storage.getPredefinedResponsesByChatbot(chatbotId);
      res.json(responses);
    } catch (error) {
      console.error("Error fetching predefined responses:", error);
      res.status(500).json({ error: "Failed to fetch responses" });
    }
  });

  // Create predefined response
  app.post("/api/predefined-responses", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      const { chatbotId, title, content, category } = req.body;
      
      const chatbot = await storage.getChatbot(chatbotId);
      if (!chatbot || chatbot.userId !== userId) {
        return res.status(403).json({ error: "Access denied" });
      }
      
      const response = await storage.createPredefinedResponse({
        chatbotId,
        title,
        content,
        category,
        isActive: true,
      });
      res.json(response);
    } catch (error) {
      console.error("Error creating predefined response:", error);
      res.status(500).json({ error: "Failed to create response" });
    }
  });

  // Update predefined response
  app.patch("/api/predefined-responses/:id", isAuthenticated, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      const updates = req.body;
      
      const response = await storage.updatePredefinedResponse(id, updates);
      res.json(response);
    } catch (error) {
      console.error("Error updating predefined response:", error);
      res.status(500).json({ error: "Failed to update response" });
    }
  });

  // Delete predefined response
  app.delete("/api/predefined-responses/:id", isAuthenticated, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deletePredefinedResponse(id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting predefined response:", error);
      res.status(500).json({ error: "Failed to delete response" });
    }
  });

  // ==================== Notifications ====================
  
  // Get notifications for user
  app.get("/api/notifications", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      const unreadOnly = req.query.unreadOnly === 'true';
      
      const notificationsList = await storage.getNotificationsByUser(userId, unreadOnly);
      res.json(notificationsList);
    } catch (error) {
      console.error("Error fetching notifications:", error);
      res.status(500).json({ error: "Failed to fetch notifications" });
    }
  });

  // Get unread notification count
  app.get("/api/notifications/count", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      const count = await storage.getUnreadNotificationCount(userId);
      res.json({ count });
    } catch (error) {
      console.error("Error fetching notification count:", error);
      res.status(500).json({ error: "Failed to fetch count" });
    }
  });

  // Mark notification as read
  app.patch("/api/notifications/:id/read", isAuthenticated, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.markNotificationAsRead(id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error marking notification as read:", error);
      res.status(500).json({ error: "Failed to mark as read" });
    }
  });

  // Mark all notifications as read
  app.patch("/api/notifications/read-all", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      await storage.markAllNotificationsAsRead(userId);
      res.json({ success: true });
    } catch (error) {
      console.error("Error marking all notifications as read:", error);
      res.status(500).json({ error: "Failed to mark all as read" });
    }
  });

  // ==================== Widget Lead Capture ====================
  
  // Update conversation with visitor info (for lead capture)
  app.patch("/api/widget/:chatbotId/conversation/:sessionId/visitor", async (req, res) => {
    try {
      const chatbotId = parseInt(req.params.chatbotId);
      const sessionId = req.params.sessionId;
      const { visitorName, visitorEmail, visitorPhone, visitorCompany } = req.body;
      
      const conversation = await storage.getWidgetConversationBySession(chatbotId, sessionId);
      if (!conversation) {
        return res.status(404).json({ error: "Conversation not found" });
      }
      
      const updated = await storage.updateWidgetConversation(conversation.id, {
        visitorName,
        visitorEmail,
        visitorPhone,
        visitorCompany,
      });
      
      res.json(updated);
    } catch (error) {
      console.error("Error updating visitor info:", error);
      res.status(500).json({ error: "Failed to update visitor info" });
    }
  });

  // Get widget config including lead capture settings
  app.get("/api/widget/:chatbotId/lead-config", async (req, res) => {
    try {
      const chatbotId = parseInt(req.params.chatbotId);
      const chatbot = await storage.getChatbot(chatbotId);
      
      if (!chatbot) {
        return res.status(404).json({ error: "Chatbot not found" });
      }
      
      res.json({
        requireLeadCapture: chatbot.requireLeadCapture || false,
        leadCaptureFields: chatbot.leadCaptureFields?.split(',') || ['name', 'email'],
      });
    } catch (error) {
      console.error("Error fetching lead config:", error);
      res.status(500).json({ error: "Failed to fetch lead config" });
    }
  });

  return httpServer;
}
