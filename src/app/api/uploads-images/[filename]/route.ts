import fs from "fs";
import { promises as fsp } from "fs";
import path from "path";
import { resolveImageFilePathFromUrl } from "@/lib/images";

export async function GET(
  request: Request,
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

    const url = new URL(request.url);
    const wParam = url.searchParams.get("w") || url.searchParams.get("width");
    const hParam = url.searchParams.get("h") || url.searchParams.get("height");
    const w = wParam ? Number(wParam) : 0;
    const h = hParam ? Number(hParam) : 0;

    const fileBuffer = await fsp.readFile(filePath);

    // If resize requested, attempt to use sharp (optional dependency)
    if ((w && w > 0) || (h && h > 0)) {
      // Do not attempt raster resize for SVG
      if (ext === ".svg") {
        return new Response("SVG is vector; no raster resize performed", {
          status: 400,
        });
      }

      let sharpLib: unknown = null;
      try {
        const mod = await import("sharp");
        sharpLib = mod.default || mod;
      } catch (e) {
        console.error("Sharp not available:", String(e));
        return new Response(
          JSON.stringify({
            error: "Resize requires 'sharp' package. Install it (npm i sharp)",
          }),
          { status: 501, headers: { "Content-Type": "application/json" } }
        );
      }

      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const sharpAny = sharpLib as any;
        let pipeline = sharpAny(fileBuffer).rotate();
        pipeline = pipeline.resize({
          width: w || undefined,
          height: h || undefined,
          fit: "inside",
          withoutEnlargement: true,
        });

        // Preserve output format if supported; otherwise default to original
        if (ext === ".jpg" || ext === ".jpeg")
          pipeline = pipeline.jpeg({ quality: 90, mozjpeg: true });
        else if (ext === ".png")
          pipeline = pipeline.png({
            compressionLevel: 9,
            adaptiveFiltering: true,
            quality: 90,
          });
        else if (ext === ".webp") pipeline = pipeline.webp({ quality: 90 });
        else if (ext === ".avif") pipeline = pipeline.avif({ quality: 50 });

        const outBuffer = await pipeline.toBuffer();

        const headers = new Headers();
        headers.set("Content-Type", contentType);
        headers.set("Content-Length", String(outBuffer.length));
        headers.set("Cache-Control", "public, max-age=31536000, immutable");

        return new Response(outBuffer, { status: 200, headers });
      } catch (err) {
        console.error("Sharp resize error:", err);
        return new Response("Resize failed", { status: 500 });
      }
    }

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
