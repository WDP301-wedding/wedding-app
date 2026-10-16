# Hỷ Yến Mobile App V2 Implementation Documentation (2026-10-16)

## 1. Provenance & Scope

- **Design System Archive Source:** `Hỷ Yến Design System.zip` (User provided: `C:/Users/Admin/Downloads/Hỷ Yến Design System.zip`).
- **Archive SHA-256:** `e8205ec46448366f7dcfd7f894a5804d36a6e67dd036bada94ff9493ec598406`.
- **Extracted Location:** `C:/Users/Admin/AppData/Local/Temp/hy-yen-v2-20261016/Hỷ Yến Design System/`.
- **File Count:** 72 files (tracked with individual SHA-256 hashes in `docs/design/hy-yen-reference-manifest.json`).
- **Target Repository:** `wedding-app` (strictly mobile, React Native / Expo + TypeScript).
- **Other Repositories Untouched:** `wedding-be`, `wedding-web`, and `wedding-manage-web` were not modified.

### Filtered Scope & Ambiguity Resolutions

1. **Prototype File Absence:** The ZIP archive contains HTML prototypes for Web Guest (`01_Toan_Web-Khach-Hang`) and Web Manager (`02_Lan_Web-Quan-Ly`), but does **not** contain an HTML prototype file for mobile (e.g., `Hỷ Yến App Android v2.dc.html`). Mobile V2 is specified via prompt documents (`03_Huy_App/PROMPT_1_ClaudeDesign_App-v2.md` and `PROMPT_2_ClaudeCode_App-v2.md`) and the central design system tokens (`00_Chung_Design-System`). The implementation faithfully adheres to these specifications without fabricating claims of pixel-matching an uncreated prototype file.
2. **API Specification Pin:** Kept strictly pinned to commit `d257be8507dd83e9da73ac69605646a8fbcc7209` (SHA-256 `6a8be82541ca2d8ce274f9817d10bcd300c91de2f5e734055cf9108b23db0915`). No schema files were regenerated, downgraded, or altered.
3. **Web Handoff Environment Variable:** Hand-offs strictly utilize `readPublicEnv().EXPO_PUBLIC_WEB_PORTAL_URL`. Auth tokens are never leaked or attached in query strings.

---

## 2. Design System Tokens & Typography

- **Colors:**
  - Vang (Primary): `#7A1F3D`
  - Vang đậm: `#5C1430`
  - Hồng nhạt (Tint): `#F5E4E9`
  - Kem (Surface): `#FFF8F1`
  - Champagne (Accent): `#C9A46A`
  - Đào: `#F4B9A7`
  - Chữ chính: `#2B1D22`
  - Chữ phụ: `#6E5D63`
  - Viền nhạt: `#EADFD6`
  - Viền đậm: `#9A877F`
  - Trạng thái: Success `#2F6B4F`, Warning `#8A5300`, Error `#C62828`, Info `#3F5B6B`.
- **Border Radius:** `sm: 12`, `md: 12`, `lg: 16`, `xl: 24`, `full: 999`.
- **Vietnamese Typography:**
  - Strictly Be Vietnam Pro (`HyBody`, `HyBody500`, `HyBody600`, `HyBody700`) across all titles, headlines, body, subhead, labels, and captions.
  - No CSS uppercase transforms or decorative tracking on Vietnamese strings.
  - Serif font (`HyDisplay` / Playfair) is strictly restricted to the static Latin monogram "HY".
- **Motion & Accessibility:**
  - Standard timings: Fast 150ms, Standard 250ms, Emphasized 300ms, Exit 400ms.
  - Respects `useReducedMotion()` across pulse skeletons and enter transitions.
  - Touch targets maintain a minimum of 44–48px.

---

## 3. Web Handoff Boundaries (`EXPO_PUBLIC_WEB_PORTAL_URL`)

Complex desktop workflows that are not suited for native mobile interaction gracefully hand off to the Web portal using `openBrowserAsync(portalUrl)`:

1. **Pre-deposit Booking Flow:** When a booking is in `DRAFT` or `AWAITING_DEPOSIT` phase, the mobile app presents a clear guidance card with the "Hoàn tất đặt cọc trên Web" button directing the couple to complete contract review and initial deposit.
2. **Interactive Seating Arrangement:** Interactive floorplan drag-and-drop table arrangements are handled on the Web. The mobile app displays confirmed layout options, assigned guest groups, and a "Sắp xếp trên Web" action card.

---

## 4. Complete 68 API Implementation Mapping Table

| ID         | Method | Path                                                                   | Gateway / Module        | UI V2 Trigger / Screen           | Preconditions & Blockers         |
| :--------- | :----- | :--------------------------------------------------------------------- | :---------------------- | :------------------------------- | :------------------------------- |
| **A68-01** | GET    | `/bookings/{bookingId}/proposal`                                       | `restored-flows-api.ts` | Tab 1 (Tổng quan) & Timeline     | Valid session & bookingId        |
| **A68-02** | POST   | `/bookings/{bookingId}/cancellation-requests`                          | `restored-flows-api.ts` | Subflow: Cancellation modal      | Booking not already cancelled    |
| **A68-03** | POST   | `/bookings/{bookingId}/change-requests`                                | `restored-flows-api.ts` | Subflow: Request changes         | Pending timeline/proposal        |
| **A68-04** | POST   | `/bookings/{bookingId}/timeline-revisions`                             | `restored-flows-api.ts` | Subflow: Schedule / Timeline     | Requires timeline editing right  |
| **A68-05** | POST   | `/bookings/{bookingId}/timeline-revisions/{revisionId}/approvals`      | `restored-flows-api.ts` | Subflow: Timeline approve        | Pending timeline revision        |
| **A68-06** | POST   | `/bookings/{bookingId}/timeline-revisions/{revisionId}/withdrawals`    | `restored-flows-api.ts` | Subflow: Timeline withdraw       | Active timeline revision         |
| **A68-07** | GET    | `/bookings/{bookingId}/contract-appendices`                            | `restored-flows-api.ts` | Tab 3 (Thanh toán) & Docs sheet  | Valid session                    |
| **A68-08** | GET    | `/bookings/{bookingId}/contracts`                                      | `restored-flows-api.ts` | Tab 1 (Tổng quan), Tab 3 Docs    | Valid session                    |
| **A68-09** | GET    | `/bookings/{bookingId}/contracts/{revisionId}/pdf`                     | `billing-api.ts`        | Tab 3 (Thanh toán) Docs          | Approved contract revision       |
| **A68-10** | GET    | `/consultations/{consultationId}/couple-profile`                       | `restored-flows-api.ts` | Account / Profile screen         | Valid consultationId             |
| **A68-11** | PATCH  | `/consultations/{consultationId}/couple-profile`                       | `restored-flows-api.ts` | Account / Profile update         | Valid consultationId & revision  |
| **A68-12** | POST   | `/bookings/{bookingId}/contract-appendices`                            | `restored-flows-api.ts` | Subflow: Contract appendix       | Valid session & revision         |
| **A68-13** | POST   | `/bookings/{bookingId}/contract-appendices/{revisionId}/approvals`     | `restored-flows-api.ts` | Subflow: Appendix approve        | Submitted appendix revision      |
| **A68-14** | POST   | `/bookings/{bookingId}/contract-appendices/{revisionId}/submissions`   | `restored-flows-api.ts` | Subflow: Appendix submit         | Draft appendix revision          |
| **A68-15** | POST   | `/bookings/{bookingId}/contracts`                                      | `restored-flows-api.ts` | Subflow: Contracts               | Proposal confirmed               |
| **A68-16** | POST   | `/bookings/{bookingId}/contracts/{revisionId}/approvals`               | `restored-flows-api.ts` | Subflow: Contract approve        | Submitted contract revision      |
| **A68-17** | POST   | `/bookings/{bookingId}/contracts/{revisionId}/submissions`             | `restored-flows-api.ts` | Subflow: Contract submit         | Draft contract revision          |
| **A68-18** | POST   | `/bookings/{bookingId}/contracts/{revisionId}/withdrawals`             | `restored-flows-api.ts` | Subflow: Contract withdraw       | Submitted contract revision      |
| **A68-19** | GET    | `/health/live`                                                         | Health service          | App startup / liveness probe     | None                             |
| **A68-20** | GET    | `/health/ready`                                                        | Health service          | App startup / readiness probe    | None                             |
| **A68-21** | DELETE | `/auth/sessions/current`                                               | `session.ts`            | Header Avatar → Profile Logout   | Active session                   |
| **A68-22** | DELETE | `/auth/sessions/{sessionId}`                                           | `identity-api.ts`       | Sessions subflow revoke          | Valid sessionId                  |
| **A68-23** | GET    | `/auth/me`                                                             | `identity-api.ts`       | App initialization               | Valid access token               |
| **A68-24** | GET    | `/auth/sessions`                                                       | `identity-api.ts`       | Sessions subflow list            | Valid access token               |
| **A68-25** | POST   | `/auth/android-session-refreshes`                                      | `session.ts`            | Automatic token refresh          | Valid refresh token              |
| **A68-26** | POST   | `/auth/android-sessions`                                               | `session.ts`            | Login screen                     | Valid phone/password credentials |
| **A68-27** | GET    | `/bookings/{bookingId}/print-orders`                                   | `app-invitation-api.ts` | Tab 2 (Chuẩn bị → Đơn in)        | Valid session                    |
| **A68-28** | GET    | `/bookings/{bookingId}/print-orders/{orderId}`                         | `app-invitation-api.ts` | Tab 2 (Đơn in details)           | Valid orderId                    |
| **A68-29** | POST   | `/bookings/{bookingId}/print-orders`                                   | `app-invitation-api.ts` | Tab 2 (Đơn in order create)      | Valid design & headcount         |
| **A68-30** | POST   | `/bookings/{bookingId}/print-orders/{orderId}/approval`                | `app-invitation-api.ts` | Tab 2 (Đơn in approve)           | Order in pending state           |
| **A68-31** | POST   | `/bookings/{bookingId}/print-orders/{orderId}/cancellation`            | `app-invitation-api.ts` | Tab 2 (Đơn in cancel)            | Cancellable order state          |
| **A68-32** | POST   | `/bookings/{bookingId}/print-orders/{orderId}/cancellation-intents`    | `app-invitation-api.ts` | Tab 2 (Đơn in cancel intent)     | Order in review state            |
| **A68-33** | POST   | `/bookings/{bookingId}/print-orders/{orderId}/replacement-approvals`   | `app-invitation-api.ts` | Tab 2 (Đơn in replacement)       | Replacement order proposal       |
| **A68-34** | GET    | `/bookings/{bookingId}/invitations`                                    | `app-invitation-api.ts` | Tab 2 (Chuẩn bị → Thiệp)         | Valid session                    |
| **A68-35** | GET    | `/bookings/{bookingId}/invitations/{designId}`                         | `app-invitation-api.ts` | Tab 2 (Thiệp preview)            | Valid designId                   |
| **A68-36** | GET    | `/bookings/{bookingId}/printable-revisions/{printableRevisionId}/file` | `app-invitation-api.ts` | Tab 2 (Đơn in PDF download)      | Valid printable revision         |
| **A68-37** | GET    | `/invitation-templates`                                                | `app-invitation-api.ts` | Tab 2 (Thiệp template picker)    | Public / Authorized              |
| **A68-38** | DELETE | `/notifications/android-installations/{id}`                            | `notifications-api.ts`  | Tab 4 (Thiết bị) Delete token    | Valid installation ID            |
| **A68-39** | GET    | `/notifications/android-installations`                                 | `notifications-api.ts`  | Tab 4 (Thiết bị) List tokens     | Valid session                    |
| **A68-40** | GET    | `/notifications/inbox`                                                 | `notifications-api.ts`  | Tab 4 (Thông báo) Inbox          | Valid session                    |
| **A68-41** | GET    | `/notifications/preferences`                                           | `notifications-api.ts`  | Tab 4 (Cài đặt thông báo)        | Valid session                    |
| **A68-42** | GET    | `/notifications/unread-count`                                          | `notifications-api.ts`  | Header Bell & Tab 4 Badge        | Valid session                    |
| **A68-43** | PATCH  | `/notifications/preferences`                                           | `notifications-api.ts`  | Tab 4 Preferences toggle         | Valid preferences payload        |
| **A68-44** | POST   | `/notifications/android-installations`                                 | `notifications-api.ts`  | FCM registration on launch       | Valid device token               |
| **A68-45** | POST   | `/notifications/inbox/read-all`                                        | `notifications-api.ts`  | Tab 4 "Đọc tất cả" button        | Has unread notifications         |
| **A68-46** | POST   | `/notifications/inbox/{id}/read`                                       | `notifications-api.ts`  | Tab 4 Item press                 | Specific unread notification     |
| **A68-47** | GET    | `/bookings/{bookingId}/billing`                                        | `billing-api.ts`        | Tab 3 (Thanh toán) Ledger        | Valid session                    |
| **A68-48** | GET    | `/bookings/{bookingId}/final-invoices`                                 | `billing-api.ts`        | Tab 3 (Thanh toán) Invoices      | Valid session                    |
| **A68-49** | GET    | `/bookings/{bookingId}/final-invoices/{invoiceRevisionId}`             | `billing-api.ts`        | Tab 3 Invoice details            | Valid invoiceRevisionId          |
| **A68-50** | GET    | `/bookings/{bookingId}/incidental-expenses`                            | `billing-api.ts`        | Tab 3 Incidentals list           | Valid session                    |
| **A68-51** | GET    | `/bookings/{bookingId}/payments/{attemptId}`                           | `billing-api.ts`        | Tab 3 AppState refocus probe     | Active attemptId                 |
| **A68-52** | POST   | `/bookings/{bookingId}/payments/balance`                               | `billing-api.ts`        | Tab 3 "Thanh toán số dư" CTA     | Outstanding balance > 0          |
| **A68-53** | POST   | `/bookings/{bookingId}/payments/deposit`                               | `billing-api.ts`        | Billing subflow deposit          | Booking in deposit phase         |
| **A68-54** | GET    | `/auth/profile`                                                        | `identity-api.ts`       | Header Avatar → Profile view     | Valid access token               |
| **A68-55** | GET    | `/couple/bookings`                                                     | `identity-api.ts`       | Header Booking Switcher          | Valid access token               |
| **A68-56** | PATCH  | `/auth/profile`                                                        | `identity-api.ts`       | Header Avatar → Profile edit     | Valid profile payload            |
| **A68-57** | POST   | `/auth/password-change-otp-requests`                                   | `identity-api.ts`       | Password change flow: OTP        | Authenticated user               |
| **A68-58** | POST   | `/auth/password-changes`                                               | `identity-api.ts`       | Password change flow: Submit     | OTP verified                     |
| **A68-59** | POST   | `/auth/password-otp-completions`                                       | `identity-api.ts`       | Password recovery: Complete      | Valid recovery OTP               |
| **A68-60** | POST   | `/auth/password-otp-requests`                                          | `identity-api.ts`       | Password recovery: Request       | Phone number                     |
| **A68-61** | GET    | `/bookings/{bookingId}/attendance-summary`                             | `billing-api.ts`        | Tab 2 (Khách) Attendance card    | Check-in enabled                 |
| **A68-62** | GET    | `/bookings/{bookingId}/check-in-settings`                              | `billing-api.ts`        | Tab 2 (Khách) Settings sheet     | Valid session                    |
| **A68-63** | PATCH  | `/bookings/{bookingId}/check-in-settings`                              | `billing-api.ts`        | Tab 2 (Khách) Toggle mode        | Expected revision                |
| **A68-64** | GET    | `/catalog/dishes`                                                      | `restored-flows-api.ts` | Subflow: Catalog Dishes          | Public / Authorized              |
| **A68-65** | GET    | `/catalog/halls`                                                       | `restored-flows-api.ts` | Subflow: Catalog Halls           | Public / Authorized              |
| **A68-66** | GET    | `/catalog/halls/{hallId}`                                              | `restored-flows-api.ts` | Subflow: Catalog Hall detail     | Valid hallId                     |
| **A68-67** | GET    | `/catalog/menu-packages`                                               | `restored-flows-api.ts` | Subflow: Catalog Packages        | Public / Authorized              |
| **A68-68** | GET    | `/catalog/restaurant`                                                  | `restored-flows-api.ts` | Subflow: Catalog Restaurant info | Public / Authorized              |
