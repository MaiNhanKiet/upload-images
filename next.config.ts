import type { NextConfig } from "next";

// Hỗ trợ chạy dưới subpath (ví dụ: https://domain.com/uploader)
// Set biến môi trường: NEXT_PUBLIC_BASE_PATH=/uploader hoặc BASE_PATH=/uploader
const rawBase = (process.env.NEXT_PUBLIC_BASE_PATH || process.env.BASE_PATH || "").trim();
const cleaned = rawBase.replace(/^\/+|\/+$/g, "");
const basePath = cleaned ? `/${cleaned}` : undefined;

const nextConfig: NextConfig = {
  basePath,
  // Tránh redirect thừa khi có/không có dấu '/'
  skipTrailingSlashRedirect: true,
  // Đảm bảo tracing tốt khi đóng gói docker
  outputFileTracing: true,
};

export default nextConfig;
