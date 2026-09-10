# PEDEJÁ — Domain Model & Data Boundaries

Canonical domain documentation. This document defines *what Pedejá is* at the data
level, before any persistence is introduced.

Date: 2026-09-10
Status: **draft — no Supabase connected, no database created.**

Companion docs: `PRODUCT_DECISIONS.md`, `SECURITY_ARCHITECTURE.md`, `IMPLEMENTATION_PLAN.md`.

---

## 1. Design principles

1. **Identity ≠ role.** `Identity` is the person/account. Marketplace capabilities are
   independently granted and revocable (see §2).
2. **Internal authority is a separate security layer** (Operations) and never a consumer-side flag.
3. **Money is exact.** All monetary values are `Money { amount: number; currency: 'AOA' }` with
   `amount` as an integer in Kz — never floats in persistence.
4. **Order state is multidimensional.** Payment, fulfillment, delivery and risk are separate
   dimensions; they must be able to disagree legitimately (e.g. payment confirmed + preparing +
   delivery not yet assigned).
5. **Order, Delivery and Assignment are different aggregates.**
   - `Order` = what was purchased / requested.
   - `Delivery` = what must physically move.
   - `DeliveryAssignment` = which approved partner is currently responsible.
6. **UI never reads the persistence layer.** Views consume repositories. Repositories are
   swappable (mock today, Supabase later) without touching components.
7. **Operations has no route, no switch, no frontend mechanism** inside the consumer app.

---

## 2. Identity and marketplace capability

```
Identity (1)
 ├── capability: customer          (baseline, approval: approved)
 ├── capability: merchant          (independent, approval-driven)
 ├── capability: delivery_partner  (independent, approval-driven)
 ├── capability: partner           (independent, approval-driven)
 └── internal: InternalAuthority   (NULL unless Pedejá employee)  → Operations SSR
```

- `Identity` is the person/account record (`identities`).
- `MarketplaceCapabilityState` couples a capability with `CapabilityApprovalState`
  (`not_requested | pending | approved | rejected | revoked`).
- **Approval requires the server.** There is no `user.role`, no `is_admin / is_driver / is_merchant`,
  no frontend toggle that grants a capability.
- A capability activation changes approval state only through the future server path
  (Edge Function + RLS), never from localStorage, URL, React state or hidden UI.

### Internal authority (§ Operations boundary)

- `InternalStaff` + `Permission { permission, scope }` model who may act inside
  `operacoes.pedeja.ao`.
- `Scope` is deliberately typed: `global | region | merchant`.
- `InternalAuthority` (`NULL` for normal identities) is what authorizes Operations access.
  Marketplace capabilities never imply it.
- Operations is served by a **separate application and security boundary**. The consumer
  repository contains no `/operacoes` route, no admin switch, no Operations capability grant.

---

## 3. Entities, value objects and derived state

| Concept | Classification | Notes |
| --- | --- | --- |
| Identity | entity | person/account |
| Profile | entity (view: projection) | view `Profile` = trimmed display model |
| CustomerProfile / MerchantProfile / DeliveryPartnerProfile / PartnerProfile | entities | capability-specific data |
| MarketplaceCapabilityState | relationship | identity ↔ capability + approval |
| Address | value object (reusable), stored as row per identity | required label = Casa |
| GeoPoint | value object | lat/lng; location is optional, never forced persistent tracking |
| Merchant | relationship | identity owns business(es) |
| Business | entity | owned by merchant; `kind` distinguishes restaurant/takeaway/kitchen/store/… |
| RestaurantProfile | entity (sub-profile) | **recommendation:** restaurant = `Business.kind + RestaurantProfile`, NOT separate ownership tree |
| Product / ProductCategory | entities | belong to Business |
| Order | entity (aggregate root) | marketplace or parcel |
| OrderItem | relationship | line items of an Order |
| OrderEvent | event | append-only timeline; the source of history/audit |
| OrderState | derived state | projection over payment/fulfillment/delivery/risk |
| Delivery | entity (aggregate root) | a move; references an order |
| DeliveryAssignment | relationship/event | partner assignment lifecycle (offered→accepted/expired) |
| DeliveryPartner | entity | approval + vehicle + availability + earnings + performance |
| Payment | entity | per order; method + amount + state |
| Payout | entity | per identity (rider/merchant) over a period; itemized lines |
| PayoutLine | value object | transparent component breakdown |
| Rating | entity | customer/merchant/rider feedback, context-bound |
| SupportTicket / SupportMessage | entities | context-aware (order/delivery/payment/merchant/rider refs) |
| Notification | entity | source-typed (order/delivery/payment/security/support) |
| Parcel | entity | direct user shipping request |
| ParcelEvidence | temporary artifact | has lifecycle; auto-deletion target |
| Document | entity | verification artifact (id, licence, registration) |
| InternalStaff / Permission / Scope | entity + permission model | Operations only |
| Money | value object | exact integer Kz |
| Tooltip: `OrderStatus` (view) | derived/enum | display aggregate over the state model |

**Not every concept becomes a table.** Value objects (`Money`, `GeoPoint`, `AddressRef`,
`PayoutLine`, `Timestamps`) are embedded/normalized inside their aggregates. `OrderState` is
derived from events, never stored as a contradictory single column (a lightweight materialized
column for indexing is acceptable if maintained by events).

---

## 4. Address & Location (Angola-first)

Address ≠ coordinate. Both are modeled but kept distinct:

```ts
Address {
  label, formatted, province, municipality, neighborhood,
  street?, number?, landmark?, deliveryInstructions?,
  coordinates?: GeoPoint,   // optional — never a forced persistent GPS stream
  isDefault?: boolean,
}
```

- **Casa is required.** Labels are free-form: Casa, Trabalho, Escola, Universidade, custom.
- Location precision map: province → municipality → neighborhood → street/landmark → coordinates.
  The goal is practical delivery accuracy (rider → neighborhood → landmark → gate), not tracking.
- `AddressRef` snapshots the address at use time (order/parcel), so later address edits never
  rewrite historical deliveries.

---

## 5. Order model

`Order` is one aggregate with **four independent state dimensions**:

```
OrderState {
  payment:     unpaid | pending | confirmed | failed | refunded
  fulfillment: created | accepted | preparing | ready | out_for_delivery | completed | cancelled
  delivery:    none | matching | assigned | pickup_arrived | picked_up | in_transit | delivered | failed
  risk:        normal | review | blocked
}
```

Representative transitions (server-enforced, examples):

- Created: `{ fulfilled: created, payment: unpaid, delivery: none }`
- Payment captured: `payment: pending → confirmed` (cash: confirmed at handover; Multicaixa: at capture)
- Merchant accepts: `fulfillment: created → accepted → preparing → ready`
- Matching: `delivery: none → matching → assigned` (assignment offer)
- Rider: `pickup_arrived → picked_up → in_transit → delivered`
- Completion: `fulfillment: completed` + `delivery: delivered`
- Cancellation is only legal before fulfillment accepts / before pickup, per refund policy;
  `REFUND_ISSUED` must follow cancelled+paid orders.

Each transition is an `OrderEvent` (§6). The view-level `OrderStatus` (novo/aceite/preparando/
pronto/recolhido/entregue/cancelado) is derived for display only.

## 6. Order events

```ts
OrderEvent { id, orderId, type, occurredAt, by?, meta }
```

Event vocabulary (extensible):

- ORDER_CREATED, PAYMENT_CONFIRMED, MERCHANT_ACCEPTED, ORDER_PREPARING, ORDER_READY
- DELIVERY_ASSIGNED, ORDER_PICKED_UP, ORDER_DELIVERED
- ORDER_CANCELLED, REFUND_ISSUED

- Append-only. `by` records the author kind + id (customer/merchant/delivery_partner/system/
  internal_staff/payment_provider) — required for Operations, support and fraud review.
- Powers customer history, merchant counters, rider flow, Operations dashboard and support.
- **No event bus now.** Events are written by the same server path that performs the state
  transition (later: Supabase RPC + optional Realtime broadcast). Design must stay compatible
  with a future outbox/bus for cross-service consistency, without building it today.

---

## 7. Delivery

```
Order ─1:1(optional)─ Delivery ─1:N─ DeliveryAssignment

Order:       what was purchased / requested (order_items, totals)
Delivery:    pickup + dropoff + vehicle + state + earnings (what must move)
Assignment:  offered to partner(s) with 15s accept timeout; accepted by exactly one
```

- Matching: delivery `none→matching→assigned`. Offers time out (15s estafeta spec) and pass to
  the next eligible/online partner.
- Earnings on a `Delivery` are itemized (`basePay, distancePay, waitingPay, peakBonus,
  customerTip, platformFee, gross`) — the rider wallet shows this breakdown verbatim.

---

## 8. Delivery Partner

- `DeliveryPartner` is tied to an Identity via `DeliveryPartnerProfile`
  (`status`, `vehicle`) and separated from Operations entirely.
- Fields: approval state, vehicle, `available`/`online`, `activeAssignmentId`, optional
  `location` (only while online), performance (rating, on-time %, completed deliveries).
- Activation requires approval (documents → review). Suspension/block is server-side.
- Wallets are the transparent Payout itemization (§10).

---

## 9. Merchant & Business

```
Merchant { identityId, businessIds[], approval }
  └── Business { id, merchantId, name, kind, category, locations[], staff[], hours[], restaurant? }
        ├── BusinessLocation[]   (each an Address + name)
        ├── Product[] + ProductCategory[]
        └── BusinessStaff[]      (owner/manager/kitchen/cashier) with BusinessPermission[]
```

- A merchant owns/operates one or more businesses. Ownership is server-asserted (RLS).
- **Recommendation: Restaurant is a Business `kind` (+ `RestaurantProfile`), not a separate
  entity tree.** Restaurants, takeaways, kitchens and prepared-food sellers share the Business
  infrastructure; only the profile/process differs.
- Marketplace blocks stay distinct at the product/category level:
  `comida` (prepared food) · `compras` (pharmacies, convenience, small local commerce) ·
  `lojas` (supermarkets, malls, large retailers, franchises).
- Merchant staff permissions are **business-scoped**; they never grant Operations access.

---

## 10. Payments

- **No `order.isPaid` bool.** `Payment { orderId, method, amount: Money, state }` is a separate
  aggregate; `OrderState.payment` mirrors it.
- Methods: `cash` (confirm at handover), `multicaixa`, future methods.
- **Payouts are separate and itemized:** `PayoutLine { component: base_pay|distance_pay|
  waiting_time|peak_bonus|customer_tip|platform_fee, amount }` → `gross`. The rider wallet
  renders these lines and must not obscure them.
- Money: integer Kz (`Money`); no floating point in persistence; server recomputes totals.
- **All client-provided prices/status are treated as untrusted.** (Security doc §Threats.)

---

## 11. Parcel / Enviar & evidence

- `Parcel` (a direct user request): origin, destination, content, size, vehicle, estimate,
  delivery, evidence, recipient confirmation. Any customer may initiate.
- `ParcelEstimate`: distance, duration, price + `factors[]` (traffic, rain, road condition,
  infrastructure limits) that justify the recommendation.
- **ParcelEvidence** is a **temporary artifact**:

```
kind:    sender_photo | pickup_photo | delivery_photo | recipient_signature
lifecycle: created → active → completed → in_retention → deleted
```

- Retention window then **automatic deletion** — no permanent retention by default.
- Production storage (documented, **not implemented here**): private Supabase Storage +
  strict authorization + signed short-lived URLs + retention cron + deletion.
- Evidence is per-parcel, author-captured, and only readable by order participants (or
  explicitly authorized Operations under a logged policy).

---

## 12. Support

- `SupportTicket` is **context-aware**: references optional `orderId, deliveryId, paymentId,
  merchantId, deliveryPartnerId`.
- Ticket lifecycle: `open → waiting → resolved → closed` (+ priority).
- Messages are typed (`customer | merchant | delivery_partner | support_agent`).
- Not a generic disconnected chat.

---

## 13. Notifications

- `Notification { identityId, source: order|delivery|payment|security|support, channel,
  type, payload, read }`.
- Sources are emitted by the domain/repository layer, **not generated inside UI components**.
- Presentation (in-app list, push, sms) is decoupled from notification events.

---

## 14. Data boundary (code as built)

```
views / components
   │  (import { repositories })
   ▼
src/repositories/*         ← interface contract + singleton (today: mock impl)
   │
   ├── src/data/mock.ts    ← typed mock data (today)
   └── future: src/repositories/supabase/*   (Supabase Auth/Postgres/Storage/Edge Functions)
```

- `Repositories` aggregate exposes: `auth, profile, location, merchant, product, order,
  delivery, payment, parcel, explore, notification, support`.
- UI has no knowledge of the implementation. Swapping mock→Supabase happens at
  `src/repositories/index.ts` (factory) with a documented async adapter step.
- Domain logic belongs in services (future `src/services/*`), never inline in components; the
  current views only orchestrate UI state, which is already the case after this refactor.

---

## 15. Repository → Supabase mapping (design, not implemented)

| Repository | Supabase resource(s) |
| --- | --- |
| AuthRepository | Supabase Auth (phone/email OTP, sessions) |
| ProfileRepository | `identities`, `profiles` |
| LocationRepository | `addresses` |
| MerchantRepository | `businesses`, `business_locations`, `merchant_registrations` |
| ProductRepository | `products`, `product_categories` |
| OrderRepository | `orders`, `order_items`, `order_events` |
| DeliveryRepository | `deliveries`, `delivery_assignments`, `delivery_partners` |
| PaymentRepository | `payments`, `payouts` (finance/ledger later) |
| ParcelRepository | `parcels` + private Storage `parcel-evidence` + `parcel_evidence` |
| NotificationRepository | `notifications` |
| SupportRepository | `support_tickets`, `support_messages` |
| ExploreRepository | static app content (no table; deploy-time config) |

## 16. RLS intent (documented only — no SQL written)

| Table | Intended access boundary |
| --- | --- |
| profiles / identities | owner only (+ internal_staff under employee auth) |
| addresses | owner only |
| orders / order_items | customer · authorized merchant staff · assigned partner · authorized internal staff |
| order_events | participants of the order (see above) |
| businesses / products | public read (discovery) · write: business staff (business-scoped) |
| deliveries / delivery_assignments | assigned partner · merchant (their orders) · authorized operations |
| payments | customer (own) · merchant (their orders) · finance operations |
| payouts | receiving identity · finance operations |
| parcel_evidence | restricted order participants · authorized support/operations under explicit policy |
| notification / support_* | relevant identity · support agents |
| internal_staff / permissions | never readable from the consumer app |

Posting, deleting and state transitions run through RPCs/Edge Functions (single authority),
never by direct client writes to sensitive tables.

---

## 17. Product boundaries

| Surface | Location | Authorization |
| --- | --- | --- |
| Consumer PWA | `pedeja.ao` | Supabase Auth (customer capability) |
| Merchant app | separate build (shares infra) | merchant capability + business scope |
| Estafeta app | separate build (shares infra) | approved delivery_partner capability |
| Operations | `operacoes.pedeja.ao` | InternalStaff + permissions + scope (separate boundary) |

Capabilities are independently authorized; no generic `role` dump collapses them.

---

## 18. Code layout (as built this checkpoint)

- `src/types/common.ts` — base value types (ID, Money, GeoPoint, Category, VehicleType, …).
- `src/types/domain.ts` — canonical domain model (this document, in code).
- `src/types/index.ts` — view/presentation projections consumed by components; re-exports common.
- `src/repositories/types.ts` — repository interface contract.
- `src/repositories/mock.ts` — mock implementation over `src/data/mock.ts`.
- `src/repositories/index.ts` — `repositories` singleton (swap point for Supabase).

No UI screen, route, brand token or navigation was changed in this effort.