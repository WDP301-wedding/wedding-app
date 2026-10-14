# Hướng Dẫn Kiểm Thử Thủ Công Giao Diện (Manual UI Test) — Flow A1 & Dữ Liệu Thật

**Dự án:** `wedding-app` (Ứng dụng Android React Native / Expo)  
**Tài liệu tham chiếu:** `docs/mobile/01-mobile-srs.md`, `docs/mobile/02-mobile-be-fe-handoff.md`, `03-description-api-review.md`  
**Mục tiêu:** Hướng dẫn chủ dự án thực hiện kiểm thử thủ công từng bước trên giao diện thực tế đối với luồng A1 (Đăng nhập Android, Quản lý phiên, Quên mật khẩu OTP, Hồ sơ và Đổi mật khẩu UC02–05) và xác minh việc loại bỏ hoàn toàn dữ liệu giả (Mock Data) khỏi runtime.

---

> [!IMPORTANT]
> **Quy ước kiểm thử đợt này:**
>
> - Toàn bộ việc kiểm thử được thực hiện **thủ công (Manual Test)** trực tiếp trên thiết bị/emulator bởi người dùng/chủ dự án.
> - **Không chạy bất kỳ lệnh test tự động nào** (không chạy `npm test`, `jest`, `playwright`, `lint`, `typecheck`, `api:check`).
> - Tuyệt đối **không dùng dữ liệu nhạy cảm thực tế, thanh toán tiền thật hoặc tác vụ phát sinh chi phí**.

---

## 1. Môi trường & Điều kiện tiên quyết (Prerequisites)

### 1.1. Cấu hình Backend & Môi trường chạy

- **API Base URL:** `https://wedding-be-production-e1dc.up.railway.app/api/v1`  
  (Được chỉ định qua biến môi trường `EXPO_PUBLIC_API_BASE_URL` trong file `.env` tại thư mục gốc `wedding-app`).
- **Thiết bị kiểm thử:**
  - Thiết bị Android vật lý (Android 10 trở lên, bật USB Debugging, cài sẵn app **Expo Go** từ Google Play) HOẶC
  - Máy ảo Android Emulator (Android Studio, khuyến nghị Pixel 4/6/7 với Google APIs, Android 12+).

### 1.2. Tài khoản thử nghiệm (Do Backend cấp)

Trước khi test, chủ dự án cần có sẵn thông tin các tài khoản thật trên cơ sở dữ liệu của server Backend:

1. **Tài khoản Cặp đôi toàn quyền (COUPLE - FULL Access):**
   - Email: `[email_couple_full_do_be_cap]` (ví dụ: `couple.test@example.com`)
   - Mật khẩu: `[mat_khau_chua_doi_12_ky_tu_tro_len]`
   - Đặc điểm: Đã có tiệc cưới được xác nhận (`phase: CONFIRMED`) và có quyền truy cập đầy đủ trên mobile.
2. **Tài khoản Giới hạn (COUPLE - RESTRICTED Access):**
   - Email: `[email_couple_restricted_do_be_cap]`
   - Mật khẩu: `[mat_khau_12_ky_tu_tro_len]`
   - Đặc điểm: Chưa có tiệc cưới hoặc tiệc chưa kích hoạt quyền mobile (để kiểm tra luồng từ chối quyền và dẫn về Web).
3. **Email nhận mã OTP thật:**
   - Hộp thư email có thể truy cập để nhận mã xác thực OTP 6 chữ số khi thực hiện quên mật khẩu hoặc đổi mật khẩu.
   - _Lưu ý về Backend Worker:_ Nếu dịch vụ gửi email (Email Worker) trên môi trường thử nghiệm của Backend chưa được kích hoạt, server sẽ trả về mã lỗi HTTP 503 `EMAIL_WORKER_DISABLED`. Khi đó cần liên hệ BE bật worker hoặc cấu hình sandbox mailgun/resend/ses.

---

## 2. Hướng dẫn khởi chạy ứng dụng

Chủ dự án mở terminal (PowerShell trên Windows) tại thư mục `wedding-app` và chạy lệnh:

```powershell
cd C:\Users\Admin\Desktop\BE\wedding-app
npx expo start -c
```

- **Mở trên Android Emulator:** Khi Expo CLI hiển thị menu, bấm phím `a` trên bàn phím.
- **Mở trên thiết bị Android thật:** Dùng ứng dụng Expo Go quét mã QR hiển thị trên màn hình terminal.
- _Lưu ý:_ Khi dev server khởi động, không thao tác tự động nào được chạy; bạn sẽ trực tiếp tương tác trên màn hình điện thoại.

---

## 3. Các kịch bản kiểm thử chi tiết trên giao diện

---

### Kịch bản 1: Đăng nhập Android (UC02) & Xử lý lỗi xác thực

#### Bước 1.1: Đăng nhập thành công với tài khoản COUPLE (Quyền FULL)

- **Đường đi:** Khởi động app -> Màn hình đăng nhập xuất hiện.
- **Dữ liệu nhập:**
  - Nhập Email tài khoản FULL vào ô `Địa chỉ email`.
  - Nhập Mật khẩu đúng vào ô `Mật khẩu`.
- **Thao tác:** Bấm nút **Đăng nhập vào tiệc cưới**.
- **Quan sát giao diện & API:**
  - Nút chuyển sang trạng thái pending (`Đang xử lý...`) và vô hiệu hóa tạm thời (chống bấm đúp).
  - Client gửi `POST /auth/android-sessions` với `{ email, password, clientMeta }`.
  - Nhận HTTP 200: Access Token được lưu an toàn trong bộ nhớ (Memory), Refresh Token được lưu vào `SecureStore`.
  - Tiếp tục gọi `GET /auth/me` để lấy thông tin tài khoản và tiệc cưới.
  - Ứng dụng điều hướng vào màn hình chính **Tổng quan tiệc cưới** (`couple-overview`).
- **Tiêu chí Đạt:** Vào được trang tổng quan, hiển thị đúng thông tin ngày cưới, sảnh tiệc và tên hiển thị của tài khoản.

#### Bước 1.2: Đăng nhập với mật khẩu không đúng

- **Thao tác:** Nhập email đúng, nhưng nhập mật khẩu sai (ví dụ: `SaiMatKhau123!`). Bấm **Đăng nhập vào tiệc cưới**.
- **Quan sát:**
  - Server trả về HTTP 401 với mã lỗi `INVALID_CREDENTIALS`.
  - Giao diện hiển thị khung cảnh báo màu đỏ: `Email hoặc mật khẩu không chính xác. Vui lòng kiểm tra lại.`
  - Không có token nào được lưu; người dùng vẫn ở màn hình đăng nhập.
- **Tiêu chí Đạt:** Báo lỗi rõ ràng, không bị crash app, không lưu session rỗng.

#### Bước 1.3: Kiểm tra tính hợp lệ dữ liệu nhập (Validation) & Chống Double-Click

- **Thao tác:**
  - Để trống email hoặc nhập sai định dạng email (ví dụ: `abc@`) -> Báo lỗi: `Địa chỉ email không hợp lệ.`
  - Nhập mật khẩu ngắn dưới 12 ký tự (ví dụ: `123456`) -> Báo lỗi: `Mật khẩu phải có độ dài từ 12 đến 128 ký tự.`
  - Nhập đầy đủ và bấm liên tục nhiều lần vào nút Đăng nhập -> Nút bị khóa ngay ở lần bấm đầu tiên, không có nhiều request song song gửi lên server.
- **Tiêu chí Đạt:** Form chặn ngay từ client trước khi gửi dữ liệu sai; không phát sinh duplicate network request.

#### Bước 1.4: Đăng nhập với tài khoản bị giới hạn (Capability RESTRICTED)

- **Dữ liệu nhập:** Email và mật khẩu của tài khoản RESTRICTED (chưa có tiệc cưới hợp lệ trên mobile).
- **Thao tác:** Bấm **Đăng nhập vào tiệc cưới**.
- **Quan sát:**
  - Sau khi đăng nhập, `snapshot.access` trả về `denied` (RESTRICTED).
  - Màn hình hiển thị thông báo rõ ràng:  
    `Tài khoản của bạn chưa được cấp quyền quản lý tiệc cưới trên ứng dụng di động (Quyền hạn: RESTRICTED).`  
    `Vui lòng truy cập trang quản lý trên trình duyệt web để thiết lập tiệc cưới hoặc liên hệ với nhà hàng để kích hoạt dịch vụ.`
  - Nút **Đăng xuất an toàn** hiển thị bên dưới.
- **Thao tác tiếp:** Bấm nút **Đăng xuất an toàn** -> Ứng dụng xóa sạch phiên và trở về màn hình đăng nhập trắng.
- **Tiêu chí Đạt:** Không cấp quyền ảo (không tự gán FULL), hướng dẫn người dùng về Web, đăng xuất an toàn.

---

### Kịch bản 2: Vòng đời phiên (Session Lifecycle), Cold Start, Token Refresh Single-Flight & Đăng xuất

#### Bước 2.1: Khởi động lại ứng dụng (Cold Start / Khôi phục phiên)

- **Điều kiện:** Đang ở trạng thái đã đăng nhập.
- **Thao tác:**
  - Đóng hoàn toàn ứng dụng (vuốt tắt ứng dụng từ màn hình đa nhiệm Android).
  - Mở lại ứng dụng `wedding-app` từ màn hình chính điện thoại.
- **Quan sát:**
  - Màn hình Splash/Loading hiển thị trong tích tắc khi ứng dụng đọc `SecureStore`.
  - Client tự động gửi `POST /auth/android-session-refreshes` để gia hạn Access Token mới và xoay vòng Refresh Token mới vào `SecureStore`.
  - Gọi `GET /auth/me` và tự động đưa người dùng vào thẳng màn hình Tổng quan tiệc cưới mà không cần đăng nhập lại.
- **Tiêu chí Đạt:** Khôi phục phiên mượt mà, không bắt người dùng đăng nhập lại khi token còn hạn.

#### Bước 2.2: Tự động gia hạn Access Token khi gặp 401 (Single-flight Refresh)

- **Cơ chế:** Khi Access Token trong memory hết hạn (hoặc sau một khoảng thời gian), bất kỳ thao tác nào gọi API nhận HTTP 401 sẽ không bị văng ngay ra ngoài.
- **Thao tác:** Thực hiện một thao tác gọi API (ví dụ: bấm làm mới thông tin tiệc cưới hoặc chuyển tab).
- **Quan sát:**
  - Hệ thống tự động bắt mã 401, gửi một request `POST /auth/android-session-refreshes`.
  - Cập nhật Access Token mới và thử lại (retry) đúng request ban đầu với cùng headers và Idempotency-Key.
  - Nếu có 2 hay nhiều request đồng thời gặp 401, cơ chế `single-flight` đảm bảo chỉ có duy nhất **1 request refresh** được gửi đi; các request còn lại cùng đợi kết quả refresh này rồi mới retry.
- **Tiêu chí Đạt:** Thao tác của người dùng không bị gián đoạn, dữ liệu tải thành công mà không hiển thị lỗi 401 ra màn hình.

#### Bước 2.3: Xử lý khi Phiên bị thu hồi hoặc Refresh Token hết hạn

- **Cơ chế:** Khi server thu hồi phiên hoặc Refresh Token trong `SecureStore` không còn hợp lệ (hoặc sau khi retry vẫn nhận 401):
- **Quan sát:**
  - Hệ thống xóa sạch Access Token trong memory và xóa Refresh Token khỏi `SecureStore`.
  - Xóa toàn bộ dữ liệu tiệc cưới và thông tin cá nhân trong state.
  - Chuyển hướng người dùng về màn hình Đăng nhập cùng thông báo: `Phiên đăng nhập đã hết hạn hoặc bị thu hồi từ thiết bị khác. Vui lòng đăng nhập lại.`
- **Tiêu chí Đạt:** Không lưu trữ dữ liệu rác, không bị treo app ở màn hình lỗi.

#### Bước 2.4: Đăng xuất chủ động (Logout)

- **Đường đi:** Tab **Cài đặt** (hoặc biểu tượng tài khoản góc trên bên phải) -> Mục **Phiên đăng nhập**.
- **Thao tác:** Bấm nút **Đăng xuất khỏi thiết bị này** (hoặc biểu tượng Đăng xuất).
- **Quan sát:**
  - Client gọi `DELETE /auth/sessions/current`.
  - Token trong memory và SecureStore được xóa sạch.
  - Bộ nhớ tạm của tài khoản và thông tin tiệc cưới bị xóa hoàn toàn.
  - Ứng dụng chuyển về màn hình Đăng nhập với các ô nhập trắng trơn, không còn sót lại tên hoặc dữ liệu của người dùng trước.
- **Tiêu chí Đạt:** Đăng xuất an toàn tuyệt đối, không có tình trạng rò rỉ dữ liệu tài khoản cũ.

---

### Kịch bản 3: Danh sách phiên đăng nhập & Thu hồi từ xa (Session Management)

#### Bước 3.1: Xem danh sách các phiên đăng nhập thật

- **Đường đi:** Màn hình Tổng quan -> Bấm vào icon Cài đặt tài khoản -> Kéo xuống phần **Quản lý thiết bị & Phiên đăng nhập**.
- **Quan sát:**
  - Client gọi `GET /auth/sessions`.
  - Danh sách hiển thị các phiên thật từ server:
    - Phiên hiện tại có gắn nhãn: `(Thiết bị này)`.
    - Loại thiết bị: `Android` hoặc `Web Browser`.
    - Thời gian hoạt động gần nhất (Last Seen).
    - Trạng thái: `Đang hoạt động`.
  - Không có bất kỳ thiết bị giả lập hay mock data nào được thêm vào danh sách.
- **Tiêu chí Đạt:** Danh sách phản ánh đúng các phiên đang mở trên server.

#### Bước 3.2: Thu hồi phiên của thiết bị khác từ xa

- **Điều kiện:** Đăng nhập cùng tài khoản trên một trình duyệt Web hoặc thiết bị khác để có ít nhất 2 phiên trong danh sách.
- **Thao tác:** Bấm nút **Đăng xuất** (màu đỏ) cạnh một phiên khác trong danh sách -> Hộp thoại xác nhận xuất hiện: `Bạn có chắc muốn đăng xuất phiên làm việc này từ xa?` -> Bấm **Xác nhận**.
- **Quan sát:**
  - Client gửi `DELETE /auth/sessions/{sessionId}`.
  - Phiên đó biến mất khỏi danh sách.
  - Thiết bị kia khi thực hiện thao tác tiếp theo sẽ bị server từ chối và tự động quay về màn hình đăng nhập.
- **Tiêu chí Đạt:** Thu hồi phiên từ xa thành công.

---

### Kịch bản 4: Quên mật khẩu qua mã OTP (UC03)

#### Bước 4.1: Chuyển sang màn hình Quên mật khẩu

- **Đường đi:** Tại màn hình Đăng nhập, bấm dòng chữ **Quên mật khẩu?**.
- **Quan sát:**
  - Ứng dụng chuyển sang màn hình **Khôi phục mật khẩu qua OTP**.
  - Không còn luồng reset qua liên kết email cũ (link-token). Chỉ có luồng xác thực bằng mã OTP 6 số.

#### Bước 4.2: Yêu cầu gửi mã OTP

- **Thao tác:**
  - Nhập email của tài khoản thử nghiệm vào ô `Email khôi phục`.
  - Bấm nút **Gửi mã OTP xác nhận**.
- **Quan sát:**
  - Nút chuyển sang trạng thái chờ.
  - Client gửi `POST /auth/password-otp-requests` với `{ email }`.
  - Khi thành công, server trả về `challengeId`, `expiresInSeconds`, và `resendAfterSeconds`.
  - Giao diện chuyển sang bước 2:
    - Ô nhập `Mã xác thực OTP (6 chữ số)`.
    - Ô nhập `Mật khẩu mới` và `Xác nhận mật khẩu mới`.
    - Đồng hồ đếm ngược gửi lại hiển thị chính xác theo `resendAfterSeconds` từ server (ví dụ: `Gửi lại mã sau 60s`).
    - Nút gửi lại bị vô hiệu hóa cho đến khi đếm về 0.
- **Tiêu chí Đạt:** Nhận đúng `challengeId` từ server, đếm ngược thật theo server, không dùng timer hardcode.

#### Bước 4.3: Nhập sai mã OTP hoặc mã OTP hết hạn

- **Thao tác:**
  - Nhập mã OTP sai (ví dụ: `000000`).
  - Nhập mật khẩu mới hợp lệ (ví dụ: `MatKhauMoi2026!`).
  - Bấm **Hoàn tất đặt lại mật khẩu**.
- **Quan sát:**
  - Server trả về HTTP 400 hoặc 422 với mã `OTP_INVALID` hoặc `CHALLENGE_EXPIRED`.
  - Giao diện hiển thị: `Mã OTP không chính xác. Vui lòng kiểm tra lại tin nhắn hoặc email của bạn.` hoặc `Mã xác thực OTP đã hết hạn. Vui lòng yêu cầu mã mới.`
- **Tiêu chí Đạt:** Báo lỗi rõ ràng, cho phép người dùng nhập lại hoặc gửi lại mã.

#### Bước 4.4: Hoàn tất đổi mật khẩu thành công

- **Thao tác:**
  - Nhập đúng mã OTP 6 số nhận được từ email.
  - Nhập mật khẩu mới (tối thiểu 12 ký tự) và xác nhận trùng khớp.
  - Bấm **Hoàn tất đặt lại mật khẩu**.
- **Quan sát:**
  - Client gửi `POST /auth/password-otp-completions` với `{ challengeId, code, newPassword }`.
  - Server xác thực thành công.
  - Giao diện hiển thị thông báo thành công: `Đặt lại mật khẩu thành công! Vui lòng đăng nhập bằng mật khẩu mới của bạn.`
  - Tự động quay về màn hình Đăng nhập và điền sẵn email.
- **Thao tác kiểm tra chéo:** Đăng nhập bằng mật khẩu cũ -> Thất bại (401). Đăng nhập bằng mật khẩu mới -> Thành công vào app.
- **Tiêu chí Đạt:** Mật khẩu được cập nhật thật trên server; mật khẩu cũ không còn dùng được.

#### Bước 4.5: Trường hợp Email Worker của server bị tắt

- **Điều kiện:** Nếu BE chưa bật worker email trên môi trường test:
- **Quan sát:**
  - Khi bấm gửi OTP, server trả về HTTP 503 `EMAIL_WORKER_DISABLED`.
  - Giao diện hiển thị: `Hệ thống gửi email hiện đang tạm tắt trên máy chủ thử nghiệm. Vui lòng liên hệ quản trị viên để được hỗ trợ.`
  - Không có tình trạng tự động bypass OTP hay giả lập gửi thành công.
- **Tiêu chí Đạt:** Phản ánh trung thực trạng thái hệ thống backend.

---

### Kịch bản 5: Hồ sơ tài khoản & Xử lý xung đột 409 (UC05 - Profile Management)

#### Bước 5.1: Xem thông tin hồ sơ

- **Đường đi:** Màn hình Tổng quan -> Bấm nút Cài đặt -> Mở phần **Thông tin tài khoản**.
- **Quan sát:**
  - Ứng dụng gọi `GET /auth/profile`.
  - Hiển thị thông tin thực tế từ server: `Tên hiển thị` (displayName), `Email`, `Vai trò` (Role: COUPLE).
  - Tên hiển thị độc lập với tên Cô dâu/Chú rể của tiệc cưới.
  - Email và Vai trò được hiển thị dưới dạng chỉ đọc (Read-only), không cho phép chỉnh sửa trực tiếp trên mobile.
- **Tiêu chí Đạt:** Dữ liệu chuẩn theo schema DTO, không gộp lẫn Tên hiển thị với Tên cô dâu/chú rể.

#### Bước 5.2: Cập nhật Tên hiển thị

- **Thao tác:**
  - Thay đổi Tên hiển thị (ví dụ: đổi từ `Nguyễn Văn A` thành `Nguyễn Hoàng Long`).
  - Bấm **Lưu thay đổi**.
- **Quan sát:**
  - Client gửi `PATCH /auth/profile` kèm theo:
    - Body: `{ displayName: "Nguyễn Hoàng Long", expectedRevision: <revision_hien_tai> }`
    - Header: `Idempotency-Key: profile:<uuid>`
  - Khi server trả về HTTP 200, thông báo hiển thị: `Cập nhật hồ sơ thành công`.
  - Tên hiển thị trên thanh tiêu đề và avatar tài khoản được làm mới ngay lập tức.
- **Tiêu chí Đạt:** Cập nhật thành công, lưu đúng revision mới từ server.

#### Bước 5.3: Kiểm tra Xử lý xung đột phiên bản (409 Conflict)

- **Tình huống mô phỏng:** Dữ liệu hồ sơ đã bị sửa đổi từ một thiết bị khác (hoặc trên Web) khiến `expectedRevision` trên app bị cũ.
- **Thao tác:**
  - Trên Web hoặc thiết bị 2: Đổi Tên hiển thị của tài khoản thành `Tên Mới Từ Web`.
  - Trên mobile: Không tải lại trang, nhập `Tên Sửa Trên Mobile` và bấm **Lưu thay đổi**.
- **Quan sát:**
  - Server trả về HTTP 409 `CONFLICT`.
  - App không tự động tăng số revision ảo (`revision + 1`).
  - App tự động gọi `GET /auth/profile` để lấy bản mới nhất từ server.
  - Xuất hiện hộp thoại thông báo xung đột rõ ràng:  
    `Hồ sơ của bạn đã được cập nhật từ phiên làm việc khác. Dữ liệu mới nhất trên máy chủ là: "Tên Mới Từ Web". Bạn có muốn tải lại để xem dữ liệu mới nhất không?`
  - Nếu người dùng chọn **Tải lại**: Form cập nhật theo dữ liệu mới nhất của máy chủ.
  - Nếu người dùng chọn **Tiếp tục giữ bản sửa**: Nội dung người dùng vừa gõ vẫn được bảo toàn để người dùng quyết định gửi lại an toàn với revision mới.
- **Tiêu chí Đạt:** Xử lý 409 minh bạch, tôn trọng dữ liệu người dùng, không ghi đè âm thầm.

---

### Kịch bản 6: Đổi mật khẩu qua OTP từ Cài đặt (UC05)

#### Bước 6.1: Yêu cầu đổi mật khẩu

- **Đường đi:** Màn hình Cài đặt tài khoản -> Mục **Đổi mật khẩu**.
- **Thao tác:**
  - Nhập `Mật khẩu hiện tại` của bạn.
  - Bấm **Gửi mã OTP đổi mật khẩu**.
- **Quan sát:**
  - Client gửi `POST /auth/password-change-otp-requests` kèm `{ currentPassword }` và header `Idempotency-Key`.
  - Nếu nhập sai mật khẩu hiện tại: Server trả về HTTP 400/401 `INVALID_CREDENTIALS` -> Báo lỗi: `Mật khẩu hiện tại không chính xác.`
  - Nếu đúng mật khẩu hiện tại: Server tạo challenge và gửi mã OTP về email của tài khoản. Giao diện mở ô nhập mã OTP và mật khẩu mới kèm đồng hồ đếm ngược.
- **Tiêu chí Đạt:** Bắt buộc xác minh mật khẩu hiện tại trước khi kích hoạt OTP.

#### Bước 6.2: Hoàn tất đổi mật khẩu

- **Thao tác:**
  - Nhập mã OTP 6 số nhận từ email.
  - Nhập `Mật khẩu mới` (12–128 ký tự, khác mật khẩu cũ).
  - Nhập `Xác nhận mật khẩu mới` trùng khớp.
  - Bấm **Xác nhận đổi mật khẩu**.
- **Quan sát:**
  - Client gửi `POST /auth/password-changes` với `{ challengeId, code, newPassword }`.
  - Server đổi mật khẩu thành công và tự động **thu hồi toàn bộ các phiên đăng nhập cũ** để bảo mật.
  - Ứng dụng dọn dẹp credential cục bộ và hiển thị thông báo:  
    `Đổi mật khẩu thành công! Vì lý do bảo mật, vui lòng đăng nhập lại bằng mật khẩu mới của bạn.`
  - Tự động chuyển về màn hình Đăng nhập.
- **Tiêu chí Đạt:** Không xảy ra lỗi tranh chấp phiên (double logout race); mật khẩu mới có hiệu lực ngay lập tức.

---

### Kịch bản 7: Xác minh việc LOẠI BỎ TOÀN BỘ MOCK DATA trong toàn bộ ứng dụng

#### Bước 7.1: Màn hình Danh sách Khách mời (V0GuestsSubflow)

- **Đường đi:** Tab **Khách mời** (hoặc nút xem danh sách khách từ Tổng quan).
- **Quan sát trước khi sửa:** Trước đây có các nhóm mẫu cứng `Bác Hai`, `Cô Ba`, `Chú Tư`, `g-1`, `g-2`, `bạn đại học` và các ô thêm khách giả bằng `useState`.
- **Quan sát thực tế hiện tại:**
  - Toàn bộ nhóm khách giả và khách ảo đã bị **xóa bỏ hoàn toàn**.
  - Màn hình hiển thị trung thực thông tin tiệc cưới từ server:
    - Sảnh cưới: Lấy từ `facts.hallName`.
    - Ca tiệc: Lấy từ `facts.shiftTime`.
    - Số lượng khách dự kiến theo kế hoạch: Lấy từ `facts.planningHeadcount` (do Cặp đôi và Quản lý thống nhất, không tính toán ảo từ danh sách khách).
  - Có khung thông báo chuẩn chính sách:  
    `Ứng dụng di động hiện tại hỗ trợ chế độ xem thông tin kế hoạch và số lượng khách dự kiến. Tính năng quản lý danh mục nhóm khách chi tiết được thực hiện qua giao diện Web của Ban quản lý.`
  - Không có các nút thêm nhóm/thêm khách giả lập gây hiểu nhầm cho người dùng.
- **Tiêu chí Đạt:** Không còn dữ liệu mẫu; giao diện phản ánh đúng DTO tiệc cưới.

#### Bước 7.2: Màn hình Tải ảnh kỷ niệm (V0MediaSubflow)

- **Đường đi:** Tab **Thư viện ảnh cưới** (Media).
- **Quan sát trước khi sửa:** Có nút gửi byte giả `sample-private-wedding-media-bytes` với thông báo thành công giả.
- **Quan sát thực tế hiện tại:**
  - Đã **xóa hoàn toàn đoạn mã gửi byte giả**.
  - Nút tải lên giả bị gỡ bỏ.
  - Giao diện hiển thị rõ thông báo tính năng:  
    `Tính năng tải ảnh cưới riêng tư yêu cầu chọn tệp trực tiếp từ bộ nhớ thiết bị. Hiện tại danh mục hiển thị ảnh cá nhân đang chờ hoàn thiện API từ máy chủ.`
  - Không có thông báo tải lên thành công giả tạo.
- **Tiêu chí Đạt:** Hành vi trung thực, không đánh lừa người dùng bằng upload giả.

#### Bước 7.3: Màn hình Kế hoạch & Lịch trình (V0PlanTab)

- **Đường đi:** Tab **Kế hoạch** (Plan).
- **Quan sát thực tế:**
  - Danh sách các mốc thời gian hiển thị đúng các mục từ server (`activeBooking.timeline`).
  - Không còn cơ chế tự động gắn cờ hoàn thành (`CheckIcon` màu xanh) cho mục đầu tiên (`index === 0`).
  - Tất cả các mốc thời gian hiển thị biểu tượng đồng hồ (`ClockIcon`) trung tính phản ánh lịch trình dự kiến của tiệc.
- **Tiêu chí Đạt:** Không tự ý bịa đặt trạng thái hoàn thành khi server chưa có trường trạng thái tương ứng.

#### Bước 7.4: Màn hình Thiệp cưới (V0InviteTab)

- **Đường đi:** Tab **Thiệp cưới** -> Chỉnh sửa văn bản thiệp cưới.
- **Quan sát thực tế:**
  - Khi lưu chỉnh sửa gặp xung đột phiên bản (409):
    - Hệ thống lấy chính xác số phiên bản `fresh.revisionNumber` từ server.
    - Không còn sử dụng công thức giả định `Math.max(fresh.revisionNumber, selectedDesign.revisionNumber + 1)`.
    - Trong trường hợp không kết nối được để lấy bản mới nhất, hệ thống giữ giá trị `null` và hiển thị rõ: `Máy chủ đã có phiên bản mới hơn... (chưa thể tải số phiên bản chính xác do kết nối)`.
- **Tiêu chí Đạt:** Loại bỏ hoàn toàn việc tự sinh revision giả.

---

## 4. Bảng tổng hợp Tiêu chí Đạt / Không đạt (Pass/Fail Matrix)

| STT | Luồng kiểm thử             | Tiêu chí ĐẠT (PASS)                                                                  | Tiêu chí KHÔNG ĐẠT (FAIL)                                       |
| --- | -------------------------- | ------------------------------------------------------------------------------------ | --------------------------------------------------------------- |
| 1   | Đăng nhập tài khoản FULL   | Nhập email/mật khẩu đúng -> Vào màn hình Tổng quan, hiển thị đúng tên và tiệc cưới.  | Bị treo, văng ra ngoài hoặc báo lỗi sai khi dữ liệu đúng.       |
| 2   | Đăng nhập sai mật khẩu     | Báo lỗi `Email hoặc mật khẩu không chính xác`, không lưu session.                    | Báo lỗi generic không rõ ràng hoặc lưu credential rác.          |
| 3   | Tài khoản RESTRICTED       | Hiển thị thông báo hướng dẫn truy cập Web, có nút Đăng xuất an toàn.                 | Tự ý cấp quyền FULL hoặc hiển thị màn hình trắng.               |
| 4   | Cold start / Khởi động lại | Mở lại app không phải đăng nhập lại, phiên được khôi phục từ SecureStore.            | Bắt đăng nhập lại mỗi lần mở app dù token còn hạn.              |
| 5   | Token Refresh qua 401      | Tự động refresh 1 lần và retry thao tác thành công, không gián đoạn.                 | Văng ra login ngay lập tức hoặc rơi vào vòng lặp vô tận.        |
| 6   | Đăng xuất chủ động         | Xóa sạch token, xóa sạch thông tin người dùng, về màn hình đăng nhập.                | Vẫn còn lưu tên người cũ hoặc quay lại app vẫn thấy dữ liệu cũ. |
| 7   | Quản lý phiên thiết bị     | Hiển thị danh sách thiết bị thật, thu hồi được phiên từ xa.                          | Danh sách thiết bị bịa đặt hoặc thu hồi không có tác dụng.      |
| 8   | Quên mật khẩu qua OTP      | Nhập email -> nhận OTP thật -> đổi mật khẩu mới -> đăng nhập được bằng mật khẩu mới. | Sử dụng link reset cũ, hardcode countdown, hoặc bypass OTP.     |
| 9   | Cập nhật Tên hiển thị      | Đổi tên thành công, cập nhật avatar và header; xử lý 409 minh bạch.                  | Tự tăng revision + 1, ghi đè mất dữ liệu người dùng.            |
| 10  | Đổi mật khẩu trong Cài đặt | Yêu cầu mật khẩu hiện tại -> OTP -> đổi xong thu hồi các phiên cũ an toàn.           | Báo thành công giả, không bắt buộc mật khẩu hiện tại.           |
| 11  | Khách mời (V0Guests)       | Không còn nhóm Bác Hai/Cô Ba/g-1/g-2 ảo; hiển thị thông tin thực tế.                 | Vẫn còn dữ liệu mẫu hardcode hoặc ô thêm khách giả lập.         |
| 12  | Thư viện ảnh (V0Media)     | Không còn byte ảnh giả và thông báo thành công giả; nêu rõ tình trạng API.           | Vẫn gửi fake bytes và báo đã tải lên thành công.                |
| 13  | Lịch trình & Thiệp cưới    | Không tự động hoàn thành mục đầu tiên; không dùng `Math.max(fresh, old+1)`.          | Vẫn hiện dấu tích xanh giả hoặc tự tăng revision thiệp cưới.    |

---

## 5. Các điểm nghẽn & Giới hạn hiện tại của Backend (Blockers / Notes)

Trong quá trình chủ dự án thực hiện kiểm thử thủ công, xin lưu ý các điểm sau liên quan đến phía Backend:

1. **Email Worker trên Railway:**  
   Nếu Backend deploy trên Railway chưa được kích hoạt worker gửi email thực tế hoặc biến môi trường SMTP/Resend chưa cấu hình, các API gửi OTP (`/auth/password-otp-requests` và `/auth/password-change-otp-requests`) có thể trả về lỗi 503 `EMAIL_WORKER_DISABLED`. Đây là hành vi đúng chuẩn của server khi worker tắt; cần bật worker để nhận OTP thật vào hòm thư.
2. **API Danh sách Khách mời cho Mobile:**  
   Theo hợp đồng Backend hiện hành và tài liệu bàn giao `02-mobile-be-fe-handoff.md`, Backend chưa cung cấp endpoint CRUD khách mời riêng biệt cho mobile ngoài phạm vi A1. Mobile hiện đóng vai trò hiển thị số liệu tiệc cưới thực tế (`planningHeadcount`, `hallName`, `shiftTime`) và định hướng quản lý chi tiết qua Web.
3. **Endpoint Liệt kê Ảnh cưới riêng tư:**  
   Theo ghi chú câu hỏi số 6 (Handoff Q6), Backend hiện chưa mở endpoint truy vấn danh sách các file media riêng tư đã upload của tiệc cưới. Do đó, nút upload byte giả đã được gỡ bỏ hoàn toàn và màn hình hiển thị thông báo chờ API thật từ server.
4. **Tuyệt đối không chạy test tự động:**  
   Để đảm bảo không ảnh hưởng đến dữ liệu trên môi trường deploy thực tế và tuân thủ tuyệt đối chỉ đạo của chủ dự án, toàn bộ các bước kiểm tra trên phải được tiến hành bằng mắt và thao tác tay trực tiếp trên ứng dụng.
