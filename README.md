# Deckhand

**Offline-first dispatch and crew compliance for workboat fleets.**

Deckhand is a mockup dispatch application built to demonstrate handling complex offline-first requirements and conflict resolution typical in maritime environments. It features a drag-and-drop timeline interface for dispatching tugs and barges, coupled with rigorous crew certification validation.

## Architecture & Sync Strategy

The core engineering constraint of this application is the offline requirement. Vessels frequently lose internet connection, but the crew must continue to log activities and view their schedules. 

### Why Vue 3 + TypeScript?
This project leverages **Vue 3 with TypeScript**, moving away from legacy patterns (e.g., Knockout JS) while maintaining strict type safety across the domain model (Assets, Activities, Person, Certifications). 

### Offline-First Approach
The application does not rely on a persistent connection:
1. **Local State First**: The UI binds directly to a Pinia store which is hydrated from an IndexedDB local cache on startup.
2. **Action Queue**: When the "Offline" mode is engaged (simulating a vessel losing connection), mutations are pushed to an IndexedDB-backed Action Queue rather than directly hitting the remote API.
3. **Optimistic UI**: The local store is optimistically updated and marked with a `local` sync status badge, ensuring the user is never blocked from working.
4. **Reconciliation**: Upon reconnecting, the Sync Engine drains the Action Queue. If a conflict occurs (e.g., Shore modified the same Activity while the Vessel was offline), the conflict is surfaced for resolution. 

By building offline synchronization as a primitive rather than an afterthought, we avoid the complexity of trying to diff massive JSON trees, instead replaying discrete user intents.

## Quick Start

1. `npm install`
2. Create a `.env.local` file with Supabase credentials:
   ```
   VITE_SUPABASE_URL=your_url
   VITE_SUPABASE_ANON_KEY=your_key
   ```
3. `npm run dev`

*Disclaimer: This is an independent demonstration project and is not affiliated with Helm Operations.*
