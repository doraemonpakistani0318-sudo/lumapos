# LumaPOS Shop Management Website — Cloud & Login Edition

Responsive Next.js point-of-sale and inventory starter with a luminous purple dashboard, account login, private Supabase cloud record, and local JSON backups.

## Included
- Email/password signup and sign-in with Supabase Auth
- Account-scoped cloud storage for products, sales, shop profile, logo, and commission settings
- Row Level Security (RLS) policies so authenticated users can only read/write their own `shop_data` row
- Dashboard, POS cart, barcode/name lookup, stock checks and sales history
- Inventory add/edit/delete and low-stock indicators
- Staff commission/pool calculations
- Shop name, address, phone and optional logo
- JSON export/import backup and local browser fallback
- Responsive desktop/mobile navigation

## 1. Run the website
1. Install Node.js 18 or newer.
2. Extract this ZIP and open a terminal in the project folder.
3. Run `npm install`.
4. Copy `.env.example` to `.env.local`.
5. Run `npm run dev` and open `http://localhost:3000`.

Without Supabase environment variables, the app runs in local-browser mode. That data does not automatically sync between devices.

## 2. Set up private cloud saving
1. Create your own project at [Supabase](https://supabase.com/).
2. In Supabase **SQL Editor**, run the complete `supabase/schema.sql` file.
3. In **Project Settings → API** (or the project's Connect/API details), copy the Project URL and the public/anon client key.
4. Put them into `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_ID.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_PUBLIC_OR_ANON_KEY
```

5. Restart `npm run dev`. Create an account in LumaPOS, then sign in on your other device using the same account.
6. If email confirmation is enabled, confirm the signup email before signing in. In Supabase Auth settings, configure your site's Site URL and allowed redirect URLs for the domain you deploy to.

**Never place a Supabase service-role/secret key in `.env.local` under a `NEXT_PUBLIC_` name or in browser code.** Only the public/anon key is intended for client-side use. RLS policies protect the cloud row by authenticated user ID.


## Default owner login (Doraemon)

The website accepts `Doraemon` as a username alias on the sign-in screen. The account must be provisioned in your own Supabase project once; the ZIP cannot safely create a Supabase Auth user from browser code.

1. In `.env.local`, add your Supabase **service-role/secret key** as `SUPABASE_SERVICE_ROLE_KEY=...`. Keep this key server-side/local only. Never use a `NEXT_PUBLIC_` prefix for it and never publish it in client code.
2. Run `npm run setup:default-admin` from the project folder. The local setup script creates the account if missing, or resets its password if it already exists.
3. Sign in with username `Doraemon` and the default password `03186337654`.
4. Change the password after first sign-in. Running the setup script again resets it to the default password. Do not run this script on a shared/untrusted computer.

The owner account uses `doraemonpakistani0318@gmail.com`; you can sign in with that email or the username alias `Doraemon`. The setup script is a local admin utility and is not exposed as a public website endpoint.

## Important notes
- The cloud data is stored as a single JSON payload per user, which keeps this starter's products, sales and settings together. It is suitable for a small starter workflow, not a substitute for a normalized production POS database.
- This starter syncs state to the cloud after changes with a short delay. Keep a JSON export before importing backups or making major changes. Avoid editing the same shop account simultaneously on multiple devices because the latest full-payload save can overwrite a concurrent change.
- Local browser data is not automatically merged with existing cloud data. On the first cloud login, if no cloud record exists, the app attempts to seed it from the browser's saved data.
- Hosting is not performed by this ZIP. Deploy the Next.js project to a host such as Vercel and set the same two environment variables in the host's project settings.
- Test checkout, inventory adjustments, backups and authentication before using it for live business transactions.

## Dedicated login route

A dedicated `/login` page is included for Supabase email/password sign-in and account creation. It uses the project's existing `shop_data` account-scoped JSON record and row-level security policy. The supplied sample's `shops`, `users`, relational `products`, and relational `sales` tables are intentionally not mixed into this project because the existing dashboard saves its product, sale, and settings records through `shop_data`; mixing the two schemas without migrating the app would cause database errors.

To use `/login`, configure `.env.local` using the values from Supabase Project Settings, run the SQL in `supabase/schema.sql`, then start the Next.js app. Email confirmation behavior is controlled in Supabase Authentication settings.


## Employee & commission management

The Staff & Commissions section supports employee records, active/inactive status, and per-employee commission methods: fixed amount per completed sale, percentage of sale value, tiered per-sale amount based on completed sale count, and fixed-plus-percentage. Select an active salesperson at POS checkout to attach the completed sale and its commission to that employee. Record full or partial commission payments and review earned, paid, and outstanding balances. Employee and payment data are included in local browser persistence, JSON backup/restore, and the existing account-scoped `shop_data` cloud payload.

Commission configuration is for internal bookkeeping; this project does not yet create separate staff login accounts or permission-enforced staff sessions. Install dependencies and run `npm run build` before deployment.

## Optional delivery and barcode stickers
- POS checkout includes an optional delivery charge toggle. The delivery fee is added to that sale's total only when enabled and is stored on the sale record for history.
- Inventory includes barcode sticker printing with custom width/height in millimetres, copy count, barcode format, and a show/hide price checkbox. Printing uses the browser print dialog and JsBarcode loaded from a CDN; the printer driver and actual label stock determine final alignment.
- Sticker price visibility and delivery defaults are included in saved shop settings and backup/restore.
- Login screen pre-fills the owner username `Doraemon`. The owner account must be provisioned with the local `npm run setup:default-admin` script using the Supabase service-role key as described above; the password is not automatically sent to the browser or silently entered for security.

## Netlify deployment (important)
This is a Next.js application source project, not a ready-to-upload static folder. Do not publish the source ZIP by dragging it into Netlify's manual deploy area. Connect the project repository to Netlify (or deploy with Netlify CLI) so Netlify can run the Next.js build and adapter.

In Netlify → Project configuration → Environment variables, set:
- `NEXT_PUBLIC_SUPABASE_URL` = your Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` = your Supabase publishable/anon key

Make sure these variables are available to the build, then trigger a fresh production deploy. Netlify does not automatically read `.env.local` from your computer. The app now fails closed: if Supabase is not configured, it shows a login-setup screen rather than exposing the POS dashboard. After configuring Supabase, run `supabase/schema.sql` in the Supabase SQL Editor and provision the owner account using the local setup script described above. Never expose `SUPABASE_SERVICE_ROLE_KEY` to browser/client code or public environment variables.

## Additional workflow features
- Sales history includes receipt printing sized for common 80 mm thermal printers.
- Full sale returns restore the sold quantities to inventory and mark the sale as returned. The sale's commission is reversed in commission totals/outstanding balances so it offsets future commission earnings.
- Settings > Login & security allows a signed-in Supabase user to request an email change and update their password. Supabase may require email confirmation.
- Returned sales are marked in history and net revenue/commission totals account for full returns.

After editing, deploy through a connected Git repository or the Netlify CLI so the Next.js project is built. Manual static drag-and-drop of the source folder does not run a Next.js build.


## Staff login accounts upgrade
- Owners can open **Staff Accounts** to create email/password accounts, assign Cashier or Manager labels, and disable/enable staff accounts. Staff accounts are created by a server-side API route using Supabase Admin Auth.
- Set `SUPABASE_SERVICE_ROLE_KEY` in the Netlify server environment variables. This key must remain server-side and must never use a `NEXT_PUBLIC_` prefix. Then redeploy.
- Run the updated `supabase/schema.sql` in Supabase SQL Editor to allow staff sessions to load the owner's shared `shop_data` row. The policy only scopes the shared row to the owner ID in trusted Supabase `app_metadata`.
- **Important limitation:** this starter stores the entire shop in one JSON payload. Cashier/Manager menu restrictions are interface-level, not fine-grained database permissions for individual products, sales, returns, or settings. Do not treat these roles as a strong security boundary for sensitive business data until the data is normalized into separate tables with database-enforced permissions.
