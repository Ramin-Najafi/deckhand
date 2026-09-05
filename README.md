# Deckhand

Deckhand is a local-first maritime operational dashboard designed to handle intermittent vessel connectivity by using a client-side database as the source of truth and reconciling state with the server when a connection is available. It provides a real-time interface for dispatching jobs, assigning crew and assets, and tracking maintenance tasks and compliance requirements.

[Live Demo](https://deckhand-demo.vercel.app) *(Note: Replace with actual Vercel URL)*

## Stack

- **Frontend**: Vue 3, TypeScript, Vite
- **Backend API**: ASP.NET Core 8 (C#) using Dapper
- **Database**: PostgreSQL (Supabase)
- **Realtime**: Supabase Realtime
- **Deployment**: Vercel (Frontend), Railway (API)
- **Infrastructure**: Docker / Docker Compose

## Architecture

Deckhand uses a local-first architecture where the client's IndexedDB is treated as the immediate source of truth. When the application boots, it hydrates the UI from IndexedDB, meaning the dashboard is interactive instantly, regardless of network state.

All state mutations (creates, updates, deletes) are written locally first and simultaneously pushed to an offline-capable action queue. A background sync worker processes this queue, batching actions and pushing them to the ASP.NET Core API. The C# backend is responsible for processing the queue, validating relationships, and performing version-based conflict detection.

Changes made by other clients are pushed to the client via Supabase Realtime subscriptions, which update the local IndexedDB and reactivity layer. If the primary .NET API becomes unreachable (e.g., container crash or routing issue), the client relies on a graceful fallback mechanism that routes traffic directly to the Supabase REST API to ensure high availability.

### Why Local-First?

Vessels operating offshore regularly lose internet connectivity, often for hours or days at a time. A traditional cloud-first CRUD architecture would lock the crew out of the application entirely when the VSAT connection drops. By moving the primary data store into the browser, the crew can continue logging jobs, maintenance, and compliance events offline. The sync engine handles the complexity of reconciling that state when connectivity is restored.

### Conflict Resolution Strategy

When multiple users mutate the same record while offline, the backend evaluates conflicts based on a strict `version` integer on each record. The resolution rules are:

1. **Non-conflicts apply silently**: If the client's version matches the server's version, the update is applied and the version is incremented.
2. **Different fields merge**: If the versions diverge, but the clients mutated mutually exclusive fields (e.g., Client A updated `status`, Client B updated `assigned_asset_id`), the server merges the changes and accepts the update.
3. **Same-field divergence blocks**: If clients mutated the exact same field concurrently, the server rejects the update and returns a conflict payload. The client surfaces this directly to the user to make a manual decision. Operational logs are legal records in maritime environments; auto-resolving these via Last-Write-Wins is unacceptable.

## Notable Bugs Encountered

During development, the architecture exposed a few interesting edge cases:

- **The Foreign Key 409 Issue**: When attempting to assign a newly created asset to a newly created job while offline, the action queue would sometimes process out of order upon reconnect. The API would attempt to insert the job before the asset existed, resulting in a Postgres foreign key violation that manifested as a generic `409 Conflict`. Fixed by ensuring the queue processes sequentially based on chronological insertion.
- **Realtime Subscription Ordering Error**: Initializing the Supabase Realtime subscription *before* the initial data fetch resulted in a race condition. Realtime events would arrive and update IndexedDB, only to be immediately overwritten by stale data from the subsequent HTTP fetch. Fixed by strictly chaining the realtime subscription to start only after the seed fetch completes.
- **Silent Convergence**: An early iteration of the real-time sync caused conflicts to become mathematically impossible to test. The Supabase Realtime push was so fast that Client B would receive Client A's update and increment its local `version` before Client B's user could finish typing their conflicting change. By the time Client B hit save, it was legally operating on the new version. We had to introduce artificial network latency to successfully test the conflict resolution UI.

## Known Limitations & Technical Debt

- **No Authentication**: The application lacks authentication and user sessions. Row Level Security (RLS) on the Supabase database is completely open to allow the demo to function smoothly.
- **IndexedDB Migrations**: There is currently no strategy for schema migrations in IndexedDB. If the data models change, the client's local database must be manually cleared.
- **UI Bugs**: 
  - **Phantom Sidebar Records**: Creating a new assignment occasionally duplicates the visual record in the sidebar until the page is refreshed, though the underlying database state is correct.
  - **Timezone Drag Offset**: Dragging jobs across the Timeline Board can sometimes shift the resulting start/end times by a few hours due to a missing UTC offset calculation in the drag event handler.

## Local Development

The entire stack is containerized for easy testing. You do not need the .NET 8 SDK or Node installed locally.

```bash
docker compose up --build
```

- The Vue frontend is served on `http://localhost:5173`
- The .NET API is served on `http://localhost:5001`
