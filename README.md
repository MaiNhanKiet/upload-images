# Image Upload Service

Hệ thống upload ảnh self-hosted: nhận ảnh từ client, lưu file vào `storage/uploads-images/`, lưu metadata lên Redis, và phục vụ ảnh qua API `GET /api/uploads-images/[filename]`.

## 🧭 1. Giới thiệu (Overview)

Mục tiêu: cho phép upload, lưu trữ, trả về URL công khai và quản lý metadata ảnh. Dự án dùng Next.js (App Router), Node.js, và Redis cho metadata — phù hợp để tích hợp vào nền tảng khác hoặc chạy độc lập.

## ⚙️ 2. Kiến trúc tổng quan (Architecture)

Luồng xử lý:

1. Client gửi `multipart/form-data` tới `POST /api/upload`.
2. Server validate file (MIME + size) → sinh tên duy nhất → lưu file vào `storage/uploads-images/`.
3. Lưu metadata vào Redis (ví dụ `images:{email}`).
4. Trả về JSON chứa `url` (ví dụ `/api/uploads-images/<filename>`) và metadata.

Mermaid:

```
graph TD
  A[Client] -->|POST /api/upload| B[Next.js API]
  B --> C[Storage (storage/uploads-images)]
  B --> R[Redis (metadata)]
  C --> D[Return URL to Client]
```

## 🧩 3. Tính năng chính (Features)

- [x] Upload ảnh (multipart/form-data)
- [x] Phục vụ ảnh qua API `GET /api/uploads-images/[filename]`
- [x] Lưu file vào `storage/uploads-images/` (không lưu trực tiếp vào `public`)
- [x] Lưu metadata vào Redis (`images:{email}`)
- [x] Kiểm tra định dạng hợp lệ (.jpg/.jpeg, .png, .webp, .svg)
- [x] Giới hạn dung lượng upload (configurable)
      **ADMIN:**
- [x] Xoá file & metadata qua API
- [x] Resize / thumbnails (endpoint có sẵn nếu `sharp` được cài)
- [x] Upload nhiều file cùng lúc

## 🚀 4. Cài đặt và chạy (Setup & Run)

Yêu cầu nhanh:

- Node.js >= 18
- Redis server (chạy local hoặc remote)

1. Clone & cài dependencies:

```bash
git clone https://github.com/MaiNhanKiet/upload-images.git
cd upload-images/web
npm install
```

2. Tạo file `.env` (hoặc copy từ `.env.example` nếu có) với biến tối thiểu:

```
PORT=3000
UPLOAD_PATH=./storage/uploads-images
MAX_FILE_SIZE=5242880        # 5MB
REDIS_URL=redis://localhost:6379
JWT_SECRET=your-strong-secret
```

3. Dev / Build / Start:

```bash
# Dev
npm run dev

# Build + Start (production)
npm run build
npm run start
```

Mặc định ứng dụng chạy tại http://localhost:3000

> Quick dev credentials (seed):

- Email: `mana@gmail.com`
- Password: `123456`

## 🔌 5. API Endpoints (tổng quan)

All API trả JSON (trừ route phục vụ file). Một số route chính:

- POST /api/auth/register — Đăng ký
- POST /api/auth/login — Đăng nhập (trả JWT)
- POST /api/upload — Upload file (multipart/form-data)
  - Field: `file` (1 file) — trả về: `{ url, name, size, type }` (url thường là `/api/uploads-images/<filename>`)
- GET /api/images?page=&limit= — Lấy danh sách ảnh của user (metadata từ Redis)
- DELETE /api/images?id= — Xoá ảnh (metadata + file storage)
- GET /api/uploads-images/[filename] — Phục vụ file ảnh từ `storage/uploads-images/`

Admin routes (cần auth & role):

- GET/POST/PUT/DELETE /api/admin/users
- GET/PUT/DELETE /api/admin/images
- POST /api/admin/images/[id]/resize — Resize (dùng `sharp` nếu cài sẵn)

Ví dụ curl (upload):

```bash
curl -F "file=@/path/to/image.jpg" http://localhost:3000/api/upload
```

## 🧱 6. Cấu trúc thư mục (folder structure)

Tập trung những file quan trọng:

```
web/
├─ public/                   # static (UI assets)
├─ storage/
│  └─ uploads-images/        # nơi lưu file nhị phân (production-persistent)
├─ src/
│  ├─ app/
│  │  ├─ api/
│  │  │  ├─ upload/route.ts           # POST /api/upload
│  │  │  ├─ uploads-images/[filename]/route.ts  # GET /api/uploads-images/:filename
│  │  │  └─ auth/, admin/, images/    # các route khác
│  └─ lib/
│     ├─ redis.ts                    # cấu hình Redis
│     ├─ images.ts                   # helper xử lý file
│     └─ auth.ts
├─ package.json
└─ README.md
```

## 🔐 7. Bảo mật & Lưu ý (Security)

- Không cho phép upload file thực thi (.exe, .php, .js). Validate extension + MIME type.
- Giới hạn kích thước upload (`MAX_FILE_SIZE`).
- Sanitize & generate tên file duy nhất (timestamp + uuid).
- Không dùng filesystem local cho storage nếu deploy serverless — hãy dùng S3/Cloudinary.
- Bảo vệ các route quản trị bằng JWT + role checks.
- Dọn dẹp storage (cron) để xóa file cũ/unused.
