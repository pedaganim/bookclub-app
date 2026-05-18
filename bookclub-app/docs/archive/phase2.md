# Phase 2 Development Roadmap

This document tracks planned features and improvements for the next phase of the BookClub application.

## 🚀 Planned Features

### 🔍 SEO & Discoverability
- **Public Access for Discovery Pages**: 
  - Make the **Clubs Explore** and **Book Details** pages accessible without authentication.
  - This allows search engines (Google, etc.) to index book titles, club names, and metadata, driving organic search traffic.
  - **Implementation Note**: Maintain a "Hybrid Approach" where viewing is public but interactive actions (Joining, Editing, Reading) remain protected by authentication.

### 🤖 Bedrock Model Migration
- **Deprecated Model Update**: 
  - **Claude 3 Haiku** (`anthropic.claude-3-haiku-20240307-v1:0`) is being deprecated in `us-east-1`.
  - Migrate all AI services (Book analysis, cover analyzer, etc.) to the newer version: **Claude 3.5 Haiku** (`anthropic.claude-3-5-haiku-20241022-v1:0`).
  - Update environment variables in `serverless.yml` and default values in `bedrock-analyzer.js`.

### 📚 Multi-Category Library System
- **Universal Item Analyzer**:
  - Implement a single Bedrock query that identifies the item category (Book, Toy, Tool, Event Hire, Game, or Misc) and extracts relevant metadata in one pass.
  - Eliminate the need for multiple calls or pre-selecting the item type.
- **Unified Storage (Zero-Migration Approach)**:
  - Reuse the existing `books` table for all item types.
  - Add an `itemType` or `category` column to differentiate records.
  - Maintain existing column schema where possible to avoid data migrations.
- **Frontend Scoped Libraries**:
  - Browse items by library (e.g., "Toy Library", "Book Library") just like the current book browser.
  - Add a "Library" selection/filter to the Explore and Dashboard pages.
- **Enhanced Club Discovery**:
  - Implement horizontal scroll carousels for each library type within the Club Explore view.

### 💬 Messaging & Social
- **Individual & Club-Wide Chat**:
  - Support for both 1-on-1 Direct Messages and shared **Club Chats**.
  - Users should be able to send messages to the entire club, similar to a group chat.
- **Privacy & Community Safety**:
  - **Club-Scoped Messaging**: Restrict 1-on-1 messaging so that users can only message each other if they share a common club membership.
  - **Smart UI**: Replace the "Message" button with a "Join Club" CTA if no common clubs are detected.
  - **Backend Enforcement**: Validate membership in message handlers to prevent API-level bypass.

### ⚡ Performance & Debugging
- **Optimize Data Fetching**:
  - Eliminate background pagination loops in the frontend (e.g., in `Home.tsx`) that fetch multiple pages just to compute totals.
  - Implement a dedicated `/count` or summary endpoint in the backend for efficient statistics.
- **Caching Strategy**:
  - Introduce a robust client-side caching layer (e.g., React Query or SWR) to prevent redundant network requests when navigating between pages.
- **Lazy Loading & Code Splitting**:
  - Ensure heavy components and libraries are lazy-loaded to reduce the initial bundle size.
- **Observability**:
  - Integrate performance monitoring (e.g., AWS X-Ray for backend, Web Vitals for frontend) to identify and debug "mystery" slowness.

## 📝 Pending Items
*(Add more Phase 2 items here as they are identified)*
