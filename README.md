# Pedejá — Delivery & Marketplace Platform

Pedejá is an Angola-focused on-demand marketplace foundation built with React, Vite, TailwindCSS, Capacitor and Supabase.

## Product scope

The current product foundation supports:

- Food ordering and delivery
- Parcel delivery
- Customer accounts and addresses
- Merchant operations
- Rider/estafeta operations
- Operations/admin workflows
- Realtime notifications and chat
- Wallet and settlement infrastructure
- Ratings and order lifecycle management
- Portuguese-first interface for Angola

Ride-hailing, generic services, inherited Thailand payment methods and other non-V1 capabilities remain outside the initial Pedejá product surface until explicitly enabled.

## Architecture

- **Frontend:** React 19 + Vite + TailwindCSS
- **Mobile:** Capacitor 8
- **Backend:** Supabase PostgreSQL, Auth, Realtime and Edge Functions
- **Security:** Supabase RLS and server-side business logic
- **Maps:** Leaflet / OpenStreetMap / OSRM where enabled
- **Internationalization:** i18next
- **Icons:** Lucide React
- **Primary locale:** pt-AO

## Development

```bash
npm install
npm run dev
```

The local development server is normally available at `http://localhost:5173`.

## Production build

```bash
npm run build
```

## Android

```bash
npm run build
npx cap sync android
npx cap open android
```

The Android application identity is `ao.pedeja.app`.

## Supabase

Supabase is the source of truth for production data and authorization. Frontend state must not become an alternative authority for orders, payments, wallets, settlement, pricing or permissions.

Apply database changes through the versioned migration history under `supabase/migrations/`. Do not overwrite an existing production database with a generated baseline schema.

## Repository branches

- `main` — untouched BoomRider baseline preserved for reference
- `pedeja-development` — active Pedejá development branch

## License

MIT
