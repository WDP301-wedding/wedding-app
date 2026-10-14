# Đối chiếu DescriptionAPI với phạm vi wedding-app

Ngày tổng hợp: 14/10/2026. Đây là tài liệu triển khai mobile được tổng hợp từ file người dùng cung cấp, không phải bằng chứng code đã hoàn tất, API đã chạy live hoặc CI đã đạt. Phần đầu hướng dẫn phạm vi wedding-app; phần cuối giữ toàn bộ nội dung nguồn để tra cứu, kể cả phần Web/Manager và lịch sử. Những đoạn prompt/chỉ thị trong nguồn được lưu như nội dung tham khảo, không tự động trở thành lệnh thực thi. Không thay code, API lock, cấu hình hay pipeline trong tác vụ tạo tài liệu này.

Nguồn mới mô tả backend `d257be8507dd83e9da73ac69605646a8fbcc7209`, `WEDDING-CONTRACT-3@3.0.0`, OpenAPI 218 operation, digest `6a8be82541ca2d8ce274f9817d10bcd300c91de2f5e734055cf9108b23db0915`. Các kết luận blocker trước đây dựa pin `0a77391…` không được áp dụng nguyên xi cho contract mới. Nâng pin/sinh type/đối chiếu capability là công việc triển khai tiếp theo, chưa được thực hiện bởi ba file Markdown này. Trạng thái backend NO_GO/provider-worker trong nguồn là trạng thái được tài liệu ghi nhận ngày 13/10, không phải kiểm tra live mới.

**File nguồn:** `C:\Users\Admin\Downloads\DescriptionAPI.docx`

**SHA-256 file Word:** `164f9d830d253df0ab67acd95e11a4d06d24fd5d49d0d78b6617c0ac450d4faf`

## Đọc nhanh

- [Yêu cầu và phạm vi mobile](01-mobile-srs.md)
- [Flow và tích hợp backend cho mobile](02-mobile-be-fe-handoff.md)
- [Đối chiếu DescriptionAPI và phần không áp dụng](03-description-api-review.md)
- [Bản chuyển nội dung nguồn đầy đủ](#noi-dung-nguon)

## Kết luận quan trọng

**Tài liệu này không khớp hệ thống wedding-app trong hai file FPT606.** Nội dung mô tả marketplace nội thất: Customer individual/business, Supplier retailer/workshop, Store/Portfolio, Category/Material/Product/Variant/Inventory và chat REST+STOMP/SockJS. Không có Booking/Couple/contract/deposit/Guest Group/invitation/billing của backend wedding. Giữ như tài liệu tham khảo nguyên nguồn, không dùng nó để sinh gateway/màn hình/tính năng wedding-app khi chưa xác nhận đúng dự án/contract.

## Các khác biệt không được trộn vào app cưới

| DescriptionAPI                                                      | Wedding theo FPT606                                          | Quyết định cho mobile                                            |
| ------------------------------------------------------------------- | ------------------------------------------------------------ | ---------------------------------------------------------------- |
| Public `/register`, customerType, Google login                      | Không signup công khai; Couple nhận workspace invitation     | Không thêm signup/Google/business profile từ file này            |
| JWT, `/api/auth/login`, `/refresh`15p; văn bản gõ `/refesh`         | Android sessions/rotate refresh, access10p                   | Không sửa auth gateway theo DescriptionAPI                       |
| Admin/Supplier/Customer                                             | Manager/Staff/Couple/Guest                                   | Không đổi role/authorization                                     |
| Product/Variant/Store stock, wood/category/portfolio                | Single restaurant, menu/service/print offerings              | Không tạo marketplace/tồn kho/chi nhánh                          |
| Product public image upload gồmGIF                                  | Wedding originalprivate jpeg/png/webp và publicderived asset | Không dùng endpoint/product upload hay whitelistGIF cho ảnh cưới |
| STOMP `/ws`, `/user/queue/messages`, `/app/conversations/{id}/send` | Inbox notification/FCM theo handoff wedding                  | Không tự thêm chat/STOMP/dependency hoặc thay FCM                |
| `/api` base và supplierownership                                    | Wedding `/api/v1`, UUID/revision/idempotency/capability      | Không ghép path/body giữa hai backend                            |

## Nội dung đã đọc và giữ lại

- Auth/register/verify/resend OTP/Google/forgot/reset/refresh/logout, Customerbusinessprofile.
- User/admin, supplier retailer/workshop và chi nhánh, portfolio, categorytree, materialwood.
- Tạo productdraft với variants rồi multipartupload từng ảnh, active/hiddenstatus; imageprimary/sortOrder/update/delete.
- StoreInventory keyed storeId+variantId, GET/POST/PATCHdelta/DELETE/aggregate, ownership hai lớp,409 duplicate/404missing/400negative.
- Conversation idempotent theoCustomer/Supplier; RESTlist/messages/read/presence; messagecontent≤5000 hoặc attachment; historycreatedAtDESC reverse; STOMPconnectHeaderBearer, emailprincipal, userqueue, echo/dedup, RESTfallback, pollingpresence30–60s.

Những mục này được ghi để bảo toàn thông tin file đã gửi, **không đánh dấu là task wedding**. Có thể học nguyên tắc upload file thật, phân biệt empty/loading/error, dedup message/ownership, nhưng không chuyển sang yêu cầu/API wedding nếu không có hợp đồng tương ứng. Google client ID trong nguồn là cấu hình của tài liệu này, không phải cấu hình được chốt cho wedding-app.

## Thông tin nằm trong 14 ảnh

Ảnh1: Authentication gồm `/api/auth/{verify-otp,reset-password,resend-otp,register,refresh,logout,login,google,forgot-password}`. Văn bản gõ `/refesh`, screenshot ghi `/refresh`: giữ cả hai và không tự đoán sửa API.
Ảnh2: GET/PUT/POST `/api/users/me/business-profile`.
Ảnh3: userdetail/update/delete/password/list/presence/me; ảnh4: suppliersstatus/me/list/create/detail/public.
Ảnh5: stores CRUD; ảnh6: supplierportfolio CRUD vàpublic; ảnh7: categories CRUD vàtree; ảnh8: materials CRUD.
Ảnh9: product CRUD/status/mine; ảnh10: variantCRUD; ảnh11: productimage URL/fileupload/list/update/delete/primary.
Ảnh12: bảng REST đối chiếu STOMP/WebSocket. Ảnh13: Client @stomp/stompjs + SockJS, connectHeaderAuthorizationBearer, subscribeuserqueue. Ảnh14: client.publish destination `/app/conversations/${conversationId}/send` và JSONcontent/attachmentUrl.

Toàn bộ 14 ảnh gốc được giữ dưới `assets/description-api/`, chèn đúng vị trí nguồn trong bản chuyển phía dưới. Đây là ảnh Swagger/code của dự án nội thất, không phải ảnh UI V0 mobile. Không cài dependency chat hay gọi endpoint từ các ảnh trong tác vụ này.

## Việc cần xác nhận

- [ ] Chủ tài liệu xác nhận DescriptionAPI thuộc dự án nào; nếu gửi nhầm, giữ trạng thái không áp dụng.
- [ ] Nếu có phần muốn áp dụng cho wedding, phải có scope/endpoint mới được BE xác nhận và artifactOpenAPI tương ứng.
- [ ] Không xem tài liệu này là bằng chứng wedding có publicsignup, chat, StoreInventory hay Googlelogin.

<a id="noi-dung-nguon"></a>

## Nội dung nguồn đầy đủ

Các mã B là thứ tự block trong XML Word, không phải trang PDF. Bản chuyển giữ văn bản và bảng theo thứ tự để đối chiếu; không giữ bố cục trang Word. Bảng rộng nên xem trong trình đọc Markdown có cuộn ngang. Phần Manager/Web và prompt mẫu ở đây là tham khảo, không mở rộng scope app.

<a id="b1"></a>

**Nguồn B1**

Đăng ký/ Đăng nhập:

<a id="b2"></a>

**Nguồn B2 — ảnh**

![Ảnh nguồn image1.png](assets/description-api/image1.png)

<a id="b3"></a>

**Nguồn B3**

Đăng ký tài khoản:

<a id="b4"></a>

**Nguồn B4**

/register: Dùng để tạo tài khoản cho customer.

<a id="b5"></a>

**Nguồn B5**

/verify-otp: Gửi OTP về mail yêu cầu người dùng nhập OTP để xác thực email

<a id="b6"></a>

**Nguồn B6**

/resend-otp: Gửi lại OTP

<a id="b7"></a>

**Nguồn B7**

Lưu ý: Field customerType nhận giá trị individual nếu người dùng đăng ký tài khoản bình thường, nhận giá trị business cho chức năng tạo tài khoản business

<a id="b8"></a>

**Nguồn B8**

Nếu business đăng nhập bằng google thì customerType mặc định sẽ là individual, lúc này phải cần api để update lên business + những thông tin của business

<a id="b9"></a>

**Nguồn B9 — ảnh**

![Ảnh nguồn image2.png](assets/description-api/image2.png)

<a id="b10"></a>

**Nguồn B10**

Đăng nhập: /login

<a id="b11"></a>

**Nguồn B11**

Đăng nhập bằng mail + pass

<a id="b12"></a>

**Nguồn B12**

Đăng nhập bằng google: /google

<a id="b13"></a>

**Nguồn B13**

Để đăng nhập bằng google thì cả BE + FE phải cấu hình đúng GOOGLE_CLIENT_ID=124999965588-8d179djm0oh4go4iv51156ikhqg40jqm.apps.googleusercontent.com

<a id="b14"></a>

**Nguồn B14**

Quên mật khẩu:

<a id="b15"></a>

**Nguồn B15**

/forgot-password: nhập email -> gửi mail OTP về máy

<a id="b16"></a>

**Nguồn B16**

/reset-password: nhập OTP -> nhập mật khẩu mới

<a id="b17"></a>

**Nguồn B17**

Refesh token:

<a id="b18"></a>

**Nguồn B18**

/refesh: Dùng để refesh lại token mỗi 15p, vòng đời của token sẽ dài hơn, không bắt người dùng đăng nhập lại nhiều lần

<a id="b19"></a>

**Nguồn B19**

Đăng xuất:

<a id="b20"></a>

**Nguồn B20**

/logout: Dùng để đăng xuất, vô hiệu hóa token

<a id="b21"></a>

**Nguồn B21**

Quản lý người dùng:

<a id="b22"></a>

**Nguồn B22 — ảnh**

![Ảnh nguồn image3.png](assets/description-api/image3.png)

<a id="b23"></a>

**Nguồn B23**

Cái này thì dễ rồi, có mô tả rầu

<a id="b24"></a>

**Nguồn B24**

Luồng tạo supplier:

<a id="b25"></a>

**Nguồn B25 — ảnh**

![Ảnh nguồn image4.png](assets/description-api/image4.png)

<a id="b26"></a>

**Nguồn B26**

Admin tạo tài khoản supplier bằng POST /supplier -> mail tài khoản mật khẩu được gửi về -> đăng nhập lần đầu gọi api /users/{id}/password yêu cầu đổi mật khẩu

<a id="b27"></a>

**Nguồn B27**

Lưu ý: Supplier được chia làm 2 loại: retailer (doanh nghiệp nội thất), workshop (xưởng sản xuất)

<a id="b28"></a>

**Nguồn B28**

Supplier quản lý chi nhánh

<a id="b29"></a>

**Nguồn B29 — ảnh**

![Ảnh nguồn image5.png](assets/description-api/image5.png)

<a id="b30"></a>

**Nguồn B30**

Doanh nghiệp nội thất có thể thêm nhiều địa chỉ (tức có nhiều chi nhánh)

<a id="b31"></a>

**Nguồn B31**

Xưởng sản xuất chỉ có thể thêm 1 địa chỉ

<a id="b33"></a>

**Nguồn B33**

Supplier quản lý portfolio

<a id="b34"></a>

**Nguồn B34 — ảnh**

![Ảnh nguồn image6.png](assets/description-api/image6.png)

<a id="b35"></a>

**Nguồn B35**

Retailer: có thể chọn sản phẩm của họ từ bảng product để them vào portfolio. Quy tắc lấy ảnh: lấy ảnh thumnail của sản phẩm được chọn

<a id="b36"></a>

**Nguồn B36**

Workshop: không có catalog nên them portfolio bằng cách tải ảnh lên (gọi api upload ảnh để trả về url sau đó điền vào field imageUrl)

<a id="b37"></a>

**Nguồn B37**

Admin tạo danh mục

<a id="b38"></a>

**Nguồn B38 — ảnh**

![Ảnh nguồn image7.png](assets/description-api/image7.png)

<a id="b39"></a>

**Nguồn B39**

Danh mục có dạng cây phân cấp

<a id="b40"></a>

**Nguồn B40**

Các danh mục phải được admin tạo để đồng bộ dữ liệu, không để supplier tạo vì sẽ có nhiều dữ liệu “rác”

<a id="b41"></a>

**Nguồn B41**

Khi supplier them sản phẩm sẽ chọn danh mục cho sản phẩm từ thanh drop down

<a id="b42"></a>

**Nguồn B42**

Hỗ trợ lọc filter sản phẩm theo danh mục ở marketplace

<a id="b43"></a>

**Nguồn B43**

Admin tạo vật liệu gỗ

<a id="b44"></a>

**Nguồn B44 — ảnh**

![Ảnh nguồn image8.png](assets/description-api/image8.png)

<a id="b45"></a>

**Nguồn B45**

Admin sẽ them các loại gỗ trên thị trường, khi supplier them sản phẩm chỉ cần chọn chất liệu của sản phẩm từ thanh drop down.

<a id="b46"></a>

**Nguồn B46**

Hỗ trợ lọc filter sản phẩm theo chất liệu ở martket place

<a id="b47"></a>

**Nguồn B47**

Supplier them sản phẩm của họ:

<a id="b48"></a>

**Nguồn B48 — ảnh**

![Ảnh nguồn image9.png](assets/description-api/image9.png)

<a id="b49"></a>

**Nguồn B49**

POST /products: thêm sản phẩm hoàn chỉnh gồm có:

<a id="b50"></a>

**Nguồn B50**

Sản phẩm (bàn học, tủ giày,…)

<a id="b51"></a>

**Nguồn B51**

Biến thể (variant) của sản phẩm (màu sắc, kích thước)

<a id="b52"></a>

**Nguồn B52**

Ảnh của sản phẩm

<a id="b53"></a>

**Nguồn B53**

Luồng gọi api:

<a id="b54"></a>

**Nguồn B54**

Upload file ảnh từ máy (nhiều request, thường dùng cho FE thật)

<a id="b55"></a>

**Nguồn B55**

Vì upload file phải là multipart/form-data và cần productId, nên bắt buộc tạo sản phẩm trước rồi mới đẩy ảnh.

<a id="b57"></a>

**Nguồn B57**

Bước 1 — Tạo sản phẩm kèm biến thể (chưa có ảnh, để status: "draft"):

<a id="b59"></a>

**Nguồn B59**

POST /api/products

<a id="b61"></a>

**Nguồn B61**

{

<a id="b62"></a>

**Nguồn B62**

"name": "Bàn gỗ sồi",

<a id="b63"></a>

**Nguồn B63**

"categoryId": "uuid-danh-muc",

<a id="b64"></a>

**Nguồn B64**

"status": "draft",

<a id="b65"></a>

**Nguồn B65**

"variants": [

<a id="b66"></a>

**Nguồn B66**

    { "sku": "BAN-SOI-120", "color": "Nâu", "dimensions": "120x60x75", "price": 2500000 },

<a id="b67"></a>

**Nguồn B67**

    { "sku": "BAN-SOI-160", "color": "Nâu", "dimensions": "160x80x75", "price": 3200000 }

<a id="b68"></a>

**Nguồn B68**

]

<a id="b69"></a>

**Nguồn B69**

}

<a id="b71"></a>

**Nguồn B71**

→ lấy id sản phẩm từ response.

<a id="b73"></a>

**Nguồn B73**

Bước 2 — Upload lần lượt từng file ảnh (gọi N lần cho N ảnh):

<a id="b75"></a>

**Nguồn B75**

POST /api/products/{productId}/images/upload

<a id="b76"></a>

**Nguồn B76**

Content-Type: multipart/form-data

<a id="b78"></a>

**Nguồn B78**

file=<binary> (bắt buộc)

<a id="b79"></a>

**Nguồn B79**

primary=true|false (tùy chọn)

<a id="b80"></a>

**Nguồn B80**

sortOrder=0 (tùy chọn)

<a id="b82"></a>

**Nguồn B82**

File được đẩy lên qua FileStorageService.upload(file, "products"), backend tự sinh URL và lưu.

<a id="b83"></a>

**Nguồn B83**

Ảnh đầu tiên của sản phẩm tự động là ảnh chính; hoặc gửi primary=true (sẽ tự gỡ primary của ảnh cũ).

<a id="b84"></a>

**Nguồn B84**

Không truyền sortOrder → tự đẩy xuống cuối (max + 1).

<a id="b85"></a>

**Nguồn B85**

⚠️ Endpoint này upload 1 file mỗi request. Với nhiều ảnh, FE cần gọi song song hoặc tuần tự nhiều lần.

<a id="b86"></a>

**Nguồn B86**

Bước 3 (tùy chọn) — Đăng bán: sau khi đã có biến thể + ảnh:

<a id="b88"></a>

**Nguồn B88**

PATCH /api/products/{id}/status

<a id="b89"></a>

**Nguồn B89**

{ "status": "active" }

<a id="b90"></a>

**Nguồn B90**

PATCH /status: cập nhật trạng thái của sản phẩm (draft,active,hidden)

<a id="b91"></a>

**Nguồn B91**

Supplier quản lý các biến thể của sản phẩm

<a id="b92"></a>

**Nguồn B92 — ảnh**

![Ảnh nguồn image10.png](assets/description-api/image10.png)

<a id="b93"></a>

**Nguồn B93**

POST /variants: them biến thể vào sản phẩm nếu có cập nhật

<a id="b94"></a>

**Nguồn B94**

Quản lý ảnh của sản phẩm

<a id="b95"></a>

**Nguồn B95 — ảnh**

![Ảnh nguồn image11.png](assets/description-api/image11.png)

<a id="b96"></a>

**Nguồn B96**

1. Mô hình dữ liệu ảnh

<a id="b97"></a>

**Nguồn B97**

2. Ba nguyên lý bất biến FE cần nhớ

<a id="b98"></a>

**Nguồn B98**

Backend tự đảm bảo 3 quy tắc sau, FE không cần tự tính mà chỉ cần hiểu để hiển thị đúng:

<a id="b99"></a>

**Nguồn B99**

a) Mỗi sản phẩm chỉ có tối đa 1 ảnh primary. Đây là ràng buộc unique ở DB. Khi bạn đặt một ảnh làm primary, backend tự động gỡ primary của ảnh cũ. FE không cần gọi 2 request (bỏ ảnh cũ + set ảnh mới) — chỉ cần 1 request set-primary.

<a id="b100"></a>

**Nguồn B100**

b) Ảnh đầu tiên của sản phẩm tự thành primary. Nếu sản phẩm chưa có ảnh nào, ảnh bạn thêm vào (dù không gửi primary) sẽ tự động là ảnh chính. Nên khi upload ảnh đầu tiên, FE không cần gửi primary=true.

<a id="b101"></a>

**Nguồn B101**

c) sortOrder tự đẩy xuống cuối nếu không truyền. Không gửi sortOrder → backend lấy max hiện tại + 1, nên ảnh mới luôn nằm cuối, không trùng thứ tự. FE chỉ cần gửi sortOrder khi muốn chèn vào vị trí cụ thể.

<a id="b103"></a>

**Nguồn B103**

Thứ tự sắp xếp khi GET: backend luôn trả về theo primary DESC → sortOrder ASC → createdAt ASC. Nghĩa là ảnh chính luôn nằm đầu danh sách, phần còn lại theo sortOrder. FE hiển thị theo đúng thứ tự mảng trả về là được, không cần sort lại.

<a id="b105"></a>

**Nguồn B105**

3. Nguồn URL ảnh (backend lưu ở đâu)

<a id="b106"></a>

**Nguồn B106**

Có 2 cách đưa ảnh vào hệ thống:

<a id="b107"></a>

**Nguồn B107**

Upload file (/upload): FE gửi file nhị phân → backend đẩy lên Supabase Storage (bucket public) → tự sinh URL và lưu. Chỉ nhận JPEG, PNG, WEBP, GIF; file rỗng hoặc sai định dạng → 400.

<a id="b108"></a>

**Nguồn B108**

Gắn URL có sẵn (POST .../images): dùng khi ảnh đã có link công khai từ nơi khác.

<a id="b109"></a>

**Nguồn B109**

Với form upload từ máy người dùng, dùng cách upload file.

<a id="b111"></a>

**Nguồn B111**

4. Danh sách 6 endpoint

<a id="b112"></a>

**Nguồn B112**

Tất cả endpoint ghi (POST/PATCH/PUT/DELETE) yêu cầu token supplier là chủ sản phẩm; không phải chủ → 403. GET ảnh của sản phẩm chưa active cũng cần là chủ.

<a id="b114"></a>

**Nguồn B114**

① Upload file ảnh — dùng nhiều nhất cho FE

<a id="b115"></a>

**Nguồn B115**

POST /api/products/{productId}/images/upload

<a id="b116"></a>

**Nguồn B116**

Content-Type: multipart/form-data

<a id="b117"></a>

**Nguồn B117**

Form fields:

<a id="b118"></a>

**Nguồn B118**

fieldbắt buộcý nghĩa

<a id="b119"></a>

**Nguồn B119**

file✅file ảnh nhị phân

<a id="b120"></a>

**Nguồn B120**

primary❌true để đặt làm ảnh chính (tự gỡ ảnh chính cũ)

<a id="b121"></a>

**Nguồn B121**

sortOrder❌vị trí; bỏ trống = đẩy xuống cuối

<a id="b122"></a>

**Nguồn B122**

→ 201 + object ảnh vừa tạo. Upload 1 file/request → nhiều ảnh phải gọi nhiều lần.

<a id="b124"></a>

**Nguồn B124**

② Gắn ảnh bằng URL có sẵn

<a id="b125"></a>

**Nguồn B125**

POST /api/products/{productId}/images

<a id="b126"></a>

**Nguồn B126**

{ "url": "https://...", "primary": false, "sortOrder": 1 }

<a id="b127"></a>

**Nguồn B127**

url bắt buộc. → 201 + object ảnh.

<a id="b129"></a>

**Nguồn B129**

③ Lấy danh sách ảnh của sản phẩm

<a id="b130"></a>

**Nguồn B130**

GET /api/products/{productId}/images

<a id="b131"></a>

**Nguồn B131**

→ 200 + mảng ảnh đã sắp xếp sẵn (ảnh chính đầu tiên).

<a id="b133"></a>

**Nguồn B133**

④ Đặt ảnh làm ảnh chính

<a id="b134"></a>

**Nguồn B134**

PATCH /api/images/{imageId}/primary

<a id="b135"></a>

**Nguồn B135**

Không có body. Backend tự gỡ primary của ảnh cũ. → 200 + ảnh vừa set.

<a id="b137"></a>

**Nguồn B137**

⑤ Cập nhật ảnh (đổi URL / đổi thứ tự)

<a id="b138"></a>

**Nguồn B138**

PUT /api/images/{imageId}

<a id="b139"></a>

**Nguồn B139**

{ "url": "https://...", "sortOrder": 2 }

<a id="b140"></a>

**Nguồn B140**

url bắt buộc (@NotBlank); sortOrder tùy chọn (bỏ trống = giữ nguyên). ⚠️ Endpoint này không đổi được primary — muốn đổi ảnh chính phải dùng ④.

<a id="b142"></a>

**Nguồn B142**

⑥ Xóa ảnh

<a id="b143"></a>

**Nguồn B143**

DELETE /api/images/{imageId}

<a id="b144"></a>

**Nguồn B144**

→ 204 (no content).

<a id="b146"></a>

**Nguồn B146**

Thêm sản phẩm vào chi nhánh (Store Inventory)

<a id="b147"></a>

**Nguồn B147**

1. Mô hình dữ liệu tồn kho

<a id="b148"></a>

**Nguồn B148**

Điểm cốt lõi: tồn kho không gắn với sản phẩm/biến thể trực tiếp, mà là giao điểm giữa (chi nhánh × biến thể).

<a id="b150"></a>

**Nguồn B150**

Cửa hàng (Store) ──┐

<a id="b151"></a>

**Nguồn B151**

                                  ├──> StoreInventory { stockQuantity }

<a id="b152"></a>

**Nguồn B152**

     Biến thể (Variant) ┘

<a id="b154"></a>

**Nguồn B154**

Một biến thể có thể tồn ở nhiều chi nhánh, mỗi chi nhánh giữ số lượng riêng.

<a id="b155"></a>

**Nguồn B155**

Khóa chính là kép (store_id, variant_id) → mỗi cặp chỉ có đúng 1 bản ghi tồn kho. Đây là lý do có sự phân biệt giữa "thêm mới" và "điều chỉnh" (xem mục 3).

<a id="b156"></a>

**Nguồn B156**

Vì vậy toàn bộ endpoint định danh bản ghi bằng 2 path param: {storeId} + {variantId}, không có id riêng cho bản ghi tồn kho.

<a id="b157"></a>

**Nguồn B157**

StoreInventoryResponse trả về dữ liệu biến thể được nhúng sẵn (FE không cần join thêm):

<a id="b159"></a>

**Nguồn B159**

{

<a id="b160"></a>

**Nguồn B160**

"storeId": "uuid",

<a id="b161"></a>

**Nguồn B161**

"variantId": "uuid",

<a id="b162"></a>

**Nguồn B162**

"productId": "uuid", // biến thể này thuộc sản phẩm nào

<a id="b163"></a>

**Nguồn B163**

"sku": "BAN-SOI-120",

<a id="b164"></a>

**Nguồn B164**

"color": "Nâu",

<a id="b165"></a>

**Nguồn B165**

"dimensions": "120x60x75",

<a id="b166"></a>

**Nguồn B166**

"price": 2500000,

<a id="b167"></a>

**Nguồn B167**

"stockQuantity": 30, // tồn hiện tại tại chi nhánh này

<a id="b168"></a>

**Nguồn B168**

"createdAt": "...",

<a id="b169"></a>

**Nguồn B169**

"updatedAt": "..." // đổi mỗi khi điều chỉnh tồn kho

<a id="b170"></a>

**Nguồn B170**

}

<a id="b172"></a>

**Nguồn B172**

2. Ba nguyên lý bất biến FE cần nhớ

<a id="b173"></a>

**Nguồn B173**

a) Quyền sở hữu kiểm 2 lớp. Mọi thao tác đều yêu cầu supplier đang đăng nhập vừa sở hữu chi nhánh vừa sở hữu biến thể (qua sản phẩm). Sai một trong hai → 403. Không tồn tại → 404. FE nên chỉ cho thao tác trên chi nhánh/sản phẩm của chính supplier.

<a id="b175"></a>

**Nguồn B175**

b) "Thêm mới" và "điều chỉnh" là hai việc khác nhau — không thể thay thế nhau.

<a id="b177"></a>

**Nguồn B177**

Biến thể chưa có trong kho chi nhánh → phải POST (thêm mới). Nếu POST khi đã tồn tại → 409.

<a id="b178"></a>

**Nguồn B178**

Biến thể đã có → phải PATCH (điều chỉnh). Nếu PATCH khi chưa tồn tại → 404.

<a id="b179"></a>

**Nguồn B179**

FE cần biết trạng thái hiện tại để gọi đúng endpoint. Thông thường: lấy danh sách tồn kho của chi nhánh trước (④), biến thể nào chưa có trong danh sách thì dùng "thêm mới", đã có thì dùng "điều chỉnh".

<a id="b181"></a>

**Nguồn B181**

c) Tồn kho không bao giờ âm. PATCH cộng delta vào tồn hiện tại; nếu kết quả < 0 → 400 kèm tồn hiện tại. FE nên chặn trước khi gửi (không cho xuất quá tồn).

<a id="b183"></a>

**Nguồn B183**

3. Cơ chế xuất/nhập kho bằng delta

<a id="b184"></a>

**Nguồn B184**

Điều chỉnh tồn kho không gửi số lượng tuyệt đối, mà gửi mức thay đổi (delta):

<a id="b186"></a>

**Nguồn B186**

delta > 0 → nhập kho (ví dụ +50).

<a id="b187"></a>

**Nguồn B187**

delta < 0 → xuất kho (ví dụ -10).

<a id="b188"></a>

**Nguồn B188**

Backend tính tồn mới = tồn cũ + delta, atomic trong 1 transaction.

<a id="b189"></a>

**Nguồn B189**

Lý do dùng delta thay vì set thẳng số: tránh race condition khi 2 thao tác xuất/nhập diễn ra gần nhau ghi đè lẫn nhau. Nếu FE muốn hiển thị ô "sửa số lượng thành X", cần tự tính delta = X - stockQuantity_hiện_tại rồi gửi.

<a id="b191"></a>

**Nguồn B191**

4. Danh sách 5 endpoint

<a id="b192"></a>

**Nguồn B192**

Tất cả yêu cầu token supplier là chủ.

<a id="b194"></a>

**Nguồn B194**

① Danh sách tồn kho của một chi nhánh

<a id="b195"></a>

**Nguồn B195**

GET /api/stores/{storeId}/inventory

<a id="b196"></a>

**Nguồn B196**

→ 200 + mảng StoreInventoryResponse, sắp xếp createdAt DESC (mới thêm lên đầu). Dùng để render bảng tồn kho của một cửa hàng.

<a id="b198"></a>

**Nguồn B198**

② Thêm biến thể vào chi nhánh (tồn ban đầu)

<a id="b199"></a>

**Nguồn B199**

POST /api/stores/{storeId}/inventory/{variantId}

<a id="b200"></a>

**Nguồn B200**

{ "stockQuantity": 30 }

<a id="b201"></a>

**Nguồn B201**

stockQuantity bắt buộc, ≥ 0. Đã tồn tại → 409. → 201 + bản ghi.

<a id="b203"></a>

**Nguồn B203**

③ Điều chỉnh tồn kho (nhập/xuất)

<a id="b204"></a>

**Nguồn B204**

PATCH /api/stores/{storeId}/inventory/{variantId}

<a id="b205"></a>

**Nguồn B205**

{ "delta": -10 }

<a id="b206"></a>

**Nguồn B206**

delta bắt buộc (số nguyên, âm hoặc dương). Chưa tồn tại → 404; vượt tồn → 400. → 200 + bản ghi đã cập nhật.

<a id="b208"></a>

**Nguồn B208**

④ Xóa bản ghi tồn kho

<a id="b209"></a>

**Nguồn B209**

DELETE /api/stores/{storeId}/inventory/{variantId}

<a id="b210"></a>

**Nguồn B210**

Không tồn tại → 404. → 204. (Gỡ hẳn biến thể khỏi kho chi nhánh, khác với đưa tồn về 0.)

<a id="b212"></a>

**Nguồn B212**

⑤ Tồn kho tổng hợp của một biến thể trên tất cả chi nhánh

<a id="b213"></a>

**Nguồn B213**

GET /api/variants/{variantId}/inventory

<a id="b214"></a>

**Nguồn B214**

→ 200:

<a id="b215"></a>

**Nguồn B215**

{

<a id="b216"></a>

**Nguồn B216**

"variantId": "uuid",

<a id="b217"></a>

**Nguồn B217**

"totalStock": 80, // tổng tồn trên mọi chi nhánh

<a id="b218"></a>

**Nguồn B218**

"stores": [ StoreInventoryResponse, ... ] // chi tiết từng chi nhánh

<a id="b219"></a>

**Nguồn B219**

}

<a id="b220"></a>

**Nguồn B220**

Dùng cho màn "xem một biến thể đang có ở đâu, tổng bao nhiêu".

<a id="b221"></a>

**Nguồn B221**

Chat real time

<a id="b222"></a>

**Nguồn B222**

1. Kiến trúc tổng thể: REST + STOMP song song

<a id="b223"></a>

**Nguồn B223 — ảnh**

![Ảnh nguồn image12.png](assets/description-api/image12.png)

<a id="b224"></a>

**Nguồn B224**

Nguyên lý: FE dùng REST để lấy dữ liệu tĩnh (mở màn hình, cuộn lịch sử), dùng WebSocket để gửi/nhận realtime. Một tin gửi qua STOMP vẫn được lưu DB (cùng logic ChatService.sendMessage), nên không mất tin.

<a id="b226"></a>

**Nguồn B226**

⚠️ Điểm quan trọng: transport là STOMP over WebSocket, KHÔNG phải socket.io. FE phải dùng thư viện @stomp/stompjs (+ sockjs-client)

<a id="b228"></a>

**Nguồn B228**

2. Mô hình dữ liệu

<a id="b229"></a>

**Nguồn B229**

Conversation = 1 cặp (khách hàng × nhà cung cấp), duy nhất. ConversationResponse:

<a id="b231"></a>

**Nguồn B231**

{

<a id="b232"></a>

**Nguồn B232**

"id": "uuid",

<a id="b233"></a>

**Nguồn B233**

"customerId": "uuid", "customerName": "Nguyễn A",

<a id="b234"></a>

**Nguồn B234**

"supplierId": "uuid",

<a id="b235"></a>

**Nguồn B235**

"supplierUserId": "uuid", // userId chủ NCC — dùng để tra presence

<a id="b236"></a>

**Nguồn B236**

"supplierBusinessName": "Xưởng gỗ B",

<a id="b237"></a>

**Nguồn B237**

"productId": "uuid|null", "productName": "...|null", // ngữ cảnh sản phẩm (tùy chọn)

<a id="b238"></a>

**Nguồn B238**

"lastMessageAt": "...",

<a id="b239"></a>

**Nguồn B239**

"customerLastReadAt": "...", "supplierLastReadAt": "...",

<a id="b240"></a>

**Nguồn B240**

"unreadCount": 3, // chưa đọc theo góc nhìn người đang gọi API

<a id="b241"></a>

**Nguồn B241**

"createdAt": "...", "updatedAt": "..."

<a id="b242"></a>

**Nguồn B242**

}

<a id="b244"></a>

**Nguồn B244**

Message (ChatMessageResponse):

<a id="b246"></a>

**Nguồn B246**

{

<a id="b247"></a>

**Nguồn B247**

"id": "uuid",

<a id="b248"></a>

**Nguồn B248**

"conversationId": "uuid",

<a id="b249"></a>

**Nguồn B249**

"senderId": "uuid", // dùng để FE phân biệt tin của mình

<a id="b250"></a>

**Nguồn B250**

"senderName": "Nguyễn A",

<a id="b251"></a>

**Nguồn B251**

"content": "text|null",

<a id="b252"></a>

**Nguồn B252**

"attachmentUrl": "url|null",

<a id="b253"></a>

**Nguồn B253**

"createdAt": "..."

<a id="b254"></a>

**Nguồn B254**

}

<a id="b256"></a>

**Nguồn B256**

3. Ba nguyên lý bất biến FE cần nhớ

<a id="b257"></a>

**Nguồn B257**

a) Hội thoại là idempotent theo cặp (khách, NCC). Gọi "mở hội thoại" nhiều lần với cùng NCC → luôn trả về đúng 1 hội thoại cũ, không tạo trùng. FE cứ gọi mỗi khi khách bấm "Chat với người bán".

<a id="b259"></a>

**Nguồn B259**

b) Nhận tin qua hàng đợi riêng từng người, không phải topic chung. Server đẩy tin tới /user/queue/messages — mỗi người chỉ nhận tin của các hội thoại mình tham gia (tránh nghe lén). FE subscribe đúng 1 đích /user/queue/messages là nhận được tin của mọi hội thoại; sau đó tự lọc theo conversationId để bỏ vào đúng khung chat.

<a id="b261"></a>

**Nguồn B261**

c) Server echo lại tin cho cả người gửi. Khi bạn gửi tin, server đẩy về cho cả hai người (kể cả người gửi) để đồng bộ đa thiết bị/tab. Vì vậy:

<a id="b263"></a>

**Nguồn B263**

FE không cần optimistic echo tự thêm tin vào UI — chờ tin từ WebSocket về rồi render (đảm bảo có id, createdAt thật).

<a id="b264"></a>

**Nguồn B264**

Nếu vẫn muốn optimistic để mượt, phải khử trùng theo id khi tin thật về, và phân biệt tin của mình bằng senderId === myUserId để canh phải/trái.

<a id="b265"></a>

**Nguồn B265**

4. Kết nối WebSocket (STOMP)

<a id="b266"></a>

**Nguồn B266 — ảnh**

![Ảnh nguồn image13.png](assets/description-api/image13.png)

<a id="b267"></a>

**Nguồn B267**

Điểm mấu chốt:

<a id="b269"></a>

**Nguồn B269**

Token JWT gửi trong connectHeaders (frame CONNECT), không qua query string. Thiếu/sai token → server chặn kết nối ngay.

<a id="b270"></a>

**Nguồn B270**

Endpoint /ws bật SockJS fallback nên phải dùng SockJS + webSocketFactory (không nối thẳng ws://).

<a id="b271"></a>

**Nguồn B271**

principal = email được gắn sau CONNECT; toàn bộ định tuyến /user/... dựa vào đó.

<a id="b272"></a>

**Nguồn B272**

Gửi tin qua STOMP:

<a id="b273"></a>

**Nguồn B273 — ảnh**

![Ảnh nguồn image14.png](assets/description-api/image14.png)

<a id="b274"></a>

**Nguồn B274**

Không cần Authorization lại (đã xác thực ở CONNECT). Tin sẽ được lưu DB rồi đẩy về /user/queue/messages của cả hai bên.

<a id="b276"></a>

**Nguồn B276**

5. Danh sách endpoint REST

<a id="b277"></a>

**Nguồn B277**

Tất cả cần header Authorization: Bearer <JWT>.

<a id="b279"></a>

**Nguồn B279**

① Mở / lấy lại hội thoại (khách hàng)

<a id="b280"></a>

**Nguồn B280**

POST /api/conversations

<a id="b281"></a>

**Nguồn B281**

{ "supplierId": "uuid", "productId": "uuid|null" }

<a id="b283"></a>

**Nguồn B283**

NCC chưa active → 403; tự nhắn chính mình → 400. → 201 + ConversationResponse (đã tồn tại thì trả về cái cũ).

<a id="b285"></a>

**Nguồn B285**

② Danh sách hội thoại của tôi

<a id="b286"></a>

**Nguồn B286**

GET /api/conversations?role=customer|supplier&page=0&size=20

<a id="b288"></a>

**Nguồn B288**

role=customer: hội thoại tôi là khách. role=supplier: hội thoại của cửa hàng tôi (tài khoản không phải NCC → 403). → Page<ConversationResponse> (có unreadCount theo đúng vai).

<a id="b290"></a>

**Nguồn B290**

③ Lịch sử tin nhắn

<a id="b291"></a>

**Nguồn B291**

GET /api/conversations/{conversationId}/messages?page=0&size=30

<a id="b293"></a>

**Nguồn B293**

Trả mới nhất trước (createdAt DESC). FE thường reverse lại để hiển thị và dùng page tăng dần để cuộn ngược. Không phải người trong cuộc → 403.

<a id="b295"></a>

**Nguồn B295**

④ Gửi tin (REST — dự phòng)

<a id="b296"></a>

**Nguồn B296**

POST /api/conversations/{conversationId}/messages

<a id="b297"></a>

**Nguồn B297**

{ "content": "...", "attachmentUrl": "..." }

<a id="b299"></a>

**Nguồn B299**

Phải có ít nhất content hoặc attachmentUrl, nếu rỗng cả hai → 400. content tối đa 5000 ký tự. → 201 + tin. Dùng khi WebSocket chưa kết nối được; tin này cũng được broadcast realtime như qua STOMP.

<a id="b301"></a>

**Nguồn B301**

⑤ Đánh dấu đã đọc

<a id="b302"></a>

**Nguồn B302**

POST /api/conversations/{conversationId}/read

<a id="b304"></a>

**Nguồn B304**

Cập nhật mốc đã đọc → unreadCount về 0 ở lần list sau. → 204. Lưu ý: người gửi tin tự động được coi là đã đọc tới thời điểm gửi, nên chỉ cần gọi mark-read cho phía người nhận khi họ mở khung chat.

<a id="b306"></a>

**Nguồn B306**

⑥ Presence (online/offline)

<a id="b307"></a>

**Nguồn B307**

GET /api/users/{id}/presence

<a id="b309"></a>

**Nguồn B309**

→ { userId, online, lastSeenAt }. online=true → hiển thị "Đang hoạt động"; false → "Hoạt động ... trước" dựa vào lastSeenAt (null nếu chưa từng online). FE tra presence của đối phương bằng supplierUserId (khi mình là khách) hoặc customerId (khi mình là NCC).

<a id="b311"></a>

**Nguồn B311**

online chỉ cập nhật khi có/mất phiên WebSocket. Nên muốn hiện đúng trạng thái, FE phải giữ kết nối /ws khi ở trong app; presence là polling qua REST (không có push), FE tự đặt nhịp gọi lại (ví dụ mỗi 30–60s khi đang mở khung chat).

<a id="b313"></a>

**Nguồn B313**

6. Luồng FE điển hình

<a id="b314"></a>

**Nguồn B314**

Khi vào app (đã đăng nhập):

<a id="b316"></a>

**Nguồn B316**

Kết nối /ws (STOMP) + subscribe /user/queue/messages một lần, giữ suốt phiên.

<a id="b317"></a>

**Nguồn B317**

GET /api/conversations?role=... (②) → render danh sách hội thoại + badge unreadCount.

<a id="b318"></a>

**Nguồn B318**

Tin realtime đến (từ subscribe): route theo conversationId. Nếu đang mở đúng hội thoại đó → append vào khung + gọi ⑤ mark-read; nếu không → tăng badge chưa đọc trên danh sách.

<a id="b320"></a>

**Nguồn B320**

Khi mở một khung chat:

<a id="b322"></a>

**Nguồn B322**

GET .../messages (③) tải lịch sử (reverse để hiển thị cũ→mới).

<a id="b323"></a>

**Nguồn B323**

POST .../read (⑤) đánh dấu đã đọc.

<a id="b324"></a>

**Nguồn B324**

Tra GET /api/users/{đối_phương}/presence (⑥) hiển thị trạng thái online.

<a id="b325"></a>

**Nguồn B325**

Khi gửi tin: ưu tiên client.publish qua STOMP; nếu WS đang mất kết nối, fallback POST .../messages (④). Tin của mình sẽ tự về qua subscribe → render (khử trùng theo id).

<a id="b327"></a>

**Nguồn B327**

Khách bấm "Chat với người bán" ở trang sản phẩm: POST /api/conversations (①) với supplierId + productId → nhận conversationId → mở khung chat.
