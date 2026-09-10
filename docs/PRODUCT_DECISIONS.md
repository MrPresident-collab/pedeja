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

## Product scope

4. Pedejá covers: comida (prepared food), compras (everyday shopping), lojas (large retail),
   enviar (parcels). These are **logically separate routes** (`/compras`, `/lojas`), never merged.
5. The **consumer PWA** has exactly four tabs: Início · Explorar · Pedidos · Perfil.
   No Operations, no Admin, no driver/merchant tabs in the consumer app.
6. **Explorar is informational** (an organized mobile index, not a marketplace) — Sobre,
   Como funciona, Negócios, Torna-te parte da rede, Suporte, Legal + social.
7. **Comida** = restaurants, takeaways, kitchens, prepared-food sellers.
   **Compras** = pharmacies, convenience stores, small local registered commerce.
   **Lojas** = supermarkets, malls, large retailers, franchises.
   Restaurant is modeled as a Business kind + profile, not a separate ownership tree.

## Customer trust

8. **Location is optional and explicit** — Casa is required; habitual locations optional;
   no forced permanent GPS tracking. Precision = province → municipality → neighborhood →
   landmark → coordinates.
9. **Enviar is open to any customer.** Parcel evidence (sender/pickup/delivery photo, recipient
   signature) is **temporary** with retention + automatic deletion, never default permanent.
10. Orders show honest breakdowns — subtotal, discounts, delivery fee, tip, total. Rider wallets
    show base/distance/waiting/peak/tip/fee/gross without obscuring math. Mock money is always
    clearly demo/local.

## Identity & authority

11. **Identity ≠ role.** Capabilities (customer, merchant, delivery_partner, partner) are
    independently authorized by the server. No `is_admin`-style single flag, no frontend grants.
12. **Operations is internal only**: `operacoes.pedeja.ao`, separate authentication, separate
    authorization. No `/operacoes` consumer route, no admin switch, no consumer mechanism that
    grants Operations access.
13. Merchant staff permissions are business-scoped and never imply Operations access.

## Architecture & portability

14. **No vendor backend.** Repository/database must remain portable: `git clone → npm install →
    npm run dev` runs on typed mocks. Supabase is the intended production backend.
15. **Supabase is not connected yet** and no credentials exist in the repo. Only `.env`
    (git-ignored) can activate the client; `.env.example` documents the variables.
16. Money is exact integer Kz — no floating point in persistence.
17. Client-provided price/role/status/ownership is always treated as untrusted; the future
    server (RLS + Edge Functions) is authoritative.
18. UI never touches persistence directly; views go through repository interfaces
    (`src/repositories/*`). Swapping mock→Supabase must not require component changes.

## PWA

19. Installable PWA (manifest + icons + service worker + offline shell) but never mandatory —
    always usable in a normal browser. Safe-area aware, mobile-first (≈390×844 … 412×915).

## Staged delivery

20. Current stage = consumer app foundations (domain + boundaries, PWA, brand). Merchant,
    Estafeta and Operations are separate builds, staged later, and may share infrastructure
    without sharing authorization.