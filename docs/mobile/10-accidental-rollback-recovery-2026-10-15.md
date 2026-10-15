# Khôi phục phần sửa mobile bị hoàn tác — 15/10/2026

Khôi phục bằng triển khai lại dựa trên API pin d257be8507dd83e9da73ac69605646a8fbcc7209 và tài liệu mobile 01–09. Không có bản snapshot đầy đủ để phục hồi nguyên byte.

- Nối lại catalog, notifications, sessions; truy cập tài khoản khi chưa có booking.
- Khôi phục caller và UI timeline, yêu cầu đổi/hủy, duyệt/rút duyệt theo capabilities.
- Khôi phục draft/submission/approval hợp đồng/phụ lục; giữ nguồn dòng thương mại thực, booking revision và đúng bản hiệu lực; chặn phụ lục khi đã phát hành hóa đơn. Không tạo giá/UUID nguồn giả.
- Nối cập nhật hồ sơ pháp lý cô dâu/chú rể, health, cài đặt/tổng kết điểm danh, chi tiết hóa đơn và thao tác đơn in.
- Lưu/chia sẻ PDF thực trên native và tải file trên web; đồng bộ expo-file-system/expo-sharing.
- Khôi phục Web portal cấu hình, không suy đoán URL; không vượt giới hạn đặt cọc Android.
- Giữ key/payload pending bằng kho intent; sửa serialize để giữ đủ nội dung mảng/dòng khi băm payload.

Không chạy test tự động hoặc test UI theo yêu cầu. Không commit/push. Typecheck là kiểm tra tĩnh, không chứng minh runtime hay native. Các kết quả trong báo cáo test trước chỉ áp dụng bản đã test trước đó.

Bản các file trước lần khôi phục này được giữ ngoài source tại C:/Users/Admin/AppData/Local/Temp/wedding-app-before-recovery-2026-10-15/.
