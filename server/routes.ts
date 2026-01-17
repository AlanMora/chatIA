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

  // Create chatbot
  app.post("/api/chatbots", isAuthenticated, async (req: any, res) => {
    try {
      const parsed = insertChatbotSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.message });
      }
      const userId = req.user?.claims?.sub;
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
  app.get("/api/knowledge-base/:chatbotId", async (req, res) => {
    try {
      const chatbotId = parseInt(req.params.chatbotId);
      const items = await storage.getKnowledgeBaseItemsByChatbot(chatbotId);
      res.json(items);
    } catch (error) {
      console.error("Error fetching knowledge base:", error);
      res.status(500).json({ error: "Failed to fetch knowledge base items" });
    }
  });

  // Create knowledge base item
  app.post("/api/knowledge-base", async (req, res) => {
    try {
      const parsed = insertKnowledgeBaseItemSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.message });
      }
      const item = await storage.createKnowledgeBaseItem(parsed.data);
      res.status(201).json(item);
    } catch (error) {
      console.error("Error creating knowledge base item:", error);
      res.status(500).json({ error: "Failed to create knowledge base item" });
    }
  });

  // Delete knowledge base item
  app.delete("/api/knowledge-base/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteKnowledgeBaseItem(id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting knowledge base item:", error);
      res.status(500).json({ error: "Failed to delete knowledge base item" });
    }
  });

  // Upload file and extract content
  app.post("/api/knowledge-base/upload", uploadDocs.single('file'), async (req, res) => {
    try {
      const file = req.file;
      const chatbotId = parseInt(req.body.chatbotId);
      const title = req.body.title || file?.originalname || 'Uploaded File';

      if (!file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      if (!chatbotId) {
        return res.status(400).json({ error: "chatbotId is required" });
      }

      let content = "";

      // Extract content based on file type
      if (file.mimetype === 'application/pdf') {
        const pdfModule = await import("pdf-parse");
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
  app.post("/api/knowledge-base/url", async (req, res) => {
    try {
      const { chatbotId, url, title } = req.body;

      if (!chatbotId || !url) {
        return res.status(400).json({ error: "chatbotId and url are required" });
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
  app.get("/api/analytics/stats", async (req, res) => {
    try {
      const chatbotId = req.query.chatbotId ? parseInt(req.query.chatbotId as string) : undefined;
      const days = req.query.days ? parseInt(req.query.days as string) : 7;
      
      const stats = await storage.getAnalyticsStats(chatbotId, days);
      res.json(stats);
    } catch (error) {
      console.error("Error fetching analytics stats:", error);
      res.status(500).json({ error: "Failed to fetch analytics" });
    }
  });

  // Get daily stats for charts
  app.get("/api/analytics/daily", async (req, res) => {
    try {
      const chatbotId = req.query.chatbotId ? parseInt(req.query.chatbotId as string) : undefined;
      const days = req.query.days ? parseInt(req.query.days as string) : 7;
      
      const dailyStats = await storage.getDailyStats(chatbotId, days);
      res.json(dailyStats);
    } catch (error) {
      console.error("Error fetching daily stats:", error);
      res.status(500).json({ error: "Failed to fetch daily stats" });
    }
  });

  // Get recent conversations
  app.get("/api/analytics/conversations", async (req, res) => {
    try {
      const chatbotId = req.query.chatbotId ? parseInt(req.query.chatbotId as string) : undefined;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;
      
      const conversations = await storage.getRecentConversations(chatbotId, limit);
      res.json(conversations);
    } catch (error) {
      console.error("Error fetching conversations:", error);
      res.status(500).json({ error: "Failed to fetch conversations" });
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
      });
    } catch (error) {
      console.error("Error fetching widget config:", error);
      res.status(500).json({ error: "Failed to fetch widget config" });
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
      const knowledgeContext = knowledgeItems.length > 0
        ? `\n\nKnowledge Base Context:\n${knowledgeItems.map(i => `${i.title}: ${i.content}`).join("\n\n")}`
        : "";

      // Set up SSE
      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");

      let fullResponse = "";
      const aiProvider = chatbot.aiProvider || "openai";
      const aiModel = chatbot.aiModel || "gpt-5";

      if (aiProvider === "custom") {
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

        // Stream response from Gemini
        const stream = await gemini.models.generateContentStream({
          model: aiModel,
          contents: geminiMessages,
          systemInstruction: systemPrompt,
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

      // Save assistant message
      await storage.createWidgetMessage({
        conversationId: conversation.id,
        role: "assistant",
        content: fullResponse,
      });

      res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
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
  app.post("/api/chatbots/:id/avatar", (req, res, next) => {
    uploadImage.single('avatar')(req, res, (err) => {
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
  }, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const file = req.file;

      if (!file) {
        return res.status(400).json({ error: "No se subió ninguna imagen" });
      }

      const chatbot = await storage.getChatbot(id);
      if (!chatbot) {
        try { fs.unlinkSync(file.path); } catch {}
        return res.status(404).json({ error: "Chatbot no encontrado" });
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
  app.delete("/api/chatbots/:id/avatar", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const chatbot = await storage.getChatbot(id);
      
      if (!chatbot) {
        return res.status(404).json({ error: "Chatbot no encontrado" });
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

  return httpServer;
}
