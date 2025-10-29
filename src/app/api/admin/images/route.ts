import { NextResponse } from "next/server";
import redisClient from "@/lib/redis";
import { verifyToken } from "@/lib/auth";
export const runtime = "nodejs";

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

        const { searchParams } = new URL(request.url);
        const page = Math.max(1, parseInt(String(searchParams.get("page") || "1"), 10));
        const limit = Math.min(100, Math.max(1, parseInt(String(searchParams.get("limit") || "20"), 10)));

        // Đọc từ các Redis List 'images:*'
        const keys = await redisClient.keys('images:*');
        const items: any[] = [];
        for (const k of keys) {
            const arr = await redisClient.lRange(k, 0, -1);
            for (const s of arr) {
                try { items.push(JSON.parse(s)); } catch { }
            }
        }
        const total = items.length;

        items.sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime());

        const start = (page - 1) * limit;
        const paged = items.slice(start, start + limit);

        return NextResponse.json({ images: paged, total, page, limit });

    } catch (error) {
        console.error('Get all images error:', error);
        return NextResponse.json({ error: "Lỗi lấy danh sách ảnh" }, { status: 500 });
    }
}
