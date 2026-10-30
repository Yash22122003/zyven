# ZYVEN — Development Progress & Architectural Tracker

**Platform**: ZYVEN (`zyven.me`)  
**Tagline**: *“Local Businesses. Digital Possibilities.”*  
**Architecture**: Multi-Tenant Local Commerce SaaS (Shared Database, Shared Schema with Strict Tenant Isolation)  
**Status**: Architecture & Design Phase (Awaiting User Sign-off)

---

## 1. Project Overview & Business Model Summary

ZYVEN is a centralized multi-tenant digital commerce infrastructure platform enabling independent local shops (groceries, fashion, bakeries, pharmacies, electronics) to establish branded digital storefronts (`zyven.me/[store-slug]`), manage live inventory, and fulfill customer orders via physical store pickup (BOPIS: Buy Online, Pick up In-Store).

- **Primary Monetization**: Subscription SaaS (Introductory offer of ₹1/month for the first 2–3 months; configurable standard pricing afterward). 0% sales commission.
- **Fulfilment Model**: Physical in-store pickup only for initial release (zero delivery fleet overhead).
- **Payment Model**: Pay at Store / Cash on Pickup baseline, with ready hooks for UPI/Online gateways.

---

## 2. Technical Decisions Log

| Decision ID | Topic | Decision / Recommendation | Status |
|---|---|---|---|
| **DEC-001** | **Tech Stack** | Full-Stack Next.js 14+ (App Router, Server Actions, Route Handlers), TypeScript, Tailwind CSS, Shadcn UI / Radix primitives, Lucide Icons, Prisma ORM, PostgreSQL 18, Redis. | Proposed (Pending Approval) |
| **DEC-002** | **Multi-Tenancy Architecture** | Single-database, shared-schema model with indexed `business_id` across all tenant entities. Tenant isolation enforced via authenticated session guards at the application layer, supplemented by PostgreSQL Row-Level Security (RLS). | Proposed (Pending Approval) |
| **DEC-003** | **Inventory Concurrency** | Two-phase inventory: `quantity_on_hand` and `quantity_reserved`. Checkout executes within a strict PostgreSQL atomic transaction (`SELECT ... FOR UPDATE` row lock) to eliminate overselling and race conditions. | Proposed (Pending Approval) |
| **DEC-004** | **Checkout Auth Model** | Streamlined frictionless checkout with mandatory customer name and verified phone number (guest checkout with phone token); customer account creation optional. | Proposed (Pending Approval) |
| **DEC-005** | **Order State Machine** | Strict transition matrix: `PENDING` → `ACCEPTED` → `PREPARING` → `READY_FOR_PICKUP` → `COLLECTED`. Auto-expiry timer (default 30 mins) releases reserved inventory if unaccepted. | Proposed (Pending Approval) |
| **DEC-006** | **Promotional Subscription** | Configurable subscription engine supporting the ₹1/month introductory pricing for 2–3 billing cycles, followed by standard pricing with a 7-day grace period before storefront pausing. | Proposed (Pending Approval) |

---

## 3. Phased Roadmap & Implementation Progress

### Phase 1: Foundation, Multi-Tenant Core, Slug Engine & Auth
- [ ] Initialize Next.js 14+ TypeScript project with Tailwind CSS & Shadcn design tokens
- [ ] Set up PostgreSQL database connection & Prisma schema
- [ ] Implement reserved slug validator & dynamic routing (`zyven.me/[slug]`)
- [ ] Implement secure authentication (NextAuth/JWT, password hashing with bcrypt, role-based access control)
- [ ] Build business onboarding flow (name, slug, category, address, contact, operating hours)
- **Status**: ⏳ Pending Architecture Approval

### Phase 2: Product Catalogue & Live Inventory Synchronization
- [ ] Category management (global categories & store-specific filtering)
- [ ] Product catalogue CRUD (title, description, price, compare-at price, image, SKU, active toggle)
- [ ] Dual-quantity inventory engine (`quantity_on_hand`, `quantity_reserved`, low-stock threshold)
- [ ] Inventory adjustment log (`InventoryMovement` audit trail)
- [ ] Merchant inventory quick-update interface with low-stock badges
- **Status**: ⏳ Pending Phase 1

### Phase 3: Public Storefront, Single-Store Cart & Atomic Pickup Checkout
- [ ] Branded merchant storefront (`/[slug]`) with Linear/Stripe aesthetic
- [ ] Store status display (Open/Closed based on schedule or manual toggle, pickup instructions)
- [ ] Real-time stock display (Exact quantity or minimalist status pill: "In Stock", "Few Left", "Out of Stock")
- [ ] Single-store cart drawer with clear store pickup disclaimers
- [ ] Atomic checkout with database row locking, order code generation (`ZYV-YYYYMMDD-XXXX`), and stock reservation
- [ ] Customer live order tracking screen with timeline and pickup instructions
- [ ] Seller order processing console (Kanban/Table with Accept, Prepare, Ready, Collected actions)
- **Status**: ⏳ Pending Phase 2

### Phase 4: Super-Admin Console & Subscription Engine
- [ ] Super-admin overview (platform GMV, active stores, order count, MRR)
- [ ] Business governance (verification, suspend, reactivate, slug change audit)
- [ ] Subscription engine with ₹1/month introductory offer configuration
- [ ] Standard plan pricing controls & billing lifecycle tracker
- [ ] Platform category & global settings management
- **Status**: ⏳ Pending Phase 3

### Phase 5: Hardening, Security Audit & Pilot Launch Readiness
- [ ] Automated cross-tenant data leakage tests
- [ ] High-concurrency checkout load testing (verifying zero overselling under simultaneous requests)
- [ ] In-app notification center for new orders, stock alerts, and order updates
- [ ] Mobile-first responsiveness audit across iOS Safari and Android Chrome
- [ ] Database backup, recovery, and indexing optimizations
- **Status**: ⏳ Pending Phase 4

---

## 4. Completed Features
*No code implemented yet — Architecture & Technical Blueprint drafted for stakeholder sign-off.*

---

## 5. Pending Features
- Complete technical roadmap (Phases 1 through 5).

---

## 6. Known Bugs / Issues
- None (pre-implementation).

---

## 7. Next Immediate Steps
1. Present comprehensive system architecture, database design, directory structure, and critical decisions to user.
2. Receive user review and approval on proposed technical decisions.
3. Initialize the repository, setup Next.js full-stack framework, and configure Prisma with PostgreSQL 18.
