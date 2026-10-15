# Báo Cáo Xử Lý 7 Khoảng Thiếu Kênh Android (wedding-app) Theo Đánh Giá Của Codex

> **Dự án:** `wedding-app` (Kênh Android / React Native / Expo)  
> **Căn cứ:** Đánh giá 11 điểm của Codex, SRS `01-mobile-srs.md`, `02-mobile-be-fe-handoff.md`, Backend Scope 2026-10-10, OpenAPI pin `d257be8507dd83e9da73ac69605646a8fbcc7209`.  
> **Phạm vi xử lý:** Duy nhất `wedding-app`. Không sửa BE/wedding-web/wedding-manage-web. Không commit/push/PR.  
> **Cổng kiểm tra:** `npm run typecheck` (exit code 0), `npm run lint` (exit code 0, 0 warnings, 0 errors).

---

## 1. Bảng Tổng Hợp Đối Chiếu & Kết Quả 7 Điểm Phát Hiện

| STT | Vấn đề Codex nêu | Tình trạng đối chiếu | Căn cứ mã nguồn / DTO / Tài liệu | Giải pháp kỹ thuật đã triển khai | Trạng thái sau xử lý |
|:---:|:---|:---:|:---|:---|:---:|
| **1** | **Form Hợp đồng & Phụ lục chưa hoàn chỉnh**<br>(Chỉ copy lines cũ/proposal; thiếu UI chọn MENU/PRINT/SERVICE, quantity, sourceId; phụ lục làm mất PRINT/SERVICE) | **Xác nhận (Confirmed)** | `v0-subflows.tsx` trước đây chỉ sao chép mảng `proposal.proposal.dishes` vào MENU, không có form cho user thêm/bớt/sửa số lượng; phụ lục chỉ tìm `lines` từ `appendix.revisions` nên khi chưa có phụ lục thì fallback MENU làm mất hoàn toàn dòng PRINT/SERVICE. | - Xây dựng form Native line customization cho cả Hợp đồng (`V0ContractsSubflow`) và Phụ lục (`V0AppendicesSubflow`).<br>- Chọn món từ Catalog danh mục đang hoạt động (`activeDishes`), chọn gói thực đơn (`activePackages`), nhập số lượng với nút tăng giảm (+/-).<br>- Cho phép thêm/xóa dòng, đảm bảo quy tắc tối thiểu 01 dòng `MENU`.<br>- Hiển thị đơn giá tham khảo từ Catalog, payload chỉ gửi `category`, `sourceId`, `sourceRevisionId`, `quantity`. Không gửi tổng tiền giả lập (để server tính toán authoritative).<br>- Đối với Phụ lục: hàm `aggregateEffectiveCommercialLines` tổng hợp toàn bộ các dòng thương mại có hiệu lực từ hợp đồng gốc (`contract.revisions`) kết hợp các phụ lục đã được phê duyệt trước đó, bảo toàn đầy đủ `MENU`, `PRINT` và `SERVICE`.<br>- Hiển thị snapshot so sánh Trước / Sau / Delta trên giao diện. | **Đã sửa hoàn chỉnh** (Code + UI) |
| **2** | **Giá trị giả trong Payload / Identity**<br>(`tableCount \|\| 20`, `expectedBookingRevision ?? 1`, SecureStore catch fallback UUID cố định `00000000-0000-4000-8000-000000000001`) | **Xác nhận (Confirmed)** | - `v0-subflows.tsx` dòng 2656: `quantity: proposal.proposal.tableCount \|\| 20`.<br>- `v0-subflows.tsx`: fallback `proposal?.revision ?? 1` và `expectedBookingRevision ?? 1`.<br>- `v0-notifications-subflow.tsx` dòng 83: catch lỗi SecureStore lại gán ID `00000000-0000-4000-8000-000000000001`. | - Loại bỏ hoàn toàn fallback `\|\| 20`: Kiểm tra nếu `tableCount` thiếu hoặc `<= 0` thì chặn thao tác và thông báo yêu cầu tải lại proposal.<br>- Loại bỏ `?? 1` trong revision: Buộc phải có số revision hợp lệ từ server DTO, nếu thiếu thì yêu cầu tải lại booking.<br>- Loại bỏ UUID cố định: Khi SecureStore gặp lỗi hoặc không khả dụng, giữ trạng thái `null`/lỗi chưa khởi tạo, hiển thị thông báo lỗi rõ ràng, tuyệt đối không dùng ID giả để đăng ký thiết bị. | **Đã sửa hoàn chỉnh** |
| **3** | **Chặn Phụ lục theo `COMPLETED` là sai**<br>(Code chặn `phase === 'COMPLETED'` và coi là đã quyết toán) | **Xác nhận (Confirmed)** | `v0-subflows.tsx` trước đây có đoạn `if (proposal?.phase === 'COMPLETED')` hiển thị thông báo đã hoàn tất và chặn tạo phụ lục. Theo tài liệu Backend Scope và SRS, `COMPLETED` chỉ là giai đoạn diễn ra tiệc, không đồng nghĩa hóa đơn quyết toán đã được phát hành/chốt (`FINALIZED`). | - Thay thế việc kiểm tra `proposal?.phase === 'COMPLETED'` bằng tín hiệu hóa đơn quyết toán thực tế từ `coupleBilling.getFinalInvoices(bookingId)`.<br>- Xác định cờ `hasFinalizedInvoice = invoices.some(i => i.status === 'FINALIZED' \|\| i.status === 'ISSUED')`.<br>- Nếu đã có hóa đơn finalized, chặn tạo phụ lục và giải thích rõ: điều chỉnh sau quyết toán thuộc thẩm quyền của Quản lý nhà hàng (Manager invoice adjustment).<br>- Nếu tiệc ở trạng thái `COMPLETED` nhưng chưa có hóa đơn quyết toán finalized, Cặp đôi vẫn được phép lập phụ lục nếu điều kiện thương mại cho phép. | **Đã sửa hoàn chỉnh** |
| **4** | **Idempotency chưa đúng khi chỉ dùng Key theo Resource/Revision**<br>(Cùng revision nhưng đổi lines/reason lại dùng chung key cũ; thiếu guard double-press đồng bộ) | **Xác nhận (Confirmed)** | `billing-api.ts` dùng key dạng `contract:${bookingId}:${expectedRevision}:${predecessor}`, nếu user sửa nội dung form rồi gửi lại khi revision chưa đổi sẽ sinh trùng key với payload khác. `planning-api.ts` và `notification-api.ts` còn dùng key suy đoán hoặc timestamp. | - Xây dựng module `src/lib/idempotency.ts` với hàm `generateDeterministicIdempotencyKey`.<br>- Khóa Idempotency được băm SHA-256 (`expo-crypto`) dựa trên: `prefix` + `resourceId` + `revision` + `JSON.stringify(normalizedBody)`. Đảm bảo cùng ý định và cùng payload thì tái tạo đúng key cũ (an toàn khi retry rớt mạng), khác payload thì tự động sinh key mới.<br>- Bổ sung cờ chặn bấm đúp đồng bộ `isBusyRef` trên mọi thao tác mutation (Hợp đồng, Phụ lục, Lịch trình, Thông báo), chống race condition trước khi state render cập nhật.<br>- Xử lý phản hồi HTTP 409 Conflict: tự động tải lại dữ liệu mới nhất từ server và yêu cầu người dùng xác nhận lại trước khi tiếp tục. | **Đã sửa hoàn chỉnh** |
| **5** | **PDF/Printable chưa đúng Android file flow**<br>(Dùng `Share.share` với dataURL, trên Android chỉ gửi chuỗi text, không mở/lưu/chia sẻ file PDF thật) | **Xác nhận (Confirmed)** | Source React Native `ShareModule.kt` trên Android: khi nhận tham số `url` dạng chuỗi (kể cả data URI), Android coi đó là text và gắn vào `Intent.EXTRA_TEXT`, không tạo `Intent.ACTION_SEND` kèm file attachment binary. | - Cài đặt bộ công cụ native chính thức của Expo: `expo-file-system@~57.0.7` và `expo-sharing@~57.0.23`.<br>- Tái cấu trúc hàm `saveOrShareDownloadedFile` (`v0-subflows.tsx`):<br>  1. Đọc Blob nhị phân thành Base64 thông qua `FileReader`.<br>  2. Ghi tệp vào thư mục cache riêng tư của ứng dụng (`FileSystem.cacheDirectory + fileName`).<br>  3. Gọi `Sharing.shareAsync` với MIME type `application/pdf` và UTI `com.adobe.pdf` để mở hộp thoại hệ thống cho phép người dùng mở trong PDF Viewer, Google Drive hoặc chia sẻ tệp đính kèm thật.<br>  4. Xử lý dọn dẹp và phân biệt rõ trên Web (sử dụng thẻ `<a>` tải xuống trực tiếp). | **Đã sửa hoàn chỉnh** |
| **6** | **FCM phải báo đúng Blocker và hoàn thiện phần client làm được**<br>(Cần rà soát chính xác file/config thực tế thay vì chỉ báo thiếu; không dùng fake ID) | **Xác nhận (Confirmed)** | Kiểm tra thực tế: Tệp `google-services.json` đã có sẵn tại thư mục gốc của project (cấu hình cho package `com.wdp301.wedding.staging`), nhưng chưa được liên kết trong `app.config.ts`, trong `package.json` chưa cài SDK push native (`expo-notifications` hoặc `@react-native-firebase/messaging`), và backend push worker đang tắt. | - Gỡ bỏ hoàn toàn fallback ID giả lập `00000000-0000-4000-8000-000000000001`.<br>- Hoàn thiện hàm sinh và lưu `installationId` ổn định theo thiết bị vào `SecureStore`.<br>- Xây dựng Thẻ chẩn đoán trung thực 4 thành phần trên UI Tab Thông báo (`v0-notifications-subflow.tsx`):<br>  1. *Cấu hình Google Services:* Tệp tồn tại ở root nhưng chưa liên kết vào `app.config.ts`.<br>  2. *Thư viện Push Client:* Chưa tích hợp native push SDK trong `package.json`.<br>  3. *Dịch vụ Backend:* Backend push dispatch worker đang tắt ở môi trường staging.<br>  4. *Trạng thái thiết bị:* Đã sẵn sàng định danh thiết bị độc nhất từ SecureStore. | **Đã sửa hoàn chỉnh** (Báo đúng hiện trạng) |
| **7** | **Bảng 66 Implemented + 2 Blocked chưa chứng minh được & URL Web bị đoán**<br>(URL `wedding-web-production-e1dc.up.railway.app` bị suy đoán; booking trước cọc bị chặn vào V0CompanionShell) | **Xác nhận (Confirmed)** | - `billing.tsx` chứa URL cứng suy đoán `https://wedding-web-production-e1dc.up.railway.app`.<br>- `planning-api.ts` hàm `loadConfirmed` trước đây có điều kiện `phase === 'CONFIRMED'`, khiến các tiệc ở giai đoạn trước cọc (`AWAITING_DEPOSIT`, `DRAFT`) không thể vào màn hình `V0CompanionShell` để kiểm thử các API được phép (A68-01 proposal, A68-08 contract draft, catalog...).<br>- Nút đặt cọc ghi tên thô "Thử đặt cọc trên Android (A68-53)". | - Xóa bỏ toàn bộ URL suy đoán trong `billing.tsx`. Sử dụng biến môi trường chuẩn `process.env.EXPO_PUBLIC_WEB_PORTAL_URL`. Nếu chưa được cấu hình, UI hiển thị card hướng dẫn rõ ràng "Chưa cấu hình URL Web Portal", không mở liên kết sai.<br>- Sửa đổi `planning-api.ts`: Mở rộng `ConfirmedPlanningSnapshot` để hỗ trợ tất cả các trạng thái tiệc (`DRAFT`, `AWAITING_DEPOSIT`, `CONFIRMED`, `COMPLETED`), truyền đúng `accessLevel` (`RESTRICTED` hoặc `FULL`). Loại bỏ điều kiện chặn cứng `phase === 'CONFIRMED'` trong `loadConfirmed`, cho phép tiệc trước cọc vào `V0CompanionShell` để kiểm thử các luồng được phép trên Android.<br>- Đổi nhãn nút cọc thành "Tiến hành đặt cọc tiệc cưới" kèm giải thích nghiệp vụ BR-05 và nút mở Web Portal theo cấu hình thực tế. | **Đã sửa hoàn chỉnh** |

---

## 2. Chi Tiết Các Tệp Mã Nguồn Đã Chỉnh Sửa Trong `wedding-app`

1. **`package.json` & `package-lock.json`**:
   - Bổ sung `expo-file-system@~57.0.7` và `expo-sharing@~57.0.23` để hỗ trợ lưu và chia sẻ file PDF thực tế trên Android.
2. **`src/lib/idempotency.ts`** *(Tạo mới)*:
   - Cung cấp hàm `generateDeterministicIdempotencyKey(domain, resourceId, revision, payload)` băm SHA-256 nội dung payload thực tế, đảm bảo an toàn tuyệt đối khi retry mạng.
3. **`src/features/payments-billing/billing-api.ts`**:
   - Áp dụng `generateDeterministicIdempotencyKey` cho tất cả các mutation: Tạo nháp hợp đồng, Duyệt/Gửi hợp đồng, Rút duyệt hợp đồng, Tạo nháp phụ lục, Duyệt/Gửi phụ lục, Khởi tạo thanh toán cọc/số dư.
4. **`src/features/booking-lifecycle/planning-api.ts`**:
   - Mở rộng `ConfirmedPlanningSnapshot` hỗ trợ `accessLevel` và các phase trước cọc (`AWAITING_DEPOSIT`, `DRAFT`).
   - Loại bỏ rào cản nhân tạo `phase === 'CONFIRMED'` trong `loadConfirmed`.
   - Áp dụng `generateDeterministicIdempotencyKey` cho các mutation lịch trình, đổi tiệc, hủy tiệc, điểm danh.
5. **`src/features/notifications/notification-api.ts`**:
   - Áp dụng `generateDeterministicIdempotencyKey` cho các thao tác cập nhật cài đặt kênh thông báo (`preferences`).
6. **`src/screens/v0/v0-subflows.tsx`**:
   - Tích hợp `expo-file-system/legacy` và `expo-sharing` vào `saveOrShareDownloadedFile` cho việc mở/lưu PDF hợp đồng (A68-09) và file in thiệp (A68-36).
   - Xóa bỏ các giá trị fallback giả (`|| 20`, `expectedBookingRevision ?? 1`, `proposal?.revision ?? 1`).
   - Bổ sung giao diện chỉnh sửa dòng dịch vụ/thực đơn (line customization) cho Hợp đồng và Phụ lục với quy tắc tối thiểu 1 dòng `MENU`.
   - Bổ sung hàm `aggregateEffectiveCommercialLines` tổng hợp đầy đủ `MENU`, `PRINT` và `SERVICE` từ hợp đồng gốc và phụ lục đã duyệt.
   - Sửa điều kiện chặn tạo phụ lục: dựa vào `hasFinalizedInvoice` thay vì `phase === 'COMPLETED'`.
   - Thêm cờ chặn bấm đúp `isBusyRef` đồng bộ trên toàn bộ các nút mutation.
7. **`src/screens/v0/v0-notifications-subflow.tsx`**:
   - Loại bỏ fallback ID cố định `00000000-0000-4000-8000-000000000001` khi SecureStore lỗi.
   - Bổ sung Thẻ chẩn đoán 4 phần về hiện trạng tích hợp FCM Push Notifications trên Android.
8. **`src/screens/billing.tsx`**:
   - Loại bỏ URL suy đoán `wedding-web-production-e1dc.up.railway.app`. Sử dụng `process.env.EXPO_PUBLIC_WEB_PORTAL_URL` kèm trạng thái hiển thị rõ ràng khi chưa cấu hình.
   - Chuẩn hóa CTA đặt cọc tiệc cưới và thông báo hạn chế của Backend đối với tài khoản trước cọc trên Android.
9. **`src/screens/couple-overview.tsx`**:
   - Hỗ trợ hiển thị huy hiệu trạng thái cho các giai đoạn tiệc trước cọc (`AWAITING_DEPOSIT`, `DRAFT`) thay vì chỉ hỗ trợ `CONFIRMED`/`COMPLETED`.

---

## 3. Kết Quả Kiểm Tra Hai Cổng Bắt Buộc

Thực thi kiểm tra mã nguồn theo đúng giới hạn chỉ định của Chủ dự án:

```bash
# 1. Kiểm tra tĩnh kiểu dữ liệu TypeScript
npm run typecheck
# Exit code: 0
# Output:
# > wedding-app@0.1.0 typecheck
# > tsc --noEmit

# 2. Kiểm tra chất lượng mã nguồn ESLint
npm run lint
# Exit code: 0
# Output:
# > wedding-app@0.1.0 lint
# > eslint . --max-warnings 0
```

Cả hai cổng kiểm tra đều đạt `exit code: 0`, không còn bất kỳ cảnh báo (warning) hay lỗi (error) nào.

---

## 4. Các Blocker Còn Lại & Khuyến Nghị Vận Hành

1. **Native FCM Push Notification (A68-44)**:
   - *Client:* Tệp `google-services.json` đã có tại root, cần liên kết đường dẫn vào `android.googleServicesFile` trong `app.config.ts` khi cấu hình build production; cần cài thêm thư viện push native (`expo-notifications`) khi chuyển sang quy trình build APK/AAB thực tế.
   - *Backend:* Worker gửi push trên backend staging cần được kích hoạt khi triển khai môi trường live.
2. **Quy Trình Đặt Cọc Trên Android (A68-53)**:
   - Theo đặc tả SRS BR-05 và Backend Scope, tài khoản Cặp đôi ở trạng thái trước cọc bị giới hạn `RESTRICTED` và quy trình đặt cọc hợp đồng phải thực hiện trên Web Portal. Ứng dụng đã hoàn tất caller và điều hướng người dùng sang Web Portal thông qua biến môi trường `EXPO_PUBLIC_WEB_PORTAL_URL`.
3. **Môi Trường Kiểm Thử**:
   - Theo quy định, không chạy kiểm thử tự động ghi đè dữ liệu hay giao dịch tiền thật. Người dùng sử dụng tài khoản email/mật khẩu được cấp để kiểm thử thủ công trên thiết bị thực theo hướng dẫn tại `docs/mobile/07-android-68-api-manual-ui-test.md`.
