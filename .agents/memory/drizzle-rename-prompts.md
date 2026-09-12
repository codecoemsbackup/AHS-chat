---
name: Legacy table rename prompts
description: Development schema-push behavior when new Drizzle tables resemble legacy tables.
---

Drizzle can present a new table as a possible rename of an existing legacy table, even when the intended change is additive. The safe choice is the explicit create-new option, not a rename or truncation.

**Why:** This project retains unused legacy friend/message tables, and automatic rename selection could repurpose or remove data that the current server no longer uses.

**How to apply:** For additive schema changes, keep new table names distinct where practical and confirm create-new/no-truncate choices during the development schema push. Production schema changes still go through Publish.