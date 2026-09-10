# PEDEJÁ — Implementation Plan

Sequenced roadmap from the current foundation to the production Pedejá ecosystem.
Supabase is **not connected** yet; nothing here assumes an existing project.

Date: 2026-09-10

---

## Stage 0 — Takeover (done)

- Repository audit: `TAKEOVER_AUDIT.md`.
- PWA shell repaired (icons, manifest resolution, service worker, offline shell).
- Vendor branding removed; package renamed `pedeja`; `.env.example` added.
- Brand: Enviar accent moved off deprecated orange; Profile aligned to spec groups.

## Stage 1 — Domain & data boundaries (done)

- Domain model defined and encoded: `src/types/common.ts`, `src/types/domain.ts`,
  `src/types/index.ts` (view projections).
- Repository interface contract: `src/repositories/types.ts` + mock implementation
  (`src/repositories/mock.ts`) + singleton (`src/repositories/index.ts`).
- All consumer views now read through repositories; nothing imports mocks directly.
- Design docs: `DOMAIN_MODEL.md`, `PRODUCT_DECISIONS.md`, `SECURITY_ARCHITECTURE.md`.
- Verified: `tsc` ✓, `eslint` ✓, production build ✓, no `/operacoes` route, no secrets.

## Stage 2 — Consumer product depth (UI on current boundary)

1. **Orders → spec**: active card (map, rider, ETA, distance, duration, merchant, discounts,
   total, delivery fee, tip; call/message/share/WhatsApp); history with receipt, rider,
   **Repetir pedido**, **Avaliar entrega** (ties to `Rating` domain).
2. **Business/menu + cart/checkout**: product list from `ProductRepository`, cart, totals
   with discounts/delivery fee/tip, payment selection from `PaymentRepository`, order creation
   → `OrderRepository`.
3. **Enviar → spec**: real estimate via `ParcelRepository.estimate`, origin/destination
   addresses with location fields, vehicle recommendation inputs (size, urgency, distance,
   quantity, traffic, rain, road/infra limits), evidence capture placeholder, tracking.
4. **Auth wiring**: OTP vs email flow behind `AuthRepository`; guest mode remains for demo.
   Landing on welcome → sign-in sheet.
5. Replace toast stubs with real flows (Explore links → informational content, Profile
   actions → sheets/forms, support → WhatsApp/context-aware ticket).

Threshold: all four consumer intents demonstrable end-to-end on mock repositories.

## Stage 3 — Supabase groundwork (boundaries proven)

1. Add **async adapter over the repository contract** (`useRepository`-style hook or
   promise-returning repos + loading states) so mock→live swap happens without component
   logic changes.
2. Stand up schema from `DOMAIN_MODEL.md` (identities, profiles, addresses, businesses,
   products, orders, order_items, order_events, deliveries, delivery_assignments,
   deliveries_partners, payments, payouts, parcels, parcel_evidence, support_*, notifications).
3. Implement RLS per `SECURITY_ARCHITECTURE.md §5`; write state-transition RPCs/Edge
   Functions as the single write authority; enforce OTP rate limiting.
4. Storage: private `parcel-evidence` bucket, signed short-lived URLs, retention + automatic
   deletion task.
5. Editor-level demo credentials still prohibited; integration uses a temporary dev project
   with the **anon key only** in `.env` (git-ignored).

## Stage 4 — Merchant application

- Desktop/tablet: left sidebar; mobile: bottom navigation — Pedidos (default, never hidden),
  Cardápio, Relatórios, Configurações.
- Orders: customer/items/instructions, countdown + prep time, total/discounts/assigned rider;
  statuses NOVO/URGENTE/PRONTO; new-order notification, vibration, `ring.mp3` (autoplay-safe).
- Cardápio: product/photo/availability/price Kz/prep time/category/open-closed.
- Relatórios: sales, top dishes, avg prep time (15-min target), late orders, pending payout, CSV.
- Configurações: name, location, lat/lng, hours, base prep, notifications, rider instructions.
- Auth: merchant capability (server-approved) + business-scoped permissions; never Operations.

## Stage 5 — Estafeta application

- Mobile-first: Início · Carteira · Histórico · Perfil. Dark map, purple route.
- Online toggle (green). Offer card (restaurant → client, distance, ~min, 500 Kz) with **ACEITAR**
  and 15s accept timeout → next eligible rider. Empty state "Sem corridas perto" + radar animation.
- Active delivery steps: Cheguei · Recolhido · Entregue, with evidence/state where appropriate.
- Wallet: transparent Payout lines (base/distance/waiting/peak/tip/fee/gross). Mock figures
  clearly demo/local.
- Histórico: deliveries, status, distance, payout, ratings, monthly summary, performance,
  on-time %. Perfil: photo, satisfaction, vehicle, verification docs, online hours, support,
  calculator, logout, delete account; photo changes via support/verification path.

## Stage 6 — Operations application (separate boundary)

- Hosted at `operacoes.pedeja.ao`, separate auth + InternalStaff authorization.
- Dark sidebar `#121212`, active `#8A2BE2`: Visão Geral · Pedidos · Entregadores · Receita ·
  Clientes · Relatórios · Configurações.
- Dashboard metrics, live rider map, order table + filters/search + bulk cancel/reassign,
  order detail from `order_events`, rider controls (online/offline, wallet, active job, avg
  time, location, block/unblock, cash status), revenue (daily/weekly/monthly/commissions/rider
  payouts/Multicaixa reconciliation), customer analytics + spam controls, reports + export,
  settings incl. design tokens + RLS verification.
- No consumer/merchant/rider application ever reaches these tables.

## Stage 7 — Hardening & release

- Threat tests from `SECURITY_ARCHITECTURE.md §7` (IDOR/privilege escalation/role tampering/
  OTP abuse/account enumeration/ops access/storage bypass/payment manipulation).
- Visual QA across 360×800 → 412×915; accessibility; loading/empty/error states;
  safe-area behavior; offline network flows.
- Portability re-check: `git clone → npm install → npm run dev` on mocks.
- npm audit remediation; CI (typecheck + lint + build + tests).

---

## Phase 3 — Domain documentation & repository contracts

The current phase. Establishes the formal domain model, entity relationships, state models,
security boundaries, and repository contract documentation. Purely documentation + minimal
type-level code changes. No UI changes, no Supabase, no database, no auth implementation.

### Phase 3A — Domain model documentation (current)

- Full `DOMAIN_MODEL.md` rewrite with Mermaid diagrams:
  - Entity–relationship diagram (all 20+ entities)
  - Order state machine (4 dimensions: payment/fulfillment/delivery/risk)
  - Delivery lifecycle sequence diagram
  - Capability authorization model
  - Support ticket state machine
  - Parcel evidence lifecycle
  - Repository architecture diagram
- Full `PRODUCT_DECISIONS.md` with 35 locked decisions
- Full `SECURITY_ARCHITECTURE.md` with Mermaid boundary diagrams
- Full `IMPLEMENTATION_PLAN.md` with Phase 3 roadmap
- All repository interfaces documented with method signatures
- All four surfaces (consumer, merchant, estafeta, operations) covered

### Phase 3B — Repository interface alignment

- Verify all repository interfaces match domain model entities
- Add missing repository methods if any domain entity lacks CRUD coverage
- Ensure `CreateOrderInput` aligns with `Order` domain entity
- Verify `ParcelEstimateInput` aligns with `ParcelEstimate` domain entity
- Document any gaps between domain model and current mock implementation

### Phase 3C — Type alignment

- Verify `src/types/index.ts` (view projections) properly maps to `src/types/domain.ts`
- Document the view ↔ domain projection rules
- Ensure no domain entity is used directly in views (view models should be separate)

### Phase 3D — Mock data audit

- Verify mock data exercises all domain entities
- Ensure mock data includes edge cases (empty states, error states, partial data)
- Add mock data for entities not yet represented (support tickets, notifications, ratings)

### Phase 3E — View model documentation

- Document each surface's view models (consumer, merchant, estafeta, operations)
- Map view models → repository interfaces → domain entities
- Identify any view model gaps

### Phase 3F — Event system documentation

- Document `OrderEvent` vocabulary and extensibility
- Document `EventAuthor` kinds and when each is used
- Map events → state transitions

### Phase 3G — Permission model documentation

- Document `InternalPermission` values and when each is required
- Document `Scope` resolution (global > region > merchant)
- Document `BusinessPermission` values for merchant staff

### Phase 3H — Supabase mapping documentation

- Expand repository → Supabase mapping (§20 of DOMAIN_MODEL.md)
- Document RPC/Edge Function signatures for state transitions
- Document RLS policies per table (high-level, not SQL)

### Phase 3I — Validation & sign-off

- Full codebase walkthrough against DOMAIN_MODEL.md
- Verify all domain entities have corresponding TypeScript types
- Verify all repository interfaces are complete
- Verify all mock implementations satisfy their interfaces
- Final commit: `docs: establish Pedejá domain model and technical boundaries`

---

## Guiding rules

- Backend server is the authority; UI is a client of it.
- No Operations inside the consumer application.
- Parcel evidence is temporary by default.
- The repository stays portable and never depends on a vendor backend.
- Mock mode always works without any `.env`.
- UI is frozen at commit `d0f2d6b` until domain/backend phases are complete.
