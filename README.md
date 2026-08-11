# EventFlow Pro

Prompt Lovable — FESA 2026 (base solide, itérable)

Copie-colle ce prompt tel quel dans Lovable pour générer la première version.

Build a professional event registration platform for FESA 2026, a large-scale entrepreneurship and food sovereignty forum organized by PAAF (Plateforme Africaine pour l'Autonomisation des Femmes et des Filles) in Dakar, Senegal, September 21-22, 2026.

Context: This is a multi-tenant event management platform, not a single-use site. FESA 2026 is the first event, but the architecture must support future events reusing the same codebase.

Design direction

Institutional, clean, trustworthy — audience includes ministries, GIZ, international banks, NGOs

Primary color palette: green and orange (matching PAAF/FESA branding — deep green like #2E7D32, warm orange accent like #F57C00), white backgrounds, generous whitespace

Typography: strong, confident sans-serif, large numerals for key stats

No generic stock photos — use clean illustrative placeholders for now (real PAAF photos will be added later)

Mobile-responsive by default (many attendees will register from phones)

Data model (Supabase/Postgres — set this up from the start)

Create these tables with proper foreign keys and relationships:

events

id (uuid, pk)

name, slug, start_date, end_date, location, status (draft/live/closed/archived)

branding (jsonb for colors/logo per event)

profile_types

id (uuid, pk), event_id (fk)

label (VIP, Entrepreneur, Institution/Partner, Press, Standard)

color_code (for badge banner)

requires_payment (boolean), price (nullable numeric)

participants

id (uuid, pk), event_id (fk), profile_type_id (fk), delegation_id (nullable fk)

full_name, email, phone, company, sector, function

registration_id (unique, human-readable, e.g. REG-FESA26-000123)

status (pending, paid, confirmed, checked_in)

created_at

delegations

id (uuid, pk), event_id (fk)

primary_contact_name, email, phone, source (csv_import/manual)

payments

id (uuid, pk), participant_id (fk)

provider (paytech/paydunya), amount, status (pending/success/failed)

provider_transaction_id, created_at

badges

id (uuid, pk), participant_id (fk)

qr_payload (short unique identifier, never encode personal data directly in the QR)

badge_url (dynamic redirect link, not a direct static file link)

generated_at, sent_email (boolean), sent_whatsapp (boolean)

Important: never hardcode "FESA 2026" anywhere in the schema or business logic — everything filters through event_id so this becomes a reusable platform.

Pages to build

Landing page — hero section with event name, dates, location; a stats bar showing key numbers (2 days, 15 ECOWAS countries, 2000+ participants, 21+ partners); thematic focus areas section; indicative program (Sept 21 / Sept 22); partners section; clear CTA to register.

Registration form — multi-step or single-page with conditional fields:

First: profile type selector (VIP, Entrepreneur, Institution/Partner, Press, Standard)

If "Entrepreneur" selected → show sector field (Agro-processing, Logistics, Trade, etc.)

If "Institution/Partner" selected → show organization name field, hide payment step entirely (these registrations are complimentary)

Standard fields: full name, email, phone, company, function

Payment step only shown for paying profiles (10,000 FCFA), with a placeholder payment button labeled for PayTech/PayDunya integration (to be wired up later)

Confirmation page — success message, preview of the generated badge, note that badge is being sent via email and WhatsApp

Badge preview component — reusable card showing: event logo, participant name, function/company, profile type as a bold color-coded banner (e.g., red for VIP, green for Entrepreneur, blue for Press), and a QR code placeholder in the bottom corner

Organizer dashboard (basic version, will be protected/authenticated later):

Table of registered participants with filters by profile type and status

Export to CSV button

Summary tiles: total registrations, total confirmed payments, conversion rate (started vs paid), live transaction feed placeholder

A toggle/button labeled "Create New Event" (non-functional for now, just to demonstrate the multi-event vision)

What NOT to build yet

Do not wire up real PayTech/PayDunya API calls — use placeholder buttons and mock success states

Do not build the actual WhatsApp/email sending logic — just show the UI states

Do not build the check-in/QR scanning flow yet — this comes in a later iteration

Do not add authentication yet unless trivially available — focus on the core UI and data model first

Deliverable goal

A polished, demo-ready mockup that clearly shows the full participant journey (landing → register → pay → confirmation → badge) plus a convincing organizer dashboard, built on a database schema that is already structured for multi-event reuse — even though only FESA 2026 will be populated with real data for now.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/70fe470b-e6d4-4c0a-83a4-8271282842bd).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
