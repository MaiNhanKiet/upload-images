## Hệ thống Upload Ảnh – Hướng dẫn triển khai và vận hành

### 1) Công nghệ chính
- Next.js 16 (App Router)
- React 19, TypeScript
- Redis (lưu metadata ảnh và user)
- Tailwind CSS + các component UI (shadcn)
- Sharp (tùy chọn) để resize ảnh phía server

### 2) Yêu cầu môi trường
- Node.js >= 18
- Redis server đang chạy và cho phép kết nối từ ứng dụng
- Biến môi trường tùy chọn:
  - `JWT_SECRET` – nếu không đặt, giá trị mặc định là `your-secret-key`

Redis connection được cấu hình tại `src/lib/redis.ts` (sử dụng URL/password cố định). Điều chỉnh file này nếu môi trường của bạn khác.

### 3) Cài đặt và chạy
```bash
cd web
npm i
# (Khuyến nghị) cài sharp để dùng tính năng resize ảnh
npm i sharp

npm run dev
# Truy cập: http://localhost:3000
```

Tài khoản admin mặc định sẽ được seed tự động khi kết nối Redis thành công:
- Email: `mana@gmail.com`
- Mật khẩu: `123456`

### 4) Phân quyền và chức năng
- User:
  - Đăng ký/Đăng nhập (JWT lưu LocalStorage trên client)
  - Upload ảnh: chỉ 1 file/lần, định dạng cho phép: PNG, JPG/JPEG, SVG
  - Xem danh sách ảnh đã upload của chính mình, tìm theo tên, lọc theo ngày, phân trang, Share link, Xóa
- Admin:
  - Quản lý người dùng: Thêm/Sửa/Xóa (hiện popup xác nhận xóa, cập nhật trực tiếp vào Redis)
  - Quản lý ảnh (toàn hệ thống): xem, lọc, sửa metadata, chuyển ảnh giữa users, xóa, resize ảnh
  - Upload nhiều ảnh/lần (multi-upload) – review dạng danh sách: Tên ảnh + URL + nút Copy

Lưu ý: Hệ thống đã loại bỏ “gói dung lượng/quota quản trị”; chỉ còn giới hạn dung lượng theo người dùng (mặc định 1GB) phục vụ kiểm tra tại API upload.

### 5) Lưu trữ dữ liệu trên Redis
- Danh sách người dùng: LIST `user_list`
  - Mỗi phần tử là JSON đầy đủ của user: `{ id, email, password, role, createdAt, storageMb? }`
- Danh sách ảnh theo user: LIST `images:{email}`
  - Mỗi phần tử là metadata ảnh: `{ id, userId, originalName, fileName, url, size, type, uploadedAt }`
- Các key legacy cũ (`user:${email}`, `user:id:${id}`, `userlist`, `images` object cũ, `user_images:*`, `images:*:*`) đã được dọn tự động sau khi kết nối Redis.

### 6) API chính
Tất cả endpoint trả JSON. Yêu cầu header `Authorization: Bearer <token>` trừ các endpoint auth.

- Auth
  - `POST /api/auth/register` – đăng ký user, push user đầy đủ vào `user_list`
  - `POST /api/auth/login` – đăng nhập, trả về `token` và thông tin user rút gọn

- Upload & Ảnh của user
  - `POST /api/upload`
    - User: chỉ 1 ảnh; Admin: nhiều ảnh (`files`)
    - Định dạng: png, jpg/jpeg, svg
    - Kiểm tra dung lượng đã dùng từ `images:{email}` so với `storageMb` (mặc định 1024MB)
  - `GET /api/images?page=&limit=` – trả danh sách theo phân trang từ `images:{email}`
  - `DELETE /api/images?id=` – xóa 1 ảnh của chính user, đồng thời xóa file trong `public/`

- Admin Users
  - `GET /api/admin/users` – đọc toàn bộ `user_list` (ẩn password khi render UI)
  - `POST /api/admin/users` – tạo user mới, lPush vào `user_list`
  - `PUT /api/admin/users/[id]?email=<email_cũ>` – cập nhật user trong `user_list` (tìm theo id, hoặc theo `email` cũ nếu có; chặn trùng email)
  - `DELETE /api/admin/users/[id]?email=<email>` – xóa user khỏi `user_list` và toàn bộ ảnh `images:{email}`

- Admin Images
  - `GET /api/admin/images?page=&limit=` – duyệt tất cả `images:*` và tổng hợp trả về
  - `PUT /api/admin/images/[id]` – chỉnh sửa metadata/chuyển owner (lookup email đích từ `user_list`)
  - `DELETE /api/admin/images/[id]` – xóa ảnh (metadata + file)
  - `POST /api/admin/images/[id]/resize` – resize bằng Sharp (jpg/png), không áp dụng cho SVG

### 7) UI – các trang chính
- `/login`, `/register` – xác thực
- `/upload` – form upload; admin hỗ trợ chọn nhiều file; review theo yêu cầu
- `/dashboard/images` – lưới 2x5, lọc ngày, tìm tên, phân trang, share, xóa; thanh công cụ trên 1 hàng và có cuộn
- `/admin/users` – bảng người dùng; thêm/sửa/xóa, popup xác nhận xóa
- `/admin/images` – quản lý ảnh toàn hệ thống; xem/share/resize/chỉnh sửa/xóa; tooltip khi hover

### 8) Lưu file ảnh
Ảnh lưu tại `public/uploads/<uuid>.<ext>`. URL trả về dạng `/uploads/<uuid>.<ext>`; nút Share sẽ copy `window.location.origin + url`.

### 9) Ghi chú triển khai
- Production: bật biến môi trường `JWT_SECRET` mạnh
- Phân quyền: mọi endpoint admin kiểm tra `decoded.role === 'admin'`
- Resize cần `sharp`; nếu không cài, endpoint resize sẽ lỗi import
- Kiến trúc Redis theo List giúp quản lý/truy xuất nhanh (LLEN/LRANGE); các thao tác cập nhật ghi lại toàn bộ list để đảm bảo tính nhất quán

### 10) Lệnh nhanh
```bash
# Phát triển
npm run dev

# Build & start
npm run build
npm start
```

### 11) Hỗ trợ
Nếu gặp lỗi về Redis key cũ, hãy kiểm tra log “Redis cleanup done” khi app khởi chạy; hoặc dọn thủ công các key legacy đã nêu ở mục 5.
