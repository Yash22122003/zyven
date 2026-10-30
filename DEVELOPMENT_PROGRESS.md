# ZYVEN — Development Progress & Implementation Status

**Official Platform**: ZYVEN (`zyven.me`)  
**Tagline**: *“Local Businesses. Digital Possibilities.”*  
**Architecture**: Multi-Tenant Local Commerce SaaS (Shared Database, Shared Schema with Strict Business-Level Data Isolation)  
**Status**: Core Implementation, UPI QR Payment System & Mobile View Hardening Complete

---

## 1. Executive Summary & Verification

ZYVEN enables local independent businesses to launch digital storefronts (`zyven.me/[store-slug]`), manage real-time inventory, and accept store pickup orders (BOPIS) on a subscription SaaS business model (₹1/month introductory pricing with 0% sales commission).

- **Production Build Status**: Compiled and optimized via `next build` (32 routes generated, 0 TypeScript errors).
- **Automated Integration Tests**: 47/47 Passed (`tests/integration.ts`).
- **Database Persistence**: PostgreSQL 18 with Prisma ORM (15 relational tables with foreign keys and indexes).

---

## 2. Implemented Features by Phase

### Phase 1: Architectural Foundation, Multi-Tenant Core, Slug Engine & Auth
- [x] Full-Stack Next.js 14+ App Router project initialized with TypeScript, Tailwind CSS, and Geist typography.
- [x] PostgreSQL 18 database configured with complete Prisma schema (15 models).
- [x] Strict Reserved Slug engine (`src/lib/reserved-slugs.ts`) preventing collision with system routes (`admin`, `dashboard`, `api`, `auth`, `login`, `register`, `explore`, etc.).
- [x] Dynamic root storefront routing (`/[slug]`) and edge middleware session security (`src/middleware.ts`).
- [x] Role-Based Access Control (`SUPER_ADMIN`, `MERCHANT`, `CUSTOMER`) with secure bcrypt hashing and HttpOnly JWT cookies.
- [x] Seamless merchant onboarding wizard (`/register`) with live storefront slug preview and instant ₹1 promotional plan assignment.
- [x] Multi-persona demo login screen (`/login`) with 1-click test profile buttons.

### Phase 2: Product Catalogue & Live Inventory Synchronization
- [x] Retail categories taxonomy (Grocery & Essentials, Fashion & Apparel, Electronics & Mobile, Bakery, Health, Books).
- [x] Product catalogue management (`/dashboard/products`) with SKU, selling price, compare-at price (MRP), image URLs, and active/hidden toggles.
- [x] Dual-quantity inventory engine (`quantity_on_hand` physical stock vs `quantity_reserved` held in unfulfilled orders).
- [x] Atomic inventory adjustment interface (`/dashboard/inventory`) with mandatory audit reason logging (`InventoryMovement`).
- [x] Real-time low-stock alerts when `available_to_promise <= lowStockThreshold`.

### Phase 3: Public Storefront, Single-Store Cart, Atomic BOPIS Checkout & UPI QR Payments
- [x] Minimalist, high-performance public storefront (`/[slug]`) with responsive 2-column mobile grid and Linear/Stripe design.
- [x] Dynamic operating status calculation (Open/Closed indicator based on weekly schedule + merchant manual pause switch).
- [x] Customer stock display configured per store preference (`AVAILABILITY_STATUS` pills: "In Stock", "Few Left", "Out of Stock" vs `EXACT_COUNT`).
- [x] Single-store cart drawer with cross-store conflict detection modal and thumb-friendly floating checkout bar.
- [x] **Merchant UPI QR Code Integration**:
  - NPCI UPI deep link generator (`upi://pay?pa=...&pn=...&am=...&cu=INR&tn=...`) in `src/lib/upi.ts`.
  - Reusable `UpiPaymentCard` component with direct "Pay with any UPI App" intent link (GPay, PhonePe, Paytm, BHIM, CRED).
  - 1-click copy UPI ID with visual checkmark feedback.
  - Optional customer 12-digit UTR reference input with instant order timeline logging.
  - Merchant counter UPI QR modal for walk-in in-person billing.
- [x] Atomic checkout engine (`/api/checkout`) executing within a PostgreSQL transaction with row locks (`SELECT ... FOR UPDATE`), supporting both Instant UPI QR Code and Pay at Store (Cash).
- [x] Customer live order tracking screen (`/[slug]/orders/[orderNumber]`) with progress timeline, auto-refresh polling, and interactive UPI payment card.
- [x] Merchant order pipeline (`/dashboard/orders`) with order tags, payment status badges (`PAID` vs `PAYMENT PENDING`), and 1-click lifecycle transitions.

### Phase 4: Super-Admin Console & Subscription Engine
- [x] Platform overview dashboard (`/admin`) displaying total registered businesses, verified shops, active stores, total orders, GMV, and Monthly Recurring Revenue (MRR).
- [x] Business governance console (`/admin/businesses`) with 1-click Verification toggle and Suspend/Reactivate toggle with audit logging.
- [x] Subscription pricing manager (`/admin/plans`) allowing the platform operator to adjust the ₹1/month introductory price, promotional duration, and standard post-promo rates.
- [x] Merchant billing portal (`/dashboard/subscription`) displaying promotional cycle tracker ("Month 1 of 3"), renewal dates, and payment history.

### Phase 5: Mobile View Hardening, UI Refinements & Performance Optimization
- [x] **Storefront Profile Header Architecture ("Lower-Level" Title Pattern)**:
  - Eliminated awkward title/banner image overlap on `/[slug]`.
  - Positioned the store logo avatar on the banner boundary with clean white ring/border and shadow.
  - Aligned operating status pills (`Open for Pickup`) and `UPI Accepted` badges cleanly to the right of the avatar row.
  - Placed the store title, verified merchant badge, `zyven.me/[slug]` route pill, and category name strictly at the lower level on a pure white surface (`text-zinc-950`), providing 100% contrast, legibility, and full horizontal width across both mobile and desktop viewports.
- [x] **Merchant Dashboard Mobile Optimization**:
  - Fixed bottom app navigation bar (Overview, Orders, Products, Stock, Settings) with thumb-friendly tap targets.
  - Mobile top app bar with live 1-tap Store Open/Paused toggle and quick Counter UPI QR modal trigger.
  - Responsive dual views: concise cards on mobile screens (`sm:hidden`) and detailed data tables on desktop (`hidden sm:block`).
- [x] **Storefront Mobile Optimization**:
  - Compact 2-column product grid with responsive card heights.
  - Smooth horizontal category filter pills.
  - Sticky bottom checkout bar with item count and subtotal.
- [x] **Automated Integration Test Suite** (`tests/integration.ts`):
  - Reserved slugs and URL protection (8 assertions)
  - Order state machine transitions (6 assertions)
  - Cross-tenant data isolation (4 assertions)
  - Atomic inventory concurrency & overselling prevention (6 assertions)
  - Subscription pricing governance (3 assertions)
  - Merchant UPI QR payment & NPCI URI protocol generation (6 assertions)
  - Razorpay UPI order creation in paise, signature verification & webhook idempotency (7 assertions)
  - Customer role auth & customer order data isolation (4 assertions)
  - **Total: 39/39 Passed (0 Failed)**.

### Phase 6: Customer Auth, Customer Dashboard & Global Cart System
- [x] **Customer Authentication & Onboarding**:
  - Reused existing bcrypt/JWT HttpOnly cookie auth infrastructure.
  - Added customer registration flow (`role: CUSTOMER`) alongside existing merchant registration via `/register` segment toggle.
  - Implemented role-based redirects on `/login`: `SUPER_ADMIN` -> `/admin`, `MERCHANT` -> `/dashboard`, `CUSTOMER` -> `/account/orders`.
  - Added quick 1-click Demo Customer login button on `/login` (`priya@example.com` / `Zyven@2026`).
  - Added customer-aware navbar states: displays "My Orders" (`/account/orders`) and user identity for logged-in customers.
- [x] **Customer Orders Dashboard & Protected Detail View**:
  - Protected customer route `/account/orders` and `/account/orders/[id]` enforced via Next.js edge middleware.
  - Implemented strict user/customer data isolation on `/api/customer/orders` and `/api/customer/orders/[id]` (`order.customerId === user.id`).
  - Order status filters: `All`, `Active` (Pending, Confirmed, Preparing, Ready for Pickup), `Completed` (Collected/Delivered), and `Cancelled`.
  - Customer order detail view with visual 5-step progress timeline, shop address, contact telephone, pickup notes, items table, and price breakdown.
  - Automatically associates `customerId` on checkout when a customer is logged in.
- [x] **Global Cart Architecture & UI Fix**:
  - Transformed `useCart` into a unified `CartProvider` (`src/context/CartContext.tsx`) with localStorage persistence across tabs.
  - Built sleek slide-over `CartDrawer` with items list, image previews, quantity controllers, subtotal, and direct checkout trigger.
  - Added universal cart trigger button in the main `Navbar` with dynamic item count badge.
  - Built dedicated `/cart` full-page view for the reserved `cart` route.
  - Updated storefront bottom bar to allow opening the cart drawer (`View Items`) before checkout.
  - Pre-fills customer name, phone, and email on `/[slug]/checkout` when logged in.

### Phase 7: Razorpay UPI Payment Gateway, Webhook Verification & Cross-Device Detection
- [x] **Standardized Sole Payment Method**:
  - Replaced legacy static VPA and cash-on-pickup selections with Razorpay UPI (`RAZORPAY_UPI`) as the single official payment method across checkout and order workflows.
  - Updated database schema with `razorpayOrderId`, `razorpayPaymentId`, `razorpaySignature` fields, and `RAZORPAY_UPI` payment method enum.
- [x] **Backend Razorpay Orders API & Security**:
  - Integrated official `razorpay` Node.js SDK with credentials stored strictly in server-side environment variables (`RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`).
  - All amounts converted and validated strictly in paise (`Math.round(totalAmount * 100)`).
  - Client checkout endpoint returns only the public `keyId`, `orderId`, `amount`, and `currency`—zero secrets exposed to client-side bundles.
- [x] **Real-Time Cross-Device QR Detection**:
  - Embedded dynamic UPI modal configuration enabling Google Pay, PhonePe, Paytm, CRED, BHIM, and on-screen dynamic UPI QR.
  - Integrated 2-second background status polling on `/api/payment/status` while the Razorpay QR checkout is displayed.
  - When the customer scans the on-screen QR code from a secondary mobile phone and completes payment, the webhook marks the order `PAID` in PostgreSQL; the desktop checkout immediately senses the status change, closes the modal, clears the active cart, and navigates to the verified order confirmation screen without requiring manual page refresh.
- [x] **Dual Verification & Strict Idempotency**:
  - Client-side checkout callback verified via HMAC-SHA256 signature against `order_id + "|" + payment_id`.
  - Authoritative webhook endpoint (`/api/payment/razorpay/webhook`) parses raw request body and verifies `x-razorpay-signature` using timing-safe comparisons for `payment.captured` and `order.paid` events.
  - Atomic idempotency check prevents duplicate processing: if an order is already marked `PAID`, subsequent webhook retries or callback executions immediately return without double-updating inventory or duplicating notifications.
- [x] **Retry & Failure Recovery**:
  - If payment is dismissed or fails, a persistent retry banner allows the customer to immediately re-launch UPI checkout.
  - Dedicated order page (`/[slug]/orders/[orderNumber]`) includes a 1-click UPI retry flow and auto-polling until paid.
- [x] **Diagnostic Telemetry & Strict Real Order ID Enforcement**:
  - Eliminated mock order ID fallbacks (`order_...`); requires authentic Razorpay Order creation via official SDK.
  - Added safe non-sensitive diagnostic logging at every stage (payment button click, SDK init, order creation, script loading, modal launch, callbacks, signature verification).
  - Created `/api/payment/razorpay/create-order` endpoint to ensure authentic Razorpay order IDs during retry flows.

### Phase 8: Role-Based User Experience, Dedicated Portals & Strict RBAC
- [x] **Universal Role-Aware Authentication (`/login`)**:
  - Unified login portal with interactive role tabs for `Customer`, `Merchant`, and `Super Admin`.
  - Context-aware guidance cards and 1-click test profile buttons (`priya@example.com`, `sharma@store.com`, `admin@zyven.me`).
  - Automatic role-based redirects upon successful login: Customers land at `/account`, Merchants at `/dashboard`, and Super Admins at `/admin`.
- [x] **Dedicated Customer Portal (`/account`)**:
  - Modern shopping-oriented interface featuring personalized greeting ("Hi, {firstName}! Welcome back, Customer").
  - Customer Profile Card with registered phone, email, membership date, and inline profile editing.
  - Active in-store pickup tracker displaying live preparation status, store contact info, and pickup instructions.
  - Favorite local stores showcase with direct storefront links.
  - Recent order history with direct receipt / order tracking links.
  - Strict isolation: Customers see only their own data with zero merchant or admin controls.
- [x] **Enhanced Landing Page (`/`) & Role Navigation**:
  - Prominent search bar in the Hero section to instantly discover neighborhood shops by name, category, or city.
  - Quick-access shortcuts to popular merchant storefronts (`/sharma-store`, `/anita-fashion`, `/mobile-world`).
  - Dual action CTAs: "Explore Local Stores" & "Customer Sign In" vs. "Launch Store for ₹1/mo" & "Merchant Portal Sign In".
  - Featured stores showcase with live "Open for Pickup" and "UPI Accepted" badges.
  - Global `Navbar` dynamically adapts based on session: renders Customer pill (`🛍️ {Name} (Customer)`), Merchant pill (`🏪 {Store} (Merchant)`), Super Admin pill (`⚡ Super Admin`), or public visitor shortcuts.
- [x] **Strict Edge Middleware RBAC Enforcement (`src/middleware.ts`)**:
  - Edge-compatible zero-dependency JWT claims parsing (`getJwtRole`).
  - Enforces route-level RBAC: `/admin/*` restricted to `SUPER_ADMIN` (redirects unauthorized roles to `/dashboard` or `/account`); `/dashboard/*` blocks `CUSTOMER` users (redirects to `/account`); `/account/*` requires authentication.

### Phase 9: Secure Login, Demo Credential Removal & Subscription-Gated Merchant Onboarding
- [x] **Part A: Demo Credential Sanitization & Protected Admin Provisioning**:
  - Completely removed static "QUICK TEST PROFILES" UI, demo email cards, and hardcoded `Zyven@2026` passwords from `/login` and `/register`. Zero credentials present in frontend code, JS bundles, API responses, or browser storage.
  - Hardened demo login endpoint (`/api/auth/demo-login`): Returns HTTP 404 whenever `NODE_ENV === 'production'` or `ENABLE_DEMO_LOGIN !== 'true'`. Conditionally loads demo buttons on the frontend only when this server route returns 200 in development.
  - Super Admin public registration permanently blocked on `/api/auth/register` with HTTP 403 Forbidden.
  - Implemented secure Super Admin provisioning CLI (`scripts/provision-super-admin.ts` / `npm run admin:provision`) reading credentials from `SUPER_ADMIN_EMAIL` and `SUPER_ADMIN_PASSWORD` with bcrypt hashing.
  - Guarded `prisma/seed.ts` to abort execution when `NODE_ENV === 'production'`. Replaced hardcoded seed passwords with configurable `DEV_SEED_PASSWORD`.
  - Re-verified post-login redirects: Customers -> `/account`, active Merchants -> `/dashboard`, Super Admins -> `/admin`.
- [x] **Part B: Subscription-Gated Merchant Onboarding & State Machine**:
  - Remediated registration vulnerability: Merchant registration now initializes stores in `MerchantStatus.REGISTERED` with `isActive: false` and no active subscription, redirecting directly to `/onboarding/plan`.
  - Added full Prisma enum `MerchantStatus` (`REGISTERED`, `PLAN_SELECTED`, `PAYMENT_PENDING`, `PAYMENT_FAILED`, `ACTIVE`, `EXPIRED`, `SUSPENDED`) and Razorpay subscription tracking fields (`razorpayOrderId`, `razorpayPaymentId`, `razorpaySignature`).
  - Built multi-step onboarding wizard:
    - Step 1: `/onboarding/plan` — Plan selection with introductory ₹1 promotional offer, features checklist, and duration breakdown.
    - Step 2: `/onboarding/checkout` — Order summary with GST tax breakdown, Razorpay SDK modal integration, dynamic UPI QR polling, and auto-activation.
    - Status `/onboarding/suspended` — Account suspension notice with compliance support contact.
  - Backend payment & webhook security:
    - Dedicated onboarding order creation (`/api/merchant/onboarding/create-subscription-order`) and signature verification (`/api/merchant/onboarding/verify-subscription`).
    - Webhook (`/api/payment/razorpay/webhook`) automatically detects subscription payments, verifies signature, executes idempotent database transaction, marks subscription `ACTIVE`, logs `AuditLog`, and activates the merchant.
    - Failure recovery (`/api/merchant/onboarding/payment-failed`): Marks status as `PAYMENT_FAILED` without duplicating merchant accounts; provides immediate "Retry Payment" flow preserving the selected plan.
  - Multi-tier route protection:
    - Edge middleware intercepts inactive merchants attempting to reach `/dashboard/*` and immediately routes them to their exact onboarding step (`/onboarding/plan`, `/onboarding/checkout`, or `/onboarding/suspended`).
    - Backend API guard (`requireMerchant` in `src/lib/auth.ts`) strictly verifies `business.status === ACTIVE` and throws `INACTIVE_MERCHANT:${status}`, returning HTTP 403 with `redirectUrl` for any mutation attempt.
  - Super Admin governance console:
    - Filter tabs on `/admin/businesses` (`ALL`, `ACTIVE`, `PENDING`, `FAILED`, `SUSPENDED`).
    - Audit-logged manual activation creating proper `BusinessSubscription` and `SubscriptionPayment` records with `SUPER_ADMIN_MANUAL_OVERRIDE` method.
- [x] **Part C: Verification & Testing**:
  - Automated integration test suite expanded to 47 passing tests across 8 test suites.
  - Live dev server verification verified: demo login 404s, public admin registration 403s, inactive merchant dashboard blocking, plan selection, payment failure recording, and duplicate-free retry recovery.

---

## 3. Known Bugs / Issues
- None. Build compiles cleanly; all tests pass.
