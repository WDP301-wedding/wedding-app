# Mobile Vietnamese copy review — 2026-11-13

The owner approved improving customer-facing wording after reviewing proposed changes and retaining terminology shared with the web products.

## Scope

Updated guidance, feedback and accessible control labels in login/password recovery, account settings and the active Couple workspace. Examples include explaining OTP as a verification code, removing internal worker/server wording, clarifying timeline and preparation guidance and reporting a submitted selection as sent to the restaurant. At the owner's follow-up request, timeline wording retains mốc instead of hoạt động, including field labels and add/remove actions. Payment creation remains distinct from confirmed receipt; the VNPay test-environment disclosure remains visible. Password recovery retains its generic, conditional response.

Retained Quyết toán, Tên gợi nhớ, Quy mô & nhóm, Đã hoàn tất, Công nợ, Chi tiết công nợ and existing price-change wording. Also retained Thỏa thuận/Thoả thuận, Kịch bản, duyệt/phê duyệt/rút phê duyệt, Phụ lục hợp đồng, Tổng nghĩa vụ/Nghĩa vụ thanh toán, Đã tất toán and Xuất bản thiệp. The changed preparation label Thiệp cưới is reflected in the print-appendix guidance.

Changes are presentation text only. Existing test queries and expected messages were updated without removing assertions, changing fixtures, skipping tests or relaxing business checks. API calls, payloads, authorization, revisions, idempotency, financial calculations, approval conditions and stored document terms were not changed by this follow-up.

## Verification

- All 211 tests passed across 33 suites.
- Strict TypeScript, ESLint, Prettier and the whitespace check passed.
- Android JavaScript/Hermes export passed.
- Browser inspection used the existing development server in an isolated browser context. No real credentials, OTP request, payment or other business mutation was submitted.

Automatic policy review rejected starting a separate preview with a synthetic API, returning only `blocked by policy`. Browser verification therefore covers the anonymous login/recovery screens, not the authenticated workspace. Provider journeys and native device appearance are not certified by these copy changes. Screenshot file writes were declined by the browser tool; inspected screenshots were returned inline.

No commit, push or deployment was performed.

## Payment QR wording follow-up

The confirmation now describes creating a QR code, rather than implying that pressing the button executes payment. Deposit copy starts with “Khoản đặt cọc là …” and asks whether to create a QR for that amount; the title is “Tạo mã QR đặt cọc” and the action is “Tạo mã QR”. The test-environment line was removed from this confirmation at the owner's follow-up request; provider configuration is unchanged. After creation, the message guides the user to scan and then check status; it does not claim a successful deposit.

Removed the “Mở trang VNPay” browser button at the owner's request. QR display/saving, expiration checks, trusted checkout URL validation, manual status checks, polling, amounts, approval gates and idempotent request payloads are preserved.

All 147 tests passed across 32 suites after the earlier legacy cleanup. The added deposit regression verifies the confirmation, unchanged contract evidence, QR/status controls, no direct VNPay button and no paid-status claim at QR creation. TypeScript, ESLint and formatting passed. No new checkout or payment was triggered against the live service for this verification. Native payment-dialog appearance was not exercised by creating another live checkout.
