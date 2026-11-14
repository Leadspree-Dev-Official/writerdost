# Pricing, Subscriptions, Coupons, and Referral System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create a comprehensive Pricing & Subscription experience in Writerdost AI featuring a Free tier (2 projects, 2 blogs/mo) alongside Basic, Pro, and Enterprise tiers, coupon codes, a referral program, interactive checkout, and full admin controls in `/admin`.

---

## File Structure & Proposed Changes

- `writerdost-frontend/src/lib/store-types.ts`
  - Update `UserPlan` type to `'Free' | 'Basic' | 'Pro' | 'Enterprise' | 'Custom'`.
  - Add `PlanLimits` interface (`maxProjectsPerMonth: number`, `maxBlogsPerMonth: number`, etc.).
  - Add `PLAN_DEFINITIONS` constant with prices, quotas, and feature entitlements.
  - Add `Coupon`, `ReferralData`, `UserSubscription` interfaces.
- `writerdost-frontend/src/lib/subscription-service.ts`
  - Core business logic for coupons, referrals, plan quotas, and payment gateway adapters (PayPal/Stripe/Simulated).
  - Monthly usage calculation functions for projects and blog generations.
- `writerdost-frontend/src/lib/app-store.ts`
  - Add state & actions for subscriptions, coupons, referrals, and quota checks.
  - Sync with Appwrite / API endpoints with resilient local persistence.
- `writerdost-frontend/src/app/api/coupons/validate/route.ts` & `src/app/api/coupons/route.ts`
  - API endpoints for coupon validation and admin coupon CRUD.
- `writerdost-frontend/src/app/api/referrals/route.ts`
  - API endpoint to record referral clicks, attribute users, and fetch user referral metrics.
- `writerdost-frontend/src/app/api/subscriptions/route.ts`
  - API endpoint for checkout, subscription creation, and status management.
- `writerdost-frontend/src/components/layout/Sidebar.tsx` & `Header.tsx`
  - Add "Plans & Pricing" navigation link with badge and icon.
- `writerdost-frontend/src/app/pricing/page.tsx`
  - Dedicated Pricing & Subscription hub:
    - Plan comparison matrix (Monthly / Yearly toggle).
    - Current plan indicator and monthly quota meters.
    - Interactive Checkout Modal (Coupon input, Referral code input, Price recalculation, Pluggable payment trigger).
    - "Refer & Earn" section with unique link, copy button, and referral stats.
- `writerdost-frontend/src/app/admin/page.tsx`
  - Add Admin Tabs for:
    - **Coupons Management**: Create new coupon, list active/inactive, delete, view usage count.
    - **Referrals & Subscriptions**: View all active subscriptions, transactions, and referral redemptions.
    - **Plans & Quotas**: View and adjust plan limits and pricing.
- `writerdost-frontend/tests/unit/subscription-service.test.ts`
  - Unit tests for plan quotas, coupon validation, discounts, and referral mechanics.

---

## Task Decomposition

### Task 1: Domain Types, Plan Definitions & Quotas
- [ ] Update `UserPlan` and define `PLAN_DEFINITIONS` in `src/lib/store-types.ts` including Free plan (2 projects, 2 blogs/month), Basic, Pro, and Enterprise.
- [ ] Add TypeScript types for `Coupon`, `ReferralRecord`, `SubscriptionOrder`, and `PlanLimits`.
- [ ] Create `tests/unit/subscription-service.test.ts` to verify coupon calculation (percentage, flat), monthly quota enforcement, and referral logic.
- [ ] Implement `src/lib/subscription-service.ts` to pass unit tests.

### Task 2: Backend APIs for Coupons, Referrals & Subscriptions
- [ ] Implement `/api/coupons/route.ts` (GET for admin/list, POST for admin/create, DELETE/PATCH for status).
- [ ] Implement `/api/coupons/validate/route.ts` (POST to check code validity, minimum plan, expiration, and calculate discounted price).
- [ ] Implement `/api/referrals/route.ts` (GET user referral code and referral stats; POST to record referral attribution).
- [ ] Implement `/api/subscriptions/route.ts` (POST to handle checkout completion, apply coupons/referrals, activate plan).

### Task 3: App Store Integration & Monthly Quota Guards
- [ ] Extend `useAppStore` in `src/lib/app-store.ts` with subscription state, coupons list, referral stats, and `checkQuota(type: 'project' | 'blog')`.
- [ ] Update project creation and blog generator entry points to respect Free plan & monthly quotas with a clear upgrade banner or redirect.
- [ ] Verify test suite runs cleanly.

### Task 4: Pricing Dashboard Page (`/pricing`) & Checkout Modal
- [ ] Build `/pricing` page with plan cards (Free, Basic, Pro, Enterprise), monthly/annual billing switch, and feature checklist.
- [ ] Display current user plan, usage bars (e.g. 1/2 projects used this month), and next renewal date.
- [ ] Build interactive Checkout Modal:
  - Plan selection summary.
  - Coupon code input with live discount calculation.
  - Referral code input (auto-filled if URL contains `?ref=...`).
  - Checkout button with decoupled payment handler (ready for PayPal integration).
  - Success state with immediate plan and quota upgrade.
- [ ] Build "Refer & Earn" section with unique shareable referral link, one-click copy, and stats cards.
- [ ] Add "Plans & Pricing" to `Sidebar.tsx` navigation with an icon (`loyalty` or `sell`).

### Task 5: Admin Control Panel Enhancements (`/admin`)
- [ ] Add tab navigation in `/admin` for **Users & Requests**, **Coupons**, **Referrals & Subscriptions**, and **Plan Limits**.
- [ ] Implement Coupons Manager:
  - Table of coupons with code, discount, validity, uses, and status.
  - "Create Coupon" modal (code, percentage/fixed, expiry, usage limit).
  - Toggle active/inactive and delete actions.
- [ ] Implement Subscriptions & Referrals Inspector:
  - List of all user subscriptions, tier, date, coupon used, and status.
  - List of referral conversions and rewards.
  - Admin action to manually grant or override user plan and quota.

### Task 6: End-to-End Verification & Documentation
- [ ] Run unit tests (`npm test`).
- [ ] Run build test (`npm run build` or typecheck `npx tsc --noEmit`).
- [ ] Verify manual flows: Free plan quotas, applying coupons at checkout, referral code generation and attribution, and admin management.
