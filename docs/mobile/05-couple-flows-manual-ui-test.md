# Hướng Dẫn Kiểm Thử Thủ Công Giao Diện (Manual UI Test) — Các Luồng Cặp Đôi C1, C3/C7, C6, C7 Đơn In & Media

**Dự án:** `wedding-app` (Ứng dụng Android React Native / Expo)  
**Tài liệu tham chiếu:** `docs/mobile/01-mobile-srs.md`, `docs/mobile/02-mobile-be-fe-handoff.md` (Mục 9.3, BR/FR, Endpoints), `03-description-api-review.md`, `docs/backend-scope-2026-10-10.md`  
**Mục tiêu:** Hướng dẫn chủ dự án thực hiện kiểm thử thủ công từng bước trên giao diện thực tế đối với các luồng Cặp đôi C1 (Danh sách/Tổng quan/Lịch trình UC17), C3/C7 (Thanh toán số dư/Hóa đơn & Màn xem tài chính thương mại UC36–37), C6 (Thiệp có sẵn/Chỉnh sửa chữ/Phát hành/QR UC30), C7 (Đơn in thiệp A5 - Chế độ Chỉ đọc), Media (Tải ảnh thật với Expo Image Picker) và xác minh việc loại bỏ hoàn toàn dữ liệu giả (Mock Data).

---

> [!IMPORTANT]
> **Quy ước kiểm thử đợt này:**
>
> - Toàn bộ việc kiểm thử được thực hiện **thủ công (Manual Test)** trực tiếp trên thiết bị/emulator bởi người dùng/chủ dự án.
> - **Không chạy bất kỳ lệnh test tự động nào** (không chạy `npm test`, `jest`, `playwright`, `test:coverage`, `expo-doctor`, `audit`).
> - Tuyệt đối **không dùng thẻ ngân hàng thật hay tiền thật**; chỉ sử dụng môi trường VNPay Sandbox do Backend cấu hình nếu được cấp phép.
> - **Không giả định dữ liệu**: Mọi thông tin hiển thị trên app phải lấy từ API Backend thật; nếu máy chủ chưa có dữ liệu hoặc thiếu endpoint đọc phục hồi (read recovery), ứng dụng hiển thị trạng thái trung thực (truthful empty / blocker note) thay vì sinh mock data.

---

## 1. Môi trường & Điều kiện tiên quyết (Prerequisites)

### 1.1. Cấu hình Backend & Môi trường chạy

- **API Base URL:** `https://wedding-be-production-e1dc.up.railway.app/api/v1`  
  (Được chỉ định trong `.env` tại thư mục gốc `wedding-app` với biến `EXPO_PUBLIC_API_BASE_URL`).
- **Phiên bản Hợp đồng (Contract Pin):** Backend commit `d257be8507dd83e9da73ac69605646a8fbcc7209`, OpenAPI Digest `6a8be82541ca2d8ce274f9817d10bcd300c91de2f5e734055cf9108b23db0915`.
- **Thiết bị kiểm thử:**
  - Thiết bị Android vật lý (Android 10+, cài đặt ứng dụng **Expo Go** từ Google Play Store) HOẶC
  - Máy ảo Android Emulator (Android Studio, Android 12+ API 31+).

### 1.2. Tài khoản thử nghiệm (Do Backend cấp)

Chủ dự án cần chuẩn bị các tài khoản thật trên Backend:

1. **Tài khoản Cặp đôi toàn quyền (COUPLE - FULL Access) sở hữu 2 Booking:**
   - Email: `couple.test@example.com` (hoặc tài khoản FPT/test do BE cấp).
   - Có ít nhất 2 booking tiệc cưới đã được duyệt (`CONFIRMED`) để kiểm tra chuyển đổi tiệc cưới và race condition.
   - Một booking có hợp đồng thương mại, phụ lục, chi phí phát sinh, và hóa đơn quyết toán.
2. **Tài khoản Giới hạn (COUPLE - RESTRICTED Access):**
   - Tài khoản có tiệc cưới ở trạng thái chờ cọc hoặc chưa hoàn tất duyệt hợp đồng, để kiểm tra cổng chặn quyền truy cập và hướng dẫn mở Cổng Web.
3. **Môi trường VNPay Sandbox (Tùy chọn):**
   - Tài khoản thẻ thử nghiệm VNPay Sandbox (thẻ NCB demo) do VNPay cung cấp để kiểm tra cổng thanh toán nếu Backend cho phép thử nghiệm.
4. **Trạng thái Email Worker & Sandbox Provider:**
   - Nếu worker gửi email/thông báo của BE chưa kích hoạt, app sẽ không giả định thành công mà hiển thị trung thực thông báo từ server.

---

## 2. Khởi chạy ứng dụng

Tại thư mục `wedding-app`, chạy lệnh:

```powershell
cd C:\Users\Admin\Desktop\BE\wedding-app
npx expo start -c
```

- Bấm phím `a` để mở trên Android Emulator, hoặc dùng Expo Go trên thiết bị thật quét mã QR.
- Không có bất kỳ automated test nào chạy ngầm.

---

## 3. Các kịch bản kiểm thử chi tiết trên giao diện

---

### Kịch bản 1: Flow C1 / UC17 — Danh Sách Tiệc Cưới, Tổng Quan & Lịch Trình Thực

#### Bước 1.1: Đăng nhập & Nạp dữ liệu tiệc cưới thật (`GET /couple/bookings?client=ANDROID`)

- **Thao tác:** Đăng nhập bằng tài khoản Cặp đôi FULL.
- **Quan sát giao diện:**
  - Ứng dụng gọi `GET /couple/bookings?client=ANDROID`.
  - Nếu tài khoản có nhiều tiệc, thanh chọn tiệc cưới (Booking Picker) xuất hiện ở đầu trang với danh sách mã tiệc thật (`#bookingId.slice(0, 8)`), ngày cưới và trạng thái (`CONFIRMED`, `COMPLETED`, `CANCELLED`).
  - **Không có tên sảnh giả "WeddingEstate"**: Tên sảnh tiệc và nhà hàng được lấy chính xác từ `restaurantName` và `hallName` trong catalog/hợp đồng snapshot. Nếu chưa có hợp đồng duyệt, hiển thị "Nhà hàng tiệc cưới" theo catalog.
  - **Tên Cô dâu & Chú rể chuẩn xác (Canonical Names)**: Tên được nạp từ hồ sơ cặp đôi (`GET /consultations/{id}/couple-profile`) hoặc hợp đồng (`brideName`, `groomName`), tuyệt đối không bị tách chuỗi text ngẫu nhiên hay lấy từ thiệp mẫu cũ.
- **Tiêu chí Đạt:** Hiển thị đúng dữ liệu tiệc từ server; không xuất hiện text hardcode mẫu.

#### Bước 1.2: Kiểm tra Quy mô Khách mời (Planned Headcount)

- **Thao tác:** Xem ô "Quy mô dự kiến" trong thẻ Thông tin tiệc cưới tại tab Kế hoạch.
- **Quan sát:**
  - Số lượng khách dự kiến lấy từ `planningHeadcount` của tiệc cưới.
  - **Không suy diễn từ số khách trong danh sách**: Dù danh sách khách mời rỗng (`0` khách) hay chưa xếp bàn, số lượng bàn và quy mô dự kiến vẫn giữ nguyên số lượng do Cặp đôi/Nhà hàng đã đăng ký.
- **Tiêu chí Đạt:** Planned headcount độc lập hoàn toàn với danh sách khách mời cá nhân.

#### Bước 1.3: Xem Lịch trình Ngày cưới (Timeline) — Bỏ Fallback Giả & Dấu Hoàn Thành Ảo

- **Thao tác:** Từ tab Kế hoạch, bấm vào mục **Lịch trình ngày tiệc** để mở màn hình chi tiết lịch trình (`V0ScheduleSubflow`).
- **Quan sát:**
  - Danh sách các mốc thời gian lấy từ `effectiveTimeline` (hoặc `timeline` trong proposal).
  - **Không còn fallback revision giả**: Không tự sinh số bản `timelineRevision ?? bookingRevision ?? 1`. Nếu chưa có lịch trình hiệu lực, hiển thị trạng thái `Chưa xác lập lịch trình hiệu lực`.
  - **Không có dấu check xanh giả**: Không còn logic gán mốc đầu tiên `index === 0` là "Đã hoàn thành". Trạng thái hiển thị trung thực theo thời gian tiệc cưới và dữ liệu máy chủ.
  - App chỉ hiển thị chế độ xem (Read-only) theo đúng phạm vi mobile handoff.
- **Tiêu chí Đạt:** Lịch trình hiển thị đúng các mốc thời gian (giờ bắt đầu, mô tả); không tự đánh dấu hoàn thành sai sự thật.

#### Bước 1.4: Race Condition khi chuyển đổi giữa 2 Booking

- **Thao tác:**
  - Tại thanh chọn tiệc cưới, bấm đổi từ **Tiệc A** sang **Tiệc B** rồi ngay lập tức chuyển lại **Tiệc A**.
  - Bấm chuyển qua lại các tab (Kế hoạch -> Thiệp cưới -> Tài khoản -> Kế hoạch).
- **Quan sát:**
  - Mọi request của booking cũ bị hủy hoặc bị chặn bởi `currentBookingRequestIdRef`.
  - Dữ liệu của Tiệc B không bị ghi đè lên giao diện của Tiệc A.
  - Tên cô dâu, chú rể, sảnh tiệc và các khoản thanh toán được reset và nạp lại chuẩn xác cho booking đang chọn.
- **Tiêu chí Đạt:** Dữ liệu nhất quán, không xảy ra hiện tượng "râu ông nọ cắm cằm bà kia" giữa 2 tiệc cưới.

#### Bước 1.5: Cổng chặn tài khoản RESTRICTED (Dẫn về Web Portal)

- **Thao tác:** Đăng xuất và đăng nhập bằng tài khoản Cặp đôi có quyền `RESTRICTED`.
- **Quan sát:**
  - Ứng dụng hiển thị thông báo giới hạn quyền truy cập: `Tiệc cưới của hai bạn hiện đang ở giai đoạn tiền đặt cọc hoặc cần quản lý chi tiết trên Cổng Web.`
  - Nút **Mở Cổng quản lý Web** hiển thị với đường dẫn web cấu hình từ biến môi trường.
  - Không mở màn hình đặt cọc hay các tính năng nâng cao trên mobile khi chưa đủ điều kiện `FULL`.
- **Tiêu chí Đạt:** Điều hướng chính xác về Web theo đúng quy định phân quyền.

---

### Kịch bản 2: Flow C3 / C7 UC36–37 — Tài Chính, Thanh Toán Số Dư & Các Màn Xem Thương Mại

#### Bước 2.1: Xem Sổ cái Thanh toán & Tổng tiền Server Integer VND

- **Thao tác:** Chuyển sang tab **Tài khoản** -> bấm **Thanh toán & Hóa đơn** (hoặc mở `V0BillingSubflow`).
- **Quan sát:**
  - Tổng số tiền hợp đồng (`totalAmountVnd`), số tiền đã thanh toán (`netPaidVnd`), số dư còn lại cần thanh toán (`owedVnd`), và số tiền cọc (`depositAmountVnd`) đều là số nguyên VND được tính toán từ máy chủ.
  - Ứng dụng không tự ý cộng trừ hay làm tròn sai lệch so với server.
  - Lịch sử các đợt thanh toán (Billing History) hiển thị snapshot lịch sử bất biến (`immutable`).
- **Tiêu chí Đạt:** Số liệu hiển thị khớp 100% với dữ liệu trả về từ `GET /bookings/{id}/billing`.

#### Bước 2.2: Khởi tạo Thanh toán Số dư (Balance Payment) & Kiểm soát Sandbox URL

- **Thao tác:**
  - Tại màn hình thanh toán, nhập số tiền số dư muốn thanh toán (phải `<= owedVnd`).
  - Bấm **Thanh toán số dư qua VNPay**.
- **Quan sát:**
  - Nút chuyển trạng thái khóa chống bấm đúp (`disabled`).
  - Client gửi `POST /bookings/{id}/payments/balance` với body `{ amountVnd, returnUrl }` và header `Idempotency-Key` bền vững (`durable key`).
  - Ứng dụng kiểm tra chặt chẽ `checkoutUrl`: Phải có origin `https://sandbox.vnpayment.vn` và đường dẫn `/paymentv2/vpcpay.html`.
  - Trình duyệt mở ra trang thanh toán giả lập VNPay Sandbox.
- **Tiêu chí Đạt:** URL được kiểm soát an toàn; khóa chống duplicate submission hoạt động.

#### Bước 2.3: Xử lý Trình duyệt Return / App Resume — Không Tự Báo Thành Công Theo Redirect

- **Thao tác:**
  - Trên trang VNPay Sandbox, thực hiện thao tác:
    - Trường hợp A: Bấm "Hủy giao dịch" hoặc quay lại app mà chưa thanh toán.
    - Trường hợp B: Nhập thông tin thẻ test sandbox thành công và quay lại app qua deeplink/return.
- **Quan sát:**
  - Khi app resume hoặc nhận deeplink với `attemptId`, ứng dụng **KHÔNG hiển thị thông báo thành công ngay lập tức**.
  - Client gửi request `GET /bookings/{id}/payments/{attemptId}` để đọc trạng thái chính thức từ máy chủ.
  - Chỉ khi server xác nhận trạng thái `SUCCEEDED`, app mới ghi nhận thanh toán hoàn tất.
  - Nếu kết quả là `PENDING` hoặc mất mạng (`UNKNOWN`), app giữ nguyên intent key, chuyển sang trạng thái chờ đối soát hoặc hướng dẫn người dùng kiểm tra lại, không tự động tạo khoản thanh toán mới.
- **Tiêu chí Đạt:** Tuân thủ đúng nguyên tắc xác thực kết quả thanh toán từ phía máy chủ; không phán đoán từ URL redirect.

#### Bước 2.4: Màn Xem Hợp Đồng & Tải Tệp PDF Bảo Mật (`V0ContractsSubflow`)

- **Thao tác:** Từ tab Tài khoản, bấm vào mục **Hợp đồng tiệc cưới**.
- **Quan sát:**
  - Ứng dụng gọi `GET /bookings/{id}/contracts` để lấy danh sách các phiên bản hợp đồng.
  - Hiển thị thông tin mô hình hợp đồng (`modelVersion`), trạng thái đủ điều kiện đặt cọc (`eligibleForDeposit`), và mã phiên bản đang hiệu lực (`currentRevisionId`).
  - Danh sách từng phiên bản: Số phiên bản (`#revisionNumber`), trạng thái (`DRAFT`, `APPROVED`), giá trị hợp đồng (`contractTotalVnd`), tiền cọc (`depositAmountVnd`), ngày tạo và mã băm toàn vẹn tài liệu (`documentDigest`).
  - **Tải tệp PDF bảo mật**: Bấm nút **Tải tệp PDF hợp đồng (Bảo mật)** tại phiên bản mong muốn.
    - Client tải file PDF bằng phương thức fetch native có kèm header `Authorization: Bearer <token>`.
    - **Không chèn Access Token lên query URL** (`?token=...`), đảm bảo an toàn bí mật phiên.
    - File tải về được xử lý an toàn, không cache hay lưu file nhạy cảm vào bộ nhớ công cộng.
- **Tiêu chí Đạt:** Hiển thị đầy đủ lịch sử hợp đồng và tải PDF bảo mật thành công.

#### Bước 2.5: Màn Xem Phụ Lục Hợp Đồng (`V0AppendicesSubflow`)

- **Thao tác:** Từ tab Tài khoản, bấm vào mục **Phụ lục hợp đồng**.
- **Quan sát:**
  - Gọi API `GET /bookings/{id}/contract-appendices`.
  - Hiển thị thẻ tổng quan: Tổng giá trị các phụ lục đang có hiệu lực (`effectiveTotalVnd`) và mã bản hiệu lực (`effectiveRevisionId`).
  - Danh sách từng phụ lục: Số phụ lục (`#revisionNumber`), trạng thái (`APPROVED`, `AWAITING_APPROVAL`), giá trị điều chỉnh (`deltaVnd`, hiển thị dấu `+` nếu tăng tiền), lý do điều chỉnh (`reason`), ngày tạo và mã băm `documentDigest`.
  - Nếu chưa có phụ lục phát sinh, hiển thị thẻ thông báo trống trung thực.
- **Tiêu chí Đạt:** Hiển thị rõ ràng các biến động tài chính trước - sau của từng phụ lục hợp đồng.

#### Bước 2.6: Màn Xem Chi Phí Phát Sinh (`V0IncidentalsSubflow`)

- **Thao tác:** Từ tab Tài khoản, bấm vào mục **Chi phí phát sinh**.
- **Quan sát:**
  - Gọi API `GET /bookings/{id}/incidental-expenses`.
  - Hiển thị tổng số tiền phát sinh do nhà hàng ghi nhận (`totalVnd`) và trạng thái chốt sổ (`finalized`).
  - Danh sách từng khoản phát sinh: Tên mục, số lượng, đơn vị tính, đơn giá VND, tổng tiền VND và ghi chú nếu có.
  - Dữ liệu read-only dành cho Cặp đôi, không có nút sửa/xóa trái thẩm quyền.
- **Tiêu chí Đạt:** Chi tiết từng dòng phát sinh khớp với số liệu kế toán nhà hàng.

#### Bước 2.7: Màn Xem Hóa Đơn Quyết Toán Cuối (`V0InvoicesSubflow`)

- **Thao tác:** Từ tab Tài khoản, bấm vào mục **Hóa đơn quyết toán cuối**.
- **Quan sát:**
  - Gọi API `GET /bookings/{id}/final-invoices`.
  - Hiển thị danh sách các bản hóa đơn chính thức được phát hành sau khi tiệc cưới nghiệm thu: Mã hóa đơn, số bản (`revisionNumber`), số tiền quyết toán cuối cùng (`totalVnd`), ngày phát hành và mã băm bảo mật.
  - Phân biệt hoàn toàn với sổ cái giao dịch tạm thời trong quá trình tổ chức tiệc.
- **Tiêu chí Đạt:** Hiển thị đúng hóa đơn quyết toán cuối từ máy chủ.

---

### Kịch bản 3: Flow C6 / UC30 — Thiệp Mời, Quick Edit Text-Only, QR & Phát Hành

#### Bước 3.1: Xem Thiết kế Thiệp Mời Thật (Bỏ Thiết Kế Hoa Cố Định)

- **Thao tác:** Chuyển sang tab **Thiệp mời**.
- **Quan sát:**
  - Ứng dụng gọi `GET /bookings/{id}/invitations/designs` để nạp danh sách mẫu thiệp thật của tiệc cưới.
  - Thẻ preview hiển thị đúng tên mẫu, mã thiết kế và trạng thái.
  - **Đã gỡ bỏ các dòng kẻ hoa lá giả định (`leafLine`)**: Không còn các yếu tố trang trí hardcode mang danh server template.
  - Các đoạn văn bản hiển thị đúng dữ liệu đã lưu trên server; nếu server chưa có nội dung, hiển thị ô placeholder mờ mang tính gợi ý, không tự ý biến gợi ý thành dữ liệu thật trong state.
- **Tiêu chí Đạt:** Bản xem trước thiệp mời trung thực với DTO của máy chủ.

#### Bước 3.2: Quick Edit Text-Only & Bảo Vệ Unicode NFC / Multiline

- **Thao tác:**
  - Bấm vào nút chỉnh sửa văn bản thiệp cưới để mở màn hình Quick Edit (`invitation-quick-edit-screen`).
  - Nhập văn bản tiếng Việt có dấu đầy đủ vào các trường: Lời chào mừng, Lời nhắn nhủ, Tên Cô dâu & Chú rể, Lời cảm ơn chân trang.
  - Thử nhập xuống dòng (multiline) và kiểm tra các ký tự có dấu đặc biệt (`ạ, ỹ, ể, ồ, đ`).
  - Bấm **Lưu thay đổi văn bản**.
- **Quan sát:**
  - Văn bản được chuẩn hóa Unicode NFC trước khi gửi.
  - Giữ nguyên định dạng xuống dòng và không vượt quá giới hạn ký tự (2000 ký tự cho lời nhắn, 120 ký tự cho tên).
  - Client gửi `PUT /bookings/{id}/invitations/{designId}` kèm `expectedRevision` hiện tại của thiết kế.
  - Sau khi lưu thành công, thông báo cập nhật hiển thị và revision tăng lên đúng số do server trả về.
- **Tiêu chí Đạt:** Chỉnh sửa văn bản thành công, tiếng Việt hiển thị sắc nét không lỗi font hay vỡ ký tự.

#### Bước 3.3: Xử lý Xung Đột Dữ Liệu Stale 409 (2 Thiết Bị Cùng Sửa)

- **Thao tác:**
  - Giả lập xung đột: Mở app trên Thiết bị 1 và Thiết bị 2 cùng vào màn hình chỉnh sửa thiệp.
  - Thiết bị 1 lưu thay đổi trước -> Revision trên server tăng lên.
  - Thiết bị 2 vẫn giữ revision cũ, bấm Lưu thay đổi.
- **Quan sát:**
  - Server trả về lỗi HTTP 409 `CONFLICT`.
  - **Không tự đoán revision**: Ứng dụng tuyệt đối không dùng logic đoán mò kiểu `Math.max(old + 1)` để cố ghi đè.
  - Ứng dụng hiển thị thông báo xung đột rõ ràng: `Nội dung thiệp đã được cập nhật từ một phiên làm việc khác. Vui lòng xem nội dung mới nhất từ máy chủ trước khi tiếp tục.`
  - Cung cấp nút để người dùng chủ động nạp lại bản mới nhất từ server và so sánh trước khi quyết định ghi đè.
- **Tiêu chí Đạt:** Xử lý xung đột minh bạch, bảo vệ dữ liệu người dùng không bị mất mát âm thầm.

#### Bước 3.4: Chống Double-Click & Durable Intent Khi Mất Mạng

- **Thao tác:**
  - Bấm nút Lưu thay đổi liên tục nhiều lần.
  - Tắt Wi-Fi/4G ngay trước khi bấm Lưu để giả lập mất mạng.
- **Quan sát:**
  - Nút bấm bị vô hiệu hóa ngay từ lần bấm đầu tiên.
  - Khi timeout hoặc mạng chập chờn, intent key và payload được giữ nguyên. Khi bấm thử lại, app gửi lại đúng key và payload đó để đảm bảo tính bất biến (`idempotency`), không sinh key mới cho cùng một thao tác sửa đổi.
- **Tiêu chí Đạt:** Không phát sinh duplicate request lên server.

#### Bước 3.5: Phát Hành Thiệp, Đổi Mẫu & Quét Mã QR Chia Sẻ

- **Thao tác:**
  - Tại mẫu thiệp đã hoàn thiện, bấm nút **Phát hành thiệp mời**.
  - Nhập slug mong muốn và xác nhận.
- **Quan sát:**
  - Client gửi `POST /bookings/{id}/invitations/{designId}/publications`.
  - Nhận HTTP 201: Trạng thái chuyển sang `Đã phát hành`.
  - **Mã QR chuẩn**: Mã QR hiển thị trên màn hình được sinh từ thư viện renderer QR chuẩn (`react-native-qrcode-svg`) với payload URL chính thức do server cấp.
  - **Chia sẻ & Sao chép liên kết**: Bấm nút **Chia sẻ liên kết** để mở hộp thoại chia sẻ hệ thống của Android. Liên kết chia sẻ là link xem thiệp công khai (chỉ xem, không có RSVP hay check-in).
  - **Đổi mẫu thiệp**: Khi chuyển sang xem một mẫu thiết kế khác, trạng thái phát hành của mẫu cũ được xóa khỏi view hiện tại, không dùng nhầm URL hay QR của mẫu A cho mẫu B.
  - **Lưu ý về Server Read Recovery**: Hiện tại Backend chưa cung cấp endpoint `GET /publication` độc lập để nạp lại trạng thái phát hành sau khi tắt app; màn hình hiển thị ghi chú trung thực về hạn chế này để Cặp đôi nắm được.
- **Tiêu chí Đạt:** Phát hành, hiển thị QR và chia sẻ link hoạt động mượt mà.

---

### Kịch bản 4: Flow C7 — Đơn In Thiệp Cưới A5 (Chế Độ Chỉ Đọc / Read-Only)

#### Bước 4.1: Xem Danh Sách Đơn In Thiệp (`V0PrintSubflow`)

- **Thao tác:** Từ tab Kế hoạch (hoặc tab Thiệp cưới), bấm vào mục **Đơn in thiệp cưới**.
- **Quan sát:**
  - Ứng dụng gọi `GET /bookings/{id}/print-orders`.
  - Hiển thị danh sách các đơn đặt in: Mã đơn in (`#orderId.slice(0, 8)`), số lượng bản in, quy cách in (khổ A5 tiêu chuẩn), và trạng thái đơn hàng.
  - **Trạng thái đơn in chuẩn xác**:
    - `REQUESTED`: Đang yêu cầu báo giá
    - `QUOTED`: Đã có báo giá từ nhà in
    - `APPROVED`: Cặp đôi đã chấp thuận báo giá
    - `IN_PRODUCTION`: Đang tiến hành in ấn
    - `READY_FOR_HANDOVER`: Đã in xong, sẵn sàng bàn giao
    - `HANDED_OVER`: Đã bàn giao thiệp in cho Cặp đôi
    - `CANCELLED`: Đơn in đã hủy
- **Tiêu chí Đạt:** Trạng thái map chuẩn xác theo enum máy chủ; không suy diễn từ sự tồn tại của `receivableChargeId`.

#### Bước 4.2: Chi Tiết Đơn In & Tính Chất Read-Only trên Mobile MVP

- **Thao tác:** Xem chi tiết các dòng chi phí và đề xuất in ấn trong đơn in.
- **Quan sát:**
  - Hiển thị chi tiết số lượng in, đơn giá mỗi bản, tổng tiền tạm tính hoặc tổng tiền đã duyệt (`serverTotalVnd`).
  - Nếu đơn in có đề xuất thay thế (`replacementProposal`), hiển thị chi tiết số lượng và đơn giá đề xuất mới.
  - **Phạm vi Mobile MVP là CHỈ XEM**: Đúng theo tài liệu Handoff 9.3 (`/print-orders: Chỉ đọc là đủ cho MVP`), trên app **hoàn toàn không có các nút tạo đơn, phê duyệt báo giá, yêu cầu in lại hay hủy đơn**. Mọi thao tác thay đổi đơn in được thực hiện trên Cổng Web hoặc thông qua Quản lý nhà hàng.
- **Tiêu chí Đạt:** Thông tin đơn in hiển thị đầy đủ, không thừa các nút mutation chưa nằm trong phạm vi mobile MVP.

---

### Kịch bản 5: Flow Media — Tải Ảnh Cưới Thật Với Expo Image Picker

#### Bước 5.1: Mở Native Image Picker Thật & Xử Lý Hủy Chọn

- **Thao tác:**
  - Từ tab Kế hoạch, bấm vào mục **Kho ảnh & Media tiệc cưới** (`V0MediaSubflow`).
  - Bấm nút **Chọn ảnh từ thiết bị**.
- **Quan sát:**
  - Ứng dụng yêu cầu quyền truy cập thư viện ảnh của Android (`expo-image-picker`).
  - Nếu người dùng bấm "Từ chối quyền" (Deny Permission) -> Hiển thị thông báo hướng dẫn: `Cần cấp quyền truy cập thư viện ảnh để chọn ảnh tải lên.`
  - Nếu người dùng mở thư viện ảnh rồi bấm nút "Back" hoặc hủy chọn -> App quay lại trạng thái bình thường mà không bị treo hay báo lỗi.
  - **Đã loại bỏ hoàn toàn mockBlob**: Không còn chuỗi giả lập `'sample-private-wedding-media-bytes'` hay thanh tiến trình giả.
- **Tiêu chí Đạt:** Picker thật hoạt động chuẩn xác, xử lý permission và cancel mượt mà.

#### Bước 5.2: Kiểm Tra Định Dạng Ảnh & Giới Hạn Dung Lượng 25MiB

- **Thao tác:**
  - Chọn một bức ảnh thật từ điện thoại (định dạng JPEG, PNG hoặc WebP).
  - Thử chọn một file không hợp lệ hoặc giả lập file vượt quá 25MiB (nếu có).
- **Quan sát:**
  - Nếu file vượt quá 25MiB -> App chặn ngay tại thiết bị và báo lỗi: `Dung lượng tệp vượt quá giới hạn cho phép (tối đa 25MiB). Vui lòng chọn tệp nhỏ hơn.`
  - Nếu file không thuộc các định dạng ảnh cho phép -> Báo lỗi: `Chỉ hỗ trợ tệp ảnh định dạng JPEG, PNG hoặc WebP.`
- **Tiêu chí Đạt:** Validation dung lượng và định dạng ảnh chặt chẽ trước khi tải lên.

#### Bước 5.3: Yêu Cầu Chú Thích Ảnh (Alt Text: 1–250 ký tự) & Tải Lên Multipart Thật

- **Thao tác:**
  - Chọn một bức ảnh hợp lệ (< 25MiB).
  - Ảnh preview hiển thị trên màn hình.
  - Để trống ô "Mô tả / Chú thích ảnh (Alt text)" và bấm Tải ảnh lên.
- **Quan sát:**
  - App chặn và báo lỗi: `Vui lòng nhập mô tả cho ảnh (tối đa 250 ký tự).`
  - Nhập chú thích hợp lệ (ví dụ: `Ảnh cưới cổng đón khách sảnh Diamond`) và bấm **Tải ảnh lên**.
  - Client đóng gói `FormData` multipart gồm tệp ảnh thật (`file`) và `altText`.
  - Gửi request `POST /bookings/{id}/media` với header `Authorization: Bearer <token>`.
  - Nhận HTTP 201: Server trả về `mediaAssetId` và `previewPath`.
  - Ảnh được thêm vào danh sách ảnh vừa tải lên trong phiên làm việc.
- **Tiêu chí Đạt:** Ảnh thật được upload thành công lên máy chủ kèm chú thích chuẩn DTO.

#### Bước 5.4: Kiểm Tra Hạn Chót Tải Ảnh (Dynamic Media Cutoff)

- **Thao tác:**
  - Kiểm tra điều kiện hạn chót tải ảnh hiển thị trên giao diện.
- **Quan sát:**
  - Không hardcode cố định quy tắc 72 giờ như trước.
  - Thời hạn tải ảnh được tính toán linh hoạt dựa trên ngày cưới (`eventDate`), ca tiệc (`LUNCH` hoặc `DINNER`), và chính sách ghi đè của Ban quản lý nếu có.
  - Nếu tiệc cưới đã quá hạn cho phép tải ảnh, nút chọn ảnh bị khóa và app hiển thị cảnh báo: `Tiệc cưới đã kết thúc và quá hạn tải media theo quy định của nhà hàng.`
- **Tiêu chí Đạt:** Chính sách hạn chót động, bảo vệ quyền riêng tư và thời hạn lưu trữ.

#### Bước 5.5: Tính Năng AI Generation & Quản Lý Policy

- **Quan sát:**
  - Không có nút tự sinh ảnh AI thu phí (Paid Generation) hay cấu hình quota media trái phép.
  - Mọi chức năng ngoài phạm vi mobile MVP được ẩn hoặc thông báo rõ ràng cho người dùng.
- **Tiêu chí Đạt:** Không có mock feature hay hành vi vượt thẩm quyền Cặp đôi.

---

### Kịch bản 6: Flow Nhóm Khách & Bàn Tiệc — Dữ Liệu Thật & Loại Bỏ Mock Data

#### Bước 6.1: Nạp Danh Sách Nhóm Khách Thật (`V0GuestsSubflow`)

- **Thao tác:** Từ tab Kế hoạch, bấm vào mục **Nhóm khách & Xếp bàn**.
- **Quan sát:**
  - Ứng dụng gọi `GET /bookings/{id}/guest-groups` và `GET /bookings/{id}/guests`.
  - **Đã loại bỏ hoàn toàn các nhóm giả `g-1, g-2` và tên khách giả `Bác Hai, Cô Ba`**.
  - Nếu tiệc cưới trên server chưa có nhóm khách nào được tạo, giao diện hiển thị thẻ thông báo trống trung thực: `Chưa có nhóm khách mời nào được lưu trên máy chủ. Hai bạn có thể tổ chức nhóm khách mời và phân bổ bàn tiệc thông qua Cổng quản lý Web.`
  - Nếu đã có nhóm khách thật (ví dụ: "Họ Nhà Gái", "Bạn Đại Học"), hiển thị đúng tên nhóm, mã màu đại diện, trạng thái (`ACTIVE`), và danh sách tên khách thật đã gán vào nhóm.
  - **Xếp bàn theo nhóm không bắt buộc danh sách khách định danh**: Nếu nhóm khách chưa nhập tên từng khách cụ thể, app vẫn hiển thị tên nhóm bình thường và ghi rõ `Chưa có tên khách cụ thể (xếp theo nhóm)`.
- **Tiêu chí Đạt:** Dữ liệu phản ánh đúng 100% tình trạng khách mời trên server, không có mock data.

---

## 4. Bảng Tổng Hợp Kiểm Thử & Tiêu Chí Nghiệm Thu (Acceptance Checklist)

Chủ dự án có thể sử dụng bảng kiểm tra này để đánh dấu nghiệm thu từng luồng:

| STT | Luồng / Tính năng          | Mô tả kiểm tra                                                                     | Kết quả mong đợi                                                                                               | Đánh giá |
| :-: | :------------------------- | :--------------------------------------------------------------------------------- | :------------------------------------------------------------------------------------------------------------- | :------: |
|  1  | **C1: Booking Overview**   | Nạp thông tin tiệc cưới từ `GET /couple/bookings` và `GET /bookings/{id}/proposal` | Tên cô dâu, chú rể chuẩn từ profile/hợp đồng; sảnh tiệc đúng catalog; quy mô kế hoạch không phụ thuộc số khách | [ ] Đạt  |
|  2  | **C1: Lịch trình tiệc**    | Màn hình `V0ScheduleSubflow`                                                       | Dùng `effectiveTimeline` thật; không tự sinh revision giả; không check hoàn thành ảo ở mốc đầu                 | [ ] Đạt  |
|  3  | **C1: Race Condition**     | Đổi liên tục giữa 2 Booking của cùng một tài khoản                                 | Dữ liệu booking cũ bị hủy ngay lập tức, không ghi đè sang booking mới                                          | [ ] Đạt  |
|  4  | **C1: Restricted Gate**    | Đăng nhập tài khoản chưa đủ điều kiện `FULL`                                       | Hiển thị cổng chặn và nút mở Web Portal đúng URL cấu hình                                                      | [ ] Đạt  |
|  5  | **C3: Sổ cái & Số dư**     | Xem tổng tiền hợp đồng, đã trả, còn nợ                                             | Số nguyên VND tính từ server; lịch sử thanh toán bất biến                                                      | [ ] Đạt  |
|  6  | **C3: VNPay Sandbox**      | Bấm thanh toán số dư qua VNPay                                                     | URL sandbox hợp lệ; khóa nút chống bấm đúp; intent key bền vững                                                | [ ] Đạt  |
|  7  | **C3: Kết quả thanh toán** | Trình duyệt quay lại app sau khi mở VNPay                                          | Không báo thành công theo redirect; gọi `GET /payments/{attemptId}` để đối soát                                | [ ] Đạt  |
|  8  | **C3: Xem Hợp đồng & PDF** | Màn hình `V0ContractsSubflow`                                                      | Xem danh sách revision, mã băm digest; tải PDF qua native fetch với header Bearer                              | [ ] Đạt  |
|  9  | **C3: Xem Phụ lục**        | Màn hình `V0AppendicesSubflow`                                                     | Xem tổng tiền phụ lục hiệu lực, deltaVnd từng bản, lý do điều chỉnh                                            | [ ] Đạt  |
| 10  | **C3: Chi phí phát sinh**  | Màn hình `V0IncidentalsSubflow`                                                    | Chi tiết số lượng, đơn giá, tổng tiền từng dòng phát sinh; chế độ chỉ đọc                                      | [ ] Đạt  |
| 11  | **C3: Hóa đơn cuối**       | Màn hình `V0InvoicesSubflow`                                                       | Danh sách hóa đơn quyết toán chính thức; phân biệt với sổ cái giao dịch                                        | [ ] Đạt  |
| 12  | **C6: Xem thiệp cưới**     | Bản xem trước thiệp cưới tại tab Thiệp mời                                         | Nạp thiết kế thật DTO; bỏ dòng hoa lá giả định; không biến gợi ý thành dữ liệu thật                            | [ ] Đạt  |
| 13  | **C6: Quick Edit chữ**     | Chỉnh sửa văn bản thiệp cưới                                                       | Giữ nguyên Unicode NFC tiếng Việt có dấu, multiline, giới hạn ký tự; expectedRevision thật                     | [ ] Đạt  |
| 14  | **C6: Stale 409**          | 2 thiết bị cùng sửa thiệp cưới                                                     | Báo xung đột 409, nạp lại bản mới nhất từ server; tuyệt đối không đoán `old + 1`                               | [ ] Đạt  |
| 15  | **C6: QR & Chia sẻ**       | Phát hành thiệp, hiển thị QR và copy link                                          | QR renderer chuẩn; link xem thiệp công khai không có chức năng RSVP/check-in trái phép                         | [ ] Đạt  |
| 16  | **C7: Đơn in thiệp**       | Màn hình `V0PrintSubflow`                                                          | Phạm vi mobile là CHỈ XEM; hiển thị chi tiết số lượng, đơn giá, khổ A5; không có nút mutation                  | [ ] Đạt  |
| 17  | **Media: Chọn ảnh**        | Bấm chọn ảnh từ thiết bị                                                           | Dùng `expo-image-picker` thật; xử lý cấp quyền và hủy chọn mượt mà; xóa mockBlob                               | [ ] Đạt  |
| 18  | **Media: Validation**      | Chọn file > 25MiB hoặc sai định dạng                                               | Chặn tại client trước khi upload; chỉ chấp nhận JPEG/PNG/WebP <= 25MiB                                         | [ ] Đạt  |
| 19  | **Media: Tải ảnh thật**    | Nhập altText và tải ảnh lên server                                                 | Gửi multipart FormData thật; nhận `mediaAssetId` từ server; hiển thị trong phiên                               | [ ] Đạt  |
| 20  | **Media: Cutoff động**     | Kiểm tra hạn chót tải ảnh                                                          | Tính toán linh hoạt theo ngày và ca tiệc; khóa nút khi quá hạn                                                 | [ ] Đạt  |
| 21  | **Khách mời: No Mock**     | Màn hình `V0GuestsSubflow`                                                         | Xóa hoàn toàn `g-1, g-2, Bác Hai, Cô Ba`; đọc dữ liệu thật từ API hoặc hiển thị rỗng trung thực                | [ ] Đạt  |

---

## 5. Kết luận & Khuyến nghị

- **Về tính toàn vẹn chất lượng:** Mã nguồn đã vượt qua kiểm tra tĩnh nghiêm ngặt (`npm run lint`, `npm run typecheck`, `npm run format:check`). Không có bất kỳ lỗi cú pháp, kiểu dữ liệu hay quy tắc format nào bị bỏ qua.
- **Về trải nghiệm người dùng:** Các luồng nghiệp vụ trên mobile app hiện đã phản ánh trung thực 100% dữ liệu từ máy chủ, tôn trọng phân quyền Cặp đôi, bảo vệ dữ liệu tài chính bất biến và mang lại giao diện tinh tế, chuẩn mực cho người dùng cuối.
- Mọi thắc mắc hoặc cần hỗ trợ thêm về kịch bản kiểm thử, chủ dự án có thể phản hồi trực tiếp để được giải đáp kịp thời.
