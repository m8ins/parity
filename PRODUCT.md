# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Parity serves the creator's own household today. It is developed as a small consumer app for learning purposes, with the clarity and usability expected of a B2C product. A broader launch or audience is not yet decided.

## Product Purpose

Help a household understand its electricity and gas usage and avoid unexpected Nachzahlungen. Success means understanding projected annual costs and whether current monthly Abschläge are sufficient, early enough to adjust them.

## Positioning

Parity combines seasonal consumption forecasts with recommended monthly payments. This combination is the intended distinction from a household spreadsheet or an energy supplier's portal; it is a product direction, not a verified claim about every competing tool.

## Operating Context

- Users manually record electricity and gas meter readings, including on a mobile device while standing at the meter.
- Users maintain billing periods, supplier details, tariff changes, and monthly payment amounts, then revisit forecasts as readings accumulate.
- German household energy billing is the primary context. Preserve terms such as Zählerstand, Grundpreis, Arbeitspreis, Abschlag, Nachzahlung, and Erstattung where they clarify the task.

## Capabilities and Constraints

The existing implementation provides:

- Account authentication through Supabase, with password and email-code flows.
- Multiple electricity and gas meters, with readings retained across billing periods.
- Billing-period and supplier history, dated rates and payment amounts, and recorded settlements.
- Annual consumption and cost projections, comparisons with monthly payments, and recommended monthly payments.
- Seasonal gas weighting, uniform electricity weighting by default, and support for custom monthly distributions.
- Gas conversion from cubic meters to kilowatt-hours using a conversion factor.
- Consumption charts, monthly breakdowns, and reading and rate histories.

Projections require at least two readings within the selected billing period. Forecasts and recommendations are estimates derived from entered data and consumption assumptions, not guaranteed bills or automatic changes to supplier payments.

The existing stack is Next.js App Router, TypeScript, React, Tailwind CSS, shadcn/Radix UI primitives, Recharts, and Supabase. Schema changes must evolve with the migrations and local seed data.

## Brand Commitments

- The product name is Parity.
- German-first language is a binding requirement. Existing English interface copy is implementation debt rather than a language direction.
- Broader voice and brand decisions remain open.

## Evidence on Hand

- Working feature implementations in `src/components/` and projection logic in `src/lib/calculations.ts`.
- Data types in `src/lib/types.ts`, schema history in `supabase/migrations/`, and reproducible sample data in `supabase/seed.sql`.
- Calculation, date, contract, and interaction tests alongside the code.

Seed data is demonstration material, not evidence of real customer outcomes. No customer testimonials, measured savings, or forecast-accuracy claims have been established.

## Product Principles

1. Make usage and likely billing outcomes understandable enough to act on.
2. Connect seasonal forecasts directly to practical monthly payment guidance.
3. Preserve meter and billing history so changes remain understandable over time.
4. Keep routine entry practical on a phone at the meter.
5. Treat household data privacy and accessible use as product requirements.

## Accessibility & Inclusion

Accessibility is binding. Core tasks must support keyboard and assistive-technology use, readable content, clear form labels and errors, and information that does not depend on color alone. Mobile use while reading meters is a required usage context. A specific conformance standard and any additional user-specific needs remain undecided.

## Privacy

Personal household data privacy is binding. Preserve account-scoped access to meters, readings, and billing information. Do not expose household data or add sharing or external data use without an explicit product decision. Retention, export, and deletion policies remain open.
