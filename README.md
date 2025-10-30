## Hệ thống Upload Ảnh

Phiên bản này đã thay đổi cách lưu ảnh: file nhị phân được lưu ngoài thư mục `public` (để giữ an toàn và khả năng kiểm soát), dưới `storage/uploads-images`. Ảnh được phục vụ qua API: `/api/uploads-images/[filename]`.

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

Redis connection được cấu hình tại `src/lib/redis.ts`. Điều chỉnh file này nếu môi trường của bạn khác.

### 3) Cài đặt và chạy

```bash
cd web
npm install
# (Tùy chọn) cài sharp để dùng tính năng resize ảnh
npm install sharp

npm run dev
# Truy cập: http://localhost:3000
```

Tài khoản admin mặc định (seed khi lần đầu kết nối Redis):

- Email: `mana@gmail.com`
- Mật khẩu: `123456`

### 4) Thiết kế lưu trữ ảnh (quan trọng)

- File nhị phân ảnh được lưu tại: `storage/uploads-images/<uuid>.<ext>` (không còn lưu trực tiếp trong `public`).
- Ảnh được truy cập công khai thông qua API: `GET /api/uploads-images/<filename>` (route đã được thêm). Route này trả nội dung ảnh với header Content-Type, Content-Length và Cache-Control phù hợp.
- Metadata ảnh vẫn lưu trong Redis (LIST `images:{email}`), trường `url` trong metadata có thể là:
  - `/api/uploads-images/<filename>` (mới, khuyến nghị)
  - legacy `/uploads/<filename>` hoặc `/uploads-images/<filename>` (vẫn được hỗ trợ bởi resolver nội bộ để xóa/resize)

Lý do: lưu ngoài `public` cho phép kiểm soát auth/transform trước khi trả file (giống Cloudinary self-hosted).

### 5) API chính

Tất cả endpoint trả JSON. Yêu cầu header `Authorization: Bearer <token>` trừ các endpoint auth.

- Auth

  - `POST /api/auth/register` – đăng ký user
  - `POST /api/auth/login` – đăng nhập, trả token

- Upload & Ảnh của user

  - `POST /api/upload` – upload file(s)
    - User thường upload 1 file; Admin có thể upload nhiều file.
    - Định dạng: png, jpg/jpeg, svg
    - Sau upload, server lưu file vào `storage/uploads-images` và trả `url` dưới dạng `/api/uploads-images/<filename>`.
  - `GET /api/images?page=&limit=` – danh sách ảnh của user (từ Redis key `images:{email}`)
  - `DELETE /api/images?id=` – xóa 1 ảnh của chính user (metadata + file trên storage)

- Image serving (mới)

  - `GET /api/uploads-images/[filename]` – trả file ảnh từ `storage/uploads-images` (Content-Type, Cache-Control set sẵn).

- Admin Users

  - `GET /api/admin/users`, `POST /api/admin/users`, `PUT /api/admin/users/[id]`, `DELETE /api/admin/users/[id]` — tương tự như trước, nhưng xóa user giờ sẽ xóa ảnh từ `storage/uploads-images`.

- Admin Images
  - `GET /api/admin/images` – duyệt tất cả `images:*`
  - `PUT /api/admin/images/[id]` – chỉnh metadata / chuyển owner
  - `DELETE /api/admin/images/[id]` – xóa metadata + file (từ storage)
  - `POST /api/admin/images/[id]/resize` – resize ảnh (sử dụng sharp), hoạt động trên file trong `storage` (không còn phụ thuộc vào `public`)

### 6) Dữ liệu trên Redis

- `user_list`: LIST các user (mỗi phần tử JSON `{ id, email, password, role, createdAt, storageMb? }`).
- `images:{email}`: LIST metadata ảnh: `{ id, userId, originalName, fileName, url, size, type, uploadedAt }`.
- Lưu ý: metadata cũ có thể chứa URL dạng `/uploads/...`; dự án có helper `resolveImageFilePathFromUrl` để hỗ trợ ánh xạ các dạng URL legacy sang `storage` nên không bắt buộc phải cập nhật metadata ngay.

### 7) Kiểm tra & lint

- TypeScript: `npx tsc --noEmit`
- ESLint: `npm run lint`
- Chạy dev: `npm run dev`

Nếu muốn chuẩn hoá metadata (chuyển tất cả `url` sang `/api/uploads-images/<filename>`), tôi có thể cung cấp script update Redis an toàn — báo tôi nếu muốn thực hiện.

### 8) Lưu ý vận hành

- Bật `JWT_SECRET` mạnh trong production.
- `sharp` là optional dependency; nếu không cài, các route resize sẽ lỗi.
- Việc chuyển file ra khỏi `public` giúp kiểm soát truy cập và áp dụng caching/transform khi phát hành.

### 9) Lệnh nhanh

```bash
# Phát triển
npm run dev

# Lint/typecheck
npm run lint
npx tsc --noEmit

# Build & start
npm run build
npm start
```

### 10) Hỗ trợ

Nếu gặp lỗi liên quan Redis keys cũ, xem log khi khởi động (có dòng "Redis cleanup" nếu ứng dụng dọn legacy keys). Nếu cần, tôi có thể:

- Viết script chuẩn hoá metadata trong Redis (chuyển URL → `/api/uploads-images/...`).
- Thêm route redirect legacy `/uploads/<file>` → `/api/uploads-images/<file>` nếu bạn muốn giữ các đường link public cũ.
