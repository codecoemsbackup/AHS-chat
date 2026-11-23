export const releases = [
  {
    date: "November 23, 2026",
    title: "Group chat management and account updates",
    features: [
      "Group chat creators can add accepted friends and remove members from group settings.",
      "Sign in with either your username or your email address.",
      "The old website now redirects to the new site. Accounts did not carry over, so returning users need to sign up again.",
      "The landing page now shows the full feature list and a direct sign-up link.",
    ],
  },
  {
    date: "November 22, 2026",
    title: "Friend requests, group chats, and private nicknames",
    features: [
      "Send a friend request from a member profile; it stays under Friend requests until accepted, then they appear in your persistent Friends list.",
      "Create named group chats with at least two accepted friends and send real-time group messages.",
      "Set a private nickname for an accepted friend; only you see it, including in group chats.",
    ],
  },
  {
    date: "November 21, 2026",
    title: "Persistent channel navigation and separate staff audit log",
    features: [
      "Refreshing on a channel keeps that channel open and preserves the /server/<channel> address.",
      "Staff audit activity is stored in a dedicated, admin-only, read-only #audit-log channel.",
      "The #staff channel shows a compact preview of the 5 newest audit entries.",
    ],
  },
  {
    date: "November 21, 2026",
    title: "Chat navigation, reactions, and message archiving",
    features: [
      "Press / outside a text field to focus the message composer.",
      "Click a reply preview to jump to its original message, loading older history when needed.",
      "Hover over reactions to see who reacted with each emoji, and browse the full searchable emoji picker with frequently used emoji first.",
      "Keep each channel's newest 500 messages in the database and archive older messages, reaction details, poll votes, and channel attachments to persistent files while keeping history visible.",
      "Archived polls and reactions are read-only. On Render, message archiving requires a Persistent Disk and the MESSAGE_ARCHIVE_DIR setting.",
    ],
  },
  {
    date: "October 7, 2026",
    title: "Mobile-friendly chat layout",
    features: [
      "Use a slide-out navigation drawer and member list overlay on smaller screens.",
      "Navigate between channels and direct messages with mobile header controls.",
      "Use a compact message composer with spacing for device safe areas.",
    ],
  },
  {
    date: "October 6, 2026",
    title: "Direct-message media and public feature notes",
    features: [
      "Send file attachments and GIFs in accepted direct-message conversations.",
      "Browse the feature and update history without signing in.",
      "Open the feature notes from the landing, sign-in, sign-up, and chat screens.",
    ],
  },
  {
    date: "October 5, 2026",
    title: "Shareable chat destinations",
    features: [
      "Open a channel directly with a /server/<channel> link.",
      "Open a direct message with a /dms/<username> link.",
      "The root chat route opens the default channel.",
    ],
  },
  {
    date: "Earlier updates",
    title: "Original feature set (exact release dates not recorded)",
    features: [
      "Community channels for general conversation, rules, announcements, polls, and staff.",
      "Real-time channel messages, typing indicators, online presence, and unread indicators.",
      "Message replies, member mentions, file attachments, GIFs, polls, and emoji reactions.",
      "Scroll back to load message history; admins can manage channels and remove messages.",
      "Private conversations with message requests, unread counts, and emoji reactions.",
      "Username and password accounts, profile pictures, and custom usernames.",
      "Required real-name and school-email setup; private profile details are visible only to their owner and owner-role accounts.",
      "Custom status, online status, Do Not Disturb, light and dark themes, and personalized accent and username colors.",
      "Admin tools for member management, bans, staff access, and everyone mentions.",
    ],
  },
];
