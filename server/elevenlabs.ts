import type { Express } from "express";

const ELEVENLABS_API_URL = "https://api.elevenlabs.io/v1";

interface ElevenLabsVoice {
  voice_id: string;
  name: string;
  category?: string;
  labels?: Record<string, string>;
  preview_url?: string;
}

export async function registerElevenLabsRoutes(app: Express): Promise<void> {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  const agentId = process.env.ELEVENLABS_AGENT_ID;

  app.get("/api/elevenlabs/config", (req, res) => {
    res.json({
      agentId: agentId || null,
      enabled: !!(apiKey && agentId),
    });
  });

  if (!apiKey || !agentId) {
    console.warn("ElevenLabs API key or Agent ID not configured. Voice features will be disabled.");
    
    app.get("/api/elevenlabs/signed-url", (req, res) => {
      res.status(503).json({ error: "ElevenLabs not configured" });
    });
    app.get("/api/elevenlabs/voices", (req, res) => {
      res.status(503).json({ error: "ElevenLabs not configured" });
    });
    app.get("/api/elevenlabs/agent", (req, res) => {
      res.status(503).json({ error: "ElevenLabs not configured" });
    });
    app.patch("/api/elevenlabs/agent", (req, res) => {
      res.status(503).json({ error: "ElevenLabs not configured" });
    });
    app.get("/api/elevenlabs/knowledge-base", (req, res) => {
      res.status(503).json({ error: "ElevenLabs not configured" });
    });
    app.post("/api/elevenlabs/knowledge-base/sync", (req, res) => {
      res.status(503).json({ error: "ElevenLabs not configured" });
    });
    return;
  }

  app.get("/api/elevenlabs/signed-url", async (req, res) => {
    try {
      const response = await fetch(
        `${ELEVENLABS_API_URL}/convai/conversation/get_signed_url?agent_id=${agentId}`,
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
      console.error("Error getting signed URL:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.get("/api/elevenlabs/voices", async (req, res) => {
    try {
      const response = await fetch(`${ELEVENLABS_API_URL}/voices`, {
        headers: {
          "xi-api-key": apiKey,
        },
      });

      if (!response.ok) {
        const error = await response.text();
        console.error("ElevenLabs voices error:", error);
        return res.status(response.status).json({ error: "Failed to fetch voices" });
      }

      const data = await response.json();
      const voices = data.voices.map((v: ElevenLabsVoice) => ({
        id: v.voice_id,
        name: v.name,
        category: v.category || "unknown",
        labels: v.labels || {},
        previewUrl: v.preview_url,
      }));
      res.json(voices);
    } catch (error) {
      console.error("Error fetching voices:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.get("/api/elevenlabs/agent", async (req, res) => {
    try {
      const response = await fetch(`${ELEVENLABS_API_URL}/convai/agents/${agentId}`, {
        headers: {
          "xi-api-key": apiKey,
        },
      });

      if (!response.ok) {
        const error = await response.text();
        console.error("ElevenLabs agent error:", error);
        return res.status(response.status).json({ error: "Failed to fetch agent" });
      }

      const data = await response.json();
      res.json({
        agentId: data.agent_id,
        name: data.name,
        voice: data.conversation_config?.tts?.voice_id || null,
        firstMessage: data.conversation_config?.agent?.first_message || null,
        systemPrompt: data.conversation_config?.agent?.prompt?.prompt || null,
      });
    } catch (error) {
      console.error("Error fetching agent:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.patch("/api/elevenlabs/agent", async (req, res) => {
    try {
      const { voiceId, firstMessage, systemPrompt } = req.body;

      const conversationConfig: Record<string, unknown> = {};

      if (voiceId) {
        conversationConfig.tts = {
          voice_id: voiceId,
        };
      }

      if (firstMessage || systemPrompt) {
        conversationConfig.agent = {
          ...(firstMessage && { first_message: firstMessage }),
          ...(systemPrompt && {
            prompt: {
              prompt: systemPrompt,
            },
          }),
        };
      }

      const updatePayload: Record<string, unknown> = {};
      if (Object.keys(conversationConfig).length > 0) {
        updatePayload.conversation_config = conversationConfig;
      }

      const response = await fetch(`${ELEVENLABS_API_URL}/convai/agents/${agentId}`, {
        method: "PATCH",
        headers: {
          "xi-api-key": apiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updatePayload),
      });

      if (!response.ok) {
        const error = await response.text();
        console.error("ElevenLabs update agent error:", error);
        return res.status(response.status).json({ error: "Failed to update agent" });
      }

      const data = await response.json();
      res.json({
        success: true,
        agent: data,
      });
    } catch (error) {
      console.error("Error updating agent:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.get("/api/elevenlabs/knowledge-base", async (req, res) => {
    try {
      const response = await fetch(`${ELEVENLABS_API_URL}/convai/agents/${agentId}`, {
        headers: {
          "xi-api-key": apiKey,
        },
      });

      if (!response.ok) {
        const error = await response.text();
        console.error("ElevenLabs KB error:", error);
        return res.status(response.status).json({ error: "Failed to fetch knowledge base" });
      }

      const data = await response.json();
      const knowledgeBase = data.agent_config?.knowledge_base || [];
      res.json(knowledgeBase);
    } catch (error) {
      console.error("Error fetching knowledge base:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.post("/api/elevenlabs/knowledge-base/sync", async (req, res) => {
    try {
      const { content, filename } = req.body;

      if (!content) {
        return res.status(400).json({ error: "Content is required" });
      }

      const formData = new FormData();
      const blob = new Blob([content], { type: "text/plain" });
      formData.append("file", blob, filename || "knowledge_base.txt");

      const response = await fetch(
        `${ELEVENLABS_API_URL}/convai/agents/${agentId}/add-to-knowledge-base`,
        {
          method: "POST",
          headers: {
            "xi-api-key": apiKey,
          },
          body: formData,
        }
      );

      if (!response.ok) {
        const error = await response.text();
        console.error("ElevenLabs KB sync error:", error);
        return res.status(response.status).json({ error: "Failed to sync knowledge base" });
      }

      const data = await response.json();
      res.json({
        success: true,
        data,
      });
    } catch (error) {
      console.error("Error syncing knowledge base:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });
}
