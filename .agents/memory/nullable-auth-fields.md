---
name: Nullable auth profile fields
description: Compatibility guidance for existing Replit-auth users whose profile fields are incomplete.
---

When syncing Replit-auth users into application ownership and permission flags, nullable profile fields such as username must be normalized before they are used in boolean SQL expressions. A missing username can otherwise evaluate a comparison to NULL and violate a non-null database column.

**Why:** Existing production users can predate the local username/profile flow and may have no username even though current schema columns are non-null.

**How to apply:** Use explicit false defaults for new upserts and `coalesce` (or equivalent boolean-safe expressions) whenever nullable profile fields drive ownership or permission state.