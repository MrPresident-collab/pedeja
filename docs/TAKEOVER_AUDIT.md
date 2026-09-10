# PEDEJÁ — Takeover Audit

Repository audit performed at takeover, before structural changes.

Date: 2026-09-10
Scope: `project/` (the delivered Pedejá codebase)

---

## Project

| Field | Value |
| --- | --- |
| Framework | React 18 SPA (no router — state-machine navigation) |
| Language | TypeScript 5.5 (strict) |
| Build system | Vite 5.4 (esbuild/rollup) |
| Styling | Tailwind 3.4 (loaded) + custom CSS in `src/index.css` (dominant) |
| Icons | lucide-react 0.446 |
| Font | Manrope (Google Fonts `@import`) |
| Package manager | npm (lockfile: `package-lock.json`) |
| Package name | `vite-react-typescript-starter` (template default — to be renamed) |
| Scripts | dev / build / lint / preview / typecheck |
| Backend client | `@supabase/supabase-js` 2.57.4 — **optional, nil-safe** |

Verification at takeover: `npm install` ✓ · `npm run typecheck` ✓ · `npm run build` ✓ · `npm run lint` ✗ (5 unused-import errors, 1 fast-refresh warning).

---

## Existing UI

### Screens / "routes" (all inside `src/views/customer/`)
- `splash` — dark onboarding splash, purple orbits, tagline
- `welcome` — "Entrar / Criar conta / Convidado" (no real auth UI beyond this)
- `app` tabs: **Início · Explorar · Pedidos · Perfil** (bottom nav, exactly 4 items)
- `category` — Comida / Compras / Lojas marketplaces + Enviar landing
- `enviar-flow` — 6-step parcel flow
- `business` — business detail (placeholder "menu completo em breve")
- Navigation is a React state machine in `App.tsx`; there is **no URL routing, no deep links**.

### Mobile behavior
- `.app-frame` max-width 520px, full-height, light surface `#F8F7FA`
- Fixed bottom nav with safe-area padding, fixed sticky action bars, bottom sheets, portrait P-content flows. Real mobile-first structure. ✓

### Desktop behavior
- On ≥700px the app shell centers a "phone frame" with rounded corners/shadow. Acceptable for a mobile PWA preview; the product is not desktop-first.

### Design system
- CSS custom properties: `--purple:#8A2BE2`, `--purple-dark`, `--ink`, `--muted`, `--line`, `--surface`, `--soft:#F8F7FA`, plus success/warning/error. Dark surfaces `#1A1A1A` / splash `#0B0B0D`.
- Custom utility classes (`.btn-*`, `.filter-chip`, `.business-*`, `.state-block`, `.sheet-*`, …).
- Tailwind is present but almost unused — mostly dead weight/duplication today.

### Visual identity
- Purple core is correct. Pinkish light tints `#F0E4FB`, dark `#1A1A1A`, purple glow on active nav. Typography: Manrope.
- **Conflict:** the *Enviar* (send) category icon tone uses deprecated burnt orange `#d47b15` / `#fff0da`; `business-avatar.cream` tone also uses amber `#b57b27`. Orange is the deprecated identity and must not lead.

---

## Existing Product

### Customer
- Home: "Entregar em", greeting with mock name, "O que precisas hoje?", 4 intents (Comida/Compras/Enviar/Lojas), promo banner (`#1A1A1A` + purple), discovery list, inert search bar / "Ver tudo".
- Explore: full spec index — Sobre, Como funciona, Negócios, Torna-te parte da rede, Suporte, Legal, social (Facebook missing), feedback. ✓ (all actions are toast stubs)
- Orders: ATIVO / HISTÓRICO segmented. Active card has fake map, status, merchant, timeline, totals (subtotal/entrega/total), actions (mensagem, ligar, partilhar, whatsapp). **Missing:** rider, distance, duration breakdown, discounts, tip.
- History: date, merchant, type, total, status only. **Missing:** rider, items, discounts, distance/duration, **Repetir pedido**, **Avaliar entrega**, full receipt detail.
- Profile: identity + `Conta` (dados, endereços, pagamentos) + `Ajuda e preferências` (ajuda, notificações, definições) + share + logout + footer + danger zone. **Does not match the spec group layout** (see §Problems).
- Enviar flow: Origem → Destino → Conteúdo → Tamanho → Veículo/Instruções/Foto → Confirmar. Structure is close to spec. Photo is a boolean toggle, not a real capture; vehicle recommendation is hardcoded ("Recomendado"); estimates are hardcoded.

### Merchant / Estafeta / Operations
- Not present. No merchant, estafeta, or operations code exists in the consumer app. **Operations are absent from the customer application — correct per spec (§21).**

---

## Backend

| Area | Status |
| --- | --- |
| APIs | None real. `src/services/supabase.ts` exposes an *optional* `getSupabase()` (nil-safe), `src/services/auth.ts` wraps OTP/password/session calls. No HTTP API server. |
| Databases | None. All data is typed mock arrays in `src/data/mock.ts` (isolated, good). |
| Authentication | Supabase Auth wrappers present but **not wired to UI**; app currently runs in implicit guest mode. |
| Storage | None. (Parcel photo evidence is a stub boolean.) |
| External services | Google Fonts (Manrope). Google-spread `@import` (only prerender/offline concern). No proprietary backend. |
| PWA | Manifest exists but **icons are missing** (referenced files absent), **no service worker**, **not installable** today. |

**Vendor-specific infrastructure discovered:** none of consequence.
- Template metadata (`.bolt/` folder) — marked the generated scaffold only; deleted during cleanup.
- `index.html` embedded vendor OG/social image URLs — removed (branding lock-in).
- No vendor database, backend service, hidden persistence, or proprietary API was found.

---

## Security

- **Secrets:** none in repo. `.env` is git-ignored. Only anon-key Supabase env vars are used (`NEXT_PUBLIC_`-style `VITE_*`) — never a service-role key. ✓
- **Client/server boundary:** currently 100% client-side SPA. The server must be authoritative later (RLS, Edge Functions, serverside authz). Today the boundary is clean: components read `src/data/mock.ts` and `src/services/*`; no scattered `.env` access in views. ✓ (still worth enforcing a repository layer; see Recommendation)
- **Authorization / roles:** none implemented; there is no role state to tamper with. When auth arrives, activation must be server-authoritative (not localStorage/state).
- **Operations isolation:** no operations surface inside the consumer app. ✓
- **Input/output validation, rate limiting, uploads, audit:** not applicable at this mock stage; must be designed into the future Supabase layer.

---

## PWA

| Area | Status |
| --- | --- |
| `manifest.webmanifest` | Present, correct theme `#8A2BE2`, standalone, pt-AO. |
| Icons | **Broken** — `icon-192.png`, `icon-512.png`, `favicon.svg` are referenced but do not exist. |
| Install behavior | Not installable until icons are present. |
| Service worker | **None.** No offline shell, no network-error handling. |
| Safe areas | Handled in CSS (`env(safe-area-inset-bottom)`). ✓ |

---

## Problems

Deviations from / gaps against the Pedejá specification:

1. **PWA not installable / offline broken** — missing favicon + icons, no service worker (§26).
2. **Vendor branding leak** — starter OG/social images in `index.html` (portability, §29).
3. **Starter package name** — `vite-react-typescript-starter` (§29 identity).
4. **No `.env.example`** — Supabase client is undocumented for a new developer.
5. **Deprecated orange accents** — Enviar category + `cream` business tone (§6).
6. **Profile structure** deviates from spec (§12): no separate ENDEREÇOS, PAGAMENTOS, PARTICIPAÇÃO, SEGURANÇA, INFORMAÇÃO groups.
7. **Active order card** missing rider, distance, duration breakdown, discounts, tip (§11).
8. **Order history** missing repeat-order and rate-delivery actions, rider, full receipt data (§11).
9. **Business detail is a placeholder**; no cart/checkout (§9/§10-compatible next step).
10. **Dead UI** — search bar, "Ver tudo", and every Explore/Profile action are toast stubs ("Em breve!").
11. **No routing** — state-machine nav, so no deep links / shareable URLs (relevant to tracking share later).
12. **Tailwind unused** — dependency + config present but effectively unused; CSS is custom. Clean either direction.
13. **No tests, no README, no docs** (audit is the first doc).
14. **npm audit** — 21 advisories (3 low, 5 moderate, 13 high), mostly devDeps; review `npm audit fix`.
15. **Template metadata** — `.bolt/` folder present at takeover; removed during cleanup.

---

## Recommendation

### KEEP
- Vite + React + TS stack, npm, `@/` alias, strict TS.
- Typed domain models (`src/types/index.ts`) and isolated mock data (`src/data/mock.ts`).
- Service boundary pattern — optional nil-safe Supabase client + auth wrapper (`src/services/*`).
- Component kit: BottomNav, BottomSheet, Toast, Button, EmptyState/ErrorState/LoadingState, FilterChip, Logo, SectionHeader.
- Customer 4-tab navigation, purple tokens, Manrope, mobile-first frame + safe-area handling.
- Enviar flow structure, Explore index structure, Home's core block (location, greeting, question, 4 intents).

### REFACTOR
- **Profile** → spec group layout.
- **Orders** → full spec (rider, distance/duration, discount, tip; history with repeat/rate/receipt).
- **Navigation** → introduce URL routing (deep links) or a documented abstraction, keeping bottom nav.
- **CSS** → decide custom vs Tailwind (remove the unused one).
- Fix lint errors; later review `npm audit fix`.

### REBUILD
- **PWA layer** (partially rebuild): icons + favicon + service worker + offline shell + installability (high priority, do now).
- **Business/menu + cart/checkout** — real product surface behind the marketplace rows.
- **Merchant, Estafeta, Operations apps** — separate builds (staged beyond this takeover).

### REMOVE
- Vendor OG/Twitter images.
- Starter package name.
- Orange-first Enviar accent (→ purple family).
- Template metadata leftovers.
- Inert placeholders where a real flow belongs (search, "Ver tudo", toast-stub actions) — as flows land.

### Backend portability statement
The delivered project has **no mandatory vendor backend**. Supabase is an optional, dormant client behind a service boundary. To keep portability: `git clone → npm install → npm run dev` works with mocks; adding `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY` activates the client. Future production data flows (orders, riders, payments, parcels) must sit behind the same service/repository layer and be served by Supabase (Auth/PostgreSQL/RLS/Storage/Edge Functions). Parcel evidence must be short-lived private Storage with signed access + retention + auto-deletion.

---

## This checkpoint (takeover changes)

Applied in the takeover phase:

- PWA assets created (favicon + 192/512 icons) and manifest references now resolve.
- Service worker `public/sw.js` added (runtime cache + offline shell), registered in production.
- Vendor OG/Twitter images removed from `index.html`.
- `package.json` name → `pedeja`.
- `.env.example` added (Supabase vars, empty).
- Enviar category accent moved off deprecated orange into the purple family.
- `ProfileView` restructured to the spec groups (CONTA / ENDEREÇOS / PAGAMENTOS / PARTICIPAÇÃO / SEGURANÇA / INFORMAÇÃO).
- Toast API split out of `Toast.tsx` into `src/components/toastStore.ts` (removes the react-refresh lint warning).
- Lint errors fixed (unused imports); typecheck/build/lint now clean.
- `.bolt/` folder and vendor branding artifacts removed; audit doc renamed `TAKEOVER_AUDIT.md`.