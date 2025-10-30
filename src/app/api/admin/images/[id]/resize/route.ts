import { NextResponse } from "next/server";
export const runtime = "nodejs";
import path from "path";
import sharp from "sharp";
import { verifyToken } from "@/lib/auth";
import redisClient from "@/lib/redis";
import { stat } from "fs/promises";
import { safeParse } from "@/lib/utils";
import { resolveImageFilePathFromUrl, type ImageMetadata } from "@/lib/images";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
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
    if (!decoded || decoded.role !== "admin") {
      return NextResponse.json(
        { error: "Không có quyền truy cập" },
        { status: 403 }
      );
    }

    const { width, height } = await request.json();
    const w = Number(width);
    const h = Number(height);
    if ((!w && !h) || (w && w <= 0) || (h && h <= 0)) {
      return NextResponse.json(
        { error: "Width/Height không hợp lệ" },
        { status: 400 }
      );
    }

    const { id: imageId } = await context.params;
    const keys = await redisClient.keys("images:*");
    let ownerEmail: string | null = null;
    let meta: ImageMetadata | null = null;
    for (const k of keys) {
      const arr = await redisClient.lRange(k, 0, -1);
      for (const s of arr) {
        const obj = safeParse<ImageMetadata>(s);
        if (obj && obj.id === imageId) {
          ownerEmail = k.replace(/^images:/, "");
          meta = obj;
          break;
        }
      }
      if (meta) break;
    }
    if (!meta) {
      return NextResponse.json({ error: "Ảnh không tồn tại" }, { status: 404 });
    }
    // Resolve file path from potentially legacy or new URL forms
    const filePath = resolveImageFilePathFromUrl(
      typeof meta.url === "string" ? meta.url : ""
    );

    const ext = path.extname(meta.fileName || "").toLowerCase();
    if (ext === ".svg") {
      return NextResponse.json(
        { error: "SVG là vector, không cần resize bằng raster" },
        { status: 400 }
      );
    }

    // Resize với sharp, giữ chất lượng tốt
    let pipeline = sharp(filePath).rotate();
    pipeline = pipeline.resize({
      width: w || undefined,
      height: h || undefined,
      fit: "inside",
      withoutEnlargement: true,
    });

    if (ext === ".jpg" || ext === ".jpeg") {
      pipeline = pipeline.jpeg({ quality: 90, mozjpeg: true });
    } else if (ext === ".png") {
      pipeline = pipeline.png({
        compressionLevel: 9,
        adaptiveFiltering: true,
        quality: 90,
      });
    }

    await pipeline.toFile(filePath);

    // Cập nhật size mới trong metadata trong list
    try {
      const st = await stat(filePath);
      const updated = { ...meta, size: Number(st.size) };
      const key = `images:${ownerEmail}`;
      const arrRaw = await redisClient.lRange(key, 0, -1);
      const arr = arrRaw
        .map((s) => safeParse<ImageMetadata>(s))
        .filter((v): v is ImageMetadata => v !== null);
      const idx = arr.findIndex(
        (it: ImageMetadata) => it.id === (meta ? meta.id : "")
      );
      if (idx !== -1) arr[idx] = updated;
      await redisClient.del(key);
      if (arr.length > 0)
        await redisClient.rPush(
          key,
          arr.map((it) => JSON.stringify(it))
        );
    } catch {}

    return NextResponse.json({ message: "Resize thành công", url: meta.url });
  } catch (error) {
    console.error("Resize image error:", error);
    return NextResponse.json({ error: "Lỗi resize ảnh" }, { status: 500 });
  }
}
