# Quy tắc dự án (AGENTS.md)

Tài liệu này ghi lại các quy tắc bắt buộc cho repository `algo-lab` để tránh lặp lại các lỗi đã khắc phục.

## 1. Phạm vi làm việc và Shell
- Chỉ làm việc bên trong thư mục `algo-lab`, tuyệt đối không đọc/ghi/truy cập file hoặc thư mục bên ngoài.
- Mọi lệnh trên máy phải chạy thông qua `bash -c "<cmd>"`, không chạy trực tiếp lệnh `cmd` hoặc `powershell`.

## 2. Văn bản, Font chữ và LaTeX
- **Dùng hyphen (`-`), cấm tuyệt đối emdash (`U+2014`)** trong toàn bộ mã nguồn, giao diện và tài liệu.
- **Không dùng font mặc định kiểu AI** (`Be Vietnam Pro`, `JetBrains Mono`). Dùng font phổ thông tự nhiên (`Inter`, system sans-serif, `Source Code Pro`, `Consolas`).
- **Đồng nhất font và cỡ chữ trong công thức toán**:
  - Đã là công thức toán học thì render toàn bộ bằng LaTeX/KaTeX (kể cả phần `\text{...}` và dòng `Giá trị hiện tại: ...`), không ép `font-family: var(--font-sans)` vào bên trong `.katex .text` và không chèn chữ font thường lẫn vào giữa công thức.
  - Không thu nhỏ từng thẻ `.formula-math` riêng lẻ gây lệch cỡ chữ giữa các công thức; nếu co giãn trên mobile phải dùng chung một tỷ lệ đồng nhất.

## 3. Giao diện, Màu sắc và Tương tác
- **Tab bar**: Tại một thời điểm chỉ được có duy nhất 1 tab đang chọn (`active`), không để nhiều tab sáng cùng lúc.
- **Lưu đồ SVG (`<foreignObject>`)**:
  - Phải khai báo `xmlns="http://www.w3.org/1999/xhtml"` cho thẻ `<div>` bên trong `<foreignObject>`.
  - Không dùng `flex-direction: column` trực tiếp trên container chứa text lẫn inline KaTeX (bọc trong `.flow-fo-inner`).
  - Không gắn `filter` lên `<g class="flow-node">` bọc `<foreignObject>` (chỉ gắn lên `rect, polygon`) để tránh lỗi che chữ.
- **Bước mô phỏng (`#template-tracker`)**: Khi người dùng chưa bấm tương tác (`hasInteracted === false`), không được bôi màu sẵn các bước.
- **Bảng màu 4 bước và mô phỏng**: Không dùng xanh lá kèm với xanh dương. Dùng **Vàng/Hổ phách** cho trạng thái đang chạy/đang xét, **Xanh dương** cho trạng thái đã xong, và **Xám** cho trạng thái chưa đến.

## 4. Thiết kế Sư phạm & Bảng State Trace
- **Giải thuật chung vs Ví dụ**:
  - Chế độ `Giải thuật chung` phải có đầy đủ công thức, lưu đồ, mã giả và khung bảng trace tổng quát áp dụng cho mọi bài cùng dạng.
  - Các `Ví dụ 1, 2, 3` chỉ ánh xạ và thay số/nhãn cụ thể vào đúng khung tổng quát đó.
- **Bảng State Trace viết tay**:
  - Phải định nghĩa tường minh hàm điều kiện dừng và hàm kiểm tra (như `IsSafe`, `IsGoal`, `IsNull`, `IsEmpty`, `CanVisit`) ngay phía trên bảng.
  - Mọi input của hàm phải được thể hiện thành các cột riêng trên cùng một dòng để học viên chỉ cần điền tuyến tính từ trái sang phải là tự động ra kết quả, không cần suy nghĩ hay đoán ngầm.
  - Nội dung trong từng ô phải ngắn gọn tối đa, chỉ dùng số và ký hiệu viết tay (`Đ`/`S`, `1`/`0(i)`/`Gỡ`, `L`/`R`/`Ret`, `Pop`/`Deq`), tuyệt đối tránh lặp lại chữ dài dòng.

## 5. Cấu hình Git cục bộ
- Sử dụng danh tính cục bộ cho repo này:
  - `user.name`: `huy-tqh`
  - `user.email`: `tranquanghuy3008@outlook.com`
