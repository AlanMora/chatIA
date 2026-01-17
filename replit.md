# ChatBot AI Platform

## Overview
A platform for creating AI-powered chatbots that can be embedded on any website. Users can create, customize, and deploy chatbots with knowledge bases and custom appearances.

## Current State
The MVP is complete with:
- Dashboard with overview and quick start guide
- Chatbot CRUD operations with AI model selection
- Knowledge Base management for training chatbots
- Embed code generator with live preview
- **Real-time Analytics dashboard** with conversation and message tracking
- Settings page with theme switching
- Embeddable widget (widget.js) for external websites
- Custom avatar image uploads for chatbots

## Recent Changes
- January 2026: Initial MVP implementation
- Created schema for chatbots, knowledge base, conversations, messages
- Built React frontend with Shadcn UI components
- Implemented streaming chat with OpenAI (via Replit AI Integrations)
- Added embeddable widget with SSE streaming responses
- **Implemented real analytics dashboard** with PostgreSQL persistence
  - Conversations and messages are stored in database
  - Bar chart showing daily conversation trends
  - Pie chart showing user vs bot message distribution
  - Recent conversations list
  - Filter by chatbot and time range (24h, 7d, 30d, 90d)
- Added custom avatar image upload for chatbots

## Project Architecture

### Frontend (client/)
- **Framework:** React with TypeScript
- **Routing:** wouter
- **State Management:** TanStack Query
- **UI Components:** Shadcn UI (Radix primitives + Tailwind)
- **Styling:** Tailwind CSS

### Backend (server/)
- **Framework:** Express.js
- **Database:** PostgreSQL with Drizzle ORM
- **AI:** OpenAI, Gemini, and custom endpoints via Replit AI Integrations

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
- `POST /api/knowledge-base` - Create text item
- `POST /api/knowledge-base/upload` - Upload file (PDF, DOC, DOCX, TXT) and extract content
- `POST /api/knowledge-base/url` - Extract content from web page URL
- `DELETE /api/knowledge-base/:id` - Delete item

### Widget (for embedded use)
- `GET /api/widget/:chatbotId/config` - Get widget configuration
- `POST /api/widget/:chatbotId/chat` - Stream chat response (SSE)

### Analytics
- `GET /api/analytics/stats` - Get analytics stats (conversations, messages, etc.)
- `GET /api/analytics/daily` - Get daily stats for charts
- `GET /api/analytics/conversations` - Get recent conversations

### Avatar Upload
- `POST /api/chatbots/:id/avatar` - Upload custom avatar image
- `DELETE /api/chatbots/:id/avatar` - Delete avatar image

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

## Security Implementation
- **Multi-tenant isolation**: Each user only sees their own chatbots and analytics
- **Replit Auth (OIDC)**: Supports Google, GitHub, Apple, and email login
- **Protected API routes**: All chatbot/analytics/knowledge-base routes require authentication
- **Analytics scoping**: Analytics endpoints filter by user's chatbots (getAnalyticsStatsByIds, getDailyStatsByIds, getRecentConversationsByIds)
- **Ownership verification**: All chatbot operations verify userId before proceeding
- **ElevenLabs protection**: All admin endpoints for voice configuration require authentication

## ElevenLabs Voice Integration
- **Admin page** (/elevenlabs): Configure voice, upload documents, sync KB
- **Voice in chat preview**: VoiceChat component integrated in chatbot preview
- **Voice in widget**: WebSocket-based voice support in embeddable widget
- **Endpoints**: /api/elevenlabs/voices, /api/elevenlabs/agent, /api/elevenlabs/knowledge-base
- **Secrets**: ELEVENLABS_API_KEY, ELEVENLABS_AGENT_ID

## Known Limitations
- Analytics don't track response times or satisfaction ratings yet
