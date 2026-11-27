export const releases = [
  {
    date: "November 27, 2026",
    title: "Site announcements and appearance updates",
    features: [
      "The site owner can publish or clear a global announcement from Server settings; visitors see a dismissible banner and a popup once per announcement.",
      "Announcement publishing and clearing are recorded in the staff audit history.",
      "Type “deltarune” in Appearance to open the linked page inside AHS Chat.",
      "Offline members now appear offline even when Do Not Disturb is enabled.",
    ],
  },
  {
    date: "November 23, 2026",
    title: "Titan Bot, security, and appearance updates",
    features: [
      "Chat with Titan Bot from a built-in direct message available to every signed-in member.",
      "Titan Bot keeps your personal conversation history and supports formatted messages, lists, code, and readable math.",
      "The Titans Academy “T” browser favicon and the Titan Bot avatar update with your selected accent color.",
      "Group chat creators can add accepted friends and remove members from group settings.",
      "Admin tools now record channel changes, message deletions, reactions, polls, member bans and renames, permission changes, and group-chat activity.",
      "Audit logs show the full event history and saved details, including deleted message text, sender names, attachment names, and poll details.",
      "Audit history is saved to logs.json on the server's persistent storage and existing audit entries are carried forward.",
      "Login, sign-up, and Titan Bot requests include rate limits, security headers, safer session cookies, and protection against common web attacks.",
    ],
  },
  {
    date: "November 23, 2026",
    title: "Account and redirect updates",
    features: [
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
    title: "Persistent channel navigation and staff audit log",
    features: [
      "Refreshing on a channel keeps that channel open and preserves the /server/<channel> address.",
      "Staff audit activity appears in a dedicated, admin-only, read-only #audit-log channel.",
      "The #staff channel and #audit-log channel show the full audit history.",
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
