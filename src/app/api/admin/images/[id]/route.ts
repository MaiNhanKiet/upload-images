import { NextResponse } from "next/server";
export const runtime = "nodejs";
import redisClient from "@/lib/redis";
import { verifyToken } from "@/lib/auth";
import { unlink } from "fs/promises";
import path from "path";

export async function GET(request: Request) {
    try {
        const authHeader = request.headers.get('authorization');
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return NextResponse.json({ error: "Token không hợp lệ" }, { status: 401 });
        }

        const token = authHeader.substring(7);
        const decoded = verifyToken(token);
        if (!decoded || decoded.role !== "admin") {
            return NextResponse.json({ error: "Không có quyền truy cập" }, { status: 403 });
        }

        // Lấy tất cả ảnh từ các Redis List 'images:*'
        const keys = await redisClient.keys('images:*');
        const images: any[] = [];
        for (const k of keys) {
            const arr = await redisClient.lRange(k, 0, -1);
            for (const s of arr) { try { images.push(JSON.parse(s)); } catch { } }
        }

        // Sắp xếp theo thời gian upload mới nhất
        images.sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime());

        return NextResponse.json({ images });

    } catch (error) {
        console.error('Get all images error:', error);
        return NextResponse.json({ error: "Lỗi lấy danh sách ảnh" }, { status: 500 });
    }
}

export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
    try {
        const authHeader = request.headers.get('authorization');
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return NextResponse.json({ error: "Token không hợp lệ" }, { status: 401 });
        }

        const token = authHeader.substring(7);
        const decoded = verifyToken(token);
        if (!decoded || decoded.role !== "admin") {
            return NextResponse.json({ error: "Không có quyền truy cập" }, { status: 403 });
        }

        const { originalName, userId } = await request.json();
        const { id: imageIdOrUuid } = await context.params;

        // Tìm ảnh theo id bằng cách quét các list
        const keys = await redisClient.keys('images:*');
        let ownerEmail: string | null = null;
        let image: any = null;
        for (const k of keys) {
            const arr = await redisClient.lRange(k, 0, -1);
            for (const s of arr) {
                try {
                    const obj = JSON.parse(s);
                    const fileUuid = typeof obj.fileName === 'string' ? obj.fileName.replace(/\.[^/.]+$/, '') : '';
                    if (obj.id === imageIdOrUuid || fileUuid === imageIdOrUuid) { ownerEmail = k.replace(/^images:/, ''); image = obj; break; }
                } catch { }
            }
            if (image) break;
        }

        if (!image || !ownerEmail) {
            return NextResponse.json({ error: "Ảnh không tồn tại" }, { status: 404 });
        }

        // Cập nhật thông tin ảnh
        const updatedImage = {
            ...image,
            originalName: originalName || image.originalName,
            userId: userId || image.userId
        };

        // Cập nhật trong các Redis List; có thể chuyển chủ sở hữu
        // Tra cứu email đích từ user_list bằng userId nếu có
        let targetEmail: string | null = ownerEmail;
        if (userId) {
            const list = await redisClient.lRange('user_list', 0, -1);
            for (const s of list) { try { const u = JSON.parse(s) as any; if (u.id === userId) { targetEmail = u.email; break; } } catch { } }
        }
        const srcKey = `images:${ownerEmail}`;
        const srcRaw = await redisClient.lRange(srcKey, 0, -1);
        const srcArr = srcRaw.map((s) => { try { return JSON.parse(s); } catch { return null as any; } }).filter(Boolean);
        const idx = srcArr.findIndex((it: any) => it.id === image.id);
        if (idx !== -1) srcArr.splice(idx, 1);
        await redisClient.del(srcKey);
        if (srcArr.length > 0) await redisClient.rPush(srcKey, srcArr.map((it) => JSON.stringify(it)));

        const dstEmail = targetEmail || ownerEmail;
        const dstKey = `images:${dstEmail}`;
        await redisClient.lPush(dstKey, JSON.stringify(updatedImage));

        return NextResponse.json({
            message: "Cập nhật ảnh thành công",
            image: updatedImage
        });

    } catch (error) {
        console.error('Update image error:', error);
        return NextResponse.json({ error: "Lỗi cập nhật ảnh" }, { status: 500 });
    }
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
    try {
        const authHeader = request.headers.get('authorization');
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return NextResponse.json({ error: "Token không hợp lệ" }, { status: 401 });
        }

        const token = authHeader.substring(7);
        const decoded = verifyToken(token);
        if (!decoded || decoded.role !== "admin") {
            return NextResponse.json({ error: "Không có quyền truy cập" }, { status: 403 });
        }

        const { id: imageId } = await context.params;
        console.log(imageId);

        // Tìm ảnh theo ID bằng cách quét các list
        const keys = await redisClient.keys('images:*');
        let ownerEmail: string | null = null;
        let image: any = null;
        for (const k of keys) {
            const arr = await redisClient.lRange(k, 0, -1);
            for (const s of arr) { try { const obj = JSON.parse(s); if (obj.id === imageId) { ownerEmail = k.replace(/^images:/, ''); image = obj; break; } } catch { } }
            if (image) break;
        }
        if (!image || !ownerEmail) {
            return NextResponse.json({ error: "Ảnh không tồn tại" }, { status: 404 });
        }

        // Xóa file vật lý theo image.url (linh hoạt với thư mục public/*)
        try {
            const relativeFromUrl = typeof image.url === 'string' ? image.url.replace(/^\//, '') : '';
            const filePath = path.join(process.cwd(), 'public', relativeFromUrl);
            try {
                await unlink(filePath);
            } catch (err) {
                console.warn('File not found:', filePath);
            }
        } catch { }

        // Cập nhật metadata trong list
        try {
            const key = `images:${ownerEmail}`;
            const arrRaw = await redisClient.lRange(key, 0, -1);
            const arr = arrRaw.map((s) => { try { return JSON.parse(s); } catch { return null as any; } }).filter(Boolean);
            const idx = arr.findIndex((it: any) => it.id === imageId);
            if (idx !== -1) arr.splice(idx, 1);
            await redisClient.del(key);
            if (arr.length > 0) await redisClient.rPush(key, arr.map((it) => JSON.stringify(it)));
        } catch { }

        return NextResponse.json({ message: "Xóa ảnh thành công" });

    } catch (error) {
        console.error('Delete image error:', error);
        return NextResponse.json({ error: "Lỗi xóa ảnh" }, { status: 500 });
    }
}
