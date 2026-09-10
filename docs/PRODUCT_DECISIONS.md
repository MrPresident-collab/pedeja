# PEDEJÁ — Product Decisions

Record of decisions that keep Pedejá aligned to its identity: mobile-first, purple, Angola-first,
trustworthy, portable.

Date: 2026-09-10

---

## Brand & identity

1. **Purple is the primary identity**: `#8A2BE2`, dark `#121212/#1A1A1A`, light `#F8F7FA`, white.
   The previous orange identity is deprecated and not reintroduced as primary.
2. **Tagline:** "A promessa que se move". Typography: Manrope.
3. Ugly/neon cyberpunk treatments are rejected in favor of premium, clean, human, fast design.
4. **Logo:** white "P" + purple "." — simple, mark-only, no wordmark lockup required.

## Product scope

5. Pedejá covers: comida (prepared food), compras (everyday shopping), lojas (large retail),
   enviar (parcels). These are **logically separate routes** (`/compras`, `/lojas`), never merged.
6. The **consumer PWA** has exactly four tabs: Início · Explorar · Pedidos · Perfil.
   No Operations, no Admin, no driver/merchant tabs in the consumer app.
7. **Explorar is informational** (an organized mobile index, not a marketplace) — Sobre,
   Como funciona, Negócios, Torna-te parte da rede, Suporte, Legal + social.
8. **Comida** = restaurants, takeaways, kitchens, prepared-food sellers.
   **Compras** = pharmacies, convenience stores, small local registered commerce.
   **Lojas** = supermarkets, malls, large retailers, franchises.
   Restaurant is modeled as a Business kind + profile, not a separate ownership tree.

## Customer trust

9. **Location is optional and explicit** — Casa is required; habitual locations optional;
   no forced permanent GPS tracking. Precision = province → municipality → neighborhood →
   landmark → coordinates.
10. **Enviar is open to any customer.** Parcel evidence (sender/pickup/delivery photo, recipient
    signature) is **temporary** with retention + automatic deletion, never default permanent.
11. Orders show honest breakdowns — subtotal, discounts, delivery fee, tip, total. Rider wallets
    show base/distance/waiting/peak/tip/fee/gross without obscuring math. Mock money is always
    clearly demo/local.
12. **Angola-first location model.** Province → municipality → neighborhood → street/landmark →
    coordinates. Landmarks are first-class (no universal street addressing). Delivery accuracy
    targets: neighborhood → landmark → gate, not GPS precision tracking.
13. **All monetary values are exact integer Kz.** `Money { amount: number; currency: 'AOA' }`.
    No floating point in persistence. Server recomputes totals. Client-provided prices are untrusted.

## Identity & authority

14. **Identity ≠ role.** Capabilities (customer, merchant, delivery_partner, partner) are
    independently authorized by the server. No `is_admin`-style single flag, no frontend grants.
15. **Operations is internal only**: `operacoes.pedeja.ao`, separate authentication, separate
    authorization. No `/operacoes` consumer route, no admin switch, no consumer mechanism that
    grants Operations access.
16. Merchant staff permissions are business-scoped and never imply Operations access.
17. **Capability approval requires server.** No localStorage, URL, React state or hidden UI
    mechanism can change a capability's approval state. Server is the single authority.

## Order model

18. **Order state is multidimensional.** Payment, fulfillment, delivery, and risk are independent
    dimensions that can legitimately disagree (e.g. payment confirmed + preparing + no rider).
19. **OrderKind distinguishes marketplace from parcel.** Same aggregate root, different behavior
    for delivery assignment and evidence capture.
20. **OrderEvents are append-only.** The event log is the source of truth for history, audit,
    and Operations. `by` records author kind + id for every transition.
21. **View-level OrderStatus is derived.** Portuguese display labels (novo/aceite/preparando/
    pronto/recolhido/entregue/cancelado) are projections, never the source of truth.

## Delivery & estafeta

22. **DeliveryAssignment offers expire in 15 seconds.** If declined/timed-out, the offer passes
    to the next eligible online partner. Only one partner accepts per delivery.
23. **Rider earnings are transparent.** Payouts show itemized lines: base_pay, distance_pay,
    waiting_time, peak_bonus, customer_tip, platform_fee → gross. No hidden math.
24. **Rider location is only visible while online** and only to assigned participants (merchant,
    customer with active order) and authorized Operations.

## Merchant

25. **Merchant pause/resume controls order intake.** `isOrdersPaused` stops new orders without
    affecting active ones.
26. **Sensitive merchant actions (profile/price changes) require password challenge.**
    Mock password is `1234`; production must use server-side verification.
27. **Merchant sign-out is explicit.** No silent session expiry for merchant operations.

## Architecture & portability

28. **No vendor backend.** Repository/database must remain portable: `git clone → npm install →
    npm run dev` runs on typed mocks. Supabase is the intended production backend.
29. **Supabase is not connected yet** and no credentials exist in the repo. Only `.env`
    (git-ignored) can activate the client; `.env.example` documents the variables.
30. Client-provided price/role/status/ownership is always treated as untrusted; the future
    server (RLS + Edge Functions) is authoritative.
31. UI never touches persistence directly; views go through repository interfaces
    (`src/repositories/*`). Swapping mock→Supabase must not require component changes.
32. **Repository interfaces are the contract.** Each surface (consumer, merchant, estafeta,
    operations) has its own repository interface with its own view models. No cross-surface
    type leakage.

## PWA

33. Installable PWA (manifest + icons + service worker + offline shell) but never mandatory —
    always usable in a normal browser. Safe-area aware, mobile-first (≈390×844 … 412×915).

## Staged delivery

34. Current stage = consumer app foundations (domain + boundaries, PWA, brand). Merchant,
    Estafeta and Operations are separate builds, staged later, and may share infrastructure
    without sharing authorization.
35. UI is frozen at commit `d0f2d6b`. No layout, color, typography, navigation, copy, visual
    effects, or product feature changes until domain/backend phases are complete.
