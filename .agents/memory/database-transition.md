---
name: Server schema transition
description: Development database transition from the original direct-message model to the single-server channel model.
---

The development database retains the original friendships and direct-message tables as legacy data; the active application uses separate server, channel, server-message, and ban tables.

**Why:** The overhaul needed to avoid destructive deletion of existing development data while introducing a clean channel-based model.

**How to apply:** Treat the legacy tables as unused compatibility residue. When publishing schema changes, review the generated production diff carefully and explicitly confirm any drops or renames in the publish flow.