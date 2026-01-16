# Design Guidelines: AI Chatbot Platform

## Design Approach
**System Selected:** Linear/Notion-inspired dashboard with Intercom-style widget design  
**Rationale:** Utility-focused SaaS platform requiring clean, efficient interfaces for configuration while maintaining approachable chat widget aesthetics.

## Typography System
- **Primary Font:** Inter (Google Fonts) - Dashboard UI, settings, navigation
- **Secondary Font:** System UI stack - Chat widget for optimal readability
- **Hierarchy:**
  - Page titles: text-3xl font-semibold
  - Section headers: text-xl font-medium  
  - Body text: text-base font-normal
  - Labels/metadata: text-sm font-medium
  - Code snippets: font-mono text-sm

## Layout & Spacing System
**Tailwind Units:** Primarily use 2, 4, 6, 8, 12, 16 for consistent rhythm
- Component padding: p-4, p-6, p-8
- Section spacing: space-y-6, space-y-8
- Container margins: mx-auto max-w-7xl px-4

## Core Application Structure

### Dashboard Layout
**Sidebar Navigation (Fixed Left):**
- Width: w-64
- Navigation items with icons (Heroicons via CDN)
- Sections: Dashboard, Chatbots, Knowledge Base, Integrations, Analytics, Settings
- Active state: Subtle background treatment
- Spacing: py-2 px-4 for each item

**Main Content Area:**
- Left margin: ml-64 (sidebar width)
- Container: max-w-6xl mx-auto p-8
- Responsive: Full-width on mobile (sidebar collapses to overlay)

### Key Dashboard Pages

**1. Chatbot Builder:**
- Split layout: 50/50 on desktop
  - Left: Configuration panel with accordion sections
  - Right: Live preview of chat widget
- Configuration sections:
  - Basic Settings (name, description)
  - AI Model Selection (dropdown with provider logos)
  - Knowledge Base upload/connection
  - Appearance customization
  - Behavior settings

**2. Knowledge Base Manager:**
- Card-based grid: grid-cols-1 md:grid-cols-2 lg:grid-cols-3
- Each card shows: document name, type, upload date, status badge
- Bulk actions toolbar at top
- Drag-and-drop upload zone (dashed border, centered icon and text)

**3. Embed Code Generator:**
- Code snippet display: Monospace font, subtle background
- Copy button: Positioned top-right of code block
- Preview toggle: Tabs for desktop/mobile/tablet views
- Step-by-step integration guide below code

**4. Analytics Dashboard:**
- Stats cards row: grid-cols-1 md:grid-cols-2 lg:grid-cols-4
  - Total conversations, Messages sent, Avg response time, Satisfaction rate
- Charts section: Simple line/bar charts
- Recent conversations table: Striped rows, hover states

## Chat Widget Design (Embeddable Component)

**Minimized State:**
- Circular button: Bottom-right fixed positioning (right-6 bottom-6)
- Size: w-14 h-14
- Chat icon (Heroicons message-circle)
- Notification badge for new messages

**Expanded State:**
- Dimensions: w-96 h-[600px] on desktop, full-screen on mobile
- Border radius: rounded-2xl
- Shadow: shadow-2xl for depth
- Structure:
  - Header (h-16): Bot name, status indicator, minimize/close buttons
  - Messages area (flex-1): Scrollable, py-4 px-4 spacing
  - Input area (h-20): Text input + send button, sticky bottom

**Message Bubbles:**
- User messages: Aligned right, max-w-xs
- Bot messages: Aligned left, max-w-sm
- Spacing: space-y-4 between messages
- Padding: px-4 py-2 per bubble
- Rounded corners: rounded-2xl with directional tail simulation

## Component Library

**Buttons:**
- Primary: px-6 py-2.5 rounded-lg font-medium
- Secondary: Border variant
- Icon buttons: p-2 rounded-lg
- States: Hover lift effect (subtle), active press effect

**Form Inputs:**
- Text inputs: px-4 py-2.5 rounded-lg border
- Dropdowns: Custom styled with chevron icon
- Textareas: min-h-32 for Knowledge Base content
- Focus rings: 2px offset ring

**Cards:**
- Padding: p-6
- Border radius: rounded-xl
- Border: 1px solid
- Hover: Subtle lift (transform translateY)

**Tables:**
- Header row: font-medium text-sm
- Cell padding: px-6 py-4
- Striped rows for readability
- Hover row highlight

**Modals/Overlays:**
- Backdrop: Fixed inset with opacity
- Modal container: max-w-2xl mx-auto
- Padding: p-6
- Rounded: rounded-2xl

**Badges:**
- Status indicators: px-2.5 py-1 rounded-full text-xs font-medium
- Variants for: Active, Inactive, Processing, Error

## Navigation Patterns
- Top bar: Global actions (search, notifications, user menu)
- Breadcrumbs: For nested pages (text-sm with chevron separators)
- Tabs: For multi-section pages (border-b with active indicator)

## Key Interactions
- Drag-and-drop: Visual feedback with dashed borders and hover states
- Code copying: Success toast notification
- Widget preview: Real-time updates as configuration changes
- Settings save: Auto-save with visual confirmation

## Accessibility
- All interactive elements: Proper focus states with visible outlines
- Icon buttons: aria-labels for screen readers
- Form fields: Associated labels, error states with descriptive text
- Keyboard navigation: Tab order follows visual hierarchy

## Images
No hero images needed - this is a functional dashboard. Use:
- Empty state illustrations for new users (simple SVG placeholders)
- Provider logos in AI model selection (50x50px)
- Generic avatar placeholders in chat preview