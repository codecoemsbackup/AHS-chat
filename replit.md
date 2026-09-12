# AHS Chat - Real-Time Community Server

## Overview

AHS Chat is a real-time community server where every authenticated user shares one server and its channels. The application provides a Discord-inspired messaging experience with live typing indicators, online status updates, persistent chat history, and server-side moderation controls.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Technology Stack:**
- React 18 with TypeScript for type-safe component development
- Vite as the build tool and development server
- Wouter for lightweight client-side routing
- TanStack Query (React Query) for server state management and caching
- Socket.io client for real-time bidirectional communication

**UI Framework:**
- Shadcn/ui component library built on Radix UI primitives
- Tailwind CSS for utility-first styling with custom design tokens
- Design system follows the "new-york" style variant with neutral base colors
- Responsive layout system with mobile-first approach

**State Management:**
- Server state managed through TanStack Query with automatic caching and revalidation
- Real-time updates pushed via Socket.io and integrated with query cache invalidation
- Local UI state managed with React hooks (useState, useEffect, useRef)

**Layout Structure:**
- Three-column desktop layout: Server/channel sidebar (w-72), Chat area (flex-1), Member panel (w-64)
- Mobile: Single column with view switching
- Authenticated vs. unauthenticated routing (landing page vs. chat interface)

### Backend Architecture

**Framework & Runtime:**
- Express.js server running on Node.js
- TypeScript with ESM modules
- Socket.io server for WebSocket connections and real-time event handling

**API Design:**
- RESTful endpoints for channels, server members, messages, bans, and permissions
- Session-based authentication integrated with Replit Auth (OpenID Connect)
- Real-time events handled separately through Socket.io (message delivery, typing indicators, status updates)

**Data Access Layer:**
- Storage abstraction (IStorage interface) implemented by DatabaseStorage class
- Drizzle ORM for type-safe database queries
- Database operations wrapped in service methods for business logic encapsulation

**Authentication Flow:**
- Replit Auth (OpenID Connect) for user authentication
- Session management using express-session with PostgreSQL store (connect-pg-simple)
- Session persistence across server restarts via database-backed session store
- Protected routes using isAuthenticated middleware
- Username setup flow for first-time users

**Real-Time Communication:**
- Socket.io manages persistent WebSocket connections
- Connected users tracked in memory (Map<userId, socketId>)
- Events: user:connect, message:send, message:receive, typing:start, typing:stop, status:update
- Automatic reconnection handling on client side

### Data Storage

**Database:**
- PostgreSQL (configured for Neon serverless via @neondatabase/serverless)
- WebSocket driver for serverless compatibility
- Connection pooling handled by Drizzle ORM

**Schema Design:**

*Sessions Table:*
- Stores Express session data for authentication persistence
- Fields: sid (PK), sess (jsonb), expire (timestamp with index)

*Users Table:*
- Core user data with authentication details
- Fields: id (UUID PK), email, firstName, lastName, profileImageUrl, username (unique), status, lastSeen, timestamps
- Status field tracks online/away/dnd/offline states

*Servers and Channels Tables:*
- One shared server with a default `general` channel and admin-managed text channels
- Channels include a name, description, display position, and timestamps

*Server Messages Table:*
- Channel message storage with sender relationship
- Fields: id, channelId, senderId, content, timestamps, and soft-delete metadata

*Banned Users Table:*
- Server moderation records with the target user, banning admin, reason, and timestamp

*User Permission Fields:*
- `isAdmin`, `isOwner`, and `allowAdminManagement`
- The `CodeCoems` username is automatically made the owner and an admin

**Data Migration:**
- Drizzle Kit for schema migrations
- Migration files stored in /migrations directory
- Database schema defined in shared/schema.ts for type sharing between client and server

### External Dependencies

**Third-Party Services:**
- Replit Auth (OIDC provider): User authentication and identity management
- Google Fonts CDN: Typography (Inter, DM Sans, Fira Code, Geist Mono, Architects Daughter)

**Key NPM Packages:**

*Frontend:*
- @radix-ui/* packages: Accessible UI primitives (dialogs, dropdowns, avatars, etc.)
- @tanstack/react-query: Server state management
- socket.io-client: WebSocket client
- wouter: Routing
- react-hook-form + @hookform/resolvers: Form handling and validation
- zod: Schema validation (shared with backend)
- date-fns: Date formatting utilities
- class-variance-authority + clsx: Dynamic className generation

*Backend:*
- express: HTTP server framework
- socket.io: WebSocket server
- drizzle-orm: Type-safe ORM
- @neondatabase/serverless: PostgreSQL driver for Neon
- openid-client + passport: Authentication
- express-session + connect-pg-simple: Session management
- drizzle-zod: Schema to Zod validator conversion

*Build Tools:*
- vite: Frontend build tool and dev server
- tsx: TypeScript execution for development
- esbuild: Server-side bundling for production
- tailwindcss + autoprefixer: CSS processing
- drizzle-kit: Database migration tool

**Development Tools (Replit-specific):**
- @replit/vite-plugin-runtime-error-modal: Error overlay
- @replit/vite-plugin-cartographer: Development navigation
- @replit/vite-plugin-dev-banner: Development banner