# Design Guidelines: Real-Time Chatting Platform

## Design Approach
**Reference-Based:** Drawing inspiration from modern messaging platforms (Discord, Telegram, Slack) with emphasis on clarity, efficiency, and real-time communication feedback.

## Core Design Principles
1. **Communication-First:** Minimize chrome, maximize conversation space
2. **Instant Feedback:** Clear visual indicators for all real-time events
3. **Scannable Hierarchy:** Quick identification of active channels, online members, and unread messages

## Typography System
- **Primary Font:** Inter or similar (Google Fonts CDN)
- **Hierarchy:**
  - Display (Auth screens): text-4xl, font-bold
  - H1 (Section headers): text-2xl, font-semibold  
  - H2 (Chat names): text-lg, font-medium
  - Body (Messages): text-base, font-normal
  - Small (Timestamps, status): text-sm, font-normal
  - Tiny (Metadata): text-xs

## Layout System
**Spacing Primitives:** Use Tailwind units of 2, 3, 4, 6, and 8 consistently (e.g., p-4, gap-3, mt-6)

### Authentication Pages (Login/Signup)
- Centered card layout: max-w-md mx-auto
- Vertical padding: py-20
- Card padding: p-8
- Form fields spacing: space-y-4
- Logo/branding at top with mb-8

### Main Application Layout (Post-Login)
Three-column structure on desktop:
1. **Left Sidebar (Server + Channels):** w-72, fixed positioning
    - Server header and current user controls
    - Scrollable channel list with hash icons
    - Admin settings affordance for channel and moderation controls
   
2. **Middle Column (Chat Area):** flex-1, full height
   - Header: h-16 with p-4, shows chat partner info
   - Messages area: flex-1, overflow-auto, p-6
   - Input area: fixed bottom, p-4
   
3. **Right Sidebar (Optional User Info Panel):** w-80, collapsible on tablet

**Mobile:** Stack vertically, show one panel at a time with navigation

## Component Library

### Member List Items
- Avatar circle (w-10 h-10) with online indicator dot (w-3 h-3) at bottom-right
- Username and last message preview stacked
- Timestamp aligned right
- Unread badge if applicable

### Chat Bubbles
- Sent messages: align-right, max-w-md
- Received messages: align-left, max-w-md
- Padding: px-4 py-2
- Rounded corners: rounded-2xl
- Timestamp below bubble: text-xs with mt-1
- Avatar (w-8 h-8) for received messages only

### Message Input
- Full-width textarea with rounded-lg
- Padding: p-3
- Send button attached to right side
- "User is typing..." indicator above input (text-sm, italic)

### Status Indicators
- Online: solid circle
- Away: hollow circle
- Offline: no indicator
- Typing: animated ellipsis

### Server Settings
- Admin-only dialog with channel creation, editing, and deletion
- Member controls for names, admin status, bans, and unbans
- Owner-only delegation toggle for admin management

## Visual Rhythm
- Section spacing: py-6 to py-8
- Component spacing: gap-4 within groups
- List item spacing: space-y-2
- Form field spacing: space-y-4

## Responsive Breakpoints
- Mobile (<768px): Single column, navigation drawer
- Tablet (768px-1024px): Two columns (channels + chat)
- Desktop (>1024px): Three columns with optional sidebar

## Interactive States
- Message hover: subtle elevation
- Channel and member item hover: background shift
- Active chat: clear highlight indicator
- Button focus: visible ring with offset-2

## Animations
**Minimal Usage:**
- Fade-in for new messages only
- Typing indicator pulse
- Online status transitions
- NO scroll animations or complex transitions

## Images
**Profile Avatars:**
- Placeholder: Use user initials in circular containers
- Actual: User-uploaded images, circular crop
- Sizes: w-8 h-8 (chat), w-10 h-10 (list), w-16 h-16 (profile header)

**No hero images required** - this is a utility application focused on functionality.

## Accessibility
- All interactive elements: min h-10 touch targets
- Form inputs: associated labels, aria-labels for icon buttons
- Keyboard navigation: full tab order for all actions
- Screen reader: announce new messages, status changes
- Focus indicators: visible on all interactive elements

## Data Display Patterns
- Empty states: Centered text with icon, encouraging action ("Start the conversation")
- Loading states: Skeleton loaders for channel and member lists, shimmer for messages
- Error states: Inline validation messages below inputs

This creates a clean, efficient messaging experience prioritizing conversation flow and real-time communication.