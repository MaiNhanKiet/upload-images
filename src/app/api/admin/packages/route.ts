import { NextResponse } from "next/server";
import redisClient from "@/lib/redis";
import { verifyToken } from "@/lib/auth";

const KEY = "packages:storage";

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

        const raw = await redisClient.get(KEY);
        const packages = raw ? JSON.parse(raw) : [];
        return NextResponse.json({ packages });
    } catch (error) {
        return NextResponse.json({ error: "Lỗi lấy gói" }, { status: 500 });
    }
}

export async function PUT(request: Request) {
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

        const body = await request.json();
        const packages = Array.isArray(body?.packages) ? body.packages : null;
        if (!packages || packages.length !== 3) {
            return NextResponse.json({ error: "Cần 3 gói dung lượng" }, { status: 400 });
        }
        for (const p of packages) {
            if (!p?.name || typeof p.name !== 'string') {
                return NextResponse.json({ error: "Tên gói không hợp lệ" }, { status: 400 });
            }
            if (typeof p.bytes !== 'number' || p.bytes <= 0) {
                return NextResponse.json({ error: "Dung lượng không hợp lệ" }, { status: 400 });
            }
        }

        await redisClient.set(KEY, JSON.stringify(packages));
        return NextResponse.json({ message: "Đã lưu" });
    } catch (error) {
        return NextResponse.json({ error: "Lỗi lưu gói" }, { status: 500 });
    }
}


