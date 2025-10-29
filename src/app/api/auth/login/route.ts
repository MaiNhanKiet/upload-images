import { NextResponse } from "next/server";
import redisClient from "@/lib/redis";
import { comparePassword, generateToken, User } from "@/lib/auth";

export async function POST(request: Request) {
    try {
        const { email, password } = await request.json();

        if (!email || !password) {
            return NextResponse.json({ error: "Email và password là bắt buộc" }, { status: 400 });
        }

        // Tìm user trong Redis List 'user_list'
        const list = await redisClient.lRange('user_list', 0, -1);
        const user = list
            .map((s) => { try { return JSON.parse(s) as User; } catch { return null as any; } })
            .find((u) => u && u.email === email);
        if (!user) {
            return NextResponse.json({ error: "Email hoặc password không đúng" }, { status: 401 });
        }

        // Kiểm tra password
        const isValidPassword = await comparePassword(password, user.password);
        if (!isValidPassword) {
            return NextResponse.json({ error: "Email hoặc password không đúng" }, { status: 401 });
        }

        // Tạo token
        const token = generateToken({ userId: user.id, email: user.email, role: user.role });

        return NextResponse.json({
            message: "Đăng nhập thành công",
            token,
            user: { id: user.id, email: user.email, role: user.role }
        });

    } catch (error) {
        console.error('Login error:', error);
        return NextResponse.json({ error: "Đăng nhập thất bại" }, { status: 500 });
    }
}
