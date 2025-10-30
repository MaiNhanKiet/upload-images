import { NextResponse } from "next/server";
import redisClient from "@/lib/redis";
import { verifyToken, hashPassword, type User } from "@/lib/auth";
import { safeParse } from "@/lib/utils";
import type { ImageMetadata } from "@/lib/images";
import { unlink } from "fs/promises";
export const runtime = "nodejs";

export async function PUT(
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

    const body = await request.json();
    const { email, password, role, userId: userIdFromBody } = body || {};
    const { id: idFromParams } = await context.params;
    const userId = userIdFromBody || idFromParams;
    const url = new URL(request.url);
    const emailFromQuery = url.searchParams.get("email") || undefined; // email hiện tại trước khi đổi

    // Chỉ làm việc với user_list
    const rawList = await redisClient.lRange("user_list", 0, -1);
    const list: User[] = rawList
      .map((s) => safeParse<User>(s))
      .filter((v): v is User => v !== null);
    let user: User | null = list.find((u) => u.id === userId) || null;
    if (!user && emailFromQuery) {
      user = list.find((u) => u.email === emailFromQuery) || null;
    }
    if (!user) {
      return NextResponse.json(
        { error: "User không tồn tại trong user_list" },
        { status: 404 }
      );
    }

    // Nếu đổi email, kiểm tra trùng
    if (email && email !== user.email) {
      const dup = list.find((u) => u.email === email);
      if (dup) {
        return NextResponse.json(
          { error: "Email đã tồn tại" },
          { status: 400 }
        );
      }
    }

    // Cập nhật thông tin user
    const updatedUser: User = {
      ...user,
      email: email || user.email,
      role: role || user.role,
      password: password ? await hashPassword(password) : user.password,
    };

    // Ghi lại user_list
    const idx = list.findIndex((u) => u.id === user.id);
    list[idx] = updatedUser;
    await redisClient.del("user_list");
    if (list.length > 0)
      await redisClient.rPush(
        "user_list",
        list.map((u) => JSON.stringify(u))
      );

    return NextResponse.json({
      message: "Cập nhật user thành công",
      user: { id: userId, email: updatedUser.email, role: updatedUser.role },
    });
  } catch (error) {
    console.error("Update user error:", error);
    return NextResponse.json({ error: "Lỗi cập nhật user" }, { status: 500 });
  }
}

export async function DELETE(
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

    const { id: userId } = await context.params;
    const url = new URL(request.url);
    const emailParam = url.searchParams.get("email") || undefined;

    console.log("userId", userId);
    console.log("emailParam", emailParam);
    // Tìm user theo ID trong user_list
    const rawList2 = await redisClient.lRange("user_list", 0, -1);
    const list2: User[] = rawList2
      .map((s) => safeParse<User>(s))
      .filter((v): v is User => v !== null);
    const found =
      list2.find((u) => u.id === userId) ||
      (emailParam ? list2.find((u) => u.email === emailParam) : undefined);
    if (!found) {
      return NextResponse.json(
        { error: "User không tồn tại trong user_list" },
        { status: 404 }
      );
    }

    // Xóa user khỏi user_list
    const next = list2.filter((u) => u.id !== found!.id);
    await redisClient.del("user_list");
    if (next.length > 0)
      await redisClient.rPush(
        "user_list",
        next.map((u) => JSON.stringify(u))
      );

    // Xóa tất cả ảnh của user (metadata + file vật lý) theo list images:{email}
    try {
      const email = found.email;
      const arr = await redisClient.lRange(`images:${email}`, 0, -1);
      for (const s of arr) {
        const image = safeParse<ImageMetadata>(s);
        if (image && typeof image.url === "string") {
          try {
            const filePathFromUrl = (
              await import("@/lib/images")
            ).resolveImageFilePathFromUrl(image.url);
            try {
              await unlink(filePathFromUrl);
            } catch {}
          } catch {}
        }
      }
      await redisClient.del(`images:${email}`);
    } catch {}

    // Không còn thao tác với legacy; mọi thứ chỉ dựa trên user_list

    return NextResponse.json({ message: "Xóa user thành công" });
  } catch (error) {
    console.error("Delete user error:", error);
    return NextResponse.json({ error: "Lỗi xóa user" }, { status: 500 });
  }
}
