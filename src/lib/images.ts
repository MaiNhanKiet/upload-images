import { verifyToken } from "@/lib/auth";
import path from "path";

export interface ImageMetadata {
  id: string;
  userId: string;
  originalName: string;
  fileName: string;
  url: string;
  size: number;
  type: string;
  uploadedAt: string;
}

export { verifyToken };

export function buildImageUrlFromFileName(fileName: string): string {
  // Trả về đường dẫn public (API) để lấy ảnh từ storage
  return `/api/uploads-images/${fileName}`;
}

export function resolveImageFilePathFromUrl(rawUrl: string): string {
  // Normalize: remove origin and leading slash
  const withoutOrigin = rawUrl.replace(/^https?:\/\/[^/]+/, "");
  const normalized = withoutOrigin.replace(/^\/+/, "");

  // If it contains uploads-images segment, extract filename after that
  const idx = normalized.indexOf("uploads-images/");
  if (idx !== -1) {
    const rel = normalized.slice(idx + "uploads-images/".length);
    return path.join(process.cwd(), "storage", "uploads-images", rel);
  }

  // Fallback: if it's /uploads/<file>
  const idx2 = normalized.indexOf("uploads/");
  if (idx2 !== -1) {
    const rel = normalized.slice(idx2 + "uploads/".length);
    return path.join(process.cwd(), "storage", "uploads", rel);
  }

  // Last resort: treat normalized as a path under storage
  return path.join(process.cwd(), "storage", normalized);
}
