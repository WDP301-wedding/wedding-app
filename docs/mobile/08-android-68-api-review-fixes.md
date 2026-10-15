# Báo Cáo Thẩm Định & Xử Lý 11 Phát Hiện Đánh Giá API Kênh Android (wedding-app)

> **Dự án:** `wedding-app` (Kênh Android / React Native / Expo 57)  
> **Căn cứ:** `01-mobile-srs.md`, `02-mobile-be-fe-handoff.md`, `03-description-api-review.md`, OpenAPI schema pin `d257be8507dd83e9da73ac69605646a8fbcc7209`  
> **Phạm vi kiểm tra:** Toàn bộ 68 API kênh Android (A68-01 đến A68-68)  
> **Hai cổng kiểm định cho phép:** `npm run typecheck` (tsc --noEmit) và `npm run lint` (eslint . --max-warnings 0)

---

## I. Bảng Tổng Hợp Kết Quả Thẩm Định 11 Phát Hiện

| STT | Phát hiện Codex                                            | Kết quả Thẩm định | Bằng chứng Source / DTO / Handoff                                                                                                                      |                                                             Trạng thái Xử lý                                                             |
| :-: | :--------------------------------------------------------- | :---------------: | :----------------------------------------------------------------------------------------------------------------------------------------------------- | :--------------------------------------------------------------------------------------------------------------------------------------: |
|  1  | Bảng 68 API và Hướng dẫn test sai                          |   **Confirmed**   | File 06 có 48/68 dòng sai method/path so với danh mục chuẩn; File 07 hướng dẫn login OTP số điện thoại không tồn tại.                                  |                                   Đã tái sinh toàn bộ 06 và 07 theo danh mục 68 chuẩn và code thực tế.                                   |
|  2  | Tạo hợp đồng chưa hợp lệ (`v0-subflows.tsx`)               |   **Confirmed**   | Code cũ gửi `lines: []`, `expectedRevision: 1`, `timelineRevisionId` fallback UUID 0000. Schema yêu cầu `lines >= 1` và có menu.                       | Đã sửa `handleCreateDraft`: đọc `proposal.menu`, lấy đúng `bookingRevision`, `timelineRevisionId` thật, `predecessorRevisionId` hợp lệ.  |
|  3  | Phụ lục sai (`v0-subflows.tsx`)                            |   **Confirmed**   | Code cũ gửi `lines: []`, `expectedRevision: 1`, `predecessorRevisionId: revisions[0]` hoặc UUID 0000.                                                  |   Đã sửa `handleCreateAppendix`: dùng `effectiveRevisionId` của appendix, truyền `afterLines` hoặc menu proposal, chặn sau quyết toán.   |
|  4  | Dùng nhầm revision thương mại                              |   **Confirmed**   | Các action hợp đồng/phụ lục truyền `rev.revisionNumber` (thứ tự bản in 1, 2) thay vì `contract.bookingRevision` / `appendixData.bookingRevision`.      |            Đã sửa truyền đúng `bookingRevision`, bổ sung xử lý xung đột 409 Conflict, hiển thị chữ ký kép (COUPLE & MANAGER).            |
|  5  | Timeline sai bản (`v0-subflows.tsx`)                       |   **Confirmed**   | Code duyệt/rút duyệt dùng `proposal.effectiveTimeline` thay vì bản đề xuất `proposal.timeline`.                                                        |                  Đã tách bạch `effectiveTimeline` và `timeline`, tôn trọng `canApproveTimeline`, `canWithdrawApproval`.                  |
|  6  | Đặt cọc chưa có đường UI (`billing.tsx`)                   |   **Confirmed**   | `gateway.startDeposit` (A68-53) có trong gateway nhưng màn hình `billing.tsx` chỉ có `startBalance`, bị gate chặn ở phase `AWAITING_DEPOSIT`.          | Đã mở luồng hiển thị thông tin cọc, checklist điều kiện, nút gọi `startDeposit` và ghi rõ thông báo `BLOCKED_BY_BACKEND` cho RESTRICTED. |
|  7  | FCM chưa phải native flow                                  |   **Confirmed**   | Form nhập push token thủ công, random UUID mỗi lần, không có token lifecycle và thiếu `google-services.json`.                                          |    Đã dùng stable installation ID qua `SecureStore`, phân trang `nextCursor`, chuyển hướng thông báo, ghi nhận blocker cấu hình FCM.     |
|  8  | Nuốt lỗi thành rỗng / 0                                    |   **Confirmed**   | `v0-notifications-subflow.tsx`, `v0-subflows.tsx` (Guest) và `v0-catalog-subflow.tsx` dùng `.catch(() => [])` / `.catch(() => null)` nuốt 401/403/503. |       Đã chuyển sang `Promise.allSettled`, cho phép 401 nảy ra ngoài để refresh session, hiển thị lỗi trung thực, không giả lập 0.       |
|  9  | Health DTO sai (`experience-api.ts`, `v0-account-tab.tsx`) |   **Confirmed**   | Response trả `{ data: { status: 'live' \| 'ready', requestId } }` nhưng UI đọc `res.status` so với `UP`/`ok`/`200`.                                    |     Đã unwrap strict DTO `HealthLiveView` & `HealthReadyView`, kiểm tra HTTP status và `data.status`, hiển thị độc lập hai dịch vụ.      |
| 10  | PDF / Printable file chưa thực mở/lưu                      |   **Confirmed**   | `handleDownloadPdf` và `handleDownloadPrintableFile` chỉ nhận Blob rồi Alert thông báo dung lượng, không lưu/mở.                                       |            Đã tạo helper `saveOrShareDownloadedFile` dùng `Share.share` native (Data URL) và `URL.createObjectURL` trên Web.             |
| 11  | Idempotency / Unknown outcomes                             |   **Confirmed**   | Các gateway planning, billing, notification tự sinh `Date.now()` trong `Idempotency-Key` mặc định, làm mất tính bất biến khi retry mất mạng.           |         Đã sửa key mặc định thành chuỗi tất định dựa trên resource ID và expectedRevision, đảm bảo cùng một ý định có cùng key.          |

---

## II. Chi Tiết Thẩm Định & Khắc Phục Từng Phát Hiện

### 1. Bảng 68 API và Hướng Dẫn Test Sai

- **Thẩm định:** `Confirmed`. File `docs/mobile/06-android-68-api-implementation-map.md` trước đó bị sai 48/68 dòng: đổi `GET /bookings/{id}/proposal` thành `/couple/.../proposal`, đổi `PATCH` profile thành `PUT`, dùng các endpoint không có trong schema như `/auth/phone/otp/request`, `/auth/logout`, `/auth/roles`. File `07` hướng dẫn đăng nhập số điện thoại + OTP `123456` trong khi backend chỉ hỗ trợ email + password (`POST /auth/android-sessions`).
- **Khắc phục:**
  - Viết lại toàn bộ `docs/mobile/06-android-68-api-implementation-map.md` với 68 dòng canonical chính xác A68-01 đến A68-68 theo danh mục chủ dự án bàn giao.
  - Viết lại `docs/mobile/07-android-68-api-manual-ui-test.md` với quy trình đăng nhập email/mật khẩu thực tế, phân quyền rõ ràng giữa `RESTRICTED` và `FULL`, kịch bản test từng bước.
- **Blocker:** Không còn blocker tài liệu.

---

### 2. Tạo Hợp Đồng Chưa Hợp Lệ (`v0-subflows.tsx`)

- **Thẩm định:** `Confirmed`. Tại `handleCreateDraft` (dòng ~1937 cũ): gửi payload `{ expectedRevision: 1, lines: [], timelineRevisionId: '00000000-0000-0000-0000-000000000000', predecessorRevisionId: contract.currentRevisionId ?? null }`. Schema OpenAPI `createCommercialContractRevision` định nghĩa `lines` có `minItems: 1` và yêu cầu danh mục gói menu hợp lệ (`sourceId`, `sourceRevisionId`, `quantity`). UUID 0000 và mảng rỗng bị server từ chối 400/422.
- **Khắc phục:**
  - Nạp thêm `proposal` trong `fetchContractData` qua `planningGateway.loadProposal`.
  - Trong `handleCreateDraft`:
    - `expectedRevision`: Lấy `contract.bookingRevision` (hoặc `proposal.revision` nếu tạo lần đầu).
    - `timelineRevisionId`: Lấy từ `proposal.effectiveTimeline?.revisionId ?? proposal.timeline?.revisionId`, chặn nếu chưa có timeline hợp lệ.
    - `lines`: Tự động cấu thành từ dòng hợp đồng của bản trước, hoặc nạp gói menu gốc của tiệc `{ category: 'MENU', quantity: proposal.proposal.tableCount, sourceId: proposal.proposal.menu.packageId, sourceRevisionId: proposal.proposal.menu.versionId }`.
    - `predecessorRevisionId`: Truyền `contract.currentRevisionId ?? null`.
- **API & UI Entry Point:** `POST /bookings/{bookingId}/contracts` (A68-15) tại nút `+ Tạo bản nháp mới` trong tab Hợp đồng (`V0ContractsSubflow`).

---

### 3. Phụ Lục Sai (`v0-subflows.tsx`)

- **Thẩm định:** `Confirmed`. Tại `handleCreateAppendix` (dòng ~2420 cũ): gửi `expectedRevision: 1`, `lines: []`, `predecessorRevisionId: activeAppendix?.revisionId ?? '00000000-...'`. Theo schema `createCommercialAppendix`, `predecessorRevisionId` bắt buộc phải là `effectiveRevisionId` của hợp đồng/phụ lục thương mại đang có hiệu lực; `lines` phải có ít nhất 1 dòng; không được tạo sau khi hóa đơn đã quyết toán.
- **Khắc phục:**
  - Kiểm tra `proposal.phase === 'COMPLETED'` hoặc hóa đơn đã quyết toán: thông báo từ chối lập phụ lục.
  - Kiểm tra `appendixData.effectiveRevisionId`: nếu rỗng thì yêu cầu phải có hợp đồng hiệu lực trước.
  - `expectedRevision`: Sử dụng `appendixData.bookingRevision`.
  - `predecessorRevisionId`: Sử dụng `appendixData.effectiveRevisionId`.
  - `lines`: Nạp các dòng `afterLines` từ bản hiệu lực hoặc từ menu tiệc cưới, đảm bảo `lines.length >= 1`.
- **API & UI Entry Point:** `POST /bookings/{bookingId}/contract-appendices` (A68-12) tại form "Tạo bản nháp phụ lục" trong tab Phụ lục (`V0AppendicesSubflow`).

---

### 4. Dùng Nhầm Revision Thương Mại

- **Thẩm định:** `Confirmed`. Trong `handleSubmitContract`, `handleApproveContract`, `handleWithdrawApproval`, `handleSubmitAppendix`, `handleApproveAppendix`: tham số truyền vào là `rev.revisionNumber` (số thứ tự bản tài liệu: 1, 2, 3...) thay vì revision của hồ sơ tiệc (`bookingRevision`). Đồng thời, UI chưa thể hiện chữ ký kép của Cặp đôi (`COUPLE`) và Nhà hàng (`MANAGER`), và chưa xử lý xung đột 409.
- **Khắc phục:**
  - Đổi toàn bộ tham số `expectedRevision` sang `contract.bookingRevision` và `appendixData.bookingRevision`.
  - Bổ sung khối bắt lỗi `ApiClientError` với status 409: thông báo xung đột phiên bản và gọi `loadContractData()` / `loadAppendixData()` để reload dữ liệu mới nhất.
  - Hiển thị chi tiết tình trạng ký duyệt hai bên:
    `Chữ ký: Cô dâu & Chú rể (Đã duyệt/Chưa duyệt) · Nhà hàng (Đã duyệt/Chờ duyệt)`.
  - Chỉ hiển thị nút "Phê duyệt" khi Cặp đôi chưa duyệt; nếu đã duyệt thì hiển thị nhãn `✓ Đã ký duyệt (chờ nhà hàng)`.
- **API & UI Entry Point:** A68-13, A68-14, A68-16, A68-17, A68-18 trên từng thẻ phiên bản hợp đồng/phụ lục.

---

### 5. Timeline Sai Bản (`v0-subflows.tsx`)

- **Thẩm định:** `Confirmed`. Tại dòng ~317 cũ: `const pendingTimeline = proposal?.effectiveTimeline`. Việc gán `pendingTimeline` bằng bản đã có hiệu lực dẫn đến các thao tác duyệt/rút duyệt bị nhầm giữa bản dự thảo đang chờ duyệt (`proposal.timeline`) và bản đã ký kết (`proposal.effectiveTimeline`).
- **Khắc phục:**
  - Phân tách rõ ràng: `effectiveTimeline = proposal?.effectiveTimeline` và `pendingTimeline = proposal?.timeline`.
  - `handleCreateRevision`: `predecessorRevisionId` ưu tiên `pendingTimeline?.revisionId ?? effectiveTimeline?.revisionId ?? null`.
  - Nút duyệt và rút duyệt hiển thị theo capabilities: `canApproveTimeline` và `canWithdrawApproval`.
- **API & UI Entry Point:** A68-04, A68-05, A68-06 tại tab Lịch trình (`TimelineSubflow`).

---

### 6. Đặt Cọc Chưa Có Đường UI (`billing.tsx`)

- **Thẩm định:** `Confirmed`. Hàm `gateway.startDeposit` (A68-53) có trong gateway nhưng trong `src/screens/billing.tsx` không hề có nút bấm nào gọi nó; màn hình này chỉ gọi `gateway.startBalance`. Đồng thời, màn billing chặn toàn bộ nếu `accessLevel !== 'FULL'`.
- **Khắc phục:**
  - Lưu trạng thái `billingContext` khi tải dữ liệu.
  - Khi hồ sơ ở giai đoạn `AWAITING_DEPOSIT` hoặc tài khoản `RESTRICTED`:
    - Hiển thị thẻ thông báo cọc với số tiền cọc `depositAmountVnd`.
    - Kiểm tra danh sách điều kiện tiên quyết: Lịch trình (`timelineRevisionId`), Hợp đồng (`contractRevisionId`), Digest (`documentDigest`).
    - Thêm nút gọi `startDeposit` (A68-53) nếu đã có `timelineRevisionId`.
    - Hiển thị thông báo hạn chế kiến trúc: `[BLOCKED_BY_BACKEND] Hạn chế nền tảng Android: Theo SRS BR-05 & BE Scope 2026-10-10, tài khoản mức RESTRICTED chỉ thực hiện đặt cọc trên Web Portal để xem đầy đủ điều khoản pháp lý. Sau khi cọc xác nhận, tài khoản tự động nâng lên mức FULL trên Android.`
    - Thêm nút "Mở Cổng thông tin Web để đặt cọc" qua `openBrowserAsync`.
- **API & UI Entry Point:** `POST /bookings/{bookingId}/payments/deposit` (A68-53) trên màn hình Thanh toán (`BillingScreen`).
- **Blocker:** Backend chặn tài khoản pre-deposit trên Android theo SRS BR-05; nút test A68-53 được cung cấp đầy đủ kèm thông báo blocker trung thực.

---

### 7. FCM Chưa Phải Native Flow (`v0-notifications-subflow.tsx`)

- **Thẩm định:** `Confirmed`. Giao diện cũ có ô nhập thủ công FCM token, bấm nút đăng ký thì tự sinh UUID ngẫu nhiên làm `installationId` và truyền `expectedRevision: 1`. Chưa có cơ chế lưu trữ định danh thiết bị ổn định, thiếu cấu hình native Firebase (`google-services.json`).
- **Khắc phục:**
  - Lưu trữ và tái sử dụng `installationId` ổn định thông qua `SecureStore` (`wedding.notifications.installation-id`).
  - Xóa bỏ ô nhập FCM token thủ công; thay bằng thẻ trạng thái thiết bị hiển thị rõ `installationId` cố định.
  - Bổ sung phân trang `nextCursor` cho hộp thư thông báo với nút "Tải thêm thông báo cũ hơn".
  - Bổ sung ánh xạ chuyển hướng (`getDestinationScreen`) từ mục đích thông báo (`purpose`) đến các tab tương ứng: `plan`, `contracts`, `appendices`, `billing`, `print`, `guests`, `invoices`.
  - Hiển thị cảnh báo blocker: Dự án chưa tích hợp tệp cấu hình `google-services.json` và backend notification worker hiện đang tắt; đăng ký thiết bị là bản ghi đăng ký nền tảng trên server.
- **API & UI Entry Point:** A68-38, A68-39, A68-40, A68-41, A68-42, A68-43, A68-44, A68-45, A68-46 trong tab Thông báo.

---

### 8. Nuốt Lỗi Thành Rỗng / 0

- **Thẩm định:** `Confirmed`. Trong `v0-notifications-subflow.tsx`, `v0-subflows.tsx` (Guest) và `v0-catalog-subflow.tsx`, nhiều vị trí dùng `.catch(() => [])` hoặc `.catch(() => null)`. Việc này nuốt sạch lỗi 401 Unauthorized (khiến session không kích hoạt refresh token), biến lỗi 403/503 thành danh sách rỗng khiến người dùng tưởng hệ thống có 0 bản ghi.
- **Khắc phục:**
  - Trong `v0-notifications-subflow.tsx`: Bỏ các khối `.catch(() => [])` nuốt lỗi bên trong `session.authorize`.
  - Trong `V0GuestsSubflow`: Dùng `Promise.allSettled`, kiểm tra nếu có mã 401 thì throw để session xử lý; nếu lỗi mạng/503 thì hiển thị banner cảnh báo và nút thử lại, không giả lập 0 khách.
  - Trong `V0CatalogSubflow`: Dùng `Promise.allSettled` cho 4 danh mục công khai; ghi nhận mảng lỗi chi tiết; hiển thị thông báo lỗi từng phần; `handleSelectHall` ghi nhận lỗi vào `detailError` thay vì silent catch.
- **API & UI Entry Point:** Màn hình Thông báo, Khách mời, Danh mục công khai.

---

### 9. Health DTO Sai (`experience-api.ts`, `v0-account-tab.tsx`)

- **Thẩm định:** `Confirmed`. OpenAPI schema của `GET /health/live` và `GET /health/ready` trả về object: `{ data: { status: 'live' | 'ready', requestId: string } }`. Nhưng `experience-api.ts` trả về thô, và UI so sánh `liveRes.status === 'UP'` hoặc `readyRes.status === 'ok'`, dẫn đến hiển thị sai trạng thái hoặc hiển thị lỗi dù server trả 200.
- **Khắc phục:**
  - Định nghĩa strict DTO `HealthLiveView` và `HealthReadyView` từ `components['schemas']['HealthLiveResponse']['data']` và `HealthReadyResponse['data']`.
  - Unwrap đúng thuộc tính `data` trong `experienceGateway.healthLive()` và `healthReady()`.
  - UI `v0-account-tab.tsx`: Dùng `Promise.allSettled`, so sánh `data.status === 'live'` và `data.status === 'ready'`, hiển thị độc lập hai dịch vụ và hiển thị `requestId` tương quan.
- **API & UI Entry Point:** `GET /health/live` (A68-19) và `GET /health/ready` (A68-20) tại Tab Tài khoản (`V0AccountTab`).

---

### 10. PDF / Printable File Chưa Thực Mở/Lưu

- **Thẩm định:** `Confirmed`. Tại `handleDownloadPdf` (hợp đồng) và `handleDownloadPrintableFile` (thiệp in): sau khi nhận Blob nhị phân, code chỉ gọi `Alert.alert('Tải file thành công', ...)` và thông báo kích thước, người dùng không thể xem, mở hay lưu file vào bộ nhớ máy.
- **Khắc phục:**
  - Viết helper chung `saveOrShareDownloadedFile(blob, filename, title)`:
    - Trên Web: Sử dụng `window.URL.createObjectURL` và tạo thẻ `<a>` tải xuống tự động, có thu hồi URL (`revokeObjectURL`).
    - Trên Android/iOS: Sử dụng `FileReader` chuyển Blob thành Base64 Data URL và gọi native `Share.share` để mở bảng chia sẻ / trình đọc file PDF của hệ thống.
  - Giữ Bearer token trong header API, không để token trong public URL.
- **API & UI Entry Point:** A68-09 (Tải PDF hợp đồng) và A68-36 (Tải tệp in thiệp A5) trong tab Hợp đồng và In ấn.

---

### 11. Idempotency / Unknown Outcomes

- **Thẩm định:** `Confirmed`. Các gateway `planning-api.ts`, `billing-api.ts`, `notification-api.ts`, `experience-api.ts` đều fallback `Idempotency-Key` dạng `${action}:${resource}:${Date.now()}`. Khi người dùng gặp sự cố mạng chập chờn hoặc timeout, thao tác retry tự sinh key mới làm mất khả năng chống trùng lặp của backend.
- **Khắc phục:**
  - Loại bỏ hoàn toàn `Date.now()` khỏi các key tự sinh mặc định.
  - Chuẩn hóa key tất định theo mẫu:
    - Lịch trình: `timeline:${bookingId}:${expectedRevision}:${predecessorRevisionId ?? 'init'}`
    - Duyệt lịch trình: `approve-tl:${revisionId}:${expectedRevision}`
    - Rút duyệt lịch trình: `withdraw-tl:${revisionId}:${expectedRevision}`
    - Hợp đồng: `contract:${bookingId}:${expectedRevision}:${predecessorRevisionId ?? 'init'}`
    - Duyệt/Gửi hợp đồng: `approve-ct:${revisionId}:${expectedRevision}`, `submit-ct:${revisionId}:${expectedRevision}`
    - Phụ lục: `appendix:${bookingId}:${expectedRevision}:${predecessorRevisionId}`
    - Điểm danh: `checkin:${bookingId}:${expectedRevision}:${checkInMode}`
    - Thông báo: `read:${id}:${expectedRevision}`, `read-all:${throughCreatedAt}`, `notif-pref:${expectedRevision}`
    - Thiết bị: `install:${installationId}:${expectedRevision}`, `revoke-inst:${id}:${expectedRevision}`
  - Đảm bảo khi mạng ngắt và ứng dụng gửi lại cùng một ý định, header `Idempotency-Key` hoàn toàn trùng khớp để máy chủ đối soát an toàn.

---

## III. Bằng Chứng Kiểm Định Hai Cổng Cho Phép

Theo đúng chỉ thị nghiêm ngặt của chủ dự án:

> "Chỉ chạy npm run lint và npm run typecheck rồi xử lý lỗi đúng hai gate đó; KHÔNG chạy npm test/Jest/coverage/E2E/Playwright/smoke/API thử nghiệm/live mutation, format/format:check/api:check/expo-doctor/build/export/audit."

### 1. Kết quả kiểm tra kiểu dữ liệu (`npm run typecheck`)

- **Lệnh thực thi:** `npm run typecheck` (`tsc --noEmit`)
- **Exit code:** `0`
- **Kết quả:** Không có bất kỳ lỗi biên dịch TypeScript nào trên toàn bộ workspace `wedding-app`.

### 2. Kết quả kiểm tra chuẩn mã nguồn (`npm run lint`)

- **Lệnh thực thi:** `npm run lint` (`eslint . --max-warnings 0`)
- **Exit code:** `0`
- **Kết quả:** 0 lỗi, 0 cảnh báo (max-warnings: 0).

---

## IV. Kết Luận & Bàn Giao

1. Toàn bộ 11 phát hiện Codex đã được kiểm chứng đối chiếu với source code, OpenAPI schema và tài liệu bàn giao.
2. Tất cả các điểm bất cập đã được sửa chữa tận gốc (root cause) tại cả tầng API gateway và tầng giao diện người dùng (UI).
3. Tài liệu bản đồ ánh xạ 68 API (`06`) và Hướng dẫn test thủ công (`07`) đã được đồng bộ hóa hoàn toàn với mã nguồn thực tế và danh mục chuẩn.
4. Dự án tuân thủ nghiêm ngặt quy tắc không commit, không push, không chạy test tự động, không can thiệp server hay gửi tiền thử nghiệm.
