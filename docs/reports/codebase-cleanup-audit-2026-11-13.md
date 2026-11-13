# Rà soát cấu trúc wedding-app — 2026-11-13

Đây là ảnh chụp trước khi dọn. Kết quả thực hiện và cấu trúc hiện tại được ghi trong [báo cáo dọn codebase](codebase-cleanup-2026-11-13.md).

Đây là báo cáo xác định phạm vi dọn dẹp, chưa phải thay đổi xóa mã. Phân tích dùng checkout hiện tại trên nhánh codex/prm-react-native-migration, bao gồm thay đổi chưa commit.

## Phương pháp và giới hạn

Đã kiểm tra cả 9 file route/layout của Expo Router; import/export, import kiểu dữ liệu, require, dynamic import có đường dẫn tĩnh và các tham chiếu mock/requireActual trong test. Việc resolve được thực hiện riêng cho Android, iOS và web để giữ đúng các file theo nền tảng. Đã đối chiếu package scripts, cấu hình Expo/EAS/Jest/TypeScript/ESLint, asset và tài liệu liên quan.

Thống kê src gồm 177 file TS/TSX/CSS, không tính node_modules, output hoặc tài liệu. Không có import nội bộ tĩnh nào chưa resolve được trong lần phân tích này. Phân tích ở cấp module: một file thuộc đồ thị runtime không có nghĩa là mọi export trong file đều được dùng hay mọi byte đều đi vào bundle. Không dùng kết quả này để tự động xóa tính năng chưa được nối route.

| Nhóm                                         | Số file | Đánh giá                                                  |
| -------------------------------------------- | ------: | --------------------------------------------------------- |
| Thuộc đồ thị import runtime của các route    |      76 | Giữ; có thể còn export/style cũ bên trong                 |
| Chỉ được runtime tham chiếu qua kiểu dữ liệu |       3 | Giữ đến khi tách kiểu và hợp đồng dữ liệu                 |
| Chỉ được tham chiếu qua test                 |      61 | Cần phân loại tiếp, không đồng nghĩa là rác               |
| Không có đường vào từ route hoặc test        |       4 | Ứng viên loại bỏ nếu không giữ tính năng public cũ        |
| File test                                    |      33 | Giữ kiểm chứng; không xóa hàng loạt để giảm số lượng file |

## Có thể tái tạo, tách khỏi việc dọn source

Các dung lượng dưới đây là tổng kích thước nội dung file theo hệ thập phân, không phải dung lượng chiếm dụng thực trên ổ đĩa.

| Thư mục       |             Số file |     Dung lượng gần đúng | Cách xử lý đề xuất                                                                                       |
| ------------- | ------------------: | ----------------------: | -------------------------------------------------------------------------------------------------------- |
| dist/         |                  37 |                  7,1 MB | Output bundle; có thể tạo lại bằng build                                                                 |
| coverage/     |                 113 |                  3,7 MB | Báo cáo tự sinh; có thể tạo lại                                                                          |
| .expo/        |                   6 |                 0,09 MB | Dữ liệu máy dev; chỉ dọn khi đã dừng server và chấp nhận tái tạo cấu hình phiên dev                      |
| test-results/ | 262 trước lần audit | 32,8 MB trước lần audit | Có cả ảnh/log bằng chứng, bản build và fixture; chọn giữ bằng chứng cần bàn giao rồi mới dọn các bản tạm |
| node_modules/ |           Không đếm |                Không đo | Dependency cài đặt, không phải source dư; không cần xóa chỉ để làm gọn kiến trúc                         |

Các thư mục output/cache trên đã được Git ignore. Chưa xóa thư mục nào.

## Bốn file không có đường vào hiện tại

- src/screens/public/public-shell.tsx
- src/screens/public/consultation-screen.tsx
- src/screens/public/estimator-screen.tsx
- src/features/catalog/estimate.ts

Ba màn hình public là một nhánh Khám phá / Tư vấn / Tính giá cũ. Các file này tham chiếu lẫn nhau nhưng không được route hoặc HomeScreen hiện tại gọi tới; helper estimate phục vụ nhánh đó. Vì đây là mã tính năng thực, cần quyết định loại bỏ nhánh public cũ hay giữ để nối lại trước khi xóa. Hiện không có cơ sở khẳng định app đang hiển thị các màn hình này.

## Giao diện cũ có thể nghỉ dùng theo từng cụm

Trong 61 file chỉ được test kéo vào:

- 55 file nằm trong các cụm giao diện cũ: screens/v0 (34), screens/hy ngoài resource-store (16), screens/v2 (2), screens/agreement/agreement-workspace.tsx, screens/billing.tsx và screens/couple-overview.tsx.
- 4 file phụ trợ còn lại là components/v0-primitives.tsx, features/catalog/catalog-api.ts, lib/qr.tsx và lib/save-downloaded-file.ts. Chỉ cân nhắc bỏ sau khi quyết định các consumer cũ và nhánh public; không kết luận API hoặc helper đúng nghiệp vụ là rác chỉ vì app mới chưa gọi.
- 2 file là workspace/workspace-test-support.ts và workspace/workspace-sheet-test-support.tsx. Đây là fixture/test double của test hiện hành, cần giữ.

Ứng viên dọn là các implementation cũ sau khi chuyển hết phụ thuộc và kiểm chứng hành vi. Giữ các ca test cần thiết cho luồng mới, không hạ coverage hoặc bỏ kiểm tra để việc xóa được xanh.

## Những file tên cũ nhưng chưa được xóa

| File/cụm                                                   | Phụ thuộc còn hiệu lực                                                    | Đề xuất khi thực sự dọn                                                                               |
| ---------------------------------------------------------- | ------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| src/screens/hy/resource-store.ts                           | identity-access/session.ts vẫn import để quản lý phạm vi cache theo phiên | Chuyển helper cache sang lib/ trước, cập nhật import và kiểm tra đăng xuất/đổi phiên                  |
| src/screens/v0/v0-types.ts                                 | HomeScreen, route khong-gian và CoupleWorkspace dùng V0Screen             | Tách kiểu điều hướng hiện hành ra khỏi v0 rồi mới nghỉ module cũ                                      |
| src/screens/billing-sections.tsx                           | workspace-common.tsx còn dùng message(error)                              | Tách xử lý lỗi dùng chung ra khỏi UI billing cũ                                                       |
| src/screens/billing.styles.ts                              | billing-sections.tsx đang import                                          | Chỉ bỏ sau khi tách helper lỗi và nghỉ các UI cũ                                                      |
| src/screens/home.styles.ts                                 | identity-screen.tsx và native-account-settings.tsx dùng trực tiếp         | Giữ style đang dùng; có thể tách theo màn hình và bỏ khai báo không còn consumer sau                  |
| src/components/v0-icons*.tsx                               | Nhiều màn hình mới đang dùng icon                                         | Giữ icon; tên v0 có thể đổi trong một bước refactor riêng                                             |
| src/features/payments-billing/retired-guest-types.ts       | billing-api.ts còn import cả kiểu lẫn hàm chặn thao tác đã nghỉ           | Không xóa riêng lẻ; tuyệt đối không mở lại API khách cũ để giải quyết compile                         |
| src/features/booking-lifecycle/planning-api.ts             | Còn liên kết kiểu qua v0-types và các test API                            | Giữ đến khi tách kiểu và xác định phần API cần bảo tồn                                                |
| src/lib/api/generated/schema.d.ts                          | Hợp đồng kiểu dữ liệu và api:check                                        | Giữ, không sửa tay hoặc xóa vì file lớn                                                               |
| src/screens/couple-overview.test.tsx                       | Có test NativeAccountSettings đang dùng, cùng với UI CoupleOverview cũ    | Tách test tài khoản sang import trực tiếp trước khi nghỉ wrapper cũ                                   |
| src/screens/v0/v0.test.tsx và src/screens/billing.test.tsx | Kiểm chứng nhiều hành vi nghiệp vụ của implementation cũ                  | Đối chiếu và chuyển các kiểm chứng còn cần sang workspace trước khi loại bỏ test riêng của UI đã nghỉ |

## Asset, cấu hình và tài liệu cần giữ

Cả 11 file trong assets/ đều có lý do giữ: 5 font được root layout nạp, 2 giấy phép OFL, ảnh hero và logo được màn hình hiện hành dùng, icon và foreground được app.config.ts tham chiếu.

Giữ src/app/, screens/workspace/, identity-screen.tsx, native-account-settings.tsx, features/couple-workspace/, session/auth, API client, chính sách thanh toán và các UI/helper dùng chung theo danh sách runtime phía dưới. File mới chưa được Git theo dõi không phải file rác.

Giữ package.json/package-lock.json, app.config.ts, eas.json, api-contract.lock.json, scripts kiểm tra/sinh API, scripts audit, cấu hình TS/Jest/ESLint/Prettier, .github/ và hướng dẫn đóng góp. .env là override tùy chọn trên máy dev; .env.example là hướng dẫn cấu hình, không nên xóa chỉ vì app có giá trị mặc định.

google-services.json chưa được app.config.ts nối vào runtime hiện tại, nhưng tài liệu FCM đã ghi rõ đây là cấu hình chuẩn bị cho native push. Cần giữ để quyết định tích hợp sau, không xem là rác theo số import.

.agents/ và .claude/ mỗi bên có 43 file, đối chiếu SHA-256 cho thấy cả hai cây hiện giống nhau. Đây là cấu hình/skill cho công cụ làm việc, không phải UI runtime. Có thể chuẩn hóa một nguồn chung nếu thống nhất hỗ trợ công cụ nào; chưa xóa vì có thể làm mất cách công cụ tương ứng tìm skill.

Giữ tài liệu đặc tả, báo cáo kiểm chứng và ảnh được tài liệu dẫn chiếu. Có thể thêm mục lục phân biệt tài liệu hiện hành với tài liệu lịch sử; chưa nên xóa báo cáo lịch sử như file build tạm.

## Thứ tự dọn đề xuất

1. Lập danh sách bằng chứng cần giữ trong test-results; dọn output tái tạo được khi đã dừng các tiến trình liên quan.
2. Tách resource-store, kiểu điều hướng và helper lỗi khỏi thư mục UI cũ, đồng thời giữ import trực tiếp đến màn hình tài khoản đang dùng.
3. Nghỉ từng cụm UI v0/v2/hy, wrapper overview/billing/agreement và consumer tương ứng. Chuyển các kiểm chứng còn giá trị sang luồng workspace; giữ test và test double đang dùng.
4. Quyết định riêng bốn file public chưa nối route; sau đó mới đánh giá catalog-api, QR/save helper và các adapter cho UI đã nghỉ.
5. Dọn tên thư mục/icon, style dư và cập nhật tài liệu để cấu trúc phản ánh một luồng hiện hành.

Sau mỗi cụm xóa: chạy kiểm tra kiểu, lint, định dạng, test, API pin và Android export; kiểm tra các route/deep link, đăng nhập/khôi phục phiên, thanh toán và các màn hình vừa đổi trong runtime phù hợp. Không giảm ngưỡng coverage, bỏ assertion hoặc bật lại API đã nghỉ.

## Trạng thái thực hiện

Chỉ đọc source/cấu hình và thêm báo cáo này; manifest kiểm tra nằm trong thư mục audit bị ignore. Không đổi source, test hoặc dependency; không xóa file; không truy cập DB, commit, push hay deploy. Không chạy lại test/build vì lần này chưa sửa mã.

Danh sách dưới đây là kết quả ở thời điểm audit. Các đường dẫn được tính từ gốc wedding-app.

## Danh sách 76 file thuộc đồ thị runtime

- `src/app/(couple)/invitation.tsx`
- `src/app/billing.tsx`
- `src/app/dang-nhap.tsx`
- `src/app/index.tsx`
- `src/app/khong-gian/index.tsx`
- `src/app/khong-gian/[...path].tsx`
- `src/app/quen-mat-khau.tsx`
- `src/app/reset.tsx`
- `src/app/_layout.tsx`
- `src/components/hy-confirm-host.tsx`
- `src/components/hy-confirm-modal.tsx`
- `src/components/hy-ui.tsx`
- `src/components/otp-resend-countdown.tsx`
- `src/components/v0-icons-core.tsx`
- `src/components/v0-icons-extra.tsx`
- `src/components/v0-icons.tsx`
- `src/features/booking-lifecycle/proposal-api.ts`
- `src/features/couple-workspace/commercial-policies.ts`
- `src/features/couple-workspace/contract-files.ts`
- `src/features/couple-workspace/links.ts`
- `src/features/couple-workspace/notification-policies.ts`
- `src/features/couple-workspace/policies.ts`
- `src/features/couple-workspace/realtime.ts`
- `src/features/couple-workspace/workspace-api.ts`
- `src/features/identity-access/device-session.ts`
- `src/features/identity-access/experience-api.ts`
- `src/features/identity-access/password-otp-api.ts`
- `src/features/identity-access/session.ts`
- `src/features/invitation-studio/app-invitation-api.ts`
- `src/features/notifications/notification-api.ts`
- `src/features/payments-billing/billing-api.ts`
- `src/features/payments-billing/billing-intents.ts`
- `src/features/payments-billing/retired-guest-types.ts`
- `src/features/restored-flows/restored-flows-api.ts`
- `src/features/restored-flows/restored-flows-commercial.ts`
- `src/lib/alert.ts`
- `src/lib/api/api-request.ts`
- `src/lib/api/client.ts`
- `src/lib/api/error-messages.vi.ts`
- `src/lib/api/request-metrics.ts`
- `src/lib/confirm/index.ts`
- `src/lib/confirm/store.ts`
- `src/lib/env.ts`
- `src/lib/formatters.ts`
- `src/lib/idempotency.ts`
- `src/lib/safe-area.ts`
- `src/lib/toast/feedback.ts`
- `src/lib/toast/store.ts`
- `src/lib/toast/toast-host.tsx`
- `src/safe-area.css`
- `src/screens/billing-sections.tsx`
- `src/screens/billing.styles.ts`
- `src/screens/home.styles.ts`
- `src/screens/home.tsx`
- `src/screens/hy/resource-store.ts`
- `src/screens/identity-screen.tsx`
- `src/screens/native-account-settings.tsx`
- `src/screens/workspace/commercial-editor.tsx`
- `src/screens/workspace/couple-workspace.tsx`
- `src/screens/workspace/payment-qr.tsx`
- `src/screens/workspace/prepare-section-picker.tsx`
- `src/screens/workspace/prepare-section-picker.web.tsx`
- `src/screens/workspace/workspace-agreement.tsx`
- `src/screens/workspace/workspace-appendices.tsx`
- `src/screens/workspace/workspace-common.tsx`
- `src/screens/workspace/workspace-groups.tsx`
- `src/screens/workspace/workspace-invitations.tsx`
- `src/screens/workspace/workspace-navigation.tsx`
- `src/screens/workspace/workspace-notifications.tsx`
- `src/screens/workspace/workspace-overview.tsx`
- `src/screens/workspace/workspace-payment.tsx`
- `src/screens/workspace/workspace-prepare.tsx`
- `src/screens/workspace/workspace-seating.tsx`
- `src/screens/workspace/workspace-settlement.tsx`
- `src/screens/workspace/workspace-timeline.tsx`
- `src/theme/index.ts`

## Danh sách 3 file kiểu dữ liệu cần giữ

- `src/features/booking-lifecycle/planning-api.ts`
- `src/lib/api/generated/schema.d.ts`
- `src/screens/v0/v0-types.ts`

## Danh sách 59 file ngoài runtime cần đánh giá nghỉ hoặc giữ riêng

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

## Hai file hỗ trợ test workspace cần giữ

- `src/screens/workspace/workspace-sheet-test-support.tsx`
- `src/screens/workspace/workspace-test-support.ts`

## Danh sách 33 file test — chưa xóa

- `src/features/booking-lifecycle/planning-api.test.ts`
- `src/features/couple-workspace/commercial-policies.test.ts`
- `src/features/couple-workspace/contract-files.test.ts`
- `src/features/couple-workspace/links.test.ts`
- `src/features/couple-workspace/policies.test.ts`
- `src/features/couple-workspace/realtime.test.ts`
- `src/features/couple-workspace/settlement-status.test.ts`
- `src/features/couple-workspace/workspace-api.test.ts`
- `src/features/identity-access/session.test.ts`
- `src/features/invitation-studio/app-invitation-api.test.ts`
- `src/features/payments-billing/billing-api.test.ts`
- `src/features/payments-billing/billing-intents.test.ts`
- `src/lib/api/api-client.test.ts`
- `src/lib/confirm/confirm-modal.test.tsx`
- `src/lib/env.test.ts`
- `src/lib/toast/toast-host.test.tsx`
- `src/screens/billing.test.tsx`
- `src/screens/couple-overview.test.tsx`
- `src/screens/home.test.tsx`
- `src/screens/v0/v0.test.tsx`
- `src/screens/workspace/commercial-editor.test.tsx`
- `src/screens/workspace/couple-workspace.test.tsx`
- `src/screens/workspace/payment-qr.test.tsx`
- `src/screens/workspace/workspace-agreement.test.tsx`
- `src/screens/workspace/workspace-appendices.test.tsx`
- `src/screens/workspace/workspace-common.test.tsx`
- `src/screens/workspace/workspace-navigation.test.tsx`
- `src/screens/workspace/workspace-notifications.test.tsx`
- `src/screens/workspace/workspace-overview.test.tsx`
- `src/screens/workspace/workspace-payment.test.tsx`
- `src/screens/workspace/workspace-preparation.test.tsx`
- `src/screens/workspace/workspace-settlement.test.tsx`
- `src/screens/workspace/workspace-timeline.test.tsx`
