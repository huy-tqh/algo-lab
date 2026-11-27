# Quy tắc dự án (AGENTS.md)

Tài liệu này ghi lại các quy tắc bắt buộc cho repository `algo-lab` để tránh lặp lại các lỗi đã khắc phục.

## 1. Phạm vi làm việc và Shell
- Chỉ làm việc bên trong thư mục `algo-lab`, tuyệt đối không đọc/ghi/truy cập file hoặc thư mục bên ngoài.
- Mọi lệnh trên máy phải chạy thông qua `bash -c "<cmd>"`, không chạy trực tiếp lệnh `cmd` hoặc `powershell`.

## 2. Văn bản, Font chữ và LaTeX
- **Dùng hyphen (`-`), cấm tuyệt đối emdash (`U+2014`)** trong toàn bộ mã nguồn, giao diện và tài liệu.
- **Không dùng font mặc định kiểu AI** (`Be Vietnam Pro`, `JetBrains Mono`). Dùng font gọn, phổ thông (`Roboto`, `Roboto Mono`, `Consolas`).
- **Xuống dòng rõ ràng, không viết đoạn văn dài**:
  - Mọi giải thích nhiều ý, hướng dẫn viết tay, dấu hiệu nhận diện và định nghĩa hàm trong `.trace-io-strip` phải tách thành danh sách `<ul>`/`<ol>` hoặc từng dòng/chip riêng biệt (`.trace-meta-list`, `.legend-chip`), không gộp nhiều ý bằng dấu phẩy hoặc `-` trên cùng một dòng.
  - Không bao giờ đưa HTML tag thô (`<code>`, `<strong>`) vào chuỗi truyền cho `renderInlineMathText()` (vì hàm này escape HTML); luôn dùng dấu backtick để render mã inline.
- **Đồng nhất font và cỡ chữ trong công thức toán**:
  - Đã là công thức toán học thì render toàn bộ bằng LaTeX/KaTeX (kể cả phần `\text{...}` và dòng `Giá trị hiện tại: ...`), không ép `font-family: var(--font-sans)` vào bên trong `.katex .text` và không chèn chữ font thường lẫn vào giữa công thức.
  - Phải dùng chung một tỷ lệ `sharedRatio` cho tất cả `.formula-math` trên cả Desktop và Mobile để không công thức nào bị co lệch cỡ chữ hoặc tràn khung.

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

## 5. Kiểm tra Render bắt buộc & Cấu hình Git cục bộ
- Trước khi `git commit` hoặc `git push`, bắt buộc phải chạy cả kiểm thử logic (`node tests/verify_all.js`) và kiểm tra render trên Chrome thực tế (`node tests/render_check.js`) cho cả Desktop (`1440x900`) và Mobile (`390x844`) để chắc chắn không có lỗi hiển thị, tràn ngang, thẻ HTML bị escape hay vỡ lưu đồ SVG.
- Sử dụng danh tính cục bộ cho repo này:
  - `user.name`: `huy-tqh`
  - `user.email`: `tranquanghuy3008@outlook.com`
