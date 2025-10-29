import type { NextConfig } from "next";

// Hỗ trợ chạy dưới subpath (ví dụ: https://domain.com/uploader)
// Set biến môi trường: NEXT_PUBLIC_BASE_PATH=/uploader hoặc BASE_PATH=/uploader
const rawBase = (process.env.NEXT_PUBLIC_BASE_PATH || process.env.BASE_PATH || "").trim();
const cleaned = rawBase.replace(/^\/+|\/+$/g, "");
const basePath = cleaned ? `/${cleaned}` : undefined;

const nextConfig: NextConfig = {
  basePath,
  skipTrailingSlashRedirect: true,
  async rewrites() {
    // Cho phép truy cập /uploads/* ngay cả khi app chạy dưới basePath
    if (basePath) {
      return [
        {
          source: "/uploads/:path*",
          destination: `${basePath}/uploads/:path*`,
          basePath: false,
        },
      ];
    }
    return [];
  },
};

export default nextConfig;
