# Persistent Uploads

Profile pictures and chat attachments are stored in the PostgreSQL `uploads` table. This keeps new uploads available across Render restarts and sleep cycles; the local `uploads/` directory is only a fallback for older files.

Before deploying the database-backed upload code, apply the schema to the Render database:

```sh
npm run db:push
```

Run this with `DATABASE_URL` set to the Render PostgreSQL connection string. Do not commit the connection string.

Files uploaded before database-backed storage was enabled are not copied automatically. If their local files were lost when Render restarted, they must be uploaded again.
