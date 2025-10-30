# Giai đoạn build
FROM node:20-alpine AS builder

WORKDIR /app

# Cài đặt dependencies
COPY package.json package-lock.json ./
RUN npm ci --legacy-peer-deps

# Copy mã nguồn
COPY . .

# Build ứng dụng Next.js
RUN npm run build

# Giai đoạn production
FROM node:20-alpine AS runner
WORKDIR /app

# Cài serve (phòng trường hợp dùng next export, nhưng production Next.js thì không bắt buộc)
RUN npm install -g serve

# Copy code đã build từ builder sang
COPY --from=builder /app ./

# Khai báo cổng mà Next.js sẽ chạy
EXPOSE 3000

# Chạy app Next.js ở production mode
CMD ["npm", "start"]
