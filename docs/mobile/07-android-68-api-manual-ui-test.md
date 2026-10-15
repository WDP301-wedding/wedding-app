# Hướng Dẫn Kiểm Thử Giao Diện Thủ Công Toàn Bộ 68 API Kênh Android (wedding-app)

> **Dành cho:** Chủ dự án & Đội ngũ Kiểm thử thủ công (Manual QA / User Acceptance Testing)  
> **Ứng dụng:** `wedding-app` (Kênh Android / React Native / Expo)  
> **Môi trường Backend:** `https://wedding-be-production-e1dc.up.railway.app/api/v1` (Health ngoài prefix: `/health/live`, `/health/ready`)  
> **Nguyên tắc an toàn:** Tuyệt đối không chạy test tự động ghi đè dữ liệu; người dùng tự kiểm thử tay trên thiết bị/giả lập với tài khoản email + mật khẩu thật do backend cấp.

---

## 1. Chuẩn Bị Môi Trường & Dữ Liệu Kiểm Thử

### 1.1. Khởi chạy ứng dụng
```bash
cd wedding-app
npm start
# Hoặc chạy trên thiết bị / giả lập Android:
# npm run android
```

### 1.2. Yêu cầu tài khoản & tiền đề kiểm thử
1. **Tài khoản Cặp đôi (Couple Account):**
   - Đăng nhập bằng **Email + Mật khẩu** hợp lệ do Backend cấp (không dùng số điện thoại OTP vì hệ thống xác thực Android sử dụng `POST /auth/android-sessions`).
   - Mật khẩu tuân thủ quy tắc nghiệp vụ: từ 12 đến 128 ký tự.
   - Hộp thư email thực tế để nhận mã OTP trong luồng đổi mật khẩu hoặc quên mật khẩu.
   - Tuyệt đối không dùng credentials giả hoặc thực hiện thanh toán tiền thật; chỉ sử dụng môi trường sandbox VNPay được Backend ủy quyền.
2. **Tiệc cưới mẫu (Booking):**
   - Tài khoản có ít nhất 01 tiệc cưới được phân quyền (`canAccessWorkspace === true`).
   - Hỗ trợ cả hai trạng thái quyền hạn:
     - **`RESTRICTED` (Trước cọc - `AWAITING_DEPOSIT` / `DRAFT`):** Đã được mở quyền truy cập vào `V0CompanionShell` để kiểm thử các màn hình được phép (A68-01 đề xuất proposal, A68-08 hợp đồng, catalog...). Khi thao tác đặt cọc (A68-53), hệ thống hiển thị thông báo giới hạn backend và nút chuyển sang Web Portal theo biến môi trường `EXPO_PUBLIC_WEB_PORTAL_URL`.
     - **`FULL` (Sau cọc - `CONFIRMED` / `COMPLETED`):** Toàn quyền sử dụng các tính năng quản lý lịch trình, tạo bản nháp hợp đồng, phụ lục, điểm danh khách mời và thanh toán số dư.

---

## 2. Kịch Bản Kiểm Thử Chi Tiết 68 API Theo 9 Luồng Nghiệp Vụ Thực Tế

---

### Luồng 1: Kiểm Tra Hệ Thống, Xác Thực & Quản Lý Phiên (A68-19, 20, 26, 25, 23, 21, 24, 22, 54, 56, 57, 58, 60, 59)

| Bước | Tiền đề & Quyền hạn | Thao tác trên giao diện | API kích hoạt | Kết quả mong đợi trên UI |
|:---:|:---|:---|:---|:---|
| **1.1** | Chưa đăng nhập, có kết nối internet | Mở ứng dụng, vào màn hình đăng nhập hoặc Tab Tài khoản. Quan sát Card "Trạng thái máy chủ". | **A68-19** (`GET /health/live`),<br>**A68-20** (`GET /ready` -> `/health/ready`) | Hai chỉ số hiển thị độc lập: Liveness: `LIVE` (kèm requestId), Readiness: `READY`. Không gộp lỗi chéo. |
| **1.2** | Chưa đăng nhập | Tại màn hình Đăng nhập (`login.tsx`), bấm "Quên mật khẩu?", nhập email đã đăng ký, bấm "Gửi mã xác nhận". | **A68-60** (`POST /auth/password-otp-requests`) | Thông báo đã gửi mã OTP xác nhận về hộp thư email. Màn hình chuyển sang bước nhập OTP. |
| **1.3** | Đã nhận OTP qua email | Nhập mã OTP từ email và mật khẩu mới (tối thiểu 12 ký tự), bấm "Hoàn tất đặt lại mật khẩu". | **A68-59** (`POST /auth/password-otp-completions`) | Thông báo đặt lại mật khẩu thành công. Đưa người dùng về màn hình đăng nhập. |
| **1.4** | Tài khoản Cặp đôi hợp lệ | Nhập Email và Mật khẩu, bấm nút **"Đăng nhập"**. | **A68-26** (`POST /auth/android-sessions`) | Đăng nhập thành công; access token lưu trong bộ nhớ, refresh token lưu vào SecureStore; chuyển vào màn hình chính. |
| **1.5** | Đã đăng nhập | Vào Tab **Tài khoản** (`account`). Hệ thống tự động tải thông tin người dùng và hồ sơ. | **A68-23** (`GET /auth/me`),<br>**A68-54** (`GET /auth/profile`) | Hiển thị chính xác Tên hiển thị, Email, Số điện thoại và Vai trò `COUPLE`. |
| **1.6** | Đã tải hồ sơ | Bấm "Chỉnh sửa hồ sơ", cập nhật họ tên và số điện thoại, bấm **"Lưu hồ sơ"**. | **A68-56** (`PATCH /auth/profile`) | Gửi kèm `expectedRevision`. Hồ sơ cập nhật tức thì trên giao diện, không bị ghi đè dữ liệu cũ. |
| **1.7** | Đã đăng nhập | Tại mục "Đổi mật khẩu", bấm **"Gửi OTP đổi mật khẩu"**. | **A68-57** (`POST /auth/password-change-otp-requests`) | Thông báo đã gửi mã OTP về email tài khoản. Xuất hiện form nhập mật khẩu cũ, mật khẩu mới và OTP. |
| **1.8** | Đã nhận OTP đổi mật khẩu | Nhập mật khẩu hiện tại, mật khẩu mới và mã OTP, bấm **"Xác nhận đổi mật khẩu"**. | **A68-58** (`POST /auth/password-changes`) | Thông báo đổi mật khẩu thành công. Phiên làm việc được giữ vững an toàn. |
| **1.9** | Đã đăng nhập | Trong Tab Tài khoản, cuộn đến mục **"Quản lý phiên thiết bị"** (`sessions`). | **A68-24** (`GET /auth/sessions`) | Hiển thị danh sách các phiên đăng nhập; phiên hiện tại có huy hiệu "Phiên này". |
| **1.10** | Có nhiều hơn 1 phiên | Chọn một phiên thiết bị khác trong danh sách, bấm nút **"Thu hồi"**. | **A68-22** (`DELETE /auth/sessions/{sessionId}`) | Hộp thoại xác nhận xuất hiện; sau khi xác nhận, phiên đó bị xóa khỏi danh sách. |
| **1.11** | Chạy ngầm khi token hết hạn | Để ứng dụng chạy quá hạn access token (10 phút) hoặc kích hoạt thao tác API cần token mới. | **A68-25** (`POST /auth/android-session-refreshes`) | Tự động làm mới access token ngầm thông qua refresh token trong SecureStore; không văng ra màn đăng nhập. |
| **1.12** | Đang trong phiên đăng nhập | Bấm nút **"Đăng xuất"** trên Tab Tài khoản. | **A68-21** (`DELETE /auth/sessions/current`) | Phiên hiện tại bị đóng phía máy chủ, xóa toàn bộ token trong SecureStore, quay về màn hình Đăng nhập. |

---

### Luồng 2: Khám Phá Danh Mục Dịch Vụ Nhà Hàng (Public Catalog) (A68-64, 65, 66, 67, 68)

| Bước | Tiền đề & Quyền hạn | Thao tác trên giao diện | API kích hoạt | Kết quả mong đợi trên UI |
|:---:|:---|:---|:---|:---|
| **2.1** | Không cần đăng nhập | Chuyển sang Tab **Dịch vụ** (`catalog`). | **A68-68** (`GET /catalog/restaurant`) | Thẻ đầu trang hiển thị tên nhà hàng tiệc cưới, địa chỉ, hotline và giờ mở cửa. |
| **2.2** | Không cần đăng nhập | Chọn mục **"Sảnh tiệc cưới"**. | **A68-65** (`GET /catalog/halls`) | Danh sách các sảnh tiệc hiển thị kèm hình ảnh, sức chứa tối đa và tầng sảnh. |
| **2.3** | Không cần đăng nhập | Nhấn vào 1 sảnh tiệc cụ thể trong danh sách. | **A68-66** (`GET /catalog/halls/{hallId}`) | Mở trang chi tiết sảnh tiệc: thông số kỹ thuật, mô tả, danh sách tiện ích và hình ảnh thực tế. |
| **2.4** | Không cần đăng nhập | Quay lại, chọn mục **"Gói thực đơn tiệc"**. | **A68-67** (`GET /catalog/menu-packages`) | Hiển thị danh mục các set menu trọn gói kèm đơn giá VND và danh sách món ăn trong set. |
| **2.5** | Không cần đăng nhập | Chọn mục **"Thực đơn món ăn"**, nhập từ khóa tìm kiếm (VD: "Bò", "Súp"). | **A68-64** (`GET /catalog/dishes`) | Danh sách món ăn được lọc theo từ khóa, hiển thị hình ảnh, tên món và giá tiền niêm yết VND. |

---

### Luồng 3: Tổng Quan Tiệc Cưới & Lịch Trình Sự Kiện (Planning) (A68-55, 01, 03, 04, 05, 06, 02)

| Bước | Tiền đề & Quyền hạn | Thao tác trên giao diện | API kích hoạt | Kết quả mong đợi trên UI |
|:---:|:---|:---|:---|:---|
| **3.1** | Đã đăng nhập Cặp đôi | Mở Tab **Tổng quan** (`overview`). | **A68-55** (`GET /couple/bookings`) | Tải danh sách tiệc cưới của Cặp đôi; hiển thị thẻ tiệc cưới chính kèm ngày tổ chức, ca tiệc, sảnh tiệc. |
| **3.2** | Có active booking | Chuyển sang Tab **Lịch trình** (`schedule`). | **A68-01** (`GET /bookings/{bookingId}/proposal`) | Tải đề xuất kế hoạch; phân biệt rõ timeline đề xuất (`pending`) và timeline đã duyệt (`effective`). |
| **3.3** | Proposal ở trạng thái hợp lệ | Bấm **"Gửi yêu cầu thay đổi"**, nhập lý do và nội dung cần điều chỉnh, bấm Gửi. | **A68-03** (`POST /bookings/{bookingId}/change-requests`) | Gửi kèm `expectedRevision` khớp proposal. Ghi nhận yêu cầu thành công, hiển thị badge chờ duyệt. |
| **3.4** | Có quyền tạo revision | Bấm **"Tạo bản sửa đổi lịch trình"**, nhập danh sách các mốc giờ và sự kiện mới. | **A68-04** (`POST /bookings/{bookingId}/timeline-revisions`) | Gửi `predecessorRevisionId` thật; tạo bản nháp revision lịch trình kế tiếp (Revision + 1) thành công. |
| **3.5** | Bản nháp đang chờ duyệt (`canApproveTimeline === true`) | Nhấn nút **"Duyệt bản lịch trình"** trên bản đề xuất. | **A68-05** (`POST /bookings/{bookingId}/timeline-revisions/{revisionId}/approvals`) | Gửi `expectedRevision` là revision của proposal. Trạng thái bản lịch trình đổi sang `APPROVED`. |
| **3.6** | Bản lịch trình đã duyệt (`canWithdrawApproval === true`) | Nhấn nút **"Rút duyệt bản lịch trình"**, nhập lý do rút duyệt, bấm Xác nhận. | **A68-06** (`POST /bookings/{bookingId}/timeline-revisions/{revisionId}/withdrawals`) | Gửi `expectedRevision`. Bản lịch trình được khôi phục về trạng thái điều chỉnh an toàn. |
| **3.7** | Booking đủ điều kiện hủy | Bấm nút **"Yêu cầu hủy tiệc"**, nhập lý do hủy chi tiết, bấm Xác nhận. | **A68-02** (`POST /bookings/{bookingId}/cancellation-requests`) | Gửi `expectedRevision`. Yêu cầu hủy tiệc được ghi nhận an toàn, trạng thái chuyển sang chờ giải quyết. |

---

### Luồng 4: Hợp Đồng Thương Mại & Hồ Sơ Pháp Lý (A68-08, 10, 11, 15, 17, 16, 18, 09)

| Bước | Tiền đề & Quyền hạn | Thao tác trên giao diện | API kích hoạt | Kết quả mong đợi trên UI |
|:---:|:---|:---|:---|:---|
| **4.1** | Có active booking | Vào Tab Tài khoản -> Chọn **"Hợp đồng tiệc cưới"** (`V0ContractsSubflow`). | **A68-08** (`GET /bookings/{bookingId}/contracts`) | Tải toàn bộ lịch sử revision hợp đồng; hiển thị giá trị hợp đồng, tiền cọc 30% và trạng thái từng bên. |
| **4.2** | Có `consultationId` liên kết | Quan sát thẻ **"Hồ sơ pháp lý Cô dâu & Chú rể"**. | **A68-10** (`GET /consultations/{id}/couple-profile`) | Tự động điền họ tên cô dâu và chú rể chính thức từ hồ sơ pháp lý. |
| **4.3** | Có quyền sửa tên | Bấm "Cập nhật tên", chỉnh sửa tên cô dâu và chú rể, bấm **"Lưu thay đổi"**. | **A68-11** (`PATCH /consultations/{id}/couple-profile`) | Gửi kèm `expectedRevision`. Tên mới được cập nhật tức thì trên hợp đồng pháp lý. |
| **4.4** | Cần lập revision mới | Bấm **"+ Tạo bản nháp mới"** -> Form chỉnh sửa dòng xuất hiện: bấm "+ Thêm dòng từ catalog", chọn món hoặc gói thực đơn, chỉnh số lượng (+/-), bấm xóa dòng nếu muốn. Kiểm tra quy tắc: không cho xóa nếu chỉ còn 1 dòng MENU duy nhất. Bấm "Xác nhận tạo bản nháp hợp đồng". | **A68-15** (`POST /bookings/{bookingId}/contracts`) | Gửi `bookingRevision`, mảng `lines` có cấu trúc chuẩn (`category`, `sourceId`, `sourceRevisionId`, `quantity`), không gửi tổng tiền giả lập (để server tính). Bản nháp DRAFT mới xuất hiện với đơn giá tham khảo. |
| **4.5** | Bản nháp ở trạng thái DRAFT | Trên thẻ revision DRAFT, bấm **"Gửi duyệt hợp đồng"**. | **A68-17** (`POST /bookings/{bookingId}/contracts/{revId}/submissions`) | Gửi `bookingRevision` làm `expectedRevision`. Hợp đồng chuyển sang `AWAITING_APPROVAL`. |
| **4.6** | Đang chờ duyệt | Bấm **"Phê duyệt hợp đồng"**. | **A68-16** (`POST /bookings/{bookingId}/contracts/{revId}/approvals`) | Gửi `bookingRevision`. Thể hiện rõ Couple đã duyệt; trạng thái chuyển `APPROVED` khi cả hai bên hoàn tất. |
| **4.7** | Hợp đồng đã APPROVED | Bấm **"Rút phê duyệt"**, nhập lý do rút duyệt, bấm Xác nhận. | **A68-18** (`POST /bookings/{bookingId}/contracts/{revId}/withdrawals`) | Gửi `bookingRevision`. Hợp đồng mở lại trạng thái điều chỉnh. |
| **4.8** | Revision đã được phát hành | Bấm nút **"Tải tệp PDF hợp đồng"**. | **A68-09** (`GET /bookings/{bookingId}/contracts/{revId}/pdf`) | Tải tệp nhị phân có Bearer token; ghi tệp vào cache riêng tư qua `expo-file-system`, mở hộp thoại `expo-sharing` cho phép mở bằng PDF Viewer hoặc đính kèm tệp PDF thật khi gửi email/zalo. |

---

### Luồng 5: Phụ Lục Hợp Đồng Thương Mại (A68-07, 12, 14, 13)

| Bước | Tiền đề & Quyền hạn | Thao tác trên giao diện | API kích hoạt | Kết quả mong đợi trên UI |
|:---:|:---|:---|:---|:---|
| **5.1** | Có active booking | Vào Tab Tài khoản -> Chọn **"Phụ lục hợp đồng"** (`V0AppendicesSubflow`). | **A68-07** (`GET /bookings/{bookingId}/contract-appendices`) | Hiển thị danh sách các phụ lục điều chỉnh; bảng so sánh Trước - Sau và Delta chênh lệch dựa trên server snapshot thật. |
| **5.2** | Có hợp đồng hiệu lực, kiểm tra điều kiện hóa đơn quyết toán | Bấm nút **"+ Tạo bản nháp phụ lục"**:<br>- **TH1 (Tiệc `COMPLETED` nhưng chưa có hóa đơn quyết toán finalized):** Form mở bình thường, hệ thống tự động tổng hợp toàn bộ các dòng thương mại có hiệu lực (`aggregateEffectiveCommercialLines`) gồm cả hợp đồng gốc và phụ lục đã duyệt, bảo toàn đầy đủ `MENU`, `PRINT` và `SERVICE`.<br>- **TH2 (Đã có hóa đơn `FINALIZED` hoặc `ISSUED`):** Ứng dụng hiện cảnh báo chặn: "Hóa đơn quyết toán đã được phát hành... Vui lòng liên hệ Quản lý nhà hàng".<br>- Khi form mở: người dùng có thể thêm/bớt/chỉnh số lượng dòng tương tự hợp đồng, nhập lý do điều chỉnh, rồi bấm "Xác nhận tạo phụ lục". | **A68-12** (`POST /bookings/{bookingId}/contract-appendices`) | Gửi `bookingRevision`, `lines >= 1`, predecessor là `effectiveRevisionId`. Bản nháp phụ lục DRAFT mới xuất hiện với delta hiển thị chính xác. |
| **5.3** | Phụ lục ở trạng thái DRAFT | Bấm **"Gửi duyệt phụ lục"**. | **A68-14** (`POST /bookings/{bookingId}/contract-appendices/{revId}/submissions`) | Gửi `bookingRevision` làm `expectedRevision`. Phụ lục chuyển trạng thái sang `AWAITING_APPROVAL`. |
| **5.4** | Phụ lục đang chờ duyệt | Bấm **"Phê duyệt phụ lục"**. | **A68-13** (`POST /bookings/{bookingId}/contract-appendices/{revId}/approvals`) | Gửi `bookingRevision`. Ghi nhận Cặp đôi phê duyệt phụ lục thành công. |

---

### Luồng 6: Thiệp Cưới Điện Tử & Đặt In Thiệp Giấy (A68-34, 35, 37, 27, 28, 29, 30, 33, 32, 31, 36)

| Bước | Tiền đề & Quyền hạn | Thao tác trên giao diện | API kích hoạt | Kết quả mong đợi trên UI |
|:---:|:---|:---|:---|:---|
| **6.1** | Có active booking | Chuyển sang Tab **Thiệp cưới** (`invite`). | **A68-34** (`GET /bookings/{bookingId}/invitations`) | Hiển thị danh sách các thiết kế thiệp cưới điện tử của tiệc. |
| **6.2** | Có thiệp trong danh sách | Nhấn vào 1 thiết kế thiệp để xem chi tiết. | **A68-35** (`GET /bookings/{bookingId}/invitations/{designId}`) | Tải chi tiết thiết kế: hình nền, font chữ, bố cục thiệp. |
| **6.3** | Không yêu cầu booking | Cuộn xuống mục **"Mẫu thiệp cưới có sẵn"**. | **A68-37** (`GET /invitation-templates`) | Hiển thị lưới thư viện mẫu thiệp cưới sẵn có để cặp đôi tham khảo. |
| **6.4** | Có active booking | Chuyển sang Subflow **"Đơn in thiệp giấy"** (`print`). | **A68-27** (`GET /bookings/{bookingId}/print-orders`) | Liệt kê danh sách các đơn đặt in thiệp cưới giấy kèm mã đơn, số lượng, trạng thái. |
| **6.5** | Chọn 1 đơn in cụ thể | Nhấn vào thẻ đơn in trong danh sách. | **A68-28** (`GET /bookings/{bookingId}/print-orders/{orderId}`) | Mở chi tiết đơn in: quy cách giấy, số lượng thiệp, địa chỉ nhận hàng, lịch sử trạng thái. |
| **6.6** | Có thiết kế thiệp đã duyệt | Bấm **"+ Đặt in thiệp mới"**, chọn mẫu thiệp, số lượng (>=1), địa chỉ nhận. | **A68-29** (`POST /bookings/{bookingId}/print-orders`) | Gửi Idempotency-Key tất định. Đơn đặt in mới được tạo thành công. |
| **6.7** | Đơn ở trạng thái `PROOF_READY` | Trên đơn in có bản in thử, bấm **"Duyệt mẫu in thiệp"**. | **A68-30** (`POST /bookings/{bookingId}/print-orders/{orderId}/approval`) | Xác nhận phê duyệt mẫu in thử; đơn chuyển sang công đoạn in ấn. |
| **6.8** | Đơn có bản in thay thế `PROOF_READY` | Bấm **"Duyệt bản in thay thế"**. | **A68-33** (`POST /bookings/{bookingId}/print-orders/{orderId}/replacement-approvals`) | Duyệt bản thay thế thành công, chuyển sang sản xuất. |
| **6.9** | Đơn đang xử lý hỗ trợ intent | Bấm **"Đăng ký ý định hủy đơn"**, nhập lý do. | **A68-32** (`POST /bookings/{bookingId}/print-orders/{orderId}/cancellation-intents`) | Ghi nhận ý định hủy đơn in an toàn. |
| **6.10** | Đơn chưa vào in ấn | Bấm **"Hủy đơn in"**, xác nhận lý do hủy. | **A68-31** (`POST /bookings/{bookingId}/print-orders/{orderId}/cancellation`) | Cập nhật trạng thái đơn sang `CANCELLED`. |
| **6.11** | Đơn in đã có file xuất xưởng | Bấm nút **"Tải tệp in thiệp A5"**. | **A68-36** (`GET /bookings/{bookingId}/printable-revisions/{id}/file`) | Tải tệp in nhị phân có Bearer; lưu cache và mở hộp thoại Native Sharing đính kèm tệp PDF thật. |

---

### Luồng 7: Khách Mời & Cài Đặt Điểm Danh Check-in (A68-61, 62, 63)

| Bước | Tiền đề & Quyền hạn | Thao tác trên giao diện | API kích hoạt | Kết quả mong đợi trên UI |
|:---:|:---|:---|:---|:---|
| **7.1** | Có active booking | Chuyển sang Tab **Khách mời** (`guests`). | **A68-61** (`GET /bookings/{bookingId}/attendance-summary`) | Hiển thị bảng tổng kết điểm danh: phân biệt rõ `Chưa ghi nhận` (khi chế độ tắt hoặc null) với số `0` khách. |
| **7.2** | Có active booking | Quan sát thẻ **"Cài đặt điểm danh sự kiện"**. | **A68-62** (`GET /bookings/{bookingId}/check-in-settings`) | Hiển thị chế độ điểm danh hiện hành: `NONE` (Tắt) hoặc `BY_GUEST_NAME` (Theo tên khách). |
| **7.3** | Tiệc chưa bắt đầu điểm danh | Bấm Switch chuyển đổi **"Bật/Tắt điểm danh theo tên"**. | **A68-63** (`PATCH /bookings/{bookingId}/check-in-settings`) | Gửi kèm `expectedRevision`. Chế độ điểm danh cập nhật tức thì. Khóa chỉnh sửa nếu đã có khách check-in. |

---

### Luồng 8: Quyết Toán, Chi Phí Phát Sinh & Thanh Toán (A68-47, 48, 49, 50, 51, 52, 53)

| Bước | Tiền đề & Quyền hạn | Thao tác trên giao diện | API kích hoạt | Kết quả mong đợi trên UI |
|:---:|:---|:---|:---|:---|
| **8.1** | Có active booking | Chuyển sang Màn hình **Thanh toán** (`billing.tsx`). | **A68-47** (`GET /bookings/{bookingId}/billing`) | Tải tổng quan thanh toán: số tiền hợp đồng, tiền cọc đã đóng, số tiền còn lại cần quyết toán. |
| **8.2** | Có active booking | Cuộn đến mục **"Chi phí phát sinh"**. | **A68-50** (`GET /bookings/{bookingId}/incidental-expenses`) | Hiển thị danh mục các khoản phát sinh ngoài hợp đồng (thêm giờ, phục vụ thêm...) do Manager ghi nhận. |
| **8.3** | Tiệc `COMPLETED` có hóa đơn | Cuộn đến mục **"Hóa đơn quyết toán"**. | **A68-48** (`GET /bookings/{bookingId}/final-invoices`) | Hiển thị danh sách các phiên bản hóa đơn quyết toán bất biến. |
| **8.4** | Có hóa đơn cụ thể | Nhấn **"Xem chi tiết bảng kê"** trên 1 hóa đơn. | **A68-49** (`GET /bookings/{bookingId}/final-invoices/{invoiceRevisionId}`) | Bảng kê chi tiết từng dòng dịch vụ, thực đơn, thuế và tổng tiền quyết toán cuối cùng. |
| **8.5** | Có công nợ số dư quyết toán | Bấm nút **"Thanh toán số dư quyết toán"**. | **A68-52** (`POST /bookings/{bookingId}/payments/balance`) | Khởi tạo giao dịch thanh toán số dư; mở cổng VNPay sandbox trên trình duyệt hệ thống. |
| **8.6** | Quay lại từ cổng thanh toán VNPay | Ứng dụng tự động kích hoạt đối soát thanh toán. | **A68-51** (`GET /bookings/{bookingId}/payments/{attemptId}`) | Đọc kết quả giao dịch: cập nhật trạng thái thanh toán hoặc hiển thị `Đang đối soát (UNKNOWN)`. |
| **8.7** | Booking ở giai đoạn chờ cọc (`AWAITING_DEPOSIT`) | Bấm nút **"Tiến hành đặt cọc tiệc cưới"**.<br>- Quan sát thông báo: Backend giới hạn tài khoản Cặp đôi trước cọc trên Android (`RESTRICTED` per SRS BR-05).<br>- Quan sát nút **"Mở Web Portal để hoàn tất cọc"**: Nếu biến môi trường `EXPO_PUBLIC_WEB_PORTAL_URL` được cấu hình, bấm nút sẽ mở đúng trang web portal; nếu chưa cấu hình, ứng dụng hiển thị thông báo "Chưa cấu hình URL Web Portal" thay vì mở URL giả. | **A68-53** (`POST /bookings/{bookingId}/payments/deposit`) | **Kiểm chứng Blocker trung thực:** Ứng dụng không giả lập đặt cọc thành công; báo rõ lý do kiến trúc và chuyển tiếp an toàn sang Web. |

---

### Luồng 9: Hộp Thư Thông Báo & Cài Đặt Thiết Bị (A68-40, 41, 42, 43, 45, 46, 39, 38, 44)

| Bước | Tiền đề & Quyền hạn | Thao tác trên giao diện | API kích hoạt | Kết quả mong đợi trên UI |
|:---:|:---|:---|:---|:---|
| **9.1** | Đã đăng nhập | Chuyển sang Tab **Thông báo** (`notifications`). | **A68-40** (`GET /notifications/inbox`),<br>**A68-42** (`GET /notifications/unread-count`) | Tải danh sách thông báo và số lượng tin chưa đọc. Hiển thị badge số tin chưa đọc trên tab bar. |
| **9.2** | Có tin chưa đọc | Nhấn vào 1 tin thông báo cụ thể. | **A68-46** (`POST /notifications/inbox/{id}/read`) | Tin được đánh dấu đã đọc; số lượng unreadCount giảm 1; điều hướng đến màn hình chi tiết theo `purpose`. |
| **9.3** | Có nhiều hơn 1 tin chưa đọc | Bấm nút **"Đánh dấu tất cả đã đọc"** trên thanh tiêu đề. | **A68-45** (`POST /notifications/inbox/read-all`) | Toàn bộ danh sách đổi sang trạng thái đã đọc; badge unreadCount chuyển về 0. |
| **9.4** | Danh sách có nhiều hơn 1 trang | Cuộn xuống cuối danh sách thông báo, bấm **"Tải thêm"**. | **A68-40** (`GET /notifications/inbox?cursor=...`) | Tải trang kế tiếp qua `nextCursor`; nối các tin mới vào danh sách mà không làm mất tin cũ. |
| **9.5** | Đã đăng nhập | Xem thẻ **"Cài đặt kênh thông báo"**. | **A68-41** (`GET /notifications/preferences`) | Hiển thị cấu hình nhận thông báo hiện thời (Email, SMS, App Push) theo server snapshot. |
| **9.6** | Đã tải preferences | Bật/tắt Switch của từng kênh (VD: Bật SMS, Tắt Email). | **A68-43** (`PATCH /notifications/preferences`) | Gửi kèm `expectedRevision`. Cài đặt được lưu thành công trên máy chủ. |
| **9.7** | Đã đăng nhập | Xem thẻ **"Thiết bị Android đã đăng ký"**. | **A68-39** (`GET /notifications/android-installations`) | Liệt kê danh sách các cài đặt thiết bị đã đăng ký nhận thông báo. |
| **9.8** | Có thiết bị trong danh sách | Nhấn nút **"Gỡ thiết bị"** trên 1 dòng cài đặt. | **A68-38** (`DELETE /notifications/android-installations/{id}`) | Xóa cài đặt thiết bị khỏi hệ thống thông báo của tài khoản. |
| **9.9** | Thiết bị hiện tại | Bấm **"Đăng ký thiết bị này"**.<br>- Quan sát Thẻ Chẩn Đoán 4 Thành Phần trên UI:<br>  1. *Cấu hình Google Services:* Báo rõ tệp `google-services.json` có tại root nhưng chưa liên kết `app.config.ts`.<br>  2. *Thư viện Push Client:* Báo rõ chưa cài native push SDK trong `package.json`.<br>  3. *Dịch vụ Backend:* Báo rõ push worker backend đang tắt.<br>  4. *Trạng thái thiết bị:* Hiển thị ID thiết bị thật từ SecureStore (hoặc báo lỗi nếu SecureStore không khả dụng; tuyệt đối không dùng ID giả `00000000-0000-4000-8000-000000000001`). | **A68-44** (`POST /notifications/android-installations`) | **Kiểm chứng Blocker trung thực:** Ứng dụng đăng ký định danh thiết bị hợp lệ nếu SecureStore sẵn sàng; không nói push live hoạt động khi các điều kiện hạ tầng chưa đáp ứng. |

---

## 3. Hướng Dẫn Kiểm Thử Các Tình Huống Kỹ Thuật Chuyên Sâu (Edge Cases)

### 3.1. Kiểm thử Tính Tất Định của Idempotency Key & Chống Bấm Đúp (`isBusyRef`)
1. **Chống bấm đúp (Double-press Guard):**
   - Vào form tạo Hợp đồng hoặc Phụ lục, chuẩn bị sẵn dữ liệu.
   - Bấm nút gửi nhanh hai lần liên tiếp.
   - *Kết quả mong đợi:* Nhát bấm thứ hai bị chặn đồng bộ ngay lập tức bởi `isBusyRef`, không phát sinh hai HTTP request đồng thời lên server.
2. **Khóa Idempotency phụ thuộc Payload:**
   - Khi thực hiện gửi một yêu cầu (ví dụ: tạo phụ lục), mở log mạng hoặc kiểm tra mã hash.
   - Thử thay đổi số lượng món ăn hoặc thêm dòng mới rồi gửi lại khi revision chưa đổi: *Kết quả mong đợi* là hệ thống sinh ra Idempotency-Key mới tương ứng với payload mới, không tái sử dụng key cũ.
   - Nếu xảy ra lỗi mạng tạm thời và người dùng bấm thử lại với chính xác payload cũ: *Kết quả mong đợi* là hệ thống tái tạo đúng Idempotency-Key cũ, đảm bảo an toàn giao dịch trên Backend.

### 3.2. Kiểm thử Xử lý Xung đột Phiên bản (HTTP 409 Conflict)
1. Trong khi mở xem một bản Hợp đồng hoặc Phụ lục trên app, thực hiện thay đổi trạng thái của bản ghi đó trên Web (hoặc tài khoản khác).
2. Trên app Android, bấm nút Phê duyệt hoặc Gửi duyệt.
3. *Kết quả mong đợi:*
   - Backend trả về HTTP `409 Conflict` (do `expectedRevision` không khớp).
   - Ứng dụng không tự ý rebase hay ghi đè ngầm; ứng dụng hiển thị thông báo: dữ liệu đã được cập nhật bởi thao tác khác, tự động tải lại dữ liệu mới nhất từ server và yêu cầu người dùng xác nhận lại trước khi tiếp tục.

### 3.3. Kiểm thử Tải & Chia Sẻ File PDF Thực Tế Trên Android
1. Tại tab Hợp đồng (A68-09) hoặc tab In ấn (A68-36), bấm nút **"Tải tệp PDF"**.
2. *Kết quả mong đợi trên thiết bị Android thật:*
   - Ứng dụng hiển thị thông báo đang xử lý và ghi tệp vào cache riêng của ứng dụng (`expo-file-system`).
   - Hộp thoại Native Android Share Sheet xuất hiện (`expo-sharing`).
   - Khi chọn gửi qua Gmail / Zalo / Drive, tệp đính kèm được nhận diện đúng định dạng `application/pdf` và có thể mở đọc trọn vẹn nội dung PDF từ backend, không phải là một chuỗi văn bản hay data URL thô.

### 3.4. Kiểm thử Không Dùng Dữ Liệu Giả Khi SecureStore Lỗi
1. Nếu chạy ứng dụng trong môi trường mà `expo-secure-store` chưa được khởi tạo đúng:
2. *Kết quả mong đợi:*
   - Ứng dụng báo lỗi "Không thể khởi tạo định danh thiết bị an toàn".
   - Ứng dụng giữ trạng thái `null` và không cho phép đăng ký thiết bị; tuyệt đối không sinh ra hay sử dụng UUID cố định `00000000-0000-4000-8000-000000000001`.

---

## 4. Tổng Hợp & Đánh Giá Trung Thực Hiện Trạng

- **Tổng số thao tác API được triển khai:** 68/68 API (A68-01 đến A68-68).
- **Mức độ hoàn thiện:**
  - **66 API:** Có đầy đủ mã xử lý, DTO, validation, xử lý xung đột 409, giao diện người dùng và cơ chế Idempotency tất định an toàn.
  - **02 API ghi nhận Blocker hạ tầng / kiến trúc hệ thống:**
    1. **A68-53 (`POST .../payments/deposit`):** Bị Backend giới hạn trên Android đối với tài khoản trước cọc (`RESTRICTED` Couple workspace chỉ có trên Web per SRS BR-05). Ứng dụng cung cấp đầy đủ caller, nút thao tác kiểm thử và chuyển tiếp an toàn sang Web Portal thông qua biến môi trường `EXPO_PUBLIC_WEB_PORTAL_URL`.
    2. **A68-44 (`POST .../notifications/android-installations`):** Luồng đăng ký định danh thiết bị hoạt động với ID ổn định từ `SecureStore`, nhưng quá trình phân phát thông báo đẩy FCM (push delivery) bị chặn do thiếu liên kết tệp `google-services.json` trong `app.config.ts`, thiếu SDK native push trong dependencies và worker backend đang tắt.
- **Trạng thái xác thực:** Toàn bộ mã nguồn đã vượt qua hai cổng kiểm tra chất lượng bắt buộc `npm run typecheck` và `npm run lint` với `exit code: 0`. Người dùng tiến hành kiểm thử thủ công trực tiếp trên thiết bị theo kịch bản chi tiết ở trên.
