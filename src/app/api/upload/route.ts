import { NextResponse } from "next/server";
import path from "path";
import { mkdir, writeFile } from "fs/promises";
import { v4 as uuidv4 } from "uuid";
import redisClient from "@/lib/redis";
import { verifyToken } from "@/lib/auth";

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

export const runtime = "nodejs";

export async function POST(request: Request) {
    try {
        // Kiểm tra authentication
        const authHeader = request.headers.get('authorization');
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return NextResponse.json({ error: "Token không hợp lệ" }, { status: 401 });
        }

        const token = authHeader.substring(7);
        const decoded = verifyToken(token);
        if (!decoded) {
            return NextResponse.json({ error: "Token không hợp lệ" }, { status: 401 });
        }

        const formData = await request.formData();
        let files = formData.getAll("files") as File[];
        if (!files || files.length === 0) {
            const single = formData.get("file") as File | null;
            if (single) files = [single];
        }

        if (!files || files.length === 0) {
            return NextResponse.json({ error: "Thiếu file" }, { status: 400 });
        }

        // Chỉ admin mới được upload nhiều ảnh
        if (files.length > 1 && decoded.role !== "admin") {
            return NextResponse.json({ error: "Chỉ admin được phép upload nhiều ảnh" }, { status: 403 });
        }

        const allowedMime = new Set(["image/png", "image/jpeg", "image/svg+xml"]);
        const allowedExt = new Set([".png", ".jpg", ".jpeg", ".svg"]);

        // Kiểm tra quota: lấy dung lượng của user (MB), mặc định 1024MB
        let userEmail = decoded.email;
        let storageMb = 1024;
        try {
            const list = await redisClient.lRange('user_list', 0, -1);
            for (const s of list) { try { const u = JSON.parse(s); if (u.email === userEmail && typeof u.storageMb === 'number') { storageMb = Math.max(1, Math.floor(u.storageMb)); break; } } catch { } }
        } catch { }

        // Tính tổng dung lượng đã dùng dựa trên Redis List 'images:{email}'
        let usedBytes = 0;
        try {
            const list = await redisClient.lRange(`images:${userEmail}`, 0, -1);
            for (const item of list) {
                try { const obj = JSON.parse(item); if (typeof obj.size === 'number') usedBytes += obj.size; } catch { }
            }
        } catch { }

        const quotaBytes = storageMb * 1024 * 1024;
        const newTotal = usedBytes + files.reduce((acc, f) => acc + (typeof f.size === 'number' ? f.size : 0), 0);
        if (newTotal > quotaBytes) {
            const remaining = Math.max(0, quotaBytes - usedBytes);
            return NextResponse.json({ error: `Bạn đã hết dung lượng. Còn lại ${Math.round(remaining / (1024 * 1024))} MB`, code: 'QUOTA_EXCEEDED' }, { status: 400 });
        }

        const uploadsDir = path.join(process.cwd(), "public", "uploads");
        await mkdir(uploadsDir, { recursive: true });

        const results: Array<{ url: string; name: string; uuid: string; id: string; size: number; type: string; }> = [];

        for (const file of files) {
            const ext = path.extname(file.name || "").toLowerCase();
            const mime = (file.type || "").toLowerCase();
            if (!allowedExt.has(ext) || !allowedMime.has(mime)) {
                return NextResponse.json({ error: `Định dạng không hỗ trợ: ${file.name}` }, { status: 400 });
            }

            const bytes = await file.arrayBuffer();
            const buffer = Buffer.from(bytes);

            const uuidFileName = `${uuidv4()}${ext}`;
            const filePath = path.join(uploadsDir, uuidFileName);
            await writeFile(filePath, buffer);

            // Tạo URL trả về, có hỗ trợ basePath nếu app chạy dưới subpath
            const basePath = (process.env.NEXT_PUBLIC_BASE_PATH || process.env.BASE_PATH || '').trim();
            const normalizedBasePath = basePath && basePath !== '/' ? `/${basePath.replace(/^\/+|\/+$/g, '')}` : '';
            const url = `${normalizedBasePath}/uploads/${uuidFileName}`;
            const imageId = uuidv4();
            const imageMetadata: ImageMetadata = {
                id: imageId,
                userId: decoded.userId,
                originalName: file.name || "",
                fileName: uuidFileName,
                url,
                size: file.size,
                type: mime,
                uploadedAt: new Date().toISOString()
            };

            // Lưu theo Redis List: LPUSH vào 'images:{email}' để mới nhất lên đầu
            try {
                await redisClient.lPush(`images:${decoded.email}`, JSON.stringify(imageMetadata));
            } catch { }

            results.push({ url, name: file.name, uuid: uuidFileName, id: imageId, size: file.size, type: mime });
        }

        if (results.length === 1) {
            return NextResponse.json(results[0]);
        }
        return NextResponse.json({ results });
    } catch (err) {
        console.error('Upload error:', err);
        return NextResponse.json({ error: "Upload thất bại" }, { status: 500 });
    }
}


