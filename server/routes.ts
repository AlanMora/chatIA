import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertChatbotSchema, insertKnowledgeBaseItemSchema } from "@shared/schema";
import OpenAI from "openai";
import { GoogleGenAI } from "@google/genai";
import multer from "multer";
import mammoth from "mammoth";
import * as cheerio from "cheerio";

const upload = multer({ 
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
  // ==================== Chatbots API ====================
  
  // Get all chatbots
  app.get("/api/chatbots", async (req, res) => {
    try {
      const chatbots = await storage.getAllChatbots();
      res.json(chatbots);
    } catch (error) {
      console.error("Error fetching chatbots:", error);
      res.status(500).json({ error: "Failed to fetch chatbots" });
    }
  });

  // Get single chatbot
  app.get("/api/chatbots/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const chatbot = await storage.getChatbot(id);
      if (!chatbot) {
        return res.status(404).json({ error: "Chatbot not found" });
      }
      res.json(chatbot);
    } catch (error) {
      console.error("Error fetching chatbot:", error);
      res.status(500).json({ error: "Failed to fetch chatbot" });
    }
  });

  // Create chatbot
  app.post("/api/chatbots", async (req, res) => {
    try {
      const parsed = insertChatbotSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.message });
      }
      const chatbot = await storage.createChatbot(parsed.data);
      res.status(201).json(chatbot);
    } catch (error) {
      console.error("Error creating chatbot:", error);
      res.status(500).json({ error: "Failed to create chatbot" });
    }
  });

  // Update chatbot
  app.patch("/api/chatbots/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const chatbot = await storage.updateChatbot(id, req.body);
      if (!chatbot) {
        return res.status(404).json({ error: "Chatbot not found" });
      }
      res.json(chatbot);
    } catch (error) {
      console.error("Error updating chatbot:", error);
      res.status(500).json({ error: "Failed to update chatbot" });
    }
  });

  // Delete chatbot
  app.delete("/api/chatbots/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
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
  app.post("/api/knowledge-base/upload", upload.single('file'), async (req, res) => {
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

      if (aiProvider === "gemini") {
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

  return httpServer;
}
