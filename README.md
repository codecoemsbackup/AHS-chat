# AHS-chat
This is a website designed for students by a student for a very specific highschool. IF you would like to use this project for your own school, hit me up on gmail or outlook or discord. 
Gmail: codecoems@gmail.com 
Outlook: codecoems@outlook.com
Discord: CodeCoems

Members can send friend requests from the member list. Pending requests remain visible after refresh; accepting a request adds that person to the persistent Friends list and opens a direct-message conversation. The sender can cancel a pending request. Accepted direct messages support replies with quoted message previews.

Accepted friends can be given a private nickname that only the person who set it can see. You can also create named group chats with at least two accepted friends; group messages are available to every group member, and the group creator can change its name or picture and delete the group.

Signed-in chat routes use `/server/<channel>` for channels, `/dms/<username>` for direct messages, and `/groups/<id>` for group chats. The root route redirects to the default channel.

Anyone can view `/features` for the feature list and dated patch notes. Add new releases at the top of the releases list in `client/src/pages/features.tsx`.

Titan Bot is available in every signed-in user's DMs. It uses Groq's chat completions API; configure `GROQ_API_KEY` in the server environment. `GROQ_MODEL` is optional and defaults to `openai/gpt-oss-20b`; retired Llama model overrides are ignored. Messages sent to Titan Bot are sent to Groq to generate replies, so users should not share passwords or private information.

New accounts must provide a real first and last name and a PISD email ending in `.number@mypisd.net` or `@pisd.edu`. Signed-in users without an email are prompted to add one before using the server. Real names and email addresses are visible only to the account holder and owner-role accounts; users missing a name must complete the setup step before using the server. Member rows show usernames and online status; clicking a member opens their profile details where permitted.

Usernames accept 3-20 Unicode letters or numbers from any language, plus underscores.

Messages, including private messages and polls, support emoji reactions. Each person can add up to 10 distinct emoji reactions to a message and remove them by selecting them again.

Hover over a message's reactions to see who reacted with each emoji. The searchable emoji picker includes the full emoji menu and puts frequently used emoji first. Press `/` outside a text field to focus the message composer. Click a reply preview to jump to the original message; older history is loaded when needed.

Channel message archives keep Neon database usage bounded. Each channel retains its newest 500 message records in Neon; older messages, reaction details, poll votes, and channel attachment files are archived to disk and remain visible in channel history. Archived polls and reactions are read-only. Direct messages and profile avatars are not archived.

On Render, attach a Persistent Disk mounted at `/var/data` and set `MESSAGE_ARCHIVE_DIR=/var/data/message-archives` in the web service environment. The application archives existing overflow at startup and moves the oldest channel messages to disk as new messages arrive. Without this setting, the app keeps the existing database data and rejects new channel messages once a channel reaches 500 database records rather than writing archives to ephemeral storage.

Message deletion and reaction add/remove audit entries are stored as JSON Lines in `staff-audit-logs.jsonl` under `MESSAGE_ARCHIVE_DIR` (or `./data` when it is unset), not in the database. The private `#staff` channel shows the 5 newest entries, while the dedicated admin-only, read-only `#audit-log` channel shows the full log. Use the persistent disk setting above to keep these logs across deployments.

Users can personalize the app accent and their username display color independently from the Appearance settings.

Owners can appoint or remove admins. Only CodeCoems can appoint or remove owners; admins cannot delegate admin access.

The server creates the friend nickname and group-chat tables and indexes at startup if they are missing. The Render build may also run `npm run db:push`, which is limited to these tables to avoid Drizzle's interactive rename prompt for unrelated legacy tables in a non-interactive build. For a reviewed, full-schema sync from an interactive shell, use `npm run db:push:all`.