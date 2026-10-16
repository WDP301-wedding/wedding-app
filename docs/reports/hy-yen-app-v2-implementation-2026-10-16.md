# Hỷ Yến Mobile App V2 Redesign & Implementation Report

**Date:** 2026-10-16  
**Project:** Hỷ Yến Wedding Mobile App (`wedding-app`)  
**Design Reference Archive:** `Hỷ Yến Design System.zip` (SHA-256: `e8205ec46448366f7dcfd7f894a5804d36a6e67dd036bada94ff9493ec598406`, 72 files)  
**API Specification Pin:** Commit `d257be8507dd83e9da73ac69605646a8fbcc7209` (SHA-256: `6a8be82541ca2d8ce274f9817d10bcd300c91de2f5e734055cf9108b23db0915`)  
**Quality Gates Status:**

- `npm run typecheck` (`tsc --noEmit`): **PASSED** (0 errors)
- `npm run lint` (`eslint . --max-warnings 0`): **PASSED** (0 errors, 0 warnings)
- `npm run format:check` (`prettier --check .`): **PASSED** (all files match Prettier code style)

---

## 1. Summary of Completed Work

### A. Central Design System & Theme (`src/theme/index.ts`)

- Configured official palette: Vang `#7A1F3D`, Vang đậm `#5C1430`, Hồng nhạt `#F5E4E9`, Kem `#FFF8F1`, Champagne `#C9A46A`, Đào `#F4B9A7`, Chữ `#2B1D22` & `#6E5D63`, Viền `#EADFD6` & `#9A877F`, Status Success `#2F6B4F`, Warning `#8A5300`, Error `#C62828`, Info `#3F5B6B`.
- Configured border radii: `sm: 12`, `md: 12`, `lg: 16`, `xl: 24`, `full: 999`.
- Typography: Strictly Be Vietnam Pro sans-serif for all Vietnamese headings, labels, buttons, and copy (`HyBody`, `HyBody500`, `HyBody600`, `HyBody700`). Playfair (`HyDisplay`) is restricted exclusively to the Latin monogram "HY".
- Micro-motion tokens: Fast 150ms, Standard 250ms, Emphasized 300ms, Exit 400ms, Stagger 50ms, M3 easing `[0.2, 0, 0, 1]`.

### B. Reusable Hỷ Yến Component Kit (`src/components/hy-ui.tsx`)

- `HyBadge`: Supports states `done` (`✓ Xong`), `waiting` (`Chờ bạn`), `locked` (`🔒 Mở sau đặt cọc`), `info`, and `neutral`.
- `HySegmentedControl`: Accessible segmented switcher with badge counts and minimum 44–48px touch targets.
- `HySkeleton`: Pulse animation respecting `useReducedMotion()`.
- `OfflineBanner`: Amber banner displaying "Đang hiển thị dữ liệu đã lưu".
- `HyState`: Enhanced with `errorCode` and `requestId` props displaying `Mã lỗi: {errorCode} · Ref: {requestId}`.

### C. 4-Tab Navigation & Shell (`src/screens/v0/v0-companion-shell.tsx`)

- Modernized bottom navigation to 4 main tabs:
  1. `Tổng quan` (Tiệc)
  2. `Chuẩn bị` (Khách, Sơ đồ, Thiệp, Đơn in)
  3. `Thanh toán` (Ví tiệc, Quyết toán, VNPay, Chứng từ)
  4. `Thông báo` (Hộp thư, Cài đặt, Thiết bị)
- Header booking switcher modal for accounts with $\ge 2$ bookings, clearing cached state on switch.
- Header avatar with Latin "HY" monogram opening Profile (`account`).
- Live unread notification badge on both header Bell and bottom navigation.
- Preserved Android hardware back button handler and all existing subflows (`schedule`, `media`, `catalog`, `sessions`, `billing`, etc.).

### D. Tab 1: Tổng quan (`src/screens/hy/hy-party.tsx`)

- Hero countdown card with real days countdown, hall name, shift, headcount, CANCELLED banner, and pre-deposit card with Web portal handoff button.
- 6-step vertical timeline (`Tư vấn → Thoả thuận → Đặt cọc → Chuẩn bị → Ngày cưới → Quyết toán`) strictly derived from API status/revision with `HyBadge` chips (`✓ Xong`, `Chờ bạn`, `🔒 Mở sau đặt cọc`, `🔒 Chưa mở`).
- Top 3 dynamic actionable cards ("Việc cần làm ngay").
- Financial summary ("Ví tiệc") with paid VND, total VND, remaining VND, progress bar, and "Ví tiệc" CTA.
- Manager contact hotline card rendered only when a valid phone number is returned by the API.

### E. Tab 2: Chuẩn bị (`src/screens/v2/v2-prepare-tab.tsx` & `src/screens/hy/hy-guests.tsx`)

- Segmented control switching between 4 areas:
  - `Khách`: Quick headcount edit bottom sheet saving to `PATCH /bookings/{bookingId}/guest-plan` with `expectedRevision`; check-in status explicitly formatted ("Chưa ghi nhận" for `NONE`); group filter chips; guest details sheet with phone dialer and invitation share.
  - `Sơ đồ`: Reads confirmed seating layout options and assigned groups; prominent Web handoff card "Sắp xếp trên Web" opening `EXPO_PUBLIC_WEB_PORTAL_URL`.
  - `Thiệp`: Integrated `V0InviteTab` with card preview, quick text edit sheet, and native share.
  - `Đơn in`: Integrated `V0PrintSubflow` with print order listing, status bar, and PDF download.

### F. Tab 3: Thanh toán (`src/screens/v2/v2-payments-tab.tsx`)

- Ví tiệc progress ring (paid/total/remaining integer VND).
- Single primary CTA based on state: "Thanh toán số dư (VND)", "Đã thanh toán đủ", or "Hoàn tất đặt cọc trên Web".
- Pre-VNPay confirmation bottom sheet.
- VNPay browser launch via `openBrowserAsync`.
- `AppState` foreground refocus listener re-querying `loadAttempt` and `billing.load` upon app resume.
- 4-state result banner (`Đang xác nhận`, `Thành công`, `Thất bại`, `Chưa rõ`).
- Documents list (`contracts`, `appendices`, `invoices`, `incidentals`, `print`) and transaction history.

### G. Gateway Extensions (`src/features/payments-billing/billing-api.ts`)

- Added `loadGuestPlan` (`GET /bookings/{bookingId}/guest-plan`).
- Added `updateGuestPlan` (`PATCH /bookings/{bookingId}/guest-plan` with `expectedRevision` and `Idempotency-Key`).
- Added `loadSeatingLayoutOptions` (`GET /bookings/{bookingId}/seating-layout-options`).
- Added `loadSeatingPlan` (`GET /bookings/{bookingId}/seating-plans/{planId}`).

---

## 2. API Coverage & Data Integrity

- All 68 endpoints in `wedding-api-spec.json` remain accounted for and wired to their respective domain gateways and UI triggers (documented in full in `docs/design/hy-yen-app-v2-implementation.md`).
- Strict VND integer calculations and server-calculated totals.
- No client-side calculation or passing of balance amounts.
- Web handoff URLs strictly adhere to `EXPO_PUBLIC_WEB_PORTAL_URL` with zero token leakage in query strings.

---

## 3. Comprehensive Manual Testing Guide

### Test Suite 1: Booking Access & Switcher (FULL vs RESTRICTED)

1. **Single Booking Account:**
   - Log in with credentials belonging to a user with 1 booking.
   - Verify header shows the booking title and shift.
   - Verify header does not render a dropdown chevron or switcher modal.
2. **Multi-Booking Account ($\ge 2$ bookings):**
   - Log in with credentials belonging to a user with $\ge 2$ bookings.
   - Verify header shows a "Đổi tiệc" button / chevron.
   - Tap "Đổi tiệc" or hero header: bottom sheet opens listing all bookings with hall, shift, and status badge.
   - Select another booking: app clears cache, refreshes tabs, and loads the newly selected booking without stale state.
3. **RESTRICTED / Pre-Deposit Booking:**
   - Select a booking in `DRAFT` or `AWAITING_DEPOSIT` phase.
   - Verify the app does not hard-lock or crash.
   - Verify Tab 1 displays the Pre-deposit guidance card: "Hồ sơ tiệc đang chờ đặt cọc" with "Hoàn tất đặt cọc trên Web" button.
   - Tap button: verifies browser opens `EXPO_PUBLIC_WEB_PORTAL_URL` without token params.
   - Verify Tab 3 displays "Hoàn tất đặt cọc trên Web" CTA.

### Test Suite 2: Tab 1 — Tổng quan

1. **Hero Countdown:**
   - Verify remaining days countdown displays integer days till event date.
   - For CANCELLED bookings: verify red banner "Tiệc cưới đã huỷ" displays.
2. **6-Step Timeline:**
   - Verify steps: `Tư vấn`, `Thoả thuận`, `Đặt cọc`, `Chuẩn bị`, `Ngày cưới`, `Quyết toán`.
   - Verify state badges: `✓ Xong` (green), `Chờ bạn` (amber), `🔒 Mở sau đặt cọc` / `🔒 Chưa mở` (gray).
   - Tapping an unlocked step navigates to the respective subflow (e.g. `catalog`, `prepare`, `schedule`, `payments`).
3. **Actionable Cards:**
   - Verify top 3 dynamic cards populate based on urgent tasks (contract approval, print order review, balance payment).
4. **Manager Contact Hotline:**
   - Verify card only displays if `restaurant.hotline` is non-empty. If API returns null, no empty card or placeholder number is rendered.

### Test Suite 3: Tab 2 — Chuẩn bị

1. **Segmented Switcher:**
   - Verify 4 tabs: `Khách`, `Sơ đồ`, `Thiệp`, `Đơn in`. Minimum 44px touch targets.
2. **Segment `Khách`:**
   - Verify planned headcount displays independently from named guest count.
   - Tap "Sửa số khách": bottom sheet opens. Enter new count and save. Verify `PATCH /bookings/{bookingId}/guest-plan` sends `expectedRevision` and updates state.
   - Verify check-in mode `NONE` is rendered as "Chưa ghi nhận" (never "0 khách tham dự").
   - Filter guests by group chips. Tap a guest to view details sheet, call phone number, or share invite.
3. **Segment `Sơ đồ`:**
   - Verify assigned groups and layout options load from API.
   - Verify card "Sắp xếp trên Web" opens web portal for interactive floorplan arrangement.
4. **Segment `Thiệp`:**
   - Preview card layout, tap "Chỉnh sửa nội dung" to test quick edit bottom sheet.
   - Test "Chia sẻ thiệp" triggers native share sheet.
5. **Segment `Đơn in`:**
   - Verify print orders list, status badges, and PDF download link.

### Test Suite 4: Tab 3 — Thanh toán & VNPay

1. **Ví tiệc Financial Progress:**
   - Verify paid VND, total VND, and remaining VND are integers formatted in `vi-VN` currency.
   - Progress bar accurately represents `netPaidVnd / acceptedChargesVnd`.
2. **VNPay Checkout Flow:**
   - Tap "Thanh toán số dư": pre-payment confirmation sheet appears showing the exact outstanding amount.
   - Tap "Xác nhận chuyển đến VNPay": `billing.startBalance` creates attempt and launches `openBrowserAsync`.
   - Minimize browser and return to app: verify `AppState` foreground listener detects resume and triggers `loadAttempt` and `billing.load`.
   - Verify attempt result banner displays the correct state:
     - `SUCCEEDED`: Green banner ("Thanh toán thành công").
     - `PENDING` / `CREATED`: Amber banner ("Đang xác nhận kết quả thanh toán").
     - `FAILED`: Red banner ("Thanh toán không thành công").
     - `UNKNOWN`: Muted gray banner ("Chưa rõ trạng thái giao dịch").
3. **Documents List:**
   - Tap each document row (`contracts`, `appendices`, `invoices`, `incidentals`, `print`): verify sheet lists items with status, revision, and download links.

### Test Suite 5: Tab 4 — Thông báo & Tài khoản

1. **Inbox & Badges:**
   - Verify unread count badge matches API on both header Bell icon and Tab 4 bottom icon.
   - Tap notification item: triggers `POST /notifications/inbox/{id}/read` and updates badge immediately.
   - Tap "Đọc tất cả": triggers `POST /notifications/inbox/read-all` and clears unread badges.
   - Verify no fake "undo" button is rendered.
2. **Notification Preferences:**
   - Toggle notification channels: triggers `PATCH /notifications/preferences`.
3. **Account / Profile:**
   - Tap header avatar ("HY" monogram): opens Account screen.
   - Verify couple names, email, and phone display.
   - Test password change and logout flows.
