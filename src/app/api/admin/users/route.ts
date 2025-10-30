import { NextResponse } from "next/server";
import redisClient from "@/lib/redis";
import {
  verifyToken,
  hashPassword,
  type User,
  type UserRole,
} from "@/lib/auth";
import { safeParse } from "@/lib/utils";

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
    if (!decoded || decoded.role !== "admin") {
      return NextResponse.json(
        { error: "Không có quyền truy cập" },
        { status: 403 }
      );
    }

    // Lấy tất cả user từ Redis List 'user_list'
    const raw = await redisClient.lRange("user_list", 0, -1);
    const fullUsers: User[] = raw
      .map((s) => safeParse<User>(s))
      .filter((v): v is User => v !== null);
    const users = fullUsers.map((u) => ({
      id: u.id,
      email: u.email,
      role: u.role,
      createdAt: u.createdAt,
      storageMb: u.storageMb ?? 1024,
    }));

    // Không rebuild ở GET nữa để tránh ghi đè password
    return NextResponse.json({ users });
  } catch (error) {
    console.error("Get users error:", error);
    return NextResponse.json(
      { error: "Lỗi lấy danh sách user" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
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

    const { email, password, role = "user", storageMb } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email và password là bắt buộc" },
        { status: 400 }
      );
    }

    // Kiểm tra user đã tồn tại chưa
    const existingUser = await redisClient.get(`user:${email}`);
    if (existingUser) {
      return NextResponse.json(
        { error: "Email đã được sử dụng" },
        { status: 400 }
      );
    }

    // Tạo user mới
    const userId = `user_${Date.now()}_${Math.random()
      .toString(36)
      .substr(2, 9)}`;
    const hashedPassword = await hashPassword(password);

    const user: User = {
      id: userId,
      email,
      password: hashedPassword,
      role: (role as UserRole) || "user",
      createdAt: new Date().toISOString(),
      storageMb:
        typeof storageMb === "number" && storageMb > 0
          ? Math.floor(storageMb)
          : 1024,
    };

    // Thêm vào user_list
    try {
      await redisClient.lPush("user_list", JSON.stringify(user));
    } catch {}

    return NextResponse.json({
      message: "Tạo user thành công",
      user: { id: userId, email, role, storageMb: user.storageMb },
    });
  } catch (error) {
    console.error("Create user error:", error);
    return NextResponse.json({ error: "Lỗi tạo user" }, { status: 500 });
  }
}
