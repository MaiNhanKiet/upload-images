import fs from "fs";
import { promises as fsp } from "fs";
import path from "path";
import { resolveImageFilePathFromUrl } from "@/lib/images";

export async function GET(
  _req: Request,
  context: { params: Promise<{ filename?: string }> }
) {
  const { filename } = await context.params;
  if (!filename) return new Response("Not found", { status: 404 });

  try {
    const rawUrl = `/api/uploads-images/${filename}`;
    const filePath = resolveImageFilePathFromUrl(rawUrl);

    // Ensure file exists and is readable
    await fsp.access(filePath, fs.constants.R_OK);
    const stat = await fsp.stat(filePath);

    const ext = path.extname(filePath).toLowerCase();
    let contentType = "application/octet-stream";
    if (ext === ".jpg" || ext === ".jpeg") contentType = "image/jpeg";
    else if (ext === ".png") contentType = "image/png";
    else if (ext === ".gif") contentType = "image/gif";
    else if (ext === ".webp") contentType = "image/webp";
    else if (ext === ".svg") contentType = "image/svg+xml";
    else if (ext === ".avif") contentType = "image/avif";
    else if (ext === ".ico") contentType = "image/x-icon";

    const fileBuffer = await fsp.readFile(filePath);

    const headers = new Headers();
    headers.set("Content-Type", contentType);
    headers.set("Content-Length", String(stat.size));
    // Long-term cache for immutable uploaded images
    headers.set("Cache-Control", "public, max-age=31536000, immutable");

    return new Response(fileBuffer, { status: 200, headers });
  } catch (err) {
    console.warn("Serve image error:", String(err));
    return new Response("Not found", { status: 404 });
  }
}
