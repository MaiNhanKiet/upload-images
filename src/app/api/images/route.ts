import { NextResponse } from "next/server";
import redisClient from "@/lib/redis";
import { verifyToken } from "@/lib/auth";
import fs from "fs/promises";
import { resolveImageFilePathFromUrl } from "@/lib/images";
export const runtime = "nodejs";

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

// Small safe parser for JSON stored in Redis lists
function safeParseImage(s: string): ImageMetadata | null {
  try {
    return JSON.parse(s) as ImageMetadata;
  } catch {
    return null;
  }
}

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: "Token không hợp lệ" },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    const decoded = verifyToken(token);
    if (!decoded) {
      return NextResponse.json(
        { error: "Token không hợp lệ" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const page = Math.max(
      1,
      parseInt(String(searchParams.get("page") || "1"), 10)
    );
    const limit = Math.min(
      100,
      Math.max(1, parseInt(String(searchParams.get("limit") || "20"), 10))
    );

    // Lấy danh sách ảnh từ Redis List 'images:{email}'
    const total = (await redisClient.lLen(`images:${decoded.email}`)) || 0;
    const start = (page - 1) * limit;
    const stop = start + limit - 1;
    const range = await redisClient.lRange(
      `images:${decoded.email}`,
      start,
      stop
    );
    const items: ImageMetadata[] = range
      .map((s) => safeParseImage(s))
      .filter((v): v is ImageMetadata => v !== null);

    return NextResponse.json({ images: items, total, page, limit });
  } catch (error) {
    console.error("Get images error:", error);
    return NextResponse.json(
      { error: "Lấy danh sách ảnh thất bại" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const authHeader = request.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: "Token không hợp lệ" },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    const decoded = verifyToken(token);
    if (!decoded) {
      return NextResponse.json(
        { error: "Token không hợp lệ" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const imageId = searchParams.get("id");

    if (!imageId) {
      return NextResponse.json(
        { error: "ID ảnh là bắt buộc" },
        { status: 400 }
      );
    }

    // Xóa trong Redis List
    const listRaw = await redisClient.lRange(`images:${decoded.email}`, 0, -1);
    const list: ImageMetadata[] = listRaw
      .map((s) => safeParseImage(s))
      .filter((v): v is ImageMetadata => v !== null);
    const idx = list.findIndex((i: ImageMetadata) => i.id === imageId);
    if (idx === -1) {
      return NextResponse.json({ error: "Ảnh không tồn tại" }, { status: 404 });
    }
    const image: ImageMetadata = list[idx];

    // Xóa file vật lý theo image.url (linh hoạt với thư mục public/*) và có thể có basePath
    try {
      const rawUrl = typeof image.url === "string" ? image.url : "";
      // Loại bỏ origin nếu có, sau đó tìm segment 'uploads-images/' trong URL
      const filePath = resolveImageFilePathFromUrl(rawUrl);
      try {
        await fs.unlink(filePath);
      } catch (err) {
        console.warn("File unlink warning:", String(err), filePath);
      }
    } catch (err) {
      console.warn("Error while preparing to delete file:", String(err));
    }

    // Ghi lại list sau khi xóa
    try {
      list.splice(idx, 1);
      await redisClient.del(`images:${decoded.email}`);
      if (list.length > 0) {
        await redisClient.rPush(
          `images:${decoded.email}`,
          list.map((it) => JSON.stringify(it))
        );
      }
    } catch {}

    return NextResponse.json({ message: "Xóa ảnh thành công" });
  } catch (error) {
    console.error("Delete image error:", error);
    return NextResponse.json({ error: "Xóa ảnh thất bại" }, { status: 500 });
  }
}
