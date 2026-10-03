# Persistent Uploads

Profile pictures and chat attachments are stored in the PostgreSQL `uploads` table. The database is checked first when serving files, so new uploads remain available across Render restarts and sleep cycles. The local `uploads/` directory is only a fallback for older files that may still exist on the current instance.

Before deploying the database-backed upload code, apply the schema to the Render database:

```sh
npm run db:push
```

Run this with `DATABASE_URL` set to the Render PostgreSQL connection string. Do not commit the connection string.

Files uploaded before database-backed storage was enabled are not copied automatically. If their local files were lost when Render restarted, they cannot be recovered by this change and must be uploaded again. New uploads are stored in PostgreSQL and do not depend on Render's local filesystem.
