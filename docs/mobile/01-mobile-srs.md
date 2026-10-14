# Yêu cầu triển khai wedding-app từ SRS FPT606

Ngày tổng hợp: 14/10/2026. Đây là tài liệu triển khai mobile được tổng hợp từ file người dùng cung cấp, không phải bằng chứng code đã hoàn tất, API đã chạy live hoặc CI đã đạt. Phần đầu hướng dẫn phạm vi wedding-app; phần cuối giữ toàn bộ nội dung nguồn để tra cứu, kể cả phần Web/Manager và lịch sử. Những đoạn prompt/chỉ thị trong nguồn được lưu như nội dung tham khảo, không tự động trở thành lệnh thực thi. Không thay code, API lock, cấu hình hay pipeline trong tác vụ tạo tài liệu này.

Nguồn mới mô tả backend `d257be8507dd83e9da73ac69605646a8fbcc7209`, `WEDDING-CONTRACT-3@3.0.0`, OpenAPI 218 operation, digest `6a8be82541ca2d8ce274f9817d10bcd300c91de2f5e734055cf9108b23db0915`. Các kết luận blocker trước đây dựa pin `0a77391…` không được áp dụng nguyên xi cho contract mới. Nâng pin/sinh type/đối chiếu capability là công việc triển khai tiếp theo, chưa được thực hiện bởi ba file Markdown này. Trạng thái backend NO_GO/provider-worker trong nguồn là trạng thái được tài liệu ghi nhận ngày 13/10, không phải kiểm tra live mới.

**File nguồn:** `C:\Users\Admin\Downloads\FPT606_SRS_WDP301.docx`

**SHA-256 file Word:** `4e7f8f03b553741224600f8684f0a87d50b4b871bf233fd7594eb941a4ba3b29`

## Đọc nhanh

- [Yêu cầu và phạm vi mobile](01-mobile-srs.md)
- [Flow và tích hợp backend cho mobile](02-mobile-be-fe-handoff.md)
- [Đối chiếu DescriptionAPI và phần không áp dụng](03-description-api-review.md)
- [Bản chuyển nội dung nguồn đầy đủ](#noi-dung-nguon)

## Phạm vi cần làm trước

Mobile là ứng dụng **Couple Android sau khi có FULL access**, React Native Expo 57 / RN 0.86 / TypeScript. Workspace RESTRICTED, cộng tác timeline, lập/duyệt hợp đồng và editor thiệp đầy đủ ở Web; app hướng dẫn mở Web khi cần. Không suy quyền chỉ từ phase hay việc đã có tài khoản; phản ánh accessLevel/capabilities do backend trả. Staff trên app là tùy chọn cần nhóm quyết định, chưa là nhiệm vụ mặc định.

Theo mục 9.3 của handoff, MVP app gồm đăng nhập/OTP/hồ sơ/phiên, danh sách và tổng quan tiệc, trạng thái thanh toán/công nợ, xem hợp đồng/phụ lục/đơn in/phát sinh/hoá đơn, sửa nhanh chữ trên thiệp có sẵn, link/QR, inbox và đăng ký FCM. Nhóm khách/danh sách tên là màn xem tùy phạm vi chọn; không tự mở rộng sang import CSV, studio ảnh/AI, vận hành in, Manager hay Staff. Dòng nền tảng chung và quyền API rộng hơn không có nghĩa app phải triển khai mọi thao tác Couple.

## Luồng và dữ liệu phải hiển thị

1. Couple nhận lời mời và tạo tài khoản trên Web trước cọc; RESTRICTED được nâng FULL khi backend xác nhận cọc. Không tạo public signup trên app.
2. Đăng nhập Android, nạp vai trò và danh sách booking, chọn đúng booking; chuyển booking không giữ lại dữ liệu private của booking cũ.
3. Hiển thị ngày/ca/sảnh, phase, accessLevel, số khách dự kiến và timeline có hiệu lực từ DTO thật. `COMPLETED` không đồng nghĩa đã quyết toán; `CANCELLED` không tự hoàn tiền.
4. Xem revision hợp đồng, document/PDF, tên cô dâu/chú rể, MENU/PRINT/SERVICE, giá khoá, tổng và cọc do server tính. Không suy tên từ displayName hay textFields thiệp. Phụ lục có trước–sau và delta có dấu, lịch sử bất biến.
5. Nếu luồng thanh toán trên app được capability cho phép, mở VNPay trong trình duyệt, trở lại và đọc payment attempt. Redirect chỉ là tín hiệu quay lại, không xác nhận thanh toán; UNKNOWN phải hiển thị đang đối soát và khóa thao tác tiền tương ứng.
6. Sau cọc xem chuẩn bị, sửa chữ nhanh trên thiệp theo revision thật, chia sẻ URL/QR backend trả. Không thêm RSVP, check-in QR, trạng thái phản hồi hay danh sách người đến vào thiệp Guest.
7. Xem phát sinh, hoá đơn cuối, công nợ và lịch sử; chỉ Manager ghi phát sinh/chốt/điều chỉnh/hoàn tiền. App không tự cộng hoặc sửa tổng lịch sử.
8. Inbox có danh sách, unread, đánh dấu đọc, preferences; FCM có registration/rotation/revocation và điều hướng resource sau khi kiểm tra quyền.

## Các quy tắc bắt buộc cho mobile

- BR-04–07: không public registration; mật khẩu 12–128 ký tự; OTP 600 giây, resend 60 giây; login 10 lần/15 phút; access 10 phút, refresh 30 ngày không hoạt động/tối đa 90 ngày. Refresh token trong SecureStore, access trong bộ nhớ theo handoff Android.
- BR-08–14: timeline/hợp đồng duyệt đúng revision; tên riêng 1–120 ký tự; giá/snapshot khoá; cọc ceil(30% tổng hợp đồng) do server tính; phụ lục duyệt kép, không thu thêm cọc. App MVP chỉ xem các phần phức tạp, không tự bật quyền sửa vì có API.
- BR-15–20: phát sinh sau giờ kết thúc; hoá đơn immutable, điều chỉnh tạo revision; tiền nguyên VND; UNKNOWN không coi thất bại/chưa trả; huỷ không xoá lịch sử hoặc tự hoàn tiền.
- BR-21–25: Group dùng được không có Guest; danh sách tên có thể rỗng/một phần/đầy đủ, duplicate name là ID khác. `planningHeadcount` nhập riêng, không suy từ số tên hay bàn. Đổi headcount làm seating cần xác nhận lại. Import/các thao tác quản lý nhóm/sơ đồ thuộc Web mặc định; nếu app mở rộng phải theo quyền và quy tắc nguồn.
- BR-26–28: app chỉ sửa chữ, ảnh gốc private; ảnh public phải là derived asset bỏ metadata; cutoff ảnh mặc định -72h nhưng Manager đổi được. Link cá nhân chỉ đọc, credential trong fragment và hết hạn sau kết thúc+24h; QR chung không có quyền check-in. Xem đơn in đủ status/revision/snapshot; lượng đã vào hợp đồng không tính tiền lần hai.
- BR-29–31: check-in opt-in NONE; disabled/null hiển thị Chưa ghi nhận, không 0. Phân biệt planned, listed, checked-in; không suy attendance toàn tiệc từ một phần tên. Companion chưa được chốt; không thêm hoặc cấm bằng giả định.
- BR-32/NFR: không xoá lịch sử hợp đồng/hoá đơn/check-in; dữ liệu riêng tư no-store và không log token/SĐT/tên tìm; tài nguyên trái quyền có thể trả404. HTTPS, tiếng Việt có dấu, sans, trạng thái không chỉ màu, mobile từ360px. Không áp công nghệ test Web/Vitest một cách máy móc vào repo app đang dùng Jest.

## Mức độ ưu tiên và giới hạn

SRS MoSCoW là cho cả hệ thống, không phải mọi Must đều là màn app. App triển khai UC gắn `A` và các màn xem nêu trong handoff 9.3. UC25 ghi Web/Manager nhưng handoff yêu cầu app xem phụ lục; UC34 ghi Web nhưng app có màn xem đơn in. Cọc được SRS đánh dấu W/A nhưng RESTRICTED workspace chỉ Web: kiểm tra capabilities thực, không mở toàn workspace trước cọc trên Android. Staff vẫn chờ quyết định. Không tự làm public catalog/tư vấn/hold, quản lý catalog/Staff, báo cáo, RSVP, Household, companion count, hoàn VNPay tự động, XLSX hoặc tiền thật.

## Checklist trước nghiệm thu

- [ ] Chốt contract mới và strict generated types trước API/màn mới.
- [ ] Đúng FULL/RESTRICTED, phiên Android, refresh/revoked/logout.
- [ ] Tổng quan, timeline và tên có nguồn đúng, không mock fallback thành dữ liệu thật.
- [ ] Xem hợp đồng/PDF/phụ lục/đơn in/hoá đơn đúng immutable revision.
- [ ] Thanh toán có return/poll/UNKNOWN, không tin redirect.
- [ ] Text-only save: stale/reconfirm, stable idempotency key/body, bảo vệ dirty edits và đổi booking.
- [ ] Group/list xem được với không tên và một phần tên; attendance null khác0.
- [ ] Inbox/FCM/preference/resource navigation và credential không lọt log.
- [ ] Kiểm chứng native back/safe area/keyboard/light-dark/accessibility trên thiết bị; JS export không phải device proof.
- [ ] CI hiện hữu đầy đủ và ghi bằng chứng sandbox/provider riêng; không tuyên bố live từ mock.

## Use case nguồn có kênh Android

### SRS B142

| ID   | Tên Use Case                           | Actor chính            | Actor phụ | Ưu tiên | Nền tảng |
| ---- | -------------------------------------- | ---------------------- | --------- | ------- | -------- |
| UC02 | Đăng nhập                              | Couple, Manager, Staff | —         | Must    | W, M, A  |
| UC03 | Đăng xuất & quản lý phiên đăng nhập    | Couple, Manager, Staff | —         | Must    | W, M, A  |
| UC04 | Quên / thiết lập mật khẩu bằng OTP     | Couple, Manager, Staff | Email     | Must    | W, M, A  |
| UC05 | Cập nhật hồ sơ & đổi mật khẩu bằng OTP | Couple, Manager, Staff | Email     | Must    | W, M, A  |

### SRS B148

| ID   | Tên Use Case                          | Actor chính     | Actor phụ | Ưu tiên | Nền tảng     |
| ---- | ------------------------------------- | --------------- | --------- | ------- | ------------ |
| UC17 | Xem danh sách & tổng quan tiệc        | Couple          | —         | Must    | W, A         |
| UC20 | Lập & duyệt hợp đồng thương mại (PDF) | Couple, Manager | —         | Must    | W, M, A(xem) |
| UC21 | Đặt cọc qua VNPay                     | Couple          | VNPay     | Must    | W, A         |

### SRS B151

| ID   | Tên Use Case                        | Actor chính | Actor phụ       | Ưu tiên | Nền tảng      |
| ---- | ----------------------------------- | ----------- | --------------- | ------- | ------------- |
| UC30 | Thiết kế & xuất bản thiệp (ảnh, AI) | Couple      | Storage, Gemini | Must    | W, A(sửa chữ) |

### SRS B154

| ID   | Tên Use Case                     | Actor chính     | Actor phụ | Ưu tiên | Nền tảng |
| ---- | -------------------------------- | --------------- | --------- | ------- | -------- |
| UC36 | Xem công nợ & lịch sử thanh toán | Couple, Manager | —         | Must    | W, M, A  |
| UC37 | Thanh toán số dư qua VNPay       | Couple          | VNPay     | Should  | W, A     |

### SRS B160

| ID   | Tên Use Case                      | Actor chính     | Actor phụ | Ưu tiên | Nền tảng |
| ---- | --------------------------------- | --------------- | --------- | ------- | -------- |
| UC47 | Hộp thư thông báo & tùy chọn nhận | Couple, Manager | —         | Should  | W, M, A  |
| UC49 | Nhận push trên Android            | Couple          | FCM       | Could   | A        |

## Toàn bộ business rules và yêu cầu phi chức năng cần đối chiếu

| Mã    | Chủ đề              | Nội dung                                                                                                                                                                                                                                           |
| ----- | ------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| BR-01 | Slot                | Slot = Sảnh + Ngày + Ca (Trưa/Tối). Mỗi slot chỉ có một booking được xác nhận; các sảnh khác hoặc ngày/ca khác là slot khác.                                                                                                                       |
| BR-02 | Giữ chỗ             | Manager tạo giữ chỗ 15 phút; mỗi slot chỉ một hold hoạt động. Giao dịch cọc chưa rõ kết quả (UNKNOWN) giữ slot kể cả khi hold hết hạn.                                                                                                             |
| BR-03 | Tư vấn              | Khách công khai chỉ gửi yêu cầu tư vấn; không tự tạo booking, giữ chỗ hay thanh toán. Yêu cầu: NEW → CONVERTED/CLOSED.                                                                                                                             |
| BR-04 | Tài khoản Couple    | Couple có tài khoản bằng cách nhận lời mời workspace (hạn 72 giờ, tối đa 3 lần gửi/24 giờ/email). Không có đăng ký công khai.                                                                                                                      |
| BR-05 | Mức quyền           | Couple RESTRICTED trước khi cọc được xác nhận; FULL sau khi cọc thành công. Workspace RESTRICTED chỉ có trên Web.                                                                                                                                  |
| BR-06 | Mật khẩu            | 12–128 ký tự; quên/đặt/đổi mật khẩu bằng OTP gửi email, hiệu lực 10 phút (gửi lại sau 60 giây). Đăng nhập tối đa 10 lần/15 phút, không khoá vĩnh viễn.                                                                                             |
| BR-07 | Phiên               | Access token 10 phút; refresh 30 ngày không hoạt động hoặc tối đa 90 ngày. Người dùng xem và thu hồi được các phiên.                                                                                                                               |
| BR-08 | Timeline            | Mỗi lần sửa tạo revision mới; cần Manager và Couple cùng duyệt đúng revision. Booking chỉ chuyển AWAITING_DEPOSIT khi timeline đã được duyệt kép. Sau cọc, đổi timeline qua yêu cầu thay đổi có lý do.                                             |
| BR-09 | Tên cô dâu/chú rể   | Hai trường riêng, 1–120 ký tự; có thể bỏ trống lúc tư vấn nhưng bắt buộc trước khi gửi duyệt hợp đồng. Không suy từ tên tài khoản. Tên đã vào hợp đồng duyệt không đổi khi hồ sơ sửa sau.                                                          |
| BR-10 | Hợp đồng            | Gồm 1–50 dòng: ≥ 1 MENU (số bàn × giá/bàn), PRINT (số bản × giá/bản), SERVICE (số lượng × đơn giá). Tổng bàn ≤ 500; số khách dự kiến ≤ sức chứa sảnh. Giá lấy từ phiên bản catalog đang bán; catalog đổi sau khi gửi duyệt không làm đổi hợp đồng. |
| BR-11 | Duyệt hợp đồng      | DRAFT → AWAITING_APPROVAL → APPROVED. Manager và Couple duyệt cùng một revision (cùng digest). Sửa bất kỳ dòng nào tạo revision mới, mất mọi duyệt cũ. PDF ghi đủ dòng, tổng và câu “Các chi phí phát sinh sẽ được tính sau”.                      |
| BR-12 | Tiền cọc            | Cọc = làm tròn lên 30% tổng hợp đồng (gồm menu, thiệp in, dịch vụ; không gồm phát sinh). Chỉ được cọc khi hợp đồng APPROVED, timeline gắn với hợp đồng đã duyệt kép, đủ tên và slot hợp lệ.                                                        |
| BR-13 | Xác nhận thanh toán | Chỉ IPN VNPay đã xác thực chữ ký hoặc ghi nhận thủ công của Manager mới xác nhận thanh toán. Trang redirect về không phải bằng chứng. Giao dịch chưa rõ kết quả khoá mọi thay đổi tiền cho tới khi đối soát.                                       |
| BR-14 | Phụ lục             | Sau cọc, thay đổi menu/bàn/in/dịch vụ phải qua phụ lục có lý do, ghi trước–sau và chênh lệch có dấu; hai bên duyệt mới có hiệu lực. Không thu thêm cọc. Tổng thoả thuận không âm.                                                                  |
| BR-15 | Phát sinh           | Chỉ Manager nhập, chỉ sau giờ kết thúc tiệc (không cần chờ hoàn tất), cho tiệc đã xác nhận/hoàn tất và không bị huỷ. Couple chỉ xem, không duyệt.                                                                                                  |
| BR-16 | Hoá đơn cuối        | Tổng cuối = hợp đồng gốc + chênh lệch phụ lục đã duyệt + phát sinh (+ điều chỉnh). Có thể chốt khi không có phát sinh. Hoá đơn đã chốt không sửa/xoá; điều chỉnh tạo revision mới có lý do.                                                        |
| BR-17 | Công nợ             | Đã trả ròng = thanh toán − hoàn tiền; còn phải thu = max(tổng − đã trả ròng, 0); credit = max(đã trả ròng − tổng, 0).                                                                                                                              |
| BR-18 | Hoàn tiền           | Thủ công: Manager duyệt khoản hoàn (theo huỷ tiệc hoặc credit) rồi ghi nhận chứng từ. Không hoàn VNPay tự động.                                                                                                                                    |
| BR-19 | Huỷ tiệc            | Couple chỉ gửi yêu cầu huỷ có lý do; Manager duyệt/từ chối hoặc tự huỷ (lý do 1–500 ký tự). Huỷ không tự hoàn tiền; lịch sử tiền giữ nguyên.                                                                                                       |
| BR-20 | Hoàn tất            | Tiệc CONFIRMED chuyển COMPLETED khi Manager hoàn tất hoặc tự động sau giờ kết thúc + 12 giờ. Hoàn tất không có nghĩa đã quyết toán.                                                                                                                |
| BR-21 | Nhóm khách          | Mỗi tiệc có 4 nhóm mặc định (Parents, Groom Side, Bride Side, Friends), tối đa 100 nhóm, tên 1–80 ký tự, màu #RRGGBB. Nhóm dùng được khi không có tên khách. Nhóm còn khách đang hoạt động không lưu trữ được.                                     |
| BR-22 | Danh sách tên       | Tùy chọn: không, một phần hoặc đầy đủ. Mỗi khách là một người; trùng tên vẫn là khách khác. Tối đa 10.000 khách; SĐT chuẩn E.164; ghi chú ≤ 500 ký tự. Không luồng nào bắt buộc danh sách tên.                                                     |
| BR-23 | Số khách dự kiến    | planningHeadcount nhập riêng; thêm/xoá/import khách không đổi số này. Mỗi lần sửa tạo plan revision và làm sơ đồ bàn cần xác nhận lại.                                                                                                             |
| BR-24 | Import              | Tối đa 1.000 dòng/lần; mỗi dòng có khoá ổn định; xem trước rồi xác nhận trong 30 phút; một dòng lỗi thì không import dòng nào; ô dạng công thức bị từ chối.                                                                                        |
| BR-25 | Sơ đồ bàn           | Chọn mẫu sơ đồ cố định của sảnh; gán nhãn nhóm cho bàn (một bàn ≤ 1 nhóm). Xác nhận khi số khách dự kiến > 0 và trong khoảng của mẫu; ngoài khoảng cần Manager duyệt ngoại lệ (lý do 10–500 ký tự) trong sức chứa vật lý.                          |
| BR-26 | Thiệp               | Chỉ Couple FULL tạo/xuất bản; editor đầy đủ trên Web, App chỉ sửa chữ. Ảnh gốc private; chỉ ảnh công khai đã bỏ metadata được đưa lên thiệp. Hạn chót sửa ảnh mặc định là giờ bắt đầu tiệc − 72 giờ (Manager đổi được).                            |
| BR-27 | Link thiệp cá nhân  | Cấp cho khách có tên; mã nằm trong #fragment; hết hạn sau giờ kết thúc + 24 giờ; cấp lại/lưu trữ khách thu hồi link cũ. Link chỉ xem, không lộ danh sách, liên hệ, tiền.                                                                           |
| BR-28 | Đơn in              | REQUESTED → QUOTED → APPROVED → IN_PRODUCTION → READY_FOR_HANDOVER → HANDED_OVER. Số lượng đã có trong hợp đồng không bị tính tiền lần hai; in thêm/bớt qua phụ lục.                                                                               |
| BR-29 | Check-in            | Mặc định NONE (không ghi nhận, hiển thị “Chưa ghi nhận”). Couple FULL/Manager chủ động bật theo tên khi có ≥ 1 khách có tên; sau bản ghi đầu tiên không tắt được.                                                                                  |
| BR-30 | Quyền Staff         | Staff chỉ check-in tiệc được phân công, trong khung giờ bắt đầu − 2 giờ đến kết thúc + 12 giờ; mỗi khách một lần; chỉ hoàn tác bản ghi của mình. Manager ghi đè khung giờ phải nhập lý do. Staff không sửa khách, số khách, hợp đồng, tiền.        |
| BR-31 | Báo cáo tham dự     | Giữ riêng số dự kiến, số tên đã lập, số tên đã check-in; không tính tỷ lệ tham dự toàn tiệc từ danh sách một phần. Check-in không ảnh hưởng tiền.                                                                                                  |
| BR-32 | Không xoá cứng      | Sảnh, món, gói menu, dịch vụ, mẫu đã dùng chỉ được retire/archive; hợp đồng, phụ lục, hoá đơn, nhật ký check-in là bất biến.                                                                                                                       |

| Mã     | Nhóm             | Yêu cầu                                                                                                                                                                          |
| ------ | ---------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| NFR-01 | Bảo mật          | Mật khẩu băm scrypt; access token ngẫu nhiên 32 byte, chỉ lưu hash; refresh Web trong cookie __Host- HttpOnly Secure SameSite=Lax; phân quyền ở API (UI chỉ phản ánh); HTTPS.    |
| NFR-02 | Bảo mật          | Secret chỉ ở backend (.env/secret store); biến NEXT_PUBLIC_/EXPO_PUBLIC_ chỉ chứa URL. Link khách và token mời ngẫu nhiên, không đoán được; link cá nhân đặt mã trong #fragment. |
| NFR-03 | Bảo mật          | Xác thực chữ ký mọi IPN VNPay; redirect không được dùng làm bằng chứng thanh toán.                                                                                               |
| NFR-04 | Toàn vẹn dữ liệu | Lệnh ghi dùng Idempotency-Key và expectedRevision; giữ chỗ, duyệt, cọc, chốt hoá đơn được tuần tự hoá trong transaction PostgreSQL – không trùng slot, không ghi nợ hai lần.     |
| NFR-05 | Toàn vẹn dữ liệu | Hợp đồng, phụ lục, hoá đơn, nhật ký check-in, sổ cái là append-only/bất biến; sửa bằng revision mới.                                                                             |
| NFR-06 | Hiệu năng        | API phản hồi < 2 giây với 95% request; tìm khách check-in < 1 giây.                                                                                                              |
| NFR-07 | Khả dụng         | Giao diện tiếng Việt, font sans có dấu, không viết hoa bằng CSS; responsive từ 360px; desktop 1440px; điều hướng bàn phím; trạng thái không chỉ dựa vào màu.                     |
| NFR-08 | Tác vụ nền       | Worker 60 giây: nhắc D-3, nhắc hạn ảnh, gửi thông báo có retry; tự hoàn tất tiệc sau kết thúc + 12 giờ; dọn dữ liệu hết hạn.                                                     |
| NFR-09 | Riêng tư         | Dữ liệu private trả Cache-Control: no-store; tài nguyên của tiệc khác trả 404; log không chứa token, SĐT, tên tìm kiếm.                                                          |
| NFR-10 | Bảo trì          | TypeScript, ESLint, Prettier, Vitest; OpenAPI là hợp đồng duy nhất, client sinh type từ file đã khoá digest; CI kiểm tra format, lint, typecheck, test, build.                   |

<a id="noi-dung-nguon"></a>

## Nội dung nguồn đầy đủ

Các mã B là thứ tự block trong XML Word, không phải trang PDF. Bản chuyển giữ văn bản và bảng theo thứ tự để đối chiếu; không giữ bố cục trang Word. Bảng rộng nên xem trong trình đọc Markdown có cuộn ngang. Phần Manager/Web và prompt mẫu ở đây là tham khảo, không mở rộng scope app.

<a id="b2"></a>

**Nguồn B2**

FPT606 – SRS – WDP301

<a id="b3"></a>

**Nguồn B3**

TÀI LIỆU ĐẶC TẢ YÊU CẦU PHẦN MỀM

<a id="b4"></a>

**Nguồn B4**

(Software Requirements Specification – SRS)

<a id="b6"></a>

**Nguồn B6**

FPT606

<a id="b7"></a>

**Nguồn B7**

Hệ thống Quản lý & Tổ chức Tiệc cưới

<a id="b8"></a>

**Nguồn B8**

Môn học: WDP301 – Web & Mobile App (React)

<a id="b9"></a>

**Nguồn B9**

Lớp SE1924 – Học kỳ Fall 2026

<a id="b11"></a>

**Nguồn B11**

Nhóm thực hiện

<a id="b12"></a>

**Nguồn B12 — bảng**

| STT | Họ tên           | Vai trò                                                    |
| --- | ---------------- | ---------------------------------------------------------- |
| 1   | Nguyễn Tuấn Toàn | Team Leader – Frontend wedding-web (Public, Couple, Guest) |
| 2   | Lê Bá Bách       | Backend Developer – recovery owner                         |
| 3   | Nghĩa            | Backend Developer                                          |
| 4   | Long Trì         | Frontend wedding-manage-web (Manager, Staff)               |
| 5   | Lã Gia Huy       | Frontend wedding-app (React Native – Couple)               |

<a id="b14"></a>

**Nguồn B14**

Phiên bản 2.1 – 13/10/2026

<a id="b16"></a>

**Nguồn B16**

Lịch sử phiên bản

<a id="b17"></a>

**Nguồn B17 — bảng**

| Phiên bản | Ngày       | Nội dung thay đổi                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   | Người cập nhật |
| --------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------- |
| 1.0       | 22/09/2026 | Khởi tạo tài liệu: scope, actor, business rules, use case, context, main flow                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       | Nhóm           |
| 1.1       | 22/09/2026 | Đổi luồng đặt tiệc: đặt trên web không cần tài khoản, giữ chỗ 15 phút, cấp tài khoản App sau cọc                                                                                                                                                                                                                                                                                                                                                                                                                                                                    | Nhóm           |
| 1.2       | 22/09/2026 | Chính sách đổi/huỷ, snapshot chính sách, hoàn cọc theo mức, Staff đặt hộ, UC42–UC44                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 | Nhóm           |
| 2.0       | 13/10/2026 | Viết lại theo backend đã bàn giao (WEDDING-CONTRACT-3@3.0.0, 218 API): đặt tiệc qua tư vấn và Manager; tài khoản Couple qua lời mời workspace (RESTRICTED → FULL); timeline + hợp đồng thương mại nhiều dòng + PDF duyệt kép; cọc 30% tổng hợp đồng; phụ lục; chi phí phát sinh, hoá đơn cuối, điều chỉnh; nhóm khách + danh sách tên tùy chọn; sơ đồ bàn theo mẫu; đơn in; check-in theo tên tùy chọn; thông báo; báo cáo. Bỏ: RSVP, QR check-in từng khách, người đi kèm, chính sách hoàn cọc theo bậc, khách tự giữ chỗ/cọc. Cập nhật công nghệ và phân công FE. | Toàn           |
| 2.1       | 13/10/2026 | Chốt môi trường tích hợp wedding-be-production-e1dc; bổ sung cấu hình proxy API cho Web; cập nhật rủi ro và vấn đề cần xác nhận.                                                                                                                                                                                                                                                                                                                                                                                                                                    | Toàn           |

<a id="b19"></a>

**Nguồn B19**

Mục lục

<a id="b20"></a>

**Nguồn B20**

Nếu mục lục trống: trong Word nhấp chuột phải vào mục lục → Update Field → Update entire table.

<a id="b22"></a>

**Nguồn B22**

1. Giới thiệu

<a id="b23"></a>

**Nguồn B23**

1.1 Mục đích tài liệu

<a id="b24"></a>

**Nguồn B24**

Tài liệu mô tả yêu cầu nghiệp vụ và chức năng của FPT606 – Hệ thống Quản lý & Tổ chức Tiệc cưới, đã được đồng bộ với backend thực tế (repo wedding-be, commit d257be8, OpenAPI 218 endpoint). Đây là cơ sở để nhóm vẽ Use Case Diagram, Context Diagram, Main Flow và để 3 thành viên frontend triển khai Web, Admin Web và App trong môn WDP301. Chi tiết kỹ thuật tích hợp (endpoint, DTO, mã lỗi) nằm trong tài liệu đi kèm “FPT606 – Tài liệu bàn giao Backend → Frontend”.

<a id="b25"></a>

**Nguồn B25**

1.2 Bối cảnh & vấn đề

<a id="b26"></a>

**Nguồn B26**

Tổ chức tiệc cưới tại nhà hàng thường rời rạc: tư vấn qua điện thoại, hợp đồng giấy, báo giá thủ công, khách tự quản lý danh sách bằng Excel, chi phí phát sinh tính tay sau tiệc. Nhà hàng dễ trùng lịch sảnh, khó theo dõi công nợ và thay đổi thoả thuận; cặp đôi khó biết chính xác mình đã đồng ý gì và còn phải trả bao nhiêu.

<a id="b27"></a>

**Nguồn B27**

1.3 Mục tiêu

<a id="b28"></a>

**Nguồn B28**

Số hoá quy trình từ yêu cầu tư vấn → đề xuất → timeline → hợp đồng → đặt cọc → chuẩn bị → vận hành → quyết toán trên một hệ thống.

<a id="b29"></a>

**Nguồn B29**

Không trùng lịch: mỗi sảnh chỉ có một tiệc đã xác nhận cho cùng ngày và ca.

<a id="b30"></a>

**Nguồn B30**

Minh bạch tiền: hợp đồng, phụ lục, phát sinh, hoá đơn đều có lịch sử bất biến; tổng tiền luôn do hệ thống tính.

<a id="b31"></a>

**Nguồn B31**

Hỗ trợ cặp đôi chuẩn bị thiệp điện tử, nhóm khách, sơ đồ bàn, đơn in mà không bắt buộc nhập danh sách tên khách.

<a id="b32"></a>

**Nguồn B32**

Giúp nhà hàng vận hành ngày cưới (phân công Staff, check-in tùy chọn) và có báo cáo doanh thu, công nợ, sử dụng sảnh.

<a id="b33"></a>

**Nguồn B33**

1.4 Phạm vi

<a id="b34"></a>

**Nguồn B34**

Trong phạm vi (In scope)

<a id="b35"></a>

**Nguồn B35**

Catalog 1 nhà hàng: hồ sơ, 2 ca (Trưa/Tối), sảnh, món, gói menu, dịch vụ đi kèm, sản phẩm in, mẫu timeline, mẫu sơ đồ bàn, mẫu thiệp – có phiên bản và xuất bản.

<a id="b36"></a>

**Nguồn B36**

Yêu cầu tư vấn công khai; Manager tạo consultation, đề xuất booking, giữ chỗ 15 phút, mời Couple vào workspace.

<a id="b37"></a>

**Nguồn B37**

Timeline cộng tác và duyệt kép; tên cô dâu/chú rể; hợp đồng thương mại nhiều dòng (menu, in, dịch vụ), PDF, duyệt kép.

<a id="b38"></a>

**Nguồn B38**

Đặt cọc 30% qua VNPay (sandbox) và ghi nhận thủ công; phụ lục sau cọc; chi phí phát sinh; hoá đơn cuối và điều chỉnh; thanh toán số dư; duyệt và ghi nhận hoàn tiền thủ công.

<a id="b39"></a>

**Nguồn B39**

Nhóm khách, số khách dự kiến nhập riêng, danh sách tên tùy chọn, import CSV, link thiệp cá nhân.

<a id="b40"></a>

**Nguồn B40**

Sơ đồ bàn theo mẫu cố định, gán nhãn nhóm cho bàn; ngoại lệ sức chứa do Manager duyệt.

<a id="b41"></a>

**Nguồn B41**

Studio thiệp (Web), ảnh cưới private, ảnh công khai, ảnh AI (Gemini), xuất bản thiệp công khai + QR chung; đơn in A5.

<a id="b42"></a>

**Nguồn B42**

Tài khoản Staff, phân công theo tiệc, check-in theo tên (tùy chọn từng tiệc) và hoàn tác có nhật ký.

<a id="b43"></a>

**Nguồn B43**

Thông báo trong app, email, push Android (FCM); dashboard và báo cáo, xuất JSON.

<a id="b44"></a>

**Nguồn B44**

Ngoài phạm vi (Out of scope)

<a id="b45"></a>

**Nguồn B45**

Các loại tiệc khác ngoài tiệc cưới; nhiều nhà hàng (multi-tenant).

<a id="b46"></a>

**Nguồn B46**

Khách tự đặt tiệc / tự giữ chỗ / tự thanh toán ngay từ catalog; tự đăng ký tài khoản.

<a id="b47"></a>

**Nguồn B47**

RSVP (xác nhận tham dự), hạn RSVP, nhắc RSVP, thống kê phản hồi; Household; đếm người đi kèm (chưa chốt nghiệp vụ).

<a id="b48"></a>

**Nguồn B48**

Mã QR check-in riêng cho từng khách; QR công khai không có quyền check-in.

<a id="b49"></a>

**Nguồn B49**

Kéo-thả vẽ sơ đồ tự do hoặc xếp từng người vào từng ghế.

<a id="b50"></a>

**Nguồn B50**

Hoàn tiền tự động qua VNPay; thanh toán tiền thật; chữ ký số trên hợp đồng.

<a id="b51"></a>

**Nguồn B51**

Quản lý kho, chấm công, nhân sự ngoài phân công tiệc; xuất báo cáo XLSX.

<a id="b52"></a>

**Nguồn B52**

Mức độ ưu tiên (MoSCoW)

<a id="b53"></a>

**Nguồn B53 — bảng**

| Mức    | Ý nghĩa trong dự án                                                                                                       |
| ------ | ------------------------------------------------------------------------------------------------------------------------- |
| Must   | Luồng xương sống: catalog, tư vấn, booking, timeline, hợp đồng, cọc, nhóm khách, thiệp công khai, phát sinh, hoá đơn cuối |
| Should | Phụ lục, đơn in, sơ đồ bàn, danh sách tên + import, link cá nhân, Staff + check-in, thanh toán số dư online               |
| Could  | Ảnh AI, push Android, dashboard nâng cao, gửi email link cá nhân                                                          |

<a id="b55"></a>

**Nguồn B55**

1.5 Thuật ngữ

<a id="b56"></a>

**Nguồn B56 — bảng**

| Thuật ngữ                    | Giải thích                                                                                                                        |
| ---------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| Couple                       | Cặp đôi cô dâu – chú rể, chủ của tiệc. Có tài khoản sau khi nhận lời mời workspace.                                               |
| RESTRICTED / FULL            | Mức quyền của Couple: RESTRICTED trước khi cọc được xác nhận (chỉ đề xuất, timeline, hợp đồng, cọc); FULL sau khi cọc thành công. |
| Guest                        | Khách mời, không có tài khoản; chỉ xem thiệp qua link công khai hoặc link cá nhân.                                                |
| Manager                      | Quản lý nhà hàng (đã gộp vai trò System Admin do single-tenant).                                                                  |
| Staff                        | Nhân viên được Manager cấp quyền và phân công vào từng tiệc để check-in.                                                          |
| Consultation                 | Hồ sơ tư vấn của một cặp đôi, gốc của workspace và booking.                                                                       |
| Booking                      | Tiệc: sảnh, ngày, ca, gói menu, số bàn, số khách dự kiến. Phase: DRAFT, AWAITING_DEPOSIT, CONFIRMED, COMPLETED, CANCELLED.        |
| Slot                         | Sảnh + Ngày + Ca. Mỗi slot chỉ có một booking được xác nhận.                                                                      |
| Slot hold                    | Giữ chỗ tạm 15 phút do Manager tạo.                                                                                               |
| Timeline                     | Chương trình tiệc (giờ – nội dung). Mỗi lần sửa là một revision bất biến; cần cả hai bên duyệt.                                   |
| Hợp đồng thương mại          | Danh sách dòng MENU / PRINT / SERVICE với giá đã khoá, có PDF; hai bên duyệt cùng một revision.                                   |
| Phụ lục (Appendix)           | Thay đổi thoả thuận sau cọc, có lý do và chênh lệch tiền (deltaVnd).                                                              |
| Chi phí phát sinh            | Khoản phát sinh trong tiệc (bia thêm, vỡ ly…), Manager nhập sau giờ kết thúc.                                                     |
| Hoá đơn cuối (Final invoice) | Bản chốt = hợp đồng + phụ lục đã duyệt + phát sinh; điều chỉnh tạo revision mới.                                                  |
| Nhóm khách (Guest Group)     | Nhóm như “Nhà trai”, “Bạn bè”; dùng được khi không có tên khách nào.                                                              |
| planningHeadcount            | Số khách dự kiến, nhập riêng; không suy từ danh sách tên hay số bàn.                                                              |
| Revision / expectedRevision  | Số phiên bản dùng chống ghi đè khi hai người cùng sửa.                                                                            |
| Idempotency-Key              | Khoá duy nhất cho mỗi thao tác ghi; gửi lại cùng khoá không tạo bản ghi trùng.                                                    |
| IPN                          | Instant Payment Notification – VNPay gọi về backend để báo kết quả giao dịch.                                                     |
| Single-tenant                | Hệ thống chỉ phục vụ một nhà hàng.                                                                                                |

<a id="b58"></a>

**Nguồn B58**

2. Tổng quan hệ thống

<a id="b59"></a>

**Nguồn B59**

2.1 Mô tả tổng quan

<a id="b60"></a>

**Nguồn B60**

FPT606 là hệ thống single-tenant cho một nhà hàng tiệc cưới, gồm một backend REST API dùng chung và ba ứng dụng client. Nhà hàng (Manager, Staff) vận hành trên Admin Web; khách tìm hiểu và cặp đôi cộng tác trên Web; cặp đôi theo dõi tiệc trên App Android; khách mời xem thiệp qua link Web.

<a id="b61"></a>

**Nguồn B61**

2.2 Nền tảng triển khai trong môn WDP301

<a id="b62"></a>

**Nguồn B62 — bảng**

| Nền tảng (repo)                              | Actor                                     | Lý do                                                                                                                                                                                                           |
| -------------------------------------------- | ----------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Web public & Couple (wedding-web, Next.js)   | Public, Couple (RESTRICTED + FULL), Guest | Khách xem catalog và gửi tư vấn không cần cài App. Workspace RESTRICTED (timeline, hợp đồng, cọc) và trình thiết kế thiệp đầy đủ chỉ có trên Web vì cần màn hình lớn. Guest mở thiệp qua link trên trình duyệt. |
| Admin Web (wedding-manage-web, Next.js)      | Manager, Staff                            | Manager thao tác nhiều bảng, lịch, tài chính, báo cáo. Staff dùng khu tác nghiệp (nút lớn) trên điện thoại/tablet để tìm và check-in khách.                                                                     |
| App Android (wedding-app, React Native Expo) | Couple (FULL), Staff (tùy chọn)           | Couple theo dõi tiệc, thanh toán, sửa nhanh chữ trên thiệp, nhận thông báo/push.                                                                                                                                |

<a id="b64"></a>

**Nguồn B64**

2.3 Actor

<a id="b65"></a>

**Nguồn B65 — bảng**

| Actor                    | Loại                 | Mô tả                                                                                                                                                 |
| ------------------------ | -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| Public visitor           | Primary              | Xem nhà hàng, sảnh, menu, dịch vụ; gửi yêu cầu tư vấn                                                                                                 |
| Couple                   | Primary              | Nhận lời mời workspace; cùng lập timeline, hợp đồng; đặt cọc; sau cọc chuẩn bị khách, sơ đồ, thiệp, đơn in, phụ lục; xem phát sinh/hoá đơn; trả số dư |
| Guest                    | Primary              | Xem thiệp công khai hoặc thiệp cá nhân (chỉ đọc)                                                                                                      |
| Manager                  | Primary              | Catalog, tư vấn, booking, hợp đồng/phụ lục, đơn in, tài chính, Staff, báo cáo, thông báo                                                              |
| Staff                    | Primary              | Tìm khách, check-in/hoàn tác theo tên trong tiệc được phân công                                                                                       |
| VNPay                    | Secondary – hệ thống | Thanh toán cọc/số dư (sandbox), gửi IPN có chữ ký                                                                                                     |
| Email Service (Brevo)    | Secondary – hệ thống | Lời mời workspace, OTP, thông báo, link thiệp cá nhân                                                                                                 |
| Supabase Storage         | Secondary – hệ thống | Ảnh catalog, ảnh cưới private, ảnh công khai của thiệp                                                                                                |
| Gemini AI                | Secondary – hệ thống | Tạo ảnh minh hoạ cho thiệp (có phí)                                                                                                                   |
| Firebase Cloud Messaging | Secondary – hệ thống | Push thông báo đến App Android                                                                                                                        |

<a id="b67"></a>

**Nguồn B67**

2.4 Giả định & ràng buộc

<a id="b68"></a>

**Nguồn B68**

Một nhà hàng, hai ca cố định LUNCH và DINNER; giờ ca do Manager cấu hình.

<a id="b69"></a>

**Nguồn B69**

Không có đăng ký công khai; Manager đầu tiên do operator tạo; Staff do Manager cấp.

<a id="b70"></a>

**Nguồn B70**

Môi trường tích hợp và demo đã chốt: backend https://wedding-be-production-e1dc.up.railway.app/api/v1 (dữ liệu thử, có thể dựng lại từ migration + seed). Môi trường staging wedding-be-spec11 không dùng.

<a id="b71"></a>

**Nguồn B71**

VNPay chỉ sandbox.

<a id="b72"></a>

**Nguồn B72**

Email worker và push hiện tắt trên môi trường demo; khi demo cần tài khoản test do BE cung cấp.

<a id="b73"></a>

**Nguồn B73**

Thời gian hiển thị theo Asia/Ho_Chi_Minh; tiền là số nguyên VND.

<a id="b74"></a>

**Nguồn B74**

3. Quy tắc nghiệp vụ (Business Rules)

<a id="b75"></a>

**Nguồn B75**

Các quy tắc dưới đây đã được backend cài đặt và kiểm thử; được tham chiếu trong đặc tả Use Case (mục 6.3).

<a id="b76"></a>

**Nguồn B76 — bảng**

| Mã    | Chủ đề              | Nội dung                                                                                                                                                                                                                                           |
| ----- | ------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| BR-01 | Slot                | Slot = Sảnh + Ngày + Ca (Trưa/Tối). Mỗi slot chỉ có một booking được xác nhận; các sảnh khác hoặc ngày/ca khác là slot khác.                                                                                                                       |
| BR-02 | Giữ chỗ             | Manager tạo giữ chỗ 15 phút; mỗi slot chỉ một hold hoạt động. Giao dịch cọc chưa rõ kết quả (UNKNOWN) giữ slot kể cả khi hold hết hạn.                                                                                                             |
| BR-03 | Tư vấn              | Khách công khai chỉ gửi yêu cầu tư vấn; không tự tạo booking, giữ chỗ hay thanh toán. Yêu cầu: NEW → CONVERTED/CLOSED.                                                                                                                             |
| BR-04 | Tài khoản Couple    | Couple có tài khoản bằng cách nhận lời mời workspace (hạn 72 giờ, tối đa 3 lần gửi/24 giờ/email). Không có đăng ký công khai.                                                                                                                      |
| BR-05 | Mức quyền           | Couple RESTRICTED trước khi cọc được xác nhận; FULL sau khi cọc thành công. Workspace RESTRICTED chỉ có trên Web.                                                                                                                                  |
| BR-06 | Mật khẩu            | 12–128 ký tự; quên/đặt/đổi mật khẩu bằng OTP gửi email, hiệu lực 10 phút (gửi lại sau 60 giây). Đăng nhập tối đa 10 lần/15 phút, không khoá vĩnh viễn.                                                                                             |
| BR-07 | Phiên               | Access token 10 phút; refresh 30 ngày không hoạt động hoặc tối đa 90 ngày. Người dùng xem và thu hồi được các phiên.                                                                                                                               |
| BR-08 | Timeline            | Mỗi lần sửa tạo revision mới; cần Manager và Couple cùng duyệt đúng revision. Booking chỉ chuyển AWAITING_DEPOSIT khi timeline đã được duyệt kép. Sau cọc, đổi timeline qua yêu cầu thay đổi có lý do.                                             |
| BR-09 | Tên cô dâu/chú rể   | Hai trường riêng, 1–120 ký tự; có thể bỏ trống lúc tư vấn nhưng bắt buộc trước khi gửi duyệt hợp đồng. Không suy từ tên tài khoản. Tên đã vào hợp đồng duyệt không đổi khi hồ sơ sửa sau.                                                          |
| BR-10 | Hợp đồng            | Gồm 1–50 dòng: ≥ 1 MENU (số bàn × giá/bàn), PRINT (số bản × giá/bản), SERVICE (số lượng × đơn giá). Tổng bàn ≤ 500; số khách dự kiến ≤ sức chứa sảnh. Giá lấy từ phiên bản catalog đang bán; catalog đổi sau khi gửi duyệt không làm đổi hợp đồng. |
| BR-11 | Duyệt hợp đồng      | DRAFT → AWAITING_APPROVAL → APPROVED. Manager và Couple duyệt cùng một revision (cùng digest). Sửa bất kỳ dòng nào tạo revision mới, mất mọi duyệt cũ. PDF ghi đủ dòng, tổng và câu “Các chi phí phát sinh sẽ được tính sau”.                      |
| BR-12 | Tiền cọc            | Cọc = làm tròn lên 30% tổng hợp đồng (gồm menu, thiệp in, dịch vụ; không gồm phát sinh). Chỉ được cọc khi hợp đồng APPROVED, timeline gắn với hợp đồng đã duyệt kép, đủ tên và slot hợp lệ.                                                        |
| BR-13 | Xác nhận thanh toán | Chỉ IPN VNPay đã xác thực chữ ký hoặc ghi nhận thủ công của Manager mới xác nhận thanh toán. Trang redirect về không phải bằng chứng. Giao dịch chưa rõ kết quả khoá mọi thay đổi tiền cho tới khi đối soát.                                       |
| BR-14 | Phụ lục             | Sau cọc, thay đổi menu/bàn/in/dịch vụ phải qua phụ lục có lý do, ghi trước–sau và chênh lệch có dấu; hai bên duyệt mới có hiệu lực. Không thu thêm cọc. Tổng thoả thuận không âm.                                                                  |
| BR-15 | Phát sinh           | Chỉ Manager nhập, chỉ sau giờ kết thúc tiệc (không cần chờ hoàn tất), cho tiệc đã xác nhận/hoàn tất và không bị huỷ. Couple chỉ xem, không duyệt.                                                                                                  |
| BR-16 | Hoá đơn cuối        | Tổng cuối = hợp đồng gốc + chênh lệch phụ lục đã duyệt + phát sinh (+ điều chỉnh). Có thể chốt khi không có phát sinh. Hoá đơn đã chốt không sửa/xoá; điều chỉnh tạo revision mới có lý do.                                                        |
| BR-17 | Công nợ             | Đã trả ròng = thanh toán − hoàn tiền; còn phải thu = max(tổng − đã trả ròng, 0); credit = max(đã trả ròng − tổng, 0).                                                                                                                              |
| BR-18 | Hoàn tiền           | Thủ công: Manager duyệt khoản hoàn (theo huỷ tiệc hoặc credit) rồi ghi nhận chứng từ. Không hoàn VNPay tự động.                                                                                                                                    |
| BR-19 | Huỷ tiệc            | Couple chỉ gửi yêu cầu huỷ có lý do; Manager duyệt/từ chối hoặc tự huỷ (lý do 1–500 ký tự). Huỷ không tự hoàn tiền; lịch sử tiền giữ nguyên.                                                                                                       |
| BR-20 | Hoàn tất            | Tiệc CONFIRMED chuyển COMPLETED khi Manager hoàn tất hoặc tự động sau giờ kết thúc + 12 giờ. Hoàn tất không có nghĩa đã quyết toán.                                                                                                                |
| BR-21 | Nhóm khách          | Mỗi tiệc có 4 nhóm mặc định (Parents, Groom Side, Bride Side, Friends), tối đa 100 nhóm, tên 1–80 ký tự, màu #RRGGBB. Nhóm dùng được khi không có tên khách. Nhóm còn khách đang hoạt động không lưu trữ được.                                     |
| BR-22 | Danh sách tên       | Tùy chọn: không, một phần hoặc đầy đủ. Mỗi khách là một người; trùng tên vẫn là khách khác. Tối đa 10.000 khách; SĐT chuẩn E.164; ghi chú ≤ 500 ký tự. Không luồng nào bắt buộc danh sách tên.                                                     |
| BR-23 | Số khách dự kiến    | planningHeadcount nhập riêng; thêm/xoá/import khách không đổi số này. Mỗi lần sửa tạo plan revision và làm sơ đồ bàn cần xác nhận lại.                                                                                                             |
| BR-24 | Import              | Tối đa 1.000 dòng/lần; mỗi dòng có khoá ổn định; xem trước rồi xác nhận trong 30 phút; một dòng lỗi thì không import dòng nào; ô dạng công thức bị từ chối.                                                                                        |
| BR-25 | Sơ đồ bàn           | Chọn mẫu sơ đồ cố định của sảnh; gán nhãn nhóm cho bàn (một bàn ≤ 1 nhóm). Xác nhận khi số khách dự kiến > 0 và trong khoảng của mẫu; ngoài khoảng cần Manager duyệt ngoại lệ (lý do 10–500 ký tự) trong sức chứa vật lý.                          |
| BR-26 | Thiệp               | Chỉ Couple FULL tạo/xuất bản; editor đầy đủ trên Web, App chỉ sửa chữ. Ảnh gốc private; chỉ ảnh công khai đã bỏ metadata được đưa lên thiệp. Hạn chót sửa ảnh mặc định là giờ bắt đầu tiệc − 72 giờ (Manager đổi được).                            |
| BR-27 | Link thiệp cá nhân  | Cấp cho khách có tên; mã nằm trong #fragment; hết hạn sau giờ kết thúc + 24 giờ; cấp lại/lưu trữ khách thu hồi link cũ. Link chỉ xem, không lộ danh sách, liên hệ, tiền.                                                                           |
| BR-28 | Đơn in              | REQUESTED → QUOTED → APPROVED → IN_PRODUCTION → READY_FOR_HANDOVER → HANDED_OVER. Số lượng đã có trong hợp đồng không bị tính tiền lần hai; in thêm/bớt qua phụ lục.                                                                               |
| BR-29 | Check-in            | Mặc định NONE (không ghi nhận, hiển thị “Chưa ghi nhận”). Couple FULL/Manager chủ động bật theo tên khi có ≥ 1 khách có tên; sau bản ghi đầu tiên không tắt được.                                                                                  |
| BR-30 | Quyền Staff         | Staff chỉ check-in tiệc được phân công, trong khung giờ bắt đầu − 2 giờ đến kết thúc + 12 giờ; mỗi khách một lần; chỉ hoàn tác bản ghi của mình. Manager ghi đè khung giờ phải nhập lý do. Staff không sửa khách, số khách, hợp đồng, tiền.        |
| BR-31 | Báo cáo tham dự     | Giữ riêng số dự kiến, số tên đã lập, số tên đã check-in; không tính tỷ lệ tham dự toàn tiệc từ danh sách một phần. Check-in không ảnh hưởng tiền.                                                                                                  |
| BR-32 | Không xoá cứng      | Sảnh, món, gói menu, dịch vụ, mẫu đã dùng chỉ được retire/archive; hợp đồng, phụ lục, hoá đơn, nhật ký check-in là bất biến.                                                                                                                       |

<a id="b78"></a>

**Nguồn B78**

4. Luồng nghiệp vụ chính (Main Flow)

<a id="b79"></a>

**Nguồn B79**

4.1 Tổng quan 8 giai đoạn

<a id="b80"></a>

**Nguồn B80**

Thiết lập nhà hàng → Tư vấn & đề xuất → Thống nhất timeline & hợp đồng → Đặt cọc → Chuẩn bị (khách, sơ đồ, thiệp, in, phụ lục) → Ngày cưới → Quyết toán → Báo cáo.

<a id="b81"></a>

**Nguồn B81**

4.2 Chi tiết từng giai đoạn

<a id="b82"></a>

**Nguồn B82**

Giai đoạn 1 – Thiết lập nhà hàng (Manager · Admin Web)

<a id="b83"></a>

**Nguồn B83**

Cập nhật hồ sơ nhà hàng và giờ hai ca Trưa/Tối.

<a id="b84"></a>

**Nguồn B84**

Tạo sảnh (sức chứa, mô tả, ảnh), món, gói menu (giá/bàn); xuất bản phiên bản.

<a id="b85"></a>

**Nguồn B85**

Tạo dịch vụ (MC, nhạc, múa lân…), sản phẩm in, mẫu thiệp, mẫu timeline, mẫu sơ đồ bàn.

<a id="b86"></a>

**Nguồn B86**

Cấp tài khoản Staff.

<a id="b87"></a>

**Nguồn B87**

Giai đoạn 2 – Tư vấn & đề xuất (Public · Web → Manager · Admin Web)

<a id="b88"></a>

**Nguồn B88**

Khách xem catalog, gửi yêu cầu tư vấn (tên, email, SĐT, ngày và số khách dự kiến, lời nhắn).

<a id="b89"></a>

**Nguồn B89**

Manager chuyển yêu cầu thành consultation (hoặc đóng).

<a id="b90"></a>

**Nguồn B90**

Manager kiểm tra lịch trống, tạo booking (sảnh, ngày, ca, gói menu, số bàn, số khách dự kiến), giữ chỗ 15 phút.

<a id="b91"></a>

**Nguồn B91**

Manager gửi lời mời workspace; Couple mở link, đặt mật khẩu và vào Web với quyền RESTRICTED.

<a id="b92"></a>

**Nguồn B92**

Giai đoạn 3 – Timeline & hợp đồng (Couple + Manager)

<a id="b93"></a>

**Nguồn B93**

Hai bên chỉnh timeline; mỗi lần sửa là revision mới; cả hai duyệt → booking AWAITING_DEPOSIT.

<a id="b94"></a>

**Nguồn B94**

Couple/Manager nhập tên cô dâu, chú rể.

<a id="b95"></a>

**Nguồn B95**

Lập hợp đồng: chọn một hoặc nhiều combo menu và số bàn, dịch vụ, sản phẩm in; hệ thống tính giá; gửi duyệt.

<a id="b96"></a>

**Nguồn B96**

Hai bên duyệt cùng revision; xem/tải PDF.

<a id="b97"></a>

**Nguồn B97**

Giai đoạn 4 – Đặt cọc (Couple ↔ VNPay)

<a id="b98"></a>

**Nguồn B98**

Couple bấm Đặt cọc; hệ thống kiểm tra điều kiện và tạo giao dịch 30% tổng hợp đồng.

<a id="b99"></a>

**Nguồn B99**

Couple thanh toán trên VNPay; VNPay gửi IPN về backend.

<a id="b100"></a>

**Nguồn B100**

Backend xác thực, ghi sổ cái, chuyển booking CONFIRMED, khoá slot, nâng Couple lên FULL.

<a id="b101"></a>

**Nguồn B101**

Couple quay lại trang kết quả; Web đọc trạng thái giao dịch từ backend. Trả tại quầy: Manager ghi nhận thủ công.

<a id="b102"></a>

**Nguồn B102**

Giai đoạn 5 – Chuẩn bị (Couple FULL · Web/App, Manager)

<a id="b103"></a>

**Nguồn B103**

Nhập số khách dự kiến, chỉnh nhóm khách; tùy chọn thêm/import tên khách.

<a id="b104"></a>

**Nguồn B104**

Chọn mẫu sơ đồ bàn, gán nhãn nhóm, xác nhận.

<a id="b105"></a>

**Nguồn B105**

Upload ảnh, thiết kế thiệp, xuất bản → link công khai + QR; tùy chọn cấp link cá nhân, gửi email.

<a id="b106"></a>

**Nguồn B106**

Tạo đơn in; Manager báo giá, Couple duyệt, Manager sản xuất và bàn giao.

<a id="b107"></a>

**Nguồn B107**

Thay đổi thoả thuận → phụ lục hai bên duyệt; thay đổi timeline → yêu cầu thay đổi.

<a id="b108"></a>

**Nguồn B108**

Manager phân công Staff; Couple/Manager bật check-in theo tên nếu muốn.

<a id="b109"></a>

**Nguồn B109**

Giai đoạn 6 – Ngày cưới (Staff · Admin Web)

<a id="b110"></a>

**Nguồn B110**

Staff mở tiệc được phân công, tìm khách theo tên/SĐT, chọn đúng người và check-in.

<a id="b111"></a>

**Nguồn B111**

Sai thì hoàn tác có lý do; nhật ký giữ nguyên.

<a id="b112"></a>

**Nguồn B112**

Guest xem thiệp/QR chung chỉ để xem thông tin, không check-in được.

<a id="b113"></a>

**Nguồn B113**

Giai đoạn 7 – Quyết toán (Manager, Couple)

<a id="b114"></a>

**Nguồn B114**

Sau giờ kết thúc, Manager nhập chi phí phát sinh.

<a id="b115"></a>

**Nguồn B115**

Manager chốt hoá đơn cuối; điều chỉnh nếu cần (có lý do).

<a id="b116"></a>

**Nguồn B116**

Couple xem hoá đơn, trả số dư qua VNPay hoặc tại quầy; nếu trả dư, Manager duyệt và ghi nhận hoàn tiền.

<a id="b117"></a>

**Nguồn B117**

Tiệc hoàn tất (Manager hoặc tự động sau kết thúc + 12 giờ).

<a id="b118"></a>

**Nguồn B118**

Giai đoạn 8 – Báo cáo (Manager)

<a id="b119"></a>

**Nguồn B119**

Xem tiền đã thu, công nợ, booking theo trạng thái, sử dụng sảnh, đơn in, số khách; lọc theo ngày/sảnh; xuất JSON.

<a id="b120"></a>

**Nguồn B120**

4.3 Vòng đời trạng thái

<a id="b121"></a>

**Nguồn B121**

Booking

<a id="b122"></a>

**Nguồn B122 — bảng**

| Trạng thái       | Ý nghĩa                                                | Có thể chuyển sang          |
| ---------------- | ------------------------------------------------------ | --------------------------- |
| DRAFT            | Đang lập đề xuất, timeline chưa duyệt kép              | AWAITING_DEPOSIT, CANCELLED |
| AWAITING_DEPOSIT | Timeline đã duyệt kép, chờ hợp đồng duyệt và cọc       | CONFIRMED, CANCELLED        |
| CONFIRMED        | Cọc đã xác nhận, slot khoá, Couple FULL                | COMPLETED, CANCELLED        |
| COMPLETED        | Tiệc đã diễn ra (trạng thái cuối, vẫn quyết toán được) | —                           |
| CANCELLED        | Đã huỷ (trạng thái cuối)                               | —                           |

<a id="b124"></a>

**Nguồn B124**

Hợp đồng / Phụ lục

<a id="b125"></a>

**Nguồn B125 — bảng**

| Trạng thái        | Ý nghĩa                                                           |
| ----------------- | ----------------------------------------------------------------- |
| DRAFT             | Bản nháp, có thể thay bằng revision mới                           |
| AWAITING_APPROVAL | Đã gửi duyệt, giá đã khoá; chờ hai bên duyệt                      |
| APPROVED          | Cả Manager và Couple đã duyệt cùng revision; PDF được lưu cố định |
| SUPERSEDED        | Bị thay thế bởi revision mới; vẫn giữ lịch sử                     |

<a id="b127"></a>

**Nguồn B127**

Giao dịch thanh toán

<a id="b128"></a>

**Nguồn B128 — bảng**

| Trạng thái        | Ý nghĩa                                                     |
| ----------------- | ----------------------------------------------------------- |
| CREATED / PENDING | Đã tạo giao dịch VNPay, chờ kết quả                         |
| SUCCEEDED         | Thành công (đã xác thực IPN)                                |
| FAILED            | Thất bại hoặc huỷ; có thể tạo giao dịch mới                 |
| UNKNOWN           | Chưa rõ kết quả; khoá thay đổi tiền, giữ slot, chờ đối soát |

<a id="b130"></a>

**Nguồn B130**

Các đối tượng khác

<a id="b131"></a>

**Nguồn B131 — bảng**

| Đối tượng               | Trạng thái                                                                                                                |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| Yêu cầu tư vấn          | NEW → CONVERTED \| CLOSED                                                                                                 |
| Timeline revision       | CURRENT → EFFECTIVE (duyệt kép) \| SUPERSEDED                                                                             |
| Đơn in                  | REQUESTED → QUOTED → APPROVED → IN_PRODUCTION → READY_FOR_HANDOVER → HANDED_OVER \| CANCELLED                             |
| Sơ đồ bàn               | DRAFT → CONFIRMED \| REQUIRES_REVIEW (khi số khách dự kiến/booking đổi)                                                   |
| Nhóm khách, Khách       | ACTIVE ↔ ARCHIVED                                                                                                         |
| Check-in mode / bản ghi | NONE \| BY_GUEST_NAME (khoá sau bản ghi đầu) · CHECK_IN, UNDO (append-only)                                               |
| Thiết kế thiệp / mẫu    | DRAFT \| PUBLISHED \| SUPERSEDED                                                                                          |
| Thông báo               | QUEUED → IN_FLIGHT → DELIVERED / PROVIDER_ACCEPTED / RETRYABLE_FAILED / UNKNOWN / DEAD_LETTER / SKIPPED_STALE / CANCELLED |

<a id="b133"></a>

**Nguồn B133**

5. Context Diagram

<a id="b134"></a>

**Nguồn B134**

Context Diagram (DFD mức 0): hệ thống FPT606 là một tiến trình duy nhất ở trung tâm, bao quanh bởi các thực thể ngoài.

<a id="b135"></a>

**Nguồn B135 — bảng**

| Thực thể bên ngoài | Dữ liệu vào hệ thống                                                                                                                                                                                   | Dữ liệu ra từ hệ thống                                                                                    |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------- |
| Public visitor     | Yêu cầu tư vấn                                                                                                                                                                                         | Thông tin nhà hàng, sảnh, menu, dịch vụ                                                                   |
| Couple             | Mật khẩu (nhận lời mời), timeline, tên cô dâu/chú rể, lựa chọn hợp đồng/phụ lục, duyệt, yêu cầu thanh toán, yêu cầu đổi/huỷ, nhóm khách, số dự kiến, tên khách, sơ đồ bàn, ảnh, thiết kế thiệp, đơn in | Đề xuất, PDF hợp đồng, trạng thái tiệc và thanh toán, công nợ, hoá đơn, link/QR thiệp, file in, thông báo |
| Guest              | Link công khai / mã cá nhân                                                                                                                                                                            | Nội dung thiệp chỉ đọc                                                                                    |
| Manager            | Catalog, xử lý tư vấn, booking, giữ chỗ, lời mời, duyệt, báo giá in, thu thủ công, phát sinh, hoá đơn, hoàn tiền, Staff, phân công                                                                     | Inbox tư vấn, lịch sảnh, hồ sơ tiệc, sổ cái, báo cáo, trạng thái gửi thông báo                            |
| Staff              | Tìm khách, check-in, hoàn tác                                                                                                                                                                          | Kết quả tìm, nhãn bàn, nhật ký check-in                                                                   |
| VNPay              | IPN kết quả giao dịch (có chữ ký)                                                                                                                                                                      | Yêu cầu thanh toán (số tiền, mã giao dịch)                                                                |
| Email (Brevo)      | Trạng thái chấp nhận gửi                                                                                                                                                                               | Lời mời, OTP, thông báo, link thiệp cá nhân                                                               |
| Supabase Storage   | URL ký đọc file                                                                                                                                                                                        | Ảnh catalog, ảnh cưới, ảnh thiệp                                                                          |
| Gemini AI          | Ảnh đã tạo                                                                                                                                                                                             | Prompt tạo ảnh                                                                                            |
| FCM                | Trạng thái gửi                                                                                                                                                                                         | Push thông báo Android                                                                                    |

<a id="b137"></a>

**Nguồn B137**

Cách vẽ: đặt hình tròn “FPT606 – Hệ thống Quản lý & Tổ chức Tiệc cưới” ở giữa; 5 actor người dùng (Public, Couple, Guest, Manager, Staff) một phía; 5 hệ thống ngoài (VNPay, Brevo, Supabase Storage, Gemini, FCM) phía còn lại; mỗi dòng là 2 mũi tên vào/ra có nhãn.

<a id="b138"></a>

**Nguồn B138**

6. Use Case

<a id="b139"></a>

**Nguồn B139**

6.1 Danh sách Use Case

<a id="b140"></a>

**Nguồn B140**

Nền tảng: Wp = wedding-web (public) · W = wedding-web (Couple) · G = trang thiệp Guest · M = wedding-manage-web · A = wedding-app

<a id="b141"></a>

**Nguồn B141**

Tài khoản & xác thực

<a id="b142"></a>

**Nguồn B142 — bảng**

| ID   | Tên Use Case                           | Actor chính            | Actor phụ | Ưu tiên | Nền tảng |
| ---- | -------------------------------------- | ---------------------- | --------- | ------- | -------- |
| UC01 | Gửi yêu cầu tư vấn                     | Public                 | —         | Must    | Wp       |
| UC02 | Đăng nhập                              | Couple, Manager, Staff | —         | Must    | W, M, A  |
| UC03 | Đăng xuất & quản lý phiên đăng nhập    | Couple, Manager, Staff | —         | Must    | W, M, A  |
| UC04 | Quên / thiết lập mật khẩu bằng OTP     | Couple, Manager, Staff | Email     | Must    | W, M, A  |
| UC05 | Cập nhật hồ sơ & đổi mật khẩu bằng OTP | Couple, Manager, Staff | Email     | Must    | W, M, A  |
| UC06 | Nhận lời mời workspace                 | Couple                 | —         | Must    | W        |

<a id="b144"></a>

**Nguồn B144**

Catalog nhà hàng

<a id="b145"></a>

**Nguồn B145 — bảng**

| ID   | Tên Use Case                         | Actor chính | Actor phụ | Ưu tiên | Nền tảng |
| ---- | ------------------------------------ | ----------- | --------- | ------- | -------- |
| UC07 | Xem nhà hàng, sảnh, gói menu, món    | Public      | —         | Must    | Wp       |
| UC08 | Quản lý hồ sơ nhà hàng & ca tiệc     | Manager     | —         | Must    | M        |
| UC09 | Quản lý sảnh                         | Manager     | Storage   | Must    | M        |
| UC10 | Quản lý món & gói menu (phiên bản)   | Manager     | Storage   | Must    | M        |
| UC11 | Quản lý dịch vụ & sản phẩm in        | Manager     | —         | Must    | M        |
| UC12 | Quản lý mẫu timeline & mẫu sơ đồ bàn | Manager     | —         | Should  | M        |
| UC13 | Quản lý mẫu thiệp                    | Manager     | —         | Should  | M        |

<a id="b147"></a>

**Nguồn B147**

Tư vấn, booking & hợp đồng

<a id="b148"></a>

**Nguồn B148 — bảng**

| ID   | Tên Use Case                            | Actor chính     | Actor phụ | Ưu tiên | Nền tảng     |
| ---- | --------------------------------------- | --------------- | --------- | ------- | ------------ |
| UC14 | Xử lý yêu cầu tư vấn & tạo consultation | Manager         | —         | Must    | M            |
| UC15 | Tạo đề xuất booking & giữ chỗ           | Manager         | —         | Must    | M            |
| UC16 | Mời Couple vào workspace                | Manager         | Email     | Must    | M            |
| UC17 | Xem danh sách & tổng quan tiệc          | Couple          | —         | Must    | W, A         |
| UC18 | Cộng tác & duyệt timeline               | Couple, Manager | —         | Must    | W, M         |
| UC19 | Cập nhật tên cô dâu / chú rể            | Couple, Manager | —         | Must    | W, M         |
| UC20 | Lập & duyệt hợp đồng thương mại (PDF)   | Couple, Manager | —         | Must    | W, M, A(xem) |
| UC21 | Đặt cọc qua VNPay                       | Couple          | VNPay     | Must    | W, A         |
| UC22 | Ghi nhận thanh toán thủ công            | Manager         | —         | Must    | M            |
| UC23 | Yêu cầu thay đổi timeline sau cọc       | Couple          | —         | Should  | W            |
| UC24 | Yêu cầu huỷ / huỷ tiệc                  | Couple, Manager | Email     | Must    | W, M         |
| UC25 | Lập & duyệt phụ lục hợp đồng            | Couple, Manager | —         | Should  | W, M         |
| UC26 | Hoàn tất tiệc                           | Manager         | —         | Must    | M            |

<a id="b150"></a>

**Nguồn B150**

Khách, sơ đồ bàn, thiệp & in

<a id="b151"></a>

**Nguồn B151 — bảng**

| ID   | Tên Use Case                             | Actor chính     | Actor phụ       | Ưu tiên | Nền tảng      |
| ---- | ---------------------------------------- | --------------- | --------------- | ------- | ------------- |
| UC27 | Quản lý nhóm khách & số khách dự kiến    | Couple, Manager | —               | Must    | W, M          |
| UC28 | Quản lý danh sách tên khách & import CSV | Couple, Manager | —               | Should  | W, M          |
| UC29 | Cấp link thiệp cá nhân & gửi email       | Couple, Manager | Email           | Could   | W             |
| UC30 | Thiết kế & xuất bản thiệp (ảnh, AI)      | Couple          | Storage, Gemini | Must    | W, A(sửa chữ) |
| UC31 | Xem thiệp công khai / cá nhân            | Guest           | —               | Must    | G             |
| UC32 | Lập sơ đồ bàn theo nhóm                  | Couple, Manager | —               | Should  | W, M          |
| UC33 | Duyệt ngoại lệ sức chứa sơ đồ            | Manager         | —               | Could   | M             |
| UC34 | Tạo & duyệt đơn in                       | Couple          | —               | Should  | W             |
| UC35 | Xử lý đơn in (báo giá → bàn giao)        | Manager         | —               | Should  | M             |

<a id="b153"></a>

**Nguồn B153**

Tài chính & quyết toán

<a id="b154"></a>

**Nguồn B154 — bảng**

| ID   | Tên Use Case                     | Actor chính     | Actor phụ | Ưu tiên | Nền tảng |
| ---- | -------------------------------- | --------------- | --------- | ------- | -------- |
| UC36 | Xem công nợ & lịch sử thanh toán | Couple, Manager | —         | Must    | W, M, A  |
| UC37 | Thanh toán số dư qua VNPay       | Couple          | VNPay     | Should  | W, A     |
| UC38 | Nhập chi phí phát sinh           | Manager         | —         | Must    | M        |
| UC39 | Chốt hoá đơn cuối & điều chỉnh   | Manager         | —         | Must    | M        |
| UC40 | Duyệt & ghi nhận hoàn tiền       | Manager         | —         | Should  | M        |

<a id="b156"></a>

**Nguồn B156**

Vận hành ngày cưới

<a id="b157"></a>

**Nguồn B157 — bảng**

| ID   | Tên Use Case                 | Actor chính     | Actor phụ | Ưu tiên | Nền tảng |
| ---- | ---------------------------- | --------------- | --------- | ------- | -------- |
| UC41 | Quản lý tài khoản Staff      | Manager         | Email     | Should  | M        |
| UC42 | Phân công Staff cho tiệc     | Manager         | —         | Should  | M        |
| UC43 | Cấu hình check-in theo tên   | Couple, Manager | —         | Should  | W, M     |
| UC44 | Check-in & hoàn tác theo tên | Staff, Manager  | —         | Should  | M        |
| UC45 | Xem tóm tắt tham dự          | Couple, Manager | —         | Should  | W, M     |

<a id="b159"></a>

**Nguồn B159**

Báo cáo & thông báo

<a id="b160"></a>

**Nguồn B160 — bảng**

| ID   | Tên Use Case                      | Actor chính     | Actor phụ | Ưu tiên | Nền tảng |
| ---- | --------------------------------- | --------------- | --------- | ------- | -------- |
| UC46 | Dashboard & báo cáo (xuất JSON)   | Manager         | —         | Must    | M        |
| UC47 | Hộp thư thông báo & tùy chọn nhận | Couple, Manager | —         | Should  | W, M, A  |
| UC48 | Theo dõi & gửi lại thông báo      | Manager         | Email     | Could   | M        |
| UC49 | Nhận push trên Android            | Couple          | FCM       | Could   | A        |

<a id="b162"></a>

**Nguồn B162**

6.2 Nội dung Use Case Diagram

<a id="b163"></a>

**Nguồn B163**

System boundary

<a id="b164"></a>

**Nguồn B164**

Khung “FPT606 – Hệ thống Quản lý & Tổ chức Tiệc cưới”, chia 7 package theo mục 6.1.

<a id="b165"></a>

**Nguồn B165**

Actor và vị trí

<a id="b166"></a>

**Nguồn B166**

Bên trái: Public visitor, Couple, Guest.

<a id="b167"></a>

**Nguồn B167**

Bên phải: Manager, Staff.

<a id="b168"></a>

**Nguồn B168**

Phía dưới: VNPay, Email Service, Supabase Storage, Gemini, FCM (<<system>>).

<a id="b169"></a>

**Nguồn B169**

Actor trừu tượng “Authenticated User” nối UC02–UC05, UC47; Couple, Manager, Staff kế thừa.

<a id="b170"></a>

**Nguồn B170**

Liên kết Actor – Use Case

<a id="b171"></a>

**Nguồn B171 — bảng**

| Actor              | Nối với Use Case                                                                                                       |
| ------------------ | ---------------------------------------------------------------------------------------------------------------------- |
| Public visitor     | UC01, UC07                                                                                                             |
| Authenticated User | UC02, UC03, UC04, UC05, UC47                                                                                           |
| Couple             | UC06, UC17, UC18, UC19, UC20, UC21, UC23, UC24, UC25, UC27, UC28, UC29, UC30, UC32, UC34, UC36, UC37, UC43, UC45, UC49 |
| Guest              | UC31                                                                                                                   |
| Manager            | UC08–UC16, UC18, UC19, UC20, UC22, UC24, UC25, UC26, UC27, UC28, UC29, UC32, UC33, UC35, UC36, UC38–UC46, UC48         |
| Staff              | UC44                                                                                                                   |
| VNPay              | UC21, UC37                                                                                                             |
| Email Service      | UC04, UC05, UC16, UC24, UC29, UC41, UC48                                                                               |
| Supabase Storage   | UC09, UC10, UC30                                                                                                       |
| Gemini             | UC30                                                                                                                   |
| FCM                | UC49                                                                                                                   |

<a id="b173"></a>

**Nguồn B173**

Quan hệ include / extend / generalization

<a id="b174"></a>

**Nguồn B174 — bảng**

| Quan hệ        | Từ                        | Đến                       | Ý nghĩa                                              |
| -------------- | ------------------------- | ------------------------- | ---------------------------------------------------- |
| <<include>>    | UC15 Tạo đề xuất booking  | UC14 Xử lý tư vấn         | Booking luôn gắn với một consultation                |
| <<include>>    | UC20 Lập & duyệt hợp đồng | UC19 Cập nhật tên         | Gửi duyệt cần đủ tên cô dâu/chú rể                   |
| <<include>>    | UC20 Lập & duyệt hợp đồng | UC18 Duyệt timeline       | Hợp đồng gắn đúng revision timeline                  |
| <<include>>    | UC21 Đặt cọc              | UC20 Lập & duyệt hợp đồng | Chỉ cọc khi hợp đồng đã duyệt kép                    |
| <<include>>    | UC39 Chốt hoá đơn         | UC38 Nhập phát sinh       | Hoá đơn snapshot phát sinh (có thể rỗng)             |
| <<include>>    | UC44 Check-in             | UC42 Phân công Staff      | Staff phải được phân công                            |
| <<extend>>     | UC22 Thu thủ công         | UC21 Đặt cọc              | Couple trả tại quầy                                  |
| <<extend>>     | UC28 Danh sách tên        | UC27 Nhóm khách           | Bổ sung tên khách (tùy chọn)                         |
| <<extend>>     | UC29 Link cá nhân         | UC30 Xuất bản thiệp       | Chia sẻ riêng cho khách có tên                       |
| <<extend>>     | UC33 Ngoại lệ sơ đồ       | UC32 Sơ đồ bàn            | Khi số khách ngoài khoảng mẫu                        |
| <<extend>>     | UC25 Phụ lục              | UC20 Hợp đồng             | Thay đổi thoả thuận sau cọc                          |
| <<extend>>     | UC34 Đơn in               | UC30 Thiệp                | In thiệp từ thiết kế đã có                           |
| Generalization | Couple, Manager, Staff    | Authenticated User        | Kế thừa đăng nhập, phiên, mật khẩu, hồ sơ, thông báo |

<a id="b176"></a>

**Nguồn B176**

Gợi ý: vẽ 1 sơ đồ tổng quan (actor + 7 package) và 1 sơ đồ chi tiết cho mỗi package.

<a id="b177"></a>

**Nguồn B177**

6.3 Đặc tả chi tiết Use Case

<a id="b178"></a>

**Nguồn B178**

Đặc tả các Use Case có logic phức tạp nhất. Use Case còn lại là CRUD/xem dữ liệu, đặc tả theo cùng mẫu khi cần.

<a id="b179"></a>

**Nguồn B179**

UC01 – Gửi yêu cầu tư vấn

<a id="b180"></a>

**Nguồn B180 — bảng**

| Actor chính    | Public visitor                                                                                                                                                                                                                                                                                                                                                                           |
| -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Actor phụ      | —                                                                                                                                                                                                                                                                                                                                                                                        |
| Mô tả          | Khách chưa có tài khoản gửi nhu cầu tổ chức tiệc để nhà hàng liên hệ.                                                                                                                                                                                                                                                                                                                    |
| Tiền điều kiện | Khách truy cập trang web công khai.                                                                                                                                                                                                                                                                                                                                                      |
| Hậu điều kiện  | Yêu cầu được lưu trạng thái NEW trong inbox của Manager.                                                                                                                                                                                                                                                                                                                                 |
| Luồng chính    | 1. Khách bấm “Yêu cầu tư vấn” từ trang chủ hoặc trang sảnh. 2. Khách nhập tên liên hệ, email, SĐT, lời nhắn; tùy chọn ngày dự kiến, số khách dự kiến, tên cô dâu/chú rể. 3. Hệ thống kiểm tra định dạng (email, SĐT, ngày trong giới hạn cho phép). 4. Khách bấm Gửi; hệ thống lưu yêu cầu (mã gửi duy nhất chống gửi trùng). 5. Hệ thống hiển thị thông báo đã nhận, không hứa giữ chỗ. |
| Luồng thay thế | 4a. Khách bấm gửi lại do mạng chập chờn: hệ thống nhận diện cùng mã gửi, không tạo yêu cầu trùng.                                                                                                                                                                                                                                                                                        |
| Ngoại lệ       | 3a. Dữ liệu sai: báo lỗi từng trường. 4b. Gửi quá nhiều (429): yêu cầu thử lại sau.                                                                                                                                                                                                                                                                                                      |
| Business Rules | BR-03, BR-09                                                                                                                                                                                                                                                                                                                                                                             |

<a id="b182"></a>

**Nguồn B182**

UC02 – Đăng nhập

<a id="b183"></a>

**Nguồn B183 — bảng**

| Actor chính    | Couple, Manager, Staff                                                                                                                                                                                                    |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Actor phụ      | —                                                                                                                                                                                                                         |
| Mô tả          | Đăng nhập bằng email và mật khẩu.                                                                                                                                                                                         |
| Tiền điều kiện | Tài khoản đã kích hoạt (Couple qua UC06, Staff qua UC04).                                                                                                                                                                 |
| Hậu điều kiện  | Phiên được tạo (access 10 phút, refresh xoay vòng); người dùng được điều hướng theo vai trò.                                                                                                                              |
| Luồng chính    | 1. Nhập email, mật khẩu. 2. Hệ thống xác thực. 3. Web: cấp access token và cookie refresh HttpOnly; App: cấp access + refresh token. 4. Điều hướng: Couple → danh sách tiệc; Manager → dashboard; Staff → khu tác nghiệp. |
| Luồng thay thế | 1a. Quên mật khẩu → UC04.                                                                                                                                                                                                 |
| Ngoại lệ       | 2a. Sai thông tin: báo lỗi chung. 2b. Quá 10 lần/15 phút: tạm chặn, không khoá vĩnh viễn. 2c. Tài khoản bị vô hiệu: báo liên hệ nhà hàng.                                                                                 |
| Business Rules | BR-06, BR-07                                                                                                                                                                                                              |

<a id="b185"></a>

**Nguồn B185**

UC15 – Tạo đề xuất booking & giữ chỗ

<a id="b186"></a>

**Nguồn B186 — bảng**

| Actor chính    | Manager                                                                                                                                                                                                                                                                                              |
| -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Actor phụ      | —                                                                                                                                                                                                                                                                                                    |
| Mô tả          | Manager lập booking cho một consultation và giữ slot tạm.                                                                                                                                                                                                                                            |
| Tiền điều kiện | Manager đăng nhập; consultation đã tồn tại (UC14).                                                                                                                                                                                                                                                   |
| Hậu điều kiện  | Booking DRAFT được tạo; slot được giữ 15 phút.                                                                                                                                                                                                                                                       |
| Luồng chính    | 1. Manager mở consultation, chọn sảnh, ngày, ca. 2. Hệ thống hiển thị tình trạng slot. 3. Manager chọn phiên bản gói menu, số bàn, số khách dự kiến. 4. Hệ thống kiểm tra sức chứa và tạo booking DRAFT. 5. Manager bấm Giữ chỗ; hệ thống tạo hold 15 phút. 6. Manager gửi lời mời workspace (UC16). |
| Luồng thay thế | 5a. Hold hết hạn: Manager giữ lại nếu slot còn trống.                                                                                                                                                                                                                                                |
| Ngoại lệ       | 2a. Slot đã có tiệc xác nhận hoặc hold khác: không cho giữ. 4a. Vượt sức chứa: báo lỗi. 4b. Dữ liệu consultation đã đổi (409): tải lại.                                                                                                                                                              |
| Business Rules | BR-01, BR-02, BR-10                                                                                                                                                                                                                                                                                  |

<a id="b188"></a>

**Nguồn B188**

UC18 – Cộng tác & duyệt timeline

<a id="b189"></a>

**Nguồn B189 — bảng**

| Actor chính    | Couple (RESTRICTED/FULL), Manager                                                                                                                                                                                                                         |
| -------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Actor phụ      | —                                                                                                                                                                                                                                                         |
| Mô tả          | Hai bên cùng chỉnh chương trình tiệc và duyệt.                                                                                                                                                                                                            |
| Tiền điều kiện | Booking DRAFT/AWAITING_DEPOSIT; người dùng có quyền sửa theo capabilities.                                                                                                                                                                                |
| Hậu điều kiện  | Revision được cả hai duyệt trở thành EFFECTIVE; booking chuyển AWAITING_DEPOSIT.                                                                                                                                                                          |
| Luồng chính    | 1. Người dùng mở tab Timeline, xem revision hiện tại và trạng thái duyệt. 2. Thêm/sửa/sắp xếp mục (giờ, tiêu đề, mô tả) và lưu → revision mới, duyệt cũ mất hiệu lực. 3. Mỗi bên bấm Duyệt đúng revision. 4. Khi đủ hai bên, hệ thống đánh dấu EFFECTIVE. |
| Luồng thay thế | 3a. Rút duyệt khi chưa đủ hai bên. 2a. Sau cọc: dùng UC23 (yêu cầu thay đổi có lý do).                                                                                                                                                                    |
| Ngoại lệ       | 2b. Bên kia vừa sửa (409): tải lại revision mới. 3b. Có giao dịch cọc chưa rõ kết quả: khoá chỉnh sửa.                                                                                                                                                    |
| Business Rules | BR-08, BR-13                                                                                                                                                                                                                                              |

<a id="b191"></a>

**Nguồn B191**

UC20 – Lập & duyệt hợp đồng thương mại

<a id="b192"></a>

**Nguồn B192 — bảng**

| Actor chính    | Couple, Manager                                                                                                                                                                                                                                                                                                                                                                                                                         |
| -------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Actor phụ      | —                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| Mô tả          | Chọn các dòng menu, in thiệp, dịch vụ; hệ thống tính giá; hai bên duyệt cùng revision.                                                                                                                                                                                                                                                                                                                                                  |
| Tiền điều kiện | Timeline đã duyệt kép; tên cô dâu/chú rể đầy đủ trước khi gửi duyệt.                                                                                                                                                                                                                                                                                                                                                                    |
| Hậu điều kiện  | Hợp đồng APPROVED, PDF được lưu; booking đủ điều kiện cọc.                                                                                                                                                                                                                                                                                                                                                                              |
| Luồng chính    | 1. Mở tab Hợp đồng; hệ thống hiển thị catalog đang bán (menu, dịch vụ, sản phẩm in). 2. Chọn một hoặc nhiều combo menu và số bàn, dịch vụ và số lượng, sản phẩm in và số bản. 3. Lưu bản nháp; hệ thống tính từng dòng và tổng, tiền cọc dự kiến. 4. Bấm Gửi duyệt; hệ thống kiểm tra tên, giá, sức chứa và khoá nội dung. 5. Manager và Couple lần lượt Duyệt; hệ thống ghi người duyệt, thời điểm, digest. 6. Người dùng xem/tải PDF. |
| Luồng thay thế | 5a. Một bên rút duyệt (có lý do): tạo bản nháp mới. 2a. Sửa sau khi gửi: tạo revision mới, duyệt lại từ đầu.                                                                                                                                                                                                                                                                                                                            |
| Ngoại lệ       | 4a. Thiếu tên: COUPLE_NAMES_INCOMPLETE → chuyển UC19. 4b. Giá catalog đã đổi: yêu cầu chọn lại. 4c. Vượt sức chứa/số bàn: báo lỗi. 5b. Revision đã cũ (409): tải lại.                                                                                                                                                                                                                                                                   |
| Business Rules | BR-09, BR-10, BR-11, BR-12                                                                                                                                                                                                                                                                                                                                                                                                              |

<a id="b194"></a>

**Nguồn B194**

UC21 – Đặt cọc qua VNPay

<a id="b195"></a>

**Nguồn B195 — bảng**

| Actor chính    | Couple                                                                                                                                                                                                                                                                                                                                                                      |
| -------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Actor phụ      | VNPay                                                                                                                                                                                                                                                                                                                                                                       |
| Mô tả          | Couple thanh toán 30% tổng hợp đồng qua VNPay.                                                                                                                                                                                                                                                                                                                              |
| Tiền điều kiện | Hợp đồng APPROVED; timeline EFFECTIVE đúng revision hợp đồng; slot hợp lệ; không có giao dịch cọc đang chờ/chưa rõ.                                                                                                                                                                                                                                                         |
| Hậu điều kiện  | Giao dịch SUCCEEDED; sổ cái ghi khoản phải thu hợp đồng và khoản đã trả; booking CONFIRMED; Couple FULL.                                                                                                                                                                                                                                                                    |
| Luồng chính    | 1. Couple bấm Đặt cọc; hệ thống hiển thị số tiền do server tính. 2. Hệ thống tạo giao dịch và trả URL VNPay; Web lưu mã giao dịch rồi chuyển trang. 3. Couple thanh toán; VNPay gửi IPN về backend. 4. Backend xác thực chữ ký, ghi sổ cái, xác nhận booking, nâng quyền FULL. 5. Couple được chuyển về trang kết quả; Web đọc trạng thái giao dịch từ backend và hiển thị. |
| Luồng thay thế | 1a. Trả tại quầy: Manager ghi nhận thủ công (UC22). 5a. Kết quả còn PENDING: trang tự cập nhật.                                                                                                                                                                                                                                                                             |
| Ngoại lệ       | 3a. Thất bại/huỷ: FAILED, cho tạo giao dịch mới. 4a. Chữ ký sai: bỏ qua. 5b. UNKNOWN: hiển thị “Chưa rõ kết quả”, khoá thay đổi, chờ đối soát. 1b. Điều kiện không đủ (409): chỉ rõ thiếu gì.                                                                                                                                                                               |
| Business Rules | BR-02, BR-05, BR-12, BR-13                                                                                                                                                                                                                                                                                                                                                  |

<a id="b197"></a>

**Nguồn B197**

UC25 – Lập & duyệt phụ lục hợp đồng

<a id="b198"></a>

**Nguồn B198 — bảng**

| Actor chính    | Couple FULL, Manager                                                                                                                                                              |
| -------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Actor phụ      | —                                                                                                                                                                                 |
| Mô tả          | Thay đổi menu/bàn/in/dịch vụ sau cọc.                                                                                                                                             |
| Tiền điều kiện | Booking CONFIRMED; chưa chốt hoá đơn cuối; không có thanh toán chưa rõ.                                                                                                           |
| Hậu điều kiện  | Phụ lục APPROVED; tổng thoả thuận hiệu lực thay đổi theo deltaVnd; sổ cái ghi chênh lệch một lần.                                                                                 |
| Luồng chính    | 1. Mở tab Phụ lục, bấm Tạo phụ lục. 2. Chọn lại toàn bộ dòng sau thay đổi, nhập lý do. 3. Hệ thống hiển thị trước – sau và chênh lệch. 4. Gửi duyệt; hai bên duyệt cùng revision. |
| Luồng thay thế | 2a. Giảm số lượng in đã đưa vào sản xuất: không cho phép.                                                                                                                         |
| Ngoại lệ       | 4a. Phụ lục khác vừa được duyệt (predecessor cũ): tải lại. 1a. Đã chốt hoá đơn: dùng điều chỉnh hoá đơn (UC39).                                                                   |
| Business Rules | BR-14, BR-16, BR-28                                                                                                                                                               |

<a id="b200"></a>

**Nguồn B200**

UC27 – Quản lý nhóm khách & số khách dự kiến

<a id="b201"></a>

**Nguồn B201 — bảng**

| Actor chính    | Couple FULL, Manager                                                                                                                                                                                             |
| -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Actor phụ      | —                                                                                                                                                                                                                |
| Mô tả          | Quản lý nhóm khách và số khách dự kiến mà không cần nhập tên.                                                                                                                                                    |
| Tiền điều kiện | Booking CONFIRMED.                                                                                                                                                                                               |
| Hậu điều kiện  | Nhóm và số dự kiến được cập nhật; sơ đồ bàn cần xác nhận lại nếu số dự kiến đổi.                                                                                                                                 |
| Luồng chính    | 1. Mở tab Khách; hệ thống khởi tạo 4 nhóm mặc định nếu chưa có. 2. Thêm/đổi tên/đổi màu/lưu trữ nhóm. 3. Sửa số khách dự kiến. 4. Hệ thống lưu revision và hiển thị ba số: dự kiến, tên đã lập, tên đã check-in. |
| Luồng thay thế | 2a. Muốn nhập tên: UC28.                                                                                                                                                                                         |
| Ngoại lệ       | 2b. Lưu trữ nhóm còn khách: GUEST_GROUP_IN_USE. 3a. Vượt sức chứa sảnh: báo lỗi.                                                                                                                                 |
| Business Rules | BR-21, BR-23, BR-31                                                                                                                                                                                              |

<a id="b203"></a>

**Nguồn B203**

UC28 – Danh sách tên khách & import CSV

<a id="b204"></a>

**Nguồn B204 — bảng**

| Actor chính    | Couple FULL, Manager                                                                                                                                                                                                                                  |
| -------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Actor phụ      | —                                                                                                                                                                                                                                                     |
| Mô tả          | Thêm khách có tên thủ công hoặc import hàng loạt.                                                                                                                                                                                                     |
| Tiền điều kiện | Booking CONFIRMED; đã có nhóm.                                                                                                                                                                                                                        |
| Hậu điều kiện  | Khách được tạo/cập nhật; số dự kiến không đổi.                                                                                                                                                                                                        |
| Luồng chính    | 1. Tải file CSV mẫu, điền tên, nhóm, SĐT (tùy chọn), ghi chú. 2. Chọn file; Web đọc file thành các dòng. 3. Hệ thống xem trước: số dòng tạo mới, cập nhật, không đổi. 4. Couple bấm Xác nhận trong 30 phút; hệ thống import toàn bộ hoặc không gì cả. |
| Luồng thay thế | 1a. Thêm/sửa/lưu trữ từng khách trên form.                                                                                                                                                                                                            |
| Ngoại lệ       | 3a. Dòng lỗi (thiếu tên, ô công thức, trùng khoá): báo theo dòng, không import. 4a. Danh sách vừa thay đổi: xem trước lại.                                                                                                                            |
| Business Rules | BR-22, BR-23, BR-24                                                                                                                                                                                                                                   |

<a id="b206"></a>

**Nguồn B206**

UC30 – Thiết kế & xuất bản thiệp

<a id="b207"></a>

**Nguồn B207 — bảng**

| Actor chính    | Couple FULL                                                                                                                                                                                                                                                                                                                 |
| -------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Actor phụ      | Supabase Storage, Gemini                                                                                                                                                                                                                                                                                                    |
| Mô tả          | Tạo thiệp điện tử từ mẫu, ảnh riêng và nội dung; xuất bản link + QR.                                                                                                                                                                                                                                                        |
| Tiền điều kiện | Booking CONFIRMED.                                                                                                                                                                                                                                                                                                          |
| Hậu điều kiện  | Thiệp được xuất bản với slug công khai và QR chung.                                                                                                                                                                                                                                                                         |
| Luồng chính    | 1. Chọn mẫu thiệp. 2. Upload ảnh cưới (private), tạo ảnh công khai để đưa lên thiệp; tùy chọn tạo ảnh AI. 3. Sửa tiêu đề, tên, lời chào, lời nhắn, chân trang; sắp xếp các phần (ảnh bìa, lời nhắn, sự kiện, timeline, sơ đồ, chân trang). 4. Xem trước; lưu revision. 5. Bấm Xuất bản; hệ thống trả link và QR để chia sẻ. |
| Luồng thay thế | 3a. Trên App: chỉ sửa chữ của thiết kế có sẵn. 5a. Gỡ xuất bản.                                                                                                                                                                                                                                                             |
| Ngoại lệ       | 2a. Quá hạn chỉnh ảnh: MEDIA_CUTOFF_REACHED. 2b. Sai định dạng/kích thước ảnh. 2c. Ảnh AI chưa rõ kết quả: trạng thái chờ, Manager đối soát. 4a. Revision cũ (409): tải lại.                                                                                                                                                |
| Business Rules | BR-26, BR-27                                                                                                                                                                                                                                                                                                                |

<a id="b209"></a>

**Nguồn B209**

UC32 – Lập sơ đồ bàn theo nhóm

<a id="b210"></a>

**Nguồn B210 — bảng**

| Actor chính    | Couple FULL, Manager                                                                                                                                                      |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Actor phụ      | —                                                                                                                                                                         |
| Mô tả          | Chọn mẫu sơ đồ phù hợp và gán nhãn nhóm khách cho bàn.                                                                                                                    |
| Tiền điều kiện | Booking CONFIRMED; số khách dự kiến > 0.                                                                                                                                  |
| Hậu điều kiện  | Sơ đồ CONFIRMED, được dùng cho file in.                                                                                                                                   |
| Luồng chính    | 1. Hệ thống liệt kê mẫu của sảnh, đánh dấu mẫu phù hợp số khách. 2. Chọn mẫu → bản nháp; hiển thị hình bàn. 3. Gán mỗi bàn cho một nhóm (hoặc để trống). 4. Bấm Xác nhận. |
| Luồng thay thế | 2a. Đổi mẫu: nhãn trên bàn trùng ID được giữ, bàn khác được ánh xạ hoặc bỏ.                                                                                               |
| Ngoại lệ       | 4a. Số khách ngoài khoảng mẫu: yêu cầu Manager duyệt ngoại lệ (UC33). 4b. Số khách dự kiến vừa đổi: REQUIRES_REVIEW, xác nhận lại.                                        |
| Business Rules | BR-23, BR-25                                                                                                                                                              |

<a id="b212"></a>

**Nguồn B212**

UC39 – Chốt hoá đơn cuối & điều chỉnh

<a id="b213"></a>

**Nguồn B213 — bảng**

| Actor chính    | Manager                                                                                                                                                                                                                        |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Actor phụ      | —                                                                                                                                                                                                                              |
| Mô tả          | Chốt toàn bộ khoản phải thu của tiệc và điều chỉnh khi cần.                                                                                                                                                                    |
| Tiền điều kiện | Đã qua giờ kết thúc tiệc; phát sinh (nếu có) đã nhập; không có thanh toán chưa rõ.                                                                                                                                             |
| Hậu điều kiện  | Hoá đơn bất biến; sổ cái ghi phát sinh một lần; Couple xem được.                                                                                                                                                               |
| Luồng chính    | 1. Manager mở Tài chính của tiệc, xem hợp đồng, phụ lục, phát sinh, đã thu. 2. Bấm Chốt hoá đơn; hệ thống snapshot và tính tổng, còn phải thu hoặc credit. 3. Couple thanh toán số dư (UC37) hoặc Manager thu thủ công (UC22). |
| Luồng thay thế | 2a. Sai sót sau khi chốt: tạo điều chỉnh (DEBIT/CREDIT) có lý do → hoá đơn revision mới. 3a. Có credit: Manager duyệt & ghi nhận hoàn tiền (UC40).                                                                             |
| Ngoại lệ       | 2b. Dữ liệu đã đổi (revision cũ): tải lại. 2c. Chưa qua giờ kết thúc: EVENT_NOT_ENDED.                                                                                                                                         |
| Business Rules | BR-15, BR-16, BR-17, BR-18                                                                                                                                                                                                     |

<a id="b215"></a>

**Nguồn B215**

UC44 – Check-in & hoàn tác theo tên

<a id="b216"></a>

**Nguồn B216 — bảng**

| Actor chính    | Staff, Manager                                                                                                                                                                                                       |
| -------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Actor phụ      | —                                                                                                                                                                                                                    |
| Mô tả          | Ghi nhận khách có tên đã đến tiệc.                                                                                                                                                                                   |
| Tiền điều kiện | Tiệc bật BY_GUEST_NAME; Staff được phân công; trong khung giờ check-in.                                                                                                                                              |
| Hậu điều kiện  | Bản ghi CHECK_IN append-only; số đã check-in tăng 1.                                                                                                                                                                 |
| Luồng chính    | 1. Staff mở tiệc được giao. 2. Nhập ≥ 2 ký tự tên hoặc SĐT; hệ thống trả danh sách (tên, nhóm, 4 số cuối SĐT, nhãn bàn). 3. Staff chọn đúng người (không tự chọn khi trùng tên). 4. Bấm Check-in; hệ thống ghi nhận. |
| Luồng thay thế | 4a. Nhầm người: Hoàn tác có lý do (chỉ bản ghi của mình). 4b. Manager ghi đè khung giờ với lý do.                                                                                                                    |
| Ngoại lệ       | 4c. Đã check-in: GUEST_ALREADY_CHECKED_IN. 1a. Check-in đang tắt / hết giờ / không được phân công: báo lý do. Mất mạng: thử lại cùng khoá thao tác, không tạo bản ghi trùng.                                         |
| Business Rules | BR-29, BR-30, BR-31                                                                                                                                                                                                  |

<a id="b218"></a>

**Nguồn B218**

UC46 – Dashboard & báo cáo

<a id="b219"></a>

**Nguồn B219 — bảng**

| Actor chính    | Manager                                                                                                                                                                                                                            |
| -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Actor phụ      | —                                                                                                                                                                                                                                  |
| Mô tả          | Xem doanh thu, công nợ, booking, sử dụng sảnh, đơn in, số khách.                                                                                                                                                                   |
| Tiền điều kiện | Manager đăng nhập.                                                                                                                                                                                                                 |
| Hậu điều kiện  | Số liệu hiển thị kèm độ mới dữ liệu.                                                                                                                                                                                               |
| Luồng chính    | 1. Chọn khoảng ngày, lọc sảnh/trạng thái/gói menu. 2. Hệ thống trả tổng tiền đã thu, đã hoàn, phải thu, credit, số tiệc theo trạng thái, tỷ lệ sử dụng sảnh, món phổ biến, đơn in, ba con số khách. 3. Manager xuất JSON tổng hợp. |
| Luồng thay thế | 2a. Dữ liệu cũ: Manager bấm dựng lại số liệu.                                                                                                                                                                                      |
| Ngoại lệ       | 2b. Nguồn chưa sẵn sàng: hiển thị “chưa sẵn sàng”, không hiện 0. 2c. Không có dữ liệu: trạng thái rỗng.                                                                                                                            |
| Business Rules | BR-17, BR-31                                                                                                                                                                                                                       |

<a id="b221"></a>

**Nguồn B221**

7. Yêu cầu phi chức năng

<a id="b222"></a>

**Nguồn B222 — bảng**

| Mã     | Nhóm             | Yêu cầu                                                                                                                                                                          |
| ------ | ---------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| NFR-01 | Bảo mật          | Mật khẩu băm scrypt; access token ngẫu nhiên 32 byte, chỉ lưu hash; refresh Web trong cookie __Host- HttpOnly Secure SameSite=Lax; phân quyền ở API (UI chỉ phản ánh); HTTPS.    |
| NFR-02 | Bảo mật          | Secret chỉ ở backend (.env/secret store); biến NEXT_PUBLIC_/EXPO_PUBLIC_ chỉ chứa URL. Link khách và token mời ngẫu nhiên, không đoán được; link cá nhân đặt mã trong #fragment. |
| NFR-03 | Bảo mật          | Xác thực chữ ký mọi IPN VNPay; redirect không được dùng làm bằng chứng thanh toán.                                                                                               |
| NFR-04 | Toàn vẹn dữ liệu | Lệnh ghi dùng Idempotency-Key và expectedRevision; giữ chỗ, duyệt, cọc, chốt hoá đơn được tuần tự hoá trong transaction PostgreSQL – không trùng slot, không ghi nợ hai lần.     |
| NFR-05 | Toàn vẹn dữ liệu | Hợp đồng, phụ lục, hoá đơn, nhật ký check-in, sổ cái là append-only/bất biến; sửa bằng revision mới.                                                                             |
| NFR-06 | Hiệu năng        | API phản hồi < 2 giây với 95% request; tìm khách check-in < 1 giây.                                                                                                              |
| NFR-07 | Khả dụng         | Giao diện tiếng Việt, font sans có dấu, không viết hoa bằng CSS; responsive từ 360px; desktop 1440px; điều hướng bàn phím; trạng thái không chỉ dựa vào màu.                     |
| NFR-08 | Tác vụ nền       | Worker 60 giây: nhắc D-3, nhắc hạn ảnh, gửi thông báo có retry; tự hoàn tất tiệc sau kết thúc + 12 giờ; dọn dữ liệu hết hạn.                                                     |
| NFR-09 | Riêng tư         | Dữ liệu private trả Cache-Control: no-store; tài nguyên của tiệc khác trả 404; log không chứa token, SĐT, tên tìm kiếm.                                                          |
| NFR-10 | Bảo trì          | TypeScript, ESLint, Prettier, Vitest; OpenAPI là hợp đồng duy nhất, client sinh type từ file đã khoá digest; CI kiểm tra format, lint, typecheck, test, build.                   |

<a id="b224"></a>

**Nguồn B224**

8. Mô hình dữ liệu

<a id="b225"></a>

**Nguồn B225**

Thực thể chính theo backend (PostgreSQL/Prisma, 60 migration). Tên trường camelCase như trong API. Đây là mô hình logic để vẽ ERD, đã lược bớt bảng kỹ thuật (outbox, command receipt, audit).

<a id="b226"></a>

**Nguồn B226 — bảng**

| Thực thể                                    | Thuộc tính chính                                                                                                                                                                                                                                          |
| ------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Account                                     | accountId, email, displayName, roles[MANAGER\|STAFF\|COUPLE], passwordHash (scrypt), revision, piiAnonymizedAt                                                                                                                                            |
| Session                                     | sessionId, accountId, clientKind (WEB\|ANDROID), status, accessExpiresAt, refreshExpiresAt, absoluteExpiresAt                                                                                                                                             |
| ConsultationRequest                         | id, submissionId, displayName, email, phone, message, preferredDate, expectedGuests, brideName, groomName, status (NEW\|CONVERTED\|CLOSED)                                                                                                                |
| Consultation                                | consultationId, managerId, intendedEmail, displayName, brideName, groomName, revision                                                                                                                                                                     |
| WorkspaceInvitation                         | id, consultationId, email, tokenHash, expiresAt, acceptedAt                                                                                                                                                                                               |
| RestaurantProfile / Shift                   | restaurantId, name, address, revision · shiftCode (LUNCH\|DINNER), startTime, endTime, lifecycle                                                                                                                                                          |
| Hall                                        | hallId, name, description, maxGuests, lifecycle (ACTIVE\|RETIRED), revision, media[]                                                                                                                                                                      |
| Dish / DishVersion                          | dishId · versionId, name, description, state (DRAFT\|PUBLISHED\|SUPERSEDED)                                                                                                                                                                               |
| MenuPackage / Version                       | packageId · versionId, name, priceVndPerTable, dishVersionIds[], state                                                                                                                                                                                    |
| Service                                     | serviceId, sourceRevisionId, name, description, unit, unitPriceVnd, active, revision                                                                                                                                                                      |
| PrintOffering                               | offeringId, sourceRevisionId, templateVersionId, printType, material, unitPriceVnd, active                                                                                                                                                                |
| TimelineTemplate / LayoutTemplate (+ Table) | templateId, versions · layout: minGuests, maxGuests, tables[layoutTableId, shape ROUND\|RECTANGLE, x, y, width, height, rotationDegrees, seatCapacity]                                                                                                    |
| Booking                                     | bookingId, consultationId, coupleAccountId, hallId, eventDate, shiftCode, menuPackageVersionId, tableCount, planningHeadcount, phase, accessLevel, revision, modelVersion (LEGACY_PROPOSAL_V1\|FULL_CONTRACT_V1)                                          |
| SlotHold                                    | holdId, hallId, eventDate, shiftCode, bookingId, expiresAt                                                                                                                                                                                                |
| TimelineRevision                            | revisionId, bookingId, revisionNumber, predecessorRevisionId, items[order, startTime, title, description], managerApprovedAt, coupleApprovedAt, state                                                                                                     |
| ContractRevision                            | revisionId, bookingId, revisionNumber, predecessorRevisionId, timelineRevisionId, state, document{brideName, groomName, lines[], contractTotalVnd, depositAmountVnd, incidentalClause}, documentDigest, pdf, approvals[party, actorAccountId, occurredAt] |
| ContractLine                                | category (MENU\|PRINT\|SERVICE), sourceId, sourceRevisionId, name, unit, quantity, unitPriceVnd, lineTotalVnd                                                                                                                                             |
| AppendixRevision                            | revisionId, predecessorRevisionId, reason, beforeLines[], afterLines[], deltaVnd, state, approvals[]                                                                                                                                                      |
| PaymentAttempt                              | paymentAttemptId, bookingId, purpose (DEPOSIT\|BALANCE), amountVnd, status, expiresAt, contractRevisionId, provider ref                                                                                                                                   |
| LedgerEntry                                 | ledgerEntryId, bookingId, revision, kind (CHARGE\|PAYMENT\|REFUND\|CREDIT_ADJUSTMENT), sourceType, sourceRevisionId, amountVnd, occurredAt                                                                                                                |
| IncidentalExpenseDraft / Line               | bookingId, revision, finalized · lineId, name, quantity, unit, unitPriceVnd, totalVnd, note                                                                                                                                                               |
| FinalInvoiceRevision                        | invoiceRevisionId, invoiceNumber, revisionNumber, predecessorRevisionId, document (contract, appendices, incidentalLines, adjustments, totalVnd), sourceBillingRevision, issuedAt                                                                         |
| RefundApproval / Refund                     | bookingId, amountVnd, reason, approvedBy · receipt evidence, recordedBy                                                                                                                                                                                   |
| GuestGroup                                  | guestGroupId, bookingId, name, color, status, revision                                                                                                                                                                                                    |
| Guest                                       | guestId, bookingId, guestGroupId, name, phone, operationalNote, status, revision                                                                                                                                                                          |
| GuestPlanRevision                           | id, bookingId, planningHeadcount, sourceSequence                                                                                                                                                                                                          |
| PersonalizedCredential                      | credentialId, guestId, tokenHash, revision, expiresAt, revokedAt                                                                                                                                                                                          |
| InvitationTemplate / Design / Revision      | templateId, versionId · designId, revisionId, title, textFields, sections[kind, derivedAssetId, textKey], includesSeating                                                                                                                                 |
| Publication                                 | publicInvitationId, publicSlug, publishedRevisionId, publicationRevision                                                                                                                                                                                  |
| MediaAsset / DerivedAsset                   | mediaAssetId, bookingId, altText, contentType, revision, detachedAt · PNG công khai                                                                                                                                                                       |
| PrintOrder                                  | orderId, bookingId, lines[designId, quantity, commercialSource], status, revision, commercialRevisions[], printableRevisionId                                                                                                                             |
| SeatingPlan / Revision                      | seatingPlanId, revisionId, layoutTemplateVersionId, labels[layoutTableId, guestGroupId], status, managerException, snapshotDigest                                                                                                                         |
| StaffAssignment                             | assignmentId, bookingId, staffAccountId, status (ACTIVE\|REVOKED), revision                                                                                                                                                                               |
| CheckInSettings / CheckInRecord             | bookingId, checkInMode, locked, revision · recordId, guestId, action (CHECK_IN\|UNDO), ledgerRevision, actorId, reason, groupSnapshot, recordedAt                                                                                                         |
| NotificationIntent / InboxItem              | id, purpose, channel (EMAIL\|IN_APP\|ANDROID), state · title, message, resource, readAt, revision                                                                                                                                                         |
| AndroidInstallation                         | id, accountId, installationId, tokenHash, enabled, revision                                                                                                                                                                                               |

<a id="b228"></a>

**Nguồn B228**

Quan hệ chính

<a id="b229"></a>

**Nguồn B229**

Consultation 1 – n Booking; Account (COUPLE) n – n Consultation qua quyền workspace; Hall 1 – n Booking.

<a id="b230"></a>

**Nguồn B230**

Booking 1 – n TimelineRevision, ContractRevision, AppendixRevision, PaymentAttempt, LedgerEntry, FinalInvoiceRevision.

<a id="b231"></a>

**Nguồn B231**

ContractRevision 1 – n ContractLine; mỗi line tham chiếu một phiên bản MenuPackage/Service/PrintOffering.

<a id="b232"></a>

**Nguồn B232**

Booking 1 – n GuestGroup 1 – n Guest; Booking 1 – n GuestPlanRevision; Guest 1 – n PersonalizedCredential.

<a id="b233"></a>

**Nguồn B233**

Booking 1 – 1 SeatingPlan (nhiều revision); SeatingPlan tham chiếu LayoutTemplateVersion và GuestGroup.

<a id="b234"></a>

**Nguồn B234**

Booking 1 – n InvitationDesign, MediaAsset, PrintOrder; InvitationDesign 1 – 0..1 Publication.

<a id="b235"></a>

**Nguồn B235**

Booking n – n Account (STAFF) qua StaffAssignment; Guest 1 – n CheckInRecord.

<a id="b236"></a>

**Nguồn B236**

9. Kiến trúc & công nghệ

<a id="b237"></a>

**Nguồn B237**

Kiến trúc client–server: ba client gọi chung một REST API (/api/v1). Backend là nguồn sự thật duy nhất cho nghiệp vụ, tiền và quyền; OpenAPI 3.1 là hợp đồng giữa backend và frontend.

<a id="b238"></a>

**Nguồn B238 — bảng**

| Thành phần          | Công nghệ thực tế                                                                                                      | Lý do                                                                              |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| Backend             | Node.js 24, Express 5.2, TypeScript, Zod 4, Pino, Helmet                                                               | Cùng ngôn ngữ với frontend; Zod sinh OpenAPI và kiểm tra payload strict            |
| Database            | PostgreSQL + Prisma 7.10 (Railway / Supabase)                                                                          | Transaction và advisory lock cho slot, duyệt, cọc, hoá đơn; migration có kiểm soát |
| API contract        | OpenAPI 3.1 + openapi-typescript + openapi-fetch                                                                       | Client có type tự động, khoá theo commit + SHA-256                                 |
| Web public & Couple | Next.js 16, React 19 (wedding-web)                                                                                     | App Router, SSR cho trang công khai, tích hợp Vercel                               |
| Admin Web           | Next.js 16, React 19 (wedding-manage-web)                                                                              | Cùng stack, dùng chung cách gọi API                                                |
| Mobile App          | Expo 57, React Native 0.86 (wedding-app)                                                                               | Build Android nhanh; EAS cho APK                                                   |
| Thanh toán          | VNPay 2.1.0 sandbox (IPN)                                                                                              | Phổ biến tại Việt Nam, có môi trường test                                          |
| Email               | Brevo REST v3                                                                                                          | Gửi lời mời, OTP, thông báo có theo dõi trạng thái                                 |
| Lưu trữ file        | Supabase Storage (private bucket)                                                                                      | URL ký có hạn cho ảnh private                                                      |
| Ảnh AI              | Google Gemini (@google/genai 2.24.0)                                                                                   | Tạo ảnh minh hoạ thiệp                                                             |
| Push                | Firebase Cloud Messaging                                                                                               | Push Android                                                                       |
| PDF                 | PDFKit 0.20 + font tiếng Việt                                                                                          | PDF hợp đồng và file in A5                                                         |
| Kiểm thử & CI       | Vitest, ESLint, Prettier, GitHub Actions                                                                               | Cổng chất lượng trước khi merge                                                    |
| Deploy              | Railway wedding-be-production-e1dc (Backend + PostgreSQL), Vercel (2 web, proxy /api/v1 sang backend), EAS Build (APK) | Có gói miễn phí, đủ cho demo; proxy giữ cookie phiên cùng site                     |

<a id="b240"></a>

**Nguồn B240**

10. Kế hoạch & phân công

<a id="b241"></a>

**Nguồn B241**

10.1 Tiến độ

<a id="b242"></a>

**Nguồn B242 — bảng**

| Tuần | Mục tiêu                            | Deliverable                                                                        | Trạng thái                        |
| ---- | ----------------------------------- | ---------------------------------------------------------------------------------- | --------------------------------- |
| 1–2  | Phân tích nghiệp vụ & scope         | SRS v1.x, Use Case, Context, Main Flow                                             | Xong                              |
| 3–5  | Thiết kế & Backend                  | ERD, OpenAPI, 60 migration, 218 API, tài liệu hand-off; UI v0                      | Xong (BE NO_GO chờ gate provider) |
| 5    | Đồng bộ tài liệu                    | SRS v2.0, Tài liệu bàn giao BE → FE                                                | Xong (13/10)                      |
| 6    | FE Sprint 1 – Xương sống            | Nâng contract; tư vấn → booking → timeline → tên → hợp đồng → cọc (Web + Admin)    | Kế hoạch                          |
| 7    | FE Sprint 2 – Chuẩn bị tiệc         | Khách, sơ đồ bàn, thiệp, đơn in, phụ lục; App: tổng quan, thanh toán, xem hợp đồng | Kế hoạch                          |
| 8    | FE Sprint 3 – Vận hành & quyết toán | Staff, check-in, phát sinh, hoá đơn, số dư, hoàn tiền, thông báo                   | Kế hoạch                          |
| 9    | Báo cáo & kiểm thử                  | Dashboard, push, test end-to-end 2 kịch bản (không tên / một phần tên)             | Kế hoạch                          |
| 10   | Hoàn thiện & demo                   | Deploy, fix bug, báo cáo cuối kỳ, slide, demo                                      | Kế hoạch                          |

<a id="b244"></a>

**Nguồn B244**

10.2 Phân công theo module

<a id="b245"></a>

**Nguồn B245 — bảng**

| Thành viên       | Trách nhiệm                                                                                                                                                                                                                                         |
| ---------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Nguyễn Tuấn Toàn | Leader; wedding-web: trang công khai, tư vấn, đăng nhập/lời mời/OTP, workspace Couple (timeline, tên, hợp đồng, cọc, phụ lục), khách, sơ đồ bàn, studio thiệp, đơn in, tài chính Couple, thông báo, trang thiệp Guest; review code, quản lý tiến độ |
| Long Trì         | wedding-manage-web: catalog, tư vấn, booking/lịch, hợp đồng/phụ lục phía Manager, đơn in, tài chính (thu, hoàn, phát sinh, hoá đơn), Staff & phân công, khu check-in Staff, thông báo, báo cáo                                                      |
| Lã Gia Huy       | wedding-app: đăng nhập Android, danh sách & tổng quan tiệc, thanh toán, xem hợp đồng/phụ lục/hoá đơn/khách, sửa nhanh chữ trên thiệp, inbox + push FCM                                                                                              |
| Lê Bá Bách       | Backend (đã hoàn tất 71/71 task, 218 API); recovery owner môi trường demo; hỗ trợ tích hợp FE, cung cấp tài khoản test                                                                                                                              |
| Nghĩa            | Backend (đã hoàn tất 71/71 task, 218 API); hỗ trợ tích hợp FE, trả lời các vấn đề mục 11                                                                                                                                                            |

<a id="b247"></a>

**Nguồn B247**

10.3 Rủi ro & phương án

<a id="b248"></a>

**Nguồn B248 — bảng**

| Rủi ro                                                              | Phương án xử lý                                                                                                       |
| ------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| Ba repo FE đang khoá OpenAPI cũ, lệch nghiệp vụ mới                 | Tuần 6 ngày đầu: nâng api-contract.lock.json, sinh type, sửa lỗi typecheck trước khi làm màn mới                      |
| Cookie refresh khác site (localhost/Vercel ↔ Railway) làm mất phiên | Proxy /api/v1 qua Next.js rewrites cho cả 2 web; BE xác nhận cấu hình proxy để giới hạn đăng nhập không tính chung IP |
| Email worker tắt → không nhận OTP/lời mời khi test                  | Xin BE tài khoản test các vai trò và booking mẫu; dùng 2 kịch bản seed                                                |
| VNPay sandbox/IPN khó test trên local                               | Dùng Manager ghi nhận thủ công để luồng không bị chặn; test VNPay trên môi trường deploy                              |
| Khối lượng FE lớn (49 UC)                                           | Ưu tiên Must → Should; dùng chung component; App chỉ làm màn xem cho phần phức tạp                                    |
| Thiếu API liệt kê sự kiện Staff / sơ đồ bàn / ảnh                   | Workaround phía client (mục 11); đề nghị BE bổ sung                                                                   |

<a id="b250"></a>

**Nguồn B250**

11. Vấn đề cần xác nhận

<a id="b251"></a>

**Nguồn B251**

Domain deploy cho 2 web; BE xác nhận AUTH_TRUST_PROXY_HOPS khi web đi qua proxy Vercel.

<a id="b252"></a>

**Nguồn B252**

URL trang kết quả VNPay (VNPAY_RETURN_URL) và URL trang thiệp cá nhân (NOTIFICATIONS_GUEST_LINK_URL) trên wedding-web.

<a id="b253"></a>

**Nguồn B253**

Có bổ sung API: liệt kê sự kiện được giao cho Staff, liệt kê sơ đồ bàn theo booking, liệt kê ảnh của booking không?

<a id="b254"></a>

**Nguồn B254**

Quy tắc ghi nhận người đi kèm (đã tạm hoãn) có làm trong học kỳ này không?

<a id="b255"></a>

**Nguồn B255**

Staff check-in trên Admin Web hay thêm trên App?

<a id="b256"></a>

**Nguồn B256**

Cấp tài khoản test (Manager, Staff, Couple RESTRICTED/FULL) trên production-e1dc khi email worker đang tắt.

### Nội dung đầu trang cuối trang và ghi chú

- `word/header1.xml`: FPT606 – SRS – WDP301 · v2.0
- `word/footer1.xml`: Trang

Header SRS ghi v2.0 trong khi bìa/lịch sử ghi v2.1; giữ nguyên để biết sai khác phiên bản của nguồn.
