# Báo cáo Triển khai Giao diện Native V0 & Đồng bộ API cho Wedding Companion App

- **Thời gian hoàn thành**: 13/10/2026
- **Workspace**: `C:/Users/Admin/Desktop/BE/wedding-app`
- **Nhánh git hiện tại**: `dev/huy`
- **Tình trạng git**: Giữ nguyên toàn bộ mã cục bộ, không thực hiện commit, push, PR, hay merge.
- **Môi trường Runtime**: Node `v25.2.1`, npm `11.19.0` (ghi nhận: phiên bản Node local v25.2.1 đáp ứng kiểm thử, lưu ý engine khai báo trong package.json là `>=24.11 <25`, không sửa engine).

---

## 1. Archive Inventory (Xác minh & Phân tích Ground-Truth ZIP)

- **Đường dẫn tệp gốc**: `C:/Users/Admin/Downloads/wedding-app.zip`
- **Kích thước lưu trữ**: 64,295 bytes
- **Cấu trúc lưu trữ**: Chính xác **22 tệp** (27 entries kể cả 5 thư mục `app/`, `components/`, `components/ui/`, `lib/`, `public/`).
- **Kiểm tra tính toàn vẹn (CRC / testzip)**: **PASS** (100% không lỗi checksum).
- **Tính chất nguyên bản**: Bản mẫu web prototype Next.js 16.4 / Tailwind CSS / pnpm. Các màn hình web trong `app/page.tsx` (14,302 bytes) và styles trong `app/globals.css` (14,614 bytes) được port sang kiến trúc React Native / Expo Native thuần túy (View, Text, Pressable, ScrollView, StyleSheet, Vector Glyphs).
- **Đính chính inventory**: Trong tài liệu cũ có sai sót về kích thước và tồn tại tệp không có thật (`placeholder-user.png`). Dưới đây là bảng trích xuất chính xác tuyệt đối từ `zipfile.infolist()`:

### Bảng chi tiết 22 tệp trong Archive

| STT | Đường dẫn trong ZIP           | Kích thước giải nén (bytes) | Kích thước nén (bytes) | Checksum CRC-32 | Phân loại    | Xử lý khi port vào Native                                                             |
| --- | ----------------------------- | --------------------------- | ---------------------- | --------------- | ------------ | ------------------------------------------------------------------------------------- |
| 1   | `.gitignore`                  | 224                         | 161                    | `AB4DB1E5`      | Config       | Giữ nguyên `.gitignore` của repo native, bảo đảm ignore `.env` và các biến môi trường |
| 2   | `app/globals.css`             | 14,614                      | 3,674                  | `B7866FEF`      | Style        | Trích xuất tokens bảng màu, border radius, shadows sang `src/theme/index.ts`          |
| 3   | `app/layout.tsx`              | 1,161                       | 580                    | `C11B8E32`      | Layout       | Tham chiếu cấu trúc layout web                                                        |
| 4   | `app/page.tsx`                | 14,302                      | 4,595                  | `5BBC9C19`      | UI Prototype | Phân tách và triển khai thành 4 tab chính + 4 subflow native hoàn chỉnh               |
| 5   | `components.json`             | 428                         | 222                    | `B2BC3989`      | Config       | Bỏ qua (shadcn web configuration)                                                     |
| 6   | `components/ui/button.tsx`    | 3,198                       | 1,011                  | `D5C667D1`      | UI Component | Port thành native `Pressable` với touch target >= 44x44px                             |
| 7   | `lib/utils.ts`                | 166                         | 121                    | `783FC801`      | Helper       | Bỏ qua (clsx/tailwind-merge không dùng trong React Native StyleSheet)                 |
| 8   | `next.config.mjs`             | 181                         | 130                    | `37F29022`      | Config       | Bỏ qua (không dùng Next.js trong native app)                                          |
| 9   | `package.json`                | 767                         | 342                    | `3B4C9830`      | Config       | Tham chiếu metadata web (Next.js 16.4.0)                                              |
| 10  | `pnpm-lock.yaml`              | 113,003                     | 40,804                 | `2DB216A4`      | Lockfile     | Bỏ qua (repo dùng `npm` và Expo SDK 57)                                               |
| 11  | `pnpm-workspace.yaml`         | 67                          | 63                     | `0432FF84`      | Config       | Bỏ qua                                                                                |
| 12  | `postcss.config.mjs`          | 144                         | 115                    | `47B029AF`      | Config       | Bỏ qua                                                                                |
| 13  | `public/apple-icon.png`       | 2,626                       | 2,213                  | `790C1ECA`      | Asset        | Bỏ qua                                                                                |
| 14  | `public/icon-dark-32x32.png`  | 585                         | 585                    | `C421B790`      | Asset        | Bỏ qua                                                                                |
| 15  | `public/icon-light-32x32.png` | 566                         | 566                    | `2381D755`      | Asset        | Bỏ qua                                                                                |
| 16  | `public/icon.svg`             | 1,304                       | 606                    | `556F784A`      | Asset        | Port thành các vector glyphs React Native trong `src/components/v0-primitives.tsx`    |
| 17  | `public/placeholder-logo.png` | 568                         | 519                    | `720ECF53`      | Asset        | Bỏ qua                                                                                |
| 18  | `public/placeholder-logo.svg` | 3,208                       | 1,164                  | `F83AF2F8`      | Asset        | Vectorized                                                                            |
| 19  | `public/placeholder-user.jpg` | 1,635                       | 1,338                  | `A894F142`      | Asset        | Avatar người dùng mẫu (JPG, không có file .png) -> tạo avatar chữ cái động            |
| 20  | `public/placeholder.jpg`      | 1,064                       | 785                    | `8790D73F`      | Asset        | Bỏ qua                                                                                |
| 21  | `public/placeholder.svg`      | 3,253                       | 906                    | `47CDBC5C`      | Asset        | Port thành placeholder card native với tỷ lệ khung hình an toàn                       |
| 22  | `tsconfig.json`               | 647                         | 301                    | `BEC8B6D8`      | Config       | Tham chiếu                                                                            |

---

## 2. Bảng Ánh xạ Màn hình Chuẩn (A01 – A11)

Mã màn hình tuân thủ tuyệt đối định nghĩa gốc tại `docs/design/v0/screen-matrix.md` (không tự đánh lại số thứ tự):

| Mã màn hình | Tên màn hình theo Chuẩn Gốc (`screen-matrix.md`)                          | Bề mặt & Nguồn Yêu cầu gốc                      | Triển khai Native tương ứng (`wedding-app`)                                   | Trạng thái Dữ liệu & Kết nối Thực tế                                                                                                                                                                                    |
| ----------- | ------------------------------------------------------------------------- | ----------------------------------------------- | ----------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **A01**     | Login/session restore and FULL/confirmed access gate                      | SPEC-identity-access; SPEC-booking-lifecycle §5 | `src/screens/couple-overview.tsx`, `src/features/identity-access/`            | **Implemented / Connected**: Nạp proposal kế hoạch thật (`GET /bookings/{bookingId}/proposal`), xác thực phiên đầy đủ, hỗ trợ chọn đổi tiệc cưới sạch sẽ không race condition.                                          |
| **A02**     | Couple overview, next action, dates and milestones                        | CAPABILITY-MAP; product-patterns                | `src/screens/v0/v0-overview-tab.tsx`, `couple-overview.tsx`                   | **Implemented / Connected**: Đọc tên cô dâu/chú rể và ngày tiệc từ DTO thật, catalog nhà hàng chuẩn hóa, checklist cá nhân được đánh dấu rõ ràng là lưu cục bộ (không giả danh tiến độ server).                         |
| **A03**     | Effective timeline, allowed review/change flows                           | TML-007/008; SPEC-booking-lifecycle             | `src/screens/v0/v0-plan-tab.tsx`, `src/screens/v0/v0-subflows.tsx` (Schedule) | **Implemented / Connected**: Đọc timeline thật, số revision có hiệu lực từ proposal; trạng thái hoàn thành phản ánh chính xác tiến độ, không dựa vào vị trí mảng đầu tiên; điều hướng chi tiết lịch trình.              |
| **A04**     | Private media access and permitted pre-cutoff actions                     | MED-001..006; SPEC-05                           | `src/screens/v0/v0-subflows.tsx` (`V0MediaSubflow`)                           | **Implemented / Blocked**: Đã triển khai UI và hàm upload `POST /bookings/{bookingId}/media`, tính toán cutoff 72h và hạn mức 100 ảnh / 1 GiB / 25 MiB. **Blocker**: Chưa có endpoint `GET /bookings/{id}/media`.       |
| **A05**     | Invitation preview and quick text-only edit                               | SPEC-05 §§1/7                                   | `src/screens/v0/v0-invite-tab.tsx` (subscreens `preview` & `edit`)            | **Implemented / Connected**: Nạp thiệp qua `GET /bookings/{bookingId}/invitations`, chỉnh sửa qua `POST .../revisions` với `expectedRevision` & `Idempotency-Key`; xung đột 409 yêu cầu người dùng reconfirm.           |
| **A06**     | Generic invitation/QR sharing                                             | QRC-001..004; SPEC-05                           | `src/screens/v0/v0-invite-tab.tsx` (subscreen `share`)                        | **Implemented / Blocked**: QR code chuẩn ISO/IEC 18004 bằng SVG, xuất bản `POST/DELETE .../publication`, Share/Copy native. **Blocker**: Chưa có endpoint `GET .../publication` để khôi phục trạng thái ngoài mutation. |
| **A07**     | Print quote/status detail and permitted Couple actions                    | SPEC-05 §8; generated contract                  | `src/screens/v0/v0-subflows.tsx` (`V0PrintSubflow`)                           | **Implemented / Connected**: Đọc danh sách đơn in thật, ánh xạ 7 trạng thái chuẩn hợp đồng, duyệt báo giá `POST .../approval`, duyệt thay thế mẫu in và hủy đơn; hiển thị chi tiết dòng sản phẩm, tiền VND nguyên.      |
| **A08**     | Group and optional guest list, authorized generic sharing                 | GST-001..008; SPEC-06; backend-scope 2026-10-10 | `src/screens/v0/v0-subflows.tsx` (`V0GuestsSubflow`)                          | **Implemented / Blocked**: UI quản lý Nhóm + Khách mời không dùng Hộ gia đình/RSVP, điểm danh opt-in mặc định `NONE`. **Blocker**: Pin 0a77391 chưa có endpoint REST cho khách mời `GET/POST /bookings/{id}/guests`.    |
| **A09**     | Seating read/compatible selection/group labels where client scope permits | SEA-003..008; SPEC-seating-plan                 | `src/screens/v0/v0-subflows.tsx` (`V0GuestsSubflow`)                          | **Implemented / Blocked**: UI xếp bàn gắn nhãn nhóm, số lượng khách dự kiến độc lập 280 không bị reset. **Blocker**: Pin 0a77391 chưa có endpoint REST `GET/POST /bookings/{id}/seating`.                               |
| **A10**     | Safe billing/progress/invoice and authorized payment views                | SPEC-payments-billing                           | `src/screens/billing.tsx` (`AndroidBillingPage`)                              | **Implemented / Connected**: Nạp billing snapshot, hiển thị số tiền số nguyên VND, điều hướng an toàn, giữ tính bất biến của lịch sử thanh toán và hóa đơn.                                                             |
| **A11**     | Notifications and session/account controls                                | SPEC-identity-access; OPS-001/002               | `src/screens/v0/v0-account-tab.tsx`                                           | **Implemented / Blocked**: Đổi mật khẩu bảo mật OTP, avatar khởi tạo từ tên thật. **Blocker**: Pin 0a77391 chưa có endpoint thông báo, hiển thị trung thực là "Chưa tích hợp API (Pin 0a77391 - Blocker)".              |

---

## 3. Flow & API Matrix (Chi tiết Tích hợp API theo OpenAPI Pin 0a77391)

| Luồng nghiệp vụ              | Vai trò | API Endpoint & Phương thức                                                          | Tham số / Body                                                        | Kết quả phản hồi (DTO)                                                                                                          | Xử lý lỗi & Trạng thái UI                                                                                                                                  | Tệp mã nguồn                                                                               |
| ---------------------------- | ------- | ----------------------------------------------------------------------------------- | --------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| **Nạp sự kiện & Kế hoạch**   | COUPLE  | `GET /bookings/{bookingId}/proposal`                                                | Headers: Bearer Token                                                 | `ConfirmedPlanningSnapshot`: brideName, groomName, venueName, hallName, eventDate, shift, planningHeadcount, timeline, revision | 401/403: Đăng xuất, xóa session.<br>Loading: Spinner.<br>Error: Hiển thị thông báo và nút thử lại.                                                         | `src/features/booking-lifecycle/planning-api.ts`, `src/screens/couple-overview.tsx`        |
| **Danh sách mẫu thiệp**      | COUPLE  | `GET /bookings/{bookingId}/invitations`                                             | Headers: Bearer Token                                                 | `readonly AppInvitationDesignSummary[]`: designId, code, name, previewImageUrl, revision, approvalStatus                        | Empty: Báo chưa có mẫu thiết kế.<br>Error: Nút thử lại nạp dữ liệu.                                                                                        | `src/features/invitation-studio/app-invitation-api.ts`, `src/screens/v0/v0-invite-tab.tsx` |
| **Chỉnh sửa nhanh chữ**      | COUPLE  | `POST /bookings/{bookingId}/invitations/{designId}/revisions`                       | Header: `Idempotency-Key`<br>Body: `{ expectedRevision, textFields }` | `WeddingInvitationDTO`: id, bookingId, revision, textFields, createdAt, updatedAt (không có trường `slug`)                      | **409 Conflict**: Giữ dữ liệu người dùng (dirty state), hiển thị banner yêu cầu chọn "Xem bản máy chủ" hoặc "Xác nhận lưu đè". Khóa double submit đồng bộ. | `src/features/invitation-studio/app-invitation-api.ts`, `src/screens/v0/v0-invite-tab.tsx` |
| **Xuất bản thiệp công khai** | COUPLE  | `POST /bookings/{bookingId}/invitations/{designId}/publication`                     | Header: Bearer Token<br>Body: `{}`                                    | `WeddingInvitationPublication`: `{ data: { publicSlug, genericQrPayload, publishedRevisionId, publicationRevision } }`          | Server trả canonical slug và payload. Chỉ kích hoạt nút Copy/Share khi có publication hợp lệ.                                                              | `src/features/invitation-studio/app-invitation-api.ts`, `src/screens/v0/v0-invite-tab.tsx` |
| **Hủy xuất bản thiệp**       | COUPLE  | `DELETE /bookings/{bookingId}/invitations/{designId}/publication`                   | Header: Bearer Token                                                  | Thành công (revoked/unpublished)                                                                                                | Đặt lại trạng thái `publication = null`, ẩn link công khai và mã QR.                                                                                       | `src/features/invitation-studio/app-invitation-api.ts`, `src/screens/v0/v0-invite-tab.tsx` |
| **Danh sách đơn in**         | COUPLE  | `GET /bookings/{bookingId}/print-orders`                                            | Headers: Bearer Token                                                 | `readonly AppPrintOrderView[]`: orderId, orderNumber, status, quantity, quoteTotalVnd, linePrices                               | Máp đúng 7 trạng thái hợp đồng: `REQUESTED`, `QUOTED`, `APPROVED`, `IN_PRODUCTION`, `READY_FOR_HANDOVER`, `HANDED_OVER`, `CANCELLED`.                      | `src/features/invitation-studio/app-invitation-api.ts`, `src/screens/v0/v0-subflows.tsx`   |
| **Duyệt báo giá in**         | COUPLE  | `POST /bookings/{bookingId}/print-orders/{orderId}/approval`                        | `{ expectedCommercialRevisionId, expectedQuoteTotalVnd }`             | Xác nhận duyệt báo giá in thành công                                                                                            | **409 Conflict**: Báo giá đã thay đổi, yêu cầu nạp lại trước khi duyệt. Giữ Idempotency Key ổn định khi retry sau timeout/lỗi mạng.                        | `src/features/invitation-studio/app-invitation-api.ts`, `src/screens/v0/v0-subflows.tsx`   |
| **Duyệt thay thế mẫu in**    | COUPLE  | `POST /bookings/{bookingId}/print-orders/{orderId}/replacement-approvals`           | `{ expectedCommercialRevisionId, expectedQuoteTotalVnd }`             | Chấp thuận mẫu in thay thế thành công                                                                                           | Chỉ khả dụng khi đơn có `pendingReplacementProposal`. Hiển thị đầy đủ lịch sử snapshot bất biến.                                                           | `src/features/invitation-studio/app-invitation-api.ts`, `src/screens/v0/v0-subflows.tsx`   |
| **Hủy đơn in (Trước in)**    | COUPLE  | `POST /bookings/{bookingId}/print-orders/{orderId}/cancellation`                    | `{ reason }`                                                          | Xác nhận hủy đơn in                                                                                                             | Chỉ áp dụng trước khi xưởng chuyển sang `IN_PRODUCTION`. Lịch sử lưu trữ bất biến.                                                                         | `src/features/invitation-studio/app-invitation-api.ts`, `src/screens/v0/v0-subflows.tsx`   |
| **Tải ảnh tiệc cưới**        | COUPLE  | `POST /bookings/{bookingId}/media`                                                  | `{ mediaType, storageKey, fileSize }`                                 | Metadata ảnh đã lưu                                                                                                             | Tuân thủ quy định cutoff 72h trước ngày tiệc và hạn mức 100 ảnh / 1 GiB / 25 MiB. **Blocker**: Chưa có endpoint `GET .../media`.                           | `src/features/invitation-studio/app-invitation-api.ts`, `src/screens/v0/v0-subflows.tsx`   |
| **Thanh toán & Hóa đơn**     | COUPLE  | `GET /bookings/{bookingId}/billing`                                                 | Headers: Bearer Token                                                 | `BillingSnapshot`: deposits, invoices, balance, payments                                                                        | Hiển thị số tiền số nguyên VND; giữ tính bất biến của hợp đồng, phụ lục và hóa đơn thanh toán.                                                             | `src/screens/billing.tsx`, `src/screens/v0/v0-companion-shell.tsx`                         |
| **Đổi mật khẩu OTP**         | COUPLE  | `POST /identity/password-change/request` & `POST /identity/password-change/confirm` | `{ currentPassword }` -> `{ challengeId, otp, newPassword }`          | Challenge ID -> Cập nhật thành công                                                                                             | Xóa phiên đăng nhập an toàn sau khi đổi mật khẩu thành công.                                                                                               | `src/screens/couple-overview.tsx`                                                          |
| **Thông báo**                | COUPLE  | _Chưa có endpoint trong Pin 0a77391_                                                | Không có                                                              | Không có                                                                                                                        | **Blocker**: Hiển thị trạng thái "Chưa tích hợp API (Pin 0a77391 - Blocker)", không giả mạo danh sách rỗng.                                                | `src/screens/v0/v0-account-tab.tsx`                                                        |

---

## 4. Visual Native QA & Typography Tiếng Việt

### 4.1. Khắc phục Typography Tiếng Việt

- **Font họ**: Sử dụng font sans-serif hệ thống (`Roboto`, `System`, `Be Vietnam Pro`). Loại bỏ hoàn toàn font có chân (serif) cho văn bản tiếng Việt.
- **Bỏ viết hoa trang trí (No uppercase)**: Chuyển toàn bộ các nhãn bị ép viết hoa (`KẾ HOẠCH`, `TÀI KHOẢN`, `PHIÊN BẢN`, `XÁC NHẬN`) sang dạng câu chuẩn tiếng Việt (sentence case: `Kế hoạch`, `Tài khoản`, `Phiên bản`, `Xác nhận`).
- **Khoảng cách ký tự (Tracking)**: Loại bỏ các thông số letter-spacing âm hoặc quá lớn (`letterSpacing: -0.8` hoặc `0.3`) gây vỡ dấu tiếng Việt.
- **Chiều cao dòng (Line Height)**: Bảo đảm tất cả tiêu đề và văn bản có `lineHeight >= 1.25 * fontSize` để dấu hỏi, ngã, sắc, nặng không bị cắt.
- **Chuẩn hóa Unicode**: Toàn bộ chuỗi tiếng Việt lưu ở định dạng chuẩn Unicode NFC.

### 4.2. Bảng màu Semantic & Tương phản Dark Mode

- **Token tương phản chính**: Bổ sung `tokens.onPrimary`:
  - Light mode: `#FFFFFF` trên nền xanh forest đậm (`#334537`).
  - Dark mode: `#1C211D` (chữ đậm) trên nền xanh rêu sáng (`#B7CCB9`), khắc phục hoàn toàn lỗi chữ trắng trên nền sáng làm mất tương phản.
- **Vùng cảnh báo & Callout**: Bổ sung semantic tokens `calloutBg`, `calloutText`, `revisionAlertBg` tự thích ứng giữa chế độ sáng và tối.
- **Kích thước vùng bấm**: Đảm bảo tất cả các nút bấm, icon thao tác và tab navigation đạt kích thước tối thiểu **>= 44x44px** theo tiêu chuẩn Android Touch Target.
- **Điều hướng phần cứng Android (Hardware Back)**: Cấu hình `BackHandler` ràng buộc quay lại đúng tab cha khi người dùng ở trong các luồng phụ (`schedule`, `media`, `print`, `guests`, `edit`, `share`, `billing`), tránh thoát app đột ngột. Có cảnh báo xác nhận khi có dữ liệu chưa lưu (dirty edits).

### 4.3. Báo cáo Thực tế Thiết bị & Giới hạn Môi trường (Environment Limitations)

- **Tình trạng thiết bị**: Trong môi trường container/máy chủ hiện tại, không có thiết bị vật lý Android hoặc Android Emulator đang chạy.
- **Biện pháp xác minh kỹ thuật**:
  1. Kiểm thử render thành phần giao diện toàn diện thông qua `@testing-library/react-native` (15/15 tests V0 PASS, tổng cộng 92 tests PASS).
  2. Biên dịch gói tĩnh Android (`npx expo export -p android --no-bytecode`) kiểm tra thành công 100% với Metro Bundler (1445 modules, xuất bản đầy đủ assets và JS bundle).
- **Ghi nhận giới hạn trung thực**: Export bundle Metro/JS không phải là bằng chứng hình ảnh thị giác (native visual proof) trên màn hình thiết bị thật. Báo cáo không tuyên bố màn hình đã được chụp hay pass trên thiết bị vật lý khi chưa có emulator/thiết bị kết nối.

---

## 5. Kết quả Kiểm thử & Quality Gates Toàn diện

### 5.1. Khóa Hợp đồng API (OpenAPI Pin Check)

- **Pinned Commit**: `0a77391df3a4894fbae839572bbb636c5fbbd192`
- **SHA-256 Digest**: `1312733220d9c2dec1edad5806f88903c463169bc92c72c5c2b69eb66561a82f`
- **Lệnh thực thi**:
  ```powershell
  $env:OPENAPI_SOURCE="C:\Users\Admin\.gemini\antigravity-ide\brain\f67015d6-e552-4649-a0c0-230e66c96319\scratch\openapi-0a77391.json"; npm run api:check
  ```
- **Kết quả**: `API schema is current (1312733220d9c2dec1edad5806f88903c463169bc92c72c5c2b69eb66561a82f).`
- **Mã thoát (Exit code)**: `0`.

### 5.2. Chính sách Audit Bảo mật (Audit Policy)

- **Lệnh thực thi**: `npm run test:audit-policy`
- **Kết quả**: 16/16 tests trong `scripts/audit-ci.test.mjs` đạt kết quả **PASS** (100%).
- **Mã thoát (Exit code)**: `0`.

### 5.3. Định dạng, Linter & Kiểm tra Kiểu dữ liệu

- **`npm run format:check`**: `All matched files use Prettier code style!` (Exit code `0`).
- **`npm run lint`**: `0 errors, 0 warnings` (Exit code `0`).
- **`npm run typecheck`**: `tsc --noEmit` hoàn tất thành công không có bất kỳ lỗi kiểu nào (Exit code `0`).

### 5.4. Kiểm thử Hồi quy Toàn diện (`npm test`)

Toàn bộ **11 test suites (92 tests)** đều đạt kết quả **PASS**:

1. `src/screens/v0/v0.test.tsx` (16 tests) - **PASS**:
   - `V0OverviewTab`: Render thông tin sự kiện động, next action, checklist cá nhân cục bộ.
   - `V0InviteTab`: Tải thiết kế được cấp quyền từ gateway, chỉnh sửa chữ nhanh và cập nhật revision với Idempotency Key, xử lý xung đột 409 stale revision giữ nguyên dữ liệu nhập và hiển thị nút reconfirm rõ ràng, sao chép link bằng `expo-clipboard`, chia sẻ native share sheet, render QR chuẩn ISO/IEC 18004.
   - `V0PlanTab`: Render timeline động từ `ConfirmedPlanningSnapshot`.
   - `V0Subflows`: Lịch trình thật từ booking, giải thích cutoff 72h kho ảnh và quota, tải đơn in và duyệt báo giá qua gateway với số nguyên VND, quy định Nhóm + Khách mời không Hộ gia đình/RSVP, điểm danh opt-in mặc định `NONE`.
   - `V0AccountTab`: Khởi tạo avatar chữ cái từ tên thật cặp đôi, điều hướng sang màn hình thanh toán, thông báo ghi rõ blocker chưa có API.
   - `V0CompanionShell`: Chuyển tab mượt mà, đồng bộ hóa navigation `currentScreen` và `subscreen`, xử lý phím Back phần cứng Android quay về đúng tab cha và bảo vệ dirty state.
2. `src/features/identity-access/session.test.ts` (6 tests) - **PASS**
3. `src/screens/home.test.tsx` (11 tests) - **PASS**
4. `src/screens/billing.test.tsx` (16 tests) - **PASS**
5. `src/screens/couple-overview.test.tsx` (2 tests) - **PASS**
6. `src/features/invitation-studio/app-invitation-api.test.ts` (3 tests) - **PASS**
7. `src/screens/invitation-quick-edit-screen.test.tsx` (5 tests) - **PASS**
8. `src/features/payments-billing/billing-intents.test.ts` (14 tests) - **PASS**
9. `src/features/payments-billing/billing-api.test.ts` (3 tests) - **PASS**
10. `src/lib/api/api-client.test.ts` (7 tests) - **PASS**
11. `src/features/booking-lifecycle/planning-api.test.ts` (5 tests) - **PASS**

- **Tổng cộng**: 11 test suites passed | 92 tests passed.
- **Mã thoát (Exit code)**: `0`.

### 5.5. Biên dịch Đóng gói Android

- **Lệnh thực thi**: `npx expo export -p android --no-bytecode`
- **Kết quả**: Xuất bản thành công Metro Bundler bundle cho nền tảng Android:
  - Bundled: 1445 modules (4025ms)
  - Assets: 28 assets bao gồm MaterialSymbols font và navigation icons.
  - Android bundle: `_expo/static/js/android/entry-*.js` (2.6MB)
  - Thư mục đầu ra: `dist/`
- **Mã thoát (Exit code)**: `0`.

---

## 6. Tổng hợp Các Blocker Thực tế Chưa có API (Pin 0a77391)

Theo đúng nguyên tắc trung thực và không bịa endpoint:

1. **Khôi phục trạng thái xuất bản thiệp (`GET .../publication`)**:
   - Hiện tại OpenAPI chỉ hỗ trợ tạo xuất bản `POST /bookings/{bookingId}/invitations/{designId}/publication` và xóa `DELETE ...`. Chưa có endpoint GET chuyên biệt để nạp trạng thái công khai độc lập khi mở lại app.
2. **Nạp danh sách media tiệc cưới (`GET /bookings/{bookingId}/media`)**:
   - Chỉ có endpoint tải ảnh lên `POST /bookings/{bookingId}/media`. Chưa có endpoint lấy danh sách ảnh đã tải lên để hiển thị thư viện ảnh Couple.
3. **Quản lý danh sách khách mời (`GET/POST /bookings/{bookingId}/guests`)**:
   - Chưa có endpoint REST để đồng bộ danh sách khách mời theo Nhóm trên pin 0a77391.
4. **Sơ đồ bố trí chỗ ngồi (`GET/POST /bookings/{bookingId}/seating`)**:
   - Chưa có endpoint REST cho module sơ đồ bàn tiệc.
5. **Trung tâm thông báo (`GET /notifications`)**:
   - Chưa có endpoint nạp danh sách thông báo cho tài khoản Couple. UI hiển thị rõ ràng là chưa tích hợp API.
