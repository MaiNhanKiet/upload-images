import { NextResponse } from "next/server";
import redisClient from "@/lib/redis";
import { hashPassword, generateToken, User, UserRole } from "@/lib/auth";

export async function POST(request: Request) {
    try {
        const { email, password } = await request.json();

        if (!email || !password) {
            return NextResponse.json({ error: "Email và password là bắt buộc" }, { status: 400 });
        }

        // Kiểm tra user đã tồn tại chưa
        const existingUser = await redisClient.get(`user:${email}`);
        if (existingUser) {
            return NextResponse.json({ error: "Email đã được sử dụng" }, { status: 400 });
        }

        // Tạo user mới
        const userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const hashedPassword = await hashPassword(password);

        const user: User = {
            id: userId,
            email,
            password: hashedPassword,
            role: 'user' as UserRole,
            createdAt: new Date().toISOString(),
            storageMb: 1024
        };

        // Lưu user vào Redis List 'user_list'
        try {
            await redisClient.lPush("user_list", JSON.stringify(user));
        } catch { }

        // Tạo token
        const token = generateToken({ userId, email, role: 'user' as UserRole });

        return NextResponse.json({
            message: "Đăng ký thành công",
            token,
            user: { id: userId, email, role: 'user', storageMb: user.storageMb }
        });

    } catch (error) {
        console.error('Register error:', error);
        return NextResponse.json({ error: "Đăng ký thất bại" }, { status: 500 });
    }
}
