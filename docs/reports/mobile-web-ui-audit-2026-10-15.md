# Báo Cáo Kiểm Thử Giao Diện Thực Tế Kênh Mobile Web (wedding-app)
> **Ngày thực hiện:** 15/10/2026  
> **Ứng dụng kiểm thử:** `wedding-app` (Expo Web Mobile Emulation)  
> **Server Frontend:** `http://localhost:8081` (Metro Bundler Web)  
> **Backend Staging Origin:** `https://wedding-be-production-e1dc.up.railway.app/api/v1`  
> **Cấu hình Mobile Emulation:** iPhone 16 Pro Max (`440x956` CSS pixels, `deviceScaleFactor: 3`, `isMobile: true`, `hasTouch: true`, User-Agent: `Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1`)  
> **Tài khoản kiểm thử:** `couple123@example.test` (Mật khẩu đã được bảo mật tuyệt đối theo nguyên tắc an toàn thông tin)  
> **Thư mục ảnh chụp bằng chứng:** `docs/reports/assets/mobile-web-ui-audit-2026-10-15/`  

---

## MỤC LỤC
1. [Phần A: Thiết Lập Môi Trường & Giới Hạn Kiểm Thử](#phần-a-thiết-lập-môi-trường--giới-hạn-kiểm-thử)
2. [Phần B: Tổng Hợp Kết Quả & Phân Loại Hiện Trạng](#phần-b-tổng-hợp-kết-quả--phân-loại-hiện-trạng)
3. [Phần C: Bảng Chi Tiết Toàn Bộ 68 API Kênh Android (A68-01 -> A68-68)](#phần-c-bảng-chi-tiết-toàn-bộ-68-api-kênh-android-a68-01---a68-68)
4. [Phần D: Các API Bổ Trợ Được Kiểm Thử Thực Tế](#phần-d-các-api-bổ-trợ-được-kiểm-thử-thực-tế)
5. [Phần E: Danh Mục Khiếm Khuyết UI & Runtime (Defect Log P0–P3)](#phần-e-danh-mục-khiếm-khuyết-ui--runtime-defect-log-p0p3)
6. [Phần F: Nhật Ký Tác Động Dữ Liệu & Khôi Phục (Data Side-Effects Audit)](#phần-f-nhật-ký-tác-động-dữ-liệu--khôi-phục-data-side-effects-audit)
7. [Phần G: Khác Biệt Giữa Expo Web Mobile Emulation & Thiết Bị Android Thật](#phần-g-khác-biệt-giữa-expo-web-mobile-emulation--thiết-bị-android-thật)

---

## Phần A: Thiết Lập Môi Trường & Giới Hạn Kiểm Thử

### 1. Thông số Kỹ thuật Môi trường Emulation
- **Công cụ điều khiển:** `chrome-devtools` MCP kết nối tới cửa sổ Chrome kiểm thử độc lập (không can thiệp vào tab làm việc của người dùng).
- **Viewport:** Chiều rộng `440px`, chiều cao `956px`, tỷ lệ điểm ảnh `deviceScaleFactor: 3`.
- **Cờ thiết bị:** `isMobile: true`, `hasTouch: true`.
- **User-Agent:** Mobile Safari iPhone 16 Pro Max.
- **Xác nhận giao diện:** Giao diện co giãn chính xác ở tỷ lệ hẹp dọc của điện thoại di động (không ở chế độ desktop layout), các thành phần form, navigation tab bar và nút bấm hiển thị ở tỷ lệ kích thước cảm ứng.

### 2. Hiện trạng Tài khoản & Dữ liệu Tiền đề (Fixture)
- **Tài khoản:** `couple123@example.test` (Vai trò `COUPLE`).
- **Trạng thái Tiệc cưới trên Backend:** Khi gọi `GET /api/v1/couple/bookings?client=ANDROID&limit=20`, máy chủ backend trả về HTTP 200 với dữ liệu rỗng: `{"data":[],"nextCursor":null}`.
- **Hệ quả trên Giao diện UI:**
  - Màn hình Tổng quan (`CoupleOverviewScreen`) hiển thị thẻ thông báo: *"Chưa có kế hoạch đã xác nhận. Vui lòng liên hệ quản lý để được phân công tiệc cưới."* (Xem ảnh minh chứng `04_overview_pre_deposit.png`).
  - Do tài khoản chưa có bất kỳ tiệc cưới nào (`bookingId`), ứng dụng không thể khởi tạo shell điều hướng tiệc cưới (`V0CompanionShell`).
  - Toàn bộ các màn hình phụ thuộc vào `bookingId` hợp lệ (Lịch trình, Hợp đồng, Phụ lục, Thiệp cưới chi tiết, Đơn in ấn, Điểm danh khách mời, Quyết toán hóa đơn) không thể mở từ luồng điều hướng tự nhiên của người dùng và được đánh dấu trung thực là `BLOCKED_BY_FIXTURE` (Thiếu dữ liệu tiệc cưới trên sandbox).
  - Khi cố ý truy cập trực tiếp đường dẫn `/billing` và nhập một mã booking ngẫu nhiên, backend trả về HTTP 422 (`Unprocessable Entity: UUID format/Booking not found`), giao diện hiển thị banner cảnh báo lỗi chính xác (Xem ảnh `10_billing_422_rejected.png`).

---

## Phần B: Tổng Hợp Kết Quả & Phân Loại Hiện Trạng

### Bảng Thống Kê Phân Loại 68 API Kênh Android:
| Nhóm Trạng Thái | Số Lượng API | Danh Sách Mã API | Diễn Giải Chi Tiết |
|:---|:---:|:---|:---|
| **PASS (Runtime Observed)** | **10** | A68-23, A68-24, A68-25, A68-26, A68-54, A68-55, A68-56, A68-57, A68-60, A68-68 | Đã trực tiếp thao tác trên UI, kích hoạt request mạng, quan sát HTTP status thành công (200, 201, 202) và giao diện cập nhật chính xác. |
| **FAIL (Defect Detected)** | **3** | A68-19, A68-20, A68-21 | - A68-21: Logout có lỗi Unhandled Rejection khi token hết hạn.<br>- A68-19, A68-20: Thiếu điểm kích hoạt (UI trigger) trên màn hình Account. |
| **BLOCKED_BY_FIXTURE / NOT_TESTED** | **52** | A68-01..A68-18, A68-22, A68-27..A68-37, A68-38..A68-43, A68-45..A68-46, A68-47..A68-52, A68-58, A68-59, A68-61..A68-67 | Tài khoản test có 0 booking nên không vào được shell tiệc; hoặc thiếu OTP email thực tế từ worker backend để hoàn tất bước cuối. |
| **UNSUPPORTED_ON_WEB / BLOCKED_BY_BACKEND** | **3** | A68-44, A68-53, (A68-09/36 PDF Share) | - A68-44: Thiếu cấu hình native push FCM.<br>- A68-53: Backend chặn cọc trên Android per BR-05.<br>- A68-09/A68-36: Native File Sharing không hỗ trợ trên Web. |
| **TỔNG CỘNG** | **68** | | **100% danh mục API chuẩn** |

---

## Phần C: Bảng Chi Tiết Toàn Bộ 68 API Kênh Android (A68-01 -> A68-68)

| Mã API | Method & Path | Màn hình / Điểm chạm UI | Thao tác kiểm thử thực tế | Kết quả mong đợi vs Quan sát thực tế | Network Evidence (Status / Error) | Trạng thái | Bằng chứng Screenshot |
|:---|:---|:---|:---|:---|:---|:---:|:---|
| **A68-01** | `GET /bookings/{bookingId}/proposal` | Tab Lịch trình (`schedule`) | Mở tab Lịch trình từ shell tiệc cưới | Tải đề xuất tiệc cưới. *Thực tế:* Không thể mở do tài khoản test có 0 booking (`data: []`). | Chưa kích hoạt mạng | `BLOCKED_BY_FIXTURE` | `04_overview_pre_deposit.png` |
| **A68-02** | `POST /bookings/{bookingId}/cancellation-requests` | Tab Lịch trình (`schedule`) | Bấm nút "Yêu cầu hủy tiệc" | Mở form hủy và gửi yêu cầu hủy. *Thực tế:* Không thể mở do thiếu booking. | Chưa kích hoạt mạng | `BLOCKED_BY_FIXTURE` | `04_overview_pre_deposit.png` |
| **A68-03** | `POST /bookings/{bookingId}/change-requests` | Tab Lịch trình (`schedule`) | Bấm nút "Gửi yêu cầu thay đổi" | Gửi yêu cầu sửa lịch trình kèm revision. *Thực tế:* Thiếu booking fixture. | Chưa kích hoạt mạng | `BLOCKED_BY_FIXTURE` | `04_overview_pre_deposit.png` |
| **A68-04** | `POST /bookings/{bookingId}/timeline-revisions` | Tab Lịch trình (`schedule`) | Bấm "+ Tạo bản sửa đổi lịch trình" | Tạo revision lịch trình mới. *Thực tế:* Thiếu booking fixture. | Chưa kích hoạt mạng | `BLOCKED_BY_FIXTURE` | `04_overview_pre_deposit.png` |
| **A68-05** | `POST /bookings/{bookingId}/timeline-revisions/{id}/approvals` | Tab Lịch trình (`schedule`) | Bấm "Duyệt bản lịch trình" | Phê duyệt bản lịch trình chờ duyệt. *Thực tế:* Thiếu booking fixture. | Chưa kích hoạt mạng | `BLOCKED_BY_FIXTURE` | `04_overview_pre_deposit.png` |
| **A68-06** | `POST /bookings/{bookingId}/timeline-revisions/{id}/withdrawals` | Tab Lịch trình (`schedule`) | Bấm "Rút duyệt bản lịch trình" | Rút phê duyệt bản lịch trình. *Thực tế:* Thiếu booking fixture. | Chưa kích hoạt mạng | `BLOCKED_BY_FIXTURE` | `04_overview_pre_deposit.png` |
| **A68-07** | `GET /bookings/{bookingId}/contract-appendices` | Tab Phụ lục (`appendices`) | Mở danh sách phụ lục | Hiển thị bảng kê phụ lục và delta trước-sau. *Thực tế:* Thiếu booking fixture. | Chưa kích hoạt mạng | `BLOCKED_BY_FIXTURE` | `04_overview_pre_deposit.png` |
| **A68-08** | `GET /bookings/{bookingId}/contracts` | Tab Hợp đồng (`contracts`) | Mở danh sách hợp đồng | Hiển thị lịch sử revision hợp đồng. *Thực tế:* Thiếu booking fixture. | Chưa kích hoạt mạng | `BLOCKED_BY_FIXTURE` | `04_overview_pre_deposit.png` |
| **A68-09** | `GET /bookings/{bookingId}/contracts/{id}/pdf` | Tab Hợp đồng (`contracts`) | Bấm nút "Tải tệp PDF hợp đồng" | Tải file nhị phân và mở qua Share Sheet. *Thực tế:* `expo-sharing` không hỗ trợ trên Web. | Chưa kích hoạt mạng | `UNSUPPORTED_ON_WEB` | `04_overview_pre_deposit.png` |
| **A68-10** | `GET /consultations/{id}/couple-profile` | Tab Hợp đồng (`contracts`) | Xem thẻ hồ sơ pháp lý cô dâu chú rể | Tải tên cô dâu & chú rể từ consultation. *Thực tế:* Thiếu consultation fixture. | Chưa kích hoạt mạng | `BLOCKED_BY_FIXTURE` | `04_overview_pre_deposit.png` |
| **A68-11** | `PATCH /consultations/{id}/couple-profile` | Tab Hợp đồng (`contracts`) | Bấm "Cập nhật tên" -> "Lưu" | Cập nhật họ tên pháp lý với `expectedRevision`. *Thực tế:* Thiếu fixture. | Chưa kích hoạt mạng | `BLOCKED_BY_FIXTURE` | `04_overview_pre_deposit.png` |
| **A68-12** | `POST /bookings/{bookingId}/contract-appendices` | Tab Phụ lục (`appendices`) | Bấm "+ Tạo bản nháp phụ lục" | Mở form tổng hợp dòng thương mại và tạo nháp phụ lục. *Thực tế:* Thiếu booking. | Chưa kích hoạt mạng | `BLOCKED_BY_FIXTURE` | `04_overview_pre_deposit.png` |
| **A68-13** | `POST /bookings/{bookingId}/contract-appendices/{id}/approvals` | Tab Phụ lục (`appendices`) | Bấm "Phê duyệt phụ lục" | Duyệt phụ lục đang ở trạng thái chờ duyệt. *Thực tế:* Thiếu booking. | Chưa kích hoạt mạng | `BLOCKED_BY_FIXTURE` | `04_overview_pre_deposit.png` |
| **A68-14** | `POST /bookings/{bookingId}/contract-appendices/{id}/submissions` | Tab Phụ lục (`appendices`) | Bấm "Gửi duyệt phụ lục" | Chuyển trạng thái phụ lục từ DRAFT sang chờ duyệt. *Thực tế:* Thiếu booking. | Chưa kích hoạt mạng | `BLOCKED_BY_FIXTURE` | `04_overview_pre_deposit.png` |
| **A68-15** | `POST /bookings/{bookingId}/contracts` | Tab Hợp đồng (`contracts`) | Bấm "+ Tạo bản nháp mới" | Thêm dòng MENU từ catalog và tạo revision hợp đồng. *Thực tế:* Thiếu booking. | Chưa kích hoạt mạng | `BLOCKED_BY_FIXTURE` | `04_overview_pre_deposit.png` |
| **A68-16** | `POST /bookings/{bookingId}/contracts/{id}/approvals` | Tab Hợp đồng (`contracts`) | Bấm "Phê duyệt hợp đồng" | Cặp đôi ký duyệt hợp đồng điện tử. *Thực tế:* Thiếu booking. | Chưa kích hoạt mạng | `BLOCKED_BY_FIXTURE` | `04_overview_pre_deposit.png` |
| **A68-17** | `POST /bookings/{bookingId}/contracts/{id}/submissions` | Tab Hợp đồng (`contracts`) | Bấm "Gửi duyệt hợp đồng" | Gửi duyệt bản nháp hợp đồng. *Thực tế:* Thiếu booking. | Chưa kích hoạt mạng | `BLOCKED_BY_FIXTURE` | `04_overview_pre_deposit.png` |
| **A68-18** | `POST /bookings/{bookingId}/contracts/{id}/withdrawals` | Tab Hợp đồng (`contracts`) | Bấm "Rút phê duyệt" | Rút quyết định duyệt hợp đồng khi cần sửa lại. *Thực tế:* Thiếu booking. | Chưa kích hoạt mạng | `BLOCKED_BY_FIXTURE` | `04_overview_pre_deposit.png` |
| **A68-19** | `GET /health/live` | Tab Tài khoản (`account`) | Kiểm tra thẻ Trạng thái máy chủ | **Mong đợi:** Thẻ hiển thị trạng thái `LIVE`. **Thực tế:** Màn hình `v0-account-tab.tsx` KHÔNG CÓ component hay nút gọi API này. | Không gọi từ UI | `FAIL` (Defect P2) | `05_account_profile_sessions.png` |
| **A68-20** | `GET /health/ready` | Tab Tài khoản (`account`) | Kiểm tra thẻ Trạng thái cơ sở dữ liệu | **Mong đợi:** Thẻ hiển thị trạng thái `READY`. **Thực tế:** Không có component gọi API này trên UI. | Không gọi từ UI | `FAIL` (Defect P2) | `05_account_profile_sessions.png` |
| **A68-21** | `DELETE /auth/sessions/current` | Tab Tài khoản (`account`) | Bấm nút "Đăng xuất" | **Mong đợi:** Xóa session backend và xóa token client. **Thực tế:** Giao diện đăng xuất thành công, nhưng trong console xuất hiện lỗi Unhandled Rejection nếu token hết hạn. | `DELETE /auth/sessions/current` (401 Unauthorized khi token cũ) | `FAIL` (Defect P2) | `11_logged_out_screen.png` |
| **A68-22** | `DELETE /auth/sessions/{sessionId}` | Tab Phiên (`sessions`) | Bấm nút "Thu hồi" phiên khác | Thu hồi quyền của phiên thiết bị khác từ xa. *Thực tế:* Chỉ có 1 phiên thiết bị hiện hành ("Phiên này"). | Chưa có phiên thứ 2 | `NOT_TESTED` | `05_account_profile_sessions.png` |
| **A68-23** | `GET /auth/me` | Tự động sau đăng nhập | Đăng nhập tài khoản `couple123@example.test` | Tải thông tin người dùng: ID, email, role `COUPLE`. Hiển thị đầy đủ trên màn hình tổng quan và tài khoản. | `GET /auth/me` -> **HTTP 200 OK** | `PASS` | `04_overview_pre_deposit.png`, `05_account_profile_sessions.png` |
| **A68-24** | `GET /auth/sessions` | Tab Tài khoản (`account`) | Cuộn xuống mục "Danh sách phiên hoạt động" | Hiển thị danh sách thiết bị đang đăng nhập kèm IP, User-Agent và badge "Phiên này". | `GET /auth/sessions` -> **HTTP 200 OK** | `PASS` | `05_account_profile_sessions.png` |
| **A68-25** | `POST /auth/android-session-refreshes` | Chạy ngầm tự động | Thực hiện thao tác API khi access token hết hạn | Tự động gia hạn access token từ refresh token mà không làm gián đoạn trải nghiệm người dùng. | `POST /auth/android-session-refreshes` -> **HTTP 200 OK** | `PASS` | Quan sát trực tiếp trên network log của DevTools |
| **A68-26** | `POST /auth/android-sessions` | Màn hình Đăng nhập (`login.tsx`) | Nhập Email + Mật khẩu, bấm "Đăng nhập" | Xác thực phiên thành công, nhận access/refresh token, chuyển vào màn hình chính. | `POST /auth/android-sessions` -> **HTTP 201 Created** | `PASS` | `01_login_initial.png`, `04_overview_pre_deposit.png` |
| **A68-27** | `GET /bookings/{bookingId}/print-orders` | Tab In ấn (`print`) | Chuyển sang subflow In ấn | Tải danh sách đơn đặt in thiệp cưới giấy. *Thực tế:* Thiếu booking fixture. | Chưa kích hoạt mạng | `BLOCKED_BY_FIXTURE` | `04_overview_pre_deposit.png` |
| **A68-28** | `GET /bookings/{bookingId}/print-orders/{id}` | Tab In ấn (`print`) | Chọn 1 đơn in trong danh sách | Xem chi tiết quy cách giấy và tiến độ giao hàng. *Thực tế:* Thiếu booking fixture. | Chưa kích hoạt mạng | `BLOCKED_BY_FIXTURE` | `04_overview_pre_deposit.png` |
| **A68-29** | `POST /bookings/{bookingId}/print-orders` | Tab In ấn (`print`) | Bấm "+ Đặt in thiệp mới" | Tạo đơn đặt in với Idempotency-Key tất định. *Thực tế:* Thiếu booking fixture. | Chưa kích hoạt mạng | `BLOCKED_BY_FIXTURE` | `04_overview_pre_deposit.png` |
| **A68-30** | `POST /bookings/{bookingId}/print-orders/{id}/approval` | Tab In ấn (`print`) | Bấm "Duyệt mẫu in thiệp" | Phê duyệt bản in thử `PROOF_READY`. *Thực tế:* Thiếu booking fixture. | Chưa kích hoạt mạng | `BLOCKED_BY_FIXTURE` | `04_overview_pre_deposit.png` |
| **A68-31** | `POST /bookings/{bookingId}/print-orders/{id}/cancellation` | Tab In ấn (`print`) | Bấm "Hủy đơn in" | Hủy đơn in chưa sản xuất. *Thực tế:* Thiếu booking fixture. | Chưa kích hoạt mạng | `BLOCKED_BY_FIXTURE` | `04_overview_pre_deposit.png` |
| **A68-32** | `POST /bookings/{bookingId}/print-orders/{id}/cancellation-intents` | Tab In ấn (`print`) | Bấm "Đăng ký ý định hủy" | Ghi nhận ý định hủy đơn in an toàn. *Thực tế:* Thiếu booking fixture. | Chưa kích hoạt mạng | `BLOCKED_BY_FIXTURE` | `04_overview_pre_deposit.png` |
| **A68-33** | `POST /bookings/{bookingId}/print-orders/{id}/replacement-approvals` | Tab In ấn (`print`) | Bấm "Duyệt bản in thay thế" | Duyệt bản in thay thế sau khi chỉnh sửa. *Thực tế:* Thiếu booking fixture. | Chưa kích hoạt mạng | `BLOCKED_BY_FIXTURE` | `04_overview_pre_deposit.png` |
| **A68-34** | `GET /bookings/{bookingId}/invitations` | Tab Thiệp cưới (`invite`) | Mở tab Thiệp cưới | Tải danh sách thiết kế thiệp của tiệc cưới. *Thực tế:* Thiếu booking fixture. | Chưa kích hoạt mạng | `BLOCKED_BY_FIXTURE` | `04_overview_pre_deposit.png` |
| **A68-35** | `GET /bookings/{bookingId}/invitations/{designId}` | Tab Thiệp cưới (`invite`) | Chọn 1 thiệp cưới | Tải cấu trúc thiết kế thiệp chi tiết. *Thực tế:* Thiếu booking fixture. | Chưa kích hoạt mạng | `BLOCKED_BY_FIXTURE` | `04_overview_pre_deposit.png` |
| **A68-36** | `GET /bookings/{bookingId}/printable-revisions/{id}/file` | Tab In ấn (`print`) | Bấm "Tải tệp in thiệp A5" | Tải tệp in nhị phân và mở qua Share Sheet. *Thực tế:* Không hỗ trợ trên Web. | Chưa kích hoạt mạng | `UNSUPPORTED_ON_WEB` | `04_overview_pre_deposit.png` |
| **A68-37** | `GET /invitation-templates` | Tab Thiệp cưới (`invite`) | Cuộn xem "Mẫu thiệp cưới có sẵn" | Tải lưới mẫu thiệp có sẵn. *Thực tế:* Gating qua booking shell. | Chưa kích hoạt mạng | `NOT_TESTED` | `04_overview_pre_deposit.png` |
| **A68-38** | `DELETE /notifications/android-installations/{id}` | Tab Thông báo (`notifications`) | Bấm "Gỡ thiết bị" | Xóa đăng ký nhận push của thiết bị. *Thực tế:* Gating qua booking shell. | Chưa kích hoạt mạng | `NOT_TESTED` | `04_overview_pre_deposit.png` |
| **A68-39** | `GET /notifications/android-installations` | Tab Thông báo (`notifications`) | Mở mục Thiết bị đã đăng ký | Liệt kê các token thiết bị Android. *Thực tế:* Gating qua booking shell. | Chưa kích hoạt mạng | `NOT_TESTED` | `04_overview_pre_deposit.png` |
| **A68-40** | `GET /notifications/inbox` | Tab Thông báo (`notifications`) | Mở Hộp thư thông báo | Tải danh sách tin thông báo có phân trang `nextCursor`. *Thực tế:* Gating qua booking shell. | Chưa kích hoạt mạng | `NOT_TESTED` | `04_overview_pre_deposit.png` |
| **A68-41** | `GET /notifications/preferences` | Tab Thông báo (`notifications`) | Mở Cài đặt kênh thông báo | Tải cấu hình Email, SMS, Push từ máy chủ. *Thực tế:* Gating qua booking shell. | Chưa kích hoạt mạng | `NOT_TESTED` | `04_overview_pre_deposit.png` |
| **A68-42** | `GET /notifications/unread-count` | Tab Thông báo & Badge | Tải badge số tin chưa đọc | Hiển thị số lượng tin chưa đọc trên tab bar. *Thực tế:* Gating qua booking shell. | Chưa kích hoạt mạng | `NOT_TESTED` | `04_overview_pre_deposit.png` |
| **A68-43** | `PATCH /notifications/preferences` | Tab Thông báo (`notifications`) | Bật/tắt switch kênh nhận tin | Cập nhật cấu hình thông báo với `expectedRevision`. *Thực tế:* Gating qua booking shell. | Chưa kích hoạt mạng | `NOT_TESTED` | `04_overview_pre_deposit.png` |
| **A68-44** | `POST /notifications/android-installations` | Tab Thông báo (`notifications`) | Bấm "Đăng ký thiết bị này" | Bị chặn cấu hình native: thiếu `google-services.json` trong `app.config.ts`, thiếu SDK native push và worker backend đang tắt. | Chưa kích hoạt mạng | `BLOCKED_BY_NATIVE` | `04_overview_pre_deposit.png` |
| **A68-45** | `POST /notifications/inbox/read-all` | Tab Thông báo (`notifications`) | Bấm "Đánh dấu tất cả đã đọc" | Cập nhật toàn bộ tin sang trạng thái đã đọc. *Thực tế:* Gating qua booking shell. | Chưa kích hoạt mạng | `NOT_TESTED` | `04_overview_pre_deposit.png` |
| **A68-46** | `POST /notifications/inbox/{id}/read` | Tab Thông báo (`notifications`) | Nhấn vào 1 tin thông báo | Đánh dấu đã đọc cho từng tin riêng lẻ. *Thực tế:* Gating qua booking shell. | Chưa kích hoạt mạng | `NOT_TESTED` | `04_overview_pre_deposit.png` |
| **A68-47** | `GET /bookings/{bookingId}/billing` | Màn hình Thanh toán (`billing.tsx`) | Mở màn hình `/billing?bookingId=...` | Hiển thị tổng quan thanh toán, tiền cọc, số dư. Nhập booking không tồn tại bị trả lỗi 422. | `GET /bookings/{id}/proposal` -> **HTTP 422** | `BLOCKED_BY_FIXTURE` | `09_billing_initial.png`, `10_billing_422_rejected.png` |
| **A68-48** | `GET /bookings/{bookingId}/final-invoices` | Màn hình Thanh toán (`billing.tsx`) | Xem mục Hóa đơn quyết toán | Liệt kê các bản hóa đơn quyết toán bất biến. *Thực tế:* Thiếu booking hợp lệ. | Chưa kích hoạt mạng | `BLOCKED_BY_FIXTURE` | `09_billing_initial.png` |
| **A68-49** | `GET /bookings/{bookingId}/final-invoices/{id}` | Màn hình Chi tiết hóa đơn | Bấm "Xem chi tiết bảng kê" | Hiển thị bảng kê chi tiết từng dòng dịch vụ. *Thực tế:* Thiếu booking hợp lệ. | Chưa kích hoạt mạng | `BLOCKED_BY_FIXTURE` | `09_billing_initial.png` |
| **A68-50** | `GET /bookings/{bookingId}/incidental-expenses` | Màn hình Thanh toán (`billing.tsx`) | Xem mục Chi phí phát sinh | Hiển thị danh sách phát sinh ngoài hợp đồng. *Thực tế:* Thiếu booking hợp lệ. | Chưa kích hoạt mạng | `BLOCKED_BY_FIXTURE` | `09_billing_initial.png` |
| **A68-51** | `GET /bookings/{bookingId}/payments/{attemptId}` | Màn hình Thanh toán -> Đối soát | Tự động gọi khi quay lại từ VNPay | Đối soát kết quả thanh toán với VNPay sandbox. *Thực tế:* Thiếu giao dịch cọc/số dư. | Chưa kích hoạt mạng | `BLOCKED_BY_FIXTURE` | `09_billing_initial.png` |
| **A68-52** | `POST /bookings/{bookingId}/payments/balance` | Màn hình Thanh toán (`billing.tsx`) | Bấm "Thanh toán số dư quyết toán" | Khởi tạo giao dịch thanh toán số dư qua VNPay. *Thực tế:* Thiếu hóa đơn quyết toán. | Chưa kích hoạt mạng | `BLOCKED_BY_FIXTURE` | `09_billing_initial.png` |
| **A68-53** | `POST /bookings/{bookingId}/payments/deposit` | Màn hình Thanh toán (`billing.tsx`) | Bấm "Thử đặt cọc trên Android (A68-53)" | Backend chặn Couple RESTRICTED trên Android per BR-05; hiển thị cảnh báo và chuyển hướng Web Portal. | Đã triển khai nút chặn trên UI | `BLOCKED_BY_BACKEND` | `09_billing_initial.png` |
| **A68-54** | `GET /auth/profile` | Tab Tài khoản (`account`) | Vào Tab Tài khoản | Hiển thị chính xác tên người dùng, email và số điện thoại. | `GET /auth/profile` -> **HTTP 200 OK** | `PASS` | `05_account_profile_sessions.png` |
| **A68-55** | `GET /couple/bookings` | Tab Tổng quan (`overview`) | Tự động gọi khi mở ứng dụng sau đăng nhập | Tải danh sách tiệc cưới của cặp đôi. Trả về mảng rỗng `[]` chuẩn xác. | `GET /couple/bookings?client=ANDROID&limit=20` -> **HTTP 200 OK** | `PASS` | `04_overview_pre_deposit.png` |
| **A68-56** | `PATCH /auth/profile` | Tab Tài khoản (`account`) | Bấm "Chỉnh sửa" -> nhập tên -> bấm "Lưu hồ sơ" | Cập nhật hồ sơ người dùng kèm `expectedRevision`. Đã thử nghiệm đổi tên sang `couple123_test` và khôi phục thành công về `couple123`. | `PATCH /auth/profile` -> **HTTP 200 OK** | `PASS` | `06_profile_updated.png`, `07_profile_restored.png` |
| **A68-57** | `POST /auth/password-change-otp-requests` | Tab Tài khoản -> Đổi mật khẩu | Bấm nút "Gửi OTP đổi mật khẩu" | Gửi mã OTP xác nhận về email tài khoản. Giao diện xuất hiện đồng hồ đếm ngược 60 giây và form nhập OTP. | `POST /auth/password-change-otp-requests` -> **HTTP 202 Accepted** | `PASS` | `08_otp_requested.png` |
| **A68-58** | `POST /auth/password-changes` | Tab Tài khoản -> Đổi mật khẩu | Nhập mật khẩu cũ, mật khẩu mới, mã OTP -> bấm "Xác nhận đổi" | Xác nhận đổi mật khẩu với OTP email. Dừng lại tại bước này để không thay đổi mật khẩu tài khoản test của chủ dự án. | Không gửi OTP giả | `NOT_TESTED` (Bảo toàn mật khẩu) | `08_otp_requested.png` |
| **A68-59** | `POST /auth/password-otp-completions` | Màn hình Quên mật khẩu (`login.tsx`) | Nhập mã OTP và mật khẩu mới -> "Hoàn tất đặt lại" | Đặt lại mật khẩu tài khoản khi quên mật khẩu. Dừng lại do không có quyền truy cập hộp thư email nhận OTP thực tế. | Không gửi OTP giả | `BLOCKED_BY_FIXTURE` (Thiếu OTP email) | `12_forgot_password_otp_form.png` |
| **A68-60** | `POST /auth/password-otp-requests` | Màn hình Đăng nhập -> Quên mật khẩu | Bấm "Quên mật khẩu?", nhập email, bấm "Gửi mã xác nhận" | Khởi tạo yêu cầu cấp mã OTP đặt lại mật khẩu qua email. Giao diện chuyển sang bước nhập mã OTP. | `POST /auth/password-otp-requests` -> **HTTP 202 Accepted** | `PASS` | `12_forgot_password_otp_form.png` |
| **A68-61** | `GET /bookings/{bookingId}/attendance-summary` | Tab Khách mời (`guests`) | Mở tab Khách mời | Tải tổng kết điểm danh (phân biệt `NONE` với `0`). *Thực tế:* Thiếu booking fixture. | Chưa kích hoạt mạng | `BLOCKED_BY_FIXTURE` | `04_overview_pre_deposit.png` |
| **A68-62** | `GET /bookings/{bookingId}/check-in-settings` | Tab Khách mời (`guests`) | Xem Cài đặt điểm danh | Hiển thị chế độ `NONE` hoặc `BY_GUEST_NAME`. *Thực tế:* Thiếu booking fixture. | Chưa kích hoạt mạng | `BLOCKED_BY_FIXTURE` | `04_overview_pre_deposit.png` |
| **A68-63** | `PATCH /bookings/{bookingId}/check-in-settings` | Tab Khách mời (`guests`) | Switch Bật/Tắt điểm danh theo tên | Cập nhật cấu hình điểm danh với `expectedRevision`. *Thực tế:* Thiếu booking fixture. | Chưa kích hoạt mạng | `BLOCKED_BY_FIXTURE` | `04_overview_pre_deposit.png` |
| **A68-64** | `GET /catalog/dishes` | Tab Dịch vụ (`catalog`) | Tìm kiếm món ăn theo từ khóa | Tải danh mục món ăn kèm đơn giá VND. *Thực tế:* Gating qua booking shell. | Chưa kích hoạt mạng | `NOT_TESTED` | `04_overview_pre_deposit.png` |
| **A68-65** | `GET /catalog/halls` | Tab Dịch vụ (`catalog`) | Xem danh sách sảnh tiệc | Tải danh sách sảnh tiệc cưới và sức chứa. *Thực tế:* Gating qua booking shell. | Chưa kích hoạt mạng | `NOT_TESTED` | `04_overview_pre_deposit.png` |
| **A68-66** | `GET /catalog/halls/{hallId}` | Tab Dịch vụ (`catalog`) | Xem chi tiết 1 sảnh tiệc | Tải thông số kỹ thuật, hình ảnh và tiện ích sảnh. *Thực tế:* Gating qua booking shell. | Chưa kích hoạt mạng | `NOT_TESTED` | `04_overview_pre_deposit.png` |
| **A68-67** | `GET /catalog/menu-packages` | Tab Dịch vụ (`catalog`) | Xem danh sách gói thực đơn | Tải các gói set menu trọn gói. *Thực tế:* Gating qua booking shell. | Chưa kích hoạt mạng | `NOT_TESTED` | `04_overview_pre_deposit.png` |
| **A68-68** | `GET /catalog/restaurant` | Tab Tổng quan (`overview`) & Dịch vụ | Tự động nạp khi mở màn hình chính | Tải thông tin nhà hàng tiệc cưới (tên nhà hàng, hotline, địa chỉ) hiển thị trên header. | `GET /catalog/restaurant` -> **HTTP 200 OK** | `PASS` | `04_overview_pre_deposit.png` |

---

## Phần D: Các API Bổ Trợ Được Kiểm Thử Thực Tế

| Tên Tính Năng Bổ Trợ | Tuyến Đường (Route) | Thao Tác Thực Hiện | Kết Quả Quan Sát Được | Bằng Chứng Screenshot |
|:---|:---|:---|:---|:---|
| **Chỉnh sửa Nhanh Thiệp Cưới (Quick Edit Invitation Text)** | `/(couple)/invitation?bookingId=...` | Điều hướng trực tiếp vào route chỉnh sửa nội dung thiệp cưới: nhập Lời chào, Tên cô dâu chú rể tiếng Việt NFC có dấu và dấu xuống dòng. | Khung xem trước (Live Card Preview) hiển thị chuẩn xác font chữ và bố cục thẻ thiệp. Khi bấm "Lưu thay đổi", ứng dụng hiển thị thông báo an toàn: *"Chưa có thiết kế thiệp cưới nào được tạo cho tiệc này"* thay vì phát sinh lỗi crash. | `13_invitation_quick_edit.png`, `14_invitation_preview_rendered.png`, `15_invitation_no_design_notice.png` |
| **Màn hình Đặt Lại Mật Khẩu Độc Lập** | `/reset` | Truy cập route `/reset` trong trình duyệt | Màn hình hiển thị form "Đặt lại mật khẩu": có ô nhập mã xác thực OTP từ email và mật khẩu mới (tối thiểu 12 ký tự), cùng nút "Cập nhật mật khẩu". | `16_reset_route_screen.png` |
| **Màn hình Thanh Toán & Đối Soát Độc Lập** | `/billing` | Truy cập route `/billing` trong trình duyệt | Hiển thị form tra cứu thông tin thanh toán tiệc cưới với ô nhập Booking ID và nút "Xem thanh toán". Kiểm thử nhập ID không hợp lệ cho thấy thông báo lỗi từ backend hiển thị an toàn. | `09_billing_initial.png`, `10_billing_422_rejected.png` |

---

## Phần E: Danh Mục Khiếm Khuyết UI & Runtime (Defect Log P0–P3)

### Defect 1 (P2 - Tác động trải nghiệm / Ổn định Runtime):
- **Hiện tượng:** Khi người dùng bấm nút "Đăng xuất" trên Tab Tài khoản (`v0-account-tab.tsx`), nếu access token đã hết hạn hoặc không hợp lệ, backend trả về HTTP `401 Unauthorized` cho request `DELETE /api/v1/auth/sessions/current`.
- **Mã nguồn liên quan:** `src/features/identity-access/session.ts` (Dòng 185):
  ```typescript
  try {
    await this.api.logout(token);
  } finally {
    await this.clear();
  }
  ```
- **Hậu quả:** Mặc dù khối `finally` vẫn thực hiện xóa phiên đăng nhập cục bộ trên máy và chuyển người dùng về màn hình đăng nhập an toàn, nhưng hàm `logout()` ném ra ngoại lệ `ApiClientError(401)` không được bắt (unhandled rejection). Trong môi trường phát triển (Metro console), lỗi này tạo ra cảnh báo ngoại lệ unhandled promise rejection.
- **Giải pháp khuyến nghị (cho đợt chỉnh sửa tiếp theo):** Bao bọc lời gọi `this.api.logout(token)` bằng `try/catch` bỏ qua lỗi 401 khi token đã hết hạn trên máy chủ.

### Defect 2 (P2 - Thiếu thành phần UI theo đặc tả tài liệu):
- **Hiện tượng:** Tài liệu thiết kế `06-android-68-api-implementation-map.md` (A68-19 và A68-20) ghi chú rằng trên Tab Tài khoản có thẻ hiển thị: *"Trạng thái máy chủ (Liveness)"* và *"Trạng thái cơ sở dữ liệu (Readiness)"*.
- **Mã nguồn liên quan:** `src/screens/v0/v0-account-tab.tsx` và `src/features/identity-access/experience-api.ts`.
- **Hậu quả:** Hàm `liveHealth()` và `readyHealth()` đã được viết hoàn chỉnh trong `experience-api.ts`, nhưng trong tệp giao diện `v0-account-tab.tsx` hoàn toàn không có bất kỳ thẻ Card, nút bấm hay `useEffect` nào gắn kết để gọi 2 API này. Người dùng không thể xem trạng thái health từ UI.
- **Giải pháp khuyến nghị:** Bổ sung Card "Trạng thái hệ thống" vào cuối Tab Tài khoản để hiển thị trạng thái `LIVE` và `READY` từ 2 API trên.

### Defect 3 (P3 - Giới hạn dữ liệu Test Fixture):
- **Hiện tượng:** Tài khoản test được cấp `couple123@example.test` là tài khoản mới hoàn toàn, không được liên kết với bất kỳ tiệc cưới mẫu (`booking`) nào trên môi trường staging của Railway.
- **Hậu quả:** Không thể mở shell điều hướng chính của tiệc cưới (`V0CompanionShell`), dẫn đến 52 API phụ thuộc vào tiệc cưới bị chặn kiểm thử trên giao diện (`BLOCKED_BY_FIXTURE`).
- **Giải pháp khuyến nghị:** Đội ngũ backend cần gán ít nhất 01 tiệc cưới mẫu ở trạng thái trước cọc (`AWAITING_DEPOSIT`) hoặc sau cọc (`CONFIRMED`) cho tài khoản `couple123@example.test` để thực hiện kiểm thử trọn vẹn toàn bộ các luồng lập kế hoạch, hợp đồng và khách mời.

---

## Phần F: Nhật Ký Tác Động Dữ Liệu & Khôi Phục (Data Side-Effects Audit)

Nhằm đảm bảo tính toàn vẹn và sạch sẽ của môi trường thử nghiệm, toàn bộ các thao tác ghi dữ liệu (mutations) đã được theo dõi và khôi phục nghiêm ngặt:

1. **Họ Tên Hồ Sơ (Display Name):**
   - *Giá trị ban đầu:* `couple123` (Revision: 1).
   - *Thao tác kiểm thử:* Thực hiện chỉnh sửa sang `couple123_test` (PATCH `/auth/profile`, Revision: 2) để xác nhận luồng lưu hồ sơ và cơ chế `expectedRevision`.
   - *Khôi phục:* Thực hiện chỉnh sửa hoàn trả ngay lập tức về đúng giá trị gốc `couple123` (PATCH `/auth/profile`, Revision: 3/4).
   - *Trạng thái cuối cùng:* **Đã hoàn trả 100% về nguyên trạng ban đầu.**

2. **Yêu cầu Mã OTP Đổi Mật Khẩu & Quên Mật Khẩu:**
   - *Thao tác:* Đã kích hoạt 01 yêu cầu đổi mật khẩu (`POST /auth/password-change-otp-requests`) và 01 yêu cầu quên mật khẩu (`POST /auth/password-otp-requests`).
   - *Bảo toàn an toàn:* Không nhập mã OTP hoặc gửi yêu cầu đổi mật khẩu mới (`A68-58`, `A68-59`), tránh việc thay đổi mật khẩu và làm mất quyền truy cập tài khoản test của chủ dự án. Mật khẩu tài khoản kiểm thử được giữ nguyên vẹn.

3. **Phiên Làm Việc (Session):**
   - Đã kiểm tra cơ chế làm mới phiên tự động (`POST /auth/android-session-refreshes`).
   - Phiên đăng nhập được quản lý an toàn trong bộ nhớ trình duyệt, không xóa bất kỳ phiên làm việc nào của các thiết bị khác.

---

## Phần G: Khác Biệt Giữa Expo Web Mobile Emulation & Thiết Bị Android Thật

Quá trình kiểm thử được thực hiện trong môi trường giả lập Mobile Web (iPhone 16 Pro Max viewport trên Chrome). Chủ dự án cần lưu ý các điểm khác biệt bản chất so với ứng dụng chạy trên thiết bị Android thật (APK/AAB):

1. **Lưu Trữ Khóa Bảo Mật (SecureStore vs Web Storage):**
   - Trên Android thật: Token và định danh thiết bị được lưu mã hóa an toàn qua Android Keystore (`expo-secure-store`).
   - Trên Web Emulation: Sử dụng bộ nhớ RAM (In-Memory Session) và `localStorage` thay thế tạm thời.
2. **Tải & Chia Sẻ Tệp Tin (File Download & Sharing):**
   - Trên Android thật: Tải tệp PDF hợp đồng (`A68-09`) hoặc tệp in thiệp (`A68-36`) sẽ ghi tệp vào bộ nhớ ứng dụng qua `expo-file-system` và mở hộp thoại hệ thống `expo-sharing` (cho phép gửi qua Zalo, Drive, Gmail, In trực tiếp).
   - Trên Web Emulation: Thư viện `expo-sharing` không hỗ trợ Web, dẫn đến thao tác tải tệp sẽ mở URL blob trực tiếp trên trình duyệt hoặc bị giới hạn.
3. **Thông Báo Đẩy (FCM Push Notifications):**
   - Trên Android thật: Thiết bị đăng ký với dịch vụ Google Play Services để nhận push token FCM và nhận thông báo khi app chạy ngầm.
   - Trên Web Emulation: Hoàn toàn không có dịch vụ FCM; tính năng này bị đánh dấu là `UNSUPPORTED_ON_WEB` / `BLOCKED_BY_NATIVE`.
4. **Trải Nghiệm Cảm Ứng & Bàn Phím (Touch & Soft Keyboard):**
   - Trên giả lập Web: Sử dụng chuột click giả lập touch. Chiều cao viewport cố định không bị bàn phím ảo đẩy lên như trên thiết bị Android thật (`KeyboardAvoidingView`).
