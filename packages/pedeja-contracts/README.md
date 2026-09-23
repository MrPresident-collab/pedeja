# @pedeja/contracts

Shared contracts for the Pedejá application surfaces.

The package is deliberately limited to:

- canonical application identities and backend capabilities;
- customer service types;
- human-first address shape;
- order and payment status vocabulary;
- delivery assignment and availability vocabulary;
- operational timing constants already agreed for the delivery flow.

It contains **no** UI, Supabase client, authorization implementation, persistence logic, pricing calculation, or state-transition implementation.

## Zero-trust boundary

The contracts describe what applications may send or receive. They do not grant permission.

Authorization remains server-side in Supabase:

`auth.uid()` → capability/RBAC → RLS/RPC → transaction → audit/event.

A frontend application must never infer that access to an application means the user has the corresponding capability.

## Application identities

- `customer`
- `estafeta`
- `merchant`
- `admin`

## Backend capabilities

- `customer`
- `merchant`
- `delivery_partner`
- `partner`
- `internal_staff`

The Estafeta application therefore maps to `delivery_partner`, while the existing frontend's legacy `rider` naming is not part of this contract.

## Location principle

Addresses are human-first:

- Rua/Avenida and number;
- Bairro;
- Município/city/province where available;
- Referência.

Latitude/longitude are optional machine-assisted data. They are never a customer-facing requirement and never replace the human address.

## Important

Do not add RPC names, status transitions, pricing formulas, or authorization rules here until they are verified against the live Supabase schema. This package is a contract boundary, not a second source of truth.
