# Persistent Uploads

Profile pictures and chat attachments are stored in the PostgreSQL `uploads` table. The database is checked first when serving files, so new uploads remain available across Render restarts and sleep cycles. The local `uploads/` directory is only a fallback for older files that may still exist on the current instance.

To apply all schema changes (including the uploads table) from an interactive shell, run:

```sh
npm run db:push:all
```

The server creates missing friend nickname and group-chat tables at startup. The Render build's `npm run db:push` command is also intentionally limited to those tables so it can safely run without an interactive prompt; uploads still require the full schema push. Set `DATABASE_URL` to the Render PostgreSQL connection string for either command. Do not commit the connection string.

Files uploaded before database-backed storage was enabled are not copied automatically. If their local files were lost when Render restarted, they cannot be recovered by this change and must be uploaded again. New uploads are stored in PostgreSQL and do not depend on Render's local filesystem.
