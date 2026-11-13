# Dọn codebase wedding-app — 2026-11-13

Đã loại bỏ các implementation không còn được app hiện tại dùng, sau khi tách phụ thuộc còn hiệu lực và bảo toàn kiểm chứng cho luồng hiện hành. Không thay đổi API/backend, dữ liệu, giá, điều kiện phê duyệt hoặc điều kiện thanh toán.

## Kết quả cấu trúc

| Chỉ số trong src/                               | Trước | Sau |
| ----------------------------------------------- | ----: | --: |
| Tổng file TS/TSX/CSS                            |   177 | 111 |
| File route/layout                               |     9 |   9 |
| File test                                       |    33 |  32 |
| File ngoài test chưa có đường vào từ route/test |     4 |   0 |

Đã xóa 70 file và chuyển vị trí 5 file. Có 4 file nguồn/test mới dùng để tách phụ thuộc hoặc kiểm chứng luồng đang chạy, nên số file giảm ròng là 66. Trong style đăng nhập/tài khoản, giữ nguyên giá trị của 11 style đang dùng và bỏ 10 style không còn consumer.

Các cụm screens/v0, screens/v2, screens/hy, screens/public và screens/agreement đã được loại bỏ, cùng các wrapper overview/billing cũ. Cụm public cũ không được route hoặc HomeScreen hiện hành gọi; các route hiện tại, bao gồm invitation, billing, reset và các deep link khong-gian, được giữ nguyên.

## Phụ thuộc được giữ và chuyển

| Trước                                 | Sau                                                        | Hành vi                                                           |
| ------------------------------------- | ---------------------------------------------------------- | ----------------------------------------------------------------- |
| screens/hy/resource-store.ts          | lib/cache/resource-store.ts                                | Giữ nguyên cache, phạm vi theo phiên và cơ chế loại bỏ request cũ |
| Kiểu V0Screen trong v0-types.ts       | screens/workspace/workspace-types.ts: WorkspaceEntryScreen | Giữ nguyên toàn bộ giá trị điều hướng, kể cả alias cũ             |
| Helper lỗi trong billing-sections.tsx | lib/api/error-message.ts                                   | Giữ nguyên phân loại lỗi/quyền truy cập/kết quả chưa rõ           |
| components/v0-icons*.tsx              | components/icons/                                          | Giữ nguyên icon và cập nhật import                                |
| screens/home.styles.ts                | screens/identity.styles.ts                                 | Chỉ giữ các style đăng nhập/tài khoản còn dùng                    |

API gateways, generated schema, adapter chặn thao tác Guest đã nghỉ, test hỗ trợ workspace, assets và giấy phép font vẫn được giữ khi còn có vai trò. planning-api.ts được giữ cùng test API của nó; hai file hỗ trợ test workspace là fixture/test double, không phải mã rác.

Quét import theo Android/iOS/web sau cùng ghi nhận 74 file runtime, 2 file liên kết kiểu dữ liệu, 3 file phục vụ test và 32 file test. Không có import nội bộ tĩnh chưa resolve hoặc file mồ côi theo các entry đã kiểm tra. Đây là phân tích cấp module, không khẳng định mọi export trong mỗi file đều được dùng.

## Kiểm chứng được bảo toàn

Trước khi xóa UI cũ, bước tách phụ thuộc đã chạy đủ 212 test cũ và TypeScript thành công.

Bảy test NativeAccountSettings đã chuyển từ couple-overview.test.tsx sang native-account-settings.test.tsx, import trực tiếp màn hình đang dùng. Đối chiếu AST xác nhận cả bảy thân test được giữ nguyên. Chúng tiếp tục kiểm tra cập nhật hồ sơ, xung đột phiên bản, mật khẩu/OTP, giữ bản nhập và thu hồi phiên.

Thêm tám test trên WorkspacePayment dùng implementation idempotency thực và SecureStore giả lập trong bộ nhớ:

- Thử lại sau HTTP 429 với cùng khóa và phiên bản công nợ.
- Giữ phiên bản gốc sau timeout dù công nợ mới đã được tải.
- Chặn thu thêm khi giao dịch UNKNOWN hoặc tiền đã nhận nhưng chưa áp dụng xong.
- Xóa số dư cũ khỏi màn hình khi quyền đọc bị từ chối 401/403/404.
- Không cho thu mới khi khôi phục giao dịch từ deep link thất bại.

Các test riêng cho implementation v0, billing và overview đã nghỉ được loại bỏ cùng implementation. Sau khi chuyển bảy test tài khoản, có 76 ca test dành riêng cho UI cũ được nghỉ; thêm tám ca cho luồng đang chạy đưa tổng từ 212 xuống 144. Không dùng số lượng giảm này để tuyên bố đã đạt coverage. Các test API, session, idempotency, hợp đồng và các màn hình workspace hiện hành được giữ; không thêm skip, không bỏ assertion của bảy test tài khoản và không giảm ngưỡng chất lượng.

## Kết quả kiểm tra cuối

| Kiểm tra                       | Kết quả                                                                                   |
| ------------------------------ | ----------------------------------------------------------------------------------------- |
| Jest chạy tuần tự kèm coverage | 144 test / 32 suite pass                                                                  |
| Coverage dòng                  | 69,66%; chưa đạt 80%                                                                      |
| Coverage nhánh                 | 65,32%; chưa đạt 80%                                                                      |
| TypeScript                     | Pass                                                                                      |
| ESLint, không cho warning      | Pass                                                                                      |
| API pin/schema                 | Pass; SHA-256 giữ nguyên 5e6ea2a0e3f9de33f458b5e82c6dffb11f7211a2b903f31804cb23a625eaa57d |
| Android Hermes và web export   | Pass                                                                                      |

Lệnh coverage vẫn trả exit code 1 do ngưỡng 80%, dù toàn bộ test đều pass. Một lượt chạy coverage đồng thời với build từng timeout ở test khôi phục mật khẩu. Test đó đã pass khi chạy riêng; lượt coverage toàn bộ chạy tuần tự cũng pass toàn bộ 144 ca, không thay timeout hoặc assertion.

Đối chiếu AST trước/sau xác nhận implementation tài chính, hợp đồng, phụ lục, quyết toán, phiên đăng nhập, API client, schema, cache và icon được giữ nguyên ngoài các import đổi vị trí. Nội dung .env có SHA-256 không đổi. Không thay dependency hoặc cấu hình test/coverage trong đợt dọn này.

Bản web export được phục vụ tĩnh trên localhost trong browser context riêng để kiểm tra đăng nhập ở 320px và khôi phục mật khẩu ở 390px; không có tràn ngang hoặc cảnh báo/lỗi console trong các lượt kiểm tra này. Không nhập tài khoản, gửi OTP hoặc thao tác dữ liệu thật. Kiểm tra browser không thay thế nghiệm thu các luồng đã đăng nhập, native device hoặc provider thực tế; các giới hạn nghiệm thu đã ghi trước đó vẫn còn.

## Phạm vi giữ nguyên và bằng chứng

Giữ cấu hình Expo/EAS, API lock, assets/font license, .env/.env.example, skills cho công cụ và tài liệu lịch sử. Không dọn toàn bộ test-results vì chứa bằng chứng và bản sao phục hồi. README đã mô tả cấu trúc hiện hành và làm rõ .env là override tùy chọn.

Bản sao source trước khi dọn, danh sách xóa kèm SHA-256, kết quả so sánh AST, manifest import cuối và log kiểm tra nằm trong thư mục local bị ignore test-results/codebase-cleanup-2026-11-13/. Danh sách xóa chi tiết được liệt kê bên dưới.

Chưa commit, push hoặc deploy. Coverage chưa đạt ngưỡng; báo cáo này không xác nhận backend/provider hay release đã đủ điều kiện phát hành.

## Danh sách 70 file đã xóa

- `src/components/v0-primitives.tsx`
- `src/features/catalog/catalog-api.ts`
- `src/lib/qr.tsx`
- `src/lib/save-downloaded-file.ts`
- `src/screens/agreement/agreement-workspace.tsx`
- `src/screens/billing.tsx`
- `src/screens/couple-overview.tsx`
- `src/screens/hy/hy-archived-guests-sheet.tsx`
- `src/screens/hy/hy-confirm-archive-sheet.tsx`
- `src/screens/hy/hy-detail.tsx`
- `src/screens/hy/hy-guest-detail-sheet.tsx`
- `src/screens/hy/hy-guest-form-sheets.tsx`
- `src/screens/hy/hy-guest-list-header.tsx`
- `src/screens/hy/hy-guest-row.tsx`
- `src/screens/hy/hy-guest-types.ts`
- `src/screens/hy/hy-guests.tsx`
- `src/screens/hy/hy-party.tsx`
- `src/screens/hy/hy-profile.tsx`
- `src/screens/hy/hy-seating-tab.tsx`
- `src/screens/hy/use-hy-guest-actions.ts`
- `src/screens/hy/use-hy-guests-data.ts`
- `src/screens/hy/use-hy-resource.ts`
- `src/screens/hy/use-party-resources.ts`
- `src/screens/v0/catalog/v0-catalog-cards.tsx`
- `src/screens/v0/invite/invite-edit-view.tsx`
- `src/screens/v0/invite/invite-preview-view.tsx`
- `src/screens/v0/invite/invite-share-view.tsx`
- `src/screens/v0/invite/invite.styles.ts`
- `src/screens/v0/invite/use-invite-save.ts`
- `src/screens/v0/notifications/notification-cards.tsx`
- `src/screens/v0/panels/panels-common.tsx`
- `src/screens/v0/panels/panels.styles.ts`
- `src/screens/v0/panels/restored-commercial-panel.tsx`
- `src/screens/v0/panels/restored-guest-panel.tsx`
- `src/screens/v0/panels/restored-health-panel.tsx`
- `src/screens/v0/panels/restored-invoice-panel.tsx`
- `src/screens/v0/panels/restored-print-panel.tsx`
- `src/screens/v0/panels/restored-timeline-panel.tsx`
- `src/screens/v0/restored-flow-controls.tsx`
- `src/screens/v0/subflows/subflows-common.ts`
- `src/screens/v0/subflows/subflows.styles.ts`
- `src/screens/v0/subflows/v0-appendices-subflow.tsx`
- `src/screens/v0/subflows/v0-contracts-subflow.tsx`
- `src/screens/v0/subflows/v0-guests-subflow.tsx`
- `src/screens/v0/subflows/v0-incidentals-subflow.tsx`
- `src/screens/v0/subflows/v0-invoices-subflow.tsx`
- `src/screens/v0/subflows/v0-media-subflow.tsx`
- `src/screens/v0/subflows/v0-print-subflow.tsx`
- `src/screens/v0/subflows/v0-schedule-subflow.tsx`
- `src/screens/v0/v0-catalog-subflow.styles.ts`
- `src/screens/v0/v0-catalog-subflow.tsx`
- `src/screens/v0/v0-companion-shell.tsx`
- `src/screens/v0/v0-invite-tab.tsx`
- `src/screens/v0/v0-notifications-subflow.styles.ts`
- `src/screens/v0/v0-notifications-subflow.tsx`
- `src/screens/v0/v0-sessions-subflow.tsx`
- `src/screens/v0/v0-subflows.tsx`
- `src/screens/v2/v2-payments-tab.tsx`
- `src/screens/v2/v2-prepare-tab.tsx`
- `src/features/catalog/estimate.ts`
- `src/screens/public/consultation-screen.tsx`
- `src/screens/public/estimator-screen.tsx`
- `src/screens/public/public-shell.tsx`
- `src/screens/billing-sections.tsx`
- `src/screens/billing.styles.ts`
- `src/screens/v0/v0-types.ts`
- `src/screens/couple-overview.test.tsx`
- `src/screens/billing.test.tsx`
- `src/screens/v0/v0.test.tsx`
- `src/lib/formatters.ts`
