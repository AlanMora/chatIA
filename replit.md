# ChatBot AI Platform

## Overview
A platform for creating AI-powered chatbots that can be embedded on any website. Users can create, customize, and deploy chatbots with knowledge bases and custom appearances.

## Current State
The MVP is complete with:
- Dashboard with overview and quick start guide
- Chatbot CRUD operations with AI model selection
- Knowledge Base management for training chatbots
- Embed code generator with live preview
- Analytics page (placeholder data)
- Settings page with theme switching
- Embeddable widget (widget.js) for external websites

## Recent Changes
- January 2026: Initial MVP implementation
- Created schema for chatbots, knowledge base, conversations, messages
- Built React frontend with Shadcn UI components
- Implemented streaming chat with OpenAI (via Replit AI Integrations)
- Added embeddable widget with SSE streaming responses

## Project Architecture

### Frontend (client/)
- **Framework:** React with TypeScript
- **Routing:** wouter
- **State Management:** TanStack Query
- **UI Components:** Shadcn UI (Radix primitives + Tailwind)
- **Styling:** Tailwind CSS

### Backend (server/)
- **Framework:** Express.js
- **Storage:** In-memory (MemStorage class)
- **AI:** OpenAI via Replit AI Integrations (gpt-5, gpt-5.1, gpt-4o, gpt-4o-mini)

### Key Files
- `shared/schema.ts` - Data models and Zod schemas
- `server/storage.ts` - Storage interface and MemStorage implementation
- `server/routes.ts` - API endpoints
- `client/src/App.tsx` - Main app with routing and sidebar
- `client/src/components/chat-widget.tsx` - Chat widget preview
- `client/public/widget.js` - Embeddable script for external websites

## API Endpoints

### Chatbots
- `GET /api/chatbots` - List all chatbots
- `GET /api/chatbots/:id` - Get single chatbot
- `POST /api/chatbots` - Create chatbot
- `PATCH /api/chatbots/:id` - Update chatbot
- `DELETE /api/chatbots/:id` - Delete chatbot

### Knowledge Base
- `GET /api/knowledge-base/:chatbotId` - Get items for chatbot
- `POST /api/knowledge-base` - Create item
- `DELETE /api/knowledge-base/:id` - Delete item

### Widget (for embedded use)
- `GET /api/widget/:chatbotId/config` - Get widget configuration
- `POST /api/widget/:chatbotId/chat` - Stream chat response (SSE)

## Running the Project
The project runs on port 5000 with `npm run dev`. Express serves both the API and the Vite-built frontend.

## User Preferences
- Language: Spanish for communication, English for UI
- Design: Linear/Notion-inspired dashboard with Intercom-style widget
- AI: Uses Replit AI Integrations (no API key required)

## Widget Embedding
To embed a chatbot on an external website:
```html
<script src="https://your-replit-url/widget.js" data-chatbot-id="1"></script>
```

## Known Limitations
- Data is stored in memory (not persisted across restarts)
- Analytics show placeholder data
- No user authentication yet
