# AHS-chat
This is a website designed for students by a student for a very specific highschool. IF you would like to use this project for your own school, hit me up on gmail or outlook or discord. 
Gmail: codecoems@gmail.com 
Outlook: codecoems@outlook.com
Discord: CodeCoems

Members can start private direct-message conversations from the member list. New conversations are message requests; recipients must accept before either member can read or send messages.

Signed-in chat routes use `/server/<channel>` for channels and `/dms/<username>` for direct messages. The root route redirects to the default channel.

New accounts must provide a real first and last name and a PISD email ending in `.number@mypisd.net` or `@pisd.edu`. Signed-in users without an email are prompted to add one before using the server. Real names and email addresses are visible only to the account holder and owner-role accounts; users missing a name must complete the setup step before using the server. Member rows show usernames and online status; clicking a member opens their profile details where permitted.

Usernames accept 3-20 Unicode letters or numbers from any language, plus underscores.

Messages, including private messages and polls, support emoji reactions. Each person can add up to 10 distinct emoji reactions to a message and remove them by selecting them again.

Users can personalize the app accent and their username display color independently from the Appearance settings.

After pulling schema changes, apply them to the configured database with `npm run db:push`.
